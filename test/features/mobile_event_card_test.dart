import 'package:enmori/app/enmori_theme.dart';
import 'package:enmori/features/event_browse/domain/activity_repository.dart';
import 'package:enmori/features/event_participation/presentation/event_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  for (final (start, end, expected) in [
    (
      DateTime.utc(2026, 11, 21, 2),
      DateTime.utc(2026, 11, 21, 4),
      'Sat, Nov 21 · 10:00 AM–12:00 PM SGT',
    ),
    (
      DateTime.utc(2026, 11, 21, 15, 30),
      DateTime.utc(2026, 11, 21, 16, 30),
      'Sat, Nov 21 · 11:30 PM SGT – Sun, Nov 22 · 12:30 AM SGT',
    ),
  ]) {
    testWidgets('overview range retains the Singapore dates: $expected', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context).copyWith(alwaysUse24HourFormat: false),
            child: child!,
          ),
          home: Scaffold(
            body: EventCard.summary(
              summary: ActivitySummary(
                browseId: 'range',
                title: 'Time range',
                startAt: start.toIso8601String(),
                endAt: end.toIso8601String(),
              ),
              onSelect: (_) {},
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text(expected), findsOneWidget);
      expect(find.text('End time not provided.'), findsNothing);
      expect(tester.takeException(), isNull);
    });
  }
  for (final use24Hour in [true, false]) {
    testWidgets(
      'event content opens details without swallowing plan actions; 24h=$use24Hour',
      (tester) async {
        tester.view.physicalSize = const Size(320, 900);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final opened = <String>[];
        var plans = 0;
        await tester.pumpWidget(
          MaterialApp(
            theme: enmoriTheme(),
            builder: (context, child) => MediaQuery(
              data: MediaQuery.of(context).copyWith(
                alwaysUse24HourFormat: use24Hour,
                textScaler: const TextScaler.linear(2),
                disableAnimations: true,
              ),
              child: child!,
            ),
            home: Scaffold(
              body: SingleChildScrollView(
                child: EventCard.summary(
                  summary: ActivitySummary(
                    browseId: 'event-a',
                    eventId: 'event-a',
                    title: 'Evening at the gardens',
                    shortDescription: use24Hour
                        ? 'Detail-only introduction.'
                        : null,
                    categoryLabel: 'Arts, culture and community gatherings',
                    startAt: DateTime.utc(
                      2026,
                      10,
                      22,
                      12,
                      5,
                    ).toIso8601String(),
                  ),
                  onSelect: opened.add,
                  actions: FilledButton(
                    onPressed: () => plans++,
                    child: const Text('Interested'),
                  ),
                ),
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        expect(find.text('No cover provided by source.'), findsNothing);
        expect(find.text('End time not provided.'), findsOneWidget);
        expect(find.text('Event cover unavailable.'), findsNothing);
        expect(find.text('Detail-only introduction.'), findsNothing);
        expect(find.textContaining('Introduction unavailable'), findsNothing);
        expect(find.textContaining('暂无简介'), findsNothing);
        expect(
          find.textContaining(use24Hour ? '20:05' : '8:05 PM'),
          findsOneWidget,
        );
        await tester.tap(find.text('Evening at the gardens'));
        expect(opened, ['event-a']);
        await tester.ensureVisible(find.text('Interested'));
        await tester.tap(find.text('Interested'));
        expect(plans, 1);
        expect(opened, ['event-a']);
      },
    );
  }
}
