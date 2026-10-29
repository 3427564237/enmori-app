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
  bool _needsReadBack = false;

  bool get needsReadBack => _needsReadBack;

  @override
  CommandState<ProductAccount> build() {
    _repository = ref.watch(accountRepositoryProvider);
    _keyGenerator = ref.watch(idempotencyKeyGeneratorProvider);
    final authSubject = ref.watch(currentAuthSubjectProvider);
    if (_authSubject != authSubject) {
      _operation++;
      _commandFingerprint = null;
      _idempotencyKey = null;
      _needsReadBack = false;
    }
    _authSubject = authSubject;
    return const CommandIdle();
  }

  Future<void> complete({
    required String username,
    required InitialChoice initialChoice,
  }) async {
    if (state is CommandPending<ProductAccount>) return;
    if (_needsReadBack) return checkSaved();
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
    if (!ref.mounted || operation != _operation) return;
    switch (result) {
      case Success<ProductAccount>(:final value):
        _succeed(value);
      case Failure<ProductAccount>(:final failure):
        if (failure.kind == AppFailureKind.serviceUnavailable ||
            failure.kind == AppFailureKind.unexpected ||
            failure.kind == AppFailureKind.onboardingConflict) {
          _needsReadBack = true;
          await _readSaved(operation);
        } else {
          state = CommandFailed(failure);
        }
    }
  }

  /// An uncertain write must be reconciled before offering another choice.
  Future<void> checkSaved() async {
    if (state is CommandPending<ProductAccount> || !_needsReadBack) return;
    final operation = ++_operation;
    state = const CommandPending();
    await _readSaved(operation);
  }

  Future<void> _readSaved(int operation) async {
    final result = await _repository.readOnboardingStatus();
    if (!ref.mounted || operation != _operation) return;
    switch (result) {
      case Success<OnboardingStatus>(
        value: OnboardingCompleted(:final account),
      ):
        _succeed(account);
      case Failure<OnboardingStatus>(:final failure):
        state = CommandFailed(failure);
      case Success<OnboardingStatus>():
        // A concurrent write can still settle after this read. Keep its choice
        // and key; a read reporting required is not proof of write failure.
        state = const CommandFailed(
          AppFailure(
            kind: AppFailureKind.serviceUnavailable,
            message: 'Onboarding save is not yet confirmed.',
          ),
        );
    }
  }

  void _succeed(ProductAccount account) {
    _needsReadBack = false;
    _commandFingerprint = null;
    _idempotencyKey = null;
    state = CommandSucceeded(account);
    if (_authSubject case final subject?) {
      ref.invalidate(onboardingStatusProvider(subject));
    }
  }

  void abandon({bool resetState = true}) {
    _operation++;
    if (resetState) state = const CommandIdle();
  }
}
