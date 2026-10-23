import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/result/result.dart';
import 'domain/check_in_repository.dart';
import 'history_device_port.dart';
import 'domain/check_in_projection_decoder.dart';
import 'data/check_in_projection_parser.dart';

final checkInProjectionDecoderProvider = Provider<CheckInProjectionDecoder>(
  (ref) => const BackendCheckInProjectionDecoder(),
);

final checkInRepositoryProvider = Provider<CheckInRepository>(
  (ref) => const _UnavailableCheckInRepository(),
);

final historyDevicePortProvider = Provider<HistoryDevicePort>(
  (ref) => const AndroidHistoryDevicePort(),
);

final class _UnavailableCheckInRepository implements CheckInRepository {
  const _UnavailableCheckInRepository();

  @override
  Future<Result<CheckIn>> create({
    String? locationLabel,
    String? mood,
    String? activity,
    CheckInVisibility? visibility,
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
