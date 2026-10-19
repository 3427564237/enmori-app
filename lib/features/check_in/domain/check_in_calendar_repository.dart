import '../../../core/result/result.dart';

final class CheckInMonth {
  const CheckInMonth({
    required this.month,
    required this.timeZone,
    required this.counts,
  });
  final String month, timeZone;
  final Map<String, int> counts;
}

abstract interface class CheckInCalendarRepository {
  Future<Result<CheckInMonth>> readMonth({
    required String month,
    required String timeZone,
  });
}
