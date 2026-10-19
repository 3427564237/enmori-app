import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:enmori/app/app.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/account_preferences_providers.dart';
import 'package:enmori/features/account/account_providers.dart';
import 'package:enmori/features/account/domain/account_preferences_repository.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/account/presentation/account_preferences_controller.dart';
import 'package:enmori/features/account/presentation/account_preferences_page.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/interests/interests_providers.dart';
import 'package:enmori/features/event_recommendations/event_recommendations_providers.dart';

import '../support/fakes.dart';
import '../support/fake_account_preferences.dart';

void main() {
  for (final key in ['profile-bio', 'profile-region']) {
    testWidgets('$key draft is guarded and discard never saves', (
      tester,
    ) async {
      final h = await start(tester);
      await tap(tester, 'profile-edit');
      await tester.ensureVisible(find.byKey(Key(key)));
      await tester.enterText(find.byKey(Key(key)), 'Unsaved field');
      await frames(tester);
      await tester.pageBack();
      await frames(tester);
      expect(find.text('Leave without saving?'), findsOneWidget);
      await tester.tap(find.text('Stay'));
      await frames(tester);
      expect(find.text('Unsaved field'), findsOneWidget);
      await tester.pageBack();
      await frames(tester);
      await tester.tap(find.text('Discard changes'));
      await frames(tester);
      expect(find.byKey(const Key('route-profile-edit')), findsNothing);
      expect(h.prefs.profileNames, isEmpty);
    });
  }
  testWidgets(
    'map-sharing draft is guarded without saving consent or privacy',
    (tester) async {
      final h = await start(tester);
      await tap(tester, 'profile-settings');
      await tap(tester, 'settings-map-sharing');
      await tester.pageBack();
      await frames(tester);
      expect(find.text('Leave without saving?'), findsOneWidget);
      await tester.tap(find.text('Discard changes'));
      await frames(tester);
      expect(h.prefs.settingsSaveCount, 0);
      expect(h.prefs.settings.fieldPrivacy.mapSharedWithFriends, isFalse);
    },
  );
  testWidgets('old signout feedback cannot enter a replacement Settings form', (
    tester,
  ) async {
    final auth = FakeAuthRepository();
    final prefs = FakeAccountPreferences();
    final signout = Completer<Result<void>>();
    addTearDown(auth.close);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(auth),
          accountPreferencesRepositoryProvider.overrideWithValue(prefs),
        ],
        child: MaterialApp(
          home: AccountPreferencesPage(
            view: PreferencesView.settings,
            onSignOut: () => signout.future,
          ),
        ),
      ),
    );
    await tester.pump();
    auth.emit(AuthSessionAuthenticated(subject: 'member-a'));
    await frames(tester);
    await tap(tester, 'settings-sign-out');
    expect(
      tester
          .widget<OutlinedButton>(find.byKey(const Key('settings-sign-out')))
          .onPressed,
      isNull,
    );
    auth.emit(AuthSessionAuthenticated(subject: 'member-a'));
    await frames(tester);
    expect(
      tester
          .widget<OutlinedButton>(find.byKey(const Key('settings-sign-out')))
          .onPressed,
      isNotNull,
    );
    signout.complete(
      const Failure(
        AppFailure(
          kind: AppFailureKind.serviceUnavailable,
          message: 'Synthetic old signout refusal',
        ),
      ),
    );
    await frames(tester);
    expect(find.text('Could not sign out. Try again.'), findsNothing);
    expect(auth.watchCount, 1);
    expect(tester.takeException(), isNull);
  });

  testWidgets('same-UID replacement reloads Profile and discards its draft', (
    tester,
  ) async {
    final h = await start(tester);
    await tap(tester, 'profile-edit');
    await tester.enterText(
      find.byKey(const Key('profile-display-name')),
      'Previous session draft',
    );
    h.prefs.profile = const OwnProfile(
      username: 'member_a',
      displayName: 'Current session',
      visibility: ProfileVisibility.public,
      revision: 0,
    );
    h.auth.emit(AuthSessionAuthenticated(subject: 'member-a'));
    await frames(tester);
    expect(find.text('Previous session draft'), findsNothing);
    expect(find.text('Current session'), findsOneWidget);
    expect(
      tester
          .widget<DropdownButton<ProfileVisibility>>(
            find.byKey(const Key('profile-visibility')),
          )
          .value,
      ProfileVisibility.public,
    );
    expect(h.prefs.profileNames, isEmpty);
    expect(h.auth.watchCount, 1);
  });

  testWidgets('same-UID replacement discards unsaved Settings choices', (
    tester,
  ) async {
    final h = await start(tester);
    await tap(tester, 'profile-settings');
    await tap(tester, 'settings-consent');
    h.prefs.settings = const OwnSettings(
      checkInVisibility: CheckInVisibility.friendsOnly,
      consent: OptionalProcessingConsent.rejected,
      revision: 0,
    );
    h.auth.emit(AuthSessionAuthenticated(subject: 'member-a'));
    await frames(tester);
    expect(
      tester
          .widget<DropdownButton<CheckInVisibility>>(
            find.byKey(const Key('settings-visibility')),
          )
          .value,
      CheckInVisibility.friendsOnly,
    );
    expect(
      tester
          .widget<SwitchListTile>(find.byKey(const Key('settings-consent')))
          .value,
      isFalse,
    );
    expect(h.prefs.settingsSaveCount, 0);
    await tap(tester, 'settings-save');
    expect(h.prefs.settings.checkInVisibility, CheckInVisibility.friendsOnly);
    expect(h.prefs.settings.consent, OptionalProcessingConsent.rejected);
    expect(h.prefs.settingsSaveCount, 1);
  });

  testWidgets('late Profile save cannot mark a replacement session saved', (
    tester,
  ) async {
    final h = await start(tester);
    await tap(tester, 'profile-edit');
    final pending = h.prefs.pendingSave = Completer<Result<OwnProfile>>();
    await tap(tester, 'profile-save');
    h.auth.emit(AuthSessionAuthenticated(subject: 'member-a'));
    await frames(tester);
    final replacementSave = tester
        .widget<FilledButton>(find.byKey(const Key('profile-save')))
        .onPressed;
    final reads = h.prefs.profileReadCount;
    pending.complete(
      const Success(
        OwnProfile(
          username: 'member_a',
          displayName: 'Old save result',
          visibility: ProfileVisibility.public,
          revision: 1,
        ),
      ),
    );
    await frames(tester);
    expect(find.byKey(const Key('preferences-save-success')), findsNothing);
    expect(replacementSave, isNotNull);
    expect(find.text('Old save result'), findsNothing);
    expect(h.prefs.profileReadCount, reads);
    expect(h.prefs.profileNames, hasLength(1));
    expect(tester.takeException(), isNull);
  });

  testWidgets('late Profile read cannot replace the new session snapshot', (
    tester,
  ) async {
    final h = await start(tester);
    await tap(tester, 'profile-edit');
    final container = ProviderScope.containerOf(
      tester.element(find.byKey(const Key('profile-display-name'))),
    );
    final pending = Completer<Result<OwnProfile>>();
    h.prefs.profileReads.add(pending.future);
    final loading = container
        .read(
          accountPreferencesControllerProvider(PreferencesView.profile)
              .notifier,
        )
        .load();
    await tester.pump();
    h.prefs.profile = const OwnProfile(
      username: 'member_a',
      displayName: 'New session read',
      visibility: ProfileVisibility.private,
      revision: 0,
    );
    h.auth.emit(AuthSessionAuthenticated(subject: 'member-a'));
    await frames(tester);
    final replacementWasLoaded = find
        .text('New session read')
        .evaluate()
        .isNotEmpty;
    pending.complete(
      const Success(
        OwnProfile(
          username: 'member_a',
          displayName: 'Old delayed read',
          visibility: ProfileVisibility.public,
          revision: 2,
        ),
      ),
    );
    await loading;
    await frames(tester);
    expect(find.text('Old delayed read'), findsNothing);
    expect(replacementWasLoaded, isTrue);
    expect(find.text('New session read'), findsOneWidget);
    expect(h.prefs.profileNames, isEmpty);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'Profile editor saves then rereads canonical fields; unsaved Back never writes',
    (tester) async {
      final h = await start(tester);
      await tap(tester, 'profile-edit');
      await tester.enterText(
        find.byKey(const Key('profile-display-name')),
        ' Alex ',
      );
      await tap(tester, 'profile-save');
      expect(find.text('Profile saved.'), findsOneWidget);
      expect(h.prefs.profileNames, [' Alex ']);
      expect(h.prefs.profileReadCount, greaterThanOrEqualTo(3));
      await tester.pageBack();
      await frames(tester);
      expect(find.text('Alex'), findsOneWidget);
      await tap(tester, 'profile-edit');
      await tester.enterText(
        find.byKey(const Key('profile-display-name')),
        'Unsaved',
      );
      await tester.pump();
      await tester.pageBack();
      await frames(tester);
      expect(find.text('Leave without saving?'), findsOneWidget);
      await tester.tap(find.text('Stay'));
      await frames(tester);
      expect(find.text('Unsaved'), findsOneWidget);
      await tester.pageBack();
      await frames(tester);
      await tester.tap(find.text('Discard changes'));
      await frames(tester);
      expect(h.prefs.profileNames.length, 1);
      expect(find.text('Unsaved'), findsNothing);
    },
  );
  testWidgets(
    'Settings independently saves Friends-only with rejected optional processing',
    (tester) async {
      final h = await start(tester);
      await tap(tester, 'profile-settings');
      await tap(tester, 'settings-visibility');
      await tester.tap(find.text('Friends only').last);
      await frames(tester);
      await tap(tester, 'settings-save');
      expect(find.text('Settings saved.'), findsOneWidget);
      expect(h.prefs.settings.checkInVisibility, CheckInVisibility.friendsOnly);
      expect(h.prefs.settings.consent, OptionalProcessingConsent.rejected);
      expect(h.prefs.profile.visibility, ProfileVisibility.private);
      await tap(tester, 'settings-consent');
      await tap(tester, 'settings-save');
      expect(h.prefs.settings.consent, OptionalProcessingConsent.accepted);
      expect(h.prefs.settings.checkInVisibility, CheckInVisibility.friendsOnly);
      expect(h.prefs.settingsSaveCount, 2);
    },
  );
  testWidgets('unsaved Settings changes require an explicit discard', (
    tester,
  ) async {
    await start(tester);
    await tap(tester, 'profile-settings');
    await tap(tester, 'settings-consent');
    await tester.pageBack();
    await frames(tester);
    expect(find.text('Leave without saving?'), findsOneWidget);
    await tester.tap(find.text('Stay'));
    await frames(tester);
    expect(find.byKey(const Key('route-settings')), findsOneWidget);
    expect(
      tester
          .widget<SwitchListTile>(find.byKey(const Key('settings-consent')))
          .value,
      isTrue,
    );
    await tester.pageBack();
    await frames(tester);
    await tester.tap(find.text('Discard changes'));
    await frames(tester);
    expect(find.byKey(const Key('route-settings')), findsNothing);
  });
  testWidgets('stale save requires explicit reload and emits no success', (
    tester,
  ) async {
    final h = await start(tester);
    await tap(tester, 'profile-edit');
    h.prefs.saveFailure = const AppFailure(
      kind: AppFailureKind.profileRevisionPreconditionFailed,
      message: 'private vendor detail',
    );
    await tap(tester, 'profile-save');
    expect(find.byKey(const Key('preferences-save-success')), findsNothing);
    expect(find.text('private vendor detail'), findsNothing);
    expect(
      tester
          .widget<FilledButton>(find.byKey(const Key('profile-save')))
          .onPressed,
      isNull,
    );
    h.prefs.profile = const OwnProfile(
      username: 'member_a',
      displayName: 'Current',
      visibility: ProfileVisibility.public,
      revision: 5,
    );
    h.prefs.saveFailure = null;
    await tap(tester, 'preferences-reload');
    expect(find.text('Current'), findsOneWidget);
    await tap(tester, 'profile-save');
    expect(h.prefs.profileRevisions, [0, 5]);
  });
  testWidgets(
    'invalid input retains edits; uncertain commit never retries without reload',
    (tester) async {
      final h = await start(tester);
      await tap(tester, 'profile-edit');
      await tester.enterText(
        find.byKey(const Key('profile-display-name')),
        'Draft',
      );
      h.prefs.saveFailure = const AppFailure(
        kind: AppFailureKind.profileInvalid,
        message: 'private vendor detail',
      );
      await tap(tester, 'profile-save');
      expect(find.text('Draft'), findsOneWidget);
      expect(
        tester
            .widget<FilledButton>(find.byKey(const Key('profile-save')))
            .onPressed,
        isNotNull,
      );
      // The server may have committed even when the response was lost.
      h.prefs.profile = const OwnProfile(
        username: 'member_a',
        displayName: 'Committed',
        visibility: ProfileVisibility.private,
        revision: 1,
      );
      h.prefs.saveFailure = const AppFailure(
        kind: AppFailureKind.serviceUnavailable,
        message: 'private vendor detail',
      );
      await tap(tester, 'profile-save');
      await frames(tester);
      expect(find.byKey(const Key('preferences-save-success')), findsNothing);
      expect(find.text('private vendor detail'), findsNothing);
      expect(h.prefs.profileRevisions, [0, 0]);
      expect(
        tester
            .widget<FilledButton>(find.byKey(const Key('profile-save')))
            .onPressed,
        isNull,
      );
      await tap(tester, 'preferences-reload');
      expect(find.text('Committed'), findsOneWidget);
      expect(h.prefs.profileRevisions, [0, 0]);
      h.prefs.saveFailure = null;
      await tap(tester, 'profile-save');
      expect(h.prefs.profileRevisions, [0, 0, 1]);
    },
  );
  testWidgets(
    'successful mutation followed by read failure is not reported saved; reload recovers',
    (tester) async {
      final h = await start(tester);
      await tap(tester, 'profile-edit');
      h.prefs.profileReads.add(
        Future.value(
          const Failure(
            AppFailure(
              kind: AppFailureKind.serviceUnavailable,
              message: 'raw detail',
            ),
          ),
        ),
      );
      await tap(tester, 'profile-save');
      expect(find.byKey(const Key('preferences-save-success')), findsNothing);
      expect(find.byKey(const Key('preferences-reload')), findsOneWidget);
      expect(find.text('raw detail'), findsNothing);
      await tap(tester, 'preferences-reload');
      expect(h.prefs.profile.revision, 1);
    },
  );
  testWidgets(
    'disposed pending save cannot update another account or restore the old route',
    (tester) async {
      final h = await start(tester);
      await tap(tester, 'profile-edit');
      h.prefs.pendingSave = Completer<Result<OwnProfile>>();
      await tap(tester, 'profile-save');
      expect(
        tester
            .widget<FilledButton>(find.byKey(const Key('profile-save')))
            .onPressed,
        isNull,
      );
      h.auth.emit(const AuthSessionAuthenticated(subject: 'member-b'));
      await frames(tester);
      expect(find.byKey(const Key('route-home')), findsOneWidget);
      h.prefs.pendingSave!.complete(
        const Success(
          OwnProfile(
            username: 'member_a',
            displayName: 'Old result',
            visibility: ProfileVisibility.public,
            revision: 1,
          ),
        ),
      );
      await frames(tester);
      expect(find.text('Old result'), findsNothing);
      expect(find.byKey(const Key('route-profile-edit')), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'signout failure retains session; successful observed signout reaches Sign in',
    (tester) async {
      final h = await start(tester);
      await tap(tester, 'profile-settings');
      h.auth.signOutResult = const Failure(
        AppFailure(
          kind: AppFailureKind.serviceUnavailable,
          message: 'raw detail',
        ),
      );
      await tap(tester, 'settings-sign-out');
      expect(find.text('Could not sign out. Try again.'), findsOneWidget);
      expect(find.byKey(const Key('route-settings')), findsOneWidget);
      h.auth.signOutResult = const Success(null);
      await tap(tester, 'settings-sign-out');
      expect(find.byKey(const Key('route-sign-in')), findsOneWidget);
      expect(find.byKey(const Key('route-settings')), findsNothing);
      expect(h.auth.signOutCount, 2);
      expect(h.auth.watchCount, 1);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets('Settings remains reachable on a small phone with 2x text', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(360, 640);
    tester.view.devicePixelRatio = 1;
    tester.platformDispatcher.textScaleFactorTestValue = 2;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    await start(tester);
    await tap(tester, 'profile-settings');
    await tap(tester, 'settings-save');
    expect(find.byKey(const Key('preferences-save-success')), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}

Future<({FakeAccountPreferences prefs, FakeAuthRepository auth})> start(
  WidgetTester tester,
) async {
  final auth = FakeAuthRepository();
  final prefs = FakeAccountPreferences();
  final accounts = FakeAccountRepository()
    ..statusResult = Success(
      OnboardingCompleted(testAccount(username: 'member_a')),
    );
  final container = ProviderContainer(
    overrides: [
      authRepositoryProvider.overrideWithValue(auth),
      accountRepositoryProvider.overrideWithValue(accounts),
      accountPreferencesRepositoryProvider.overrideWithValue(prefs),
      interestRepositoryProvider.overrideWithValue(FakeInterestRepository()),
      eventRecommendationRepositoryProvider.overrideWithValue(
        FakeEventRecommendationRepository(),
      ),
    ],
  );
  addTearDown(auth.close);
  addTearDown(container.dispose);
  await tester.pumpWidget(
    UncontrolledProviderScope(container: container, child: const EnmoriApp()),
  );
  await tester.pump();
  auth.emit(const AuthSessionAuthenticated(subject: 'member-a'));
  await frames(tester);
  await tap(tester, 'my-profile-button');
  return (prefs: prefs, auth: auth);
}

Future<void> frames(WidgetTester tester) async {
  for (var i = 0; i < 8; i++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}

Future<void> tap(WidgetTester tester, String key) async {
  final finder = find.byKey(Key(key));
  if (finder.evaluate().isEmpty) {
    await tester.scrollUntilVisible(
      finder,
      200,
      scrollable: find.byType(Scrollable).first,
    );
  }
  await tester.ensureVisible(finder);
  await tester.pump();
  await tester.tap(finder);
  await frames(tester);
}
