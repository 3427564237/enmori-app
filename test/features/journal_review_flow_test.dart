import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/content_access.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/check_in/check_in_providers.dart';
import 'package:enmori/features/check_in/domain/check_in_calendar_repository.dart';
import 'package:enmori/features/check_in/domain/check_in_repository.dart';
import 'package:enmori/features/check_in/presentation/check_in_calendar_page.dart';
import 'package:enmori/features/friends/domain/social_repository.dart';
import 'package:enmori/features/friends/presentation/check_in_map_preview.dart';
import 'package:enmori/features/friends/presentation/check_in_points_map.dart';
import 'package:enmori/features/friends/social_providers.dart';
import 'package:enmori/features/weather/domain/weather.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

const unavailable = Failure<CheckIn>(
  AppFailure(kind: AppFailureKind.checkInUnavailable, message: 'Unavailable'),
);

class _PreviewRepository implements SocialRepository {
  final ids = <String>[];
  Completer<Result<CheckIn>>? pending;
  @override
  Future<Result<CheckIn>> record(String username, String checkInId) {
    ids.add(checkInId);
    return pending?.future ??
        Future.value(
          Success(
            CheckIn(
              checkInId: checkInId,
              note: 'Authorized moment $checkInId',
              createdAt: DateTime.utc(2026, 10, 20),
              mood: 'Calm',
            ),
          ),
        );
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _CalendarRepository
    implements CheckInRepository, CheckInCalendarRepository {
  @override
  Future<Result<CheckInMonth>> readMonth({
    required String month,
    required String timeZone,
  }) async => Success(
    CheckInMonth(month: month, timeZone: timeZone, counts: {'$month-19': 2}),
  );
  @override
  Future<Result<CheckInHistoryPage>> readOwnForDate({
    required String date,
    required String timeZone,
    String? cursor,
  }) async => const Success(CheckInHistoryPage(checkIns: [], nextCursor: null));
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  testWidgets(
    'selected map summary clears on revocation and never fetches in background',
    (tester) async {
      final repo = _PreviewRepository();
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            socialRepositoryProvider.overrideWithValue(repo),
            authSessionProvider.overrideWith(
              (ref) => Stream.value(
                const AuthSessionAuthenticated(subject: 'owner'),
              ),
            ),
          ],
          child: MaterialApp(
            home: Scaffold(
              body: CheckInMapPreview(
                username: 'member',
                checkInId: 'selected-id',
                onOpen: () {},
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(repo.ids, ['selected-id']);
      expect(find.text('Authorized moment selected-id'), findsOneWidget);
      final container = ProviderScope.containerOf(
        tester.element(find.byType(CheckInMapPreview)),
      );
      repo.pending = Completer<Result<CheckIn>>();
      container.read(contentAccessProvider.notifier).changed();
      await tester.pump();
      expect(find.text('Authorized moment selected-id'), findsNothing);
      repo.pending!.complete(unavailable);
      await tester.pumpAndSettle();
      expect(find.text('Open Check-in'), findsNothing);
      expect(find.textContaining('Access may have changed'), findsOneWidget);
      final reads = repo.ids.length;
      container.read(contentAccessProvider.notifier).setForeground(false);
      await tester.pumpAndSettle();
      expect(repo.ids.length, reads);
      expect(find.text('Authorized moment selected-id'), findsNothing);
    },
  );

  testWidgets('same UID replacement ignores the old selected-record response', (
    tester,
  ) async {
    final repo = _PreviewRepository()..pending = Completer<Result<CheckIn>>();
    final old = repo.pending!;
    final sessions = StreamController<AuthSession>.broadcast(sync: true);
    addTearDown(sessions.close);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          socialRepositoryProvider.overrideWithValue(repo),
          authSessionProvider.overrideWith((ref) => sessions.stream),
        ],
        child: MaterialApp(
          home: Scaffold(
            body: CheckInMapPreview(
              username: 'member',
              checkInId: 'selected-id',
              onOpen: () {},
            ),
          ),
        ),
      ),
    );
    await tester.pump();
    sessions.add(AuthSessionAuthenticated(subject: 'same'));
    await tester.pump();
    repo.pending = Completer<Result<CheckIn>>();
    sessions.add(AuthSessionAuthenticated(subject: 'same'));
    await tester.pump();
    old.complete(
      Success(
        CheckIn(
          checkInId: 'selected-id',
          note: 'Old private content',
          createdAt: DateTime.utc(2026),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Old private content'), findsNothing);
    repo.pending!.complete(unavailable);
    await tester.pumpAndSettle();
    expect(find.text('Open Check-in'), findsNothing);
  });

  for (final size in [const Size(375, 812), const Size(812, 375)]) {
    testWidgets('calendar numbers remain readable at 2x text on $size', (
      tester,
    ) async {
      tester.view.physicalSize = size;
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            checkInRepositoryProvider.overrideWithValue(_CalendarRepository()),
            authSessionProvider.overrideWith(
              (ref) => Stream.value(
                const AuthSessionAuthenticated(subject: 'owner'),
              ),
            ),
          ],
          child: MaterialApp(
            builder: (context, child) => MediaQuery(
              data: MediaQuery.of(context).copyWith(
                textScaler: TextScaler.linear(2),
                disableAnimations: true,
              ),
              child: child!,
            ),
            home: CheckInCalendarPage(
              initialDate: DateTime.utc(2026, 10, 19),
              latestDate: DateTime.utc(2026, 10, 23),
              timeZone: 'Asia/Singapore',
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.byKey(const Key('calendar-day-19')));
      await tester.pumpAndSettle();
      expect(
        find.byKey(const Key('calendar-day-19')).hitTestable(),
        findsOneWidget,
      );
      await tester.tap(find.byKey(const Key('calendar-day-19')));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(find.text('19\n2'), findsOneWidget);
    });
  }

  testWidgets(
    'map selection browses adjacent moments before opening exact ID',
    (tester) async {
      final points = [
        for (var i = 0; i < 2; i++)
          CheckInMapPoint(
            checkInId: 'record-$i',
            createdAt: DateTime.utc(2026, 10, 19 + i),
            location: GeoPoint(1.0 + i, 103),
          ),
      ];
      String? opened;
      await tester.pumpWidget(
        MaterialApp(
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context).copyWith(
              textScaler: TextScaler.linear(2),
              disableAnimations: true,
            ),
            child: child!,
          ),
          home: Scaffold(
            body: SingleChildScrollView(
              child: CheckInPointsMap(
                points: points,
                onSelect: (point) => opened = point.checkInId,
                openAttribution: (_) async => true,
                tileLayerBuilder: () => const SizedBox.shrink(),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.byTooltip('Select Check-in 1'));
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('Select Check-in 1'));
      await tester.pumpAndSettle();
      expect(opened, isNull);
      expect(find.text('Check-in 1 of 2'), findsOneWidget);
      await tester.ensureVisible(find.byKey(const Key('map-next-record')));
      await tester.tap(find.byKey(const Key('map-next-record')));
      await tester.pumpAndSettle();
      expect(find.text('Check-in 2 of 2'), findsOneWidget);
      await tester.ensureVisible(find.text('Open Check-in'));
      await tester.tap(find.text('Open Check-in'));
      expect(opened, 'record-1');
      expect(tester.takeException(), isNull);
    },
  );
}
