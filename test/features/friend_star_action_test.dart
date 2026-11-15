import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/content_access.dart';
import 'package:enmori/features/account/domain/profile_details.dart';
import 'package:enmori/features/friends/domain/friend_repository.dart';
import 'package:enmori/features/friends/domain/social_repository.dart';
import 'package:enmori/features/friends/friend_providers.dart';
import 'package:enmori/features/friends/social_providers.dart';
import 'package:enmori/features/friends/presentation/my_friends_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'my_friends_test.dart' as fixtures;

class StarRepository implements SocialRepository {
  StarRepository(this.friends);
  final fixtures.Friends friends;
  int reads = 0, writes = 0;
  int? observedRevision;
  bool fail = false;
  Completer<Result<SocialProfile>>? pending;
  static const profileValue = SocialProfile(
    username: 'member_a',
    displayName: 'Member A',
    details: ProfileDetails(),
    relationship: SocialRelationship.friend,
    specialCare: false,
    friendshipRevision: 7,
    interests: [],
    mapAvailable: false,
    participationAvailable: false,
  );
  @override
  Future<Result<SocialProfile>> profile(String username) async {
    reads++;
    return pending?.future ?? const Success(profileValue);
  }

  @override
  Future<Result<FriendCare>> care(
    String username, {
    required bool specialCare,
    required int expectedRevision,
    bool Function()? isEligible,
  }) async {
    expect(isEligible?.call(), isTrue);
    writes++;
    observedRevision = expectedRevision;
    if (fail) {
      return const Failure(
        AppFailure(
          kind: AppFailureKind.serviceUnavailable,
          message: 'Synthetic unknown write result.',
        ),
      );
    }
    friends.response = Success(
      MyFriendsPage(
        friends: [
          MyFriend(
            username: username,
            displayName: 'Member A',
            specialCare: specialCare,
          ),
        ],
      ),
    );
    return Success(FriendCare(specialCare, expectedRevision + 1));
  }

  @override
  dynamic noSuchMethod(Invocation invocation) =>
      throw StateError('Unexpected ${invocation.memberName}');
}

void main() {
  test('starring a friend on a later page refreshes that same page', () async {
    final friends = fixtures.Friends()
      ..response = const Success(
        MyFriendsPage(friends: [fixtures.rowB], nextCursor: 'later'),
      );
    final social = StarRepository(friends);
    final c = ProviderContainer(
      overrides: [
        friendRepositoryProvider.overrideWithValue(friends),
        socialRepositoryProvider.overrideWithValue(social),
      ],
    );
    addTearDown(c.dispose);
    c.listen(myFriendsControllerProvider, (_, _) {});
    final controller = c.read(myFriendsControllerProvider.notifier);
    await controller.load();
    friends.response = const Success(MyFriendsPage(friends: [fixtures.rowA]));
    await controller.load(next: true);
    await controller.setStarred('member_a', true);
    expect(friends.cursors, [null, 'later', 'later']);
    expect(
      c.read(myFriendsControllerProvider).friends.single.specialCare,
      isTrue,
    );
  });

  for (final fail in [false, true]) {
    test(
      'star action freshly reads revision and reconciles without retry: fail=$fail',
      () async {
        final friends = fixtures.Friends();
        final social = StarRepository(friends)..fail = fail;
        final c = ProviderContainer(
          overrides: [
            friendRepositoryProvider.overrideWithValue(friends),
            socialRepositoryProvider.overrideWithValue(social),
          ],
        );
        addTearDown(c.dispose);
        c.listen(myFriendsControllerProvider, (_, _) {});
        final controller = c.read(myFriendsControllerProvider.notifier);
        await controller.load();
        final result = await controller.setStarred('member_a', true);
        expect(social.reads, 1);
        expect(social.writes, 1);
        expect(social.observedRevision, 7);
        expect(friends.cursors, [null, null]);
        expect(
          c.read(myFriendsControllerProvider).friends.single.specialCare,
          !fail,
        );
        expect(result != null, fail);
      },
    );
  }
  test(
    'access change before profile finishes prevents the star mutation',
    () async {
      final friends = fixtures.Friends();
      final social = StarRepository(friends)..pending = Completer();
      final c = ProviderContainer(
        overrides: [
          friendRepositoryProvider.overrideWithValue(friends),
          socialRepositoryProvider.overrideWithValue(social),
        ],
      );
      addTearDown(c.dispose);
      c.listen(myFriendsControllerProvider, (_, _) {});
      final controller = c.read(myFriendsControllerProvider.notifier);
      await controller.load();
      final work = controller.setStarred('member_a', true);
      c.read(contentAccessProvider.notifier).changed();
      social.pending!.complete(const Success(StarRepository.profileValue));
      await work;
      expect(social.writes, 0);
      expect(c.read(myFriendsControllerProvider).friends, isEmpty);
    },
  );
}
