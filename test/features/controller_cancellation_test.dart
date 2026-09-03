import 'dart:async';

import 'package:enmori/app/providers.dart';
import 'package:enmori/core/presentation/command_state.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/presentation/onboarding_controller.dart';
import 'package:enmori/features/check_in/presentation/check_in_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fakes.dart';

void main() {
  test(
    'onboarding ignores a late result after the screen is abandoned',
    () async {
      final repository = FakeAccountRepository()
        ..pendingCompletion = Completer();
      final container = ProviderContainer(
        overrides: [accountRepositoryProvider.overrideWithValue(repository)],
      );
      addTearDown(container.dispose);
      final controller = container.read(onboardingControllerProvider.notifier);

      final command = controller.complete(
        username: 'miku_01',
        initialChoice: .accept,
      );
      controller.abandon();
      repository.pendingCompletion!.complete(Success(testAccount()));
      await command;

      expect(container.read(onboardingControllerProvider), isA<CommandIdle>());

      await controller.complete(username: 'miku_01', initialChoice: .accept);
      expect(repository.onboardingKeys, hasLength(2));
      expect(repository.onboardingKeys[1], repository.onboardingKeys[0]);
    },
  );

  test('Check-in ignores a late create result after abandonment', () async {
    final repository = FakeCheckInRepository()..pendingCreate = Completer();
    final container = ProviderContainer(
      overrides: [checkInRepositoryProvider.overrideWithValue(repository)],
    );
    addTearDown(container.dispose);
    final controller = container.read(checkInControllerProvider.notifier);

    final command = controller.create(note: 'A controlled test note.');
    controller.abandon();
    repository.pendingCreate!.complete(Success(testCheckIn()));
    await command;

    expect(container.read(checkInControllerProvider), isA<CommandIdle>());

    await controller.create(note: 'A controlled test note.');
    expect(repository.createKeys, hasLength(2));
    expect(repository.createKeys[1], repository.createKeys[0]);
  });
}
