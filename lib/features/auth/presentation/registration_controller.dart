import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/command_state.dart';
import '../../../core/result/result.dart';
import '../auth_providers.dart';
import '../domain/auth_repository.dart';

final registrationControllerProvider =
    NotifierProvider<RegistrationController, CommandState<void>>(
      RegistrationController.new,
    );

final class RegistrationController extends Notifier<CommandState<void>> {
  int _operation = 0;
  late AuthRepository _repository;

  @override
  CommandState<void> build() {
    _repository = ref.watch(authRepositoryProvider);
    return const CommandIdle();
  }

  Future<void> register({
    required String email,
    required String password,
  }) async {
    final operation = ++_operation;
    state = const CommandPending();
    final result = await _repository.register(email: email, password: password);
    if (operation != _operation) return;
    state = switch (result) {
      Success<void>() => const CommandSucceeded(null),
      Failure<void>(:final failure) => CommandFailed(failure),
    };
  }

  void abandon() {
    _operation++;
    state = const CommandIdle();
  }
}
