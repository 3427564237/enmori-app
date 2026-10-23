import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/result/result.dart';
import '../features/account/content_access.dart';
import '../features/auth/auth_providers.dart';
import '../features/auth/domain/auth_repository.dart';
import '../features/check_in/check_in_providers.dart';
import '../features/check_in/domain/check_in_repository.dart';

final class HomeTodayEntry {
  const HomeTodayEntry(this.checkIn, this.localTime);
  final CheckIn checkIn;
  final String localTime;
}

final class HomeTodaySnapshot {
  const HomeTodaySnapshot({
    this.date,
    this.timeZone,
    this.entries = const [],
    this.hasMore = false,
    this.failure,
  });
  final DateTime? date;
  final String? timeZone;
  final List<HomeTodayEntry> entries;
  final bool hasMore;
  final AppFailure? failure;
}

// Only schedules the next local-midnight refresh. The native device port, not
// this clock, supplies the authoritative query date and IANA time zone.
final homeTodayClockProvider = Provider<DateTime Function()>(
  (_) => DateTime.now,
);

/// Home's read-only projection of the existing owner/date repository. It must
/// not watch the history editor's mutable selected date or collect other pages.
final homeTodayProvider = FutureProvider.autoDispose<HomeTodaySnapshot?>((
  ref,
) async {
  final session = ref.watch(authSessionProvider).asData?.value;
  final access = ref.watch(contentAccessProvider);
  final repository = ref.watch(checkInRepositoryProvider);
  final device = ref.watch(historyDevicePortProvider);
  final now = ref.watch(homeTodayClockProvider)();
  if (session is! AuthSessionAuthenticated || !access.foreground) return null;

  bool current() =>
      ref.mounted &&
      identical(session, ref.read(authSessionProvider).asData?.value) &&
      identical(access, ref.read(contentAccessProvider));

  final midnight = DateTime(now.year, now.month, now.day + 1);
  final rollover = Timer(midnight.difference(now), ref.invalidateSelf);
  ref.onDispose(rollover.cancel);
  try {
    final zone = await device.captureIanaZone();
    if (!current()) return null;
    final date = await device.todayInZone(zone);
    if (!current()) return null;
    final queryDate =
        '${date.year.toString().padLeft(4, '0')}-'
        '${date.month.toString().padLeft(2, '0')}-'
        '${date.day.toString().padLeft(2, '0')}';
    final result = await repository.readOwnForDate(
      date: queryDate,
      timeZone: zone,
    );
    if (!current()) return null;
    if (result case Failure<CheckInHistoryPage>(:final failure)) {
      return HomeTodaySnapshot(failure: failure);
    }
    final page = (result as Success<CheckInHistoryPage>).value;
    final records = page.checkIns.take(3).toList(growable: false);
    final times = await device.formatInstants(
      records.map((record) => record.createdAt).toList(growable: false),
      zone,
    );
    if (!current()) return null;
    if (times.length != records.length) throw const FormatException();
    return HomeTodaySnapshot(
      date: date,
      timeZone: zone,
      entries: List.unmodifiable([
        for (var i = 0; i < records.length; i++)
          HomeTodayEntry(records[i], times[i]),
      ]),
      hasMore: page.nextCursor != null || page.checkIns.length > records.length,
    );
  } on Object {
    if (!current()) return null;
    return const HomeTodaySnapshot(
      failure: AppFailure(
        kind: AppFailureKind.serviceUnavailable,
        message: 'Today’s Check-ins could not be loaded. Please try again.',
      ),
    );
  }
});
