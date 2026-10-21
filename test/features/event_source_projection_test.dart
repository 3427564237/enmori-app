import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/event_browse/domain/activity_repository.dart';
import 'package:enmori/features/event_detail/domain/event_detail_repository.dart';
import 'package:enmori/features/event_detail/event_detail_providers.dart';
import 'package:enmori/features/event_detail/presentation/event_detail_controller.dart';
import 'package:enmori/features/event_detail/presentation/event_detail_page.dart';
import 'package:enmori/features/event_recommendations/domain/event_recommendation_repository.dart';
import 'package:enmori/features/event_recommendations/presentation/event_recommendations_page.dart';
import 'package:enmori/features/event_recommendations/event_recommendations_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fakes.dart';

final class _Details implements EventDetailRepository {
  final event = EventDetail(
    eventId: 'tm_event_a',
    title: 'Live source example',
    startAt: DateTime.utc(2026, 11),
    externalSourceUrl: 'https://ticketmaster.sg/event/a',
  );
  int copies = 0;
  @override
  Future<Result<EventDetail>> read(String eventId) async => Success(event);
  @override
  Future<Result<void>> copyLink(EventDetail event) async {
    copies++;
    return const Success(null);
  }
}

final class _Actions implements ActivitySourceActions {
  final opened = <Uri>[];
  @override
  Future<Result<void>> open(Uri sourceUrl, bool Function() current) async {
    if (current()) opened.add(sourceUrl);
    return const Success(null);
  }

  @override
  Future<Result<void>> copy(Uri sourceUrl, bool Function() current) async =>
      const Success(null);
}

void main() {
  testWidgets(
    'recommendation detail opens only on action and expires with no stale copy',
    (tester) async {
      final repository = _Details(), actions = _Actions();
      late ProviderContainer container;
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentAuthSubjectProvider.overrideWithValue('controlled-owner'),
            eventDetailRepositoryProvider.overrideWithValue(repository),
            eventDetailSourceActionsProvider.overrideWithValue(actions),
          ],
          child: Consumer(
            builder: (context, ref, _) {
              container = ProviderScope.containerOf(context);
              return const MaterialApp(
                home: EventDetailPage(eventId: 'tm_event_a'),
              );
            },
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(actions.opened, isEmpty);
      expect(find.text('End time not provided.'), findsOneWidget);
      await tester.tap(find.byKey(const Key('event-detail-open-source')));
      await tester.pump();
      expect(
        actions.opened.single.toString(),
        repository.event.externalSourceUrl,
      );
      expect(repository.copies, 0);
      await tester.pump(const Duration(minutes: 5));
      expect(find.byKey(const Key('event-detail-title')), findsNothing);
      expect(find.byKey(const Key('event-detail-retry')), findsOneWidget);
      final denied = await container
          .read(eventDetailControllerProvider('tm_event_a').notifier)
          .copyLink(repository.event);
      expect(denied, isA<Failure<void>>());
      expect(repository.copies, 0);
    },
  );
  testWidgets(
    'recommendation omits unknown end and expired projection requires explicit refresh',
    (tester) async {
      final repository = FakeEventRecommendationRepository();
      repository.allResult = Success(
        EventRecommendationResponse(
          asOf: DateTime.utc(2026, 10, 19),
          formulaVersion: 'event_recommendation_v1',
          items: [
            EventRecommendation(
              eventId: 'tm_event_a',
              title: 'Live source example',
              startAt: DateTime.utc(2026, 11),
              matchedInterests: const [
                MatchedInterest(
                  interestTagId: 'interest_music',
                  displayName: 'Music',
                ),
              ],
              reasonCode: 'interest_match',
            ),
          ],
        ),
      );
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            eventRecommendationRepositoryProvider.overrideWithValue(repository),
          ],
          child: const MaterialApp(home: EventRecommendationsPage()),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.textContaining('End time not provided.'), findsNothing);
      expect(find.text('Live source example'), findsOneWidget);
      await tester.pump(const Duration(minutes: 5));
      expect(find.text('Live source example'), findsNothing);
      expect(
        find.byKey(const Key('event-recommendations-refresh')),
        findsOneWidget,
      );
      expect(repository.views, [EventRecommendationView.all]);
      await tester.tap(find.byKey(const Key('event-recommendations-refresh')));
      await tester.pumpAndSettle();
      expect(find.text('Live source example'), findsOneWidget);
      expect(repository.views, [
        EventRecommendationView.all,
        EventRecommendationView.all,
      ]);
    },
  );
}
