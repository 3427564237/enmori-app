import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../../auth/domain/auth_repository.dart';
import '../domain/participation_repository.dart';
import '../participation_providers.dart';
import 'participation_controller.dart';

final ownParticipationControllerProvider =
    NotifierProvider.autoDispose<
      OwnParticipationController,
      OwnParticipationView
    >(OwnParticipationController.new);

final class OwnParticipationView {
  const OwnParticipationView({
    this.items = const [],
    this.nextCursor,
    this.loaded = false,
    this.busy = false,
    this.loadingMore = false,
    this.failure,
  });
  final List<EventParticipation> items;
  final String? nextCursor;
  final bool loaded, busy, loadingMore;
  final AppFailure? failure;
}

/// A read-only page collection. All mutations still go through the shared
/// ParticipationController and its rendered-session/revision checks.
final class OwnParticipationController extends Notifier<OwnParticipationView> {
  late ParticipationRepository _repository;
  AuthSessionAuthenticated? _session;
  int _generation = 0;
  final _visitedCursors = <String>{};

  @override
  OwnParticipationView build() {
    _session = participationSession(ref.watch(authSessionProvider));
    _repository = ref.watch(participationRepositoryProvider);
    _generation++;
    _visitedCursors.clear();
    ref.onDispose(() => _generation++);
    return const OwnParticipationView();
  }

  void clear() {
    _generation++;
    _visitedCursors.clear();
    state = const OwnParticipationView();
  }

  Future<void> ensureLoaded() async {
    if (!state.loaded && state.failure == null) await load();
  }

  bool isCurrentSnapshot(OwnParticipationView snapshot) =>
      ref.mounted &&
      _session != null &&
      identical(
        participationSession(ref.read(authSessionProvider)),
        _session,
      ) &&
      identical(state, snapshot) &&
      state.loaded &&
      !state.busy;

  Future<void> load({bool more = false}) async {
    if (state.busy || _session == null) return;
    final previous = state, cursor = more ? state.nextCursor : null;
    if (more && cursor == null) return;
    final generation = ++_generation, session = _session;
    bool current() =>
        ref.mounted &&
        generation == _generation &&
        identical(participationSession(ref.read(authSessionProvider)), session);
    state = OwnParticipationView(
      items: previous.items,
      nextCursor: previous.nextCursor,
      loaded: previous.loaded,
      busy: true,
      loadingMore: more,
    );
    Result<EventParticipationPage> result;
    try {
      result = await _repository.own(cursor, current);
    } catch (_) {
      result = const Failure(participationUnavailable);
    }
    if (!current()) return;
    if (result case Success<EventParticipationPage>(:final value)) {
      if (more &&
          value.nextCursor != null &&
          (value.nextCursor == cursor ||
              _visitedCursors.contains(value.nextCursor))) {
        result = const Failure<EventParticipationPage>(
          AppFailure(
            kind: AppFailureKind.unexpected,
            message: 'The next page could not be verified. Refresh your plans.',
          ),
        );
      } else {
        if (!more) _visitedCursors.clear();
        if (cursor != null) _visitedCursors.add(cursor);
        final rows = <String, EventParticipation>{
          if (more)
            for (final row in previous.items) row.eventId: row,
        };
        for (final row in value.items) {
          final old = rows[row.eventId];
          if (old == null || row.revision >= old.revision) {
            rows[row.eventId] = row;
          }
        }
        state = OwnParticipationView(
          items: List.unmodifiable(rows.values),
          nextCursor: value.nextCursor,
          loaded: true,
        );
        return;
      }
    }
    final failure = (result as Failure<EventParticipationPage>).failure;
    if (failure.kind == AppFailureKind.authRequired ||
        failure.kind == AppFailureKind.authForbidden ||
        failure.kind == AppFailureKind.onboardingRequired) {
      _visitedCursors.clear();
      state = OwnParticipationView(failure: failure);
      return;
    }
    state = OwnParticipationView(
      items: previous.items,
      nextCursor: previous.nextCursor,
      loaded: previous.loaded,
      loadingMore: more,
      failure: failure,
    );
  }
}

/// Detail/Home facts already confirmed in this session remain visible on return.
/// Slow pages cannot replace newer revisions. This is a derived projection,
/// never a second writable participation store or a source-content archive.
final ownParticipationRecordsProvider = Provider.autoDispose((ref) {
  final page = ref.watch(ownParticipationControllerProvider);
  final entries = ref.watch(participationControllerProvider);
  if (!page.loaded) return const <EventParticipation>[];
  final rows = {for (final row in page.items) row.eventId: row};
  for (final entry in entries.values) {
    final value = entry.value;
    if (value == null || value.revision == 0) continue;
    final previous = rows[value.eventId];
    if (previous == null || value.revision >= previous.revision) {
      rows[value.eventId] = value;
    }
  }
  return List<EventParticipation>.unmodifiable(rows.values);
});
