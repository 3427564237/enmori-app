import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:enmori/app/enmori_theme.dart';
import 'package:enmori/app/event_recommendation_card.dart';
import 'package:enmori/app/home_shell_page.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/event_detail/domain/event_content.dart';
import 'package:enmori/features/event_participation/domain/participation_repository.dart';
import 'package:enmori/features/event_participation/participation_providers.dart';
import 'package:enmori/features/event_participation/presentation/participation_controller.dart';
import 'package:enmori/features/event_recommendations/domain/event_recommendation_repository.dart';
import 'package:enmori/features/event_recommendations/event_recommendations_providers.dart';
import 'package:enmori/features/event_recommendations/presentation/event_recommendations_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  for (final locale in ['en', 'zh']) {
    for (final (size, scale, dark, label) in [
      (const Size(375, 812), 1.0, false, 'phone'),
      (const Size(320, 640), 2.0, false, 'large-text'),
      (const Size(812, 375), 2.0, false, 'landscape'),
      (const Size(800, 1000), 1.0, true, 'tablet-dark'),
    ]) {
      testWidgets('$locale $label recommendation cards and refreshed loading', (
        tester,
      ) async {
        tester.view.physicalSize = size;
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        await _fonts(tester);
        final repository = _Recommendations();
        final plans = _Plans();
        final opened = <String>[];
        final container = ProviderContainer(
          overrides: [
            authSessionProvider.overrideWithValue(
              const AsyncData(AuthSessionAuthenticated(subject: 'preview')),
            ),
            currentAuthSubjectProvider.overrideWithValue('preview'),
            eventRecommendationRepositoryProvider.overrideWithValue(repository),
            participationRepositoryProvider.overrideWithValue(plans),
          ],
        );
        addTearDown(container.dispose);
        final theme = dark
            ? ThemeData(
                useMaterial3: true,
                colorScheme: ColorScheme.fromSeed(
                  seedColor: const Color(0xff244b3f),
                  brightness: Brightness.dark,
                ),
              )
            : enmoriTheme();
        await tester.pumpWidget(
          UncontrolledProviderScope(
            container: container,
            child: RepaintBoundary(
              key: const Key('polish-capture'),
              child: MaterialApp(
                debugShowCheckedModeBanner: false,
                theme: theme.copyWith(
                  textTheme: theme.textTheme.apply(
                    fontFamilyFallback: ['Preview CJK'],
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
                home: HomeShellPage(
                  socialStyle: true,
                  onStartCheckIn: () {},
                  onSeeAllEvents: () {},
                  onBrowseActivities: () {},
                  onContinueDiscovery: () {},
                  onOpenEvent: opened.add,
                  onSelectTab: (_) {},
                  recommendationCardBuilder: (_, event, onOpen) =>
                      RepaintBoundary(
                        key: ValueKey('capture-${event.eventId}'),
                        child: ConnectedRecommendationCard(
                          event: event,
                          onOpen: onOpen,
                        ),
                      ),
                ),
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        final first = find.byKey(const ValueKey('event-open-preview-art'));
        await _show(tester, find.text('Weekend art workshop'));
        final scrolling = find.byType(Scrollable).first;
        final position = tester.state<ScrollableState>(scrolling).position;
        // Settle lazy sibling heights before capturing the card at the viewport top.
        for (var attempt = 0; attempt < 4; attempt++) {
          final top =
              tester.getTopLeft(first).dy - tester.getTopLeft(scrolling).dy;
          if ((top - 4).abs() < 1) break;
          position.jumpTo(
            (position.pixels + top - 4).clamp(0, position.maxScrollExtent),
          );
          await tester.pumpAndSettle();
        }
        expect(
          tester.getTopLeft(first).dy - tester.getTopLeft(scrolling).dy,
          closeTo(4, 1),
        );
        await _capture(tester, 'cards-$locale-$label');
        await _capture(
          tester,
          'single-card-$locale-$label',
          key: const ValueKey('capture-preview-art'),
        );
        // Exercise the title hit area, not the center of a tall overview card.
        final title = find.text('Weekend art workshop');
        await tester.ensureVisible(title);
        await tester.tap(title);
        expect(opened, ['preview-art']);
        final interested = find.descendant(
          of: find.byKey(const ValueKey('event-card-preview-art')),
          matching: find.text(locale == 'zh' ? '感兴趣' : 'Interested'),
        );
        await tester.ensureVisible(interested);
        await tester.pumpAndSettle();
        await tester.tap(interested);
        await tester.pumpAndSettle();
        expect(plans.saved, [ParticipationStatus.interested]);
        expect(opened, ['preview-art']);
        expect(tester.takeException(), isNull);
        repository.pending = Completer<Result<EventRecommendationResponse>>();
        container
            .read(eventRecommendationsControllerProvider.notifier)
            .load(view: EventRecommendationView.home);
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 100));
        expect(find.text('Weekend art workshop'), findsNothing);
        final viewport = tester.getRect(find.byType(Scrollable).first);
        expect(
          find
              .byType(LinearProgressIndicator)
              .evaluate()
              .any(
                (element) => viewport.contains(
                  tester
                      .getRect(
                        find.byElementPredicate(
                          (candidate) => identical(element, candidate),
                        ),
                      )
                      .center,
                ),
              ),
          isTrue,
          reason: 'Loading feedback must remain visible at the retained scroll position.',
        );
        await _capture(tester, 'refresh-$locale-$label');
        repository.pending!.complete(
          const Failure(
            AppFailure(
              kind: AppFailureKind.serviceUnavailable,
              message: 'private fixture diagnostics',
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(find.text('private fixture diagnostics'), findsNothing);
        expect(
          container.read(eventRecommendationsControllerProvider).hasError,
          isTrue,
        );
        final retry = find.byKey(const Key('event-recommendations-retry'));
        await _show(tester, retry);
        expect(
          find.byKey(const Key('event-recommendations-error')),
          findsOneWidget,
        );
        repository.pending = null;
        await tester.tap(retry);
        await tester.pumpAndSettle();
        expect(find.text('Weekend art workshop'), findsOneWidget);
        expect(plans.saved.length, 1);
        expect(tester.takeException(), isNull);
        // Ignored cards leave only the list action; its small loading slot must fit.
        plans.ignore = true;
        await container
            .read(participationControllerProvider.notifier)
            .load('preview-art');
        await container
            .read(participationControllerProvider.notifier)
            .load('preview-games');
        await tester.pumpAndSettle();
        expect(find.text('Weekend art workshop'), findsNothing);
        repository.pending = Completer<Result<EventRecommendationResponse>>();
        container
            .read(eventRecommendationsControllerProvider.notifier)
            .load(view: EventRecommendationView.home);
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 100));
        expect(tester.takeException(), isNull);
        repository.pending!.complete(
          await _Recommendations().read(view: EventRecommendationView.home),
        );
        await tester.pumpAndSettle();
        await tester.pumpWidget(const SizedBox.shrink());
      });
    }
  }
}

Future<void> _show(WidgetTester tester, Finder finder) async {
  tester
      .state<ScrollableState>(find.byType(Scrollable).first)
      .position
      .jumpTo(0);
  await tester.pumpAndSettle();
  for (var step = 0; step < 40; step++) {
    if (finder.evaluate().isNotEmpty) {
      await tester.ensureVisible(finder);
      await tester.pumpAndSettle();
      if (finder.hitTestable().evaluate().isNotEmpty) return;
    }
    await tester.drag(find.byType(Scrollable).first, const Offset(0, -160));
    await tester.pumpAndSettle();
  }
  fail('Could not reveal $finder');
}

class _Recommendations implements EventRecommendationRepository {
  Completer<Result<EventRecommendationResponse>>? pending;
  @override
  Future<Result<EventRecommendationResponse>> read({
    required EventRecommendationView view,
  }) async =>
      pending?.future ??
      Success(
        EventRecommendationResponse(
          asOf: DateTime.utc(2026, 11, 17),
          formulaVersion: 'synthetic-preview',
          items: [
            EventRecommendation(
              eventId: 'preview-art',
              title: 'Weekend art workshop',
              startAt: DateTime.utc(2026, 11, 21, 2),
              endAt: DateTime.utc(2026, 11, 21, 4),
              locationLabel: 'Tampines community studio',
              matchedInterests: const [
                MatchedInterest(interestTagId: 'art', displayName: 'Art'),
              ],
              reasonCode: 'interest_match',
              content: const EventContent(
                provider: 'onepa',
                detailUrl: 'https://www.onepa.gov.sg/',
                timeZone: 'Asia/Singapore',
                priceLabel: 'S\$18',
                status: 'available',
              ),
            ),
            EventRecommendation(
              eventId: 'preview-games',
              title: 'Community board game evening',
              startAt: DateTime.utc(2026, 11, 22, 10),
              endAt: DateTime.utc(2026, 11, 22, 12),
              locationLabel: 'Neighbourhood activity room',
              matchedInterests: const [
                MatchedInterest(interestTagId: 'gaming', displayName: 'Gaming'),
              ],
              reasonCode: 'interest_match',
              content: const EventContent(
                provider: 'onepa',
                detailUrl: 'https://www.onepa.gov.sg/',
                timeZone: 'Asia/Singapore',
                priceLabel: 'Free',
                status: 'sold_out',
                registrationDeadline: '2026-11-21T10:00:00Z',
              ),
            ),
          ],
        ),
      );
}

class _Plans implements ParticipationRepository {
  bool ignore = false;
  final saved = <ParticipationStatus>[];
  final values = <String, EventParticipation>{};
  @override
  Future<Result<EventParticipation>> read(
    String id,
    bool Function() current,
  ) async => Success(
    ignore
        ? EventParticipation(
            eventId: id,
            status: ParticipationStatus.none,
            ignored: true,
            revision: 3,
          )
        : values[id] ??
              EventParticipation(
                eventId: id,
                status: ParticipationStatus.none,
                ignored: false,
                revision: 1,
              ),
  );
  @override
  Future<Result<EventParticipation>> save(
    EventParticipation previous,
    ParticipationStatus status,
    bool ignored,
    bool Function() current,
  ) async {
    saved.add(status);
    return Success(
      values[previous.eventId] = EventParticipation(
        eventId: previous.eventId,
        status: status,
        ignored: ignored,
        revision: previous.revision + 1,
      ),
    );
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
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

Future<void> _capture(
  WidgetTester tester,
  String name, {
  Key key = const Key('polish-capture'),
}) async {
  final output = Platform.environment['ENMORI_RECOMMENDATION_PREVIEW'];
  if (output == null) return;
  final boundary = tester.renderObject<RenderRepaintBoundary>(find.byKey(key));
  await tester.runAsync(() async {
    final bitmap = await boundary.toImage(pixelRatio: 2);
    final bytes = await bitmap.toByteData(format: ui.ImageByteFormat.png);
    await Directory(output).create(recursive: true);
    await File('$output/$name.png').writeAsBytes(bytes!.buffer.asUint8List());
    bitmap.dispose();
  });
}
