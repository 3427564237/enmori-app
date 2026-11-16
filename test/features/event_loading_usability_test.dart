import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/event_browse/domain/activity_repository.dart';
import 'package:enmori/features/event_browse/event_browse_providers.dart';
import 'package:enmori/features/event_participation/presentation/event_batches_controller.dart';
import 'package:enmori/features/event_participation/presentation/participation_events_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

const _asOf = '2026-11-12T00:00:00.000Z';
ActivityBatch _batch(String title, {String? nextCursor}) => ActivityBatch(
  asOf: _asOf,
  sourceStatus: const {'ticketmaster': true, 'onepa': false},
  items: [
    ActivitySummary(
      browseId: title,
      eventId: title,
      title: title,
      categoryLabel: 'Community',
      startAt: '2026-11-14T09:00:00.000Z',
    ),
  ],
  nextCursor: nextCursor,
);

class _Repo implements PagedActivityRepository {
  int firstReads = 0;
  int nextReads = 0;
  Completer<Result<ActivityRead>>? first, next;
  ActivityBatch result = _batch('Garden walk', nextCursor: 'next-page');
  @override
  Future<Result<ActivityRead>> read(String? id) async {
    firstReads++;
    return first?.future ?? Success(result);
  }

  @override
  Future<Result<ActivityRead>> readNext(String cursor) async {
    nextReads++;
    return next?.future ?? Success(_batch('Later event'));
  }
}

Future<void> _mount(
  WidgetTester tester,
  _Repo repo, {
  ValueChanged<String>? onSelect,
  VoidCallback? onOpenPlans,
}) => tester.pumpWidget(
  ProviderScope(
    overrides: [
      activityRepositoryProvider.overrideWithValue(repo),
      authSessionProvider.overrideWithValue(
        const AsyncData(AuthSessionAuthenticated(subject: 'owner')),
      ),
    ],
    child: MaterialApp(
      home: ParticipationEventsPage(
        onSelect: onSelect ?? (_) {},
        onOpenPlans: onOpenPlans,
      ),
    ),
  ),
);

void main() {
  testWidgets(
    'stopping a pulled refresh dismisses its spinner before HTTP finishes',
    (tester) async {
      final repo = _Repo();
      await _mount(tester, repo);
      await tester.pumpAndSettle();
      await tester.enterText(find.byKey(const Key('events-search')), 'Garden');
      FocusManager.instance.primaryFocus?.unfocus();
      await tester.pump();
      final pending = Completer<Result<ActivityRead>>();
      repo.first = pending;
      await tester.drag(
        find.byKey(const PageStorageKey('events-browse')),
        const Offset(0, 400),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
      expect(repo.firstReads, 2);
      expect(find.byType(RefreshProgressIndicator), findsOneWidget);
      await tester.tap(find.text('Stop waiting'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 500));
      expect(pending.isCompleted, isFalse);
      expect(find.byType(RefreshProgressIndicator), findsNothing);
      expect(find.text('Stopped waiting for events'), findsOneWidget);
      pending.complete(Success(_batch('Garden late', nextCursor: 'late-page')));
      await tester.pumpAndSettle();
      expect(find.text('Garden late'), findsNothing);
      expect(repo.nextReads, 0);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'Singapore browse explains its scope without an inactive area picker',
    (tester) async {
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day, 12);
      final repo = _Repo()
        ..result = ActivityBatch(
          asOf: _asOf,
          items: [
            for (final day in [0, 1])
              ActivitySummary(
                browseId: 'day-$day',
                title: day == 0 ? 'Today event' : 'Tomorrow event',
                categoryLabel: 'Community',
                startAt: today
                    .add(Duration(days: day))
                    .toUtc()
                    .toIso8601String(),
              ),
          ],
        );
      await _mount(tester, repo);
      await tester.pumpAndSettle();
      expect(find.text('Events across Singapore'), findsOneWidget);
      expect(find.byIcon(Icons.place_outlined), findsNothing);
      expect(find.text('All Singapore'), findsNothing);
      await tester.tap(find.text('Filters and sort'));
      await tester.pumpAndSettle();
      expect(find.byTooltip('Filter event category'), findsOneWidget);
      expect(find.byType(DropdownButtonFormField<int>), findsOneWidget);
      await tester.tap(find.byKey(const Key('events-time-today')));
      await tester.tap(find.text('Filters and sort'));
      await tester.pumpAndSettle();
      expect(find.text('Today event'), findsOneWidget);
      expect(find.text('Tomorrow event'), findsNothing);
      expect(repo.firstReads, 1);
      await tester.ensureVisible(find.text('About these events'));
      await tester.tap(find.text('About these events'));
      await tester.pumpAndSettle();
      expect(find.textContaining('not their full catalogues'), findsOneWidget);
    },
  );

  testWidgets('stopping refresh retires the previous source snapshot', (
    tester,
  ) async {
    final repo = _Repo();
    final selected = <String>[];
    await _mount(tester, repo, onSelect: selected.add);
    await tester.pumpAndSettle();
    final previousTap = tester
        .widget<InkWell>(find.byKey(const ValueKey('event-open-Garden walk')))
        .onTap!;
    final container = ProviderScope.containerOf(
      tester.element(find.byType(ParticipationEventsPage)),
    );
    final controller = container.read(eventBatchesProvider.notifier);
    repo.first = Completer<Result<ActivityRead>>();
    final refresh = controller.load();
    await tester.pump();
    await tester.tap(find.text('Stop waiting'));
    await tester.pumpAndSettle();
    expect(find.text('Garden walk'), findsNothing);
    expect(controller.hasFreshBatch, isFalse);
    previousTap();
    expect(selected, isEmpty);
    repo.first!.complete(Success(_batch('Late refreshed event')));
    await refresh;
    await tester.pumpAndSettle();
    expect(find.text('Late refreshed event'), findsNothing);
    repo.first = null;
    repo.result = _batch('Fresh reload');
    await tester.tap(find.text('Reload'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Fresh reload'));
    expect(selected, ['Fresh reload']);
  });

  testWidgets(
    'initial wait explains delay and stop ignores the late response',
    (tester) async {
      final pending = Completer<Result<ActivityRead>>();
      final repo = _Repo()..first = pending;
      await _mount(tester, repo);
      await tester.pump();
      expect(find.text('Reading event sources…'), findsOneWidget);
      await tester.pump(const Duration(seconds: 12));
      expect(find.text('Still waiting for event sources…'), findsOneWidget);
      expect(find.textContaining('a few minutes'), findsOneWidget);
      await tester.tap(find.text('Stop waiting'));
      await tester.pumpAndSettle();
      expect(find.text('Stopped waiting for events'), findsOneWidget);
      expect(find.textContaining('expired or was cleared'), findsNothing);
      pending.complete(Success(_batch('Late result')));
      await tester.pumpAndSettle();
      expect(find.text('Late result'), findsNothing);
      repo.first = null;
      await tester.tap(find.text('Reload'));
      await tester.pumpAndSettle();
      expect(repo.firstReads, 2);
      expect(find.text('Garden walk'), findsOneWidget);
      expect(find.text('Stopped waiting for events'), findsNothing);
    },
  );

  testWidgets(
    'next page keeps valid cards open with expiry and refresh guards',
    (tester) async {
      final pending = Completer<Result<ActivityRead>>();
      final repo = _Repo()..next = pending;
      final selected = <String>[];
      await _mount(tester, repo, onSelect: selected.add);
      await tester.pumpAndSettle();
      final container = ProviderScope.containerOf(
        tester.element(find.byType(ParticipationEventsPage)),
      );
      final controller = container.read(eventBatchesProvider.notifier);
      await tester.ensureVisible(find.text('Load more events'));
      final next = controller.next();
      await tester.pump();
      expect(find.text('Reading more events…').hitTestable(), findsOneWidget);
      final open = tester
          .widget<InkWell>(find.byKey(const ValueKey('event-open-Garden walk')))
          .onTap;
      expect(open, isNotNull);
      open!();
      expect(selected, ['Garden walk']);
      await tester.pump(const Duration(minutes: 5));
      expect(controller.hasFreshBatch, isFalse);
      open();
      expect(selected, ['Garden walk']);
      pending.complete(Success(_batch('Late next page')));
      await next;
      await tester.pumpAndSettle();
      expect(find.text('Late next page'), findsNothing);
      await controller.load();
      await tester.pumpAndSettle();
      repo.first = Completer<Result<ActivityRead>>();
      final refresh = controller.load();
      await tester.pump();
      expect(
        tester
            .widget<InkWell>(
              find.byKey(const ValueKey('event-open-Garden walk')),
            )
            .onTap,
        isNull,
      );
      controller.stopSearch();
      repo.first!.complete(Success(_batch('Ignored refresh')));
      await refresh;
      await tester.pumpAndSettle();
    },
  );

  testWidgets(
    'compact browse keeps plans and first event visible with filters',
    (tester) async {
      tester.view.physicalSize = const Size(360, 800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      var plans = 0;
      await _mount(tester, _Repo(), onOpenPlans: () => plans++);
      await tester.pumpAndSettle();
      expect(find.text('My plans').hitTestable(), findsOneWidget);
      expect(find.text('Garden walk').hitTestable(), findsOneWidget);
      expect(find.text('No cover provided by source.'), findsNothing);
      expect(find.text('onePA: unavailable'), findsOneWidget);
      expect(find.byType(DropdownButtonFormField<int>), findsNothing);
      await tester.tap(find.text('My plans'));
      expect(plans, 1);
      await tester.tap(find.text('Filters and sort'));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('events-time-today')), findsOneWidget);
      expect(find.byTooltip('Filter event category'), findsOneWidget);
      expect(find.byType(DropdownButtonFormField<int>), findsOneWidget);
      await tester.tap(find.byKey(const Key('events-time-today')));
      await tester.tap(find.text('Filters and sort'));
      await tester.pumpAndSettle();
      expect(
        find.text('Today · All categories · Source order'),
        findsOneWidget,
      );
      expect(
        find.textContaining('No matching events in the loaded selection'),
        findsOneWidget,
      );
      await tester.ensureVisible(find.text('About these events'));
      await tester.tap(find.text('About these events'));
      await tester.pumpAndSettle();
      expect(find.textContaining('not your sign-in token'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
}
