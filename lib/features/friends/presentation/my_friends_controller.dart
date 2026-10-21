import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../../auth/domain/auth_repository.dart';
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
    this.query = '',
    this.searching = false,
    this.queryError,
  });
  final List<MyFriend> friends;
  final String? nextCursor;
  final bool busy, loaded, searching;
  final AppFailure? failure;
  final String query;
  final String? queryError;
}

final class MyFriendsController extends Notifier<MyFriendsState> {
  late FriendRepository _repository;
  int _operation = 0;

  @override
  MyFriendsState build() {
    ref.watch(currentAuthSubjectProvider);
    // Also observe session identity: a new session with the same UID is new authority.
    ref.watch(
      authSessionProvider.select(
        (value) => value.asData?.value is AuthSessionAuthenticated
            ? value.asData!.value
            : null,
      ),
    );
    _repository = ref.watch(friendRepositoryProvider);
    _operation++;
    return const MyFriendsState();
  }

  void clear({bool preserveQuery = false}) {
    _operation++;
    state = preserveQuery
        ? MyFriendsState(query: state.query, searching: state.searching)
        : const MyFriendsState();
  }

  void editQuery(String query) {
    _operation++;
    state = MyFriendsState(query: query, searching: true);
  }

  Future<void> clearSearch() async {
    clear();
    await load();
  }

  Future<void> search() async {
    _operation++;
    state = MyFriendsState(query: state.query, searching: true);
    await load();
  }

  Future<void> load({bool next = false}) async {
    if (next && (state.busy || state.nextCursor == null)) return;
    final cursor = next ? state.nextCursor : null, operation = ++_operation;
    final query = state.query, searching = state.searching;
    if (searching && query.trim().isEmpty) {
      state = MyFriendsState(
        query: query,
        searching: true,
        queryError: "Enter a friend's display name.",
      );
      return;
    }
    state = MyFriendsState(busy: true, query: query, searching: searching);
    final result = await _repository.listFriends(
      cursor: cursor,
      query: searching ? query : null,
    );
    if (!ref.mounted || operation != _operation) return;
    state = switch (result) {
      Success<MyFriendsPage>(:final value) => MyFriendsState(
        friends: List.unmodifiable(value.friends),
        nextCursor: value.nextCursor,
        loaded: true,
        query: query,
        searching: searching,
      ),
      Failure<MyFriendsPage>(:final failure) => MyFriendsState(
        failure: failure,
        query: query,
        searching: searching,
      ),
    };
  }
}
