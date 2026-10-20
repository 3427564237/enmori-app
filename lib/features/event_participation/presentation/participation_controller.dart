import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../../auth/domain/auth_repository.dart';
import '../domain/participation_repository.dart';
import '../participation_providers.dart';

final participationControllerProvider =
    NotifierProvider<ParticipationController, Map<String, ParticipationEntry>>(
      ParticipationController.new,
    );

final class ParticipationEntry {
  const ParticipationEntry({
    this.value,
    this.busy = false,
    this.uncertain = false,
    this.failure,
  });
  final EventParticipation? value;
  final bool busy, uncertain;
  final AppFailure? failure;
}

/// One application-owned cache per observed session, used by every Event surface.
final class ParticipationController
    extends Notifier<Map<String, ParticipationEntry>> {
  late ParticipationRepository _repository;
  AuthSessionAuthenticated? _session;
  int _generation = 0, _next = 0;
  final _requests = <String, int>{};
  @override
  Map<String, ParticipationEntry> build() {
    final observed = participationSession(ref.watch(authSessionProvider));
    _session = observed is AuthSessionAuthenticated ? observed : null;
    _repository = ref.watch(participationRepositoryProvider);
    _generation++;
    _requests.clear();
    ref.onDispose(() {
      _generation++;
      _requests.clear();
    });
    return const {};
  }

  bool _live(int generation, String id, int request) =>
      ref.mounted &&
      _session != null &&
      generation == _generation &&
      _requests[id] == request &&
      identical(participationSession(ref.read(authSessionProvider)), _session);
  void _set(String id, ParticipationEntry entry) =>
      state = Map.unmodifiable({...state, id: entry});
  Future<void> load(String id) async {
    final old = state[id] ?? const ParticipationEntry();
    if (old.busy || _session == null) return;
    final generation = _generation, request = ++_next;
    _requests[id] = request;
    _set(
      id,
      ParticipationEntry(
        value: old.value,
        busy: true,
        uncertain: old.uncertain,
      ),
    );
    Result<EventParticipation> result;
    try {
      result = await _repository.read(id, () => _live(generation, id, request));
    } catch (_) {
      result = const Failure(participationUnavailable);
    }
    if (!_live(generation, id, request)) return;
    _set(id, switch (result) {
      Success<EventParticipation>(:final value) => ParticipationEntry(
        value: value,
      ),
      Failure<EventParticipation>(:final failure) => ParticipationEntry(
        value: old.value,
        uncertain: old.uncertain,
        failure: failure,
      ),
    });
  }

  Future<Result<void>> change(
    String id,
    ParticipationStatus status,
    bool ignored,
  ) async {
    final old = state[id], previous = old?.value;
    if (_session == null || previous == null || old!.busy || old.uncertain) {
      return const Failure(participationUnavailable);
    }
    final generation = _generation, request = ++_next;
    _requests[id] = request;
    _set(id, ParticipationEntry(value: previous, busy: true));
    Result<EventParticipation> result;
    try {
      result = await _repository.save(
        previous,
        status,
        ignored,
        () => _live(generation, id, request),
      );
    } catch (_) {
      result = const Failure(participationUnavailable);
    }
    if (!_live(generation, id, request)) {
      return const Failure(participationUnavailable);
    }
    if (result case Success<EventParticipation>(:final value)) {
      _set(id, ParticipationEntry(value: value));
      return const Success(null);
    }
    final failure = (result as Failure<EventParticipation>).failure;
    _set(
      id,
      ParticipationEntry(value: previous, uncertain: true, failure: failure),
    );
    return Failure(failure);
  }

  /// A still-visible button cannot adopt another observation's current version.
  /// Capture both values during render; reject before changing local state or I/O.
  Future<Result<void>> changeRendered(
    String id,
    ParticipationStatus status,
    bool ignored, {
    required AuthSessionAuthenticated? renderedSession,
    required EventParticipation expected,
  }) {
    if (!ref.mounted ||
        renderedSession == null ||
        !identical(_session, renderedSession) ||
        !identical(
          participationSession(ref.read(authSessionProvider)),
          renderedSession,
        ) ||
        expected.eventId != id ||
        !identical(state[id]?.value, expected)) {
      return Future.value(const Failure(participationUnavailable));
    }
    return change(id, status, ignored);
  }

  Future<Result<void>> confirmGoing(String id) =>
      change(id, ParticipationStatus.going, false);
  Future<Result<bool>> readGoing(String id) async {
    await load(id);
    final entry = state[id];
    if (entry?.value == null ||
        entry!.busy ||
        entry.uncertain ||
        entry.failure != null) {
      return Failure(entry?.failure ?? participationUnavailable);
    }
    return Success(entry.value!.status == ParticipationStatus.going);
  }
}

typedef ParticipantSelection = ({
  String eventId,
  ParticipationStatus status,
  ParticipantGroup group,
});
final participantsControllerProvider = NotifierProvider.autoDispose
    .family<ParticipantsController, ParticipantsView, ParticipantSelection>(
      ParticipantsController.new,
    );

final class ParticipantsView {
  const ParticipantsView({this.page, this.busy = false, this.failure});
  final EventParticipantPage? page;
  final bool busy;
  final AppFailure? failure;
}

final class ParticipantsController extends Notifier<ParticipantsView> {
  ParticipantsController(this.selection);
  final ParticipantSelection selection;
  late ParticipationRepository _repository;
  AuthSessionAuthenticated? _session;
  int _generation = 0;
  @override
  ParticipantsView build() {
    final observed = participationSession(ref.watch(authSessionProvider));
    _session = observed is AuthSessionAuthenticated ? observed : null;
    _repository = ref.watch(participationRepositoryProvider);
    _generation++;
    ref.onDispose(() => _generation++);
    return const ParticipantsView();
  }

  void clear() {
    _generation++;
    state = const ParticipantsView();
  }

  Future<void> load({bool more = false}) async {
    if (state.busy || _session == null) return;
    final previous = state.page, cursor = more ? state.page?.nextCursor : null;
    if (more && cursor == null) return;
    final generation = ++_generation, session = _session;
    bool current() =>
        ref.mounted &&
        generation == _generation &&
        identical(participationSession(ref.read(authSessionProvider)), session);
    state = ParticipantsView(page: previous, busy: true);
    Result<EventParticipantPage> result;
    try {
      result = await _repository.participants(
        selection.eventId,
        selection.status,
        selection.group,
        cursor,
        current,
      );
    } catch (_) {
      result = const Failure(participationUnavailable);
    }
    if (!current()) return;
    state = switch (result) {
      Success<EventParticipantPage>(:final value) => ParticipantsView(
        page: value,
      ),
      Failure<EventParticipantPage>(:final failure) => ParticipantsView(
        page: previous,
        failure: failure,
      ),
    };
  }
}
