import 'dart:async';

import '../../account/content_access.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../event_recommendations_providers.dart';
import '../domain/event_recommendation_repository.dart';

/// Local read invalidation, not evidence of a failed service request.
final class EventRecommendationsRefreshRequired {
  const EventRecommendationsRefreshRequired();
}

final eventRecommendationsControllerProvider =
    NotifierProvider<
      EventRecommendationsController,
      AsyncValue<EventRecommendationResponse>
    >(EventRecommendationsController.new);

final class EventRecommendationsController
    extends Notifier<AsyncValue<EventRecommendationResponse>> {
  late EventRecommendationRepository _repository;
  int _operation = 0;
  Timer? _expiry;

  @override
  AsyncValue<EventRecommendationResponse> build() {
    ref.watch(currentAuthSubjectProvider);
    ref.listen(contentAccessProvider, (before, after) {
      if (!identical(before, after)) clear();
    });
    _operation++;
    _expiry?.cancel();
    ref.onCancel(() {
      _operation++;
      _expiry?.cancel();
    });
    ref.onDispose(() {
      _operation++;
      _expiry?.cancel();
    });
    _repository = ref.watch(eventRecommendationRepositoryProvider);
    return const AsyncLoading();
  }

  int load({required EventRecommendationView view}) {
    if (!ref.read(contentAccessProvider).foreground) {
      clear();
      return _operation;
    }
    _expiry?.cancel();
    final operation = ++_operation;
    _expiry = Timer(const Duration(minutes: 5), () {
      if (ref.mounted && operation == _operation) clear();
    });
    state = const AsyncLoading();
    unawaited(_completeLoad(operation: operation, view: view));
    return operation;
  }

  Future<void> _completeLoad({
    required int operation,
    required EventRecommendationView view,
  }) async {
    final access = ref.read(contentAccessProvider);
    final result = await _repository.read(view: view);
    if (!ref.mounted ||
        operation != _operation ||
        !identical(access, ref.read(contentAccessProvider))) {
      return;
    }
    state = switch (result) {
      Success<EventRecommendationResponse>(:final value) => AsyncData(value),
      Failure<EventRecommendationResponse>(:final failure) => AsyncError(
        failure,
        StackTrace.current,
      ),
    };
  }

  void clear() {
    _operation++;
    _expiry?.cancel();
    state = AsyncError(
      const EventRecommendationsRefreshRequired(),
      StackTrace.current,
    );
  }

  void abandon(int operation) {
    if (operation == _operation) {
      _operation++;
      _expiry?.cancel();
    }
  }
}
