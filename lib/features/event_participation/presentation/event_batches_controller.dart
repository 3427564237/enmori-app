import 'dart:async';

import 'package:flutter/foundation.dart';
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
  const EventBatchesState({
    this.batch,
    this.busy = false,
    this.loadingMore = false,
    this.failure,
    this.stopped = false,
  });
  final ActivityBatch? batch;
  final bool busy;
  final bool loadingMore;
  final bool stopped;
  final AppFailure? failure;
}

final class EventBatchesController extends Notifier<EventBatchesState> {
  Timer? _expiry;
  int _generation = 0;
  bool _authenticated = false;
  bool _foreground = true;
  int _search = 0;
  late ActivityRepository _repository;
  @override
  EventBatchesState build() {
    _authenticated =
        participationSession(ref.watch(authSessionProvider)) != null;
    _repository = ref.watch(activityRepositoryProvider);
    _generation++;
    _expiry?.cancel();
    _expiry = null;
    ref.onDispose(() {
      _generation++;
      _expiry?.cancel();
    });
    return const EventBatchesState();
  }

  void clear() {
    _generation++;
    _expiry?.cancel();
    _expiry = null;
    state = const EventBatchesState();
  }

  bool get hasFreshBatch =>
      _authenticated && state.batch != null && (_expiry?.isActive ?? false);

  void setForeground(bool foreground) {
    if (_foreground == foreground) return;
    _foreground = foreground;
    if (!foreground) stopSearch();
  }

  void stopSearch() {
    _search++;
    _generation++;
    // A fresh source read may already have retired the previous server
    // generation. Only pagination can safely retain the current snapshot.
    final stoppedRefresh = state.busy && !state.loadingMore;
    final retainedBatch = !stoppedRefresh && hasFreshBatch ? state.batch : null;
    if (stoppedRefresh) {
      _expiry?.cancel();
      _expiry = null;
    }
    state = EventBatchesState(
      batch: retainedBatch,
      failure: state.failure,
      stopped: state.busy || state.stopped,
    );
  }

  bool isCurrentSnapshot(EventBatchesState snapshot) =>
      ref.mounted &&
      _authenticated &&
      _foreground &&
      (!state.busy || state.loadingMore) &&
      identical(state, snapshot) &&
      (_expiry?.isActive ?? false);
  Future<void> load() => _load(false);
  Future<void> next() => _load(true);

  /// Explicit Search/filter actions can cover later available source batches.
  /// Retain opaque cursors and stop at an error or invalidated view; never
  /// silently call the first-page refresh a complete catalogue search.
  Future<void> loadAvailablePages({bool Function()? shouldContinue}) async {
    if (state.busy ||
        !_authenticated ||
        !_foreground ||
        shouldContinue?.call() == false) {
      return;
    }
    final search = ++_search;
    var generation = _generation;
    if (state.batch == null) {
      final loading = load();
      generation = _generation;
      await loading;
    }
    if (!ref.mounted || generation != _generation) {
      return;
    }
    // Explicit Search retries the failed next cursor; it is not an automatic
    // retry and does not discard the already available rows or query.
    if (state.failure != null && state.batch != null) await next();
    final seen = <String>{};
    for (var page = 0; page < 49; page++) {
      if (!ref.mounted ||
          generation != _generation ||
          search != _search ||
          !_foreground ||
          shouldContinue?.call() == false ||
          !_authenticated ||
          state.busy ||
          state.failure != null) {
        return;
      }
      final cursor = state.batch?.nextCursor;
      if (cursor == null || !seen.add(cursor)) return;
      await next();
    }
  }

  Future<void> _load(bool next) async {
    if (state.busy || !_authenticated || !_foreground) return;
    final freshDeadline = DateTime.now().add(const Duration(minutes: 5));
    final previous = state.batch;
    final cursor = previous?.nextCursor;
    if (next && (cursor == null || _repository is! PagedActivityRepository)) {
      return;
    }
    if (!next) {
      _generation++;
      // Keep readable rows only within their original lifetime during refresh.
      _expiry ??= Timer(const Duration(minutes: 5), () {
        if (ref.mounted) clear();
      });
    }
    final generation = _generation;
    state = EventBatchesState(batch: previous, busy: true, loadingMore: next);
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
          (batch.asOf != previous!.asOf ||
              batch.nextCursor == cursor ||
              !mapEquals(batch.sourceCoverage, previous.sourceCoverage))) {
        state = EventBatchesState(
          batch: previous,
          failure: const AppFailure(
            kind: AppFailureKind.serviceUnavailable,
            message: 'Invalid next batch. Retry or reload.',
          ),
        );
        return;
      }
      if (!next) {
        _expiry?.cancel();
        _expiry = Timer(freshDeadline.difference(DateTime.now()), () {
          if (ref.mounted) clear();
        });
      }
      final seen = <String>{};
      final items = [
        if (next) ...?previous?.items,
        ...batch.items,
      ].where((e) => seen.add(e.eventId ?? e.browseId)).toList();
      state = EventBatchesState(
        batch: ActivityBatch(
          asOf: batch.asOf,
          sourceStatus: batch.sourceStatus,
          sourceCoverage: batch.sourceCoverage,
          items: items,
          nextCursor: batch.nextCursor,
        ),
      );
    } else {
      state = EventBatchesState(
        // A failed new source read may have retired the previous generation.
        batch: next ? previous : null,
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
