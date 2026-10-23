import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/account/domain/account_repository.dart';

import 'dart:async';

import 'package:enmori/core/network/idempotency_key_provider.dart';
import 'package:enmori/core/presentation/command_state.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/check_in/check_in_providers.dart';
import 'package:enmori/features/check_in/domain/check_in_repository.dart';
import 'package:enmori/features/check_in/presentation/check_in_controller.dart';
import 'package:enmori/features/check_in/presentation/check_in_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fakes.dart';

final class _DelayedCheckIns implements CheckInRepository {
  final creates = <Completer<Result<CheckIn>>>[];
  final reads = <Completer<Result<CheckIn>>>[];
  final keys = <String>[];
  @override
  Future<Result<CheckIn>> create({
    String? locationLabel,
    String? mood,
    String? activity,
    CheckInVisibility? visibility,
    required String note,
    required String idempotencyKey,
  }) {
    keys.add(idempotencyKey);
    final pending = Completer<Result<CheckIn>>();
    creates.add(pending);
    return pending.future;
  }

  @override
  Future<Result<CheckIn>> readOwned({required String checkInId}) {
    final pending = Completer<Result<CheckIn>>();
    reads.add(pending);
    return pending.future;
  }

  @override
  Future<Result<CheckInHistoryPage>> readOwnForDate({
    required String date,
    required String timeZone,
    String? cursor,
  }) async => const Success(CheckInHistoryPage(checkIns: [], nextCursor: null));

  void finishRemaining() {
    for (final pending in [...creates, ...reads]) {
      if (!pending.isCompleted) pending.complete(Success(testCheckIn()));
    }
  }
}

Future<ProviderContainer> _start(
  WidgetTester tester,
  _DelayedCheckIns repo,
  GlobalKey<NavigatorState> navigator,
) async {
  final scope = ProviderContainer(
    overrides: [
      checkInRepositoryProvider.overrideWithValue(repo),
      currentAuthSubjectProvider.overrideWithValue('synthetic-owner'),
      authSessionProvider.overrideWith(
        (_) => Stream.value(
          const AuthSessionAuthenticated(subject: 'synthetic-owner'),
        ),
      ),
      idempotencyKeyGeneratorProvider.overrideWithValue(
        FakeIdempotencyKeyGenerator([
          'first-command',
          'second-command',
          'third-command',
        ]),
      ),
    ],
  );
  scope.listen(authSessionProvider, (_, _) {});
  addTearDown(scope.dispose);
  addTearDown(repo.finishRemaining);
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: scope,
      child: MaterialApp(
        navigatorKey: navigator,
        home: const Scaffold(body: Text('Home')),
        onGenerateRoute: (settings) => PageRouteBuilder<void>(
          settings: settings,
          transitionDuration: Duration.zero,
          reverseTransitionDuration: Duration.zero,
          pageBuilder: (context, _, _) => settings.name == '/new'
              ? CheckInComposerPage(
                  onReturnHome: () => Navigator.of(context).pop(),
                )
              : SavedCheckInPage(
                  checkInId: settings.name!,
                  onReturnHome: () => Navigator.of(context).pop(),
                ),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
  return scope;
}

Future<void> _open(
  WidgetTester tester,
  GlobalKey<NavigatorState> navigator,
  String route,
) async {
  navigator.currentState!.pushNamed<void>(route);
  await tester.pump();
  await tester.pump();
}

Future<void> _leave(
  WidgetTester tester,
  GlobalKey<NavigatorState> navigator,
) async {
  navigator.currentState!.pop();
  await tester.pumpAndSettle();
}

Future<void> _create(WidgetTester tester, String note) async {
  await tester.enterText(find.byKey(const Key('r6-check-in-note')), note);
  await tester.ensureVisible(find.byKey(const Key('r6-check-in-create')));
  await tester.tap(find.byKey(const Key('r6-check-in-create')));
  await tester.pump();
}

void main() {
  for (final sameNote in [true, false]) {
    testWidgets(
      'leave pending create; reopen ${sameNote ? "same Note replays" : "different Note starts fresh"}; late result is ignored',
      (tester) async {
        final repo = _DelayedCheckIns(),
            navigator = GlobalKey<NavigatorState>();
        final scope = await _start(tester, repo, navigator);
        await _open(tester, navigator, '/new');
        await _create(tester, 'Original Note');
        await _leave(tester, navigator);
        await _open(tester, navigator, '/new');
        expect(
          tester
              .widget<FilledButton>(find.byKey(const Key('r6-check-in-create')))
              .onPressed,
          isNotNull,
        );
        await _create(tester, sameNote ? 'Original Note' : 'Fresh Note');
        expect(repo.creates.length, 2);
        expect(repo.keys[1], sameNote ? repo.keys[0] : isNot(repo.keys[0]));
        repo.creates[0].complete(Success(testCheckIn()));
        await tester.pump();
        expect(
          scope.read(checkInControllerProvider),
          isA<CommandPending<CheckIn>>(),
        );
        repo.creates[1].complete(
          Success(
            CheckIn(
              checkInId: 'current',
              note: sameNote ? 'Original Note' : 'Fresh Note',
              createdAt: DateTime.utc(2026),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(
          (scope.read(
            checkInControllerProvider,
          ) as CommandSucceeded<CheckIn>).value.checkInId,
          'current',
        );
        expect(tester.takeException(), isNull);
      },
    );
  }
  for (final composerRead in [false, true]) {
    testWidgets(
      'leave pending ${composerRead ? "composer confirmation" : "saved read"}; composer can save and late read cannot overwrite',
      (tester) async {
        final repo = _DelayedCheckIns(),
            navigator = GlobalKey<NavigatorState>();
        final scope = await _start(tester, repo, navigator);
        await _open(tester, navigator, composerRead ? '/new' : '/saved-a');
        if (composerRead) {
          await _create(tester, 'Original Note');
          repo.creates.single.complete(Success(testCheckIn()));
          await tester.pumpAndSettle();
          await tester.ensureVisible(
            find.byKey(const Key('r6-check-in-confirm')),
          );
          await tester.tap(find.byKey(const Key('r6-check-in-confirm')));
          await tester.pump();
        }
        expect(repo.reads.length, 1);
        await _leave(tester, navigator);
        await _open(tester, navigator, '/new');
        expect(
          tester
              .widget<FilledButton>(find.byKey(const Key('r6-check-in-create')))
              .onPressed,
          isNotNull,
        );
        await _create(tester, 'Fresh Note');
        repo.creates.last.complete(
          Success(
            CheckIn(
              checkInId: 'current',
              note: 'Fresh Note',
              createdAt: DateTime.utc(2026),
            ),
          ),
        );
        await tester.pumpAndSettle();
        repo.reads.single.complete(Success(testCheckIn()));
        await tester.pumpAndSettle();
        expect(
          (scope.read(
            checkInControllerProvider,
          ) as CommandSucceeded<CheckIn>).value.checkInId,
          'current',
        );
        expect(tester.takeException(), isNull);
      },
    );
  }
  testWidgets('departing saved page cannot cancel the replacement page read', (
    tester,
  ) async {
    final repo = _DelayedCheckIns(), navigator = GlobalKey<NavigatorState>();
    final scope = await _start(tester, repo, navigator);
    await _open(tester, navigator, '/saved-a');
    navigator.currentState!.pushReplacementNamed<void, void>('/saved-b');
    await tester.pump();
    await tester.pump();
    expect(repo.reads.length, 2);
    repo.reads[0].complete(Success(testCheckIn()));
    await tester.pump();
    expect(
      scope.read(checkInControllerProvider),
      isA<CommandPending<CheckIn>>(),
    );
    repo.reads[1].complete(
      Success(
        CheckIn(
          checkInId: 'current',
          note: 'Current saved Note',
          createdAt: DateTime.utc(2026),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.textContaining('Current saved Note'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
