import 'package:enmori/features/account/domain/account_repository.dart';

import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/check_in/check_in_providers.dart';
import 'package:enmori/features/check_in/domain/check_in_repository.dart';
import 'package:enmori/features/check_in/history_device_port.dart';
import 'package:enmori/features/check_in/presentation/check_in_search_controller.dart';
import 'package:enmori/features/check_in/presentation/check_in_search_page.dart';
import 'package:enmori/features/check_in/presentation/check_in_weekly_review_page.dart';
import 'package:enmori/features/account/content_access.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

final class _HistoryDevice implements HistoryDevicePort {
  _HistoryDevice();

  final zone = 'Asia/Singapore';
  String today = '2026-10-12';
  final formattedZones = <String>[];

  @override
  Future<String> captureIanaZone() async => zone;

  @override
  Future<DateTime> todayInZone(String ianaZone) async {
    if (ianaZone != zone) throw StateError('Incorrect test zone');
    return DateTime.parse('${today}T00:00:00Z');
  }

  @override
  Future<List<String>> formatInstants(
    List<DateTime> instants,
    String ianaZone,
  ) async {
    formattedZones.add(ianaZone);
    return [
      for (final instant in instants) 'local:${instant.toIso8601String()}',
    ];
  }
}

final class _HistoryRepository implements CheckInRepository {
  final calls = <({String date, String zone, String? cursor})>[];
  final responses = <Completer<Result<CheckInHistoryPage>>>[];
  final queued = <Result<CheckInHistoryPage>>[];

  @override
  Future<Result<CheckIn>> create({
    String? locationLabel,
    String? mood,
    String? activity,
    CheckInVisibility? visibility,
    required String note,
    required String idempotencyKey,
  }) async => throw UnimplementedError();

  @override
  Future<Result<CheckIn>> readOwned({required String checkInId}) async =>
      throw UnimplementedError();

  @override
  Future<Result<CheckInHistoryPage>> readOwnForDate({
    required String date,
    required String timeZone,
    String? cursor,
  }) {
    calls.add((date: date, zone: timeZone, cursor: cursor));
    if (queued.isNotEmpty) return Future.value(queued.removeAt(0));
    final completer = Completer<Result<CheckInHistoryPage>>();
    responses.add(completer);
    return completer.future;
  }
}

CheckIn _entry(String id) => CheckIn(
  checkInId: id,
  note: 'Synthetic $id',
  createdAt: DateTime.utc(2026, 10, 12, 9),
);

CheckInHistoryPage _page(List<CheckIn> entries, {String? cursor}) =>
    CheckInHistoryPage(checkIns: entries, nextCursor: cursor);

Future<void> _drain() async {
  for (var index = 0; index < 8; index++) {
    await Future<void>.delayed(Duration.zero);
  }
}

void main() {
  late StreamController<AuthSession> sessions;
  late _HistoryRepository repository;
  late _HistoryDevice device;
  late ProviderContainer container;
  late ProviderSubscription<CheckInSearchState> subscription;
  CheckInSearchController controller() =>
      container.read(checkInSearchProvider.notifier);
  CheckInSearchState state() => container.read(checkInSearchProvider);
  final first = DateTime.utc(2026, 10, 11), last = DateTime.utc(2026, 10, 12);
  setUp(() async {
    sessions = StreamController<AuthSession>.broadcast(sync: true);
    repository = _HistoryRepository();
    device = _HistoryDevice();
    container = ProviderContainer(
      overrides: [
        authSessionProvider.overrideWith((ref) => sessions.stream),
        checkInRepositoryProvider.overrideWithValue(repository),
        historyDevicePortProvider.overrideWithValue(device),
      ],
    );
    subscription = container.listen(
      checkInSearchProvider,
      (_, _) {},
      fireImmediately: true,
    );
    await _drain();
    sessions.add(AuthSessionAuthenticated(subject: 'a'));
    await _drain();
  });
  tearDown(() async {
    subscription.close();
    container.dispose();
    await sessions.close();
  });

  test('weekly scan includes blank notes and keeps civil-date identity across pages', () async {
    repository.queued.addAll([
      Success(
        _page([
          CheckIn(checkInId: 'a', note: '', mood: 'calm', createdAt: last),
        ], cursor: 'page2'),
      ),
      Success(
        _page([
          CheckIn(checkInId: 'b', note: '', activity: 'walk', createdAt: last),
        ]),
      ),
      Success(
        _page([
          CheckIn(checkInId: 'c', note: '', mood: 'calm', createdAt: first),
        ]),
      ),
    ]);
    await controller().start(
      '',
      first,
      last,
      allRecords: true,
      capturedZone: device.zone,
    );
    expect(state().phase, CheckInSearchPhase.complete);
    expect(state().matches.length, 3);
    expect(state().matches.map((m) => m.civilDate).toSet(), {
      '2026-10-12',
      '2026-10-11',
    });
  });

  testWidgets(
    'weekly review labels exact distributions, missing labels and opens original record',
    (tester) async {
      repository.queued.addAll([
        Success(
          _page([
            CheckIn(
              checkInId: 'a',
              note: 'original note',
              mood: 'calm',
              activity: 'walk',
              createdAt: last,
            ),
            CheckIn(checkInId: 'b', note: '', mood: 'calm', createdAt: last),
          ]),
        ),
        for (var i = 0; i < 6; i++) Success(_page([])),
      ]);
      String? opened;
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            home: CheckInWeeklyReviewPage(
              lastDate: last,
              timeZone: device.zone,
              onOpen: (id) => opened = id,
            ),
          ),
        ),
      );
      await tester.tap(find.byKey(const Key('weekly-review-load')));
      await tester.pumpAndSettle();
      expect(find.text('All 7 dates checked'), findsOneWidget);
      expect(find.text('1 day with records · 2 records'), findsOneWidget);
      expect(find.text('calm · 2'), findsOneWidget);
      expect(find.text('walk · 1'), findsOneWidget);
      expect(find.text('Not filled in · 1'), findsOneWidget);
      await tester.scrollUntilVisible(
        find.byKey(const Key('weekly-record-a')),
        180,
      );
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.byKey(const Key('weekly-record-a')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('weekly-record-a')));
      await tester.pump();
      expect(opened, 'a');
      expect(container.read(checkInWeeklyReviewProvider).matches, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );

  test('search follows each opaque page and each civil day, matching note/activity/place without exposing unmatched records', () async {
    repository.queued.addAll([
      Success(
        _page([_entry('walk'), _entry('unrelated')], cursor: 'opaque+token'),
      ),
      Success(
        _page([
          CheckIn(
            checkInId: 'activity',
            note: '',
            activity: 'WALK',
            createdAt: last,
          ),
        ], cursor: null),
      ),
      Success(
        _page([
          CheckIn(
            checkInId: 'place',
            note: '',
            locationLabel: 'Walk park',
            createdAt: first,
          ),
        ]),
      ),
    ]);
    await controller().start(' walk ', first, last);
    expect(repository.calls.map((c) => (c.date, c.cursor)), [
      ('2026-10-12', null),
      ('2026-10-12', 'opaque+token'),
      ('2026-10-11', null),
    ]);
    expect(repository.calls.every((c) => c.zone == 'Asia/Singapore'), isTrue);
    expect(state().matches.map((e) => e.record.checkInId), [
      'walk',
      'activity',
      'place',
    ]);
    expect(state().phase, CheckInSearchPhase.complete);
    expect(state().daysRead, 2);
    expect(state().recordsRead, 4);
  });

  test(
    'failure retains partial results and retry repeats the failed cursor',
    () async {
      repository.queued.addAll([
        Success(_page([_entry('walk')], cursor: 'next')),
        const Failure(
          AppFailure(
            kind: AppFailureKind.serviceUnavailable,
            message: 'synthetic',
          ),
        ),
      ]);
      await controller().start('walk', last, last);
      expect(state().phase, CheckInSearchPhase.failed);
      expect(state().daysRead, 0);
      expect(state().matches, hasLength(1));
      repository.queued.add(Success(_page([_entry('walk-two')])));
      await controller().resume();
      expect(repository.calls.map((c) => c.cursor), [null, 'next', 'next']);
      expect(state().matches, hasLength(2));
      expect(state().phase, CheckInSearchPhase.complete);
    },
  );

  test('stop ignores late response, resumes same cursor and never claims complete early', () async {
    repository.queued.add(Success(_page([_entry('walk')], cursor: 'slow')));
    final running = controller().start('walk', last, last);
    await _drain();
    expect(repository.responses, hasLength(1));
    controller().stop();
    repository.responses.single.complete(Success(_page([_entry('walk-late')])));
    await running;
    expect(state().phase, CheckInSearchPhase.stopped);
    expect(state().matches, hasLength(1));
    repository.queued.add(Success(_page([_entry('walk-resumed')])));
    await controller().resume();
    expect(repository.calls.last.cursor, 'slow');
    expect(state().matches.last.record.checkInId, 'walk-resumed');
  });

  for (final change in ['replacement', 'background', 'mutation']) {
    test('$change clears results and invalidates late response', () async {
      repository.queued.add(Success(_page([_entry('walk')], cursor: 'slow')));
      final running = controller().start('walk', last, last);
      await _drain();
      if (change == 'replacement') {
        sessions.add(AuthSessionAuthenticated(subject: 'a'));
      }
      if (change == 'background') {
        container.read(contentAccessProvider.notifier).setForeground(false);
      }
      if (change == 'mutation') {
        container.read(contentAccessProvider.notifier).changed();
      }
      await _drain();
      repository.responses.single.complete(
        Success(_page([_entry('walk-late')])),
      );
      await running;
      expect(state().matches, isEmpty);
      expect(state().phase, CheckInSearchPhase.idle);
    });
  }

  test('authorization failure clears earlier matches instead of preserving private results', () async {
    repository.queued.addAll([
      Success(_page([_entry('walk')], cursor: 'next')),
      const Failure(
        AppFailure(kind: AppFailureKind.authForbidden, message: 'synthetic'),
      ),
    ]);
    await controller().start('walk', last, last);
    expect(state().matches, isEmpty);
    expect(controller().canResume, isFalse);
  });
  test(
    'repeated cursor is a failure, not an infinite search or completion',
    () async {
      repository.queued.addAll([
        Success(_page([], cursor: 'same')),
        Success(_page([], cursor: 'same')),
      ]);
      await controller().start('walk', last, last);
      expect(state().phase, CheckInSearchPhase.failed);
      expect(state().daysRead, 0);
      expect(repository.calls, hasLength(2));
    },
  );
  test('empty completed range is distinct from stopped or failed', () async {
    repository.queued.addAll([Success(_page([])), Success(_page([]))]);
    await controller().start('absent', first, last);
    expect(state().phase, CheckInSearchPhase.complete);
    expect(state().matches, isEmpty);
    expect(state().daysRead, 2);
  });

  testWidgets(
    'search UI exposes partial progress and Stop without losing the query',
    (tester) async {
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(home: CheckInSearchPage(onOpen: (_) {})),
        ),
      );
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const Key('check-in-search-query')),
        'walk',
      );
      final running = controller().start('walk', last, last);
      await tester.pump();
      await tester.pump();
      expect(
        state().phase,
        CheckInSearchPhase.searching,
        reason: 'calls: ${repository.calls}',
      );
      expect(find.textContaining('incomplete'), findsOneWidget);
      await tester.tap(find.byKey(const Key('check-in-search-stop')));
      await tester.pumpAndSettle();
      expect(find.textContaining('Search stopped'), findsOneWidget);
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('check-in-search-query')))
            .controller!
            .text,
        'walk',
      );
      repository.responses.single.complete(
        Success(_page([_entry('walk-late')])),
      );
      await running;
      await tester.pumpAndSettle();
      expect(
        find.byKey(const Key('check-in-search-result-walk-late')),
        findsNothing,
      );
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );

  for (final keyboard in [true, false]) {
    testWidgets(
      'rapid ${keyboard ? 'keyboard' : 'button'} search submissions keep one running scan',
      (tester) async {
        device.today = DateTime.now().toIso8601String().substring(0, 10);
        await tester.pumpWidget(
          UncontrolledProviderScope(
            container: container,
            child: MaterialApp(home: CheckInSearchPage(onOpen: (_) {})),
          ),
        );
        await tester.pumpAndSettle();
        await tester.enterText(
          find.byKey(const Key('check-in-search-query')),
          'walk',
        );
        await tester.pump();
        final submit = keyboard
            ? () => tester
                  .widget<TextField>(
                    find.byKey(const Key('check-in-search-query')),
                  )
                  .onSubmitted!('walk')
            : tester
                  .widget<FilledButton>(
                    find.byKey(const Key('check-in-search-start')),
                  )
                  .onPressed!;
        submit();
        submit();
        await tester.pump();
        await tester.pump();
        expect(repository.calls, hasLength(1));
        expect(state().phase, CheckInSearchPhase.searching);
        submit();
        await tester.pump();
        expect(repository.calls, hasLength(1));
        expect(state().phase, CheckInSearchPhase.searching);
        controller().stop();
        for (final response in repository.responses) {
          response.complete(Success(_page([])));
        }
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox.shrink());
      },
    );
  }
}
