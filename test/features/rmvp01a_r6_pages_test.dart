import 'package:enmori/app/home_shell_page.dart';
import 'package:enmori/app/route_status_pages.dart';
import 'package:enmori/core/network/idempotency_key_provider.dart';
import 'package:enmori/features/account/account_providers.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/account/presentation/onboarding_page.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/presentation/registration_page.dart';
import 'package:enmori/features/check_in/check_in_providers.dart';
import 'package:enmori/features/check_in/presentation/check_in_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fakes.dart';

void main() {
  testWidgets('R6 surfaces render in portrait and landscape bounds', (tester) async {
    for (final size in [const Size(360, 800), const Size(800, 360)]) {
      await _withViewport(tester, size, () async {
        await _pumpR6Page(tester, const StartupPage());
        expect(find.byKey(const Key('route-startup')), findsOneWidget);
        expect(tester.takeException(), isNull);

        await _pumpR6Page(tester, const RegistrationPage());
        expect(find.byKey(const Key('route-register')), findsOneWidget);
        expect(tester.takeException(), isNull);

        await _pumpR6Page(tester, OnboardingPage(onCompleted: () {}));
        expect(find.byKey(const Key('route-onboarding')), findsOneWidget);
        expect(tester.takeException(), isNull);

        await _pumpR6Page(tester, HomeShellPage(onStartCheckIn: () {}));
        expect(find.byKey(const Key('route-home')), findsOneWidget);
        expect(tester.takeException(), isNull);

        await _pumpR6Page(tester, const CheckInComposerPage());
        expect(find.byKey(const Key('route-check-in')), findsOneWidget);
        expect(tester.takeException(), isNull);

        await _pumpR6Page(
          tester,
          SavedCheckInPage(checkInId: 'chk_test', onReturnHome: () {}),
        );
        await tester.pumpAndSettle();
        expect(find.byKey(const Key('route-check-in-saved')), findsOneWidget);
        expect(tester.takeException(), isNull);

        await _pumpR6Page(tester, const UnavailablePage());
        expect(find.byKey(const Key('route-unavailable')), findsOneWidget);
        expect(tester.takeException(), isNull);
      });
    }
  });

  testWidgets('registration blocks mismatched confirmation before auth command', (
    tester,
  ) async {
    final auth = FakeAuthRepository();
    addTearDown(auth.close);
    await _pumpR6Page(tester, const RegistrationPage(), auth: auth);

    await tester.enterText(find.byKey(const Key('r6-register-email')), 'du@example.com');
    await tester.enterText(find.byKey(const Key('r6-register-password')), 'password1');
    await tester.enterText(find.byKey(const Key('r6-register-confirm-password')), 'password2');
    await tester.tap(find.byKey(const Key('r6-register-submit')));
    await tester.pump();

    expect(find.text('Passwords must match.'), findsOneWidget);
    expect(auth.registerCount, 0);
  });

  testWidgets('onboarding submits a paired initial choice with idempotency', (
    tester,
  ) async {
    final account = FakeAccountRepository();
    await _pumpR6Page(tester, OnboardingPage(onCompleted: () {}), account: account);

    await tester.enterText(find.byKey(const Key('r6-onboarding-username')), 'du_kun');
    await tester.tap(find.byKey(const Key('r6-initial-choice-reject')));
    await tester.pumpAndSettle();

    expect(account.completedUsernames, ['du_kun']);
    expect(account.completedChoices, [InitialChoice.reject]);
    expect(account.onboardingKeys, ['r6-command-key']);
  });

  testWidgets('note-only Check-in blocks invalid note before repository create', (
    tester,
  ) async {
    final checkIn = FakeCheckInRepository();
    await _pumpR6Page(tester, const CheckInComposerPage(), checkIn: checkIn);

    await tester.tap(find.byKey(const Key('r6-check-in-create')));
    await tester.pump();

    expect(find.byKey(const Key('r6-check-in-failure')), findsOneWidget);
    expect(checkIn.createdNotes, isEmpty);
  });

  testWidgets('note-only Check-in shows committed and confirmed states', (tester) async {
    final checkIn = FakeCheckInRepository();
    await _pumpR6Page(tester, const CheckInComposerPage(), checkIn: checkIn);

    await tester.enterText(find.byKey(const Key('r6-check-in-note')), '  A controlled test note.  ');
    await tester.tap(find.byKey(const Key('r6-check-in-create')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('r6-check-in-committed')), findsOneWidget);
    expect(checkIn.createdNotes, ['A controlled test note.']);
    expect(checkIn.createKeys, ['r6-command-key']);

    await tester.tap(find.byKey(const Key('r6-check-in-confirm')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('r6-check-in-confirmed')), findsOneWidget);
    expect(checkIn.readIds, ['chk_test']);
  });
}

Future<void> _withViewport(
  WidgetTester tester,
  Size size,
  Future<void> Function() body,
) async {
  final view = tester.view;
  final oldPhysicalSize = view.physicalSize;
  final oldDevicePixelRatio = view.devicePixelRatio;
  view.physicalSize = size;
  view.devicePixelRatio = 1;
  try {
    await body();
  } finally {
    view.physicalSize = oldPhysicalSize;
    view.devicePixelRatio = oldDevicePixelRatio;
  }
}

Future<void> _pumpR6Page(
  WidgetTester tester,
  Widget page, {
  FakeAuthRepository? auth,
  FakeAccountRepository? account,
  FakeCheckInRepository? checkIn,
}) async {
  final authRepo = auth ?? FakeAuthRepository();
  if (auth == null) addTearDown(authRepo.close);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        authRepositoryProvider.overrideWithValue(authRepo),
        accountRepositoryProvider.overrideWithValue(account ?? FakeAccountRepository()),
        checkInRepositoryProvider.overrideWithValue(checkIn ?? FakeCheckInRepository()),
        idempotencyKeyGeneratorProvider.overrideWithValue(
          FakeIdempotencyKeyGenerator(['r6-command-key', 'r6-extra-key']),
        ),
      ],
      child: MaterialApp(theme: ThemeData(useMaterial3: true), home: page),
    ),
  );
}
