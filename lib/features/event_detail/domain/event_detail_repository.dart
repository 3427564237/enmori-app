import '../../admin/domain/managed_event_category.dart';
import '../../event_detail/domain/event_content.dart';
import 'event_actions.dart';
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
    this.managedCategory,
    this.shortDescription,
    this.coverImageUrl,
    this.venueAddress,
    this.content,
  });
  final EventContent? content;
  final VenueAddress? venueAddress;
  final String eventId, title, externalSourceUrl;
  final DateTime startAt;
  final DateTime? endAt;
  final ManagedEventCategory? managedCategory;
  final String? locationLabel, categoryLabel, shortDescription, coverImageUrl;
}

abstract interface class EventDetailRepository {
  Future<Result<EventDetail>> read(String eventId);
  Future<Result<void>> copyLink(EventDetail event);
}
