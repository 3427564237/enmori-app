import 'dart:io';
import 'dart:ui' as ui;

import 'package:enmori/app/enmori_theme.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/event_browse/domain/activity_repository.dart';
import 'package:enmori/features/event_browse/event_browse_providers.dart';
import 'package:enmori/features/event_browse/presentation/activity_page.dart';
import 'package:enmori/features/event_participation/presentation/event_batches_controller.dart';
import 'package:enmori/features/event_participation/presentation/participation_events_page.dart';
import 'package:enmori/features/event_recommendations/domain/event_recommendation_repository.dart';
import 'package:enmori/features/event_recommendations/event_recommendations_providers.dart';
import 'package:enmori/features/event_recommendations/presentation/event_recommendations_controller.dart';
import 'package:enmori/features/event_recommendations/presentation/event_recommendations_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fakes.dart';
import 'event_batches_test.dart' as browse;

const _notice = Key('event-source-coverage-incomplete');
const _english =
    'Some onePA interest searches could not be loaded. The current activity range is incomplete.';
const _chinese = 'onePA 部分兴趣查询暂时无法读取，当前活动范围不完整。';

EventRecommendationResponse _recommendations(
  bool items,
  Map<String, bool> coverage,
) => EventRecommendationResponse(
  asOf: DateTime.utc(2026, 11, 17),
  formulaVersion: 'event_recommendation_v3',
  sourceStatus: {'onepa': true, 'ticketmaster': false},
  sourceCoverage: coverage,
  items: items
      ? [
          EventRecommendation(
            eventId: 'cooking',
            title: 'Cooking workshop',
            startAt: DateTime.utc(2026, 12, 1),
            matchedInterests: const [
              MatchedInterest(interestTagId: 'food', displayName: 'Food'),
            ],
            reasonCode: 'relevance_match',
          ),
        ]
      : [],
);

ActivityBatch _batch(bool items, Map<String, bool> coverage) => ActivityBatch(
  asOf: browse.instant,
  sourceStatus: {'onepa': true, 'ticketmaster': false},
  sourceCoverage: coverage,
  items: items ? [browse.item('Cooking workshop')] : [],
);

void main() {
  for (final locale in ['en', 'zh']) {
    for (final surface in ['home', 'standalone', 'for-you', 'browse']) {
      for (final hasItems in [false, true]) {
        testWidgets(
          '$locale $surface coverage with items=$hasItems renders at 320px 2x and clears on complete refresh',
          (tester) async {
            tester.view.physicalSize = const Size(320, 640);
            tester.view.devicePixelRatio = 1;
            addTearDown(tester.view.resetPhysicalSize);
            addTearDown(tester.view.resetDevicePixelRatio);
            await _fonts(tester);
            final recommendations = FakeEventRecommendationRepository()
              ..homeResult = Success(
                _recommendations(hasItems, {'onepa': false}),
              )
              ..allResult = Success(
                _recommendations(hasItems, {'onepa': false}),
              );
            final activities = browse.Repo()
              ..result = Success(_batch(hasItems, {'onepa': false}));
            final container = ProviderContainer(
              overrides: [
                authSessionProvider.overrideWithValue(
                  const AsyncData(
                    AuthSessionAuthenticated(subject: 'coverage-fixture'),
                  ),
                ),
                eventRecommendationRepositoryProvider.overrideWithValue(
                  recommendations,
                ),
                activityRepositoryProvider.overrideWithValue(activities),
              ],
            );
            var disposed = false;
            void dispose() {
              if (!disposed) {
                disposed = true;
                container.dispose();
              }
            }

            addTearDown(dispose);
            final page = switch (surface) {
              'home' => Scaffold(
                body: SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: EventRecommendationsSection(
                    onSeeAll: () {},
                    onEditInterests: () {},
                    onBrowseAll: () {},
                  ),
                ),
              ),
              'standalone' => EventRecommendationsPage(
                onEditInterests: () {},
                onBrowseAll: () {},
              ),
              _ => ParticipationEventsPage(
                initialDestination: surface == 'browse'
                    ? EventsDestination.browse
                    : EventsDestination.forYou,
                onSelect: (_) {},
                onOpenPlans: () {},
                recommendationsBuilder: (_, onBrowse) =>
                    EventRecommendationsPage(
                      embedded: true,
                      onEditInterests: () {},
                      onBrowseAll: onBrowse,
                    ),
              ),
            };
            await tester.pumpWidget(
              UncontrolledProviderScope(
                container: container,
                child: _app(locale, page),
              ),
            );
            await tester.pumpAndSettle();
            if (surface == 'browse') {
              final status = find.text(
                locale == 'zh'
                    ? 'Ticketmaster: 暂不可用'
                    : 'Ticketmaster: unavailable',
              );
              await tester.scrollUntilVisible(
                status,
                160,
                scrollable: find
                    .byWidgetPredicate(
                      (widget) =>
                          widget is Scrollable &&
                          widget.axisDirection == AxisDirection.down,
                    )
                    .first,
              );
              expect(status, findsOneWidget);
            }
            await tester.scrollUntilVisible(
              find.byKey(_notice),
              160,
              scrollable: find
                  .byWidgetPredicate(
                    (widget) =>
                        widget is Scrollable &&
                        widget.axisDirection == AxisDirection.down,
                  )
                  .first,
            );
            await tester.pumpAndSettle();
            expect(
              find.text(locale == 'zh' ? _chinese : _english),
              findsOneWidget,
            );
            expect(find.byKey(_notice), findsOneWidget);
            if (surface != 'browse') {
              expect(
                find.byKey(
                  const Key('event-recommendations-source-unavailable'),
                ),
                findsOneWidget,
              );
            }
            await tester.ensureVisible(find.byKey(_notice));
            await tester.pumpAndSettle();
            expect(tester.takeException(), isNull);
            await _capture(
              tester,
              'coverage-$surface-$locale-320-2x-${hasItems ? 'items' : 'empty'}',
            );
            if (!hasItems && surface != 'browse') {
              for (final key in [
                'event-recommendations-edit-interests',
                'event-recommendations-browse-empty',
              ]) {
                final action = find.byKey(Key(key));
                await tester.ensureVisible(action);
                await tester.pumpAndSettle();
                expect(action.hitTestable(), findsOneWidget);
              }
            }
            for (final coverage in <Map<String, bool>>[
              {'onepa': true},
              {},
            ]) {
              recommendations
                ..homeResult = Success(_recommendations(hasItems, coverage))
                ..allResult = Success(_recommendations(hasItems, coverage));
              activities.result = Success(_batch(hasItems, coverage));
              if (surface == 'browse') {
                await container.read(eventBatchesProvider.notifier).load();
              } else {
                container
                    .read(eventRecommendationsControllerProvider.notifier)
                    .load(
                      view: surface == 'home'
                          ? EventRecommendationView.home
                          : EventRecommendationView.all,
                    );
              }
              await tester.pumpAndSettle();
              expect(find.byKey(_notice), findsNothing);
              expect(tester.takeException(), isNull);
            }
            await tester.pumpWidget(const SizedBox.shrink());
            dispose();
            await tester.pump();
          },
        );
      }
    }
  }

  testWidgets('legacy Browse composition also explains incomplete coverage', (
    tester,
  ) async {
    final repo = browse.Repo()
      ..result = Success(_batch(false, {'onepa': false}));
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authSessionProvider.overrideWithValue(
            const AsyncData(AuthSessionAuthenticated(subject: 'fixture')),
          ),
          activityRepositoryProvider.overrideWithValue(repo),
        ],
        child: const MaterialApp(home: ActivityPage(browseId: '')),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.byKey(_notice), findsOneWidget);
  });
}

Widget _app(String locale, Widget page) {
  final theme = enmoriTheme();
  return RepaintBoundary(
    key: const Key('coverage-capture'),
    child: MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: theme.copyWith(
        textTheme: theme.textTheme.apply(fontFamilyFallback: ['Preview CJK']),
        appBarTheme: theme.appBarTheme.copyWith(
          titleTextStyle: theme.appBarTheme.titleTextStyle?.copyWith(
            fontFamilyFallback: ['Preview CJK'],
          ),
        ),
      ),
      locale: Locale(locale),
      supportedLocales: const [Locale('en'), Locale('zh')],
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context).copyWith(
          textScaler: const TextScaler.linear(2),
          disableAnimations: true,
        ),
        child: child!,
      ),
      home: page,
    ),
  );
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
  final output = Platform.environment['ENMORI_QUERY_COVERAGE_PREVIEW'];
  if (output == null) return;
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(const Key('coverage-capture')),
  );
  await tester.runAsync(() async {
    final bitmap = await boundary.toImage(pixelRatio: 2);
    final bytes = await bitmap.toByteData(format: ui.ImageByteFormat.png);
    await Directory(output).create(recursive: true);
    await File('$output/$name.png').writeAsBytes(bytes!.buffer.asUint8List());
    bitmap.dispose();
  });
}
