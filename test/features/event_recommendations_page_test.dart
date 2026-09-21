import 'package:enmori/app/home_shell_page.dart';
import 'package:enmori/app/providers.dart';
import 'package:enmori/app/router/app_router.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/event_recommendations/domain/event_recommendation_repository.dart';
import 'package:enmori/features/event_recommendations/event_recommendations_providers.dart';
import 'package:enmori/features/event_recommendations/presentation/event_recommendations_controller.dart';
import 'package:enmori/features/event_recommendations/presentation/event_recommendations_page.dart';
import 'package:enmori/features/interests/interests_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fakes.dart';

void main() {
  test('a departed Event view cannot cancel its successor request', () async {
    final repository = FakeEventRecommendationRepository();
    final container = ProviderContainer(
      overrides: [
        eventRecommendationRepositoryProvider.overrideWithValue(repository),
      ],
    );
    addTearDown(container.dispose);
    final controller = container.read(
      eventRecommendationsControllerProvider.notifier,
    );

    final homeOperation = controller.load(view: EventRecommendationView.home);
    final allOperation = controller.load(view: EventRecommendationView.all);
    controller.abandon(homeOperation);
    await Future<void>.delayed(Duration.zero);

    expect(
      container.read(eventRecommendationsControllerProvider),
      isA<AsyncData<EventRecommendationResponse>>(),
    );
    expect(repository.views, [
      EventRecommendationView.home,
      EventRecommendationView.all,
    ]);
    controller.abandon(allOperation);
  });

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
          formulaVersion: 'event_recommendation_v1',
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

  testWidgets(
    'saving Interests returns Home with a fresh recommendation request',
    (tester) async {
      final interests = FakeInterestRepository();
      final recommendations = FakeEventRecommendationRepository();
      final container = ProviderContainer(
        overrides: [
          routerGateProvider.overrideWithValue(RouterGateState.authenticated),
          interestRepositoryProvider.overrideWithValue(interests),
          eventRecommendationRepositoryProvider.overrideWithValue(
            recommendations,
          ),
        ],
      );
      addTearDown(() {
        container.dispose();
      });

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp.router(
            routerConfig: container.read(appRouterProvider),
          ),
        ),
      );
      await _pumpRouteFrames(tester);

      expect(recommendations.views, [EventRecommendationView.home]);
      await tester.tap(find.byKey(const Key('edit-interests-button')));
      await _pumpRouteFrames(tester);
      await tester.tap(find.byKey(const Key('interest-option-tag-art')));
      await tester.tap(find.byKey(const Key('interest-save')));
      await _pumpRouteFrames(tester);
      await tester.tap(find.byKey(const Key('interest-done')));
      await _pumpRouteFrames(tester);

      expect(recommendations.views, [
        EventRecommendationView.home,
        EventRecommendationView.home,
      ]);
      expect(find.byKey(const Key('route-home')), findsOneWidget);
    },
  );
}

Future<void> _pumpRouteFrames(WidgetTester tester) async {
  for (var index = 0; index < 5; index++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
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
