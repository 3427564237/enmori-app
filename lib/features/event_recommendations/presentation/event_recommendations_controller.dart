import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../event_recommendations_providers.dart';
import '../domain/event_recommendation_repository.dart';

final eventRecommendationsControllerProvider =
    NotifierProvider<
      EventRecommendationsController,
      AsyncValue<EventRecommendationResponse>
    >(EventRecommendationsController.new);

final class EventRecommendationsController
    extends Notifier<AsyncValue<EventRecommendationResponse>> {
  late EventRecommendationRepository _repository;
  int _operation = 0;

  @override
  AsyncValue<EventRecommendationResponse> build() {
    _repository = ref.watch(eventRecommendationRepositoryProvider);
    return const AsyncLoading();
  }

  Future<void> load({required EventRecommendationView view}) async {
    final operation = ++_operation;
    state = const AsyncLoading();
    final result = await _repository.read(view: view);
    if (operation != _operation) return;
    state = switch (result) {
      Success<EventRecommendationResponse>(:final value) => AsyncData(value),
      Failure<EventRecommendationResponse>(:final failure) => AsyncError(
        failure,
        StackTrace.current,
      ),
    };
  }

  void abandon() {
    _operation++;
  }
}
