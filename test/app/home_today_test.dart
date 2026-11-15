import 'dart:async';

import 'package:enmori/app/enmori_theme.dart';
import 'package:enmori/app/home_today_provider.dart';
import 'package:enmori/app/home_today_section.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/content_access.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/check_in/check_in_providers.dart';
import 'package:enmori/features/check_in/domain/check_in_repository.dart';
import 'package:enmori/features/check_in/history_device_port.dart';
import 'package:enmori/features/check_in/presentation/check_in_history_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _Device implements HistoryDevicePort {
  String zone = 'Asia/Singapore';
  DateTime today = DateTime.utc(2026, 10, 23);
  final formatted = <List<DateTime>>[];
  @override
  Future<String> captureIanaZone() async => zone;
  @override
  Future<DateTime> todayInZone(String ianaZone) async => today;
  @override
  Future<List<String>> formatInstants(
    List<DateTime> instants,
    String ianaZone,
  ) async {
    formatted.add(instants);
    return [for (final _ in instants) '10:30'];
  }
}

class _Repository implements CheckInRepository {
  final calls = <({String date, String zone, String? cursor})>[];
  FutureOr<Result<CheckInHistoryPage>> result = Success(
    CheckInHistoryPage(checkIns: [_record('one')], nextCursor: null),
  );
  @override
  Future<Result<CheckInHistoryPage>> readOwnForDate({
    required String date,
    required String timeZone,
    String? cursor,
  }) async {
    calls.add((date: date, zone: timeZone, cursor: cursor));
    return await result;
  }

  @override
  Future<Result<CheckIn>> readOwned({required String checkInId}) =>
      throw UnimplementedError();
  @override
  Future<Result<CheckIn>> create({
    String? locationLabel,
    String? mood,
    String? activity,
    CheckInVisibility? visibility,
    required String note,
    required String idempotencyKey,
  }) => throw UnimplementedError();
}

CheckIn _record(String id, {String? note}) => CheckIn(
  checkInId: id,
  note: note ?? 'Saved $id',
  createdAt: DateTime.utc(2026, 10, 23, 2, 30),
);
Result<CheckInHistoryPage> _page(List<CheckIn> records, {String? cursor}) =>
    Success(CheckInHistoryPage(checkIns: records, nextCursor: cursor));
const _failure = Failure<CheckInHistoryPage>(
  AppFailure(
    kind: AppFailureKind.serviceUnavailable,
    message: 'Service unavailable.',
  ),
);

Future<void> _drain() async {
  for (var i = 0; i < 10; i++) {
    await Future<void>.delayed(Duration.zero);
  }
}

ProviderContainer _container(_Repository repository, _Device device) {
  final container = ProviderContainer(
    overrides: [
      authSessionProvider.overrideWithValue(
        const AsyncData(AuthSessionAuthenticated(subject: 'owner')),
      ),
      checkInRepositoryProvider.overrideWithValue(repository),
      historyDevicePortProvider.overrideWithValue(device),
    ],
  );
  container.listen(homeTodayProvider, (_, _) {});
  addTearDown(container.dispose);
  return container;
}

void main() {
  test(
    'queries captured owner day once, formats at most three and does not page',
    () async {
      final repository = _Repository()
        ..result = _page([
          for (var i = 0; i < 5; i++) _record('$i'),
        ], cursor: 'more');
      final device = _Device();
      final container = _container(repository, device);
      final snapshot = (await container.read(homeTodayProvider.future))!;
      expect(repository.calls, [
        (date: '2026-10-23', zone: 'Asia/Singapore', cursor: null),
      ]);
      expect(snapshot.entries.map((e) => e.checkIn.checkInId), ['0', '1', '2']);
      expect(snapshot.hasMore, isTrue);
      expect(device.formatted.single, hasLength(3));
    },
  );

  test(
    'history date selection does not change Home day or trigger a Home query',
    () async {
      final repository = _Repository();
      final device = _Device();
      final container = _container(repository, device);
      final today = await container.read(homeTodayProvider.future);
      container.listen(checkInHistoryControllerProvider, (_, _) {});
      await _drain();
      await container
          .read(checkInHistoryControllerProvider.notifier)
          .selectDate(DateTime.utc(2026, 10, 20));
      expect(
        container.read(checkInHistoryControllerProvider).selectedDate,
        DateTime.utc(2026, 10, 20),
      );
      expect(container.read(homeTodayProvider).asData?.value, same(today));
      expect(repository.calls.map((c) => c.date), [
        '2026-10-23',
        '2026-10-23',
        '2026-10-20',
      ]);
    },
  );

  test(
    'background retires pending read; resume captures new date and zone',
    () async {
      final pending = Completer<Result<CheckInHistoryPage>>();
      final repository = _Repository()..result = pending.future;
      final device = _Device();
      final container = _container(repository, device);
      await _drain();
      container.read(contentAccessProvider.notifier).setForeground(false);
      await _drain();
      pending.complete(_page([_record('retired')]));
      await _drain();
      expect(container.read(homeTodayProvider).asData?.value, isNull);
      expect(repository.calls, hasLength(1));
      device.zone = 'America/New_York';
      device.today = DateTime.utc(2026, 10, 24);
      repository.result = _page([_record('new-day')]);
      container.read(contentAccessProvider.notifier).setForeground(true);
      final snapshot = (await container.read(homeTodayProvider.future))!;
      expect(snapshot.entries.single.checkIn.checkInId, 'new-day');
      expect(repository.calls.last, (
        date: '2026-10-24',
        zone: 'America/New_York',
        cursor: null,
      ));
    },
  );

  test(
    'replacement session with same UID retires earlier completion',
    () async {
      final sessions = StreamController<AuthSession>.broadcast(sync: true);
      final old = Completer<Result<CheckInHistoryPage>>();
      final repository = _Repository()..result = old.future;
      final container = ProviderContainer(
        overrides: [
          authSessionProvider.overrideWith((_) => sessions.stream),
          checkInRepositoryProvider.overrideWithValue(repository),
          historyDevicePortProvider.overrideWithValue(_Device()),
        ],
      );
      addTearDown(() async {
        container.dispose();
        await sessions.close();
      });
      container.listen(homeTodayProvider, (_, _) {});
      await _drain();
      sessions.add(AuthSessionAuthenticated(subject: 'same-owner'));
      await _drain();
      repository.result = _page([_record('replacement')]);
      sessions.add(AuthSessionAuthenticated(subject: 'same-owner'));
      await _drain();
      old.complete(_page([_record('retired')]));
      await _drain();
      expect(
        container
            .read(homeTodayProvider)
            .asData!
            .value!
            .entries
            .single
            .checkIn
            .checkInId,
        'replacement',
      );
      sessions.add(const AuthSessionUnauthenticated());
      await _drain();
      expect(container.read(homeTodayProvider).asData?.value, isNull);
    },
  );

  testWidgets(
    'detail return rereads edited content and blocks duplicate navigation',
    (tester) async {
      final repository = _Repository();
      final returning = Completer<void>();
      final opened = <String>[];
      await _mount(
        tester,
        repository,
        _Device(),
        onOpen: (id) {
          opened.add(id);
          return returning.future;
        },
      );
      await tester.tap(find.byKey(const Key('home-today-one')));
      await tester.pump();
      await tester.tap(find.byKey(const Key('home-today-one')));
      expect(opened, ['one']);
      repository.result = _page([_record('one', note: 'Edited in detail')]);
      returning.complete();
      await tester.pumpAndSettle();
      expect(find.text('Edited in detail'), findsOneWidget);
      expect(find.text('Saved one'), findsNothing);
      expect(repository.calls, hasLength(2));
    },
  );

  testWidgets(
    'failed mutation reread clears old facts; retry can reveal deletion',
    (tester) async {
      final repository = _Repository();
      final container = await _mount(tester, repository, _Device());
      expect(find.text('Saved one'), findsOneWidget);
      final pending = Completer<Result<CheckInHistoryPage>>();
      repository.result = pending.future;
      container.read(contentAccessProvider.notifier).changed();
      await tester.pump();
      expect(find.text('Saved one'), findsNothing);
      pending.complete(_failure);
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('home-today-failure')), findsOneWidget);
      expect(find.text('Saved one'), findsNothing);
      repository.result = _page([]);
      await tester.tap(find.byKey(const Key('home-today-retry')));
      await tester.pumpAndSettle();
      expect(find.textContaining('No saved Check-ins'), findsOneWidget);
      expect(find.text('Saved one'), findsNothing);
    },
  );

  testWidgets('midnight refresh recaptures date and zone without paging', (
    tester,
  ) async {
    final device = _Device();
    var clock = DateTime(2026, 10, 23, 23, 59, 58);
    final repository = _Repository();
    await _mount(tester, repository, device, clock: () => clock);
    device.today = DateTime.utc(2026, 10, 24);
    device.zone = 'Asia/Tokyo';
    clock = DateTime(2026, 10, 24);
    repository.result = _page([_record('tomorrow')]);
    await tester.pump(const Duration(seconds: 3));
    await tester.pumpAndSettle();
    expect(find.text('Saved tomorrow'), findsOneWidget);
    expect(find.text('Saved one'), findsNothing);
    expect(repository.calls.last, (
      date: '2026-10-24',
      zone: 'Asia/Tokyo',
      cursor: null,
    ));
    expect(repository.calls, hasLength(2));
  });

  testWidgets(
    'a rendered callback cannot navigate after foreground authority changes',
    (tester) async {
      var opened = 0;
      final container = await _mount(
        tester,
        _Repository(),
        _Device(),
        onOpen: (_) async {
          opened++;
        },
      );
      final oldTap = tester
          .widget<ListTile>(find.byKey(const Key('home-today-one')))
          .onTap!;
      container.read(contentAccessProvider.notifier).setForeground(false);
      oldTap();
      await tester.pumpAndSettle();
      expect(opened, 0);
      expect(find.text('Saved one'), findsNothing);
    },
  );

  testWidgets(
    'history return reloads while sparse page never claims complete emptiness',
    (tester) async {
      final repository = _Repository()..result = _page([], cursor: 'more');
      var opens = 0;
      await _mount(
        tester,
        repository,
        _Device(),
        onHistory: () async {
          opens++;
        },
      );
      await tester.ensureVisible(find.byKey(const Key('home-today-history')));
      await tester.tap(find.byKey(const Key('home-today-history')));
      await tester.pumpAndSettle();
      expect(opens, 1);
      expect(repository.calls, hasLength(2));
      expect(find.textContaining('Open history for more'), findsOneWidget);
      expect(find.textContaining('No saved Check-ins'), findsNothing);
    },
  );

  for (final locale in ['en', 'zh']) {
    for (final size in [const Size(360, 640), const Size(640, 360)]) {
      testWidgets(
        '$locale day summary supports 2x text and reduced motion at $size',
        (tester) async {
          tester.view.physicalSize = size;
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          final repository = _Repository()
            ..result = _page([
              _record(
                'long',
                note:
                    'A saved personal sentence that remains in its original language. ' *
                    3,
              ),
              _record('two'),
              _record('three'),
              _record('four'),
            ]);
          await _mount(tester, repository, _Device(), locale: locale, scale: 2);
          expect(find.byKey(const Key('home-today-four')), findsNothing);
          await tester.ensureVisible(
            find.byKey(const Key('home-today-history')),
          );
          await tester.pumpAndSettle();
          expect(tester.takeException(), isNull);
          expect(
            find.text(locale == 'zh' ? '历史记录' : 'History'),
            findsOneWidget,
          );
        },
      );
    }
  }
}

Future<ProviderContainer> _mount(
  WidgetTester tester,
  _Repository repository,
  _Device device, {
  Future<void> Function(String)? onOpen,
  Future<void> Function()? onHistory,
  DateTime Function()? clock,
  String locale = 'en',
  double scale = 1,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        authSessionProvider.overrideWithValue(
          const AsyncData(AuthSessionAuthenticated(subject: 'owner')),
        ),
        checkInRepositoryProvider.overrideWithValue(repository),
        historyDevicePortProvider.overrideWithValue(device),
        if (clock != null) homeTodayClockProvider.overrideWithValue(clock),
      ],
      child: MaterialApp(
        theme: enmoriTheme(),
        locale: Locale(locale),
        supportedLocales: const [Locale('en'), Locale('zh')],
        localizationsDelegates: GlobalMaterialLocalizations.delegates,
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(
            textScaler: TextScaler.linear(scale),
            disableAnimations: true,
          ),
          child: child!,
        ),
        home: Scaffold(
          body: SafeArea(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                HomeTodaySection(
                  onOpenCheckIn: onOpen ?? (_) async {},
                  onOpenHistory: onHistory ?? () async {},
                ),
              ],
            ),
          ),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
  final container = ProviderScope.containerOf(
    tester.element(find.byType(HomeTodaySection)),
  );
  addTearDown(() async {
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump();
  });
  return container;
}
