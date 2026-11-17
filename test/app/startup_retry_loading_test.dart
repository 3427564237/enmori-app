import 'dart:async';

import 'package:enmori/app/app.dart';
import 'package:enmori/app/router/app_router.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/account_providers.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fakes.dart';

const _unavailable = Failure<OnboardingStatus>(
  AppFailure(
    kind: AppFailureKind.serviceUnavailable,
    message: 'Synthetic startup read failure',
  ),
);

void main() {
  for (final throws in [false, true]) {
    testWidgets('account ${throws ? 'exception' : 'failure'} Retry shows '
        'waiting while the new read is pending', (tester) async {
      final auth = FakeAuthRepository();
      final initial = Completer<Result<OnboardingStatus>>();
      final pending = Completer<Result<OnboardingStatus>>();
      final account = FakeAccountRepository()
        ..statusResponses.addAll([initial.future, pending.future]);
      final container = ProviderContainer(
        retry: (_, _) => null,
        overrides: [
          authRepositoryProvider.overrideWithValue(auth),
          accountRepositoryProvider.overrideWithValue(account),
        ],
      );
      addTearDown(auth.close);
      addTearDown(container.dispose);
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const EnmoriApp(),
        ),
      );
      auth.emit(const AuthSessionAuthenticated(subject: 'startup-owner'));
      await tester.pump();
      if (throws) {
        initial.completeError(StateError('Synthetic startup exception'));
      } else {
        initial.complete(_unavailable);
      }
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('route-unavailable')), findsOneWidget);
      expect(account.statusReadCount, 1);

      final retry = tester
          .widget<FilledButton>(find.byKey(const Key('startup-retry')))
          .onPressed!;
      await tester.tap(find.byKey(const Key('startup-retry')));
      retry(); // A second activation before the waiting frame must not reread.
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      final status = container.read(onboardingStatusProvider('startup-owner'));
      expect(status.isLoading, isTrue);
      expect(account.statusReadCount, 2);
      expect(find.byKey(const Key('route-startup')), findsOneWidget);
      expect(find.byKey(const Key('startup-retry')), findsNothing);
      expect(find.byKey(const Key('route-unavailable')), findsNothing);
      expect(
        container.read(appRouterProvider).state.uri.path,
        AppRoutes.unavailable,
      );

      pending.complete(const Success(OnboardingRequired()));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('route-onboarding')), findsOneWidget);
      expect(account.statusReadCount, 2);
      expect(auth.watchCount, 1);
      await tester.pumpWidget(const SizedBox.shrink());
    });
  }

  testWidgets(
    'auth observation Retry shows waiting until identity is observed',
    (tester) async {
      final auth = _DelayedAuthRecovery();
      final account = FakeAccountRepository();
      final container = ProviderContainer(
        retry: (_, _) => null,
        overrides: [
          authRepositoryProvider.overrideWithValue(auth),
          accountRepositoryProvider.overrideWithValue(account),
        ],
      );
      addTearDown(container.dispose);
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const EnmoriApp(),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('route-unavailable')), findsOneWidget);

      final retry = tester
          .widget<FilledButton>(find.byKey(const Key('startup-retry')))
          .onPressed!;
      await tester.tap(find.byKey(const Key('startup-retry')));
      retry();
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      expect(container.read(authSessionProvider).isLoading, isTrue);
      expect(auth.observations, 2);
      expect(account.statusReadCount, 0);
      expect(find.byKey(const Key('route-startup')), findsOneWidget);
      expect(find.byKey(const Key('startup-retry')), findsNothing);

      auth.recovered.complete(
        const AuthSessionAuthenticated(subject: 'recovered-owner'),
      );
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('route-onboarding')), findsOneWidget);
      expect(account.statusReadCount, 1);
      expect(auth.observations, 2);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );

  for (final signOut in [false, true]) {
    testWidgets(
      'pending startup Retry ${signOut ? 'cannot replace a new signed-out route' : 'returns to explicit Retry after failure'}',
      (tester) async {
        final auth = FakeAuthRepository();
        final pending = Completer<Result<OnboardingStatus>>();
        final account = FakeAccountRepository()
          ..statusResponses.addAll([
            Future.value(_unavailable),
            pending.future,
          ]);
        final container = ProviderContainer(
          retry: (_, _) => null,
          overrides: [
            authRepositoryProvider.overrideWithValue(auth),
            accountRepositoryProvider.overrideWithValue(account),
          ],
        );
        addTearDown(auth.close);
        addTearDown(container.dispose);
        await tester.pumpWidget(
          UncontrolledProviderScope(
            container: container,
            child: const EnmoriApp(),
          ),
        );
        auth.emit(const AuthSessionAuthenticated(subject: 'startup-owner'));
        await tester.pumpAndSettle();
        await tester.tap(find.byKey(const Key('startup-retry')));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 100));
        expect(find.byKey(const Key('route-startup')), findsOneWidget);
        expect(account.statusReadCount, 2);

        if (signOut) {
          auth.emit(const AuthSessionUnauthenticated());
          await tester.pumpAndSettle();
          expect(find.byKey(const Key('route-register')), findsOneWidget);
        }
        pending.complete(_unavailable);
        await tester.pumpAndSettle();
        expect(
          find.byKey(Key(signOut ? 'route-register' : 'route-unavailable')),
          findsOneWidget,
        );
        await tester.pump(const Duration(seconds: 30));
        expect(account.statusReadCount, 2); // No automatic retry.
        if (!signOut) {
          await tester.tap(find.byKey(const Key('startup-retry')));
          await tester.pumpAndSettle();
          expect(find.byKey(const Key('route-onboarding')), findsOneWidget);
          expect(account.statusReadCount, 3);
        }
        expect(auth.watchCount, 1);
        await tester.pumpWidget(const SizedBox.shrink());
      },
    );
  }
}

final class _DelayedAuthRecovery extends Fake implements AuthRepository {
  int observations = 0;
  final recovered = Completer<AuthSession>();

  @override
  Stream<AuthSession> watchSession() async* {
    observations++;
    if (observations == 1) throw StateError('Synthetic observation failure');
    yield await recovered.future;
  }
}
