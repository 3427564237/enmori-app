import 'package:enmori/app/providers.dart';
import 'package:enmori/app/router/app_router.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/harness/social/offline_setup_auth_repository.dart';
import 'package:enmori/harness/social/offline_social_app.dart';
import 'package:enmori/harness/social/offline_social_pages.dart';
import 'package:enmori/harness/social/offline_social_store.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

Future<void> tap(WidgetTester tester, String key) async {
  final target = find.byKey(Key(key));
  if (target.evaluate().isEmpty) {
    await tester.scrollUntilVisible(target, 200, scrollable: _pageScroll());
  }
  await tester.ensureVisible(target);
  await tester.pumpAndSettle();
  await tester.tap(target);
  await tester.pumpAndSettle();
}

Finder _pageScroll() => find
    .descendant(
      of: find.byKey(const Key('route-onboarding')),
      matching: find.byType(Scrollable),
    )
    .first;

Future<void> start(
  WidgetTester tester,
  OfflineSocialStore store, {
  OfflineSetupAuthRepository? auth,
  double width = 390,
  double textScale = 1,
}) async {
  tester.view.physicalSize = Size(width, 844);
  tester.view.devicePixelRatio = 1;
  tester.platformDispatcher.textScaleFactorTestValue = textScale;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
  await tester.pumpWidget(
    OfflineSocialApp(store: store, accountSetup: true, setupAuth: auth),
  );
  await tester.pumpAndSettle();
}

Future<void> register(WidgetTester tester) async {
  await tester.enterText(
    find.byKey(const Key('r6-register-email')),
    'sample@example.invalid',
  );
  await tester.enterText(
    find.byKey(const Key('r6-register-password')),
    'SampleOnly123',
  );
  await tester.enterText(
    find.byKey(const Key('r6-register-confirm-password')),
    'SampleOnly123',
  );
  await tap(tester, 'register-terms');
  await tap(tester, 'r6-register-submit');
}

Future<void> choose(WidgetTester tester, InitialChoice choice) async {
  if (find.byKey(const Key('r6-onboarding-username')).evaluate().isEmpty) {
    await tester.scrollUntilVisible(
      find.byKey(const Key('r6-onboarding-username')),
      200,
      scrollable: _pageScroll(),
    );
  }
  await tester.enterText(
    find.byKey(const Key('r6-onboarding-username')),
    'sample_member',
  );
  await tap(tester, 'r6-onboarding-username-continue');
  await tap(tester, 'r6-initial-choice-info-continue');
  await tap(tester, 'r6-initial-choice-${choice.name}');
}

void main() {
  testWidgets(
    'rejected Username can be corrected and completed on a narrow large-text display',
    (tester) async {
      final store = OfflineSocialStore(onboardingCompleted: false);
      addTearDown(store.dispose);
      await start(tester, store, width: 320, textScale: 1.5);
      await register(tester);
      expect(find.byKey(const Key('route-onboarding')), findsOneWidget);
      await tester.scrollUntilVisible(
        find.byKey(const Key('r6-onboarding-username')),
        200,
        scrollable: _pageScroll(),
      );
      await tester.enterText(
        find.byKey(const Key('r6-onboarding-username')),
        'admin',
      );
      await tap(tester, 'r6-onboarding-username-continue');
      await tap(tester, 'r6-initial-choice-info-continue');
      await tap(tester, 'r6-initial-choice-reject');
      await tester.scrollUntilVisible(
        find.byKey(const Key('r6-onboarding-failure')),
        200,
        scrollable: _pageScroll(),
      );
      expect(find.byKey(const Key('r6-onboarding-failure')), findsOneWidget);
      expect(store.onboardingCompleted, isFalse);
      await tester.scrollUntilVisible(
        find.byKey(const Key('r6-onboarding-change-username')),
        200,
        scrollable: _pageScroll(),
      );
      await tester.pumpAndSettle();
      expect(
        find.byKey(const Key('r6-onboarding-change-username')),
        findsOneWidget,
      );
      await tap(tester, 'r6-onboarding-change-username');
      await choose(tester, InitialChoice.reject);
      expect(find.byType(OfflineSocialHub), findsOneWidget);
      expect(store.profile.username, 'sample_member');
      expect(store.settings.consent, OptionalProcessingConsent.rejected);
      expect(tester.takeException(), isNull);
    },
  );
  for (final choice in InitialChoice.values) {
    testWidgets(
      'sample ${choice.name} setup reaches social Home and preserves the chosen settings on reentry',
      (tester) async {
        final store = OfflineSocialStore(onboardingCompleted: false);
        addTearDown(store.dispose);
        await start(tester, store);
        expect(find.byKey(const Key('route-register')), findsOneWidget);
        expect(find.byType(OfflineSocialHub), findsNothing);
        await register(tester);
        expect(find.byKey(const Key('route-onboarding')), findsOneWidget);
        expect(
          find.text('Account request submitted. Waiting for session.'),
          findsNothing,
        );
        await choose(tester, choice);
        expect(find.byType(OfflineSocialHub), findsOneWidget);
        expect(store.profile.username, 'sample_member');
        expect(
          store.settings.consent,
          choice == InitialChoice.accept
              ? OptionalProcessingConsent.accepted
              : OptionalProcessingConsent.rejected,
        );
        expect(store.settings.checkInVisibility, CheckInVisibility.private);
        expect(store.notes.single.checkInVisibility, CheckInVisibility.private);
        final container = ProviderScope.containerOf(
          tester.element(find.byType(OfflineSocialHub)),
        );
        expect(container.read(backendBaseUriProvider), isNull);
        await tap(tester, 'social-settings');
        await tap(tester, 'settings-sign-out');
        expect(find.byKey(const Key('route-sign-in')), findsOneWidget);
        expect(find.byType(OfflineSocialHub), findsNothing);
        await tester.enterText(
          find.byKey(const Key('sign-in-email')),
          'sample@example.invalid',
        );
        await tester.enterText(
          find.byKey(const Key('sign-in-password')),
          'SampleOnly123',
        );
        await tap(tester, 'sign-in-submit');
        expect(find.byType(OfflineSocialHub), findsOneWidget);
        expect(find.byKey(const Key('route-onboarding')), findsNothing);
        expect(store.profile.username, 'sample_member');
        expect(tester.takeException(), isNull);
      },
    );
  }

  testWidgets(
    'command success alone cannot bypass observed Auth or incomplete onboarding',
    (tester) async {
      final store = OfflineSocialStore(onboardingCompleted: false);
      final auth = OfflineSetupAuthRepository(automaticallyObserve: false);
      addTearDown(store.dispose);
      addTearDown(auth.dispose);
      await start(tester, store, auth: auth);
      await register(tester);
      expect(find.byKey(const Key('route-register')), findsOneWidget);
      expect(find.byKey(const Key('route-onboarding')), findsNothing);
      expect(store.onboardingCompleted, isFalse);
      final container = ProviderScope.containerOf(
        tester.element(find.byKey(const Key('route-register'))),
      );
      container.read(appRouterProvider).go(AppRoutes.home);
      await tester.pumpAndSettle();
      expect(find.byType(OfflineSocialHub), findsNothing);
      expect(await auth.getIdToken(), isA<Failure<String>>());
      auth.observeSampleSession();
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('route-onboarding')), findsOneWidget);
      container.read(appRouterProvider).go(AppRoutes.settings);
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('route-onboarding')), findsOneWidget);
      expect(find.byKey(const Key('settings-sign-out')), findsNothing);
      final sampleToken = (await auth.getIdToken() as Success<String>).value;
      expect(sampleToken, startsWith('synthetic-ai-token-'));
      expect(sampleToken.contains('.'), isFalse);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'same-UID session replacement removes a dirty leaf and its old router',
    (tester) async {
      final store = OfflineSocialStore();
      final auth = OfflineSetupAuthRepository(automaticallyObserve: false);
      addTearDown(store.dispose);
      addTearDown(auth.dispose);
      await start(tester, store, auth: auth);
      auth.observeSampleSession();
      await tester.pumpAndSettle();
      final container = ProviderScope.containerOf(
        tester.element(find.byType(OfflineSocialHub)),
      );
      final oldRouter = container.read(appRouterProvider);
      oldRouter.push<void>(AppRoutes.profileEdit);
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const Key('profile-display-name')),
        'Unsaved sample',
      );
      auth.observeSampleSession();
      await tester.pumpAndSettle();
      expect(identical(container.read(appRouterProvider), oldRouter), isFalse);
      expect(find.byType(OfflineSocialHub), findsOneWidget);
      expect(find.byKey(const Key('profile-display-name')), findsNothing);
      expect(store.profile.displayName, 'Your Name');
      expect(container.read(appRouterProvider).canPop(), isFalse);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'registration validation remains visible and does not create a sample account',
    (tester) async {
      final store = OfflineSocialStore(onboardingCompleted: false);
      addTearDown(store.dispose);
      await start(tester, store, width: 320, textScale: 1.5);
      await tap(tester, 'register-terms');
      await tap(tester, 'r6-register-submit');
      expect(
        find.byKey(const Key('sp01-register-error-summary')),
        findsOneWidget,
      );
      expect(store.onboardingCompleted, isFalse);
      expect(store.onboardingReceipt, isNull);
      await tap(tester, 'register-sign-in');
      expect(find.text('Leave registration?'), findsOneWidget);
      await tester.tap(find.text('Discard details'));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('route-sign-in')), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  test(
    'reserved usernames and replay conflicts cannot mutate the sample setup',
    () async {
      final store = OfflineSocialStore(onboardingCompleted: false);
      addTearDown(store.dispose);
      final repo = OfflineAccountRepository(store);
      const key = 'sample_onboarding_key_001';
      for (final name in ['admin', 'enmori_sample', 'bad__name']) {
        final result = await repo.completeOnboarding(
          username: name,
          initialChoice: InitialChoice.accept,
          idempotencyKey: key,
        );
        expect(
          (result as Failure<ProductAccount>).failure.kind,
          AppFailureKind.usernameInvalid,
        );
        expect(store.onboardingCompleted, isFalse);
      }
      final created = await repo.completeOnboarding(
        username: ' Sample_Member ',
        initialChoice: InitialChoice.reject,
        idempotencyKey: key,
      );
      final replay = await repo.completeOnboarding(
        username: 'sample_member',
        initialChoice: InitialChoice.reject,
        idempotencyKey: key,
      );
      expect(
        (created as Success<ProductAccount>).value.username,
        'sample_member',
      );
      expect(
        identical(created.value, (replay as Success<ProductAccount>).value),
        isTrue,
      );
      final conflict = await repo.completeOnboarding(
        username: 'sample_member',
        initialChoice: InitialChoice.accept,
        idempotencyKey: key,
      );
      expect(
        (conflict as Failure<ProductAccount>).failure.kind,
        AppFailureKind.idempotencyConflict,
      );
      expect(store.settings.consent, OptionalProcessingConsent.rejected);
      final replacement = await repo.completeOnboarding(
        username: 'other_member',
        initialChoice: InitialChoice.accept,
        idempotencyKey: '${key}2',
      );
      expect(
        (replacement as Failure<ProductAccount>).failure.kind,
        AppFailureKind.onboardingConflict,
      );
      expect(store.profile.username, 'sample_member');
    },
  );

  test('signout invalidates a queued sample observation', () async {
    final auth = OfflineSetupAuthRepository();
    addTearDown(auth.dispose);
    final command = auth.register(
      email: 'sample@example.invalid',
      password: 'SampleOnly123',
    );
    final signOut = auth.signOut();
    await command;
    await signOut;
    expect(await auth.watchSession().first, isA<AuthSessionUnauthenticated>());
  });
}
