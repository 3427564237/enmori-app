import '../result/result.dart';

sealed class CommandState<T> {
  const CommandState();
}

final class CommandIdle<T> extends CommandState<T> {
  const CommandIdle();
}

final class CommandPending<T> extends CommandState<T> {
  const CommandPending();
}

final class CommandSucceeded<T> extends CommandState<T> {
  const CommandSucceeded(this.value);

  final T value;
}

final class CommandFailed<T> extends CommandState<T> {
  const CommandFailed(this.failure);

  final AppFailure failure;
}
