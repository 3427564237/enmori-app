import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/check_in/check_in_providers.dart';
import 'package:enmori/features/check_in/domain/check_in_repository.dart'
    as domain;
import 'package:enmori/features/check_in/domain/check_in_calendar_repository.dart';
import 'package:enmori/features/check_in/history_device_port.dart';
import 'package:enmori/features/check_in/presentation/check_in_history_page.dart';
import 'package:enmori/features/check_in/presentation/check_in_calendar_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _Device implements HistoryDevicePort {
  @override
  Future<String> captureIanaZone() async => 'Asia/Singapore';
  @override
  Future<DateTime> todayInZone(String ianaZone) async =>
      DateTime.utc(2026, 10, 19);
  @override
  Future<List<String>> formatInstants(
    List<DateTime> instants,
    String ianaZone,
  ) async => instants.map((_) => '10:00').toList();
}

class _CalendarRepo
    implements domain.CheckInRepository, CheckInCalendarRepository {
  final queries = <String>[];
  final dayQueries = <({String date, String zone, String? cursor})>[];
  @override
  Future<Result<CheckInMonth>> readMonth({
    required String month,
    required String timeZone,
  }) async {
    queries.add(month);
    final date = DateTime.parse('$month-01');
    return Success(
      CheckInMonth(
        month: month,
        timeZone: timeZone,
        counts: {
          for (
            var day = 1;
            day <= DateTime.utc(date.year, date.month + 1, 0).day;
            day++
          )
            '$month-${day.toString().padLeft(2, '0')}': day == 19
                ? 2
                : day == 12
                ? 1
                : 0,
        },
      ),
    );
  }

  @override
  Future<Result<domain.CheckInHistoryPage>> readOwnForDate({
    required String date,
    required String timeZone,
    String? cursor,
  }) async {
    dayQueries.add((date: date, zone: timeZone, cursor: cursor));
    return Success(
      domain.CheckInHistoryPage(
        checkIns: [
          domain.CheckIn(
            checkInId: cursor == null ? 'first' : 'target-42',
            note: cursor == null ? 'First record' : 'Exact selected record',
            createdAt: DateTime.utc(2026, 10, 19),
          ),
        ],
        nextCursor: cursor == null ? 'next' : null,
      ),
    );
  }

  @override
  Future<Result<domain.CheckIn>> readOwned({required String checkInId}) =>
      throw UnimplementedError();
  @override
  Future<Result<domain.CheckIn>> create({
    String? locationLabel,
    required String note,
    required String idempotencyKey,
    String? mood,
    String? activity,
    CheckInVisibility? visibility,
  }) => throw UnimplementedError();
}

void main() {
  testWidgets(
    'month counts, month navigation and second-page record return to exact History item',
    (tester) async {
      final repo = _CalendarRepo();
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            checkInRepositoryProvider.overrideWithValue(repo),
            historyDevicePortProvider.overrideWithValue(_Device()),
            authSessionProvider.overrideWith(
              (ref) => Stream.value(
                const AuthSessionAuthenticated(subject: 'owner'),
              ),
            ),
          ],
          child: MaterialApp(
            home: CheckInHistoryPage(onBack: () {}, onOpenSavedCheckIn: (_) {}),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('history-month-calendar')));
      await tester.pumpAndSettle();
      expect(find.byType(CheckInCalendarPage), findsOneWidget);
      expect(find.text('2026-10'), findsOneWidget);
      expect(find.text('19\n2'), findsOneWidget);
      await tester.tap(find.byKey(const Key('calendar-previous-month')));
      await tester.pumpAndSettle();
      expect(repo.queries, contains('2026-09'));
      await tester.tap(find.byKey(const Key('calendar-next-month')));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.byKey(const Key('calendar-day-19')));
      await tester.tap(find.byKey(const Key('calendar-day-19')));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.text('Next records'),
        200,
        scrollable: find
            .descendant(
              of: find.byType(CheckInCalendarPage),
              matching: find.byType(Scrollable),
            )
            .first,
      );
      await tester.ensureVisible(find.text('Next records'));
      await tester.pumpAndSettle();
      expect(find.text('Next records').hitTestable(), findsOneWidget);
      await tester.tap(find.text('Next records'));
      await tester.pumpAndSettle();
      await tester.ensureVisible(
        find.byKey(const Key('calendar-record-target-42')),
      );
      await tester.tap(find.byKey(const Key('calendar-record-target-42')));
      await tester.pumpAndSettle();
      expect(find.byType(CheckInCalendarPage), findsNothing);
      expect(find.byKey(const Key('history-entry-first')), findsOneWidget);
      expect(find.byKey(const Key('history-entry-target-42')), findsOneWidget);
      expect(find.text('Exact selected record'), findsOneWidget);
      await tester.pump(const Duration(seconds: 4));
      await tester.tap(find.byKey(const Key('history-previous-recorded-day')));
      await tester.pumpAndSettle();
      expect(repo.dayQueries.last, (
        date: '2026-10-12',
        zone: 'Asia/Singapore',
        cursor: null,
      ));
      expect(find.byKey(const Key('history-entry-target-42')), findsNothing);
      await tester.tap(find.byKey(const Key('history-next-recorded-day')));
      await tester.pumpAndSettle();
      expect(repo.dayQueries.last.date, '2026-10-19');
      expect(tester.takeException(), isNull);
    },
  );
}
