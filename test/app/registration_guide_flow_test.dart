import 'package:enmori/app/app.dart';
import 'package:enmori/app/providers.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/account_preferences_providers.dart';
import 'package:enmori/features/account/account_providers.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/account/presentation/onboarding_controller.dart';
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

class _Profiles implements RecommendationProfileRepository {
  bool unavailable = false;
  RecommendationProfile stored = const RecommendationProfile();
  final writes = <RecommendationProfile>[];
  @override
  Future<Result<RecommendationProfile>> read() async => unavailable
      ? const Failure(
          AppFailure(
            kind: AppFailureKind.serviceUnavailable,
            message: 'Synthetic',
          ),
        )
      : Success(stored);
  @override
  Future<Result<RecommendationProfile>> save(
    RecommendationProfile value,
  ) async {
    writes.add(value);
    stored = value;
    return Success(value);
  }
}

class _Regions implements RegionRepository {
  @override
  Future<List<PlanningArea>> catalogue() async => const [];
  @override
  Future<Result<PlanningArea>> locate() async =>
      throw StateError('No location consent');
}

Future<void> _frames(WidgetTester tester) async {
  for (var i = 0; i < 8; i++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}

void main() {
  for (final action in ['save', 'skip', 'unavailable']) {
    testWidgets(
      'new account reaches profile then recommendation then interests: $action',
      (tester) async {
        final accounts = FakeAccountRepository();
        final preferences = FakeAccountPreferences();
        final profiles = _Profiles()..unavailable = action == 'unavailable';
        final interests = FakeInterestRepository();
        final container = ProviderContainer(
          overrides: [
            authSessionProvider.overrideWithValue(
              const AsyncData(AuthSessionAuthenticated(subject: 'new-owner')),
            ),
            remoteGroupFeaturesEnabledProvider.overrideWithValue(true),
            accountRepositoryProvider.overrideWithValue(accounts),
            accountPreferencesRepositoryProvider.overrideWithValue(preferences),
            interestRepositoryProvider.overrideWithValue(interests),
            eventRecommendationRepositoryProvider.overrideWithValue(
              FakeEventRecommendationRepository(),
            ),
            recommendationProfileRepositoryProvider.overrideWithValue(profiles),
            regionRepositoryProvider.overrideWithValue(_Regions()),
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
        expect(find.byKey(const Key('route-onboarding')), findsOneWidget);
        await container
            .read(onboardingControllerProvider.notifier)
            .complete(
              username: 'member_a',
              initialChoice: InitialChoice.reject,
            );
        await _frames(tester);
        expect(
          find.byKey(const Key('registration-profile-step')),
          findsOneWidget,
        );
        await tester.scrollUntilVisible(
          find.byKey(const Key('registration-profile-skip')),
          250,
          scrollable: find.byType(Scrollable).first,
        );
        await Scrollable.ensureVisible(
          tester.element(find.byKey(const Key('registration-profile-skip'))),
          alignment: .5,
        );
        await _frames(tester);
        await tester.tap(find.byKey(const Key('registration-profile-skip')));
        await _frames(tester);
        expect(find.byType(RecommendationProfilePage), findsOneWidget);
        final button = find.text(
          action == 'save' ? 'Save and continue' : 'Skip for now',
        );
        if (action != 'unavailable') {
          await tester.scrollUntilVisible(
            button,
            300,
            scrollable: find.byType(Scrollable).first,
          );
        }
        await Scrollable.ensureVisible(tester.element(button), alignment: .5);
        await _frames(tester);
        await tester.tap(button);
        await _frames(tester);
        expect(find.byType(RecommendationProfilePage), findsNothing);
        expect(find.text('Step 3 of 3 · Interests'), findsOneWidget);
        await tester.tap(find.text('Skip for now'));
        await _frames(tester);
        expect(find.byKey(const Key('route-home')), findsOneWidget);
        expect(preferences.profileNames, isEmpty);
        expect(preferences.settingsSaveCount, 0);
        expect(interests.savedIds, isEmpty);
        expect(profiles.writes.length, action == 'unavailable' ? 0 : 1);
        for (final p in profiles.writes) {
          expect(p.discoverable, isFalse);
          expect(p.autoActivityLocation, isFalse);
          expect(p.matchAge, isFalse);
          expect(p.birthDate, isNull);
          expect(p.homeAreaCode, isNull);
        }
        expect(accounts.completedChoices, [InitialChoice.reject]);
        expect(tester.takeException(), isNull);
      },
    );
  }
}
