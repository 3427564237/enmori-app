import 'dart:async';
import 'dart:convert';

import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/personas/data/backend_persona_repository.dart';
import 'package:enmori/features/personas/domain/persona.dart';
import 'package:enmori/features/personas/domain/persona_session.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

const key = '11111111-1111-4111-8111-111111111111';
const fields = PersonaFields(
  displayName: 'Guide',
  tone: PersonaTone.neutral,
  responseLength: PersonaResponseLength.balanced,
  formatStyle: PersonaFormatStyle.plain,
);
final row = <String, Object?>{
  'personaId': 'a' * 64,
  'displayName': 'Guide',
  'tone': 'neutral',
  'responseLength': 'balanced',
  'formatStyle': 'plain',
  'revision': 1,
  'createdAt': '2026-10-09T00:00:00.000Z',
  'updatedAt': '2026-10-09T00:00:00.000Z',
};
Map<String, Object?> get saved => {'persona': row, 'stateRevision': 1};
http.StreamedResponse reply(int status, Object body) => http.StreamedResponse(
  Stream.value(utf8.encode(jsonEncode(body))),
  status,
  headers: {'content-type': 'application/json'},
);

void main() {
  for (final delayedBody in [false, true]) {
    testWidgets('real client/session: timeout -> recovery 412 -> original late '
        '201 (${delayedBody ? 'body' : 'headers'})', (tester) async {
      final transport = _Transport(delayedBody: delayedBody);
      var tokens = 0;
      final client = BackendApiClient(
        Uri.parse('https://example.test'),
        () async {
          tokens++;
          return const Success('synthetic-token');
        },
        httpClient: transport,
      );
      final session = PersonaSession(
        BackendPersonaRepository(client),
        newKey: () => key,
      );
      addTearDown(() {
        session.dispose();
        client.close();
      });
      await _loadCurrent(tester, session, transport);
      expect(tokens, 1);
      bool? created;
      final creating = session.create(fields).then((value) => created = value);
      await tester.pump();
      // A failed load or token wait can return false without any dispatch.
      // Prove dispatch before advancing the real client's foreground timer.
      expect(transport.posts, hasLength(1));
      expect(tokens, 2);
      expect(created, isNull);
      expect(session.state.pendingCreate?.status, PersonaCreateStatus.waiting);
      await tester.pump(defaultBackendOperationTimeout);
      expect(created, isFalse);
      await creating;
      expect(
        session.state.pendingCreate?.status,
        PersonaCreateStatus.uncertain,
      );
      final retrying = session.retryCreate();
      await tester.pump();
      expect(
        session.state.pendingCreate?.status,
        PersonaCreateStatus.recoveryClosed,
      );
      await retrying;
      expect(
        session.state.failure?.kind,
        AppFailureKind.personaRevisionPreconditionFailed,
      );
      expect(session.state.confirmedWriteCount, 0);
      expect(transport.posts.length, 2);
      expect(transport.posts[0].headers['Idempotency-Key'], key);
      expect(transport.posts[1].headers['Idempotency-Key'], key);
      expect(transport.posts[0].body, transport.posts[1].body);
      expect(jsonDecode(transport.posts[0].body), {
        'displayName': 'Guide',
        'tone': 'neutral',
        'responseLength': 'balanced',
        'formatStyle': 'plain',
        'expectedStateRevision': 0,
      });
      expect(tokens, 3);
      expect(transport.gets, 1);
      final confirmed = session.changes.firstWhere(
        (s) => s.isCurrent && s.pendingCreate == null,
      );
      transport.release();
      await tester.pump();
      expect(session.state.isCurrent, isTrue);
      expect(session.state.pendingCreate, isNull);
      await confirmed;
      expect(session.state.lastConfirmedCreateKey, key);
      expect(session.state.confirmedWriteCount, 1);
      expect(
        session.state.collection!.items.single.fields.displayName,
        'Guide',
      );
      expect(
        transport.gets,
        2,
        reason: 'Independent reread after commit proof',
      );
      expect(tokens, 4);
      expect(transport.posts, hasLength(2));
    });
  }

  testWidgets('session end during real token wait prevents dispatch', (
    tester,
  ) async {
    final token = Completer<Result<String>>();
    final transport = _Transport(delayedBody: false);
    var tokens = 0;
    final client = BackendApiClient(
      Uri.parse('https://example.test'),
      () => ++tokens == 1
          ? Future.value(const Success('synthetic'))
          : token.future,
      httpClient: transport,
    );
    final session = PersonaSession(
      BackendPersonaRepository(client),
      newKey: () => key,
    );
    addTearDown(() {
      session.dispose();
      client.close();
    });
    await _loadCurrent(tester, session, transport);
    final creating = session.create(fields);
    await tester.pump();
    expect(tokens, 2, reason: 'Create is actually waiting for its token');
    expect(session.state.pendingCreate?.status, PersonaCreateStatus.waiting);
    expect(transport.posts, isEmpty);
    session.dispose();
    token.complete(const Success('old-session-token'));
    await tester.pump();
    expect(await creating, isFalse);
    expect(transport.posts, isEmpty);
    expect(session.state.pendingCreate, isNull);
    expect(session.state.confirmedWriteCount, 0);
  });

  for (final timesOut in [true, false]) {
    testWidgets('initial read ${timesOut ? 'timeout' : 'rejection'} prevents '
        'create until a fresh successful load', (tester) async {
      final firstRead = Completer<http.StreamedResponse>();
      final transport = _Transport(
        delayedBody: false,
        firstRead: firstRead.future,
      );
      final client = BackendApiClient(
        Uri.parse('https://example.test'),
        () async => const Success('synthetic'),
        httpClient: transport,
      );
      final session = PersonaSession(
        BackendPersonaRepository(client),
        newKey: () => key,
      );
      addTearDown(() {
        session.dispose();
        client.close();
      });
      var loaded = false;
      final loading = session.load().then((_) => loaded = true);
      await tester.pump();
      expect(transport.gets, 1);
      expect(loaded, isFalse);
      expect(session.state.canStartNewCreate, isFalse);
      expect(await session.create(fields), isFalse);
      expect(transport.posts, isEmpty);
      if (timesOut) {
        await tester.pump(defaultBackendOperationTimeout);
      } else {
        firstRead.complete(
          reply(503, {
            'error': {
              'code': 'SERVICE_UNAVAILABLE',
              'message': 'Unavailable',
              'requestId': 'synthetic-request',
            },
          }),
        );
        await tester.pump();
      }
      expect(loaded, isTrue);
      await loading;
      expect(session.state.failure?.kind, AppFailureKind.serviceUnavailable);
      expect(session.state.isCurrent, isFalse);
      expect(await session.create(fields), isFalse);
      expect(session.state.pendingCreate, isNull);
      expect(transport.posts, isEmpty);
      expect(session.state.confirmedWriteCount, 0);
      if (timesOut) {
        firstRead.complete(
          reply(200, {
            'personas': {'items': [], 'stateRevision': 0},
          }),
        );
        await tester.pump();
        expect(
          session.state.isCurrent,
          isFalse,
          reason: 'Late initial GET is not a fresh load',
        );
        expect(session.state.canStartNewCreate, isFalse);
      }
      await _loadCurrent(tester, session, transport, expectedGets: 2);
      expect(session.state.pendingCreate, isNull);
      expect(transport.posts, isEmpty);
    });
  }

  testWidgets('create token timeout has no dispatch or uncertain command; '
      'late token cannot dispatch', (tester) async {
    final token = Completer<Result<String>>();
    var tokens = 0;
    final transport = _Transport(delayedBody: false);
    final client = BackendApiClient(
      Uri.parse('https://example.test'),
      () => ++tokens == 1
          ? Future.value(const Success('synthetic'))
          : token.future,
      httpClient: transport,
    );
    final session = PersonaSession(
      BackendPersonaRepository(client),
      newKey: () => key,
    );
    addTearDown(() {
      session.dispose();
      client.close();
    });
    await _loadCurrent(tester, session, transport);
    bool? created;
    final creating = session.create(fields).then((value) => created = value);
    await tester.pump();
    expect(tokens, 2);
    expect(created, isNull);
    expect(session.state.pendingCreate?.status, PersonaCreateStatus.waiting);
    expect(transport.posts, isEmpty);
    await tester.pump(defaultBackendOperationTimeout);
    expect(created, isFalse);
    await creating;
    expect(session.state.pendingCreate, isNull);
    expect(session.state.failure?.kind, AppFailureKind.serviceUnavailable);
    expect(session.state.confirmedWriteCount, 0);
    expect(transport.posts, isEmpty);
    token.complete(const Success('late-synthetic'));
    await tester.pump();
    expect(transport.posts, isEmpty);
    expect(session.state.pendingCreate, isNull);
    expect(session.state.confirmedWriteCount, 0);
  });

  test(
    'real valid immediate success gives the initiating page a success result',
    () async {
      final transport = _Transport(delayedBody: false)..immediate = true;
      final client = BackendApiClient(
        Uri.parse('https://example.test'),
        () async => const Success('synthetic'),
        httpClient: transport,
      );
      final session = PersonaSession(
        BackendPersonaRepository(client),
        newKey: () => key,
      );
      addTearDown(() {
        session.dispose();
        client.close();
      });
      await session.load();
      expect(await session.create(fields), isTrue);
      await Future<void>.delayed(Duration.zero);
      expect(session.state.pendingCreate, isNull);
      expect(session.state.confirmedWriteCount, 1);
    },
  );
}

// Fake time drives timeout events; the HTTP client/repository/session are real.
// Assert setup separately so a read failure cannot masquerade as a create timeout.
Future<void> _loadCurrent(
  WidgetTester tester,
  PersonaSession session,
  _Transport transport, {
  int expectedGets = 1,
}) async {
  var loaded = false;
  final loading = session.load().then((_) => loaded = true);
  await tester.pump();
  expect(loaded, isTrue, reason: 'Initial read must settle before create');
  expect(session.state.failure, isNull);
  expect(session.state.isCurrent, isTrue);
  expect(session.state.canStartNewCreate, isTrue);
  expect(session.state.collection?.stateRevision, 0);
  expect(session.state.collection?.items, isEmpty);
  expect(session.state.pendingCreate, isNull);
  expect(transport.gets, expectedGets);
  expect(transport.posts, isEmpty);
  await loading;
}

final class _Transport extends http.BaseClient {
  _Transport({required this.delayedBody, this.firstRead});
  final bool delayedBody;
  final Future<http.StreamedResponse>? firstRead;
  bool immediate = false;
  bool committed = false;
  int gets = 0;
  final posts = <http.Request>[];
  final headers = Completer<http.StreamedResponse>();
  final body = StreamController<List<int>>();
  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    if (request.method == 'GET') {
      gets++;
      if (gets == 1 && firstRead != null) return firstRead!;
      return reply(200, {
        'personas': {
          'items': committed ? [row] : [],
          'stateRevision': committed ? 1 : 0,
        },
      });
    }
    posts.add(request as http.Request);
    if (immediate) {
      committed = true;
      return reply(201, saved);
    }
    if (posts.length == 1) {
      return delayedBody
          ? http.StreamedResponse(
              body.stream,
              201,
              headers: {'content-type': 'application/json'},
            )
          : headers.future;
    }
    return reply(412, {
      'error': {
        'code': 'PERSONA_REVISION_PRECONDITION_FAILED',
        'message': 'Your Personas changed. Reload them before trying again.',
        'requestId': 'synthetic-request',
      },
    });
  }

  void release() {
    committed = true;
    if (delayedBody) {
      body.add(utf8.encode(jsonEncode(saved)));
      unawaited(body.close());
    } else {
      headers.complete(reply(201, saved));
    }
  }
}
