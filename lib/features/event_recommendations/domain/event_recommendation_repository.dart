import '../../event_detail/domain/event_content.dart';
import '../../../core/result/result.dart';

enum EventRecommendationView { home, all }

final class MatchedInterest {
  const MatchedInterest({
    required this.interestTagId,
    required this.displayName,
  });

  final String interestTagId;
  final String displayName;
}

final class EventRecommendationReason {
  const EventRecommendationReason({
    required this.code,
    required this.count,
    required this.points,
  });
  final String code;
  final int count;
  final int points;
}

final class EventRecommendation {
  const EventRecommendation({
    required this.eventId,
    required this.title,
    required this.startAt,
    this.endAt,
    required this.matchedInterests,
    required this.reasonCode,
    this.reasons = const [],
    this.content,
    this.locationLabel,
    this.shortDescription,
    this.coverImageUrl,
  });

  final EventContent? content;
  final String? locationLabel, shortDescription, coverImageUrl;
  final String eventId;
  final String title;
  final DateTime startAt;
  final DateTime? endAt;
  final List<MatchedInterest> matchedInterests;
  final String reasonCode;
  final List<EventRecommendationReason> reasons;
}

final class EventRecommendationResponse {
  const EventRecommendationResponse({
    required this.asOf,
    required this.formulaVersion,
    required this.items,
  });

  final DateTime asOf;
  final String formulaVersion;
  final List<EventRecommendation> items;
}

abstract interface class EventRecommendationRepository {
  Future<Result<EventRecommendationResponse>> read({
    required EventRecommendationView view,
  });
}
