import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/providers.dart';
import '../../../core/presentation/command_state.dart';
import '../../../core/result/result.dart';
import '../domain/check_in_repository.dart';

final checkInControllerProvider =
    NotifierProvider<CheckInController, CommandState<CheckIn>>(
      CheckInController.new,
    );

final class CheckInController extends Notifier<CommandState<CheckIn>> {
  int _operation = 0;
  String? _createNote;
  String? _createIdempotencyKey;

  @override
  CommandState<CheckIn> build() => const CommandIdle();

  Future<void> create({required String note}) async {
    final normalizedResult = normalizeCheckInNote(note);
    if (normalizedResult case Failure<String>(:final failure)) {
      state = CommandFailed(failure);
      return;
    }
    final normalized = (normalizedResult as Success<String>).value;
    if (_createNote != normalized || _createIdempotencyKey == null) {
      _createNote = normalized;
      _createIdempotencyKey = ref
          .read(idempotencyKeyGeneratorProvider)
          .generate();
    }

    final operation = ++_operation;
    state = const CommandPending();
    final result = await ref
        .read(checkInRepositoryProvider)
        .create(note: normalized, idempotencyKey: _createIdempotencyKey!);
    if (operation != _operation) return;
    state = switch (result) {
      Success<CheckIn>(:final value) => CommandSucceeded(value),
      Failure<CheckIn>(:final failure) => CommandFailed(failure),
    };
    if (result case Success<CheckIn>()) {
      _createNote = null;
      _createIdempotencyKey = null;
    }
  }

  Future<void> readPersisted({required String checkInId}) async {
    await _run(
      () => ref.read(checkInRepositoryProvider).readOwned(checkInId: checkInId),
    );
  }

  Future<void> _run(Future<Result<CheckIn>> Function() command) async {
    final operation = ++_operation;
    state = const CommandPending();
    final result = await command();
    if (operation != _operation) return;
    state = switch (result) {
      Success<CheckIn>(:final value) => CommandSucceeded(value),
      Failure<CheckIn>(:final failure) => CommandFailed(failure),
    };
  }

  void abandon() {
    _operation++;
    state = const CommandIdle();
  }
}
