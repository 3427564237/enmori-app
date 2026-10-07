import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../domain/friend_repository.dart';
import '../friend_providers.dart';

final myFriendsControllerProvider =
    NotifierProvider.autoDispose<MyFriendsController, MyFriendsState>(
      MyFriendsController.new,
    );

final class MyFriendsState {
  const MyFriendsState({
    this.friends = const [],
    this.nextCursor,
    this.busy = false,
    this.loaded = false,
    this.failure,
  });
  final List<MyFriend> friends;
  final String? nextCursor;
  final bool busy, loaded;
  final AppFailure? failure;
}

final class MyFriendsController extends Notifier<MyFriendsState> {
  late FriendRepository _repository;
  int _operation = 0;

  @override
  MyFriendsState build() {
    ref.watch(currentAuthSubjectProvider);
    _repository = ref.watch(friendRepositoryProvider);
    _operation++;
    return const MyFriendsState();
  }

  void clear() {
    _operation++;
    state = const MyFriendsState();
  }

  Future<void> load({bool next = false}) async {
    if (next && (state.busy || state.nextCursor == null)) return;
    final cursor = next ? state.nextCursor : null, operation = ++_operation;
    state = const MyFriendsState(busy: true);
    final result = await _repository.listFriends(cursor: cursor);
    if (!ref.mounted || operation != _operation) return;
    state = switch (result) {
      Success<MyFriendsPage>(:final value) => MyFriendsState(
        friends: List.unmodifiable(value.friends),
        nextCursor: value.nextCursor,
        loaded: true,
      ),
      Failure<MyFriendsPage>(:final failure) => MyFriendsState(
        failure: failure,
      ),
    };
  }
}
