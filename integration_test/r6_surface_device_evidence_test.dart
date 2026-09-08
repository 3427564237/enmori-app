import 'package:enmori/app/home_shell_page.dart';
import 'package:enmori/core/network/idempotency_key_provider.dart';
import 'package:enmori/features/account/account_providers.dart';
import 'package:enmori/features/account/presentation/onboarding_page.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/presentation/registration_page.dart';
import 'package:enmori/features/check_in/check_in_providers.dart';
import 'package:enmori/features/check_in/presentation/check_in_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import '../test/support/fakes.dart';

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('R7 bounded Android evidence covers six approved R6 pages', (
    tester,
  ) async {
    await binding.convertFlutterSurfaceToImage();

    await _pumpEvidencePage(tester, const RegistrationPage());
    expect(find.byKey(const Key('route-register')), findsOneWidget);
    expect(find.byKey(const Key('r6-register-email')), findsOneWidget);
    expect(find.byKey(const Key('r6-register-password')), findsOneWidget);
    expect(find.byKey(const Key('r6-register-submit')), findsOneWidget);
    await _screenshot(binding, 'r7_01_m02_registration');

    await _pumpOnboardingToPurpose(tester);
    expect(
      find.byKey(const Key('r6-initial-choice-purpose-copy')),
      findsOneWidget,
    );
    await _screenshot(binding, 'r7_02_m06_initial_choice_information');

    await _tapByKey(tester, const Key('r6-initial-choice-info-continue'));
    await tester.pumpAndSettle();
    expect(find.text('Choose your initial settings'), findsOneWidget);
    expect(
      find.bySemanticsLabel(RegExp('Accept.*optional processing.*Public')),
      findsWidgets,
    );
    expect(
      find.bySemanticsLabel(RegExp('Reject.*optional processing.*Private')),
      findsWidgets,
    );
    await _screenshot(binding, 'r7_03_m07_paired_initial_choice');

    await _pumpEvidencePage(tester, HomeShellPage(onStartCheckIn: () {}));
    expect(find.byKey(const Key('route-home')), findsOneWidget);
    expect(find.byKey(const Key('r6-new-check-in-button')), findsOneWidget);
    await _screenshot(binding, 'r7_04_m08_home_shell');

    final checkIn = FakeCheckInRepository();
    await _pumpEvidencePage(
      tester,
      CheckInComposerPage(onReturnHome: () {}),
      checkIn: checkIn,
    );
    expect(find.byKey(const Key('route-check-in')), findsOneWidget);
    expect(find.text('Save Check-in'), findsOneWidget);
    await _screenshot(binding, 'r7_05_m19_note_only_check_in');

    await tester.enterText(
      find.byKey(const Key('r6-check-in-note')),
      'Sanitized Android evidence note.',
    );
    await _tapByKey(tester, const Key('r6-check-in-create'));
    await tester.pumpAndSettle();
    await _tapByKey(tester, const Key('r6-check-in-confirm'));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('r6-check-in-confirmed')), findsOneWidget);
    expect(find.text('Saved Check-in confirmed.'), findsOneWidget);
    expect(find.text('Return Home'), findsOneWidget);
    await _screenshot(binding, 'r7_06_m20_saved_check_in_confirmed');
  });
}

Future<void> _pumpOnboardingToPurpose(WidgetTester tester) async {
  await _pumpEvidencePage(tester, OnboardingPage(onCompleted: () {}));
  await tester.enterText(
    find.byKey(const Key('r6-onboarding-username')),
    'du_kun',
  );
  await _tapByKey(tester, const Key('r6-onboarding-username-continue'));
  await tester.pumpAndSettle();
}

Future<void> _pumpEvidencePage(
  WidgetTester tester,
  Widget page, {
  FakeAuthRepository? auth,
  FakeAccountRepository? account,
  FakeCheckInRepository? checkIn,
}) async {
  final authRepo = auth ?? FakeAuthRepository();
  addTearDown(authRepo.close);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        authRepositoryProvider.overrideWithValue(authRepo),
        accountRepositoryProvider.overrideWithValue(
          account ?? FakeAccountRepository(),
        ),
        checkInRepositoryProvider.overrideWithValue(
          checkIn ?? FakeCheckInRepository(),
        ),
        idempotencyKeyGeneratorProvider.overrideWithValue(
          FakeIdempotencyKeyGenerator(['r7-device-key', 'r7-confirm-key']),
        ),
      ],
      child: MaterialApp(theme: ThemeData(useMaterial3: true), home: page),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> _tapByKey(WidgetTester tester, Key key) async {
  final finder = find.byKey(key, skipOffstage: false);
  await tester.ensureVisible(finder);
  await tester.pump();
  await tester.tap(finder);
}

Future<void> _screenshot(
  IntegrationTestWidgetsFlutterBinding binding,
  String name,
) async {
  await binding.takeScreenshot(name);
}
