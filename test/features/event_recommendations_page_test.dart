import 'package:enmori/app/home_shell_page.dart';
import 'package:enmori/app/providers.dart';
import 'package:enmori/app/router/app_router.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
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
  for (final heading in <String?>[null, 'For you']) {
    testWidgets('Home next group delegates without reloading ($heading)', (
      tester,
    ) async {
      final repository = FakeEventRecommendationRepository();
      var continued = 0;
      await _pump(
        tester,
        Scaffold(
          body: SingleChildScrollView(
            child: EventRecommendationsSection(
              onSeeAll: () {},
              heading: heading,
              onContinueDiscovery: () => continued++,
            ),
          ),
        ),
        repository,
      );
      final next = find.byKey(const Key('event-recommendations-continue'));
      await tester.ensureVisible(next);
      await tester.pumpAndSettle();
      await tester.tap(next);
      await tester.pumpAndSettle();
      expect(continued, 1);
      expect(repository.views, [EventRecommendationView.home]);
      expect(find.text('Third-ranked event'), findsOneWidget);
      expect(find.text('First-ranked event'), findsOneWidget);
      expect(find.text('Second-ranked event'), findsNothing);
      expect(
        find.byKey(const Key('event-recommendations-refresh')),
        findsNothing,
      );
    });
  }

  testWidgets('next groups scroll the intact ordered snapshot without reads', (
    tester,
  ) async {
    final repository = FakeEventRecommendationRepository()
      ..allResult = Success(
        _orderedEvents(['c', 'a', 'b', 'g', 'f', 'e', 'd']),
      );
    await _pump(
      tester,
      EventRecommendationsPage(
        initialEventIndex: 2,
        recommendationCardBuilder: _tallCard,
      ),
      repository,
    );
    expect(find.byKey(const Key('card-b')).hitTestable(), findsOneWidget);
    final ordered = ['c', 'a', 'b', 'g', 'f', 'e', 'd'];
    for (var i = 1; i < ordered.length; i++) {
      expect(
        tester.getTopLeft(find.byKey(Key('card-${ordered[i - 1]}'))).dy,
        lessThan(tester.getTopLeft(find.byKey(Key('card-${ordered[i]}'))).dy),
      );
    }
    final next = find.byKey(const Key('event-recommendations-next-group'));
    await tester.tap(next);
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('card-f')).hitTestable(), findsOneWidget);
    await tester.tap(next);
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('card-d')).hitTestable(), findsOneWidget);
    expect(find.text('You have reached the end of this list.'), findsOneWidget);
    expect(next, findsNothing);
    expect(repository.views, [EventRecommendationView.all]);
    await tester.ensureVisible(find.byKey(const Key('card-c')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('card-c')).hitTestable(), findsOneWidget);
  });

  testWidgets(
    'retry restores the same event ID in a changed ordered snapshot',
    (tester) async {
      final repository = FakeEventRecommendationRepository()
        ..allResult = Success(_orderedEvents(['a', 'b', 'c', 'd', 'e']));
      await _pump(
        tester,
        EventRecommendationsPage(
          initialEventIndex: 2,
          recommendationCardBuilder: _tallCard,
        ),
        repository,
      );
      repository.allResult = const Failure(
        AppFailure(kind: AppFailureKind.serviceUnavailable, message: 'fixture'),
      );
      final refresh = find.byKey(const Key('event-recommendations-refresh'));
      await tester.ensureVisible(refresh);
      await tester.pumpAndSettle();
      await tester.tap(refresh);
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('card-c')), findsNothing);
      expect(find.text('You have reached the end of this list.'), findsNothing);
      expect(
        find.byKey(const Key('event-recommendations-next-group')),
        findsNothing,
      );
      repository.allResult = Success(
        _orderedEvents(['x', 'a', 'b', 'c', 'd', 'e']),
      );
      final retry = find.byKey(const Key('event-recommendations-retry'));
      await tester.ensureVisible(retry);
      await tester.pumpAndSettle();
      await tester.tap(retry);
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('card-c')).hitTestable(), findsOneWidget);
      await tester.tap(
        find.byKey(const Key('event-recommendations-next-group')),
      );
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('card-e')).hitTestable(), findsOneWidget);
      expect(
        find.text('You have reached the end of this list.'),
        findsOneWidget,
      );
      expect(repository.views.length, 3);
    },
  );

  testWidgets('continuing past only two results reports the actual end', (
    tester,
  ) async {
    final repository = FakeEventRecommendationRepository()
      ..allResult = Success(_orderedEvents(['b', 'a']));
    await _pump(
      tester,
      const EventRecommendationsPage(initialEventIndex: 2),
      repository,
    );
    expect(find.text('Event b'), findsOneWidget);
    expect(find.text('Event a'), findsOneWidget);
    expect(find.text('You have reached the end of this list.'), findsOneWidget);
    expect(repository.views, [EventRecommendationView.all]);
  });

  testWidgets('foreground return reloads recommendations once', (tester) async {
    final repository = FakeEventRecommendationRepository();
    await _pump(tester, const EventRecommendationsPage(), repository);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pumpAndSettle();
    expect(find.text('Refresh event recommendations'), findsNothing);
    expect(find.text('Event recommendations unavailable'), findsNothing);
    expect(find.text('Third-ranked event'), findsOneWidget);
    expect(repository.views, [
      EventRecommendationView.all,
      EventRecommendationView.all,
    ]);
  });

  testWidgets('expired results clear and empty results can be refreshed', (
    tester,
  ) async {
    final repository = FakeEventRecommendationRepository();
    await _pump(tester, const EventRecommendationsPage(), repository);
    await tester.pump(const Duration(minutes: 5));
    await tester.pumpAndSettle();
    expect(find.text('Refresh event recommendations'), findsOneWidget);
    expect(find.text('Third-ranked event'), findsNothing);
    repository.allResult = Success(
      EventRecommendationResponse(
        asOf: DateTime.utc(2026, 10, 20),
        formulaVersion: 'event_recommendation_v1',
        items: const [],
      ),
    );
    await tester.tap(find.byKey(const Key('event-recommendations-refresh')));
    await tester.pumpAndSettle();
    expect(find.text(eventEmptyTitle), findsOneWidget);
    repository.allResult = Success(testEventRecommendations());
    await tester.tap(find.byKey(const Key('event-recommendations-refresh')));
    await tester.pumpAndSettle();
    expect(find.text('Third-ranked event'), findsOneWidget);
    expect(repository.views.length, 3);
  });

  testWidgets('connected social Home shows real repository Top 2 inline', (
    tester,
  ) async {
    final repository = FakeEventRecommendationRepository();
    await _pump(
      tester,
      HomeShellPage(
        socialStyle: true,
        onStartCheckIn: () {},
        onSeeAllEvents: () {},
        onOpenEvent: (_) {},
      ),
      repository,
    );
    await tester.scrollUntilVisible(
      find.text('Third-ranked event'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('First-ranked event'), findsOneWidget);
    expect(find.text('Second-ranked event'), findsNothing);
    expect(repository.views, [EventRecommendationView.home]);
  });

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
    final retry = find.byKey(const Key('event-recommendations-retry'));
    await tester.ensureVisible(retry);
    await tester.pumpAndSettle();
    expect(retry.hitTestable(), findsOneWidget);
    await tester.tap(retry);
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
          // This authenticated route fixture must also supply its observed session;
          // the default unavailable auth adapter otherwise retries asynchronously.
          authSessionProvider.overrideWithValue(
            const AsyncData(AuthSessionAuthenticated(subject: 'member-a')),
          ),
          currentAuthSubjectProvider.overrideWithValue('member-a'),
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

EventRecommendationResponse _orderedEvents(List<String> ids) {
  return EventRecommendationResponse(
    asOf: DateTime.utc(2026, 10, 25),
    formulaVersion: 'event_recommendation_v1',
    items: [
      for (final id in ids)
        EventRecommendation(
          eventId: id,
          title: 'Event $id',
          startAt: DateTime.utc(2026, 11, 1),
          matchedInterests: const [],
          reasonCode: 'interest_match',
        ),
    ],
  );
}

Widget _tallCard(
  BuildContext context,
  EventRecommendation event,
  ValueChanged<String>? onOpen,
) => SizedBox(
  key: Key('card-${event.eventId}'),
  height: 200,
  child: Center(child: Text(event.title)),
);

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
