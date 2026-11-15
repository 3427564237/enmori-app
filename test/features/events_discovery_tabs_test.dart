import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/event_browse/event_browse_providers.dart';
import 'package:enmori/features/event_participation/presentation/participation_events_page.dart';
import 'package:enmori/features/event_recommendations/domain/event_recommendation_repository.dart';
import 'package:enmori/features/event_recommendations/event_recommendations_providers.dart';
import 'package:enmori/features/event_recommendations/presentation/event_recommendations_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fakes.dart';
import 'event_batches_test.dart' as browse;

void main() {
  testWidgets(
    'Events starts with For you; Browse loads on entry and preserves search',
    (tester) async {
      tester.view.physicalSize = const Size(320, 850);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final catalogue = browse.Repo();
      final recommendations = FakeEventRecommendationRepository()
        ..allResult = Success(
          EventRecommendationResponse(
            asOf: DateTime.utc(2026, 11, 15),
            formulaVersion: 'event_recommendation_v3',
            items: const [],
          ),
        );
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authSessionProvider.overrideWithValue(
              const AsyncData(AuthSessionAuthenticated(subject: 'fixture')),
            ),
            activityRepositoryProvider.overrideWithValue(catalogue),
            eventRecommendationRepositoryProvider.overrideWithValue(
              recommendations,
            ),
          ],
          child: MaterialApp(
            home: ParticipationEventsPage(
              onSelect: (_) {},
              recommendationsBuilder: (context, openBrowse) =>
                  EventRecommendationsPage(
                    embedded: true,
                    onBrowseAll: openBrowse,
                  ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(recommendations.views, [EventRecommendationView.all]);
      expect(find.text(eventEmptyTitle), findsOneWidget);
      expect(find.byKey(const Key('events-search')), findsNothing);
      expect(catalogue.first, 0);
      await tester.tap(find.widgetWithText(Tab, 'Browse'));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('events-search')), findsOneWidget);
      await tester.enterText(find.byKey(const Key('events-search')), 'gaming');
      await tester.tap(find.widgetWithText(Tab, 'For you'));
      await tester.pumpAndSettle();
      expect(recommendations.views, [
        EventRecommendationView.all,
        EventRecommendationView.all,
      ]);
      expect(find.text(eventEmptyTitle), findsOneWidget);
      expect(find.byKey(const Key('events-search')), findsNothing);
      await tester.tap(
        find.byKey(const Key('event-recommendations-browse-empty')),
      );
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('events-search')))
            .controller!
            .text,
        'gaming',
      );
      expect(catalogue.first, 1);
      expect(tester.takeException(), isNull);
    },
  );
}
