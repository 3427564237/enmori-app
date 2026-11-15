import 'dart:async';
import 'dart:convert';

import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
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
  final queries = <String?>[];
  Result<MyFriendsPage>? continuedResponse;
  @override
  Future<Result<MyFriendsPage>> listFriends({
    String? cursor,
    String? query,
  }) async {
    cursors.add(cursor);
    queries.add(query);
    return pending?.future ??
        (cursor == null ? response : continuedResponse ?? response);
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
  test('Search transport sends raw query without client filtering and validates canonical cursor envelope', () async {
    final good = base64Url
        .encode(
          utf8.encode(
            jsonEncode({
              'v': 1,
              'q': 'josé',
              'after': '11111111-1111-4111-8111-111111111111',
            }),
          ),
        )
        .replaceAll('=', '');
    for (final next in [
      good,
      null,
      '',
      '$good=',
      cursor,
      base64Url
          .encode(
            utf8.encode(
              jsonEncode({
                'q': 'josé',
                'v': 1,
                'after': '11111111-1111-4111-8111-111111111111',
              }),
            ),
          )
          .replaceAll('=', ''),
    ]) {
      final client = BackendApiClient(
        Uri.parse('https://example.invalid'),
        () async => const Success('synthetic'),
        httpClient: MockClient((request) async {
          expect(request.url.path, '/v1/me/friends/search');
          expect(request.url.queryParameters, {
            'q': ' Jose\u0301 + & ',
            'cursor': good,
          });
          return http.Response(
            jsonEncode({
              'friends': [
                {'username': 'member_a', 'displayName': 'José'},
              ],
              'nextCursor': next,
            }),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        }),
      );
      final result = await BackendFriendRepository(client)
          .listFriends(query: ' Jose\u0301 + & ', cursor: good);
      expect(
        result,
        next == good || next == null
            ? isA<Success<MyFriendsPage>>()
            : isA<Failure<MyFriendsPage>>(),
      );
      client.close();
    }
  });
  test('query edits discard late replies; submitted search traverses pages; reload and clear restart', () async {
    final repo = Friends();
    final container = ProviderContainer(
      overrides: [friendRepositoryProvider.overrideWithValue(repo)],
    );
    addTearDown(container.dispose);
    final sub = container.listen(myFriendsControllerProvider, (_, _) {});
    addTearDown(sub.close);
    final controller = container.read(myFriendsControllerProvider.notifier);
    controller.editQuery('Alice');
    repo.pending = Completer();
    final pending = repo.pending!;
    final old = controller.search();
    controller.editQuery('Bob');
    expect(container.read(myFriendsControllerProvider).nextCursor, isNull);
    repo.pending = null;
    repo.response = Success(MyFriendsPage(friends: [rowB], nextCursor: cursor));
    repo.continuedResponse = const Success(MyFriendsPage(friends: []));
    await controller.search();
    pending.complete(const Success(MyFriendsPage(friends: [rowA])));
    await old;
    expect(container.read(myFriendsControllerProvider).friends, [rowB]);
    repo.response = const Success(MyFriendsPage(friends: []));
    await controller.load();
    await controller.clearSearch();
    expect(repo.queries, ['Alice', 'Bob', 'Bob', 'Bob', null]);
    expect(repo.cursors, [null, null, cursor, null, null]);
    expect(container.read(myFriendsControllerProvider).query, '');
    expect(container.read(myFriendsControllerProvider).searching, false);
  });
  test('fresh authenticated session with same UID clears query/rows and rejects old response', () async {
    final sessions = StreamController<AuthSession>();
    addTearDown(sessions.close);
    final repo = Friends();
    final container = ProviderContainer(
      overrides: [
        friendRepositoryProvider.overrideWithValue(repo),
        authSessionProvider.overrideWith((ref) => sessions.stream),
      ],
    );
    addTearDown(container.dispose);
    final sub = container.listen(myFriendsControllerProvider, (_, _) {});
    addTearDown(sub.close);
    sessions.add(AuthSessionAuthenticated(subject: 'same'));
    await Future<void>.delayed(Duration.zero);
    final controller = container.read(myFriendsControllerProvider.notifier);
    controller.editQuery('Alice');
    await controller.search();
    repo.pending = Completer();
    final old = controller.load();
    sessions.add(AuthSessionAuthenticated(subject: 'same'));
    await Future<void>.delayed(Duration.zero);
    expect(container.read(myFriendsControllerProvider).query, '');
    expect(container.read(myFriendsControllerProvider).friends, isEmpty);
    repo.pending!.complete(const Success(MyFriendsPage(friends: [rowA])));
    await old;
    expect(container.read(myFriendsControllerProvider).friends, isEmpty);
  });
  test(
    'resubmitting same query and Clear invalidate an outstanding result',
    () async {
      final repo = Friends();
      final container = ProviderContainer(
        overrides: [friendRepositoryProvider.overrideWithValue(repo)],
      );
      addTearDown(container.dispose);
      final sub = container.listen(myFriendsControllerProvider, (_, _) {});
      addTearDown(sub.close);
      final c = container.read(myFriendsControllerProvider.notifier);
      c.editQuery('Alice');
      repo.pending = Completer();
      final delayed = repo.pending!;
      final old = c.search();
      repo.pending = null;
      repo.response = const Success(MyFriendsPage(friends: [rowB]));
      await c.search();
      delayed.complete(const Success(MyFriendsPage(friends: [rowA])));
      await old;
      expect(container.read(myFriendsControllerProvider).friends, [rowB]);
      repo.pending = Completer();
      final delayed2 = repo.pending!;
      final old2 = c.load();
      repo.pending = null;
      await c.clearSearch();
      delayed2.complete(const Success(MyFriendsPage(friends: [rowA])));
      await old2;
      expect(container.read(myFriendsControllerProvider).query, '');
      expect(container.read(myFriendsControllerProvider).friends, [rowB]);
    },
  );
  testWidgets(
    'Search/Clear/Next/Reload render server pages, blank query focuses input, controls are labelled and 48dp',
    (tester) async {
      final repo = Friends();
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            friendRepositoryProvider.overrideWithValue(repo),
            authSessionProvider.overrideWithValue(
              const AsyncData(AuthSessionAuthenticated(subject: 'member-a')),
            ),
          ],
          child: const MaterialApp(home: MyFriendsListPage()),
        ),
      );
      await tester.pumpAndSettle();
      final field = find.byKey(const Key('my-friends-search-query'));
      await tester.tap(find.byKey(const Key('my-friends-search')));
      await tester.pumpAndSettle();
      expect(find.text("Enter a friend's display name."), findsOneWidget);
      expect(tester.widget<TextField>(field).focusNode!.hasFocus, true);
      expect(repo.queries, [null]);
      await tester.enterText(field, 'Alice');
      repo.response = Success(MyFriendsPage(friends: [], nextCursor: cursor));
      repo.continuedResponse = const Success(MyFriendsPage(friends: []));
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pumpAndSettle();
      expect(tester.widget<TextField>(field).focusNode!.hasFocus, isFalse);
      expect(find.text('No matching friends'), findsOneWidget);
      expect(find.text('Member A'), findsNothing);
      final semantics = tester.ensureSemantics();

      for (final key in [
        'my-friends-search',
        'my-friends-clear-search',
        'my-friends-reload',
      ]) {
        final finder = find.byKey(Key(key));
        await tester.ensureVisible(finder);
        await tester.pumpAndSettle();
        expect(tester.getSize(finder).height, greaterThanOrEqualTo(48));
        final node = tester.getSemantics(finder).getSemanticsData();
        if (key == 'my-friends-reload' || key == 'my-friends-search') {
          expect(
            node.tooltip,
            key == 'my-friends-reload' ? 'Refresh friends' : 'Search friends',
          );
        } else {
          expect(node.label, isNotEmpty, reason: key);
        }
      }
      semantics.dispose();
      repo.response = const Success(MyFriendsPage(friends: [rowB]));
      await tester.ensureVisible(find.byKey(const Key('my-friends-reload')));
      await tester.tap(find.byKey(const Key('my-friends-reload')));
      await tester.pumpAndSettle();
      expect(find.text('Member B'), findsOneWidget);
      await tester.tap(find.byKey(const Key('my-friends-clear-search')));
      await tester.pumpAndSettle();
      expect(tester.widget<TextField>(field).controller!.text, '');
      expect(repo.queries, [null, 'Alice', 'Alice', 'Alice', null]);
      expect(repo.cursors, [null, null, cursor, null, null]);
    },
  );
}
