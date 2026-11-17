import '../../recommendation_profile/domain/recommendation_profile.dart';
import '../../recommendation_profile/recommendation_profile_providers.dart';

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

/// The user retired this local wait; the underlying read may still complete.
final class EventRecommendationsStopped {
  const EventRecommendationsStopped();
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
  EventRecommendationView? _view;
  int? _profileRevision;
  int get operation => _operation;

  @override
  bool updateShouldNotify(
    AsyncValue<EventRecommendationResponse> previous,
    AsyncValue<EventRecommendationResponse> next,
  ) => next.isLoading || super.updateShouldNotify(previous, next);

  void _refreshContext() {
    final operation = ++_operation;
    final view = _view;
    if (view != null) {
      scheduleMicrotask(() {
        // A route change or explicit command supersedes this queued refresh.
        if (ref.mounted && operation == _operation) load(view: view);
      });
    }
  }

  @override
  AsyncValue<EventRecommendationResponse> build() {
    ref.listen(activityAreaProvider, (before, after) {
      if (before?.code != after.code) _refreshContext();
    });
    ref.listen(recommendationProfileProvider, (_, next) {
      final p = next.asData?.value;
      if (p is Success<RecommendationProfile>) {
        final previous = _profileRevision;
        _profileRevision = p.value.revision;
        if (previous != null && previous != p.value.revision) _refreshContext();
      }
    });
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
    _view = view;
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

  void stopWaiting(int operation, {required EventRecommendationView view}) {
    if (operation != _operation || view != _view || !state.isLoading) return;
    _operation++;
    _expiry?.cancel();
    state = AsyncError(const EventRecommendationsStopped(), StackTrace.current);
  }

  void abandon(int operation) {
    if (operation == _operation) {
      _operation++;
      _expiry?.cancel();
    }
  }
}
