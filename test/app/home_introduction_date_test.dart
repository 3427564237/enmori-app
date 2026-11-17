import 'package:enmori/app/home_introduction.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  for (final language in ['en', 'zh']) {
    testWidgets(
      'Home display date rolls over on successive midnights ($language)',
      (tester) async {
        var now = DateTime(2026, 11, 17, 23, 59, 58);
        await _mount(tester, () => now, language: language);
        expect(_date(tester, now), findsOneWidget);
        for (final nextDay in [18, 19]) {
          now = DateTime(2026, 11, nextDay);
          await tester.pump(
            nextDay == 18
                ? const Duration(seconds: 3)
                : const Duration(days: 1),
          );
          await tester.pumpAndSettle();
          expect(_date(tester, now), findsOneWidget);
        }
        expect(find.byKey(const Key('r6-new-check-in-button')), findsOneWidget);
        expect(find.text('Synthetic weather'), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
  }

  testWidgets(
    'resuming refreshes the date and retires the previous midnight timer',
    (tester) async {
      var now = DateTime(2026, 11, 17, 23, 59, 58);
      var reads = 0;
      await _mount(tester, () {
        reads++;
        return now;
      });
      final initialReads = reads;
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      now = DateTime(2026, 11, 19, 9);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pumpAndSettle();
      expect(_date(tester, now), findsOneWidget);
      expect(reads, initialReads + 1);
      await tester.pump(const Duration(seconds: 3));
      expect(reads, initialReads + 1);
      now = DateTime(2026, 11, 20);
      await tester.pump(const Duration(hours: 15) - const Duration(seconds: 3));
      await tester.pumpAndSettle();
      expect(_date(tester, now), findsOneWidget);
      expect(reads, initialReads + 2);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'disposing the date header cancels its timer and lifecycle observer',
    (tester) async {
      var now = DateTime(2026, 11, 17, 23, 59, 58);
      var reads = 0;
      await _mount(tester, () {
        reads++;
        return now;
      });
      final beforeDispose = reads;
      await tester.pumpWidget(const SizedBox.shrink());
      now = DateTime(2026, 11, 18);
      await tester.pump(const Duration(seconds: 3));
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pump();
      expect(reads, beforeDispose);
      expect(tester.takeException(), isNull);
    },
  );
}

Finder _date(WidgetTester tester, DateTime date) => find.text(
  MaterialLocalizations.of(tester.element(find.byType(HomeIntroduction)))
      .formatFullDate(date),
);

Future<void> _mount(
  WidgetTester tester,
  DateTime Function() now, {
  String language = 'en',
}) async {
  // Pure presentation must continue to work without a ProviderScope, Auth,
  // Repository, native platform call, or a sibling day section.
  await tester.pumpWidget(
    MaterialApp(
      locale: Locale(language),
      supportedLocales: const [Locale('en'), Locale('zh')],
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      home: Scaffold(
        body: HomeIntroduction(
          onStartCheckIn: () {},
          weather: const Text('Synthetic weather'),
          displayNow: now,
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
  addTearDown(() async {
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump();
  });
}
