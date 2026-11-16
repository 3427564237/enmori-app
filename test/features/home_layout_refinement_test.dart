import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:enmori/app/enmori_theme.dart';
import 'package:enmori/app/event_recommendation_card.dart';
import 'package:enmori/app/home_shell_page.dart';
import 'package:enmori/app/home_today_provider.dart';
import 'package:enmori/app/home_today_section.dart';
import 'package:enmori/app/remote_social_composition.dart';
import 'package:enmori/app/social_demo_presentation.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/account_preferences_providers.dart';
import 'package:enmori/features/account/account_providers.dart';
import 'package:enmori/features/account/domain/account_preferences_repository.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/account/domain/profile_details.dart';
import 'package:enmori/features/account/presentation/own_profile_page.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/check_in/domain/check_in_repository.dart';
import 'package:enmori/features/event_participation/domain/participation_repository.dart';
import 'package:enmori/features/event_participation/participation_providers.dart';
import 'package:enmori/features/event_recommendations/domain/event_recommendation_repository.dart';
import 'package:enmori/features/event_recommendations/event_recommendations_providers.dart';
import 'package:enmori/features/interests/domain/interest_repository.dart';
import 'package:enmori/features/interests/interests_providers.dart';
import 'package:enmori/features/recommendation_profile/domain/recommendation_profile.dart';
import 'package:enmori/features/recommendation_profile/presentation/activity_area_bar.dart';
import 'package:enmori/features/recommendation_profile/recommendation_profile_providers.dart';
import 'package:enmori/features/weather/domain/foreground_location.dart';
import 'package:enmori/features/weather/domain/home_weather_repository.dart';
import 'package:enmori/features/weather/domain/weather.dart';
import 'package:enmori/features/weather/presentation/home_weather_card.dart';
import 'package:enmori/features/weather/presentation/home_weather_controller.dart';
import 'package:enmori/features/weather/weather_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fake_account_preferences.dart';
import '../support/fakes.dart';

// Production widgets, synthetic repositories, no real account or service writes.
void main() {
  for (final locale in ['en', 'zh']) {
    for (final (size, scale, label) in [
      (const Size(375, 812), 1.0, 'phone'),
      (const Size(320, 640), 1.0, 'narrow'),
      (const Size(320, 640), 2.0, 'large-text'),
      (const Size(812, 375), 2.0, 'landscape'),
    ]) {
      testWidgets('$locale $label Home and Profile retain contextual actions', (
        tester,
      ) async {
        await _fonts(tester);
        _surface(tester, size);
        final fixture = _Fixture();
        await _mount(tester, fixture, locale: locale, scale: scale);
        expect(tester.takeException(), isNull);
        final start = find.byKey(const Key('r6-new-check-in-button'));
        await _show(tester, start);
        await tester.tap(start);
        expect(fixture.checkIns, 1);
        expect(find.byKey(const Key('profile-edit')), findsNothing);
        await _top(tester);
        await _capture(tester, 'home-$locale-$label');
        final area = find.byKey(const Key('home-recommendation-area'));
        final choose = find.byKey(const Key('home-choose-recommendation-area'));
        await _show(tester, choose);
        await tester.pumpAndSettle();
        expect(
          tester.getTopLeft(area).dy,
          greaterThan(
            tester
                .getTopLeft(
                  find.text(locale == 'zh' ? '为你推荐的活动' : 'Events for you'),
                )
                .dy,
          ),
        );
        await tester.tap(choose);
        await tester.pumpAndSettle();
        expect(find.text('Tampines'), findsWidgets);
        Navigator.of(tester.element(find.text('Tampines').last)).pop();
        await tester.pumpAndSettle();
        expect(fixture.container.read(activityAreaProvider).code, 'TM');
        expect(fixture.regions.locations, 0);
        await _show(tester, choose);
        await _capture(tester, 'home-events-$locale-$label');
        await _mount(
          tester,
          fixture,
          locale: locale,
          scale: scale,
          profile: true,
        );
        final edit = find.byKey(const Key('profile-edit-interests'));
        await _show(tester, edit);
        await tester.pumpAndSettle();
        expect(
          find.descendant(
            of: find.byKey(const Key('profile-interests-heading')),
            matching: edit,
          ),
          findsOneWidget,
        );
        expect(tester.getSize(edit).height, greaterThanOrEqualTo(48));
        await tester.tap(edit);
        await tester.pumpAndSettle();
        expect(fixture.interestEdits, 1);
        expect(find.text('Books'), findsOneWidget);
        expect(fixture.prefs.settingsSaveCount, 0);
        expect(fixture.prefs.profileNames, isEmpty);
        await _top(tester);
        await _capture(tester, 'profile-$locale-$label');
        await _show(tester, find.byKey(const Key('profile-history')));
        final history = tester.getRect(
          find.byKey(const Key('profile-history')),
        );
        final footprint = tester.getRect(
          find.byKey(const Key('profile-footprint')),
        );
        if (history.top == footprint.top) {
          expect(history.height, footprint.height);
        }
        await _show(tester, edit);
        await _capture(tester, 'profile-interests-$locale-$label');
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox.shrink());
        fixture.container.dispose();
      });
    }
  }

  testWidgets(
    'scrolling away and back does not reload Home identity or weather',
    (tester) async {
      _surface(tester, const Size(375, 812));
      final fixture = _Fixture();
      await _mount(tester, fixture, trailing: const SizedBox(height: 1800));
      final profileReads = fixture.prefs.profileReadCount;
      final settingsReads = fixture.prefs.settingsReadCount;
      final action = find.byKey(const Key('r6-new-check-in-button'));
      final rect = tester.getRect(action);
      await tester.drag(
        find.byKey(const Key('route-home')),
        const Offset(0, -2200),
      );
      await tester.pumpAndSettle();
      await _top(tester);
      expect(fixture.prefs.profileReadCount, profileReads);
      expect(fixture.prefs.settingsReadCount, settingsReads);
      expect(tester.getRect(action), rect);
      await tester.pumpWidget(const SizedBox.shrink());
      fixture.container.dispose();
    },
  );

  testWidgets(
    'primary action stays fixed through profile and weather transitions',
    (tester) async {
      _surface(tester, const Size(375, 812));
      await _fonts(tester);
      final fixture = _Fixture();
      final profile = Completer<Result<OwnProfile>>();
      fixture.prefs.profileReads.add(profile.future);
      final pendingWeather = Completer<Result<WeatherSnapshot>>();
      fixture.weather.pending = pendingWeather;
      await _mount(tester, fixture, settle: false);
      final action = find.byKey(const Key('r6-new-check-in-button'));
      final before = tester.getRect(action);
      expect(find.text('Welcome back'), findsOneWidget);
      await _capture(tester, 'home-loading');
      profile.complete(Success(fixture.prefs.profile));
      pendingWeather.complete(Success(_weather));
      await tester.pumpAndSettle();
      expect(tester.getRect(action), before);
      expect(find.text('Weather data by Open-Meteo'), findsOneWidget);
      expect(find.text('CC BY 4.0'), findsOneWidget);
      expect(find.text('Conditions normalized by ENMORI.'), findsOneWidget);
      fixture.weather.pending = null;
      fixture.weather.fail = true;
      await tester.tap(find.byTooltip('Refresh weather'));
      await tester.pumpAndSettle();
      expect(tester.getRect(action), before);
      expect(find.text('Current weather is unavailable.'), findsOneWidget);
      await _capture(tester, 'home-weather-failed');
      fixture.container.read(homeWeatherControllerProvider.notifier).clear();
      await tester.pumpAndSettle();
      expect(tester.getRect(action), before);
      expect(find.text('Weather data by Open-Meteo'), findsNothing);
      await tester.tap(action);
      expect(fixture.checkIns, 1);
      await tester.pumpWidget(const SizedBox.shrink());
      fixture.container.dispose();
    },
  );

  testWidgets(
    'optional weather remains off until consent; declining does not locate',
    (tester) async {
      _surface(tester, const Size(320, 640));
      await _fonts(tester);
      final fixture = _Fixture(automatic: false, entries: 0);
      await _mount(tester, fixture);
      final action = find.byKey(const Key('r6-new-check-in-button'));
      final before = tester.getRect(action);
      expect(fixture.location.calls, 0);
      await _capture(tester, 'home-weather-off-empty-day');
      await tester.tap(find.text('Add today’s weather'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Not now'));
      await tester.pumpAndSettle();
      expect(fixture.location.calls, 0);
      expect(fixture.prefs.settingsSaveCount, 0);
      expect(tester.getRect(action), before);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      fixture.container.dispose();
    },
  );

  for (final locale in ['en', 'zh']) {
    testWidgets('$locale complete profile keeps all settings reachable', (
      tester,
    ) async {
      _surface(tester, const Size(375, 812));
      await _fonts(tester);
      final fixture = _Fixture();
      fixture.prefs.profile = const OwnProfile(
        username: 'alex_w',
        displayName: 'Alex',
        visibility: ProfileVisibility.private,
        revision: 1,
        details: ProfileDetails(
          bio: 'Finding quiet moments between classes.',
          affiliationType: AffiliationType.school,
          affiliationName: 'School of Design',
          region: 'Tampines',
        ),
      );
      await _mount(
        tester,
        fixture,
        locale: locale,
        profile: true,
        personas: true,
      );
      await _capture(tester, 'profile-complete-$locale');
      final persona = find.byKey(const Key('profile-manage-personas'));
      await _show(tester, persona);
      await _capture(tester, 'profile-settings-$locale');
      await tester.tap(persona);
      await tester.pumpAndSettle();
      expect(fixture.personaOpens, 1);
      expect(fixture.prefs.settingsSaveCount, 0);
      expect(fixture.prefs.profileNames, isEmpty);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      fixture.container.dispose();
    });

    for (final automatic in [false, true]) {
      testWidgets(
        '$locale empty weather failure stays concise and retry recovers; auto=$automatic',
        (tester) async {
          _surface(tester, const Size(320, 640));
          await _fonts(tester);
          final fixture = _Fixture(automatic: automatic, entries: 0);
          fixture.location.result = const Failure(
            AppFailure(
              kind: AppFailureKind.serviceUnavailable,
              message: 'Location services are off. You can continue without location.',
            ),
          );
          await _mount(tester, fixture, locale: locale, scale: 2);
          final action = find.byKey(const Key('r6-new-check-in-button'));
          final introduction = find.byKey(const Key('home-introduction'));
          Offset actionPosition() =>
              tester.getTopLeft(action) - tester.getTopLeft(introduction);
          final before = actionPosition();
          final request = find.byKey(const Key('home-weather-request'));
          final once = find.text(locale == 'zh' ? '仅这一次' : 'Only this time');
          if (!automatic) {
            expect(fixture.location.calls, 0);
            await _show(tester, request);
            await tester.tap(request);
            await tester.pumpAndSettle();
            await tester.ensureVisible(once);
            await tester.tap(once);
            await tester.pumpAndSettle();
          }
          expect(fixture.location.calls, 1);
          final status = find.byKey(const Key('home-weather-status'));
          final expected = locale == 'zh'
              ? '${automatic ? '自动获取已开启' : '可选'} · 位置服务已关闭。'
              : '${automatic ? 'Auto on' : 'Optional'} · Location services are off.';
          expect(find.text(expected), findsOneWidget);
          expect(
            find.descendant(of: status, matching: find.byType(Text)),
            findsOneWidget,
          );
          expect(
            tester.widget<Semantics>(status).properties.liveRegion,
            isTrue,
          );
          expect(find.textContaining('continue without'), findsNothing);
          expect(find.text('Weather data by Open-Meteo'), findsNothing);
          expect(actionPosition(), before);
          await _top(tester);
          await _capture(tester, 'home-location-off-$locale-auto-$automatic');
          fixture.location.result = const Success(GeoPoint(1.3, 103.8));
          await _show(tester, request);
          expect(tester.getSize(request).height, greaterThanOrEqualTo(48));
          expect(
            find.text(locale == 'zh' ? '重试天气' : 'Retry weather'),
            findsOneWidget,
          );
          await tester.tap(request);
          await tester.pumpAndSettle();
          if (!automatic) {
            // A retry does not silently turn one-time consent into automatic use.
            expect(fixture.location.calls, 1);
            await tester.ensureVisible(once);
            await tester.tap(once);
            await tester.pumpAndSettle();
          }
          expect(fixture.location.calls, 2);
          expect(find.text(expected), findsNothing);
          expect(fixture.prefs.settingsSaveCount, 0);
          expect(fixture.prefs.settings.homeWeatherAuto, automatic);
          expect(actionPosition(), before);
          expect(
            fixture.container.read(homeWeatherControllerProvider).weather,
            _weather,
          );
          await _show(tester, action);
          await tester.tap(action);
          expect(fixture.checkIns, 1);
          expect(tester.takeException(), isNull);
          await tester.pumpWidget(const SizedBox.shrink());
          fixture.container.dispose();
        },
      );
    }
  }
}

class _Fixture {
  _Fixture({bool automatic = true, int entries = 1}) {
    prefs.settings = OwnSettings(
      checkInVisibility: CheckInVisibility.private,
      consent: OptionalProcessingConsent.accepted,
      revision: 1,
      homeWeatherAuto: automatic,
    );
    container = ProviderContainer(
      overrides: [
        authSessionProvider.overrideWithValue(
          const AsyncData(AuthSessionAuthenticated(subject: 'preview')),
        ),
        currentAuthSubjectProvider.overrideWithValue('preview'),
        accountRepositoryProvider.overrideWithValue(
          FakeAccountRepository()
            ..statusResult = Success(
              OnboardingCompleted(testAccount(username: 'alex_w')),
            ),
        ),
        accountPreferencesRepositoryProvider.overrideWithValue(prefs),
        interestRepositoryProvider.overrideWithValue(interests),
        homeWeatherRepositoryProvider.overrideWithValue(weather),
        foregroundLocationProvider.overrideWithValue(location),
        regionRepositoryProvider.overrideWithValue(regions),
        recommendationProfileRepositoryProvider.overrideWithValue(
          _RecommendationProfile(),
        ),
        participationRepositoryProvider.overrideWithValue(_Participation()),
        eventRecommendationRepositoryProvider.overrideWithValue(
          FakeEventRecommendationRepository()
            ..homeResult = Success(
              EventRecommendationResponse(
                asOf: DateTime.utc(2026, 11, 17),
                formulaVersion: 'synthetic-preview',
                items: [
                  EventRecommendation(
                    eventId: 'preview-art',
                    title: 'Weekend art workshop',
                    startAt: DateTime.utc(2026, 11, 21, 2),
                    locationLabel: 'Community studio',
                    matchedInterests: const [
                      MatchedInterest(interestTagId: 'art', displayName: 'Art'),
                    ],
                    reasonCode: 'interest_match',
                  ),
                ],
              ),
            ),
        ),
        homeTodayProvider.overrideWith(
          (ref) async => HomeTodaySnapshot(
            date: DateTime(2026, 11, 17),
            timeZone: 'Asia/Singapore',
            entries: [
              for (var i = 0; i < entries; i++)
                HomeTodayEntry(
                  CheckIn(
                    checkInId: 'preview-$i',
                    note: 'A quiet walk after class.',
                    mood: 'Calm',
                    createdAt: DateTime.utc(2026, 11, 17, 2),
                  ),
                  '10:00',
                ),
            ],
          ),
        ),
      ],
    );
  }
  final prefs = FakeAccountPreferences()
    ..profile = const OwnProfile(
      username: 'alex_w',
      displayName: 'Alex',
      visibility: ProfileVisibility.private,
      revision: 1,
      details: ProfileDetails(bio: 'Finding quiet moments between classes.'),
    );
  final interests = FakeInterestRepository()
    ..ownResult = const Success(
      InterestSelection(
        interestTags: [
          SelectedInterestTag(
            interestTagId: 'art',
            displayName: 'Art',
            lifecycleState: InterestLifecycleState.active,
          ),
          SelectedInterestTag(
            interestTagId: 'music',
            displayName: 'Music',
            lifecycleState: InterestLifecycleState.active,
          ),
        ],
        revision: 1,
      ),
    );
  final weather = _Weather();
  final location = _Location();
  final regions = _Regions();
  late final ProviderContainer container;
  int checkIns = 0, interestEdits = 0, personaOpens = 0;
  Future<void> editInterests() async {
    interestEdits++;
    interests.ownResult = const Success(
      InterestSelection(
        interestTags: [
          SelectedInterestTag(
            interestTagId: 'books',
            displayName: 'Books',
            lifecycleState: InterestLifecycleState.active,
          ),
        ],
        revision: 2,
      ),
    );
  }
}

Future<void> _mount(
  WidgetTester tester,
  _Fixture fixture, {
  String locale = 'en',
  double scale = 1,
  bool profile = false,
  bool personas = false,
  bool settle = true,
  Widget? trailing,
}) async {
  final theme = enmoriTheme();
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: fixture.container,
      child: RepaintBoundary(
        key: const Key('home-layout-capture'),
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
          home: profile
              ? Scaffold(
                  bottomNavigationBar: SocialDemoNavigation(
                    selectedIndex: 4,
                    onSelected: (_) {},
                  ),
                  body: OwnProfilePage(
                    onEditInterests: fixture.editInterests,
                    onOpenHistory: () {},
                    onOpenFootprint: () {},
                    onEditProfile: () async {},
                    onOpenSettings: () async {},
                    onOpenRecommendationProfile: () async {},
                    onManagePersonas: personas
                        ? () async => fixture.personaOpens++
                        : null,
                  ),
                )
              : HomeShellPage(
                  socialStyle: true,
                  greeting: const ConnectedHomeGreeting(),
                  socialSection: trailing,
                  weatherSection: HomeWeatherCard(
                    openAttribution: (_) async => true,
                    onOpenSettings: () {},
                  ),
                  daySection: HomeTodaySection(
                    onOpenCheckIn: (_) async {},
                    onOpenHistory: () async {},
                  ),
                  recommendationControls: const ActivityAreaBar(),
                  recommendationCardBuilder: (context, event, onOpen) =>
                      ConnectedRecommendationCard(event: event, onOpen: onOpen),
                  onStartCheckIn: () => fixture.checkIns++,
                  onSelectTab: (_) {},
                  onOpenProfile: () {},
                  onOpenSettings: () {},
                  onSeeAllEvents: () {},
                  onBrowseActivities: () {},
                  onOpenEvent: (_) {},
                ),
        ),
      ),
    ),
  );
  if (settle) {
    await tester.pumpAndSettle();
  } else {
    for (var i = 0; i < 8; i++) {
      await tester.pump(const Duration(milliseconds: 30));
    }
  }
}

const _area = PlanningArea(
  code: 'TM',
  name: 'Tampines',
  regionCode: 'ER',
  regionName: 'East Region',
);

class _RecommendationProfile implements RecommendationProfileRepository {
  @override
  Future<Result<RecommendationProfile>> read() async => const Success(
    RecommendationProfile(homeAreaCode: 'TM', onboardingPromptSeen: true),
  );
  @override
  Future<Result<RecommendationProfile>> save(RecommendationProfile profile) =>
      throw StateError('No preference writes in this preview');
}

class _Regions implements RegionRepository {
  int locations = 0;
  @override
  Future<List<PlanningArea>> catalogue() async => const [_area];
  @override
  Future<Result<PlanningArea>> locate() async {
    locations++;
    return const Success(_area);
  }
}

final _weather = WeatherSnapshot(
  observedAt: DateTime.utc(2026, 11, 17, 10),
  temperatureCelsius: 28.4,
  condition: WeatherCondition.partlyCloudy,
);

class _Weather implements HomeWeatherRepository {
  Completer<Result<WeatherSnapshot>>? pending;
  bool fail = false;
  @override
  Future<Result<WeatherSnapshot>> current(
    GeoPoint grid, {
    required int settingsRevision,
  }) async =>
      pending?.future ??
      (fail
          ? const Failure(
              AppFailure(
                kind: AppFailureKind.serviceUnavailable,
                message: 'Current weather is unavailable.',
              ),
            )
          : Success(_weather));
}

class _Location implements ForegroundLocation {
  int calls = 0;
  Result<GeoPoint> result = const Success(GeoPoint(1.3, 103.8));
  @override
  Future<Result<GeoPoint>> capture({required bool precise}) async {
    calls++;
    return result;
  }
}

class _Participation implements ParticipationRepository {
  @override
  Future<Result<EventParticipation>> read(
    String id,
    bool Function() current,
  ) async => Success(
    EventParticipation(
      eventId: id,
      status: ParticipationStatus.none,
      ignored: false,
      revision: 1,
    ),
  );
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void _surface(WidgetTester tester, Size size) {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = size;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}

Future<void> _top(WidgetTester tester) async {
  final scrollable = find.byType(Scrollable).first;
  tester.state<ScrollableState>(scrollable).position.jumpTo(0);
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
  final output = Platform.environment['ENMORI_HOME_LAYOUT_PREVIEW'];
  if (output == null) return;
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(const Key('home-layout-capture')),
  );
  await tester.runAsync(() async {
    final bitmap = await boundary.toImage(pixelRatio: 2);
    final data = await bitmap.toByteData(format: ui.ImageByteFormat.png);
    await Directory(output).create(recursive: true);
    await File('$output/$name.png').writeAsBytes(data!.buffer.asUint8List());
    bitmap.dispose();
  });
}

Future<void> _show(WidgetTester tester, Finder finder) async {
  // Let lazy sections finish their first read between user-like scroll steps.
  // ensureVisible alone can target a cached offstage child before relayout.
  if (finder.evaluate().isEmpty) await _top(tester);
  for (var step = 0; step < 80; step++) {
    if (finder.evaluate().isNotEmpty) {
      await tester.ensureVisible(finder);
      await tester.pumpAndSettle();
      if (finder.hitTestable().evaluate().isNotEmpty) return;
    }
    await tester.drag(find.byType(Scrollable).first, const Offset(0, -180));
    await tester.pumpAndSettle();
  }
  fail('Could not reach $finder by scrolling');
}
