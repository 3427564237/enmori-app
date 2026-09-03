import 'package:enmori/app/app.dart';
import 'package:enmori/app/providers.dart';
import 'package:enmori/core/presentation/command_state.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/account/presentation/onboarding_controller.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/check_in/presentation/check_in_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import '../test/support/fakes.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('R1 client boundaries complete the approved fake flow', (
    tester,
  ) async {
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
        .complete(username: 'miku_01', initialChoice: InitialChoice.reject);
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('route-home')), findsOneWidget);

    await container
        .read(checkInControllerProvider.notifier)
        .create(note: 'A controlled test note.');
    expect(container.read(checkInControllerProvider), isA<CommandSucceeded>());

    await container
        .read(checkInControllerProvider.notifier)
        .readPersisted(checkInId: 'chk_test');
    expect(container.read(checkInControllerProvider), isA<CommandSucceeded>());
    expect(auth.watchCount, 1);
  });
}
