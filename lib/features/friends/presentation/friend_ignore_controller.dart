import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../../auth/domain/auth_repository.dart';
import '../discovery_providers.dart';
import '../domain/friend_ignore_repository.dart';

export '../discovery_providers.dart' show friendIgnoreRepositoryProvider;

// Session lifetime, not page lifetime: navigating away cannot bypass unknown-write readback.
final friendIgnoreControllerProvider =
    NotifierProvider<FriendIgnoreController, FriendIgnoreView>(
      FriendIgnoreController.new,
    );

final class FriendIgnoreView {
  const FriendIgnoreView({
    this.people = const [],
    this.busy = false,
    this.loaded = false,
    this.unresolvedUsername,
    this.failure,
    this.current,
    this.generation = 0,
  });
  final List<FriendIgnoreState> people;
  final bool busy, loaded;
  final String? unresolvedUsername;
  final AppFailure? failure;
  final FriendIgnoreState? current;
  final int generation;
}

final class FriendIgnoreUndo {
  const FriendIgnoreUndo(this.value, this.session);
  final FriendIgnoreState value;
  final AuthSessionAuthenticated session;
}

final class FriendIgnoreController extends Notifier<FriendIgnoreView> {
  int _epoch = 0;
  AuthSessionAuthenticated? _session;
  String? _writeTarget;
  late FriendIgnoreRepository _repository;
  @override
  FriendIgnoreView build() {
    _repository = ref.watch(friendIgnoreRepositoryProvider);
    _session =
        ref.watch(authSessionProvider).asData?.value is AuthSessionAuthenticated
        ? ref.read(authSessionProvider).asData!.value
              as AuthSessionAuthenticated
        : null;
    _epoch++;
    _writeTarget = null;
    ref.onDispose(() => _epoch++);
    return const FriendIgnoreView();
  }

  bool _valid(int epoch, AuthSessionAuthenticated? session) =>
      ref.mounted &&
      epoch == _epoch &&
      session != null &&
      identical(session, ref.read(authSessionProvider).asData?.value);
  bool canUndo(FriendIgnoreUndo undo) =>
      _valid(_epoch, undo.session) &&
      !state.busy &&
      state.unresolvedUsername == null;

  Future<void> loadPeople() async {
    if (state.busy || state.unresolvedUsername != null || _session == null) {
      return;
    }
    final epoch = ++_epoch, session = _session, generation = state.generation;
    state = FriendIgnoreView(busy: true, generation: generation);
    final result = await _repository.list(
      isEligible: () => _valid(epoch, session),
    );
    if (!_valid(epoch, session)) return;
    state = switch (result) {
      Success<List<FriendIgnoreState>>(:final value) => FriendIgnoreView(
        people: value,
        loaded: true,
        generation: generation,
      ),
      Failure<List<FriendIgnoreState>>(:final failure) => FriendIgnoreView(
        failure: failure,
        generation: generation,
      ),
    };
  }

  Future<FriendIgnoreUndo?> ignore(String username, String version) =>
      _write(username, version, true);
  Future<void> restore(FriendIgnoreState person) async {
    if (!person.ignored) return;
    await _write(person.username, person.version, false);
  }

  Future<void> undo(FriendIgnoreUndo undo) async {
    if (!canUndo(undo)) return;
    await restore(undo.value);
  }

  Future<FriendIgnoreUndo?> _write(
    String username,
    String version,
    bool ignored,
  ) async {
    if (state.busy || state.unresolvedUsername != null || _session == null) {
      return null;
    }
    final epoch = ++_epoch,
        session = _session!,
        generation = state.generation + 1;
    _writeTarget = username;
    state = FriendIgnoreView(busy: true, generation: generation);
    final result = await _repository.set(
      username,
      ignored: ignored,
      expectedVersion: version,
      isEligible: () => _valid(epoch, session),
    );
    if (!_valid(epoch, session)) return null;
    _writeTarget = null;
    if (result case Success<FriendIgnoreState>(:final value)) {
      state = FriendIgnoreView(current: value, generation: generation + 1);
      return ignored ? FriendIgnoreUndo(value, session) : null;
    }
    final failure = (result as Failure<FriendIgnoreState>).failure;
    // Even a malformed success/timeout might have committed. Never expose Retry.
    // The next action is an explicit authoritative GET, not a repeated write.
    state = FriendIgnoreView(
      failure: failure,
      unresolvedUsername: username,
      generation: generation + 1,
    );
    return null;
  }

  Future<void> checkCurrent() async {
    final username = state.unresolvedUsername;
    if (state.busy || username == null || _session == null) return;
    final epoch = ++_epoch, session = _session, generation = state.generation;
    state = FriendIgnoreView(
      busy: true,
      unresolvedUsername: username,
      generation: generation,
    );
    final result = await _repository.read(
      username,
      isEligible: () => _valid(epoch, session),
    );
    if (!_valid(epoch, session)) return;
    if (result case Success<FriendIgnoreState>(:final value)) {
      state = FriendIgnoreView(current: value, generation: generation + 1);
    } else {
      final failure = (result as Failure<FriendIgnoreState>).failure;
      // Unavailable under current authorization is terminal for this stale card.
      // No cached identity/result is recovered or assumed successfully restored.
      state = FriendIgnoreView(
        failure: failure,
        generation: generation + 1,
        unresolvedUsername:
            failure.kind == AppFailureKind.addFriendTargetUnavailable
            ? null
            : username,
      );
    }
  }

  void clearPrivateViews() {
    // Preserve in-flight/unknown write lock when a page or application goes away.
    if (_writeTarget != null || state.unresolvedUsername != null) return;
    _epoch++;
    state = FriendIgnoreView(generation: state.generation + 1);
  }
}
