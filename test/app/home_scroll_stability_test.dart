import 'dart:async';

import 'package:enmori/app/home_shell_page.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/event_recommendations/domain/event_recommendation_repository.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/event_recommendations/event_recommendations_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fakes.dart';

void main() {
  for (final scale in [1.0, 2.0]) {
    testWidgets('slow detail return preserves Home scroll at ${scale}x text', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(320, 640);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final repository = _DelayedHomeRepository();
      final container = ProviderContainer(
        overrides: [
          authSessionProvider.overrideWithValue(
            const AsyncData(AuthSessionAuthenticated(subject: 'scroll-owner')),
          ),
          currentAuthSubjectProvider.overrideWithValue('scroll-owner'),
          eventRecommendationRepositoryProvider.overrideWithValue(repository),
        ],
      );
      addTearDown(container.dispose);
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            builder: (context, child) => MediaQuery(
              data: MediaQuery.of(context)
                  .copyWith(textScaler: TextScaler.linear(scale)),
              child: child!,
            ),
            home: Builder(
              builder: (context) => HomeShellPage(
                socialStyle: true,
                onStartCheckIn: () {},
                onSeeAllEvents: () {},
                onBrowseActivities: () {},
                onContinueDiscovery: () {},
                onOpenEvent: (_) => Navigator.of(context).push<void>(
                  MaterialPageRoute(
                    builder: (_) => Scaffold(
                      appBar: AppBar(title: const Text('Event detail')),
                    ),
                  ),
                ),
                recommendationCardBuilder: (context, event, onOpen) => SizedBox(
                  height: 360,
                  child: TextButton(
                    onPressed: () => onOpen!(event.eventId),
                    child: Text(event.title),
                  ),
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      final second = find.text('First-ranked event');
      await tester.scrollUntilVisible(second, 200);
      await tester.ensureVisible(second);
      await tester.pumpAndSettle();
      final position = tester
          .state<ScrollableState>(find.byType(Scrollable).first)
          .position;
      final offset = position.pixels;
      final extent = position.maxScrollExtent;
      expect(offset, greaterThan(100));
      await tester.tap(second);
      await tester.pumpAndSettle();
      repository.pending = Completer<Result<EventRecommendationResponse>>();
      await tester.pageBack();
      await tester.pump(const Duration(milliseconds: 400));
      await tester.pump(const Duration(milliseconds: 50));
      expect(repository.reads, 2);
      expect(find.text('First-ranked event'), findsNothing);
      expect(
        find.byKey(const Key('event-recommendations-loading')),
        findsOneWidget,
      );
      expect(position.pixels, closeTo(offset, 1));
      expect(position.maxScrollExtent, closeTo(extent, 1));
      repository.pending!.complete(Success(testEventRecommendations()));
      await tester.pumpAndSettle();
      expect(position.pixels, closeTo(offset, 1));
      expect(repository.reads, 2);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    });
  }
  testWidgets(
    'returning from Home bottom keeps loaded events and scroll extent',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(390, 844));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      final repository = FakeEventRecommendationRepository();
      final container = ProviderContainer(
        overrides: [
          currentAuthSubjectProvider.overrideWithValue('scroll-owner'),
          eventRecommendationRepositoryProvider.overrideWithValue(repository),
        ],
      );
      try {
        await tester.pumpWidget(
          UncontrolledProviderScope(
            container: container,
            child: MaterialApp(
              home: HomeShellPage(
                socialStyle: true,
                onStartCheckIn: () {},
                onSeeAllEvents: () {},
                onOpenEvent: (_) {},
                onSelectTab: (_) {},
                onOpenProfile: () {},
                weatherSection: const SizedBox(
                  height: 300,
                  child: Text('Weather position marker'),
                ),
                socialSection: const SizedBox(
                  height: 1600,
                  child: Align(
                    alignment: Alignment.bottomCenter,
                    child: Text('Home bottom marker'),
                  ),
                ),
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        final scrollable = find.descendant(
          of: find.byKey(const Key('route-home')),
          matching: find.byType(Scrollable),
        );
        await tester.scrollUntilVisible(
          find.text('Third-ranked event'),
          200,
          scrollable: scrollable,
        );
        await tester.pumpAndSettle();
        expect(repository.views, hasLength(1));
        final position = tester.state<ScrollableState>(scrollable).position;
        final eventOffset = position.pixels;

        await tester.scrollUntilVisible(
          find.text('Home bottom marker'),
          500,
          scrollable: scrollable,
        );
        await tester.pumpAndSettle();
        final loadedExtent = position.maxScrollExtent;
        position.jumpTo(eventOffset);
        await tester.pump();
        await tester.pumpAndSettle();

        expect(
          repository.views,
          hasLength(1),
          reason:
              'Scrolling within Home must not restart the activity request.',
        );
        expect(position.maxScrollExtent, closeTo(loadedExtent, 1));
        expect(position.pixels, closeTo(eventOffset, 1));
        expect(find.text('Third-ranked event'), findsOneWidget);
        expect(tester.takeException(), isNull);
      } finally {
        await tester.pumpWidget(const SizedBox.shrink());
        container.dispose();
        await tester.pump();
      }
    },
  );
}

class _DelayedHomeRepository implements EventRecommendationRepository {
  Completer<Result<EventRecommendationResponse>>? pending;
  int reads = 0;
  @override
  Future<Result<EventRecommendationResponse>> read({
    required EventRecommendationView view,
  }) {
    reads++;
    return pending?.future ?? Future.value(Success(testEventRecommendations()));
  }
}
