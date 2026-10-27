import 'dart:async';

import 'package:enmori/app/app.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/account_providers.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fakes.dart';

void main() {
  for (final authenticated in [true, false]) {
    testWidgets('startup Retry observes recovered '
        '${authenticated ? 'authenticated' : 'signed-out'} identity', (
      tester,
    ) async {
      final auth = _RecoverableAuth();
      final account = FakeAccountRepository()
        ..statusResult = const Success(OnboardingRequired());
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
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('route-unavailable')), findsOneWidget);
      expect(account.statusReadCount, 0);

      auth.nextSession = authenticated
          ? const AuthSessionAuthenticated(subject: 'recovered-owner')
          : const AuthSessionUnauthenticated();
      await tester.tap(find.byKey(const Key('startup-retry')));
      await tester.pumpAndSettle();

      expect(auth.observations, 2);
      expect(auth.maxActive, 1);
      expect(account.statusReadCount, authenticated ? 1 : 0);
      expect(
        find.byKey(Key(authenticated ? 'route-onboarding' : 'route-register')),
        findsOneWidget,
      );
      await tester.pumpWidget(const SizedBox.shrink());
    });
  }
}

final class _RecoverableAuth extends Fake implements AuthRepository {
  AuthSession? nextSession;
  int observations = 0;
  int active = 0;
  int maxActive = 0;
  final controllers = <StreamController<AuthSession>>[];

  @override
  Stream<AuthSession> watchSession() {
    observations++;
    late StreamController<AuthSession> controller;
    controller = StreamController<AuthSession>(
      onListen: () {
        active++;
        if (active > maxActive) maxActive = active;
        final session = nextSession;
        if (session == null) {
          controller.addError(StateError('Synthetic observation failure'));
        } else {
          controller.add(session);
        }
      },
      onCancel: () => active--,
    );
    controllers.add(controller);
    return controller.stream;
  }

  Future<void> close() async {
    for (final controller in controllers) {
      await controller.close();
    }
  }
}
