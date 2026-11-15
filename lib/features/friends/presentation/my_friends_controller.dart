import '../../account/content_access.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../../auth/domain/auth_repository.dart';
import '../domain/friend_repository.dart';
import '../friend_providers.dart';
import '../domain/social_repository.dart';
import '../social_providers.dart';

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
    this.specialCareOnly = false,
    this.scanPaused = false,
    this.updatingUsername,
  });
  final List<MyFriend> friends;
  final String? nextCursor;
  final bool busy, loaded, searching;
  final AppFailure? failure;
  final String query;
  final String? queryError;
  final bool specialCareOnly, scanPaused;
  final String? updatingUsername;
  bool get filtered => searching || specialCareOnly;
}

final class MyFriendsController extends Notifier<MyFriendsState> {
  late FriendRepository _repository;
  late SocialRepository _socialRepository;
  int _operation = 0;
  String? _pageCursor;

  @override
  MyFriendsState build() {
    ref.watch(currentAuthSubjectProvider);
    ref.listen(contentAccessProvider, (before, after) {
      clear(preserveQuery: after.foreground);
    });
    // Also observe session identity: a new session with the same UID is new authority.
    ref.watch(
      authSessionProvider.select(
        (value) => value.asData?.value is AuthSessionAuthenticated
            ? value.asData!.value
            : null,
      ),
    );
    _repository = ref.watch(friendRepositoryProvider);
    _socialRepository = ref.watch(socialRepositoryProvider);
    _operation++;
    _pageCursor = null;
    ref.onDispose(() => _operation++);
    return const MyFriendsState();
  }

  void clear({bool preserveQuery = false}) {
    _operation++;
    state = preserveQuery
        ? MyFriendsState(
            query: state.query,
            searching: state.searching,
            specialCareOnly: state.specialCareOnly,
          )
        : const MyFriendsState();
  }

  void editQuery(String query) {
    _operation++;
    state = MyFriendsState(
      query: query,
      searching: true,
      specialCareOnly: state.specialCareOnly,
    );
  }

  Future<void> clearSearch() async {
    _operation++;
    state = MyFriendsState(specialCareOnly: state.specialCareOnly);
    await load();
  }

  Future<void> search() async {
    _operation++;
    state = MyFriendsState(
      query: state.query,
      searching: true,
      specialCareOnly: state.specialCareOnly,
    );
    await load();
  }

  Future<void> filterStarred(bool value) async {
    if (state.updatingUsername != null) return;
    _operation++;
    state = MyFriendsState(
      query: state.query,
      searching: state.searching && state.query.trim().isNotEmpty,
      specialCareOnly: value,
    );
    await load();
  }

  void pauseScan() {
    if (!state.busy || !state.filtered || state.updatingUsername != null) {
      return;
    }
    _operation++;
    state = MyFriendsState(
      friends: state.friends,
      nextCursor: state.nextCursor,
      query: state.query,
      searching: state.searching,
      specialCareOnly: state.specialCareOnly,
      scanPaused: true,
    );
  }

  Future<void> load({bool next = false}) => _load(next: next);

  Future<void> _load({bool next = false, String? fromCursor}) async {
    if (!ref.read(contentAccessProvider).foreground) return;
    if (next && (state.busy || state.nextCursor == null)) return;
    var cursor = next ? state.nextCursor : fromCursor;
    final operation = ++_operation;
    final query = state.query, searching = state.searching;
    final specialCareOnly = state.specialCareOnly;
    final filtered = searching || specialCareOnly;
    _pageCursor = filtered ? null : cursor;
    final friends = <String, MyFriend>{
      if (next && filtered)
        for (final friend in state.friends) friend.username: friend,
    };
    final seenCursors = <String>{?cursor};
    if (searching && query.trim().isEmpty) {
      state = MyFriendsState(
        query: query,
        searching: true,
        specialCareOnly: specialCareOnly,
        queryError: "Enter a friend's display name.",
      );
      return;
    }
    while (true) {
      state = MyFriendsState(
        busy: true,
        query: query,
        searching: searching,
        specialCareOnly: specialCareOnly,
        friends: List.unmodifiable(friends.values),
        nextCursor: cursor,
      );
      final result = await _repository.listFriends(
        cursor: cursor,
        query: searching ? query : null,
      );
      if (!ref.mounted || operation != _operation) return;
      if (result case Failure<MyFriendsPage>(:final failure)) {
        state = MyFriendsState(
          failure: failure,
          query: query,
          searching: searching,
          specialCareOnly: specialCareOnly,
        );
        return;
      }
      final value = (result as Success<MyFriendsPage>).value;
      for (final friend in value.friends) {
        if (!specialCareOnly || friend.specialCare) {
          friends[friend.username] = friend;
        } else {
          friends.remove(friend.username);
        }
      }
      cursor = value.nextCursor;
      if (filtered && cursor != null && !seenCursors.add(cursor)) {
        state = MyFriendsState(
          failure: const AppFailure(
            kind: AppFailureKind.unexpected,
            message: 'The friend search could not be completed. Please reload.',
          ),
          query: query,
          searching: searching,
          specialCareOnly: specialCareOnly,
        );
        return;
      }
      if (!filtered || cursor == null) {
        state = MyFriendsState(
          friends: List.unmodifiable(friends.values),
          nextCursor: cursor,
          loaded: true,
          query: query,
          searching: searching,
          specialCareOnly: specialCareOnly,
        );
        return;
      }
    }
  }

  Future<AppFailure?> setStarred(String username, bool value) async {
    if (state.busy ||
        !state.friends.any((friend) => friend.username == username) ||
        !ref.read(contentAccessProvider).foreground) {
      return null;
    }
    final operation = ++_operation;
    final pageCursor = _pageCursor;
    final access = ref.read(contentAccessProvider);
    final session = ref.read(authSessionProvider).asData?.value;
    bool current() =>
        ref.mounted &&
        operation == _operation &&
        identical(access, ref.read(contentAccessProvider)) &&
        identical(session, ref.read(authSessionProvider).asData?.value) &&
        ref.read(contentAccessProvider).foreground;
    state = MyFriendsState(
      friends: state.friends,
      nextCursor: state.nextCursor,
      query: state.query,
      searching: state.searching,
      loaded: state.loaded,
      specialCareOnly: state.specialCareOnly,
      busy: true,
      updatingUsername: username,
    );
    final profileResult = await _socialRepository.profile(username);
    if (!current()) return null;
    if (profileResult case Failure<SocialProfile>(:final failure)) {
      await _load(fromCursor: pageCursor);
      return failure;
    }
    final profile = (profileResult as Success<SocialProfile>).value;
    if (profile.relationship != SocialRelationship.friend ||
        profile.username != username) {
      await _load(fromCursor: pageCursor);
      return const AppFailure(
        kind: AppFailureKind.unexpected,
        message: 'This friendship changed. The list has been refreshed.',
      );
    }
    var reload = false;
    final result = await afterContentMutation(ref, () async {
      final result = await _socialRepository.care(
        username,
        specialCare: value,
        expectedRevision: profile.friendshipRevision,
        isEligible: current,
      );
      reload = current();
      return result;
    });
    if (!ref.mounted ||
        !reload ||
        !identical(session, ref.read(authSessionProvider).asData?.value) ||
        !ref.read(contentAccessProvider).foreground) {
      return null;
    }
    await _load(fromCursor: pageCursor);
    return switch (result) {
      Failure<FriendCare>(:final failure) => failure,
      Success<FriendCare>() => null,
    };
  }
}
