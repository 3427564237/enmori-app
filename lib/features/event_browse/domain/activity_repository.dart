import '../../admin/domain/managed_event_category.dart';
import '../../event_detail/domain/event_content.dart';
import '../../../core/result/result.dart';

sealed class ActivityRead {
  const ActivityRead();
}

final class ActivitySummary {
  const ActivitySummary({
    required this.browseId,
    required this.title,
    required this.startAt,
    this.endAt,
    this.eventId,
    this.shortDescription,
    this.coverImageUrl,
    this.locationLabel,
    this.categoryLabel,
    this.managedCategory,
    this.content,
  });
  final EventContent? content;
  final String? shortDescription, coverImageUrl;
  final String browseId, title, startAt;
  final String? endAt;
  final String? eventId;
  final ManagedEventCategory? managedCategory;
  final String? locationLabel, categoryLabel;
}

final class ActivityBatch extends ActivityRead {
  ActivityBatch({
    required this.asOf,
    required List<ActivitySummary> items,
    this.nextCursor,
    this.sourceStatus = const {},
  }) : items = List.unmodifiable(items);
  final Map<String, bool> sourceStatus;
  final String asOf;
  final List<ActivitySummary> items;
  final String? nextCursor;
}

final class ActivityDetail extends ActivityRead {
  const ActivityDetail({
    required this.summary,
    required this.sourceUrl,
    this.locationLabel,
    this.categoryLabel,
    this.managedCategory,
    this.content,
    this.shortDescription,
    this.coverImageUrl,
  });
  final EventContent? content;
  final ActivitySummary summary;
  final Uri sourceUrl;
  final ManagedEventCategory? managedCategory;
  final String? locationLabel, categoryLabel;
  final String? shortDescription, coverImageUrl;
}

abstract interface class ActivityRepository {
  /// Null identifies the independent first-batch read; no provider access in Flutter.
  Future<Result<ActivityRead>> read(String? browseId);
}

abstract interface class PagedActivityRepository implements ActivityRepository {
  Future<Result<ActivityRead>> readNext(String cursor);
}

abstract interface class ActivitySourceActions {
  Future<Result<void>> open(Uri sourceUrl, bool Function() current);
  Future<Result<void>> copy(Uri sourceUrl, bool Function() current);
}

/// LI supplies the actual platform capability. Check current immediately before
/// the native handoff; a successful handoff is never a registration receipt.
abstract interface class ExternalActivityOpener {
  Future<bool> open(Uri sourceUrl, {required bool Function() current});
}
