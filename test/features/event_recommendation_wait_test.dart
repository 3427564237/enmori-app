import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/event_recommendations/domain/event_recommendation_repository.dart';
import 'package:enmori/features/event_recommendations/event_recommendations_providers.dart';
import 'package:enmori/features/event_recommendations/presentation/event_recommendations_controller.dart';
import 'package:enmori/features/event_recommendations/presentation/event_recommendations_page.dart';
import 'package:enmori/features/recommendation_profile/domain/recommendation_profile.dart';
import 'package:enmori/features/recommendation_profile/recommendation_profile_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fakes.dart';

final _stop = find.byKey(const Key('event-recommendations-stop-waiting'));
final _reload = find.byKey(const Key('event-recommendations-reload'));
final _stopped = find.byKey(const Key('event-recommendations-stopped'));
final _loading = find.byKey(const Key('event-recommendations-loading'));

class _PendingRepository implements EventRecommendationRepository {
  final calls = <Completer<Result<EventRecommendationResponse>>>[];
  final views = <EventRecommendationView>[];
  @override
  Future<Result<EventRecommendationResponse>> read({
    required EventRecommendationView view,
  }) {
    views.add(view);
    final call = Completer<Result<EventRecommendationResponse>>();
    calls.add(call);
    return call.future;
  }
}

ProviderContainer _container(_PendingRepository repo) => ProviderContainer(
  overrides: [
    authSessionProvider.overrideWithValue(
      const AsyncData(AuthSessionAuthenticated(subject: 'waiting-owner')),
    ),
    currentAuthSubjectProvider.overrideWithValue('waiting-owner'),
    eventRecommendationRepositoryProvider.overrideWithValue(repo),
  ],
);

Future<void> _mount(
  WidgetTester tester,
  ProviderContainer container, {
  bool home = false,
  Locale locale = const Locale('en'),
  double scale = 1,
  VoidCallback? onBrowse,
}) async {
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp(
        locale: locale,
        supportedLocales: const [Locale('en'), Locale('zh')],
        localizationsDelegates: GlobalMaterialLocalizations.delegates,
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context)
              .copyWith(textScaler: TextScaler.linear(scale)),
          child: child!,
        ),
        home: home
            ? Scaffold(
                body: SingleChildScrollView(
                  child: EventRecommendationsSection(
                    heading: 'For you',
                    onSeeAll: () {},
                    onBrowseAll: onBrowse,
                  ),
                ),
              )
            : EventRecommendationsPage(onBrowseAll: onBrowse),
      ),
    ),
  );
  await tester.pump();
}

void main() {
  for (final home in [false, true]) {
    for (final lateFailure in [false, true]) {
      testWidgets(
        '157-second ${home ? 'Home' : 'All'} wait can stop and ignore late ${lateFailure ? 'failure' : 'success'}',
        (tester) async {
          final repo = _PendingRepository();
          final container = _container(repo);
          addTearDown(container.dispose);
          await _mount(tester, container, home: home);
          expect(_loading, findsOneWidget);
          expect(find.text('Still waiting for event sources…'), findsNothing);
          await tester.pump(const Duration(seconds: 10));
          expect(find.text('Still waiting for event sources…'), findsOneWidget);
          await tester.pump(const Duration(seconds: 147));
          expect(repo.calls, hasLength(1));
          expect(_stop, findsOneWidget);
          await tester.ensureVisible(_stop);
          await tester.tap(_stop);
          await tester.pumpAndSettle();
          expect(repo.calls.single.isCompleted, isFalse);
          expect(_loading, findsNothing);
          expect(_stopped, findsOneWidget);
          expect(find.byType(LinearProgressIndicator), findsNothing);
          expect(
            find.byKey(const Key('event-recommendations-empty')),
            findsNothing,
          );
          expect(
            find.byKey(const Key('event-recommendations-error')),
            findsNothing,
          );
          repo.calls.single.complete(
            lateFailure
                ? const Failure(
                    AppFailure(
                      kind: AppFailureKind.serviceUnavailable,
                      message: 'late private failure',
                    ),
                  )
                : Success(testEventRecommendations()),
          );
          await tester.pumpAndSettle();
          expect(_stopped, findsOneWidget);
          expect(find.text('Third-ranked event'), findsNothing);
          expect(find.textContaining('late private failure'), findsNothing);
          expect(tester.takeException(), isNull);
          await tester.pumpWidget(const SizedBox.shrink());
        },
      );
    }
  }

  testWidgets(
    'reload accepts only the new result and retires old Stop callbacks',
    (tester) async {
      final repo = _PendingRepository();
      final container = _container(repo);
      addTearDown(container.dispose);
      await _mount(tester, container);
      final oldStop = tester.widget<TextButton>(_stop).onPressed!;
      await tester.tap(_stop);
      await tester.pumpAndSettle();
      await tester.tap(_reload);
      await tester.pump();
      expect(repo.calls, hasLength(2));
      oldStop();
      await tester.pump();
      expect(_loading, findsOneWidget);
      repo.calls.first.complete(Success(testEventRecommendations()));
      await tester.pump();
      expect(find.text('Third-ranked event'), findsNothing);
      repo.calls.last.complete(Success(testEventRecommendations()));
      await tester.pumpAndSettle();
      expect(find.text('Third-ranked event'), findsOneWidget);
      expect(_stopped, findsNothing);
      expect(repo.views, [
        EventRecommendationView.all,
        EventRecommendationView.all,
      ]);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );

  testWidgets(
    'area change resets feedback and Stop retires the visible new request',
    (tester) async {
      final repo = _PendingRepository();
      final container = _container(repo);
      addTearDown(container.dispose);
      await _mount(tester, container);
      await tester.pump(const Duration(seconds: 11));
      expect(find.text('Still waiting for event sources…'), findsOneWidget);
      final oldStop = tester.widget<TextButton>(_stop).onPressed!;
      container
          .read(activityAreaProvider.notifier)
          .manual(
            const PlanningArea(
              code: 'bedok',
              name: 'Bedok',
              regionCode: 'east',
              regionName: 'East',
            ),
          );
      await tester.pump();
      await tester.pump();
      expect(repo.calls, hasLength(2));
      expect(find.text('Still waiting for event sources…'), findsNothing);
      oldStop();
      await tester.pump();
      expect(_loading, findsOneWidget);
      await tester.tap(_stop);
      await tester.pumpAndSettle();
      expect(_stopped, findsOneWidget);
      for (final call in repo.calls) {
        call.complete(Success(testEventRecommendations()));
      }
      await tester.pumpAndSettle();
      expect(_stopped, findsOneWidget);
      expect(find.text('Third-ranked event'), findsNothing);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );

  testWidgets('departed Home Stop cannot stop a newer All request', (
    tester,
  ) async {
    final repo = _PendingRepository();
    final container = _container(repo);
    addTearDown(container.dispose);
    final navigator = GlobalKey<NavigatorState>();
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          navigatorKey: navigator,
          home: Scaffold(
            body: SingleChildScrollView(
              child: EventRecommendationsSection(
                heading: 'For you',
                onSeeAll: () {},
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pump();
    final homeStop = tester.widget<TextButton>(_stop).onPressed!;
    navigator.currentState!.push(
      MaterialPageRoute<void>(builder: (_) => const EventRecommendationsPage()),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(repo.views, [
      EventRecommendationView.home,
      EventRecommendationView.all,
    ]);
    await tester.pump(const Duration(milliseconds: 400));
    homeStop();
    await tester.pump();
    expect(_loading, findsOneWidget);
    expect(_stopped, findsNothing);
    repo.calls.first.complete(Success(testEventRecommendations()));
    await tester.pump();
    expect(find.text('Third-ranked event'), findsNothing);
    repo.calls.last.complete(Success(testEventRecommendations()));
    await tester.pumpAndSettle();
    expect(find.text('Third-ranked event'), findsOneWidget);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  test('queued area refresh cannot replace a newer route request', () async {
    final repo = _PendingRepository();
    final container = _container(repo);
    addTearDown(container.dispose);
    final subscription = container.listen(
      eventRecommendationsControllerProvider,
      (_, _) {},
    );
    addTearDown(subscription.close);
    final controller = container.read(
      eventRecommendationsControllerProvider.notifier,
    );
    controller.load(view: EventRecommendationView.home);
    container
        .read(activityAreaProvider.notifier)
        .manual(
          const PlanningArea(
            code: 'bedok',
            name: 'Bedok',
            regionCode: 'east',
            regionName: 'East',
          ),
        );
    final allOperation = controller.load(view: EventRecommendationView.all);
    await Future<void>.delayed(Duration.zero);
    expect(repo.views, [
      EventRecommendationView.home,
      EventRecommendationView.all,
    ]);
    controller.stopWaiting(allOperation, view: EventRecommendationView.all);
    expect(
      container.read(eventRecommendationsControllerProvider).error,
      isA<EventRecommendationsStopped>(),
    );
  });

  for (final locale in [const Locale('en'), const Locale('zh')]) {
    for (final home in [false, true]) {
      testWidgets(
        'narrow ${locale.languageCode} ${home ? 'Home' : 'All'} wait exposes accessible actions at2x',
        (tester) async {
          tester.view.physicalSize = const Size(320, 640);
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          final semantics = tester.ensureSemantics();
          final repo = _PendingRepository();
          final container = _container(repo);
          addTearDown(container.dispose);
          var browsed = 0;
          await _mount(
            tester,
            container,
            home: home,
            locale: locale,
            scale: 2,
            onBrowse: () => browsed++,
          );
          await tester.pump(const Duration(seconds: 12));
          await tester.ensureVisible(_stop);
          await tester.pump();
          expect(_stop.hitTestable(), findsOneWidget);
          expect(
            tester
                .getSemantics(_stop)
                .getSemanticsData()
                .hasAction(SemanticsAction.tap),
            isTrue,
          );
          expect(
            tester.getSemantics(_stop).label,
            contains(locale.languageCode == 'zh' ? '停止等待' : 'Stop waiting'),
          );
          if (!home) {
            final browse = find.byKey(
              const Key('event-recommendations-browse-waiting'),
            );
            await tester.ensureVisible(browse);
            await tester.tap(browse);
            expect(browsed, 1);
          }
          await tester.ensureVisible(_stop);
          await tester.tap(_stop);
          await tester.pumpAndSettle();
          await tester.ensureVisible(_reload);
          expect(_reload.hitTestable(), findsOneWidget);
          expect(tester.takeException(), isNull);
          await tester.pumpWidget(const SizedBox.shrink());
          semantics.dispose();
        },
      );
    }
  }
}
