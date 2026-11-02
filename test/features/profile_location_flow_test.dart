import 'package:enmori/app/app.dart';
import 'package:enmori/app/providers.dart';
import 'package:enmori/app/router/app_router.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/account_preferences_providers.dart';
import 'package:enmori/features/account/account_providers.dart';
import 'package:enmori/features/account/domain/account_preferences_repository.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/account/domain/profile_details.dart';
import 'package:enmori/features/account/domain/profile_location_repository.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/event_recommendations/event_recommendations_providers.dart';
import 'package:enmori/features/interests/interests_providers.dart';
import 'package:enmori/features/recommendation_profile/domain/recommendation_profile.dart';
import 'package:enmori/features/recommendation_profile/presentation/recommendation_profile_page.dart';
import 'package:enmori/features/recommendation_profile/recommendation_profile_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fake_account_preferences.dart';
import '../support/fakes.dart';

final class _LegacyLocation implements ProfileLocationRepository {
  int calls = 0;

  @override
  Future<Result<String>> currentRegionCoordinates() async {
    calls++;
    return const Success('1.3°, 103.8°');
  }
}

final class _Profiles implements RecommendationProfileRepository {
  int saves = 0;
  final saved = const RecommendationProfile(
    homeAreaCode: 'TM',
    onboardingPromptSeen: true,
    revision: 3,
  );

  @override
  Future<Result<RecommendationProfile>> read() async => Success(saved);

  @override
  Future<Result<RecommendationProfile>> save(
    RecommendationProfile value,
  ) async {
    saves++;
    return Success(value);
  }
}

final class _Regions implements RegionRepository {
  int locationCalls = 0;

  @override
  Future<List<PlanningArea>> catalogue() async => const [
    PlanningArea(
      code: 'TM',
      name: 'Tampines',
      regionCode: 'ER',
      regionName: 'East Region',
    ),
    PlanningArea(
      code: 'BD',
      name: 'Bedok',
      regionCode: 'ER',
      regionName: 'East Region',
    ),
  ];

  @override
  Future<Result<PlanningArea>> locate() async {
    locationCalls++;
    return const Failure(
      AppFailure(
        kind: AppFailureKind.serviceUnavailable,
        message: 'Location permission was not granted.',
      ),
    );
  }
}

void main() {
  // Legacy GPS-sync was removed before the approved 28 October area flow.
  testWidgets(
    'profile keeps legacy region read-only and cancelled area selection does not write',
    (tester) async {
      const legacyRegion = 'Previously saved city';
      final prefs = FakeAccountPreferences()
        ..profile = const OwnProfile(
          username: 'member_a',
          displayName: null,
          visibility: ProfileVisibility.private,
          revision: 2,
          details: ProfileDetails(region: legacyRegion),
        );
      final legacyLocation = _LegacyLocation();
      final profiles = _Profiles();
      final regions = _Regions();
      final container = ProviderContainer(
        overrides: [
          authSessionProvider.overrideWithValue(
            const AsyncData(AuthSessionAuthenticated(subject: 'member-a')),
          ),
          remoteGroupFeaturesEnabledProvider.overrideWithValue(true),
          accountPreferencesRepositoryProvider.overrideWithValue(prefs),
          profileLocationRepositoryProvider.overrideWithValue(legacyLocation),
          accountRepositoryProvider.overrideWithValue(
            FakeAccountRepository()
              ..statusResult = Success(
                OnboardingCompleted(testAccount(username: 'member_a')),
              ),
          ),
          interestRepositoryProvider.overrideWithValue(
            FakeInterestRepository(),
          ),
          eventRecommendationRepositoryProvider.overrideWithValue(
            FakeEventRecommendationRepository(),
          ),
          recommendationProfileRepositoryProvider.overrideWithValue(profiles),
          regionRepositoryProvider.overrideWithValue(regions),
        ],
      );
      addTearDown(container.dispose);
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const EnmoriApp(),
        ),
      );
      await _frames(tester);
      container.read(appRouterProvider).go(AppRoutes.profileEdit);
      await _frames(tester);

      final region = find.byKey(const Key('profile-region'));
      await tester.ensureVisible(region);
      expect(tester.widget<TextField>(region).readOnly, isTrue);
      expect(tester.widget<TextField>(region).controller!.text, legacyRegion);
      expect(find.byKey(const Key('profile-sync-location')), findsNothing);
      final name = find.byKey(const Key('profile-display-name'));
      await tester.ensureVisible(name);
      await tester.enterText(name, 'Name waiting for Save');
      await _frames(tester);
      final entry = find.text('Recommendation profile');
      await tester.ensureVisible(entry);
      await tester.tap(entry);
      await _frames(tester);
      expect(find.byType(RecommendationProfilePage), findsOneWidget);

      final area = find.byKey(const Key('recommendation-home-area'));
      await tester.ensureVisible(area);
      await tester.tap(area);
      await _frames(tester);
      expect(find.text('Search Singapore areas'), findsOneWidget);
      await tester.tap(find.text('Bedok'));
      await _frames(tester);
      expect(find.text('Bedok'), findsOneWidget);
      expect(profiles.saves, 0);
      await tester.pageBack();
      await _frames(tester);
      expect(find.text('Discard unsaved changes?'), findsOneWidget);
      await tester.tap(find.text('Keep editing'));
      await _frames(tester);
      expect(find.text('Bedok'), findsOneWidget);
      expect(profiles.saves, 0);
      await tester.pageBack();
      await _frames(tester);
      await tester.tap(find.text('Discard'));
      await _frames(tester);

      expect(find.byType(RecommendationProfilePage), findsNothing);
      expect(find.byKey(const Key('route-profile-edit')), findsOneWidget);
      expect(tester.widget<TextField>(region).controller!.text, legacyRegion);
      expect(
        tester.widget<TextField>(name).controller!.text,
        'Name waiting for Save',
      );
      expect(profiles.saved.homeAreaCode, 'TM');
      expect(profiles.saves, 0);
      expect(prefs.profileNames, isEmpty);
      expect(prefs.settingsSaveCount, 0);
      expect(prefs.profile.details.region, legacyRegion);
      expect(legacyLocation.calls, 0);
      expect(regions.locationCalls, 0);
      expect(tester.takeException(), isNull);
    },
  );
}

Future<void> _frames(WidgetTester tester) async {
  for (var index = 0; index < 8; index++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}
