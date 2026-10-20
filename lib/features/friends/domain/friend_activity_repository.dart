import '../../../core/result/result.dart';

enum FriendActivityType {
  checkIn('check_in_created', 'Created a Check-in'),
  interested('event_interested', 'Interested in an event'),
  going('event_going', 'Going to an event');

  const FriendActivityType(this.wire, this.label);
  final String wire, label;
}

final class FriendActivityItem {
  const FriendActivityItem({
    required this.type,
    required this.sourceRecordId,
    required this.occurredAt,
    required this.username,
    required this.displayName,
    this.note,
    this.mood,
    this.eventId,
    this.eventTitle,
  });
  final FriendActivityType type;
  final String sourceRecordId, username;
  final DateTime occurredAt;
  final String? displayName, note, mood, eventId, eventTitle;
}

abstract interface class FriendActivityRepository {
  Future<Result<List<FriendActivityItem>>> read({
    required bool home,
    FriendActivityType? category,
  });
}
