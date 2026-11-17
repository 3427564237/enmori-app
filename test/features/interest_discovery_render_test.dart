import 'dart:io';
import 'dart:ui' as ui;

import 'package:enmori/app/enmori_theme.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/event_browse/domain/activity_repository.dart';
import 'package:enmori/features/event_browse/event_browse_providers.dart';
import 'package:enmori/features/event_participation/presentation/participation_events_page.dart';
import 'package:enmori/features/interests/domain/interest_repository.dart';
import 'package:enmori/features/interests/interests_providers.dart';
import 'package:enmori/features/interests/presentation/interest_editor_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fakes.dart';
import 'event_batches_test.dart' as browse;

void main() {
  for (final locale in ['en', 'zh']) {
    for (final (size, scale, label) in [
      (const Size(375, 812), 1.0, 'phone'),
      (const Size(320, 640), 2.0, 'large-text'),
      (const Size(812, 375), 2.0, 'landscape'),
    ]) {
      testWidgets(
        '$locale $label interest editor and activity filters render and remain usable',
        (tester) async {
          tester.view.physicalSize = size;
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          addTearDown(tester.view.resetViewInsets);
          await _fonts(tester);
          const names = [
            'Art',
            'Books',
            'Community',
            'Dance',
            'Fitness',
            'Films',
            'Food',
            'Gaming',
            'Music',
            'Outdoors',
            'Photography',
            'Technology',
            'Travel',
            'Volunteering',
          ];
          final interests = FakeInterestRepository()
            ..catalogueResult = Success([
              for (final name in names)
                InterestTagOption(interestTagId: name, displayName: name),
            ])
            ..ownResult = const Success(
              InterestSelection(
                revision: 1,
                interestTags: [
                  SelectedInterestTag(
                    interestTagId: 'Dance',
                    displayName: 'Dance',
                    lifecycleState: InterestLifecycleState.active,
                  ),
                  SelectedInterestTag(
                    interestTagId: 'Food',
                    displayName: 'Food',
                    lifecycleState: InterestLifecycleState.active,
                  ),
                ],
              ),
            );
          await tester.pumpWidget(
            ProviderScope(
              overrides: [
                interestRepositoryProvider.overrideWithValue(interests),
              ],
              child: _app(locale, scale, const InterestEditorPage()),
            ),
          );
          await tester.pumpAndSettle();
          expect(
            find.byKey(const Key('interest-save')).hitTestable(),
            findsOneWidget,
          );
          expect(tester.takeException(), isNull);
          await _capture(tester, 'interests-$locale-$label');
          await _scrollTo(tester, find.byKey(const Key('interest-search')));
          await tester.enterText(
            find.byKey(const Key('interest-search')),
            'Dance',
          );
          await tester.pumpAndSettle();
          if (label == 'large-text') {
            tester.view.viewInsets = const FakeViewPadding(bottom: 230);
            await tester.pumpAndSettle();
            expect(
              find.byKey(const Key('interest-save')).hitTestable(),
              findsOneWidget,
            );
            expect(
              tester.getBottomRight(find.byKey(const Key('interest-save'))).dy,
              lessThanOrEqualTo(410),
            );
            expect(tester.takeException(), isNull);
            await _capture(tester, 'interests-$locale-keyboard-inset');
            tester.view.resetViewInsets();
          }
          FocusManager.instance.primaryFocus?.unfocus();
          tester.testTextInput.hide();
          await tester.pumpWidget(const SizedBox.shrink());
          await tester.pump();

          final now = DateTime.now();
          final events = browse.Repo()
            ..result = Success(
              ActivityBatch(
                asOf: browse.instant,
                sourceStatus: const {'ticketmaster': true, 'onepa': true},
                items: [
                  ActivitySummary(
                    browseId: 'fixture-food',
                    eventId: 'fixture-food',
                    title: 'Community cooking workshop',
                    startAt: DateTime(
                      now.year,
                      now.month,
                      now.day,
                      18,
                    ).toUtc().toIso8601String(),
                    locationLabel: 'Community Club',
                    categoryLabel: 'Food',
                  ),
                ],
              ),
            );
          var plansOpened = 0;
          await tester.pumpWidget(
            ProviderScope(
              overrides: [
                activityRepositoryProvider.overrideWithValue(events),
                authSessionProvider.overrideWithValue(
                  const AsyncData(AuthSessionAuthenticated(subject: 'preview')),
                ),
              ],
              child: _app(
                locale,
                scale,
                ParticipationEventsPage(
                  initialDestination: EventsDestination.browse,
                  onSelect: (_) {},
                  onOpenPlans: () => plansOpened++,
                  onOpenRecent: () {},
                  recommendationsBuilder: (_, _) =>
                      const Text('Synthetic recommendation fixture'),
                ),
              ),
            ),
          );
          await tester.pumpAndSettle();
          await tester.tap(find.byKey(const Key('events-my-plans')));
          expect(plansOpened, 1);
          await _scrollTo(
            tester,
            find.byKey(const Key('events-filters-toggle')),
          );
          await tester.tap(find.byKey(const Key('events-filters-toggle')));
          await tester.pumpAndSettle();
          await _scrollTo(tester, find.byKey(const Key('events-time-today')));
          await tester.tap(find.byKey(const Key('events-time-today')));
          await tester.pumpAndSettle();
          expect(
            tester
                .widget<ChoiceChip>(find.byKey(const Key('events-time-today')))
                .selected,
            isTrue,
          );
          expect(tester.takeException(), isNull);
          await _capture(tester, 'events-filters-$locale-$label');
          await _scrollTo(
            tester,
            find.byKey(const Key('events-clear-filters')),
          );
          expect(
            find.byKey(const Key('events-clear-filters')).hitTestable(),
            findsOneWidget,
          );
          await tester.tap(find.byKey(const Key('events-clear-filters')));
          await tester.pumpAndSettle();
          expect(tester.takeException(), isNull);
          await tester.pumpWidget(const SizedBox.shrink());
          await tester.pump();
        },
      );
    }
  }
}

Widget _app(String locale, double scale, Widget child) {
  final theme = enmoriTheme();
  return RepaintBoundary(
    key: const Key('interest-discovery-capture'),
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
          textScaler: TextScaler.linear(scale),
          disableAnimations: true,
        ),
        child: child!,
      ),
      home: child,
    ),
  );
}

Future<void> _scrollTo(WidgetTester tester, Finder target) async {
  await tester.scrollUntilVisible(
    target,
    120,
    scrollable: find
        .byWidgetPredicate(
          (widget) =>
              widget is Scrollable &&
              widget.axisDirection == AxisDirection.down,
        )
        .first,
  );
  await tester.pumpAndSettle();
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
    find.byKey(const Key('interest-discovery-capture')),
  );
  await tester.runAsync(() async {
    final bitmap = await boundary.toImage(pixelRatio: 2);
    final bytes = await bitmap.toByteData(format: ui.ImageByteFormat.png);
    await Directory(output).create(recursive: true);
    await File('$output/$name.png').writeAsBytes(bytes!.buffer.asUint8List());
    bitmap.dispose();
  });
}
