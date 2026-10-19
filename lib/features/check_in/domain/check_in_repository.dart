import '../../../core/result/result.dart';
import '../../account/domain/account_repository.dart';

import 'package:characters/characters.dart';

final class CheckIn {
  const CheckIn({
    required this.checkInId,
    required this.note,
    required this.createdAt,
    this.checkInVisibility,
    this.revision = 1,
    this.mood,
    this.activity,
  });

  final String? mood;
  final String? activity;
  final int revision;
  final String checkInId;
  final String note;
  final DateTime createdAt;
  final CheckInVisibility? checkInVisibility;
}

final class CheckInHistoryPage {
  const CheckInHistoryPage({required this.checkIns, required this.nextCursor});

  final List<CheckIn> checkIns;
  final String? nextCursor;
}

abstract interface class CheckInRepository {
  Future<Result<CheckIn>> create({
    String? mood,
    String? activity,
    CheckInVisibility? visibility,
    required String note,
    required String idempotencyKey,
  });

  Future<Result<CheckIn>> readOwned({required String checkInId});

  Future<Result<CheckInHistoryPage>> readOwnForDate({
    required String date,
    required String timeZone,
    String? cursor,
  });
}

Result<String> normalizeCheckInNote(String input, {String? mood}) {
  final normalized = input.trim();
  final length = normalized.characters.length;
  if ((length < 1 && (mood == null || mood.trim().isEmpty)) || length > 500) {
    return const Failure(
      AppFailure(
        kind: AppFailureKind.checkInInvalid,
        message: 'Check-in details are invalid.',
      ),
    );
  }
  return Success(normalized);
}
