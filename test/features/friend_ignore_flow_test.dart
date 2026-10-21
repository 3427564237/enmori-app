import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/friends/data/backend_friend_ignore_repository.dart';
import 'package:enmori/features/friends/data/backend_friend_discovery_repository.dart';
import 'package:enmori/features/friends/domain/friend_ignore_repository.dart';
import 'package:enmori/features/friends/domain/friend_discovery_repository.dart';
import 'package:enmori/features/friends/presentation/friend_ignore_controller.dart';
import 'package:enmori/features/friends/presentation/friend_discovery_controller.dart';
import 'package:enmori/features/friends/presentation/friend_discovery_panel.dart';
import 'package:enmori/features/friends/presentation/ignored_people_page.dart';

import '../support/fakes.dart';

const unavailable = AppFailure(
  kind: AppFailureKind.serviceUnavailable,
  message: 'Result unconfirmed',
);
const gone = AppFailure(
  kind: AppFailureKind.addFriendTargetUnavailable,
  message: 'This person is unavailable.',
);
String version(int n) => n.toRadixString(16).padLeft(64, '0');
FriendIgnoreState person(String name, bool ignored, int revision) =>
    FriendIgnoreState(
      username: name,
      displayName: name,
      ignored: ignored,
      version: version(revision),
    );

final class IgnoreFake
    implements FriendIgnoreRepository, FriendDiscoveryRepository {
  final rows = {
    'alpha': person('alpha', false, 0),
    'bravo': person('bravo', false, 0),
  };
  int writes = 0, reads = 0, lists = 0;
  bool loseWriteResponse = false, failRead = false, hidden = false;
  Completer<Result<FriendIgnoreState>>? pending;
  @override
  Future<Result<FriendIgnoreState>> set(
    String username, {
    required bool ignored,
    required String expectedVersion,
    required bool Function() isEligible,
  }) async {
    if (!isEligible()) return const Failure(unavailable);
    writes++;
    if (pending != null) return pending!.future;
    if (hidden) return const Failure(gone);
    final old = rows[username]!;
    if (old.version != expectedVersion) {
      return const Failure(
        AppFailure(
          kind: AppFailureKind.friendIgnorePreconditionFailed,
          message: 'Preference changed',
        ),
      );
    }
    final saved = person(
      username,
      ignored,
      int.parse(old.version, radix: 16) + 1,
    );
    rows[username] = saved;
    return loseWriteResponse ? const Failure(unavailable) : Success(saved);
  }

  @override
  Future<Result<FriendIgnoreState>> read(
    String username, {
    required bool Function() isEligible,
  }) async {
    reads++;
    return !isEligible() || failRead
        ? const Failure(unavailable)
        : hidden
        ? const Failure(gone)
        : Success(rows[username]!);
  }

  @override
  Future<Result<List<FriendIgnoreState>>> list({
    required bool Function() isEligible,
  }) async {
    lists++;
    return isEligible()
        ? Success(hidden ? [] : rows.values.where((v) => v.ignored).toList())
        : const Failure(unavailable);
  }

  @override
  Future<Result<List<FriendSuggestion>>> suggestions({
    required bool home,
  }) async => Success(
    rows.values
        .where((v) => !v.ignored && !hidden)
        .map(
          (v) => FriendSuggestion(
            username: v.username,
            displayName: v.displayName,
            sharedInterests: const ['Music'],
            commonEventCount: 0,
            reason: '1 shared interest',
            ignoreVersion: v.version,
          ),
        )
        .toList(),
  );
  @override
  Future<Result<int>> pendingCount() async => const Success(0);
}

Future<
  ({
    ProviderContainer container,
    FakeAuthRepository auth,
    IgnoreFake repo,
    FriendIgnoreController controller,
  })
>
setup([IgnoreFake? existing]) async {
  final auth = FakeAuthRepository(), repo = existing ?? IgnoreFake();
  final container = ProviderContainer(
    overrides: [
      authRepositoryProvider.overrideWithValue(auth),
      friendIgnoreRepositoryProvider.overrideWithValue(repo),
      friendDiscoveryRepositoryProvider.overrideWithValue(repo),
    ],
  );
  addTearDown(container.dispose);
  addTearDown(auth.close);
  container.listen(authSessionProvider, (_, _) {});
  auth.emit(AuthSessionAuthenticated(subject: 'owner'));
  await container.read(authSessionProvider.future);
  container.listen(friendIgnoreControllerProvider, (_, _) {});
  return (
    container: container,
    auth: auth,
    repo: repo,
    controller: container.read(friendIgnoreControllerProvider.notifier),
  );
}

void main() {
  test('confirmed ignore invalidates both slices; Undo and management restore share persisted versioned operation', () async {
    final f = await setup();
    for (final home in [true, false]) {
      f.container.listen(friendDiscoveryControllerProvider(home), (_, _) {});
      await f.container
          .read(friendDiscoveryControllerProvider(home).notifier)
          .load();
    }
    final undo = await f.controller.ignore(
      'alpha',
      version(0),
      expectedEpoch: f.controller.epoch,
    );
    expect(undo, isNotNull);
    for (final home in [true, false]) {
      expect(
        f.container.read(friendDiscoveryControllerProvider(home)).suggestions,
        isEmpty,
      );
      await f.container
          .read(friendDiscoveryControllerProvider(home).notifier)
          .load();
      expect(
        f.container
            .read(friendDiscoveryControllerProvider(home))
            .suggestions
            .map((v) => v.username),
        ['bravo'],
      );
    }
    await f.controller.undo(undo!);
    expect(f.repo.rows['alpha']!.ignored, isFalse);
    await f.controller.ignore(
      'alpha',
      version(2),
      expectedEpoch: f.controller.epoch,
    );
    await f.controller.loadPeople();
    await f.controller.restore(
      expectedEpoch: f.controller.epoch,
      f.container.read(friendIgnoreControllerProvider).people.single,
    );
    expect(f.repo.rows['alpha']!.ignored, isFalse);
    expect(f.repo.writes, 4);
  });
  test('unknown committed ignore blocks duplicate writes across page cleanup until explicit read, without automatic replay', () async {
    final f = await setup();
    f.repo.loseWriteResponse = true;
    expect(
      await f.controller.ignore(
        'alpha',
        version(0),
        expectedEpoch: f.controller.epoch,
      ),
      isNull,
    );
    f.controller.clearPrivateViews();
    await f.controller.ignore(
      'alpha',
      version(0),
      expectedEpoch: f.controller.epoch,
    );
    await f.controller.loadPeople();
    expect(f.repo.writes, 1);
    expect(f.repo.lists, 0);
    f.repo.failRead = true;
    await f.controller.checkCurrent();
    expect(
      f.container.read(friendIgnoreControllerProvider).unresolvedUsername,
      'alpha',
    );
    f.repo.failRead = false;
    await f.controller.checkCurrent();
    expect(f.repo.writes, 1);
    expect(
      f.container.read(friendIgnoreControllerProvider).current!.ignored,
      isTrue,
    );
    f.repo.loseWriteResponse = false;
    await f.controller.loadPeople();
    await f.controller.restore(
      expectedEpoch: f.controller.epoch,
      f.container.read(friendIgnoreControllerProvider).people.single,
    );
    expect(f.repo.rows['alpha']!.ignored, isFalse);
  });
  test('duplicate while awaiting result is suppressed; same UID replacement discards late response and old Undo', () async {
    final f = await setup();
    final undo = await f.controller.ignore(
      'bravo',
      version(0),
      expectedEpoch: f.controller.epoch,
    );
    final pending = Completer<Result<FriendIgnoreState>>();
    f.repo.pending = pending;
    final first = f.controller.ignore(
      'alpha',
      version(0),
      expectedEpoch: f.controller.epoch,
    );
    await f.controller.ignore(
      'alpha',
      version(0),
      expectedEpoch: f.controller.epoch,
    );
    expect(f.repo.writes, 2); // bravo plus one alpha.
    f.auth.emit(AuthSessionAuthenticated(subject: 'owner'));
    await f.container.pump();
    pending.complete(Success(person('alpha', true, 1)));
    expect(await first, isNull);
    await f.controller.undo(undo!);
    expect(f.repo.writes, 2);
    expect(f.container.read(friendIgnoreControllerProvider).current, isNull);
  });
  test('two distinct ignores bind Undo to the right target; stale Undo cannot reverse a later ignore', () async {
    final f = await setup();
    final a = (await f.controller.ignore(
      'alpha',
      version(0),
      expectedEpoch: f.controller.epoch,
    ))!;
    final b = (await f.controller.ignore(
      'bravo',
      version(0),
      expectedEpoch: f.controller.epoch,
    ))!;
    await f.controller.undo(b);
    expect(f.repo.rows['alpha']!.ignored, isTrue);
    expect(f.repo.rows['bravo']!.ignored, isFalse);
    await f.controller.undo(a);
    await f.controller.ignore(
      'alpha',
      version(2),
      expectedEpoch: f.controller.epoch,
    );
    await f.controller.undo(a);
    expect(f.repo.rows['alpha']!.ignored, isTrue);
    expect(
      f.container.read(friendIgnoreControllerProvider).unresolvedUsername,
      'alpha',
    );
  });
  test('restore failure retains server ignore; revoked target clears stale identity only after authoritative unavailable', () async {
    final f = await setup();
    final undo = (await f.controller.ignore(
      'alpha',
      version(0),
      expectedEpoch: f.controller.epoch,
    ))!;
    f.repo.hidden = true;
    await f.controller.undo(undo);
    expect(f.repo.rows['alpha']!.ignored, isTrue);
    expect(f.container.read(friendIgnoreControllerProvider).people, isEmpty);
    await f.controller.checkCurrent();
    expect(
      f.container.read(friendIgnoreControllerProvider).unresolvedUsername,
      isNull,
    );
    expect(f.container.read(friendIgnoreControllerProvider).current, isNull);
    await f.controller.loadPeople();
    expect(f.container.read(friendIgnoreControllerProvider).people, isEmpty);
  });
  test('new client session reads existing ignore instead of reconstructing an old card', () async {
    final f = await setup();
    await f.controller.ignore(
      'alpha',
      version(0),
      expectedEpoch: f.controller.epoch,
    );
    final second = await setup(f.repo);
    await second.controller.loadPeople();
    expect(
      second.container
          .read(friendIgnoreControllerProvider)
          .people
          .single
          .username,
      'alpha',
    );
    expect(second.repo.writes, 1);
  });
  test('current session guard prevents dispatch after token completes for a replaced session', () async {
    final token = Completer<Result<String>>();
    var eligible = true, calls = 0;
    final client = BackendApiClient(
      Uri.parse('https://example.invalid'),
      () => token.future,
      httpClient: MockClient((_) async {
        calls++;
        return http.Response('{}', 200);
      }),
    );
    addTearDown(client.close);
    final attempt = BackendFriendIgnoreRepository(client).set(
      'alpha',
      ignored: true,
      expectedVersion: version(0),
      isEligible: () => eligible,
    );
    eligible = false;
    token.complete(const Success('fixture'));
    expect(await attempt, isA<Failure<FriendIgnoreState>>());
    expect(calls, 0);
  });
  test('strict HTTP preference projection rejects stale target, extra data, malformed version and false acknowledgement', () async {
    final valid = {
      'username': 'alpha',
      'displayName': 'Alpha',
      'ignored': true,
      'version': version(1),
    };
    for (final row in [
      valid,
      {...valid, 'username': 'bravo'},
      {...valid, 'privateNote': 'extra'},
      {...valid, 'version': 1},
      {...valid, 'ignored': false},
    ]) {
      final client = BackendApiClient(
        Uri.parse('https://example.invalid'),
        () async => const Success('fixture'),
        httpClient: MockClient((request) async {
          expect(request.method, 'PUT');
          expect(jsonDecode(request.body), {
            'ignored': true,
            'expectedVersion': version(0),
          });
          return http.Response(jsonEncode(row), 200);
        }),
      );
      final result = await BackendFriendIgnoreRepository(client).set(
        'alpha',
        ignored: true,
        expectedVersion: version(0),
        isEligible: () => true,
      );
      client.close();
      expect(
        result,
        identical(row, valid)
            ? isA<Success<FriendIgnoreState>>()
            : isA<Failure<FriendIgnoreState>>(),
      );
    }
  });
  test('strict list and recommendation fixtures require current preference versions and no extra fields', () async {
    final personRow = {
      'username': 'alpha',
      'displayName': null,
      'ignored': true,
      'version': version(1),
    };
    final card = {
      'username': 'bravo',
      'displayName': null,
      'sharedInterests': ['Music'],
      'commonEventCount': 0,
      'reason': '1 shared interest',
      'ignoreVersion': version(0),
    };
    final client = BackendApiClient(
      Uri.parse('https://example.invalid'),
      () async => const Success('fixture'),
      httpClient: MockClient(
        (request) async => http.Response(
          jsonEncode(
            request.url.path.contains('ignores')
                ? {
                    'people': [personRow],
                  }
                : {
                    'suggestions': [card],
                  },
          ),
          200,
        ),
      ),
    );
    addTearDown(client.close);
    expect(
      await BackendFriendIgnoreRepository(client).list(isEligible: () => true),
      isA<Success<List<FriendIgnoreState>>>(),
    );
    expect(
      await BackendFriendDiscoveryRepository(client).suggestions(home: true),
      isA<Success<List<FriendSuggestion>>>(),
    );
    card.remove('ignoreVersion');
    expect(
      await BackendFriendDiscoveryRepository(client).suggestions(home: true),
      isA<Failure<List<FriendSuggestion>>>(),
    );
    personRow['ignored'] = false;
    expect(
      await BackendFriendIgnoreRepository(client).list(isEligible: () => true),
      isA<Failure<List<FriendIgnoreState>>>(),
    );
  });
  testWidgets(
    'confirmed Ignore exposes normal SnackBar Undo; expired hint leaves durable management restore',
    (tester) async {
      final f = await setup();
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: f.container,
          child: MaterialApp(
            home: Scaffold(
              body: SingleChildScrollView(
                child: FriendDiscoveryPanel(
                  onOpenProfile: (_) async {},
                  onOpenRequests: () async {},
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Ignore @alpha'));
      await tester.pumpAndSettle();
      expect(find.text('Recommendation ignored'), findsOneWidget);
      expect(find.text('Undo'), findsOneWidget);
      await tester.tap(find.text('Undo'));
      await tester.pumpAndSettle();
      expect(f.repo.rows['alpha']!.ignored, isFalse);
      await tester.tap(find.text('Ignore @alpha'));
      await tester.pumpAndSettle();
      await tester.pump(const Duration(seconds: 5));
      await tester.pumpAndSettle();
      expect(find.text('Undo'), findsNothing);
      await tester.ensureVisible(find.text('Ignored people'));
      await tester.tap(find.text('Ignored people'));
      await tester.pumpAndSettle();
      expect(find.byType(IgnoredPeoplePage), findsOneWidget);
      await tester.tap(find.text('Restore'));
      await tester.pumpAndSettle();
      expect(f.repo.rows['alpha']!.ignored, isFalse);
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.text('Ignore @alpha'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'unknown write has readback and management, no success Undo or retry; replacement session closes old Undo',
    (tester) async {
      final f = await setup();
      f.repo.loseWriteResponse = true;
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: f.container,
          child: MaterialApp(
            home: Scaffold(
              body: SingleChildScrollView(
                child: FriendDiscoveryPanel(
                  onOpenProfile: (_) async {},
                  onOpenRequests: () async {},
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Ignore @alpha'));
      await tester.pumpAndSettle();
      expect(find.text('Undo'), findsNothing);
      expect(find.text('Read current state'), findsOneWidget);
      expect(find.text('Ignored people'), findsOneWidget);
      await tester.tap(find.text('Read current state'));
      await tester.pumpAndSettle();
      expect(f.repo.writes, 1);
      f.repo.loseWriteResponse = false;
      await tester.tap(find.text('Ignore @bravo'));
      await tester.pumpAndSettle();
      expect(find.text('Undo'), findsOneWidget);
      f.auth.emit(AuthSessionAuthenticated(subject: 'owner'));
      await tester.pumpAndSettle();
      expect(find.text('Undo'), findsNothing);
      expect(f.repo.writes, 2);
    },
  );
  testWidgets(
    'management remains scrollable at large text and narrow landscape; restore action reachable',
    (tester) async {
      final f = await setup();
      await f.controller.ignore(
        'alpha',
        version(0),
        expectedEpoch: f.controller.epoch,
      );
      tester.view.physicalSize = const Size(600, 320);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: f.container,
          child: MaterialApp(
            builder: (context, child) => MediaQuery(
              data: MediaQuery.of(context)
                  .copyWith(textScaler: const TextScaler.linear(2)),
              child: child!,
            ),
            home: const IgnoredPeoplePage(),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(find.text('Restore'), 150);
      await Scrollable.ensureVisible(
        tester.element(find.text('Restore')),
        alignment: 0.5,
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Restore'));
      await tester.pumpAndSettle();
      expect(f.repo.rows['alpha']!.ignored, isFalse);
      expect(tester.takeException(), isNull);
    },
  );
}
