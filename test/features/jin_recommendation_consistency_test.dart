import 'dart:async';
import 'dart:convert';

import 'package:enmori/app/event_recommendation_card.dart';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/content_access.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/event_recommendations/event_recommendations_providers.dart';
import 'package:enmori/features/event_recommendations/data/backend_event_recommendation_repository.dart';
import 'package:enmori/features/event_recommendations/domain/event_recommendation_repository.dart';
import 'package:enmori/features/event_recommendations/presentation/event_recommendations_controller.dart';
import 'package:enmori/features/event_recommendations/presentation/recommendation_reason.dart';
import 'package:enmori/features/interests/interests_providers.dart';
import 'package:enmori/features/interests/presentation/interest_editor_controller.dart';
import 'package:enmori/features/friends/domain/friend_discovery_repository.dart';
import 'package:enmori/features/friends/discovery_providers.dart';
import 'package:enmori/features/friends/presentation/friend_discovery_panel.dart';

import '../support/fakes.dart';

final _response = EventRecommendationResponse(
  asOf: DateTime.utc(2026, 10, 26),
  formulaVersion: 'event_recommendation_v2',
  items: const [],
);

final class _Repository implements EventRecommendationRepository {
  final pending = Completer<Result<EventRecommendationResponse>>();
  int calls = 0;
  @override
  Future<Result<EventRecommendationResponse>> read({
    required EventRecommendationView view,
  }) {
    calls++;
    return pending.future;
  }
}

final class _Friends implements FriendDiscoveryRepository {
  @override
  Future<Result<int>> pendingCount() async => const Success(0);
  @override
  Future<Result<List<FriendSuggestion>>> suggestions({
    required bool home,
  }) async => Success([
    for (var i = 0; i < 5; i++)
      FriendSuggestion(
        username: 'person_$i',
        displayName: 'Person $i',
        sharedInterests: const [],
        commonEventCount: 0,
        reason: 'Same shared region',
        ignoreVersion: 'revision-$i',
      ),
  ]);
}

void main() {
  testWidgets(
    'recommendation summary directs to location details without asserting absent source location',
    (tester) async {
      tester.view.physicalSize = const Size(320, 900);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      String? opened;
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: SingleChildScrollView(
                child: ConnectedRecommendationCard(
                  event: testEventRecommendations().items.first,
                  onOpen: (id) => opened = id,
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Open details for location'), findsOneWidget);
      expect(find.text('Location not provided.'), findsNothing);
      await tester.tap(find.text('Open details for location'));
      expect(opened, testEventRecommendations().items.first.eventId);
      expect(tester.takeException(), isNull);
    },
  );
  for (final unknown in [false, true]) {
    test(
      'interest save invalidates covered Event results on ${unknown ? 'unknown' : 'success'}',
      () async {
        final auth = FakeAuthRepository(),
            interests = FakeInterestRepository(),
            events = FakeEventRecommendationRepository();
        if (unknown) {
          interests.replaceResult = const Failure(
            AppFailure(
              kind: AppFailureKind.serviceUnavailable,
              message: 'Unknown outcome',
            ),
          );
        }
        final container = ProviderContainer(
          overrides: [
            authRepositoryProvider.overrideWithValue(auth),
            interestRepositoryProvider.overrideWithValue(interests),
            eventRecommendationRepositoryProvider.overrideWithValue(events),
          ],
        );
        addTearDown(container.dispose);
        addTearDown(auth.close);
        container.listen(authSessionProvider, (_, _) {});
        auth.emit(AuthSessionAuthenticated(subject: 'owner'));
        await container.read(authSessionProvider.future);
        container.listen(eventRecommendationsControllerProvider, (_, _) {});
        container
            .read(eventRecommendationsControllerProvider.notifier)
            .load(view: EventRecommendationView.home);
        await container.pump();
        expect(
          container.read(eventRecommendationsControllerProvider).hasValue,
          isTrue,
        );
        final editor = container.read(
          interestEditorControllerProvider.notifier,
        );
        await editor.load();
        editor.toggle('tag-art');
        await editor.save();
        await container.pump();
        expect(
          container.read(eventRecommendationsControllerProvider).asData,
          isNull,
        );
      },
    );
  }
  for (final replacement in [false, true]) {
    test(
      'pending Event recommendation cannot return after ${replacement ? 'same-UID replacement' : 'content mutation'}',
      () async {
        final auth = FakeAuthRepository(), repo = _Repository();
        final container = ProviderContainer(
          overrides: [
            authRepositoryProvider.overrideWithValue(auth),
            eventRecommendationRepositoryProvider.overrideWithValue(repo),
          ],
        );
        addTearDown(container.dispose);
        addTearDown(auth.close);
        container.listen(authSessionProvider, (_, _) {});
        auth.emit(AuthSessionAuthenticated(subject: 'owner'));
        await container.read(authSessionProvider.future);
        container.listen(contentAccessProvider, (_, _) {});
        container.listen(eventRecommendationsControllerProvider, (_, _) {});
        container
            .read(eventRecommendationsControllerProvider.notifier)
            .load(view: EventRecommendationView.all);
        if (replacement) {
          auth.emit(AuthSessionAuthenticated(subject: 'owner'));
          await container.pump();
        } else {
          container.read(contentAccessProvider.notifier).changed();
          await container.pump();
        }
        repo.pending.complete(Success(_response));
        await container.pump();
        expect(
          container.read(eventRecommendationsControllerProvider).asData,
          isNull,
        );
      },
    );
  }
  for (final version in [
    'event_recommendation_v2',
    'event_recommendation_v3',
  ]) {
    test(
      '$version keeps interest-first Backend order even when the later score is higher',
      () async {
        final client = BackendApiClient(
          Uri.parse('https://example.invalid'),
          () async => const Success('synthetic-token'),
          httpClient: MockClient(
            (_) async => http.Response(
              jsonEncode({
                'asOf': '2026-11-15T00:00:00Z',
                'formulaVersion': version,
                'items': [
                  {
                    'eventId': 'gaming',
                    'title': 'Gaming',
                    'startAt': '2026-11-21T00:00:00Z',
                    'matchedInterests': [
                      {'interestTagId': 'gaming', 'displayName': 'Gaming'},
                    ],
                    'reasonCode': 'relevance_match',
                    'reasons': [
                      {'code': 'shared_interests', 'count': 1, 'points': 4},
                    ],
                  },
                  {
                    'eventId': 'music',
                    'title': 'Music',
                    'startAt': '2026-11-20T00:00:00Z',
                    'matchedInterests': [],
                    'reasonCode': 'relevance_match',
                    'reasons': [
                      {
                        'code': 'friends_participating',
                        'count': 5,
                        'points': 10,
                      },
                      if (version == 'event_recommendation_v3') ...[
                        {'code': 'same_area', 'count': 1, 'points': 2},
                        {'code': 'target_age', 'count': 1, 'points': 1},
                      ] else
                        {'code': 'same_region', 'count': 1, 'points': 1},
                    ],
                  },
                ],
              }),
              200,
            ),
          ),
        );
        addTearDown(client.close);
        final result = await BackendEventRecommendationRepository(client)
            .read(view: EventRecommendationView.all);
        expect(result, isA<Success<EventRecommendationResponse>>());
        final items =
            (result as Success<EventRecommendationResponse>).value.items;
        expect(items.map((item) => item.eventId), ['gaming', 'music']);
        expect(items.last.matchedInterests, isEmpty);
      },
    );
  }
  test('v2 HTTP client accepts real non-interest reasons and rejects mismatched evidence', () async {
    for (final points in [4, 99]) {
      final client = BackendApiClient(
        Uri.parse('https://example.invalid'),
        () async => const Success('synthetic-token'),
        httpClient: MockClient(
          (_) async => http.Response(
            jsonEncode({
              'asOf': '2026-10-26T00:00:00Z',
              'formulaVersion': 'event_recommendation_v2',
              'items': [
                {
                  'eventId': 'event-a',
                  'title': 'Candidate',
                  'startAt': '2026-11-01T00:00:00Z',
                  'matchedInterests': [],
                  'reasonCode': 'relevance_match',
                  'reasons': [
                    {
                      'code': 'friends_participating',
                      'count': 2,
                      'points': points,
                    },
                  ],
                },
              ],
            }),
            200,
          ),
        ),
      );
      addTearDown(client.close);
      final result = await BackendEventRecommendationRepository(client)
          .read(view: EventRecommendationView.all);
      expect(result is Success<EventRecommendationResponse>, points == 4);
    }
  });
  testWidgets(
    'reason text displays provided social/region signals without inventing an interest',
    (tester) async {
      final event = EventRecommendation(
        eventId: 'a',
        title: 'Candidate',
        startAt: DateTime.utc(2026, 11),
        matchedInterests: const [],
        reasonCode: 'relevance_match',
        reasons: const [
          EventRecommendationReason(
            code: 'friends_participating',
            count: 2,
            points: 4,
          ),
          EventRecommendationReason(code: 'same_region', count: 1, points: 1),
        ],
      );
      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) => Text(recommendationReason(context, event)),
          ),
        ),
      );
      expect(
        find.text('2 friends interested or going · Matches your region'),
        findsOneWidget,
      );
      expect(find.textContaining('Matches:'), findsNothing);
    },
  );
  testWidgets(
    'Friend next groups move forward without repetition and stop at actual exhaustion',
    (tester) async {
      final auth = FakeAuthRepository();
      addTearDown(auth.close);
      final container = ProviderContainer(
        overrides: [
          authRepositoryProvider.overrideWithValue(auth),
          friendDiscoveryRepositoryProvider.overrideWithValue(_Friends()),
        ],
      );
      addTearDown(container.dispose);
      container.listen(authSessionProvider, (_, _) {});
      auth.emit(AuthSessionAuthenticated(subject: 'owner'));
      await container.read(authSessionProvider.future);
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            theme: ThemeData(splashFactory: NoSplash.splashFactory),
            home: Scaffold(
              body: SingleChildScrollView(
                child: FriendDiscoveryPanel(
                  home: false,
                  onOpenProfile: (_) async {},
                  onOpenRequests: () async {},
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Person 0'), findsOneWidget);
      expect(find.text('Person 2'), findsNothing);
      await tester.ensureVisible(
        find.byKey(const Key('friend-recommendations-next-group')),
      );
      await tester.tap(
        find.byKey(const Key('friend-recommendations-next-group')),
      );
      await tester.pumpAndSettle();
      expect(find.text('Person 0'), findsNothing);
      expect(find.text('Person 2'), findsOneWidget);
      await tester.tap(
        find.byKey(const Key('friend-recommendations-next-group')),
      );
      await tester.pumpAndSettle();
      expect(find.text('Person 4'), findsOneWidget);
      expect(
        find.byKey(const Key('friend-recommendations-next-group')),
        findsNothing,
      );
      expect(
        find.text('You have reached the end of this list.'),
        findsOneWidget,
      );
    },
  );
}
