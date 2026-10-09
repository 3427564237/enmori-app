import 'dart:async';
import 'dart:convert';

import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/data/firebase_auth_repository.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/personas/data/backend_persona_repository.dart';
import 'package:enmori/features/personas/domain/persona.dart';
import 'package:enmori/features/personas/persona_providers.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

void main() {
  test(
    'Firebase token and profile refresh do not establish new auth sessions',
    () async {
      final firebase = _FirebaseAuth();
      final repository = FirebaseAuthRepository(firebase);
      final observations = <AuthSession>[];
      final subscription = repository.watchSession().listen(observations.add);
      addTearDown(() async {
        await subscription.cancel();
        await firebase.close();
      });
      await _drain();
      expect(observations.single, isA<AuthSessionInitializing>());
      firebase.authenticationChanged('synthetic-owner');
      await _drain();
      final first = observations.last;
      expect(first, isA<AuthSessionAuthenticated>());

      firebase.tokenRefreshed();
      firebase.profileRefreshed();
      await _drain();

      expect(observations.whereType<AuthSessionAuthenticated>(), hasLength(1));
      expect(observations.last, same(first));
      expect(firebase.authSubscriptions, 1);
    },
  );

  test(
    'observed signout and same UID login produce a new auth session',
    () async {
      final firebase = _FirebaseAuth();
      final observations = <AuthSession>[];
      final subscription = FirebaseAuthRepository(firebase)
          .watchSession()
          .listen(observations.add);
      addTearDown(() async {
        await subscription.cancel();
        await firebase.close();
      });
      await _drain();
      firebase.authenticationChanged('same-owner');
      await _drain();
      final first = observations.last;
      firebase.authenticationChanged(null);
      await _drain();
      expect(observations.last, isA<AuthSessionUnauthenticated>());
      firebase.authenticationChanged('same-owner');
      await _drain();
      expect(observations.last, isA<AuthSessionAuthenticated>());
      expect(observations.last, isNot(same(first)));
      expect(
        (observations.last as AuthSessionAuthenticated).subject,
        'same-owner',
      );
    },
  );

  test('real Persona client preserves a pending token request across token/profile refresh', () async {
    final fixture = await _Fixture.start();
    addTearDown(fixture.close);
    final previous = fixture.container.read(personaSessionSourceProvider)!;
    final token = Completer<String?>();
    fixture.firebase.pendingToken = token;
    final creating = fixture.controller.create(_fields);
    await _drain();
    expect(fixture.transport.posts, 0);

    fixture.firebase.tokenRefreshed();
    fixture.firebase.profileRefreshed();
    await _drain();
    await fixture.container.pump();
    token.complete('synthetic-refreshed-token');
    final succeeded = await creating;
    await _drain();

    expect(
      fixture.container.read(personaSessionSourceProvider),
      same(previous),
    );
    expect(succeeded, isTrue);
    expect(fixture.transport.posts, 1);
    expect(
      fixture.container
          .read(personaSessionControllerProvider)
          .confirmedWriteCount,
      1,
    );
    expect(
      fixture.container.read(personaSessionControllerProvider).isCurrent,
      isTrue,
    );
  });

  for (final signoutFirst in [true, false]) {
    test(
      '${signoutFirst ? 'signout then same UID login' : 'fresh observed same UID auth event'} prevents old token dispatch',
      () async {
        final fixture = await _Fixture.start();
        addTearDown(fixture.close);
        final previous = fixture.container.read(personaSessionSourceProvider)!;
        final token = Completer<String?>();
        fixture.firebase.pendingToken = token;
        final creating = fixture.controller.create(_fields);
        await _drain();
        if (signoutFirst) {
          fixture.firebase.authenticationChanged(null);
          await _drain();
          await fixture.container.pump();
        }
        fixture.firebase.authenticationChanged('synthetic-owner');
        await _drain();
        await fixture.container.pump();
        token.complete('synthetic-old-token');

        expect(await creating, isFalse);
        expect(
          fixture.container.read(personaSessionSourceProvider),
          isNot(same(previous)),
        );
        expect(previous.isActive, isFalse);
        expect(fixture.transport.posts, 0);
        expect(
          fixture.container
              .read(personaSessionControllerProvider)
              .pendingCreate,
          isNull,
        );
        expect(
          fixture.container
              .read(personaSessionControllerProvider)
              .confirmedWriteCount,
          0,
        );
      },
    );
  }

  test(
    'same UID relogin rejects an already-dispatched late create response',
    () async {
      final fixture = await _Fixture.start();
      addTearDown(fixture.close);
      final response = Completer<http.StreamedResponse>();
      fixture.transport.pendingPost = response;
      final creating = fixture.controller.create(_fields);
      await _drain();
      expect(fixture.transport.posts, 1);
      fixture.firebase.authenticationChanged(null);
      await _drain();
      await fixture.container.pump();
      fixture.firebase.authenticationChanged('synthetic-owner');
      await _drain();
      await fixture.container.pump();
      response.complete(_reply(201, {'persona': _row, 'stateRevision': 1}));
      expect(await creating, isFalse);
      await _drain();
      expect(
        fixture.container
            .read(personaSessionControllerProvider)
            .confirmedWriteCount,
        0,
      );
      expect(
        fixture.container.read(personaSessionControllerProvider).collection,
        isNull,
      );
    },
  );
}

// SDK-shaped hand-written fakes deliberately separate authentication events
// from token/profile events. No Firebase platform initialization or mock package.
final class _FirebaseAuth extends Fake implements FirebaseAuth {
  final _authEvents = StreamController<User?>.broadcast();
  final _userEvents = StreamController<User?>.broadcast();
  User? _user;
  int authSubscriptions = 0;
  Completer<String?>? pendingToken;

  @override
  User? get currentUser => _user;

  @override
  Stream<User?> authStateChanges() {
    authSubscriptions++;
    return _authEvents.stream;
  }

  @override
  Stream<User?> userChanges() => _userEvents.stream;

  void authenticationChanged(String? uid) {
    _user = uid == null ? null : _User(uid, this);
    _authEvents.add(_user);
    _userEvents.add(_user);
  }

  void tokenRefreshed() {
    final uid = _user?.uid;
    if (uid != null) _user = _User(uid, this);
    _userEvents.add(_user);
  }

  void profileRefreshed() => tokenRefreshed();

  Future<void> close() async {
    final token = pendingToken;
    if (token != null && !token.isCompleted) token.complete(null);
    await _authEvents.close();
    await _userEvents.close();
  }
}

final class _User extends Fake implements User {
  _User(this.uid, this.owner);
  @override
  final String uid;
  final _FirebaseAuth owner;

  @override
  Future<String?> getIdToken([bool forceRefresh = false]) =>
      owner.pendingToken?.future ?? Future.value('synthetic-token');
}

final class _Fixture {
  _Fixture(
    this.firebase,
    this.transport,
    this.client,
    this.container,
    this.subscription,
  );
  final _FirebaseAuth firebase;
  final _Transport transport;
  final BackendApiClient client;
  final ProviderContainer container;
  final ProviderSubscription<PersonaSessionState> subscription;

  PersonaSessionController get controller =>
      container.read(personaSessionControllerProvider.notifier);

  static Future<_Fixture> start() async {
    final firebase = _FirebaseAuth();
    final auth = FirebaseAuthRepository(firebase);
    final transport = _Transport();
    final client = BackendApiClient(
      Uri.parse('https://example.test'),
      auth.getIdToken,
      httpClient: transport,
    );
    final container = ProviderContainer(
      overrides: [
        authRepositoryProvider.overrideWithValue(auth),
        personaRepositoryProvider.overrideWithValue(
          BackendPersonaRepository(client),
        ),
        personaCreateKeyProvider.overrideWithValue(
          () => '11111111-1111-4111-8111-111111111111',
        ),
      ],
    );
    final subscription = container.listen(
      personaSessionControllerProvider,
      (_, _) {},
    );
    await _drain();
    firebase.authenticationChanged('synthetic-owner');
    await _drain();
    await container.pump();
    final fixture = _Fixture(
      firebase,
      transport,
      client,
      container,
      subscription,
    );
    await fixture.controller.load();
    return fixture;
  }

  Future<void> close() async {
    subscription.close();
    container.dispose();
    final response = transport.pendingPost;
    if (response != null && !response.isCompleted) {
      response.complete(_reply(503, {}));
    }
    client.close();
    await firebase.close();
  }
}

final class _Transport extends http.BaseClient {
  int posts = 0;
  bool saved = false;
  Completer<http.StreamedResponse>? pendingPost;

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    if (request.method == 'GET') {
      return _reply(200, {
        'personas': {
          'items': saved ? [_row] : [],
          'stateRevision': saved ? 1 : 0,
        },
      });
    }
    posts++;
    final response = pendingPost;
    if (response != null) return response.future;
    saved = true;
    return _reply(201, {'persona': _row, 'stateRevision': 1});
  }
}

http.StreamedResponse _reply(int status, Object body) => http.StreamedResponse(
  Stream.value(utf8.encode(jsonEncode(body))),
  status,
  headers: {'content-type': 'application/json'},
);

Future<void> _drain() async {
  await Future<void>.delayed(Duration.zero);
  await Future<void>.delayed(Duration.zero);
}

const _fields = PersonaFields(
  displayName: 'Guide',
  tone: PersonaTone.neutral,
  responseLength: PersonaResponseLength.balanced,
  formatStyle: PersonaFormatStyle.plain,
);
final _row = <String, Object?>{
  'personaId': 'a' * 64,
  'displayName': 'Guide',
  'tone': 'neutral',
  'responseLength': 'balanced',
  'formatStyle': 'plain',
  'revision': 1,
  'createdAt': '2026-10-09T00:00:00.000Z',
  'updatedAt': '2026-10-09T00:00:00.000Z',
};
