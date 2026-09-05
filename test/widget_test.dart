import 'package:enmori/app/app.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/auth/presentation/registration_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/fakes.dart';

void main() {
  testWidgets('observed unauthenticated session routes to registration', (
    tester,
  ) async {
    final auth = FakeAuthRepository();
    addTearDown(auth.close);
    late ProviderContainer container;

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container = ProviderContainer(
          overrides: [authRepositoryProvider.overrideWithValue(auth)],
        ),
        child: const EnmoriApp(),
      ),
    );
    addTearDown(container.dispose);
    auth.emit(const AuthSessionUnauthenticated());
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('route-register')), findsOneWidget);

    await container
        .read(registrationControllerProvider.notifier)
        .register(email: 'member@example.invalid', password: 'test-password');
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('route-register')), findsOneWidget);
    expect(auth.watchCount, 1);
  });
}
