import 'package:enmori/app/app.dart';
import 'package:enmori/core/presentation/command_state.dart';
import 'package:enmori/features/account/account_providers.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/account/presentation/onboarding_controller.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/check_in/check_in_providers.dart';
import 'package:enmori/features/check_in/presentation/check_in_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fakes.dart';

void main() {
  testWidgets(
    'observed auth, onboarding, create and later-read cross the R1 boundaries',
    (tester) async {
      final auth = FakeAuthRepository();
      final account = FakeAccountRepository();
      final checkIn = FakeCheckInRepository();
      addTearDown(auth.close);

      late ProviderContainer container;
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container = ProviderContainer(
            overrides: [
              authRepositoryProvider.overrideWithValue(auth),
              accountRepositoryProvider.overrideWithValue(account),
              checkInRepositoryProvider.overrideWithValue(checkIn),
            ],
          ),
          child: const EnmoriApp(),
        ),
      );
      addTearDown(container.dispose);

      auth.emit(const AuthSessionUnauthenticated());
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('route-register')), findsOneWidget);

      auth.emit(const AuthSessionAuthenticated(subject: 'firebase-subject'));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('route-onboarding')), findsOneWidget);

      await container
          .read(onboardingControllerProvider.notifier)
          .complete(username: 'miku_01', initialChoice: InitialChoice.accept);
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('route-home')), findsOneWidget);

      await container
          .read(checkInControllerProvider.notifier)
          .create(note: 'A controlled test note.');
      final created = container.read(checkInControllerProvider);
      expect(created, isA<CommandSucceeded>());

      await container
          .read(checkInControllerProvider.notifier)
          .readPersisted(checkInId: 'chk_test');
      final laterRead = container.read(checkInControllerProvider);
      expect(laterRead, isA<CommandSucceeded>());
      expect(auth.watchCount, 1);
    },
  );
}
