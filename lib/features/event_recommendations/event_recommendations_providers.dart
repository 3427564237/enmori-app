import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/result/result.dart';
import 'domain/event_recommendation_repository.dart';

final eventRecommendationRepositoryProvider =
    Provider<EventRecommendationRepository>(
      (ref) => const _UnavailableEventRecommendationRepository(),
    );

final class _UnavailableEventRecommendationRepository
    implements EventRecommendationRepository {
  const _UnavailableEventRecommendationRepository();

  @override
  Future<Result<EventRecommendationResponse>> read({
    required EventRecommendationView view,
  }) async => const Failure(_configurationFailure);
}

const _configurationFailure = AppFailure(
  kind: AppFailureKind.configurationUnavailable,
  message: 'The service is not configured.',
);
