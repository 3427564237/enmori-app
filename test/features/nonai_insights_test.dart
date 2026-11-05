import 'dart:async';
import 'dart:ui' show SemanticsAction;

import 'package:enmori/core/presentation/record_charts.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/check_in/check_in_providers.dart';
import 'package:enmori/features/check_in/domain/check_in_repository.dart';
import 'package:enmori/features/check_in/history_device_port.dart';
import 'package:enmori/features/check_in/presentation/check_in_record_insights.dart';
import 'package:enmori/features/check_in/presentation/check_in_search_controller.dart';
import 'package:enmori/features/check_in/presentation/check_in_weekly_review_page.dart';
import 'package:enmori/features/event_participation/domain/participation_repository.dart';
import 'package:enmori/features/event_participation/presentation/plan_status_insights.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_plans_test.dart' as plans;

final lastDate = DateTime.utc(2026, 11, 4);
CheckIn record(String id, {String? mood, String? activity}) => CheckIn(
  checkInId: id,
  note: 'Synthetic $id',
  mood: mood,
  activity: activity,
  createdAt: lastDate,
);

final class History implements CheckInRepository {
  final calls = <String>[];
  Completer<Result<CheckInHistoryPage>>? pending;
  @override
  Future<Result<CheckInHistoryPage>> readOwnForDate({
    required String date,
    required String timeZone,
    String? cursor,
  }) async {
    calls.add(date);
    final held = pending;
    pending = null;
    if (held != null) return held.future;
    return Success(
      CheckInHistoryPage(
        checkIns: date == '2026-11-04'
            ? [
                record('a', mood: 'Calm', activity: 'Walk'),
                record('b', mood: 'Calm'),
              ]
            : date == '2026-11-03'
            ? [record('c', mood: 'Happy', activity: 'Read')]
            : [],
        nextCursor: null,
      ),
    );
  }

  @override
  dynamic noSuchMethod(Invocation invocation) =>
      throw StateError('No writes in insights');
}

final class Device implements HistoryDevicePort {
  @override
  Future<String> captureIanaZone() async => 'Asia/Singapore';
  @override
  Future<DateTime> todayInZone(String zone) async => lastDate;
  @override
  Future<List<String>> formatInstants(
    List<DateTime> values,
    String zone,
  ) async => [for (final _ in values) '12:00'];
}

Future<void> reveal(WidgetTester tester, Finder finder) async {
  if (finder.evaluate().isEmpty) {
    await tester.scrollUntilVisible(
      finder,
      220,
      maxScrolls: 60,
      scrollable: find.byType(Scrollable).first,
    );
  } else {
    await tester.ensureVisible(finder);
  }
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('chart dates expose an actionable semantic date filter', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    String? selected;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            child: CheckInRecordInsights(
              state: const CheckInSearchState(
                phase: CheckInSearchPhase.complete,
                daysRead: 7,
                totalDays: 7,
              ),
              lastDate: lastDate,
              dayCount: 7,
              selectedDate: null,
              onSelectDate: (date) => selected = date,
            ),
          ),
        ),
      ),
    );
    await reveal(tester, find.byKey(const Key('insights-day-2026-11-03')));
    final day = tester.getSemantics(
      find.bySemanticsLabel('2026-11-03: 0 records'),
    );
    expect(day.getSemanticsData().hasAction(SemanticsAction.tap), isTrue);
    day.owner!.performAction(day.id, SemanticsAction.tap);
    expect(selected, '2026-11-03');
    semantics.dispose();
  });

  testWidgets('coverage uses civil dates, raw labels and marks unread dates', (
    tester,
  ) async {
    String? selected;
    final state = CheckInSearchState(
      phase: CheckInSearchPhase.stopped,
      daysRead: 1,
      totalDays: 7,
      matches: [
        CheckInSearchMatch(record('a', mood: 'calm'), '12:00', '2026-11-04'),
        CheckInSearchMatch(record('b', mood: 'calm'), '13:00', '2026-11-04'),
        CheckInSearchMatch(
          record('c', activity: 'walk'),
          '12:00',
          '2026-11-03',
        ),
      ],
    );
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            child: CheckInRecordInsights(
              state: state,
              lastDate: lastDate,
              dayCount: 7,
              selectedDate: null,
              onSelectDate: (date) => selected = date,
            ),
          ),
        ),
      ),
    );
    final ring = tester.widget<RecordRing>(find.byType(RecordRing));
    expect(ring.value, '2/7');
    expect(ring.segments.single.fraction, closeTo(2 / 7, .0001));
    expect(find.textContaining('Reading is incomplete'), findsOneWidget);
    expect(find.text('?'), findsNWidgets(5));
    expect(find.text('≥1'), findsOneWidget);
    expect(find.text('calm · 2'), findsOneWidget);
    await reveal(tester, find.byKey(const Key('insights-day-2026-11-03')));
    await tester.tap(find.byKey(const Key('insights-day-2026-11-03')));
    expect(selected, '2026-11-03');
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'range change clears results and ignores a previous pending read',
    (tester) async {
      final history = History()..pending = Completer();
      final held = history.pending!;
      final scope = ProviderContainer(
        overrides: [
          authSessionProvider.overrideWithValue(
            const AsyncData(AuthSessionAuthenticated(subject: 'owner')),
          ),
          checkInRepositoryProvider.overrideWithValue(history),
          historyDevicePortProvider.overrideWithValue(Device()),
        ],
      );
      addTearDown(scope.dispose);
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: scope,
          child: MaterialApp(
            home: CheckInWeeklyReviewPage(
              lastDate: lastDate,
              timeZone: 'Asia/Singapore',
              onOpen: (_) {},
            ),
          ),
        ),
      );
      await tester.tap(find.byKey(const Key('weekly-review-load')));
      await tester.pump();
      await tester.tap(find.byKey(const Key('review-range-28')));
      await tester.pump();
      expect(
        scope.read(checkInWeeklyReviewProvider).phase,
        CheckInSearchPhase.idle,
      );
      held.complete(
        Success(
          CheckInHistoryPage(checkIns: [record('old')], nextCursor: null),
        ),
      );
      await tester.pumpAndSettle();
      expect(scope.read(checkInWeeklyReviewProvider).matches, isEmpty);
      expect(find.byType(RecordRing), findsNothing);
      await tester.tap(find.byKey(const Key('weekly-review-load')));
      await tester.pumpAndSettle();
      expect(scope.read(checkInWeeklyReviewProvider).daysRead, 28);
      expect(history.calls.last, '2026-10-08');
      expect(
        scope
            .read(checkInWeeklyReviewProvider)
            .matches
            .map((e) => e.record.checkInId),
        ['a', 'b', 'c'],
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'selecting a day filters the original records and opens its real ID',
    (tester) async {
      String? opened;
      final history = History();
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authSessionProvider.overrideWithValue(
              const AsyncData(AuthSessionAuthenticated(subject: 'owner')),
            ),
            checkInRepositoryProvider.overrideWithValue(history),
            historyDevicePortProvider.overrideWithValue(Device()),
          ],
          child: MaterialApp(
            home: CheckInWeeklyReviewPage(
              lastDate: lastDate,
              timeZone: 'Asia/Singapore',
              onOpen: (id) => opened = id,
            ),
          ),
        ),
      );
      await tester.tap(find.byKey(const Key('weekly-review-load')));
      await tester.pumpAndSettle();
      await reveal(tester, find.byKey(const Key('insights-day-2026-11-03')));
      await tester.tap(find.byKey(const Key('insights-day-2026-11-03')));
      await tester.pumpAndSettle();
      await reveal(tester, find.byKey(const Key('weekly-record-c')));
      expect(find.byKey(const Key('weekly-record-a')), findsNothing);
      await tester.tap(find.byKey(const Key('weekly-record-c')));
      await tester.pumpAndSettle();
      expect(opened, 'c');
      expect(find.byType(RecordRing), findsNothing);
    },
  );

  testWidgets(
    'event statuses are disjoint, hidden overlaps and uncertainty is explicit',
    (tester) async {
      ParticipationStatus? selected;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: PlanStatusInsights(
                rows: [
                  plans.fact(
                    'a',
                    status: ParticipationStatus.going,
                    ignored: true,
                  ),
                  plans.fact('b'),
                  plans.fact('c', status: ParticipationStatus.none),
                ],
                complete: false,
                refreshing: false,
                failed: true,
                unconfirmed: true,
                onSelectStatus: (status) => selected = status,
              ),
            ),
          ),
        ),
      );
      final ring = tester.widget<RecordRing>(find.byType(RecordRing));
      expect(ring.value, '3');
      expect(
        ring.segments.map((s) => s.fraction),
        everyElement(closeTo(1 / 3, .0001)),
      );
      expect(find.textContaining('Refresh failed.'), findsOneWidget);
      expect(
        find.textContaining('Some changes are unconfirmed.'),
        findsOneWidget,
      );
      expect(
        find.textContaining('1 hidden from recommendations'),
        findsOneWidget,
      );
      await reveal(tester, find.byKey(const Key('plans-chart-going')));
      await tester.tap(find.byKey(const Key('plans-chart-going')));
      expect(selected, ParticipationStatus.going);
    },
  );
}
