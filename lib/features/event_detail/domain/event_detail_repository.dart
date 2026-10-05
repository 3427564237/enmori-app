import '../../../core/result/result.dart';

final class EventDetail {
  const EventDetail({
    required this.eventId,
    required this.title,
    required this.startAt,
    required this.externalSourceUrl,
    this.endAt,
    this.locationLabel,
    this.categoryLabel,
    this.shortDescription,
  });
  final String eventId, title, externalSourceUrl;
  final DateTime startAt;
  final DateTime? endAt;
  final String? locationLabel, categoryLabel, shortDescription;
}

abstract interface class EventDetailRepository {
  Future<Result<EventDetail>> read(String eventId);
  Future<Result<void>> copyLink(EventDetail event);
}
