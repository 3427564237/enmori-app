import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/providers.dart';
import '../../../core/presentation/command_state.dart';
import '../../../core/result/result.dart';
import '../../auth/domain/auth_repository.dart';
import '../domain/account_repository.dart';

final onboardingControllerProvider =
    NotifierProvider<OnboardingController, CommandState<ProductAccount>>(
      OnboardingController.new,
    );

final class OnboardingController
    extends Notifier<CommandState<ProductAccount>> {
  int _operation = 0;
  String? _commandFingerprint;
  String? _idempotencyKey;

  @override
  CommandState<ProductAccount> build() => const CommandIdle();

  Future<void> complete({
    required String username,
    required InitialChoice initialChoice,
  }) async {
    final operation = ++_operation;
    final fingerprint = '${initialChoice.name}\u0000$username';
    if (_commandFingerprint != fingerprint || _idempotencyKey == null) {
      _commandFingerprint = fingerprint;
      _idempotencyKey = ref.read(idempotencyKeyGeneratorProvider).generate();
    }
    final idempotencyKey = _idempotencyKey!;
    state = const CommandPending();
    final result = await ref
        .read(accountRepositoryProvider)
        .completeOnboarding(
          username: username,
          initialChoice: initialChoice,
          idempotencyKey: idempotencyKey,
        );
    if (operation != _operation) return;

    state = switch (result) {
      Success<ProductAccount>(:final value) => CommandSucceeded(value),
      Failure<ProductAccount>(:final failure) => CommandFailed(failure),
    };
    if (result case Success<ProductAccount>()) {
      _commandFingerprint = null;
      _idempotencyKey = null;
      final session = ref.read(authSessionProvider).value;
      if (session case AuthSessionAuthenticated(:final subject)) {
        ref.invalidate(onboardingStatusProvider(subject));
      }
    }
  }

  void abandon() {
    _operation++;
    state = const CommandIdle();
  }
}
