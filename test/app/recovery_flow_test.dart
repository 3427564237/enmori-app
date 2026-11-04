import 'dart:async';

import 'package:enmori/app/app.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/account_providers.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/auth/presentation/sign_in_controller.dart';
import 'package:enmori/features/auth/presentation/sign_in_page.dart';
import 'package:enmori/core/presentation/command_state.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fakes.dart';

void main() {
  testWidgets(
    'missing auth configuration is not presented as transient retry',
    (tester) async {
      await tester.pumpWidget(const ProviderScope(child: EnmoriApp()));
      await tester.pumpAndSettle();

      expect(
        find.byKey(const Key('route-configuration-unavailable')),
        findsOneWidget,
      );
      expect(find.byKey(const Key('startup-retry')), findsNothing);
    },
  );

  testWidgets('existing-email registration offers executable sign-in', (
    tester,
  ) async {
    final auth = FakeAuthRepository()
      ..registerResult = const Failure(
        AppFailure(
          kind: AppFailureKind.accountAlreadyExists,
          message: 'unsafe provider detail',
        ),
      );
    final account = FakeAccountRepository();
    final container = await _pumpApp(tester, auth: auth, account: account);
    addTearDown(auth.close);
    addTearDown(container.dispose);

    auth.emit(const AuthSessionUnauthenticated());
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const Key('r6-register-email')),
      'member@example.invalid',
    );
    await tester.enterText(
      find.byKey(const Key('r6-register-password')),
      'test-password',
    );
    await tester.enterText(
      find.byKey(const Key('r6-register-confirm-password')),
      'test-password',
    );
    await tester.ensureVisible(find.byKey(const Key('register-terms')));
    await tester.tap(find.byKey(const Key('register-terms')));
    await tester.ensureVisible(find.byKey(const Key('r6-register-submit')));
    await tester.tap(find.byKey(const Key('r6-register-submit')));
    await tester.pumpAndSettle();

    expect(
      find.text(
        'This email is already registered. Sign in instead or use another email.',
      ),
      findsOneWidget,
    );
    await tester.ensureVisible(find.byKey(const Key('register-sign-in')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('register-sign-in')));
    await tester.pumpAndSettle();
    expect(find.text('Leave registration?'), findsOneWidget);
    await tester.tap(find.text('Discard details'));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('route-sign-in')), findsOneWidget);
  });

  for (final completed in [false, true]) {
    testWidgets(
      'AUTH_REQUIRED sign-in reloads ${completed ? 'completed' : 'incomplete'} onboarding',
      (tester) async {
        final auth = FakeAuthRepository();
        final account = FakeAccountRepository()
          ..statusResult = const Failure(
            AppFailure(
              kind: AppFailureKind.authRequired,
              message: 'unsafe backend detail',
            ),
          );
        final container = await _pumpApp(tester, auth: auth, account: account);
        addTearDown(auth.close);
        addTearDown(container.dispose);

        auth.emit(const AuthSessionAuthenticated(subject: 'member-a'));
        await tester.pumpAndSettle();
        expect(find.byKey(const Key('route-sign-in')), findsOneWidget);

        account.statusResult = completed
            ? Success(OnboardingCompleted(testAccount()))
            : const Success(OnboardingRequired());
        await tester.enterText(
          find.byKey(const Key('sign-in-email')),
          'member@example.invalid',
        );
        await tester.enterText(
          find.byKey(const Key('sign-in-password')),
          'test-password',
        );
        await tester.tap(find.byKey(const Key('sign-in-submit')));
        await tester.pumpAndSettle();

        expect(auth.signInCount, 1);
        expect(account.statusReadCount, 2);
        expect(
          find.byKey(Key(completed ? 'route-home' : 'route-onboarding')),
          findsOneWidget,
        );
      },
    );
  }

  for (final lateResult in <Result<void>>[
    const Success(null),
    const Failure(
      AppFailure(
        kind: AppFailureKind.authenticationInvalid,
        message: 'late sign-in failure',
      ),
    ),
  ]) {
    final outcome = lateResult is Success<void> ? 'success' : 'failure';
    testWidgets(
      'late Sign-in $outcome cannot update state or leave the destination',
      (tester) async {
        final pendingSignIn = Completer<Result<void>>();
        final auth = FakeAuthRepository()..pendingSignIn = pendingSignIn;
        final container = ProviderContainer(
          overrides: [authRepositoryProvider.overrideWithValue(auth)],
        );
        addTearDown(auth.close);
        addTearDown(container.dispose);
        var succeededCount = 0;

        await tester.pumpWidget(
          UncontrolledProviderScope(
            container: container,
            child: MaterialApp(
              home: SignInPage(
                onCreateAccount: () {},
                onSucceeded: () => succeededCount++,
              ),
            ),
          ),
        );
        await tester.enterText(
          find.byKey(const Key('sign-in-email')),
          'member@example.invalid',
        );
        await tester.enterText(
          find.byKey(const Key('sign-in-password')),
          'test-password',
        );
        await tester.tap(find.byKey(const Key('sign-in-submit')));
        await tester.pump();
        expect(
          container.read(signInControllerProvider),
          isA<CommandPending<void>>(),
        );

        await tester.pumpWidget(
          UncontrolledProviderScope(
            container: container,
            child: const MaterialApp(home: Text('destination')),
          ),
        );
        await tester.pump();
        pendingSignIn.complete(lateResult);
        await tester.pumpAndSettle();

        expect(find.text('destination'), findsOneWidget);
        expect(succeededCount, 0);
        expect(
          container.read(signInControllerProvider),
          isA<CommandPending<void>>(),
        );
      },
    );
  }

  testWidgets('startup service failure retries the current subject', (
    tester,
  ) async {
    final auth = FakeAuthRepository();
    final account = FakeAccountRepository()
      ..statusResult = const Failure(
        AppFailure(
          kind: AppFailureKind.serviceUnavailable,
          message: 'unsafe backend detail',
        ),
      );
    final container = await _pumpApp(tester, auth: auth, account: account);
    addTearDown(auth.close);
    addTearDown(container.dispose);

    auth.emit(const AuthSessionAuthenticated(subject: 'member-a'));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('route-unavailable')), findsOneWidget);

    account.statusResult = const Success(OnboardingRequired());
    await tester.tap(find.byKey(const Key('startup-retry')));
    await tester.pumpAndSettle();

    expect(account.statusReadCount, 2);
    expect(find.byKey(const Key('route-onboarding')), findsOneWidget);
  });

  testWidgets('configuration failure is not presented as transient retry', (
    tester,
  ) async {
    final auth = FakeAuthRepository();
    final account = FakeAccountRepository()
      ..statusResult = const Failure(
        AppFailure(
          kind: AppFailureKind.configurationUnavailable,
          message: 'unsafe backend detail',
        ),
      );
    final container = await _pumpApp(tester, auth: auth, account: account);
    addTearDown(auth.close);
    addTearDown(container.dispose);

    auth.emit(const AuthSessionAuthenticated(subject: 'member-a'));
    await tester.pumpAndSettle();

    expect(
      find.byKey(const Key('route-configuration-unavailable')),
      findsOneWidget,
    );
    expect(find.byKey(const Key('startup-retry')), findsNothing);
  });

  testWidgets('late onboarding response cannot overwrite a new identity', (
    tester,
  ) async {
    final oldResponse = Completer<Result<OnboardingStatus>>();
    final auth = FakeAuthRepository();
    final account = FakeAccountRepository()
      ..statusResponses.addAll([
        oldResponse.future,
        Future.value(Success(OnboardingCompleted(testAccount()))),
      ]);
    final container = await _pumpApp(tester, auth: auth, account: account);
    addTearDown(auth.close);
    addTearDown(container.dispose);

    auth.emit(const AuthSessionAuthenticated(subject: 'member-a'));
    await tester.pump();
    auth.emit(const AuthSessionAuthenticated(subject: 'member-b'));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('route-home')), findsOneWidget);

    oldResponse.complete(
      const Failure(
        AppFailure(
          kind: AppFailureKind.serviceUnavailable,
          message: 'late old response',
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('route-home')), findsOneWidget);
    expect(find.text('late old response'), findsNothing);
  });
}

Future<ProviderContainer> _pumpApp(
  WidgetTester tester, {
  required FakeAuthRepository auth,
  required FakeAccountRepository account,
}) async {
  final container = ProviderContainer(
    overrides: [
      authRepositoryProvider.overrideWithValue(auth),
      accountRepositoryProvider.overrideWithValue(account),
    ],
  );
  await tester.pumpWidget(
    UncontrolledProviderScope(container: container, child: const EnmoriApp()),
  );
  return container;
}
