import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/idempotency_key_generator.dart';
import '../../../core/network/idempotency_key_provider.dart';
import '../../../core/presentation/command_state.dart';
import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../account_providers.dart';
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
  late AccountRepository _repository;
  late IdempotencyKeyGenerator _keyGenerator;
  String? _authSubject;

  @override
  CommandState<ProductAccount> build() {
    _repository = ref.watch(accountRepositoryProvider);
    _keyGenerator = ref.watch(idempotencyKeyGeneratorProvider);
    _authSubject = ref.watch(currentAuthSubjectProvider);
    return const CommandIdle();
  }

  Future<void> complete({
    required String username,
    required InitialChoice initialChoice,
  }) async {
    final operation = ++_operation;
    final fingerprint = '${initialChoice.name}\u0000$username';
    if (_commandFingerprint != fingerprint || _idempotencyKey == null) {
      _commandFingerprint = fingerprint;
      _idempotencyKey = _keyGenerator.generate();
    }
    final idempotencyKey = _idempotencyKey!;
    state = const CommandPending();
    final result = await _repository.completeOnboarding(
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
      if (_authSubject case final subject?) {
        ref.invalidate(onboardingStatusProvider(subject));
      }
    }
  }

  void abandon() {
    _operation++;
    state = const CommandIdle();
  }
}
