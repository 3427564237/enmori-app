import 'package:enmori/features/auth/domain/auth_repository.dart';

import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/check_in/data/backend_check_in_repository.dart';
import 'package:enmori/features/check_in/domain/check_in_repository.dart';
import 'package:enmori/features/event_detail/data/backend_event_detail_repository.dart';
import 'package:enmori/features/event_detail/domain/event_detail_repository.dart';
import 'package:enmori/features/event_detail/event_detail_providers.dart';
import 'package:enmori/features/event_detail/presentation/event_detail_page.dart';
import 'package:enmori/features/event_detail/presentation/event_detail_controller.dart';
import 'package:enmori/features/friends/data/backend_friend_repository.dart';
import 'package:enmori/features/friends/domain/friend_repository.dart';
import 'package:enmori/features/friends/friend_providers.dart';
import 'package:enmori/features/friends/presentation/friend_controller.dart';
import 'package:enmori/features/friends/presentation/friend_page.dart';

class Subject extends Notifier<String> {
  @override
  String build() => 'a';
  void change() => state = 'b';
}

final subjectProvider = NotifierProvider<Subject, String>(Subject.new);
final event = EventDetail(
  eventId: 'ev',
  title: 'Synthetic event',
  startAt: DateTime.utc(2026, 10, 6),
  externalSourceUrl: 'https://example.invalid/synthetic-event',
);

final class FakeEvents implements EventDetailRepository {
  Completer<Result<EventDetail>>? pending;
  Result<EventDetail>? failure;
  int reads = 0, copies = 0;
  @override
  Future<Result<EventDetail>> read(String id) async {
    reads++;
    return pending?.future ?? failure ?? Success(event);
  }

  @override
  Future<Result<void>> copyLink(EventDetail value) async {
    copies++;
    return const Success(null);
  }
}

final class FakeFriends implements FriendRepository {
  @override
  Future<Result<MyFriendsPage>> listFriends({
    String? cursor,
    String? query,
  }) async => const Success(MyFriendsPage(friends: []));
  Completer<Result<FriendTarget>>? pending;
  List<FriendRequest> requests = [
    const FriendRequest(
      username: 'member_a',
      displayName: 'Member A',
      requestRef: 'request-1',
    ),
  ];
  int sends = 0, actions = 0;
  @override
  Future<Result<FriendTarget>> lookup(
    String username, {
    bool send = false,
  }) async {
    if (send) sends++;
    return pending?.future ??
        Success(
          FriendTarget(
            username: 'member_b',
            displayName: 'Member B',
            relationship: send
                ? RelationshipState.outgoingRequestPending
                : RelationshipState.canSendRequest,
          ),
        );
  }

  @override
  Future<Result<FriendInbox>> inbox({String? cursor}) async =>
      Success(FriendInbox(requests: List.unmodifiable(requests)));
  @override
  Future<Result<String>> act(String ref, {required bool accept}) async {
    actions++;
    requests = [];
    return Success(accept ? 'accepted' : 'declined');
  }
}

BackendApiClient client(http.Response Function(http.Request) response) =>
    BackendApiClient(
      Uri.parse('https://example.invalid'),
      () async => const Success('synthetic'),
      httpClient: MockClient((request) async => response(request)),
    );
void main() {
  test('Check-in parser preserves three snapshots, legacy omission, rejects null/invalid values', () async {
    for (final visibility in [
      null,
      'private',
      'friends_only',
      'public',
      42,
      'unknown',
    ]) {
      final data = <String, Object?>{
        'checkInId': 'ci',
        'note': 'Synthetic',
        'createdAt': '2026-10-05T00:00:00Z',
        'checkInVisibility': ?visibility,
      };
      final c = client(
        (r) => http.Response(jsonEncode({'checkIn': data}), 200),
      );
      addTearDown(c.close);
      final result = await BackendCheckInRepository(c)
          .readOwned(checkInId: 'ci');
      if (visibility == 42 || visibility == 'unknown') {
        expect(result, isA<Failure<CheckIn>>());
      } else {
        expect(
          (result as Success<CheckIn>).value.checkInVisibility,
          switch (visibility) {
            'private' => CheckInVisibility.private,
            'friends_only' => CheckInVisibility.friendsOnly,
            'public' => CheckInVisibility.public,
            _ => null,
          },
        );
      }
    }
    final c = client(
      (r) => http.Response(
        '{"checkIn":{"checkInId":"ci","note":"Synthetic","createdAt":"2026-10-05T00:00:00Z","checkInVisibility":null}}',
        200,
      ),
    );
    addTearDown(c.close);
    expect(
      await BackendCheckInRepository(c).readOwned(checkInId: 'ci'),
      isA<Failure<CheckIn>>(),
    );
  });
  test('Friend actions have no body/idempotency key and new errors retain semantics', () async {
    final c = client((request) {
      expect(request.body, isEmpty);
      expect(request.headers.containsKey('Idempotency-Key'), false);
      return http.Response('{"result":"accepted"}', 200);
    });
    addTearDown(c.close);
    expect(
      (await BackendFriendRepository(
        c,
      ).act('opaque-ref', accept: true) as Success<String>).value,
      'accepted',
    );
    final error = client(
      (request) => http.Response(
        '{"error":{"code":"FRIEND_REQUEST_UNAVAILABLE","message":"This friend request is unavailable.","requestId":"synthetic"}}',
        404,
      ),
    );
    addTearDown(error.close);
    expect(
      (await BackendFriendRepository(
        error,
      ).act('opaque-ref', accept: true) as Failure<String>).failure.kind,
      AppFailureKind.friendRequestUnavailable,
    );
  });
  test('Event parser rejects wrong identity, unknown fields, null optional text and unsafe links', () async {
    for (final change in [
      {'eventId': 'other'},
      {'providerPayload': {}},
      {'locationLabel': null},
      {'externalSourceUrl': 'http://example.invalid/event'},
      {'title': 'x' * 201},
    ]) {
      final data = {
        'eventId': 'ev',
        'title': 'Synthetic',
        'startAt': '2026-10-06T00:00:00Z',
        'externalSourceUrl': 'https://example.invalid/event',
        ...change,
      };
      final c = client(
        (request) => http.Response(jsonEncode({'event': data}), 200),
      );
      addTearDown(c.close);
      expect(
        await BackendEventDetailRepository(c).read('ev'),
        isA<Failure<EventDetail>>(),
      );
    }
  });
  test(
    'Detail retains valid nanosecond duration and rejects calendar overflow',
    () async {
      for (final start in [
        '2026-10-06T00:00:00.000000001Z',
        '2026-02-30T00:00:00Z',
      ]) {
        final c = client(
          (request) => http.Response(
            jsonEncode({
              'event': {
                'eventId': 'ev',
                'title': 'Synthetic',
                'startAt': start,
                'endAt': '2026-10-06T00:00:00.000000002Z',
                'externalSourceUrl': 'https://example.invalid/event',
              },
            }),
            200,
          ),
        );
        addTearDown(c.close);
        final result = await BackendEventDetailRepository(c).read('ev');
        expect(
          result,
          start.contains('02-30')
              ? isA<Failure<EventDetail>>()
              : isA<Success<EventDetail>>(),
        );
      }
    },
  );
  testWidgets(
    'Event Detail shows missing information, copies only on action, retries without fabricated data',
    (tester) async {
      final repo = FakeEvents()
        ..failure = const Failure(
          AppFailure(
            kind: AppFailureKind.eventUnavailable,
            message: 'This event is unavailable.',
          ),
        );
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentAuthSubjectProvider.overrideWithValue('a'),
            authSessionProvider.overrideWithValue(
              const AsyncData(AuthSessionAuthenticated(subject: 'a')),
            ),
            eventDetailRepositoryProvider.overrideWithValue(repo),
          ],
          child: const MaterialApp(home: EventDetailPage(eventId: 'ev')),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('This event is unavailable.'), findsOneWidget);
      expect(find.text('Synthetic event'), findsNothing);
      repo.failure = null;
      await tester.tap(find.byKey(const Key('event-detail-retry')));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.text('Location not provided by the source.'),
        100,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text('Location not provided by the source.'), findsOneWidget);
      expect(repo.copies, 0);
      await tester.scrollUntilVisible(
        find.byKey(const Key('event-detail-copy-link')),
        100,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.pumpAndSettle();
      await tester.ensureVisible(
        find.byKey(const Key('event-detail-copy-link')),
      );
      await tester.pumpAndSettle();
      expect(
        find.byKey(const Key('event-detail-copy-link')).hitTestable(),
        findsOneWidget,
      );
      await tester.tap(find.byKey(const Key('event-detail-copy-link')));
      await tester.pumpAndSettle();
      expect(repo.copies, 1);
      expect(find.text('Link copied.'), findsOneWidget);
    },
  );
  testWidgets(
    'Friend lookup/send and recipient action reflect persisted fresh inbox; no automatic send',
    (tester) async {
      final repo = FakeFriends();
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentAuthSubjectProvider.overrideWithValue('a'),
            friendRepositoryProvider.overrideWithValue(repo),
          ],
          child: const MaterialApp(home: FriendPage()),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Member A'), findsOneWidget);
      await tester.enterText(
        find.byKey(const Key('friend-username')),
        'member_b',
      );
      await tester.tap(find.byKey(const Key('friend-lookup')));
      await tester.pumpAndSettle();
      expect(repo.sends, 0);
      expect(find.text('Member B'), findsOneWidget);
      await tester.tap(find.byKey(const Key('friend-send')));
      await tester.pumpAndSettle();
      expect(repo.sends, 1);
      expect(find.text('Request sent'), findsOneWidget);
      await tester.ensureVisible(
        find.byKey(const Key('friend-accept-request-1')),
      );
      await tester.tap(find.byKey(const Key('friend-accept-request-1')));
      await tester.pumpAndSettle();
      expect(repo.actions, 1);
      expect(find.text('Friend request accepted.'), findsOneWidget);
      expect(find.text('No current friend requests.'), findsOneWidget);
    },
  );
  test('late Friend/Event responses cannot restore results after account replacement', () async {
    final friends = FakeFriends()..pending = Completer(),
        events = FakeEvents()..pending = Completer();
    final scope = ProviderContainer(
      overrides: [
        currentAuthSubjectProvider.overrideWith(
          (ref) => ref.watch(subjectProvider),
        ),
        friendRepositoryProvider.overrideWithValue(friends),
        eventDetailRepositoryProvider.overrideWithValue(events),
      ],
    );
    addTearDown(scope.dispose);
    final a = scope.listen(friendControllerProvider, (_, _) {}),
        b = scope.listen(eventDetailControllerProvider('ev'), (_, _) {});
    addTearDown(a.close);
    addTearDown(b.close);
    final oldFriend = scope
            .read(friendControllerProvider.notifier)
            .lookup('member_b'),
        oldEvent = scope
            .read(eventDetailControllerProvider('ev').notifier)
            .load();
    scope.read(subjectProvider.notifier).change();
    await scope.pump();
    friends.pending!.complete(
      const Success(
        FriendTarget(
          username: 'member_b',
          displayName: 'Old account result',
          relationship: RelationshipState.canSendRequest,
        ),
      ),
    );
    events.pending!.complete(Success(event));
    await Future.wait([oldFriend, oldEvent]);
    expect(scope.read(friendControllerProvider).target, isNull);
    expect(
      scope.read(eventDetailControllerProvider('ev')),
      isA<AsyncLoading<EventDetail>>(),
    );
  });
  for (final size in [const Size(375, 667), const Size(800, 360)]) {
    for (final dark in [false, true]) {
      testWidgets('small/enlarged/reduced-motion pages fit $size dark=$dark', (
        tester,
      ) async {
        tester.view.devicePixelRatio = 1;
        tester.view.physicalSize = size;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final repo = FakeEvents();
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              currentAuthSubjectProvider.overrideWithValue('a'),
              authSessionProvider.overrideWithValue(
                const AsyncData(AuthSessionAuthenticated(subject: 'a')),
              ),
              eventDetailRepositoryProvider.overrideWithValue(repo),
            ],
            child: MaterialApp(
              theme: ThemeData(
                brightness: dark ? Brightness.dark : Brightness.light,
              ),
              builder: (context, child) => MediaQuery(
                data: MediaQuery.of(context).copyWith(
                  textScaler: const TextScaler.linear(2),
                  disableAnimations: true,
                ),
                child: child!,
              ),
              home: const EventDetailPage(eventId: 'ev'),
            ),
          ),
        );
        await tester.pumpAndSettle();
        await tester.scrollUntilVisible(
          find.byKey(const Key('event-detail-copy-link')),
          200,
          scrollable: find.byType(Scrollable).first,
        );
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox.shrink());
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              currentAuthSubjectProvider.overrideWithValue('a'),
              authSessionProvider.overrideWithValue(
                const AsyncData(AuthSessionAuthenticated(subject: 'a')),
              ),
              friendRepositoryProvider.overrideWithValue(FakeFriends()),
            ],
            child: MaterialApp(
              theme: ThemeData(
                brightness: dark ? Brightness.dark : Brightness.light,
              ),
              builder: (context, child) => MediaQuery(
                data: MediaQuery.of(context).copyWith(
                  textScaler: const TextScaler.linear(2),
                  disableAnimations: true,
                ),
                child: child!,
              ),
              home: const FriendPage(),
            ),
          ),
        );
        await tester.pumpAndSettle();
        await tester.pump();
        await tester.scrollUntilVisible(
          find.byKey(const Key('friend-decline-request-1')),
          150,
          scrollable: find
              .descendant(
                of: find.byKey(const Key('route-friends')),
                matching: find.byType(Scrollable),
              )
              .first,
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
      });
    }
  }
}
