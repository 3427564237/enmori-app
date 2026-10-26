import 'dart:async';

import 'package:enmori/app/app.dart';
import 'package:enmori/app/providers.dart';
import 'package:enmori/app/router/app_router.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/event_recommendations/domain/event_recommendation_repository.dart';
import 'package:enmori/features/event_recommendations/event_recommendations_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fakes.dart';

void main() {
  testWidgets('See All has a back action and returning recomputes Home', (
    tester,
  ) async {
    final repository = FakeEventRecommendationRepository()
      ..allResult = Success(_empty());
    await _pumpRouter(tester, repository);
    await _openSeeAll(tester, emptyHome: false);

    expect(find.byType(BackButton), findsOneWidget);
    expect(
      find.byKey(const Key('event-recommendations-empty')),
      findsOneWidget,
    );
    await tester.tap(find.byType(BackButton));
    await _pumpFrames(tester);

    expect(find.byKey(const Key('route-home')), findsOneWidget);
    expect(find.text('Third-ranked event'), findsOneWidget);
    expect(find.text('Second-ranked event'), findsNothing);
    expect(repository.views, [
      EventRecommendationView.home,
      EventRecommendationView.all,
      EventRecommendationView.home,
    ]);
  });

  testWidgets('system back does not reuse See All results for an empty Home', (
    tester,
  ) async {
    final repository = FakeEventRecommendationRepository()
      ..homeResult = Success(_empty());
    await _pumpRouter(tester, repository);
    await _openSeeAll(tester, emptyHome: true);
    expect(find.text('Second-ranked event'), findsOneWidget);

    await tester.binding.handlePopRoute();
    await _pumpFrames(tester);

    expect(find.byKey(const Key('route-home')), findsOneWidget);
    expect(
      find.byKey(const Key('event-recommendations-empty')),
      findsOneWidget,
    );
    expect(find.text('Third-ranked event'), findsNothing);
    expect(repository.views, [
      EventRecommendationView.home,
      EventRecommendationView.all,
      EventRecommendationView.home,
    ]);
  });

  testWidgets('a late See All result cannot replace Home after system back', (
    tester,
  ) async {
    final repository = _DelayedSeeAllRepository();
    await _pumpRouter(tester, repository);
    await _openSeeAll(tester, emptyHome: true);
    expect(
      find.byKey(const Key('event-recommendations-loading')),
      findsOneWidget,
    );

    await tester.binding.handlePopRoute();
    await _pumpFrames(tester);
    repository.pending.complete(Success(testEventRecommendations()));
    await _pumpFrames(tester);

    expect(find.byKey(const Key('route-home')), findsOneWidget);
    expect(
      find.byKey(const Key('event-recommendations-empty')),
      findsOneWidget,
    );
    expect(find.text('Third-ranked event'), findsNothing);
    expect(repository.views, [
      EventRecommendationView.home,
      EventRecommendationView.all,
      EventRecommendationView.home,
    ]);
  });

  testWidgets('session expiry during See All keeps the sign-in route', (
    tester,
  ) async {
    final repository = _DelayedSeeAllRepository();
    var gate = RouterGateState.authenticated;
    final container = ProviderContainer(
      overrides: [
        routerGateProvider.overrideWith((ref) => gate),
        authSessionProvider.overrideWith(
          (ref) => Stream.value(
            ref.watch(routerGateProvider) == RouterGateState.authenticated
                ? const AuthSessionAuthenticated(subject: 'member-a')
                : const AuthSessionUnauthenticated(),
          ),
        ),
        currentAuthSubjectProvider.overrideWithValue('member-a'),
        eventRecommendationRepositoryProvider.overrideWithValue(repository),
      ],
    );
    addTearDown(container.dispose);
    await tester.pumpWidget(
      UncontrolledProviderScope(container: container, child: const EnmoriApp()),
    );
    await _pumpFrames(tester);
    await _openSeeAll(tester, emptyHome: true);

    gate = RouterGateState.signInRequired;
    container.invalidate(routerGateProvider);
    await _pumpFrames(tester);
    expect(find.byKey(const Key('route-sign-in')), findsOneWidget);

    repository.pending.complete(Success(testEventRecommendations()));
    await _pumpFrames(tester);

    expect(find.byKey(const Key('route-sign-in')), findsOneWidget);
    expect(find.byKey(const Key('route-home')), findsNothing);
    expect(repository.views, [
      EventRecommendationView.home,
      EventRecommendationView.all,
    ]);
    expect(tester.takeException(), isNull);
  });
}

EventRecommendationResponse _empty() => EventRecommendationResponse(
  asOf: DateTime.utc(2026, 9, 25),
  formulaVersion: 'event_recommendation_v1',
  items: const [],
);

Future<void> _pumpRouter(
  WidgetTester tester,
  EventRecommendationRepository repository,
) async {
  final container = ProviderContainer(
    overrides: [
      routerGateProvider.overrideWithValue(RouterGateState.authenticated),
      authSessionProvider.overrideWithValue(
        const AsyncData(AuthSessionAuthenticated(subject: 'member-a')),
      ),
      currentAuthSubjectProvider.overrideWithValue('member-a'),
      eventRecommendationRepositoryProvider.overrideWithValue(repository),
    ],
  );
  addTearDown(container.dispose);
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp.router(
        routerConfig: container.read(appRouterProvider),
      ),
    ),
  );
  await _pumpFrames(tester);
}

Future<void> _openSeeAll(WidgetTester tester, {required bool emptyHome}) async {
  final action = find.byKey(
    Key(
      emptyHome
          ? 'event-recommendations-see-all-empty'
          : 'event-recommendations-see-all',
    ),
  );
  await tester.ensureVisible(action);
  await tester.pump();
  await tester.tap(action);
  await _pumpFrames(tester);
  expect(find.byKey(const Key('route-event-recommendations')), findsOneWidget);
}

Future<void> _pumpFrames(WidgetTester tester) async {
  for (var index = 0; index < 5; index++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}

final class _DelayedSeeAllRepository implements EventRecommendationRepository {
  final pending = Completer<Result<EventRecommendationResponse>>();
  final views = <EventRecommendationView>[];

  @override
  Future<Result<EventRecommendationResponse>> read({
    required EventRecommendationView view,
  }) async {
    views.add(view);
    return view == EventRecommendationView.home
        ? Success(_empty())
        : pending.future;
  }
}
