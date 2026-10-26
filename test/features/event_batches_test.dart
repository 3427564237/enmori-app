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
void _pause(WidgetTester tester) {
  for (final state in [
    AppLifecycleState.inactive,
    AppLifecycleState.hidden,
    AppLifecycleState.paused,
  ]) {
    tester.binding.handleAppLifecycleStateChanged(state);
  }
}

void _resume(WidgetTester tester) {
  for (final state in [
    AppLifecycleState.hidden,
    AppLifecycleState.inactive,
    AppLifecycleState.resumed,
  ]) {
    tester.binding.handleAppLifecycleStateChanged(state);
  }
}

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
  Completer<Result<ActivityRead>>? pending, pendingFirst;
  final nextResults = <String, Result<ActivityRead>>{};
  @override
  Future<Result<ActivityRead>> read(String? id) async {
    first++;
    return pendingFirst?.future ?? result;
  }

  @override
  Future<Result<ActivityRead>> readNext(String cursor) async {
    cursors.add(cursor);
    return pending?.future ?? Future.value(nextResults[cursor] ?? result);
  }
}

void main() {
  test('explicit Search retries the failed opaque batch without restarting the list', () async {
    final repo = Repo();
    final c = ProviderContainer(
      overrides: [
        activityRepositoryProvider.overrideWithValue(repo),
        authSessionProvider.overrideWithValue(
          const AsyncData(AuthSessionAuthenticated(subject: 'owner')),
        ),
      ],
    );
    final sub = c.listen(eventBatchesProvider, (_, _) {});
    addTearDown(sub.close);
    addTearDown(c.dispose);
    final controller = c.read(eventBatchesProvider.notifier);
    await controller.load();
    repo.nextResults['page1'] = const Failure(
      AppFailure(
        kind: AppFailureKind.serviceUnavailable,
        message: 'Synthetic batch failure',
      ),
    );
    await controller.loadAvailablePages();
    expect(c.read(eventBatchesProvider).failure, isNotNull);
    repo.nextResults['page1'] = Success(
      ActivityBatch(asOf: instant, items: [item('wanted')]),
    );
    await controller.loadAvailablePages();
    expect(repo.first, 1);
    expect(repo.cursors, ['page1', 'page1']);
    expect(c.read(eventBatchesProvider).batch!.items.map((e) => e.eventId), [
      'a',
      'wanted',
    ]);
    expect(c.read(eventBatchesProvider).failure, isNull);
  });

  testWidgets(
    'search can stop a slow later batch without losing query, rows or cursor',
    (tester) async {
      final repo = Repo()..pending = Completer<Result<ActivityRead>>();
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            activityRepositoryProvider.overrideWithValue(repo),
            authSessionProvider.overrideWithValue(
              const AsyncData(AuthSessionAuthenticated(subject: 'owner')),
            ),
          ],
          child: MaterialApp(
            theme: ThemeData(splashFactory: NoSplash.splashFactory),
            home: ParticipationEventsPage(onSelect: (_) {}),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.enterText(find.byKey(const Key('events-search')), 'a');
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pump();
      expect(repo.cursors, ['page1']);
      expect(find.byKey(const Key('events-stop-search')), findsOneWidget);
      expect(find.byKey(const ValueKey('a')), findsOneWidget);
      await tester.tap(find.byKey(const Key('events-stop-search')));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('a')), findsOneWidget);
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('events-search')))
            .controller!
            .text,
        'a',
      );
      repo.pending!.complete(
        Success(
          ActivityBatch(
            asOf: instant,
            items: [item('late')],
            nextCursor: 'page2',
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('late')), findsNothing);
      expect(repo.cursors, ['page1']);
      repo.pending = null;
      repo.nextResults['page1'] = Success(
        ActivityBatch(asOf: instant, items: [item('available')]),
      );
      await tester.tap(find.byTooltip('Search available events'));
      await tester.pumpAndSettle();
      expect(repo.cursors, ['page1', 'page1']);
      expect(find.byKey(const ValueKey('available')), findsOneWidget);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );

  test(
    'an invalidated initial search cannot page a replacement session',
    () async {
      final oldRead = Completer<Result<ActivityRead>>();
      final repo = Repo()..pendingFirst = oldRead;
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
      final controller = c.read(eventBatchesProvider.notifier);
      final oldSearch = controller.loadAvailablePages();
      sessions.add(AuthSessionAuthenticated(subject: 'b'));
      await Future<void>.delayed(Duration.zero);
      repo.pendingFirst = null;
      await c.read(eventBatchesProvider.notifier).load();
      oldRead.complete(
        Success(ActivityBatch(asOf: instant, items: [item('private-old')])),
      );
      await oldSearch;
      expect(repo.cursors, isEmpty);
      expect(c.read(eventBatchesProvider).batch!.items.single.eventId, 'a');
    },
  );

  testWidgets(
    'search includes later batches and preserves valid results on return',
    (tester) async {
      final repo = Repo();
      repo.nextResults['page1'] = Success(
        ActivityBatch(asOf: instant, items: [item('wanted')]),
      );
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authSessionProvider.overrideWithValue(
              const AsyncData(AuthSessionAuthenticated(subject: 'synthetic')),
            ),
            activityRepositoryProvider.overrideWithValue(repo),
          ],
          child: MaterialApp(
            theme: ThemeData(splashFactory: NoSplash.splashFactory),
            home: ParticipationEventsPage(onSelect: (_) {}),
          ),
        ),
      );
      await tester.pumpAndSettle();
      final search = find.byKey(const Key('events-search'));
      expect(search, findsOneWidget);
      await tester.enterText(search, 'wanted');
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pumpAndSettle();
      expect(repo.cursors, ['page1']);
      expect(find.byKey(const ValueKey('wanted')), findsOneWidget);
      _pause(tester);
      await tester.pump();
      _resume(tester);
      await tester.pumpAndSettle();
      expect(tester.widget<TextField>(search).controller!.text, 'wanted');
      expect(repo.first, 1);
      expect(repo.cursors, ['page1']);
      expect(find.byKey(const ValueKey('wanted')), findsOneWidget);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
  testWidgets('scroll then expire keeps Event disclosure storage separate', (
    tester,
  ) async {
    final repo = Repo()
      ..result = Success(
        ActivityBatch(
          asOf: instant,
          items: List.generate(12, (i) => item('Event $i')),
        ),
      );
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          activityRepositoryProvider.overrideWithValue(repo),
          authSessionProvider.overrideWithValue(
            const AsyncData(AuthSessionAuthenticated(subject: 'a')),
          ),
        ],
        child: MaterialApp(home: ParticipationEventsPage(onSelect: (_) {})),
      ),
    );
    await tester.pumpAndSettle();
    await tester.drag(find.byType(ListView), const Offset(0, -300));
    await tester.pumpAndSettle();
    final container = ProviderScope.containerOf(
      tester.element(find.byType(ParticipationEventsPage)),
    );
    container.read(eventBatchesProvider.notifier).clear();
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    await tester.ensureVisible(find.text('About these events'));
    await tester.tap(find.text('About these events'));
    await tester.pumpAndSettle();
    expect(
      find.textContaining('Ticketmaster supplies this available selection'),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });

  test('refresh retains readable rows, blocks old taps and pagination, and rejects cleared replies', () async {
    final repo = Repo();
    final c = ProviderContainer(
      overrides: [
        activityRepositoryProvider.overrideWithValue(repo),
        authSessionProvider.overrideWithValue(
          const AsyncData(AuthSessionAuthenticated(subject: 'a')),
        ),
      ],
    );
    final sub = c.listen(eventBatchesProvider, (_, _) {});
    addTearDown(sub.close);
    addTearDown(c.dispose);
    final ctrl = c.read(eventBatchesProvider.notifier);
    await ctrl.load();
    final old = c.read(eventBatchesProvider);
    repo.pendingFirst = Completer();
    final refresh = ctrl.load();
    expect(c.read(eventBatchesProvider).batch, same(old.batch));
    expect(ctrl.isCurrentSnapshot(old), isFalse);
    expect(ctrl.isCurrentSnapshot(c.read(eventBatchesProvider)), isFalse);
    await ctrl.next();
    await ctrl.load();
    expect(repo.first, 2);
    expect(repo.cursors, isEmpty);
    repo.pendingFirst!.complete(
      Success(ActivityBatch(asOf: instant, items: [item('b')])),
    );
    await refresh;
    expect(c.read(eventBatchesProvider).batch!.items.single.eventId, 'b');
    repo.pendingFirst = Completer();
    final retired = ctrl.load();
    ctrl.clear();
    repo.pendingFirst!.complete(
      Success(ActivityBatch(asOf: instant, items: [item('stale')])),
    );
    await retired;
    expect(c.read(eventBatchesProvider).batch, isNull);
    repo.pendingFirst = null;
    await ctrl.load();
    repo.result = const Failure(
      AppFailure(
        kind: AppFailureKind.serviceUnavailable,
        message: 'Source unavailable',
      ),
    );
    await ctrl.load();
    expect(c.read(eventBatchesProvider).batch, isNull);
    expect(c.read(eventBatchesProvider).failure, isNotNull);
  });

  testWidgets('compact filters and pull refresh work at 320dp and large text', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 812);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final repo = Repo()
      ..result = Success(
        ActivityBatch(
          asOf: instant,
          items: const [
            ActivitySummary(
              browseId: 'a',
              eventId: 'a',
              title: 'Quiet music',
              startAt: instant,
              categoryLabel: 'Music',
            ),
            ActivitySummary(
              browseId: 'b',
              eventId: 'b',
              title: 'Garden gathering',
              startAt: instant,
              categoryLabel: 'Community and culture',
            ),
          ],
        ),
      );
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          activityRepositoryProvider.overrideWithValue(repo),
          authSessionProvider.overrideWithValue(
            const AsyncData(AuthSessionAuthenticated(subject: 'a')),
          ),
        ],
        child: MaterialApp(
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context).copyWith(
              textScaler: const TextScaler.linear(2),
              disableAnimations: true,
            ),
            child: child!,
          ),
          home: ParticipationEventsPage(onSelect: (_) {}),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    await tester.tap(find.byTooltip('Filter event category'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Music').last);
    await tester.pumpAndSettle();
    expect(find.text('Quiet music'), findsOneWidget);
    expect(find.text('Garden gathering'), findsNothing);
    final calls = repo.first;
    await tester.drag(find.byType(ListView), const Offset(0, 350));
    await tester.pumpAndSettle();
    expect(repo.first, calls + 1);
    expect(find.text('Clear filter'), findsOneWidget);
    await tester.tap(find.text('Clear filter'));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });
  testWidgets(
    'bottom Next and Retry preserve rows then show terminal hint; background retains the original fresh snapshot',
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
      await tester.tap(find.byTooltip('Refresh events'));
      await tester.pumpAndSettle();
      repo.result = const Failure(
        AppFailure(
          kind: AppFailureKind.serviceUnavailable,
          message: 'Synthetic next failure',
        ),
      );
      final listScrollable = find
          .descendant(
            of: find.byType(ListView),
            matching: find.byType(Scrollable),
          )
          .first;
      await tester.scrollUntilVisible(
        find.text('Load more events'),
        -100,
        scrollable: listScrollable,
      );
      await tester.tap(find.text('Load more events'));
      await tester.pumpAndSettle();
      expect(find.textContaining('Synthetic next failure'), findsOneWidget);
      expect(find.text('Try loading more again'), findsOneWidget);
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
      await tester.tap(find.text('Try loading more again'));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.text('You’ve reached the end of the available events.'),
        200,
        scrollable: listScrollable,
      );
      expect(
        find.text('You’ve reached the end of the available events.'),
        findsOneWidget,
      );
      expect(repo.cursors, ['page1', 'page1']);
      final container = ProviderScope.containerOf(
        tester.element(find.byType(ParticipationEventsPage)),
      );
      _pause(tester);
      expect(container.read(eventBatchesProvider).batch, isNotNull);
      // Foreground return retains the original lifetime without another read.
      _resume(tester);
      await tester.pump();
      expect(find.text('Load more events'), findsNothing);
      expect(find.text('Second activity'), findsOneWidget);
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
