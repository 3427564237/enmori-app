import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/command_state.dart';
import '../../../core/result/result.dart';
import '../auth_providers.dart';
import '../domain/auth_repository.dart';

final signInControllerProvider =
    NotifierProvider<SignInController, CommandState<void>>(
      SignInController.new,
    );

final class SignInController extends Notifier<CommandState<void>> {
  int _operation = 0;
  late AuthRepository _repository;

  @override
  CommandState<void> build() {
    ref.watch(currentAuthSubjectProvider);
    _operation++;
    _repository = ref.watch(authRepositoryProvider);
    return const CommandIdle();
  }

  Future<void> signIn({required String email, required String password}) async {
    final operation = ++_operation;
    state = const CommandPending();
    final result = await _repository.signIn(email: email, password: password);
    if (!ref.mounted || operation != _operation) return;
    state = switch (result) {
      Success<void>() => const CommandSucceeded(null),
      Failure<void>(:final failure) => CommandFailed(failure),
    };
  }

  void abandon({bool resetState = true}) {
    _operation++;
    if (resetState) state = const CommandIdle();
  }
}
