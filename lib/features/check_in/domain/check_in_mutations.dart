import '../../../core/result/result.dart';
import '../../account/domain/account_repository.dart';
import 'check_in_repository.dart';

abstract interface class CheckInMutations {
  Future<Result<CheckIn>> update({
    String? locationLabel,
    required String checkInId,
    String? mood,
    String? activity,
    required String note,
    required CheckInVisibility visibility,
    required int expectedRevision,
  });
  Future<Result<void>> remove({
    required String checkInId,
    required int expectedRevision,
  });
}
