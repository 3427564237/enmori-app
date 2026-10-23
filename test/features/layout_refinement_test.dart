import 'dart:io';
import 'dart:ui' as ui;

import 'package:enmori/app/enmori_theme.dart';
import 'package:enmori/app/home_shell_page.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/check_in/domain/check_in_repository.dart';
import 'package:enmori/features/check_in/presentation/check_in_record_view.dart';
import 'package:enmori/features/event_recommendations/domain/event_recommendation_repository.dart';
import 'package:enmori/features/event_recommendations/event_recommendations_providers.dart';
import 'package:enmori/features/friends/domain/friend_activity_repository.dart';
import 'package:enmori/features/friends/presentation/friend_activity_panel.dart';
import 'package:enmori/features/friends/presentation/friend_discovery_controller.dart';
import 'package:enmori/features/friends/presentation/friend_ignore_controller.dart';
import 'package:enmori/features/friends/presentation/friend_module_page.dart';
import 'package:enmori/features/weather/domain/weather.dart';
import 'package:enmori/features/weather/presentation/home_weather_card.dart';
import 'package:enmori/features/weather/presentation/home_weather_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fakes.dart';
import '../support/fake_account_preferences.dart';

import 'package:enmori/features/account/account_preferences_providers.dart';
import 'package:enmori/features/account/domain/account_preferences_repository.dart';
import 'package:enmori/features/weather/domain/home_weather_repository.dart';
import 'package:enmori/features/weather/domain/foreground_location.dart';
import 'package:enmori/features/weather/weather_providers.dart';

import 'friend_ignore_flow_test.dart' show IgnoreFake;
import 'my_friends_test.dart' show Friends;

import 'package:enmori/features/friends/friend_providers.dart';

void main() {
  for (final page in ['friends', 'home', 'saved']) {
    testWidgets(
      '$page editorial layout fits 320dp and 2x text; retained actions work',
      (tester) async {
        // Same opt-in, synthetic Flutter raster approach as the existing previews.
        for (final (family, path) in [
          ('Roboto', Platform.environment['ENMORI_CAPTURE_FONT']),
          ('MaterialIcons', Platform.environment['ENMORI_CAPTURE_ICONS']),
          (
            'Playfair Display',
            'assets/fonts/playfair_display/PlayfairDisplay[wght].ttf',
          ),
        ]) {
          if (path == null) continue;
          final bytes = await tester.runAsync(() => File(path).readAsBytes());
          await tester.runAsync(
            () => (FontLoader(
              family,
            )..addFont(Future.value(ByteData.sublistView(bytes!)))).load(),
          );
        }
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        for (final scale in [1.0, 2.0]) {
          tester.view.physicalSize = Size(scale == 1 ? 375 : 320, 812);
          final people = IgnoreFake()..rows.clear();
          final weather = _Weather();
          final events = FakeEventRecommendationRepository()
            ..homeResult = Success(
              EventRecommendationResponse(
                asOf: DateTime.utc(2026, 10, 22),
                formulaVersion: 'preview',
                items: const [],
              ),
            );
          final container = ProviderContainer(
            overrides: [
              authSessionProvider.overrideWith(
                (ref) => Stream.value(
                  AuthSessionAuthenticated(subject: 'synthetic'),
                ),
              ),
              friendDiscoveryRepositoryProvider.overrideWithValue(people),
              friendRepositoryProvider.overrideWithValue(Friends()),
              friendIgnoreRepositoryProvider.overrideWithValue(people),
              friendActivityRepositoryProvider.overrideWithValue(_Activity()),
              eventRecommendationRepositoryProvider.overrideWithValue(events),
              homeWeatherRepositoryProvider.overrideWithValue(weather),
              foregroundLocationProvider.overrideWithValue(_Location()),
              accountPreferencesRepositoryProvider.overrideWithValue(
                FakeAccountPreferences()
                  ..settings = const OwnSettings(
                    checkInVisibility: CheckInVisibility.private,
                    consent: OptionalProcessingConsent.rejected,
                    revision: 1,
                    homeWeatherAuto: true,
                  ),
              ),
            ],
          );
          await tester.runAsync(() async {
            // Keep this asynchronous source observed before mounting the page.
            container.listen(authSessionProvider, (_, _) {});
            await container.read(authSessionProvider.future);
          });
          final record = CheckIn(
            checkInId: 'synthetic-journal',
            note: 'A quiet walk after class. The light through the trees made an ordinary afternoon feel a little softer.',
            createdAt: DateTime.utc(2026, 10, 22, 8),
            mood: 'Calm',
            activity: 'Walking',
            checkInVisibility: CheckInVisibility.private,
            locationLabel: 'The garden',
            location: const GeoPoint(1.3, 103.8),
            weather: _snapshot,
          );
          final widget = switch (page) {
            'friends' => FriendModulePage(openAttribution: (_) async => true),
            'home' => HomeShellPage(
              socialStyle: true,
              onStartCheckIn: () {},
              onSeeAllEvents: () {},
              onOpenEvent: (_) {},
              onBrowseActivities: () {},
              onSelectTab: (_) {},
              onOpenProfile: () {},
              onOpenHistory: () {},
              onOpenAi: () {},
              onOpenFootprint: () {},
              onManagePersonas: () {},
              onEditInterests: () {},
              onOpenSettings: () {},
              weatherSection: HomeWeatherCard(
                openAttribution: (_) async => true,
              ),
            ),
            _ => Scaffold(
              appBar: AppBar(title: const Text('Saved Check-in')),
              body: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  CheckInRecordView(
                    record: record,
                    openAttribution: (_) async => true,
                  ),
                ],
              ),
            ),
          };
          await tester.pumpWidget(
            UncontrolledProviderScope(
              container: container,
              child: RepaintBoundary(
                key: const Key('refinement-capture'),
                child: MaterialApp(
                  theme: enmoriTheme(),
                  debugShowCheckedModeBanner: false,
                  builder: (context, child) => MediaQuery(
                    data: MediaQuery.of(context).copyWith(
                      textScaler: TextScaler.linear(scale),
                      disableAnimations: true,
                    ),
                    child: child!,
                  ),
                  home: widget,
                ),
              ),
            ),
          );
          await tester.pumpAndSettle();
          expect(tester.takeException(), isNull);
          if (scale == 1) await _capture(tester, page);
          if (page == 'friends') {
            expect(find.byType(Card), findsNothing);
            expect(find.text('Friend requests (0)'), findsNothing);
            expect(find.text('See all activity'), findsNothing);
            expect(
              find.byKey(const Key('my-friends-search-query')),
              findsOneWidget,
            );
            await tester.enterText(
              find.byKey(const Key('my-friends-search-query')),
              'Alex',
            );
            await tester.tap(find.text('Activity'));
            await tester.pumpAndSettle();
            expect(find.text('No friends activity to show.'), findsOneWidget);
            await tester.tap(find.text('Discover'));
            await tester.pumpAndSettle();
            expect(find.byTooltip('Recommendation options'), findsOneWidget);
            await tester.tap(find.text('My Friends'));
            await tester.pumpAndSettle();
            expect(find.text('Alex'), findsOneWidget);
            expect(tester.takeException(), isNull);
          } else if (page == 'home') {
            await tester.ensureVisible(find.byTooltip('Refresh weather'));
            await tester.pumpAndSettle();
            expect(
              find.byTooltip('Refresh weather').hitTestable(),
              findsOneWidget,
            );
            await tester.tap(find.byTooltip('Refresh weather'));
            await tester.pumpAndSettle();
            expect(weather.refreshes, 2);
            expect(find.text('Weather data by Open-Meteo'), findsOneWidget);
            await tester.tap(find.byTooltip('Weather options'));
            await tester.pumpAndSettle();
            await tester.tap(find.text('About Home weather'));
            await tester.pumpAndSettle();
            expect(
              find.textContaining('Open-Meteo may retain request metadata.'),
              findsOneWidget,
            );
            await tester.tap(find.text('Done'));
            await tester.pumpAndSettle();
            await tester.tap(find.byTooltip('Weather options'));
            await tester.pumpAndSettle();
            await tester.tap(find.text('Clear weather'));
            await tester.pumpAndSettle();
            expect(find.text('Add today’s weather'), findsOneWidget);
            expect(weather.refreshes, 2);
            await tester.scrollUntilVisible(
              find.byKey(const Key('event-recommendations-refresh')),
              150,
            );
            final before = events.views.length;
            await tester.tap(
              find.byKey(const Key('event-recommendations-refresh')),
            );
            await tester.pumpAndSettle();
            expect(events.views.length, before + 1);
            expect(tester.takeException(), isNull);
          } else {
            expect(find.text('1.3, 103.8'), findsNothing);
            await tester.ensureVisible(find.text('Location details'));
            await tester.tap(find.text('Location details'));
            await tester.pumpAndSettle();
            expect(find.text('1.3, 103.8'), findsOneWidget);
            await tester.ensureVisible(find.text('Weather data by Open-Meteo'));
            expect(find.text('CC BY 4.0'), findsOneWidget);
            expect(tester.takeException(), isNull);
          }
          await tester.pumpWidget(const SizedBox.shrink());
          container.dispose();
        }
      },
    );
  }
}

final _snapshot = WeatherSnapshot(
  observedAt: DateTime.utc(2026, 10, 22, 8),
  temperatureCelsius: 28.4,
  condition: WeatherCondition.partlyCloudy,
);

class _Weather implements HomeWeatherRepository {
  int refreshes = 0;
  @override
  Future<Result<WeatherSnapshot>> current(
    GeoPoint grid, {
    required int settingsRevision,
  }) async {
    refreshes++;
    return Success(_snapshot);
  }
}

class _Location implements ForegroundLocation {
  @override
  Future<Result<GeoPoint>> capture({required bool precise}) async =>
      const Success(GeoPoint(1.3, 103.8));
}

class _Activity implements FriendActivityRepository {
  @override
  Future<Result<List<FriendActivityItem>>> read({
    required bool home,
    FriendActivityType? category,
  }) async => const Success([]);
}

Future<void> _capture(WidgetTester tester, String name) async {
  final output = Platform.environment['ENMORI_LAYOUT_PREVIEW'];
  if (output == null) return;
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(const Key('refinement-capture')),
  );
  final bitmap = await tester.runAsync(() => boundary.toImage(pixelRatio: 2));
  final bytes = await tester.runAsync(
    () => bitmap!.toByteData(format: ui.ImageByteFormat.png),
  );
  await tester.runAsync(() async {
    await Directory(output).create(recursive: true);
    await File('$output/$name.png').writeAsBytes(bytes!.buffer.asUint8List());
  });
  bitmap!.dispose();
}
