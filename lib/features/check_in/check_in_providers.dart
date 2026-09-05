import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/result/result.dart';
import 'domain/check_in_repository.dart';

final checkInRepositoryProvider = Provider<CheckInRepository>(
  (ref) => const _UnavailableCheckInRepository(),
);

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
}

const _configurationFailure = AppFailure(
  kind: AppFailureKind.configurationUnavailable,
  message: 'The service is not configured.',
);
