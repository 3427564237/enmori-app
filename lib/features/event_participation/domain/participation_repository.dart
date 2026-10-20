import '../../../core/result/result.dart';

enum ParticipationStatus { none, interested, going }

enum ParticipantGroup { friends, others }

final class EventParticipation {
  const EventParticipation({
    required this.eventId,
    required this.status,
    required this.ignored,
    required this.revision,
    this.updatedAt,
  });
  final String eventId;
  final ParticipationStatus status;
  final bool ignored;
  final int revision;
  final DateTime? updatedAt;
}

final class EventParticipant {
  const EventParticipant(this.username, this.displayName);
  final String username;
  final String? displayName;
}

final class EventParticipantPage {
  EventParticipantPage({
    required List<EventParticipant> items,
    this.nextCursor,
    this.visibleCount,
  }) : items = List.unmodifiable(items);
  final List<EventParticipant> items;
  final String? nextCursor;
  final int? visibleCount; // absent means unavailable, never a fabricated zero
}

final class EventParticipationPage {
  EventParticipationPage(List<EventParticipation> items, this.nextCursor)
    : items = List.unmodifiable(items);
  final List<EventParticipation> items;
  final String? nextCursor;
}

abstract interface class ParticipationRepository {
  Future<Result<PublicParticipationPage>> forUsername(
    String username,
    String? cursor,
    bool Function() current,
  );
  Future<Result<EventParticipation>> read(
    String eventId,
    bool Function() current,
  );
  Future<Result<EventParticipation>> save(
    EventParticipation previous,
    ParticipationStatus status,
    bool ignored,
    bool Function() current,
  );
  Future<Result<EventParticipantPage>> participants(
    String eventId,
    ParticipationStatus status,
    ParticipantGroup group,
    String? cursor,
    bool Function() current,
  );
  Future<Result<EventParticipationPage>> own(
    String? cursor,
    bool Function() current,
  );
}

final class PublicParticipation {
  const PublicParticipation(this.eventId, this.status);
  final String eventId;
  final ParticipationStatus status;
}

final class PublicParticipationPage {
  PublicParticipationPage(List<PublicParticipation> items, this.nextCursor)
    : items = List.unmodifiable(items);
  final List<PublicParticipation> items;
  final String? nextCursor;
}
