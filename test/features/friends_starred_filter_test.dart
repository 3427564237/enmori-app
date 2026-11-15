import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/content_access.dart';
import 'package:enmori/features/friends/domain/friend_repository.dart';
import 'package:enmori/features/friends/friend_providers.dart';
import 'package:enmori/features/friends/presentation/my_friends_controller.dart';
import 'package:enmori/features/friends/presentation/my_friends_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'my_friends_test.dart' as fixtures;

const starred = MyFriend(
  username: 'star_later',
  displayName: 'Later Star',
  specialCare: true,
);

class PagedFriends extends fixtures.Friends {
  final pages = <String?, Result<MyFriendsPage>>{
    null: const Success(
      MyFriendsPage(friends: [fixtures.rowA], nextCursor: 'page-2'),
    ),
    'page-2': const Success(MyFriendsPage(friends: [], nextCursor: 'page-3')),
    'page-3': const Success(MyFriendsPage(friends: [starred])),
  };
  final queries = <String?>[];
  String? pendingAt;
  @override
  Future<Result<MyFriendsPage>> listFriends({
    String? cursor,
    String? query,
  }) async {
    cursors.add(cursor);
    queries.add(query);
    if (pending != null && cursor == pendingAt) return pending!.future;
    return pages[cursor]!;
  }
}

void main() {
  test(
    'an empty search field does not block switching to starred friends',
    () async {
      final repo = PagedFriends();
      final c = ProviderContainer(
        overrides: [friendRepositoryProvider.overrideWithValue(repo)],
      );
      addTearDown(c.dispose);
      c.listen(myFriendsControllerProvider, (_, _) {});
      final controller = c.read(myFriendsControllerProvider.notifier);
      controller.editQuery('');
      await controller.filterStarred(true);
      expect(c.read(myFriendsControllerProvider).queryError, isNull);
      expect(c.read(myFriendsControllerProvider).friends, [starred]);
      expect(repo.queries, [null, null, null]);
    },
  );

  test('starred traversal can stop and continue without accepting the abandoned page', () async {
    final repo = PagedFriends()
      ..pendingAt = 'page-2'
      ..pending = Completer();
    final c = ProviderContainer(
      overrides: [friendRepositoryProvider.overrideWithValue(repo)],
    );
    addTearDown(c.dispose);
    c.listen(myFriendsControllerProvider, (_, _) {});
    final controller = c.read(myFriendsControllerProvider.notifier);
    final work = controller.filterStarred(true);
    for (var n = 0; n < 10; n++) {
      await Future<void>.value();
    }
    controller.pauseScan();
    expect(c.read(myFriendsControllerProvider).scanPaused, isTrue);
    expect(c.read(myFriendsControllerProvider).loaded, isFalse);
    repo.pending!.complete(const Success(MyFriendsPage(friends: [starred])));
    await work;
    expect(c.read(myFriendsControllerProvider).friends, isEmpty);
    repo.pending = null;
    await controller.load(next: true);
    expect(c.read(myFriendsControllerProvider).friends, [starred]);
    expect(c.read(myFriendsControllerProvider).loaded, isTrue);
    expect(repo.cursors, [null, 'page-2', 'page-2', 'page-3']);
  });

  test(
    'a repeated continuation fails instead of scanning indefinitely',
    () async {
      final repo = PagedFriends()
        ..pages['page-2'] = const Success(
          MyFriendsPage(friends: [], nextCursor: 'page-2'),
        );
      final c = ProviderContainer(
        overrides: [friendRepositoryProvider.overrideWithValue(repo)],
      );
      addTearDown(c.dispose);
      c.listen(myFriendsControllerProvider, (_, _) {});
      await c.read(myFriendsControllerProvider.notifier).filterStarred(true);
      expect(c.read(myFriendsControllerProvider).failure, isNotNull);
      expect(c.read(myFriendsControllerProvider).loaded, isFalse);
      expect(repo.cursors, [null, 'page-2']);
    },
  );

  testWidgets('starred filter finds a later-page friend past an empty page', (
    tester,
  ) async {
    final repo = PagedFriends();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [friendRepositoryProvider.overrideWithValue(repo)],
        child: MaterialApp(home: MyFriendsListPage(onOpenFriend: (_) async {})),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byType(FilterChip).last);
    await tester.pumpAndSettle();
    expect(find.text('Later Star'), findsOneWidget);
    expect(find.text('Member A'), findsNothing);
    expect(find.byIcon(Icons.star_rounded), findsOneWidget);
    expect(repo.cursors, [null, null, 'page-2', 'page-3']);
  });

  test('submitted name search covers sparse continuation pages', () async {
    final repo = PagedFriends();
    final container = ProviderContainer(
      overrides: [friendRepositoryProvider.overrideWithValue(repo)],
    );
    addTearDown(container.dispose);
    container.listen(myFriendsControllerProvider, (_, _) {});
    final controller = container.read(myFriendsControllerProvider.notifier);
    controller.editQuery('Later');
    await controller.search();
    expect(repo.cursors, [null, 'page-2', 'page-3']);
    expect(repo.queries, ['Later', 'Later', 'Later']);
    expect(container.read(myFriendsControllerProvider).friends, [
      fixtures.rowA,
      starred,
    ]);
    expect(container.read(myFriendsControllerProvider).nextCursor, isNull);
  });

  test(
    'a failed continuation never becomes an empty successful search',
    () async {
      final repo = PagedFriends()..pages['page-2'] = fixtures.failed;
      final container = ProviderContainer(
        overrides: [friendRepositoryProvider.overrideWithValue(repo)],
      );
      addTearDown(container.dispose);
      container.listen(myFriendsControllerProvider, (_, _) {});
      final controller = container.read(myFriendsControllerProvider.notifier);
      controller.editQuery('Later');
      await controller.search();
      final state = container.read(myFriendsControllerProvider);
      expect(state.loaded, isFalse);
      expect(state.failure, isNotNull);
      expect(state.friends, isEmpty);
    },
  );

  test('backgrounding a traversal discards its reply and stops subsequent requests', () async {
    final repo = PagedFriends()
      ..pendingAt = 'page-2'
      ..pending = Completer();
    final container = ProviderContainer(
      overrides: [friendRepositoryProvider.overrideWithValue(repo)],
    );
    addTearDown(container.dispose);
    container.listen(myFriendsControllerProvider, (_, _) {});
    final controller = container.read(myFriendsControllerProvider.notifier);
    controller.editQuery('Later');
    final work = controller.search();
    for (var n = 0; n < 10; n++) {
      await Future<void>.value();
    }
    expect(repo.cursors, [null, 'page-2']);
    container.read(contentAccessProvider.notifier).setForeground(false);
    repo.pending!.complete(
      const Success(MyFriendsPage(friends: [], nextCursor: 'page-3')),
    );
    await work;
    expect(repo.cursors, [null, 'page-2']);
    expect(container.read(myFriendsControllerProvider).friends, isEmpty);
  });
}
