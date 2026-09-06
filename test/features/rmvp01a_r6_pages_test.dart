import 'dart:async';

import 'package:enmori/app/home_shell_page.dart';
import 'package:enmori/app/route_status_pages.dart';
import 'package:enmori/core/network/idempotency_key_provider.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/account_providers.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/account/presentation/onboarding_page.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/presentation/registration_page.dart';
import 'package:enmori/features/check_in/check_in_providers.dart';
import 'package:enmori/features/check_in/domain/check_in_repository.dart';
import 'package:enmori/features/check_in/presentation/check_in_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fakes.dart';

void main() {
  testWidgets('R6 surfaces render at approved bounds and text scales', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    try {
      for (final size in [const Size(360, 800), const Size(800, 360)]) {
        for (final textScale in [1.0, 2.0]) {
          await _withViewport(tester, size, () async {
            await _pumpR6Page(
              tester,
              const StartupPage(),
              textScale: textScale,
            );
            expect(find.byKey(const Key('route-startup')), findsOneWidget);
            expect(tester.takeException(), isNull);

            await _pumpR6Page(
              tester,
              const RegistrationPage(),
              textScale: textScale,
            );
            expect(find.byKey(const Key('route-register')), findsOneWidget);
            expect(tester.takeException(), isNull);

            await _pumpOnboardingToChoice(tester, textScale: textScale);
            expect(find.byKey(const Key('route-onboarding')), findsOneWidget);
            expect(
              find.byKey(const Key('r6-initial-choice-purpose-copy')),
              findsNothing,
            );
            expect(
              find.bySemanticsLabel(
                RegExp('Accept.*optional processing.*Public'),
              ),
              findsWidgets,
            );
            expect(
              find.bySemanticsLabel(
                RegExp('Reject.*optional processing.*Private'),
              ),
              findsWidgets,
            );
            expect(find.byType(EditableText), findsNothing);
            expect(tester.takeException(), isNull);

            await _pumpR6Page(
              tester,
              HomeShellPage(onStartCheckIn: () {}),
              textScale: textScale,
            );
            expect(find.byKey(const Key('route-home')), findsOneWidget);
            expect(tester.takeException(), isNull);

            await _pumpR6Page(
              tester,
              const CheckInComposerPage(),
              textScale: textScale,
            );
            expect(find.byKey(const Key('route-check-in')), findsOneWidget);
            await _ensureBuiltAndVisible(
              tester,
              find.byKey(const Key('r6-check-in-create'), skipOffstage: false),
            );
            expect(
              find.text('Save Check-in', skipOffstage: false),
              findsOneWidget,
            );
            expect(tester.takeException(), isNull);

            await _pumpR6Page(
              tester,
              SavedCheckInPage(checkInId: 'chk_test', onReturnHome: () {}),
              textScale: textScale,
            );
            await tester.pumpAndSettle();
            expect(
              find.byKey(const Key('route-check-in-saved')),
              findsOneWidget,
            );
            await _ensureBuiltAndVisible(
              tester,
              find.byKey(const Key('r6-return-home'), skipOffstage: false),
            );
            expect(
              find.text('Return Home', skipOffstage: false),
              findsOneWidget,
            );
            expect(tester.takeException(), isNull);

            await _pumpR6Page(
              tester,
              const UnavailablePage(),
              textScale: textScale,
            );
            expect(find.byKey(const Key('route-unavailable')), findsOneWidget);
            expect(tester.takeException(), isNull);
          });
        }
      }
    } finally {
      semantics.dispose();
    }
  });

  testWidgets(
    'registration blocks mismatched confirmation before auth command',
    (tester) async {
      final auth = FakeAuthRepository();
      addTearDown(auth.close);
      await _pumpR6Page(tester, const RegistrationPage(), auth: auth);

      await tester.enterText(
        find.byKey(const Key('r6-register-email')),
        'du@example.com',
      );
      await tester.enterText(
        find.byKey(const Key('r6-register-password')),
        'password1',
      );
      await tester.enterText(
        find.byKey(const Key('r6-register-confirm-password')),
        'password2',
      );
      await tester.tap(find.byKey(const Key('r6-register-submit')));
      await tester.pump();

      expect(find.text('Passwords must match.'), findsOneWidget);
      expect(auth.registerCount, 0);
    },
  );

  testWidgets('onboarding enforces approved Username boundaries', (
    tester,
  ) async {
    await _pumpR6Page(tester, OnboardingPage(onCompleted: () {}));

    for (final invalid in [
      'Du_kun',
      'ab',
      'abcdefghijklmnopqrstuvwxyz12345',
      '_dukun',
      'dukun_',
      'du__kun',
    ]) {
      await _enterTextByKey(
        tester,
        const Key('r6-onboarding-username'),
        invalid,
      );
      await _tapByKey(tester, const Key('r6-onboarding-username-continue'));
      await tester.pump();

      expect(
        find.text('Enter a valid Username using the format shown.'),
        findsOneWidget,
      );
    }

    await _enterTextByKey(tester, const Key('r6-onboarding-username'), 'a_1');
    await _tapByKey(tester, const Key('r6-onboarding-username-continue'));
    await tester.pump();
    expect(
      find.byKey(const Key('r6-initial-choice-purpose-copy')),
      findsOneWidget,
    );
  });

  testWidgets('onboarding separates M06 info from M07 paired initial choice', (
    tester,
  ) async {
    final account = FakeAccountRepository();
    await _pumpR6Page(
      tester,
      OnboardingPage(onCompleted: () {}),
      account: account,
    );

    await _enterTextByKey(
      tester,
      const Key('r6-onboarding-username'),
      'du_kun',
    );
    await _tapByKey(tester, const Key('r6-onboarding-username-continue'));
    await tester.pump();

    expect(
      find.byKey(const Key('r6-initial-choice-purpose-copy')),
      findsOneWidget,
    );
    expect(find.byKey(const Key('r6-initial-choice-accept')), findsNothing);

    await _tapByKey(tester, const Key('r6-initial-choice-info-continue'));
    await tester.pump();
    expect(find.text('Choose your initial settings'), findsOneWidget);
    expect(find.byKey(const Key('r6-initial-choice-accept')), findsOneWidget);
    expect(find.byKey(const Key('r6-initial-choice-reject')), findsOneWidget);

    await _tapByKey(tester, const Key('r6-initial-choice-reject'));
    await tester.pumpAndSettle();

    expect(account.completedUsernames, ['du_kun']);
    expect(account.completedChoices, [InitialChoice.reject]);
    expect(account.onboardingKeys, ['r6-command-key']);
  });

  testWidgets('onboarding failure retains selected choice and offers retry', (
    tester,
  ) async {
    final account = FakeAccountRepository()
      ..completionResult = const Failure(
        AppFailure(
          kind: AppFailureKind.usernameUnavailable,
          message: 'backend detail',
        ),
      );
    await _pumpOnboardingToChoice(tester, account: account);

    await _tapByKey(tester, const Key('r6-initial-choice-accept'));
    await tester.pumpAndSettle();

    expect(find.text('This Username is unavailable.'), findsOneWidget);
    await _ensureBuiltAndVisible(
      tester,
      find.byKey(const Key('r6-initial-choice-retry')),
    );
    expect(find.byKey(const Key('r6-initial-choice-retry')), findsOneWidget);
    expect(account.completedChoices, [InitialChoice.accept]);

    await _tapByKey(tester, const Key('r6-initial-choice-retry'));
    await tester.pumpAndSettle();
    expect(account.completedChoices, [
      InitialChoice.accept,
      InitialChoice.accept,
    ]);
  });

  testWidgets(
    'note-only Check-in blocks invalid note before repository create',
    (tester) async {
      final checkIn = FakeCheckInRepository();
      await _pumpR6Page(tester, const CheckInComposerPage(), checkIn: checkIn);

      await tester.tap(find.byKey(const Key('r6-check-in-create')));
      await tester.pump();

      expect(find.text('Enter a Note before saving.'), findsOneWidget);
      expect(checkIn.createdNotes, isEmpty);
    },
  );

  testWidgets('note-only Check-in pending state is neutral and disabled', (
    tester,
  ) async {
    final pending = Completer<Result<CheckIn>>();
    final checkIn = FakeCheckInRepository()..pendingCreate = pending;
    addTearDown(() {
      if (!pending.isCompleted) pending.complete(Success(testCheckIn()));
    });
    await _pumpR6Page(tester, const CheckInComposerPage(), checkIn: checkIn);

    await tester.enterText(
      find.byKey(const Key('r6-check-in-note')),
      'A controlled test note.',
    );
    await tester.tap(find.byKey(const Key('r6-check-in-create')));
    await tester.pump();

    expect(find.byKey(const Key('r6-check-in-saving')), findsOneWidget);
    expect(find.text('Create committed'), findsNothing);
    final button = tester.widget<FilledButton>(
      find.byKey(const Key('r6-check-in-create')),
    );
    expect(button.onPressed, isNull);
  });

  testWidgets('note-only Check-in shows committed and confirmed states', (
    tester,
  ) async {
    var returnedHome = false;
    final checkIn = FakeCheckInRepository();
    await _pumpR6Page(
      tester,
      CheckInComposerPage(onReturnHome: () => returnedHome = true),
      checkIn: checkIn,
    );

    await tester.enterText(
      find.byKey(const Key('r6-check-in-note')),
      '  A controlled test note.  ',
    );
    await tester.tap(find.byKey(const Key('r6-check-in-create')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('r6-check-in-committed')), findsOneWidget);
    expect(find.text('Check-in saved.'), findsOneWidget);
    expect(checkIn.createdNotes, ['A controlled test note.']);
    expect(checkIn.createKeys, ['r6-command-key']);

    await tester.tap(find.byKey(const Key('r6-check-in-confirm')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('r6-check-in-confirmed')), findsOneWidget);
    expect(find.text('Saved Check-in confirmed.'), findsOneWidget);
    expect(find.byKey(const Key('r6-return-home-inline')), findsOneWidget);
    expect(checkIn.readIds, ['chk_test']);

    await tester.tap(find.byKey(const Key('r6-return-home-inline')));
    expect(returnedHome, isTrue);
  });

  testWidgets('confirmation failure maps copy and exposes retry', (
    tester,
  ) async {
    final checkIn = FakeCheckInRepository()
      ..readResult = const Failure(
        AppFailure(
          kind: AppFailureKind.serviceUnavailable,
          message: 'raw backend message',
        ),
      );
    await _pumpR6Page(tester, const CheckInComposerPage(), checkIn: checkIn);

    await tester.enterText(
      find.byKey(const Key('r6-check-in-note')),
      'A controlled test note.',
    );
    await tester.tap(find.byKey(const Key('r6-check-in-create')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('r6-check-in-confirm')));
    await tester.pumpAndSettle();

    expect(find.text("We couldn't confirm this Check-in yet."), findsOneWidget);
    expect(find.text('raw backend message'), findsNothing);
    expect(
      find.byKey(const Key('r6-check-in-retry-confirmation')),
      findsOneWidget,
    );

    await tester.tap(find.byKey(const Key('r6-check-in-retry-confirmation')));
    await tester.pumpAndSettle();
    expect(checkIn.readIds, ['chk_test', 'chk_test']);
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

Future<void> _pumpOnboardingToChoice(
  WidgetTester tester, {
  FakeAccountRepository? account,
  double textScale = 1,
}) async {
  await _pumpR6Page(
    tester,
    OnboardingPage(onCompleted: () {}),
    account: account,
    textScale: textScale,
  );
  await _enterTextByKey(tester, const Key('r6-onboarding-username'), 'du_kun');
  await _tapByKey(tester, const Key('r6-onboarding-username-continue'));
  await tester.pump();
  await _tapByKey(tester, const Key('r6-initial-choice-info-continue'));
  await tester.pump();
}

Future<void> _enterTextByKey(WidgetTester tester, Key key, String value) async {
  final finder = find.byKey(key, skipOffstage: false);
  await _ensureBuiltAndVisible(tester, finder);
  await tester.enterText(finder, value);
}

Future<void> _tapByKey(WidgetTester tester, Key key) async {
  final finder = find.byKey(key, skipOffstage: false);
  await _ensureBuiltAndVisible(tester, finder);
  await tester.tap(finder);
}

Future<void> _ensureBuiltAndVisible(WidgetTester tester, Finder finder) async {
  if (finder.evaluate().isEmpty) {
    await tester.scrollUntilVisible(
      finder,
      120,
      scrollable: find.byType(Scrollable).first,
    );
  }
  await tester.ensureVisible(finder);
  await tester.pump();
}

Future<void> _pumpR6Page(
  WidgetTester tester,
  Widget page, {
  FakeAuthRepository? auth,
  FakeAccountRepository? account,
  FakeCheckInRepository? checkIn,
  double textScale = 1,
}) async {
  final authRepo = auth ?? FakeAuthRepository();
  if (auth == null) addTearDown(authRepo.close);
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
          FakeIdempotencyKeyGenerator(['r6-command-key', 'r6-extra-key']),
        ),
      ],
      child: MaterialApp(
        theme: ThemeData(useMaterial3: true),
        home: MediaQuery(
          data: MediaQueryData(textScaler: TextScaler.linear(textScale)),
          child: page,
        ),
      ),
    ),
  );
}
