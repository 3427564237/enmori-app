import 'dart:async';
import 'dart:convert';

import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/friends/data/backend_friend_repository.dart';
import 'package:enmori/features/friends/domain/friend_repository.dart';
import 'package:enmori/features/friends/friend_providers.dart';
import 'package:enmori/features/friends/presentation/my_friends_controller.dart';
import 'package:enmori/features/friends/presentation/my_friends_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

const rowA = MyFriend(username: 'member_a', displayName: 'Member A');
const rowB = MyFriend(username: 'member_b', displayName: 'Member B');
final cursor = base64Url
    .encode(utf8.encode('11111111-1111-4111-8111-111111111111'))
    .replaceAll('=', '');
const failed = Failure<MyFriendsPage>(
  AppFailure(
    kind: AppFailureKind.serviceUnavailable,
    message: 'Service unavailable.',
  ),
);

class Subject extends Notifier<String> {
  @override
  String build() => 'a';
  void change() => state = 'b';
}

final subject = NotifierProvider<Subject, String>(Subject.new);

class Friends implements FriendRepository {
  Result<MyFriendsPage> response = const Success(
    MyFriendsPage(friends: [rowA]),
  );
  Completer<Result<MyFriendsPage>>? pending;
  final cursors = <String?>[];
  @override
  Future<Result<MyFriendsPage>> listFriends({
    String? cursor,
    String? query,
  }) async {
    cursors.add(cursor);
    return pending?.future ?? response;
  }

  @override
  Future<Result<FriendTarget>> lookup(String username, {bool send = false}) =>
      throw UnimplementedError();
  @override
  Future<Result<FriendInbox>> inbox({String? cursor}) =>
      throw UnimplementedError();
  @override
  Future<Result<String>> act(String requestRef, {required bool accept}) =>
      throw UnimplementedError();
}

void main() {
  test('My Friends parser rejects excess fields, invalid rows, oversize pages and invalid continuation', () async {
    final valid = <String, Object?>{
      'friends': [
        {'username': 'member_a', 'displayName': 'Member A'},
      ],
      'nextCursor': cursor,
    };
    for (final data in [
      valid,
      {...valid, 'accountId': 'private'},
      {
        ...valid,
        'friends': [
          {'username': 'member_a', 'displayName': ''},
        ],
      },
      {
        ...valid,
        'friends': [
          {
            'username': 'member_a',
            'displayName': 'Member A',
            'profileVisibility': 'public',
          },
        ],
      },
      {
        ...valid,
        'friends': List.filled(21, {
          'username': 'member_a',
          'displayName': 'Member A',
        }),
      },
      {...valid, 'nextCursor': ''},
      {'friends': []},
      {'friends': [], 'nextCursor': null},
    ]) {
      final client = BackendApiClient(
        Uri.parse('https://example.invalid'),
        () async => const Success('synthetic'),
        httpClient: MockClient((request) async {
          expect(request.url.path, '/v1/me/friends');
          expect(request.url.queryParameters, {'cursor': cursor});
          return http.Response(jsonEncode(data), 200);
        }),
      );
      addTearDown(client.close);
      final result = await BackendFriendRepository(client)
          .listFriends(cursor: cursor);
      if (identical(data, valid) ||
          (data['friends'] is List &&
              (data['friends'] as List).isEmpty &&
              data.containsKey('nextCursor'))) {
        expect(result, isA<Success<MyFriendsPage>>());
      } else {
        expect(result, isA<Failure<MyFriendsPage>>());
      }
    }
  });

  test('Next replaces the page; reload and failures clear visible results and continuation', () async {
    final repo = Friends()
      ..response = Success(MyFriendsPage(friends: [rowA], nextCursor: cursor));
    final container = ProviderContainer(
      overrides: [friendRepositoryProvider.overrideWithValue(repo)],
    );
    addTearDown(container.dispose);
    final subscription = container.listen(
      myFriendsControllerProvider,
      (_, _) {},
    );
    addTearDown(subscription.close);
    final controller = container.read(myFriendsControllerProvider.notifier);
    await controller.load();
    repo.response = const Success(MyFriendsPage(friends: [rowB]));
    await controller.load(next: true);
    expect(repo.cursors, [null, cursor]);
    expect(container.read(myFriendsControllerProvider).friends, [rowB]);
    repo.pending = Completer();
    final reloading = controller.load();
    expect(container.read(myFriendsControllerProvider).friends, isEmpty);
    expect(container.read(myFriendsControllerProvider).nextCursor, isNull);
    repo.pending!.complete(failed);
    await reloading;
    expect(container.read(myFriendsControllerProvider).loaded, isFalse);
    expect(container.read(myFriendsControllerProvider).failure, isNotNull);
  });

  test('auth replacement and a newer reload discard late responses', () async {
    final repo = Friends()..pending = Completer();
    final container = ProviderContainer(
      overrides: [
        friendRepositoryProvider.overrideWithValue(repo),
        currentAuthSubjectProvider.overrideWith((ref) => ref.watch(subject)),
      ],
    );
    addTearDown(container.dispose);
    final subscription = container.listen(
      myFriendsControllerProvider,
      (_, _) {},
    );
    addTearDown(subscription.close);
    final controller = container.read(myFriendsControllerProvider.notifier);
    final old = controller.load();
    container.read(subject.notifier).change();
    expect(container.read(myFriendsControllerProvider).friends, isEmpty);
    repo.pending!.complete(const Success(MyFriendsPage(friends: [rowA])));
    await old;
    expect(container.read(myFriendsControllerProvider).friends, isEmpty);
    repo.pending = Completer();
    final pending = repo.pending!;
    final previous = controller.load();
    repo.pending = null;
    repo.response = const Success(MyFriendsPage(friends: [rowB]));
    await controller.load();
    pending.complete(const Success(MyFriendsPage(friends: [rowA])));
    await previous;
    expect(container.read(myFriendsControllerProvider).friends, [rowB]);
  });

  testWidgets(
    'filtered empty pages retain Next; errors are not empty success; rows have no action',
    (tester) async {
      final repo = Friends()
        ..response = Success(MyFriendsPage(friends: [], nextCursor: cursor));
      await tester.pumpWidget(
        ProviderScope(
          overrides: [friendRepositoryProvider.overrideWithValue(repo)],
          child: const MaterialApp(home: MyFriendsListPage()),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('No friends available on this page.'), findsOneWidget);
      expect(find.text('Next page'), findsOneWidget);
      repo.response = const Success(MyFriendsPage(friends: [rowB]));
      await tester.tap(find.byKey(const Key('my-friends-next')));
      await tester.pumpAndSettle();
      expect(find.text('Member B'), findsOneWidget);
      expect(find.text('Next page'), findsNothing);
      expect(
        find.descendant(of: find.byType(Card), matching: find.byType(InkWell)),
        findsNothing,
      );
      repo.response = failed;
      await tester.tap(find.byKey(const Key('my-friends-reload')));
      await tester.pumpAndSettle();
      expect(find.text('Member B'), findsNothing);
      expect(find.text('No friends available on this page.'), findsNothing);
      expect(find.text('Service unavailable.'), findsOneWidget);
    },
  );

  testWidgets(
    'leaving and reopening the list performs a new read; app resume refreshes',
    (tester) async {
      final repo = Friends();
      Widget app(bool show) => ProviderScope(
        overrides: [friendRepositoryProvider.overrideWithValue(repo)],
        child: MaterialApp(
          home: show ? const MyFriendsListPage() : const SizedBox(),
        ),
      );
      await tester.pumpWidget(app(true));
      await tester.pumpAndSettle();
      expect(repo.cursors.length, 1);
      await tester.pumpWidget(app(false));
      await tester.pumpAndSettle();
      await tester.pumpWidget(app(true));
      await tester.pumpAndSettle();
      expect(repo.cursors.length, 2);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      await tester.pump();
      expect(find.text('Member A'), findsNothing);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pumpAndSettle();
      expect(repo.cursors.length, 3);
    },
  );
}
