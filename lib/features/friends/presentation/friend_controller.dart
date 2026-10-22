import '../../account/content_access.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../../auth/domain/auth_repository.dart';
import '../domain/friend_repository.dart';
import '../friend_providers.dart';

final friendControllerProvider =
    NotifierProvider.autoDispose<FriendController, FriendScreenState>(
      FriendController.new,
    );

final class FriendScreenState {
  const FriendScreenState({
    this.target,
    this.requests = const [],
    this.nextCursor,
    this.busy = false,
    this.message,
    this.failure,
  });
  final FriendTarget? target;
  final List<FriendRequest> requests;
  final String? nextCursor, message;
  final bool busy;
  final AppFailure? failure;
}

final class FriendController extends Notifier<FriendScreenState> {
  late FriendRepository _repository;
  int _operation = 0;
  @override
  FriendScreenState build() {
    ref.watch(currentAuthSubjectProvider);
    // A new observation for the same subject must also retire old UI work.
    ref.watch(
      authSessionProvider.select(
        (value) => switch (value) {
          AsyncData<AuthSession>(
            value: final AuthSessionAuthenticated session,
          ) =>
            session,
          _ => null,
        },
      ),
    );
    _repository = ref.watch(friendRepositoryProvider);
    _operation++;
    // Invalidation retires callbacks before the next lazy rebuild occurs.
    ref.onDispose(() => _operation++);
    return const FriendScreenState();
  }

  Future<void> lookup(String username, {bool send = false}) async {
    if (state.busy) return;
    final operation = ++_operation, previous = state;
    state = FriendScreenState(
      requests: previous.requests,
      nextCursor: previous.nextCursor,
      busy: true,
    );
    final result = await _repository.lookup(username, send: send);
    if (!ref.mounted || operation != _operation) return;
    state = switch (result) {
      Success<FriendTarget>(:final value) => FriendScreenState(
        target: value,
        requests: previous.requests,
        nextCursor: previous.nextCursor,
      ),
      Failure<FriendTarget>(:final failure) => FriendScreenState(
        requests: previous.requests,
        nextCursor: previous.nextCursor,
        failure: failure,
      ),
    };
  }

  Future<void> loadInbox({bool more = false}) async {
    if (state.busy) return;
    final previous = state, operation = ++_operation;
    state = FriendScreenState(
      target: previous.target,
      requests: previous.requests,
      nextCursor: previous.nextCursor,
      busy: true,
    );
    final result = await _repository.inbox(
      cursor: more ? previous.nextCursor : null,
    );
    if (!ref.mounted || operation != _operation) return;
    state = switch (result) {
      Success<FriendInbox>(:final value) => FriendScreenState(
        target: previous.target,
        requests: List.unmodifiable([
          ...more ? previous.requests : <FriendRequest>[],
          ...value.requests,
        ]),
        nextCursor: value.nextCursor,
      ),
      Failure<FriendInbox>(:final failure) => FriendScreenState(
        target: previous.target,
        requests: previous.requests,
        nextCursor: previous.nextCursor,
        failure: failure,
      ),
    };
  }

  Future<void> act(FriendRequest request, {required bool accept}) async {
    if (state.busy) return;
    final previous = state, operation = ++_operation, repository = _repository;
    state = FriendScreenState(
      target: previous.target,
      requests: previous.requests,
      nextCursor: previous.nextCursor,
      busy: true,
    );
    final result = await afterContentMutation(
      ref,
      () => repository.act(request.requestRef, accept: accept),
    );
    if (!ref.mounted || operation != _operation) return;
    if (result case Failure<String>(:final failure)) {
      state = FriendScreenState(
        target: previous.target,
        requests: previous.requests,
        nextCursor: previous.nextCursor,
        failure: failure,
      );
      return;
    }
    final fresh = await repository.inbox();
    if (!ref.mounted || operation != _operation) return;
    state = switch (fresh) {
      Success<FriendInbox>(:final value) => FriendScreenState(
        requests: value.requests,
        nextCursor: value.nextCursor,
        message: accept
            ? 'Friend request accepted.'
            : 'Friend request declined.',
      ),
      Failure<FriendInbox>(:final failure) => FriendScreenState(
        message: accept
            ? 'Friend request accepted. Reload requests.'
            : 'Friend request declined. Reload requests.',
        failure: failure,
      ),
    };
  }
}
