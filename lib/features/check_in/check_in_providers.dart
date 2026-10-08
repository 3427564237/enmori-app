import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/services.dart';

import '../../core/result/result.dart';
import 'domain/check_in_repository.dart';

final checkInRepositoryProvider = Provider<CheckInRepository>(
  (ref) => const _UnavailableCheckInRepository(),
);

final deviceIanaTimeZoneProvider = FutureProvider<String>((ref) async {
  final zone = await const MethodChannel('com.enmori.app/time_zone')
      .invokeMethod<String>('ianaTimeZone');
  if (zone == null ||
      zone.isEmpty ||
      RegExp(r'^[+-]\d{2}:?\d{2}$').hasMatch(zone)) {
    throw StateError('Device IANA time zone is unavailable.');
  }
  return zone;
});

final class _UnavailableCheckInRepository implements CheckInRepository {
  const _UnavailableCheckInRepository();

  @override
  Future<Result<CheckIn>> create({
    required String note,
    required String idempotencyKey,
  }) async => const Failure(_configurationFailure);

  @override
  Future<Result<CheckIn>> readOwned({required String checkInId}) async =>
      const Failure(_configurationFailure);

  @override
  Future<Result<CheckInHistoryPage>> readOwnForDate({
    required String date,
    required String timeZone,
    String? cursor,
  }) async => const Failure(_configurationFailure);
}

const _configurationFailure = AppFailure(
  kind: AppFailureKind.configurationUnavailable,
  message: 'The service is not configured.',
);
