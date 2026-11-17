import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:enmori/app/enmori_theme.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/event_recommendations/domain/event_recommendation_repository.dart';
import 'package:enmori/features/event_recommendations/event_recommendations_providers.dart';
import 'package:enmori/features/event_recommendations/presentation/event_recommendations_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _Pending implements EventRecommendationRepository {
  final pending = Completer<Result<EventRecommendationResponse>>();
  @override
  Future<Result<EventRecommendationResponse>> read({
    required EventRecommendationView view,
  }) => pending.future;
}

void main() {
  final output = Platform.environment['ENMORI_WAIT_PREVIEW'];
  for (final home in [true, false]) {
    for (final large in [false, true]) {
      testWidgets('production wait render home=$home large=$large', (
        tester,
      ) async {
        if (output == null) return;
        tester.view.physicalSize = large
            ? const Size(320, 640)
            : const Size(375, 812);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
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
        final repo = _Pending();
        final container = ProviderContainer(
          overrides: [
            authSessionProvider.overrideWithValue(
              const AsyncData(
                AuthSessionAuthenticated(subject: 'render-fixture'),
              ),
            ),
            currentAuthSubjectProvider.overrideWithValue('render-fixture'),
            eventRecommendationRepositoryProvider.overrideWithValue(repo),
          ],
        );
        addTearDown(container.dispose);
        final theme = enmoriTheme();
        await tester.pumpWidget(
          UncontrolledProviderScope(
            container: container,
            child: RepaintBoundary(
              key: const Key('wait-capture'),
              child: MaterialApp(
                debugShowCheckedModeBanner: false,
                theme: theme.copyWith(
                  textTheme: theme.textTheme.apply(
                    fontFamilyFallback: ['Preview CJK'],
                  ),
                  appBarTheme: theme.appBarTheme.copyWith(
                    titleTextStyle: theme.appBarTheme.titleTextStyle?.copyWith(
                      fontFamilyFallback: ['Preview CJK'],
                    ),
                  ),
                ),
                locale: Locale(large ? 'zh' : 'en'),
                supportedLocales: const [Locale('en'), Locale('zh')],
                localizationsDelegates: GlobalMaterialLocalizations.delegates,
                builder: (context, child) => MediaQuery(
                  data: MediaQuery.of(context).copyWith(
                    textScaler: TextScaler.linear(large ? 2 : 1),
                    disableAnimations: true,
                  ),
                  child: child!,
                ),
                home: home
                    ? Scaffold(
                        appBar: AppBar(title: Text(large ? '首页' : 'Home')),
                        body: SingleChildScrollView(
                          padding: const EdgeInsets.all(20),
                          child: EventRecommendationsSection(
                            heading: large ? '为你推荐' : 'For you',
                            onSeeAll: () {},
                            onBrowseAll: () {},
                          ),
                        ),
                      )
                    : EventRecommendationsPage(onBrowseAll: () {}),
              ),
            ),
          ),
        );
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 500));
        final stem =
            '${home ? 'home' : 'all'}-${large ? 'zh-320-2x' : 'en-375-1x'}';
        Future<void> capture(String stage) async {
          expect(tester.takeException(), isNull);
          final boundary = tester.renderObject<RenderRepaintBoundary>(
            find.byKey(const Key('wait-capture')),
          );
          await tester.runAsync(() async {
            final bitmap = await boundary.toImage(pixelRatio: 2);
            final bytes = await bitmap.toByteData(
              format: ui.ImageByteFormat.png,
            );
            await Directory(output).create(recursive: true);
            await File('$output/$stem-$stage.png')
                .writeAsBytes(bytes!.buffer.asUint8List());
            bitmap.dispose();
          });
        }

        await capture('initial');
        await tester.pump(const Duration(seconds: 12));
        await capture('long-wait');
        final stop = find.byKey(
          const Key('event-recommendations-stop-waiting'),
        );
        await tester.ensureVisible(stop);
        await tester.tap(stop);
        await tester.pumpAndSettle();
        await capture('stopped');
        expect(repo.pending.isCompleted, isFalse);
        await tester.pumpWidget(const SizedBox.shrink());
      });
    }
  }
}
