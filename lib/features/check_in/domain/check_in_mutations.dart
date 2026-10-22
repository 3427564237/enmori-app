import '../../../core/result/result.dart';
import '../../account/domain/account_repository.dart';
import 'check_in_repository.dart';

abstract interface class CheckInMutations {
  Future<Result<CheckIn>> update({
    bool Function()? isEligible,
    String? locationLabel,
    required String checkInId,
    String? mood,
    String? activity,
    required String note,
    required CheckInVisibility visibility,
    required int expectedRevision,
  });
  Future<Result<void>> remove({
    bool Function()? isEligible,
    required String checkInId,
    required int expectedRevision,
  });
}
