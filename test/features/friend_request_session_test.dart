import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/friends/domain/friend_repository.dart';
import 'package:enmori/features/friends/friend_providers.dart';
import 'package:enmori/features/friends/presentation/friend_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fakes.dart';

const target = FriendTarget(
  username: 'member_b',
  displayName: 'Member B',
  relationship: RelationshipState.canSendRequest,
);
const request = FriendRequest(
  username: 'member_b',
  displayName: 'Member B',
  requestRef: 'owned-request',
);
const oldInbox = FriendInbox(requests: [request], nextCursor: 'old-cursor');

void main() {
  test('same-subject replacement clears target, inbox and cursor', () async {
    final h = await _start();
    await h.controller.lookup('member_b');
    await h.controller.loadInbox();
    expect(h.state.target, target);
    expect(h.state.requests, [request]);
    await h.replaceSession();
    expectEmpty(h.state);

    h.repository.inboxResult = const Success(FriendInbox(requests: []));
    await h.controller.loadInbox();
    expect(h.repository.cursors, [null, null]);
    expectEmpty(h.state);
    expect(h.auth.watchCount, 1);
  });

  for (final send in [false, true]) {
    test(
      'late lookup send=$send cannot restore the replaced session',
      () async {
        final h = await _start();
        final pending = Completer<Result<FriendTarget>>();
        h.repository.pendingLookup = pending;
        final old = h.controller.lookup('member_b', send: send);
        await h.replaceSession();
        pending.complete(const Success(target));
        await old;
        expectEmpty(h.state);
        expect(h.repository.sends, [send]);
      },
    );
  }

  test('late inbox cannot append old requests or restore its cursor', () async {
    final h = await _start();
    final pending = Completer<Result<FriendInbox>>();
    h.repository.pendingInbox = pending;
    final old = h.controller.loadInbox();
    await h.replaceSession();
    pending.complete(const Success(oldInbox));
    await old;
    expectEmpty(h.state);
    h.repository.pendingInbox = null;
    h.repository.inboxResult = const Success(FriendInbox(requests: []));
    await h.controller.loadInbox();
    expect(h.repository.cursors, [null, null]);
    expectEmpty(h.state);
  });

  test(
    'late accepted action does not start an inbox read in the new session',
    () async {
      final h = await _start();
      final pending = Completer<Result<String>>();
      h.repository.pendingAction = pending;
      final old = h.controller.act(request, accept: true);
      await h.replaceSession();
      pending.complete(const Success('accepted'));
      await old;
      expect(h.repository.cursors, isEmpty);
      expect(h.repository.actions, [true]);
      expectEmpty(h.state);
    },
  );

  test(
    'session replacement during post-action reread drops rows and message',
    () async {
      final h = await _start();
      final pending = Completer<Result<FriendInbox>>();
      h.repository.pendingInbox = pending;
      final old = h.controller.act(request, accept: false);
      await h.repository.inboxStarted.future;
      await h.replaceSession();
      pending.complete(const Success(oldInbox));
      await old;
      expectEmpty(h.state);
      expect(h.repository.actions, [false]);
      expect(h.repository.cursors, [null]);
    },
  );
}

void expectEmpty(FriendScreenState state) {
  expect(state.target, isNull);
  expect(state.requests, isEmpty);
  expect(state.nextCursor, isNull);
  expect(state.busy, isFalse);
  expect(state.message, isNull);
  expect(state.failure, isNull);
}

Future<_Harness> _start() async {
  final auth = FakeAuthRepository();
  final repository = _Friends();
  final container = ProviderContainer(
    overrides: [
      authRepositoryProvider.overrideWithValue(auth),
      friendRepositoryProvider.overrideWithValue(repository),
    ],
  );
  addTearDown(auth.close);
  addTearDown(container.dispose);
  container.listen(authSessionProvider, (_, _) {});
  auth.emit(AuthSessionAuthenticated(subject: 'member-a'));
  await container.read(authSessionProvider.future);
  container.listen(friendControllerProvider, (_, _) {});
  return _Harness(container, auth, repository);
}

final class _Harness {
  _Harness(this.container, this.auth, this.repository);
  final ProviderContainer container;
  final FakeAuthRepository auth;
  final _Friends repository;
  FriendController get controller =>
      container.read(friendControllerProvider.notifier);
  FriendScreenState get state => container.read(friendControllerProvider);
  Future<void> replaceSession() async {
    auth.emit(AuthSessionAuthenticated(subject: 'member-a'));
    await container.pump();
  }
}

final class _Friends implements FriendRepository {
  Completer<Result<FriendTarget>>? pendingLookup;
  Completer<Result<FriendInbox>>? pendingInbox;
  Completer<Result<String>>? pendingAction;
  final inboxStarted = Completer<void>();
  Result<FriendInbox> inboxResult = const Success(oldInbox);
  final sends = <bool>[];
  final actions = <bool>[];
  final cursors = <String?>[];

  @override
  Future<Result<FriendTarget>> lookup(
    String username, {
    bool send = false,
  }) async {
    sends.add(send);
    return pendingLookup?.future ?? const Success(target);
  }

  @override
  Future<Result<FriendInbox>> inbox({String? cursor}) async {
    cursors.add(cursor);
    if (!inboxStarted.isCompleted) inboxStarted.complete();
    return pendingInbox?.future ?? inboxResult;
  }

  @override
  Future<Result<String>> act(String requestRef, {required bool accept}) async {
    actions.add(accept);
    return pendingAction?.future ?? const Success('completed');
  }

  @override
  Future<Result<MyFriendsPage>> listFriends({String? cursor, String? query}) =>
      throw StateError('No My Friends read in this request-controller fixture');
}
