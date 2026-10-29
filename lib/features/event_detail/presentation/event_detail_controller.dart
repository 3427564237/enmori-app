import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../domain/event_detail_repository.dart';
import '../event_detail_providers.dart';

final eventDetailControllerProvider = NotifierProvider.autoDispose
    .family<EventDetailController, AsyncValue<EventDetail>, String>(
      EventDetailController.new,
    );

final class EventDetailController extends Notifier<AsyncValue<EventDetail>> {
  EventDetailController(this.eventId);
  final String eventId;
  late EventDetailRepository _repository;
  int _operation = 0;
  Timer? _expiry;
  bool _foreground = true;
  @override
  AsyncValue<EventDetail> build() {
    ref.watch(currentAuthSubjectProvider);
    ref.watch(authSessionProvider);
    _repository = ref.watch(eventDetailRepositoryProvider);
    _operation++;
    _expiry?.cancel();
    ref.onDispose(() {
      _operation++;
      _expiry?.cancel();
    });
    return const AsyncLoading();
  }

  Future<void> load() async {
    if (!_foreground) return;
    _expiry?.cancel();
    final operation = ++_operation;
    _expiry = Timer(const Duration(minutes: 5), () {
      if (ref.mounted) clear();
    });
    state = const AsyncLoading();
    final result = await _repository.read(eventId);
    if (!ref.mounted || operation != _operation) return;
    state = switch (result) {
      Success<EventDetail>(:final value) => AsyncData(value),
      Failure<EventDetail>(:final failure) => AsyncError(
        failure,
        StackTrace.current,
      ),
    };
  }

  bool get hasFreshData => state.hasValue && (_expiry?.isActive ?? false);

  void setForeground(bool foreground) {
    if (_foreground == foreground) return;
    _foreground = foreground;
    if (!foreground) {
      _operation++;
      if (hasFreshData) {
        state = AsyncData(state.requireValue);
      } else {
        clear();
      }
    }
  }

  void clear() {
    _operation++;
    _expiry?.cancel();
    state = AsyncError(
      const AppFailure(
        kind: AppFailureKind.serviceUnavailable,
        message: 'Event details expired. Reload to check the source.',
      ),
      StackTrace.current,
    );
  }

  Future<Result<void>> openSource(
    EventDetail event, {
    bool booking = false,
  }) async {
    final snapshot = state;
    final actions = ref.read(eventDetailSourceActionsProvider);
    if (!_foreground || actions == null || !identical(snapshot.value, event)) {
      return const Failure(
        AppFailure(
          kind: AppFailureKind.serviceUnavailable,
          message: 'Could not open the source page. You can copy the link.',
        ),
      );
    }
    return actions.open(
      Uri.parse(
        booking
            ? (event.content?.bookingUrl ?? event.externalSourceUrl)
            : (event.content?.detailUrl ?? event.externalSourceUrl),
      ),
      () =>
          ref.mounted &&
          identical(state, snapshot) &&
          (_expiry?.isActive ?? false),
    );
  }

  Future<Result<void>> copyLink(EventDetail event) {
    if (!_foreground ||
        !identical(state.value, event) ||
        !(_expiry?.isActive ?? false)) {
      return Future.value(
        const Failure(
          AppFailure(
            kind: AppFailureKind.serviceUnavailable,
            message: 'Reload event details before copying the link.',
          ),
        ),
      );
    }
    return _repository.copyLink(event);
  }
}
