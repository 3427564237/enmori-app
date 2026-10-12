import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/check_in/check_in_providers.dart';
import 'package:enmori/features/check_in/domain/check_in_repository.dart';
import 'package:enmori/features/check_in/history_device_port.dart';
import 'package:enmori/features/check_in/presentation/check_in_history_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

final class _HistoryDevice implements HistoryDevicePort {
  _HistoryDevice();

  final zone = 'Asia/Singapore';
  final today = '2026-10-12';
  final formattedZones = <String>[];

  @override
  Future<String> captureIanaZone() async => zone;

  @override
  Future<DateTime> todayInZone(String ianaZone) async {
    expect(ianaZone, zone);
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
  late ProviderSubscription<CheckInHistoryState> subscription;

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
      checkInHistoryControllerProvider,
      (_, _) {},
      fireImmediately: true,
    );
    await _drain();
    sessions.add(AuthSessionAuthenticated(subject: 'owner-a'));
    await _drain();
  });

  tearDown(() async {
    subscription.close();
    container.dispose();
    await sessions.close();
  });

  test('captures device zone and queries the owner date with it', () async {
    expect(repository.calls, hasLength(1));
    expect(repository.calls.single.date, '2026-10-12');
    expect(repository.calls.single.zone, 'Asia/Singapore');
    repository.responses.single.complete(Success(_page([_entry('first')])));
    await _drain();
    final state = container.read(checkInHistoryControllerProvider);
    expect(state.phase, CheckInHistoryPhase.ready);
    expect(state.ianaZone, 'Asia/Singapore');
    expect(state.entries.single.checkIn.checkInId, 'first');
    expect(state.entries.single.localTime, startsWith('local:'));
    expect(device.formattedZones, ['Asia/Singapore']);
  });

  test(
    'date change resets paging and Next and Reload replace the visible page',
    () async {
      repository.responses.single.complete(
        Success(_page([_entry('old-page')], cursor: 'next-token')),
      );
      await _drain();
      final changing = container
          .read(checkInHistoryControllerProvider.notifier)
          .selectDate(DateTime.utc(2026, 10, 11));
      expect(repository.calls[1], (
        date: '2026-10-11',
        zone: 'Asia/Singapore',
        cursor: null,
      ));
      expect(container.read(checkInHistoryControllerProvider).entries, isEmpty);
      repository.responses[1].complete(
        Success(_page([_entry('date-first')], cursor: 'date-next')),
      );
      await changing;
      await _drain();
      final loadingNext = container
          .read(checkInHistoryControllerProvider.notifier)
          .loadNext();
      expect(repository.calls[2].cursor, 'date-next');
      repository.responses[2].complete(Success(_page([_entry('next-page')])));
      await loadingNext;
      await _drain();
      expect(
        container
            .read(checkInHistoryControllerProvider)
            .entries
            .single
            .checkIn
            .checkInId,
        'next-page',
      );
      final reloading = container
          .read(checkInHistoryControllerProvider.notifier)
          .reload();
      expect(repository.calls[3].cursor, isNull);
      repository.responses[3].complete(Success(_page([_entry('reloaded')])));
      await reloading;
      await _drain();
      expect(
        container
            .read(checkInHistoryControllerProvider)
            .entries
            .single
            .checkIn
            .checkInId,
        'reloaded',
      );
    },
  );

  test(
    'empty success differs from failure and retry starts at page one',
    () async {
      repository.responses.single.complete(Success(_page([])));
      await _drain();
      expect(
        container.read(checkInHistoryControllerProvider).phase,
        CheckInHistoryPhase.ready,
      );
      expect(container.read(checkInHistoryControllerProvider).entries, isEmpty);
      final failedReload = container
          .read(checkInHistoryControllerProvider.notifier)
          .reload();
      repository.responses[1].complete(
        const Failure(
          AppFailure(
            kind: AppFailureKind.serviceUnavailable,
            message: 'private',
          ),
        ),
      );
      await failedReload;
      await _drain();
      expect(
        container.read(checkInHistoryControllerProvider).phase,
        CheckInHistoryPhase.failed,
      );
      final retry = container
          .read(checkInHistoryControllerProvider.notifier)
          .reload();
      expect(repository.calls.last.cursor, isNull);
      repository.responses[2].complete(Success(_page([_entry('retry')])));
      await retry;
      await _drain();
      expect(
        container
            .read(checkInHistoryControllerProvider)
            .entries
            .single
            .checkIn
            .checkInId,
        'retry',
      );
    },
  );

  test(
    'session replacement clears state and ignores prior response',
    () async {
      sessions.add(AuthSessionAuthenticated(subject: 'owner-a'));
      await _drain();
      expect(repository.calls, hasLength(2));
      repository.responses.first.complete(Success(_page([_entry('stale')])));
      await _drain();
      expect(container.read(checkInHistoryControllerProvider).entries, isEmpty);
      repository.responses.last.complete(
        Success(_page([_entry('fresh-session')])),
      );
      await _drain();
      expect(
        container
            .read(checkInHistoryControllerProvider)
            .entries
            .single
            .checkIn
            .checkInId,
        'fresh-session',
      );
    },
  );
}
