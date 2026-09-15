import 'package:enmori/app/home_shell_page.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/event_recommendations/domain/event_recommendation_repository.dart';
import 'package:enmori/features/event_recommendations/event_recommendations_providers.dart';
import 'package:enmori/features/event_recommendations/presentation/event_recommendations_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fakes.dart';

void main() {
  testWidgets('Home keeps Backend order and presents only its Top 2', (
    tester,
  ) async {
    final repository = FakeEventRecommendationRepository();
    await _pump(
      tester,
      HomeShellPage(onStartCheckIn: () {}, onSeeAllEvents: () {}),
      repository,
    );

    expect(find.text('Third-ranked event'), findsOneWidget);
    expect(find.text('First-ranked event'), findsOneWidget);
    expect(find.text('Second-ranked event'), findsNothing);
    expect(repository.views, [EventRecommendationView.home]);
  });

  testWidgets('See All makes its own complete request and preserves order', (
    tester,
  ) async {
    final repository = FakeEventRecommendationRepository();
    await _pump(tester, const EventRecommendationsPage(), repository);

    expect(find.text('Third-ranked event'), findsOneWidget);
    expect(find.text('First-ranked event'), findsOneWidget);
    expect(find.text('Second-ranked event'), findsOneWidget);
    expect(repository.views, [EventRecommendationView.all]);
  });

  testWidgets('successful empty recommendation uses exact Q16 copy', (
    tester,
  ) async {
    final repository = FakeEventRecommendationRepository()
      ..homeResult = Success(
        EventRecommendationResponse(
          asOf: DateTime.utc(2026, 9, 15),
          formulaVersion: 'q03-v1',
          items: const [],
        ),
      );
    await _pump(
      tester,
      HomeShellPage(onStartCheckIn: () {}, onSeeAllEvents: () {}),
      repository,
    );

    expect(
      find.byKey(const Key('event-recommendations-empty')),
      findsOneWidget,
    );
    expect(find.text(eventEmptyTitle), findsOneWidget);
    expect(find.text(eventEmptyBody), findsOneWidget);
  });

  testWidgets('request failure exposes a stable retry action', (tester) async {
    final repository = FakeEventRecommendationRepository()
      ..homeResult = const Failure(
        AppFailure(
          kind: AppFailureKind.serviceUnavailable,
          message: 'private backend detail',
        ),
      );
    await _pump(
      tester,
      HomeShellPage(onStartCheckIn: () {}, onSeeAllEvents: () {}),
      repository,
    );

    expect(
      find.byKey(const Key('event-recommendations-error')),
      findsOneWidget,
    );
    expect(
      find.text('This service is temporarily unavailable. Try again.'),
      findsOneWidget,
    );
    expect(find.text('private backend detail'), findsNothing);
    await tester.tap(find.byKey(const Key('event-recommendations-retry')));
    await tester.pumpAndSettle();
    expect(repository.views, [
      EventRecommendationView.home,
      EventRecommendationView.home,
    ]);
  });
}

Future<void> _pump(
  WidgetTester tester,
  Widget page,
  FakeEventRecommendationRepository repository,
) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        eventRecommendationRepositoryProvider.overrideWithValue(repository),
      ],
      child: MaterialApp(home: page),
    ),
  );
  await tester.pumpAndSettle();
}
