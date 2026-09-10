import 'dart:async';

import 'package:enmori/core/network/idempotency_key_provider.dart';
import 'package:enmori/core/presentation/command_state.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/account_providers.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/account/presentation/onboarding_controller.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/check_in/check_in_providers.dart';
import 'package:enmori/features/check_in/domain/check_in_repository.dart';
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

  test('onboarding clears the idempotency key after success', () async {
    final repository = FakeAccountRepository();
    final keys = FakeIdempotencyKeyGenerator([
      'aaaaaaaaaaaaaaaaaaaaaa',
      'bbbbbbbbbbbbbbbbbbbbbb',
    ]);
    final container = ProviderContainer(
      overrides: [
        accountRepositoryProvider.overrideWithValue(repository),
        idempotencyKeyGeneratorProvider.overrideWithValue(keys),
      ],
    );
    addTearDown(container.dispose);
    final controller = container.read(onboardingControllerProvider.notifier);

    await controller.complete(username: 'miku_01', initialChoice: .accept);
    await controller.complete(username: 'miku_01', initialChoice: .accept);

    expect(repository.onboardingKeys, [
      'aaaaaaaaaaaaaaaaaaaaaa',
      'bbbbbbbbbbbbbbbbbbbbbb',
    ]);
  });

  test('Check-in clears the idempotency key after success', () async {
    final repository = FakeCheckInRepository();
    final keys = FakeIdempotencyKeyGenerator([
      'aaaaaaaaaaaaaaaaaaaaaa',
      'bbbbbbbbbbbbbbbbbbbbbb',
    ]);
    final container = ProviderContainer(
      overrides: [
        checkInRepositoryProvider.overrideWithValue(repository),
        idempotencyKeyGeneratorProvider.overrideWithValue(keys),
      ],
    );
    addTearDown(container.dispose);
    final controller = container.read(checkInControllerProvider.notifier);

    await controller.create(note: 'A controlled test note.');
    await controller.create(note: 'A controlled test note.');

    expect(repository.createKeys, [
      'aaaaaaaaaaaaaaaaaaaaaa',
      'bbbbbbbbbbbbbbbbbbbbbb',
    ]);
  });

  test(
    'identity change invalidates pending onboarding and its retry key',
    () async {
      final auth = FakeAuthRepository();
      final repository = FakeAccountRepository()
        ..pendingCompletion = Completer<Result<ProductAccount>>();
      final keys = FakeIdempotencyKeyGenerator([
        'aaaaaaaaaaaaaaaaaaaaaa',
        'bbbbbbbbbbbbbbbbbbbbbb',
      ]);
      final container = ProviderContainer(
        overrides: [
          authRepositoryProvider.overrideWithValue(auth),
          accountRepositoryProvider.overrideWithValue(repository),
          idempotencyKeyGeneratorProvider.overrideWithValue(keys),
        ],
      );
      addTearDown(auth.close);
      addTearDown(container.dispose);
      final stateSubscription = container.listen<CommandState<ProductAccount>>(
        onboardingControllerProvider,
        (previous, next) {},
        fireImmediately: true,
      );
      addTearDown(stateSubscription.close);
      final controller = container.read(onboardingControllerProvider.notifier);
      auth.emit(const AuthSessionAuthenticated(subject: 'member-a'));
      await Future<void>.delayed(Duration.zero);

      final pending = controller.complete(
        username: 'miku_01',
        initialChoice: .accept,
      );
      auth.emit(const AuthSessionAuthenticated(subject: 'member-b'));
      await Future<void>.delayed(Duration.zero);
      repository.pendingCompletion!.complete(Success(testAccount()));
      await pending;

      expect(container.read(onboardingControllerProvider), isA<CommandIdle>());
      repository.pendingCompletion = null;
      await controller.complete(username: 'miku_01', initialChoice: .accept);
      expect(repository.onboardingKeys, [
        'aaaaaaaaaaaaaaaaaaaaaa',
        'bbbbbbbbbbbbbbbbbbbbbb',
      ]);
    },
  );

  test(
    'identity change invalidates pending Check-in and its retry key',
    () async {
      final auth = FakeAuthRepository();
      final repository = FakeCheckInRepository()
        ..pendingCreate = Completer<Result<CheckIn>>();
      final keys = FakeIdempotencyKeyGenerator([
        'aaaaaaaaaaaaaaaaaaaaaa',
        'bbbbbbbbbbbbbbbbbbbbbb',
      ]);
      final container = ProviderContainer(
        overrides: [
          authRepositoryProvider.overrideWithValue(auth),
          checkInRepositoryProvider.overrideWithValue(repository),
          idempotencyKeyGeneratorProvider.overrideWithValue(keys),
        ],
      );
      addTearDown(auth.close);
      addTearDown(container.dispose);
      final stateSubscription = container.listen<CommandState<CheckIn>>(
        checkInControllerProvider,
        (previous, next) {},
        fireImmediately: true,
      );
      addTearDown(stateSubscription.close);
      final controller = container.read(checkInControllerProvider.notifier);
      auth.emit(const AuthSessionAuthenticated(subject: 'member-a'));
      await Future<void>.delayed(Duration.zero);

      final pending = controller.create(note: 'A controlled test note.');
      auth.emit(const AuthSessionAuthenticated(subject: 'member-b'));
      await Future<void>.delayed(Duration.zero);
      repository.pendingCreate!.complete(Success(testCheckIn()));
      await pending;

      expect(container.read(checkInControllerProvider), isA<CommandIdle>());
      repository.pendingCreate = null;
      await controller.create(note: 'A controlled test note.');
      expect(repository.createKeys, [
        'aaaaaaaaaaaaaaaaaaaaaa',
        'bbbbbbbbbbbbbbbbbbbbbb',
      ]);
    },
  );
}
