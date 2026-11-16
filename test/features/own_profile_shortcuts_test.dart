import 'dart:async';

import 'package:enmori/app/app.dart';
import 'package:enmori/app/enmori_theme.dart';
import 'package:enmori/app/providers.dart';
import 'package:enmori/app/router/app_router.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/account_preferences_providers.dart';
import 'package:enmori/features/account/account_providers.dart';
import 'package:enmori/features/account/domain/account_preferences_repository.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/account/domain/profile_details.dart';
import 'package:enmori/features/account/presentation/own_profile_page.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/event_recommendations/event_recommendations_providers.dart';
import 'package:enmori/features/interests/domain/interest_repository.dart';
import 'package:enmori/features/interests/interests_providers.dart';
import 'package:enmori/features/recommendation_profile/domain/recommendation_profile.dart';
import 'package:enmori/features/recommendation_profile/presentation/recommendation_profile_page.dart';
import 'package:enmori/features/recommendation_profile/recommendation_profile_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fake_account_preferences.dart';
import '../support/fakes.dart';

void main() {
  testWidgets(
    'shortcuts have visible names, button semantics and real callbacks',
    (tester) async {
      _phone(tester, const Size(375, 812));
      final semantics = tester.ensureSemantics();
      try {
        final visited = <String>[];
        await _mount(tester, (context) {
          Future<void> open(String name) async {
            visited.add(name);
            await Navigator.of(context).push<void>(
              MaterialPageRoute(
                builder: (_) => Scaffold(
                  appBar: AppBar(title: Text(name)),
                  body: const Text('Existing destination'),
                ),
              ),
            );
          }

          return OwnProfilePage(
            onEditInterests: () => open('Interests'),
            onEditProfile: () => open('Profile editor'),
            onOpenRecommendationProfile: () => open('Recommendation profile'),
            onOpenSettings: () => open('Settings'),
            onOpenHistory: () => open('History'),
            onOpenFootprint: () => open('Footprint'),
            onManagePersonas: () => open('Personas'),
          );
        });

        expect(
          tester.getTopLeft(find.byKey(const Key('profile-history'))).dy,
          lessThan(
            tester
                .getTopLeft(find.byKey(const Key('profile-edit-interests')))
                .dy,
          ),
        );
        expect(
          find.descendant(
            of: find.byKey(const Key('profile-interests-heading')),
            matching: find.byKey(const Key('profile-edit-interests')),
          ),
          findsOneWidget,
        );
        expect(
          tester.getTopLeft(find.byKey(const Key('profile-history'))).dy,
          tester.getTopLeft(find.byKey(const Key('profile-footprint'))).dy,
        );

        final avatar = find.byKey(const Key('own-avatar-edit'));
        expect(tester.getSize(avatar).shortestSide, greaterThanOrEqualTo(48));
        final audience = find.byKey(const Key('profile-audience'));
        await _show(tester, audience);
        expect(tester.getSize(audience).height, greaterThanOrEqualTo(48));
        await tester.tap(audience);
        await _frames(tester);
        expect(find.byType(AlertDialog), findsOneWidget);
        expect(
          find.textContaining('Your records and sharing choices'),
          findsOneWidget,
        );
        await tester.tap(find.text('Done'));
        await _frames(tester);
        expect(find.byType(AlertDialog), findsNothing);

        for (final (key, label, destination) in [
          ('profile-history', 'Check-in History', 'History'),
          ('profile-edit-interests', 'Edit interests', 'Interests'),
          ('profile-footprint', 'Footprint', 'Footprint'),
          ('profile-edit', 'Edit profile', 'Profile editor'),
          (
            'profile-recommendation-profile',
            'Area, birthday & discovery',
            'Recommendation profile',
          ),
          ('profile-settings', 'Privacy & settings', 'Settings'),
          ('profile-manage-personas', 'Your Personas', 'Personas'),
        ]) {
          final finder = find.byKey(Key(key));
          await _show(tester, finder);
          final node = tester.getSemantics(finder);
          expect(node.label, label);
          expect(node.flagsCollection.isButton, isTrue);
          expect(tester.getSize(finder).shortestSide, greaterThanOrEqualTo(48));
          expect(
            find.descendant(of: finder, matching: find.text(label)),
            findsOneWidget,
          );
          await tester.tap(finder);
          await _frames(tester);
          expect(find.text('Existing destination'), findsOneWidget);
          expect(visited.last, destination);
          await tester.pageBack();
          await _frames(tester);
        }
        expect(visited.length, 7);
        expect(tester.takeException(), isNull);
      } finally {
        semantics.dispose();
      }
    },
  );

  testWidgets('unavailable optional destinations are absent', (tester) async {
    await _mount(tester, (_) => OwnProfilePage(onEditInterests: () async {}));
    expect(find.byKey(const Key('profile-edit-interests')), findsOneWidget);
    for (final key in [
      'profile-history',
      'profile-records',
      'profile-footprint',
      'profile-edit',
      'profile-recommendation-profile',
      'profile-settings',
      'profile-manage-personas',
    ]) {
      expect(find.byKey(Key(key)), findsNothing);
    }
    expect(find.text('Profile & privacy'), findsNothing);
    expect(find.text('Quick access'), findsNothing);
  });

  testWidgets('profile controls precede long My plans content', (tester) async {
    _phone(tester, const Size(375, 812));
    var settingsOpened = false;
    await _mount(
      tester,
      (_) => OwnProfilePage(
        onEditInterests: () async {},
        onEditProfile: () async {},
        onOpenRecommendationProfile: () async {},
        onOpenSettings: () async => settingsOpened = true,
        participationSection: Column(
          children: [
            const Text('My plans'),
            for (var index = 0; index < 30; index++)
              ListTile(title: Text('Saved plan $index')),
          ],
        ),
      ),
    );
    final settings = find.byKey(const Key('profile-settings'));
    await _show(tester, settings);
    expect(settings.hitTestable(), findsOneWidget);
    final plansTop = tester.getTopLeft(find.text('My plans')).dy;
    for (final key in [
      'profile-edit',
      'profile-recommendation-profile',
      'profile-settings',
    ]) {
      expect(tester.getBottomLeft(find.byKey(Key(key))).dy, lessThan(plansTop));
    }
    await tester.tap(settings);
    await _frames(tester);
    expect(settingsOpened, isTrue);
    expect(tester.takeException(), isNull);
  });

  for (final returnAction in ['app bar Back', 'system Back']) {
    testWidgets(
      'app composition opens recommendation profile and rereads after $returnAction',
      (tester) async {
        final profiles = _RecommendationProfiles();
        final prefs = FakeAccountPreferences();
        final container = ProviderContainer(
          overrides: [
            authSessionProvider.overrideWithValue(
              const AsyncData(AuthSessionAuthenticated(subject: 'member-a')),
            ),
            remoteGroupFeaturesEnabledProvider.overrideWithValue(true),
            accountPreferencesRepositoryProvider.overrideWithValue(prefs),
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
            regionRepositoryProvider.overrideWithValue(_PlanningAreas()),
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
        container.read(appRouterProvider).go(AppRoutes.profile);
        await _frames(tester);
        final entry = find.byKey(const Key('profile-recommendation-profile'));
        await _show(tester, entry);
        final profileReads = prefs.profileReadCount;
        final recommendationReads = profiles.reads;
        expect(profileReads, greaterThan(0));
        expect(entry.hitTestable(), findsOneWidget);
        await tester.tap(entry);
        await _frames(tester);
        expect(find.byType(RecommendationProfilePage), findsOneWidget);
        expect(profiles.reads, recommendationReads + 1);
        expect(
          tester
              .widget<ListTile>(
                find.byKey(const Key('recommendation-home-area')),
              )
              .onTap,
          isNotNull,
        );
        expect(find.text('Areas couldn’t be loaded.'), findsNothing);
        if (returnAction == 'app bar Back') {
          await tester.pageBack();
        } else {
          await tester.binding.handlePopRoute();
        }
        await _frames(tester);
        expect(find.byType(RecommendationProfilePage), findsNothing);
        expect(find.byKey(const Key('route-own-profile')), findsOneWidget);
        expect(entry.hitTestable(), findsOneWidget);
        expect(prefs.profileReadCount, profileReads + 1);
        expect(
          container
              .read(appRouterProvider)
              .routeInformationProvider
              .value
              .uri
              .path,
          AppRoutes.profile,
        );
        expect(profiles.saves, 0);
        expect(prefs.profileNames, isEmpty);
        expect(prefs.settingsSaveCount, 0);
        expect(tester.takeException(), isNull);
      },
    );
  }

  for (final size in [const Size(360, 640), const Size(812, 375)]) {
    testWidgets('large text and long identity stay readable at $size', (
      tester,
    ) async {
      _phone(tester, size);
      tester.platformDispatcher.textScaleFactorTestValue = 2.4;
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      final prefs = FakeAccountPreferences()
        ..profile = const OwnProfile(
          username: 'member_with_a_long_username',
          displayName: 'A very long name that needs enough room to wrap',
          visibility: ProfileVisibility.friendsOnly,
          revision: 8,
          details: ProfileDetails(
            bio: 'My own words remain visible with larger text.',
            affiliationType: AffiliationType.school,
            affiliationName: 'A school with a longer name',
            region: '1.3000, 103.8000',
          ),
        );
      await _mount(
        tester,
        (_) => OwnProfilePage(
          onEditInterests: () async {},
          onEditProfile: () async {},
          onOpenSettings: () async {},
          onOpenRecommendationProfile: () async {},
          onOpenHistory: () {},
          onOpenFootprint: () {},
        ),
        prefs: prefs,
        reducedMotion: true,
      );
      final name = find.byKey(const Key('profile-name'));
      expect(tester.widget<Text>(name).maxLines, isNull);
      expect(find.text('1.3000, 103.8000'), findsNothing);
      await _show(tester, find.text('Add a place name in Edit profile'));
      await _show(tester, find.byKey(const Key('profile-history')));
      final historyY = tester
          .getTopLeft(find.byKey(const Key('profile-history')))
          .dy;
      final interestsY = tester
          .getTopLeft(find.byKey(const Key('profile-edit-interests')))
          .dy;
      final footprintY = tester
          .getTopLeft(find.byKey(const Key('profile-footprint')))
          .dy;
      if (size.width == 360) {
        expect(interestsY, greaterThan(historyY));
        expect(interestsY, greaterThan(footprintY));
      }
      await _show(tester, find.byKey(const Key('profile-settings')));
      expect(
        find.byKey(const Key('profile-settings')).hitTestable(),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets(
    'read failures keep working entries and explicit reload recovers',
    (tester) async {
      _phone(tester, const Size(360, 640));
      const failure = AppFailure(
        kind: AppFailureKind.serviceUnavailable,
        message: 'private vendor diagnostics',
      );
      final prefs = FakeAccountPreferences()
        ..profileReads.add(Future.value(const Failure<OwnProfile>(failure)));
      final interests = FakeInterestRepository()
        ..ownResult = const Failure<InterestSelection>(failure);
      var historyOpened = false;
      await _mount(
        tester,
        (_) => OwnProfilePage(
          onEditInterests: () async {},
          onOpenHistory: () => historyOpened = true,
          onOpenSettings: () async {},
        ),
        prefs: prefs,
        interests: interests,
      );
      expect(find.text('Profile could not be loaded.'), findsOneWidget);
      expect(find.text('private vendor diagnostics'), findsNothing);
      await _show(tester, find.byKey(const Key('profile-history')));
      await tester.tap(find.byKey(const Key('profile-history')));
      expect(historyOpened, isTrue);
      await _show(tester, find.text('Reload profile'), delta: -240);
      await tester.tap(find.text('Reload profile'));
      await _frames(tester);
      expect(find.byKey(const Key('profile-name')), findsOneWidget);
      interests.ownResult = const Success(
        InterestSelection(interestTags: [], revision: 2),
      );
      await _show(tester, find.text('Retry'));
      await tester.tap(find.text('Retry'));
      await _frames(tester);
      expect(find.text('Interests could not be loaded.'), findsNothing);
      expect(prefs.profileNames, isEmpty);
      expect(prefs.settingsSaveCount, 0);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'loading profile keeps shortcuts stable until the read completes',
    (tester) async {
      final pending = Completer<Result<OwnProfile>>();
      final prefs = FakeAccountPreferences()..profileReads.add(pending.future);
      await _mount(
        tester,
        (_) => OwnProfilePage(
          onEditInterests: () async {},
          onOpenSettings: () async {},
        ),
        prefs: prefs,
      );
      expect(find.byKey(const Key('profile-name')), findsNothing);
      expect(find.byKey(const Key('profile-edit-interests')), findsOneWidget);
      pending.complete(Success(prefs.profile));
      await _frames(tester);
      expect(find.byKey(const Key('profile-name')), findsOneWidget);
      expect(prefs.profileNames, isEmpty);
    },
  );
}

final class _RecommendationProfiles implements RecommendationProfileRepository {
  int reads = 0, saves = 0;

  @override
  Future<Result<RecommendationProfile>> read() async {
    reads++;
    return const Success(RecommendationProfile(revision: 3));
  }

  @override
  Future<Result<RecommendationProfile>> save(
    RecommendationProfile value,
  ) async {
    saves++;
    return Success(value);
  }
}

final class _PlanningAreas implements RegionRepository {
  @override
  Future<List<PlanningArea>> catalogue() async => const [
    PlanningArea(
      code: 'TM',
      name: 'Tampines',
      regionCode: 'ER',
      regionName: 'East Region',
    ),
  ];

  @override
  Future<Result<PlanningArea>> locate() async => const Failure(
    AppFailure(
      kind: AppFailureKind.serviceUnavailable,
      message: 'Location is outside this navigation test.',
    ),
  );
}

void _phone(WidgetTester tester, Size size) {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}

Future<void> _mount(
  WidgetTester tester,
  WidgetBuilder page, {
  FakeAccountPreferences? prefs,
  FakeInterestRepository? interests,
  bool reducedMotion = false,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        authSessionProvider.overrideWithValue(
          const AsyncData(AuthSessionAuthenticated(subject: 'member-a')),
        ),
        accountPreferencesRepositoryProvider.overrideWithValue(
          prefs ?? FakeAccountPreferences(),
        ),
        accountRepositoryProvider.overrideWithValue(
          FakeAccountRepository()
            ..statusResult = Success(
              OnboardingCompleted(testAccount(username: 'member_a')),
            ),
        ),
        interestRepositoryProvider.overrideWithValue(
          interests ?? FakeInterestRepository(),
        ),
      ],
      child: MaterialApp(
        theme: enmoriTheme(),
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context)
              .copyWith(disableAnimations: reducedMotion),
          child: child!,
        ),
        home: Builder(builder: page),
      ),
    ),
  );
  await _frames(tester);
}

Future<void> _show(
  WidgetTester tester,
  Finder finder, {
  double delta = 240,
}) async {
  if (finder.evaluate().isEmpty) {
    await tester.scrollUntilVisible(
      finder,
      delta,
      scrollable: find.byType(Scrollable).first,
    );
  }
  await tester.ensureVisible(finder);
  await tester.pump();
}

Future<void> _frames(WidgetTester tester) async {
  for (var index = 0; index < 8; index++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}
