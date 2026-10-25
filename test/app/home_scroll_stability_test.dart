import 'package:enmori/app/home_shell_page.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/event_recommendations/event_recommendations_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fakes.dart';

void main() {
  testWidgets('returning from Home bottom keeps loaded events and scroll extent', (
    tester,
  ) async {
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
        reason: 'Scrolling within Home must not restart the activity request.',
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
  });
}
