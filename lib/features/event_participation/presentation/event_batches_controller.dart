import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../../event_browse/domain/activity_repository.dart';
import '../../event_browse/event_browse_providers.dart';
import '../participation_providers.dart';

final eventBatchesProvider =
    NotifierProvider.autoDispose<EventBatchesController, EventBatchesState>(
      EventBatchesController.new,
    );

final class EventBatchesState {
  const EventBatchesState({this.batch, this.busy = false, this.failure});
  final ActivityBatch? batch;
  final bool busy;
  final AppFailure? failure;
}

final class EventBatchesController extends Notifier<EventBatchesState> {
  Timer? _expiry;
  int _generation = 0;
  bool _authenticated = false;
  late ActivityRepository _repository;
  @override
  EventBatchesState build() {
    _authenticated =
        participationSession(ref.watch(authSessionProvider)) != null;
    _repository = ref.watch(activityRepositoryProvider);
    _generation++;
    _expiry?.cancel();
    ref.onDispose(() {
      _generation++;
      _expiry?.cancel();
    });
    return const EventBatchesState();
  }

  void clear() {
    _generation++;
    _expiry?.cancel();
    state = const EventBatchesState();
  }

  bool isCurrentSnapshot(EventBatchesState snapshot) =>
      ref.mounted &&
      _authenticated &&
      identical(state, snapshot) &&
      (_expiry?.isActive ?? false);
  Future<void> load() => _load(false);
  Future<void> next() => _load(true);
  Future<void> _load(bool next) async {
    if (state.busy || !_authenticated) return;
    final previous = next ? state.batch : null;
    final cursor = previous?.nextCursor;
    if (next && (cursor == null || _repository is! PagedActivityRepository)) {
      return;
    }
    if (!next) {
      clear();
      _expiry = Timer(const Duration(minutes: 5), () {
        if (ref.mounted) clear();
      });
    }
    final generation = _generation;
    state = EventBatchesState(batch: previous, busy: true);
    Result<ActivityRead> result;
    try {
      result = await (next
          ? (_repository as PagedActivityRepository).readNext(cursor!)
          : _repository.read(null));
    } catch (_) {
      result = const Failure(
        AppFailure(
          kind: AppFailureKind.serviceUnavailable,
          message: 'Activities unavailable. Retry this batch.',
        ),
      );
    }
    if (!ref.mounted || generation != _generation || !_authenticated) return;
    if (result case Success<ActivityRead>(value: final ActivityBatch batch)) {
      if (next &&
          (batch.asOf != previous!.asOf || batch.nextCursor == cursor)) {
        state = EventBatchesState(
          batch: previous,
          failure: const AppFailure(
            kind: AppFailureKind.serviceUnavailable,
            message: 'Invalid next batch. Retry or reload.',
          ),
        );
        return;
      }
      final seen = <String>{};
      final items = [
        ...?previous?.items,
        ...batch.items,
      ].where((e) => seen.add(e.eventId ?? e.browseId)).toList();
      state = EventBatchesState(
        batch: ActivityBatch(
          asOf: batch.asOf,
          items: items,
          nextCursor: batch.nextCursor,
        ),
      );
    } else {
      state = EventBatchesState(
        batch: previous,
        failure: result is Failure<ActivityRead>
            ? result.failure
            : const AppFailure(
                kind: AppFailureKind.serviceUnavailable,
                message: 'Activities unavailable. Retry this batch.',
              ),
      );
    }
  }
}
