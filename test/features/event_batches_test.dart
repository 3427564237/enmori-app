import 'dart:async';

import 'package:flutter/material.dart';

import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/event_browse/domain/activity_repository.dart';
import 'package:enmori/features/event_browse/event_browse_providers.dart';
import 'package:enmori/features/event_participation/presentation/event_batches_controller.dart';
import 'package:enmori/features/event_participation/presentation/participation_events_page.dart';

const instant = '2026-10-20T00:00:00.000Z';
ActivitySummary item(String id, {String? browse}) => ActivitySummary(
  browseId: browse ?? id,
  eventId: id,
  title: id,
  startAt: instant,
);

final class Repo implements PagedActivityRepository {
  int first = 0;
  final cursors = <String>[];
  Result<ActivityRead> result = Success(
    ActivityBatch(asOf: instant, items: [item('a')], nextCursor: 'page1'),
  );
  Completer<Result<ActivityRead>>? pending;
  @override
  Future<Result<ActivityRead>> read(String? id) async {
    first++;
    return result;
  }

  @override
  Future<Result<ActivityRead>> readNext(String cursor) async {
    cursors.add(cursor);
    return pending?.future ?? Future.value(result);
  }
}

void main() {
  testWidgets(
    'bottom Next and Retry preserve rows then show terminal hint; background clears all',
    (tester) async {
      final repo = Repo();
      final sessions = StreamController<AuthSession>();
      addTearDown(sessions.close);
      repo.result = Success(
        ActivityBatch(
          asOf: instant,
          items: const [
            ActivitySummary(
              browseId: 'legacy-a',
              title: 'First activity',
              startAt: instant,
            ),
          ],
          nextCursor: 'page1',
        ),
      );
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            activityRepositoryProvider.overrideWithValue(repo),
            authSessionProvider.overrideWith((ref) => sessions.stream),
          ],
          child: MaterialApp(
            theme: ThemeData(splashFactory: NoSplash.splashFactory),
            home: ParticipationEventsPage(onSelect: (_) {}),
          ),
        ),
      );
      sessions.add(AuthSessionAuthenticated(subject: 'a'));
      await tester.pumpAndSettle();
      // Initial auth observation can arrive after post-frame load; explicit Reload is safe.
      await tester.scrollUntilVisible(find.text('Reload'), 200);
      await tester.tap(find.text('Reload'));
      await tester.pumpAndSettle();
      repo.result = const Failure(
        AppFailure(
          kind: AppFailureKind.serviceUnavailable,
          message: 'Synthetic next failure',
        ),
      );
      await tester.scrollUntilVisible(find.text('Get next batch'), -100);
      await tester.tap(find.text('Get next batch'));
      await tester.pumpAndSettle();
      expect(find.text('Synthetic next failure'), findsOneWidget);
      expect(find.text('Retry next batch'), findsOneWidget);
      repo.result = Success(
        ActivityBatch(
          asOf: instant,
          items: const [
            ActivitySummary(
              browseId: 'legacy-a',
              title: 'First activity',
              startAt: instant,
            ),
            ActivitySummary(
              browseId: 'legacy-b',
              title: 'Second activity',
              startAt: instant,
            ),
          ],
        ),
      );
      await tester.tap(find.text('Retry next batch'));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.text('No more activities in this available source window.'),
        200,
      );
      expect(
        find.text('No more activities in this available source window.'),
        findsOneWidget,
      );
      expect(repo.cursors, ['page1', 'page1']);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      await tester.pump();
      expect(find.text('Get next batch'), findsNothing);
      expect(find.text('Second activity'), findsNothing);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pumpWidget(const SizedBox());
    },
  );
  test('next batch retains first rows, dedupes stable identity, same-position retry and terminal state', () async {
    final repo = Repo();
    final sessions = StreamController<AuthSession>();
    final c = ProviderContainer(
      overrides: [
        activityRepositoryProvider.overrideWithValue(repo),
        authSessionProvider.overrideWith((ref) => sessions.stream),
      ],
    );
    final sub = c.listen(eventBatchesProvider, (_, _) {});
    addTearDown(sub.close);
    addTearDown(c.dispose);
    addTearDown(sessions.close);
    sessions.add(AuthSessionAuthenticated(subject: 'a'));
    await Future<void>.delayed(Duration.zero);
    final ctrl = c.read(eventBatchesProvider.notifier);
    await ctrl.load();
    repo.result = const Failure(
      AppFailure(
        kind: AppFailureKind.serviceUnavailable,
        message: 'Synthetic failure',
      ),
    );
    await ctrl.next();
    expect(c.read(eventBatchesProvider).batch!.items.map((e) => e.eventId), [
      'a',
    ]);
    expect(c.read(eventBatchesProvider).batch!.nextCursor, 'page1');
    repo.result = Success(
      ActivityBatch(
        asOf: instant,
        items: [
          item('a', browse: 'other-locator'),
          item('b'),
        ],
      ),
    );
    await ctrl.next();
    expect(repo.cursors, ['page1', 'page1']);
    expect(repo.first, 1);
    expect(c.read(eventBatchesProvider).batch!.items.map((e) => e.eventId), [
      'a',
      'b',
    ]);
    expect(c.read(eventBatchesProvider).batch!.nextCursor, isNull);
    await ctrl.next();
    expect(repo.cursors.length, 2);
  });
  test(
    'duplicate next click is fenced and replaced session drops late completion',
    () async {
      final repo = Repo();
      final sessions = StreamController<AuthSession>();
      final c = ProviderContainer(
        overrides: [
          activityRepositoryProvider.overrideWithValue(repo),
          authSessionProvider.overrideWith((ref) => sessions.stream),
        ],
      );
      final sub = c.listen(eventBatchesProvider, (_, _) {});
      addTearDown(sub.close);
      addTearDown(c.dispose);
      addTearDown(sessions.close);
      sessions.add(AuthSessionAuthenticated(subject: 'a'));
      await Future<void>.delayed(Duration.zero);
      final ctrl = c.read(eventBatchesProvider.notifier);
      await ctrl.load();
      repo.pending = Completer();
      final pending = ctrl.next();
      await ctrl.next();
      expect(repo.cursors, ['page1']);
      sessions.add(AuthSessionAuthenticated(subject: 'b'));
      await Future<void>.delayed(Duration.zero);
      c.read(eventBatchesProvider);
      repo.pending!.complete(
        Success(ActivityBatch(asOf: instant, items: [item('private-old')])),
      );
      await pending;
      expect(c.read(eventBatchesProvider).batch, isNull);
    },
  );
  test('sparse empty page keeps next token; reused token and changed snapshot fail without dropping rows', () async {
    final repo = Repo();
    final sessions = StreamController<AuthSession>();
    final c = ProviderContainer(
      overrides: [
        activityRepositoryProvider.overrideWithValue(repo),
        authSessionProvider.overrideWith((ref) => sessions.stream),
      ],
    );
    final sub = c.listen(eventBatchesProvider, (_, _) {});
    addTearDown(sub.close);
    addTearDown(c.dispose);
    addTearDown(sessions.close);
    sessions.add(AuthSessionAuthenticated(subject: 'a'));
    await Future<void>.delayed(Duration.zero);
    final ctrl = c.read(eventBatchesProvider.notifier);
    await ctrl.load();
    repo.result = Success(
      ActivityBatch(asOf: instant, items: [], nextCursor: 'page2'),
    );
    await ctrl.next();
    expect(c.read(eventBatchesProvider).batch!.nextCursor, 'page2');
    expect(c.read(eventBatchesProvider).batch!.items.length, 1);
    await ctrl.next();
    expect(c.read(eventBatchesProvider).failure, isNotNull);
    expect(c.read(eventBatchesProvider).batch!.nextCursor, 'page2');
    ctrl.clear();
    expect(c.read(eventBatchesProvider).batch, isNull);
  });
}
