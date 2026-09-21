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

final class EventRecommendation {
  const EventRecommendation({
    required this.eventId,
    required this.title,
    required this.startAt,
    required this.endAt,
    required this.matchedInterests,
    required this.reasonCode,
  });

  final String eventId;
  final String title;
  final DateTime startAt;
  final DateTime endAt;
  final List<MatchedInterest> matchedInterests;
  final String reasonCode;
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
