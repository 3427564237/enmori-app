import 'dart:io';
import 'dart:ui' as ui;

import 'package:enmori/app/enmori_theme.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/event_recommendations/domain/event_recommendation_repository.dart';
import 'package:enmori/features/event_recommendations/event_recommendations_providers.dart';
import 'package:enmori/features/event_recommendations/presentation/event_recommendations_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fakes.dart';

void main() {
  for (final language in ['en', 'zh']) {
    for (final (size, scale, label) in [
      (const Size(375, 812), 1.0, 'phone'),
      (const Size(320, 640), 2.0, 'large-text'),
      (const Size(812, 375), 2.0, 'landscape'),
    ]) {
      for (final degraded in [false, true]) {
        testWidgets('$language $label empty recovery degraded=$degraded', (
          tester,
        ) async {
          tester.view.physicalSize = size;
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          await _fonts(tester);
          final repository = FakeEventRecommendationRepository()
            ..allResult = Success(
              EventRecommendationResponse(
                asOf: DateTime.utc(2026, 11, 17),
                formulaVersion: 'event_recommendation_v3',
                items: const [],
                sourceStatus: {'ticketmaster': true, 'onepa': !degraded},
              ),
            );
          var edited = 0, browsed = 0;
          final theme = enmoriTheme();
          await tester.pumpWidget(
            ProviderScope(
              overrides: [
                eventRecommendationRepositoryProvider.overrideWithValue(
                  repository,
                ),
              ],
              child: RepaintBoundary(
                key: const Key('empty-render'),
                child: MaterialApp(
                  debugShowCheckedModeBanner: false,
                  theme: theme.copyWith(
                  appBarTheme: theme.appBarTheme.copyWith(
                    titleTextStyle: theme.appBarTheme.titleTextStyle?.copyWith(
                      fontFamilyFallback: ['Preview CJK'],
                    ),
                  ),
                    textTheme: theme.textTheme.apply(
                      fontFamilyFallback: ['Preview CJK'],
                    ),
                  ),
                  locale: Locale(language),
                  supportedLocales: const [Locale('en'), Locale('zh')],
                  localizationsDelegates: GlobalMaterialLocalizations.delegates,
                  builder: (context, child) => MediaQuery(
                    data: MediaQuery.of(context).copyWith(
                      textScaler: TextScaler.linear(scale),
                      disableAnimations: true,
                    ),
                    child: child!,
                  ),
                  home: EventRecommendationsPage(
                    onEditInterests: () => edited++,
                    onBrowseAll: () => browsed++,
                  ),
                ),
              ),
            ),
          );
          await tester.pumpAndSettle();
          expect(tester.takeException(), isNull);
          expect(
            find.byKey(const Key('event-recommendations-source-unavailable')),
            degraded ? findsOneWidget : findsNothing,
          );
          await _capture(
            tester,
            'recommendation-empty-$language-$label-${degraded ? 'degraded' : 'healthy'}',
          );
          for (final action in [
            'event-recommendations-edit-interests',
            'event-recommendations-browse-empty',
          ]) {
            final finder = find.byKey(Key(action));
            await tester.ensureVisible(finder);
            await tester.pumpAndSettle();
            expect(finder.hitTestable(), findsOneWidget);
            await tester.tap(finder);
          }
          expect(edited, 1);
          expect(browsed, 1);
          expect(tester.takeException(), isNull);
        });
      }
    }
  }
}

Future<void> _fonts(WidgetTester tester) async {
  for (final (family, path) in [
    ('Roboto', Platform.environment['ENMORI_CAPTURE_FONT']),
    ('MaterialIcons', Platform.environment['ENMORI_CAPTURE_ICONS']),
    ('Preview CJK', Platform.environment['ENMORI_CAPTURE_CJK']),
    (
      'Playfair Display',
      'assets/fonts/playfair_display/PlayfairDisplay[wght].ttf',
    ),
  ]) {
    if (path == null) continue;
    await tester.runAsync(() async {
      final bytes = await File(path).readAsBytes();
      await (FontLoader(
        family,
      )..addFont(Future.value(ByteData.sublistView(bytes)))).load();
    });
  }
}

Future<void> _capture(WidgetTester tester, String name) async {
  final output = Platform.environment['ENMORI_INTEREST_DISCOVERY_PREVIEW'];
  if (output == null) return;
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(const Key('empty-render')),
  );
  await tester.runAsync(() async {
    final bitmap = await boundary.toImage(pixelRatio: 2);
    final bytes = await bitmap.toByteData(format: ui.ImageByteFormat.png);
    await Directory(output).create(recursive: true);
    await File('$output/$name.png').writeAsBytes(bytes!.buffer.asUint8List());
    bitmap.dispose();
  });
}
