import 'dart:convert';

import '../../account/domain/account_repository.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/idempotency_key_generator.dart';
import '../../../core/network/idempotency_key_provider.dart';
import '../../../core/presentation/command_state.dart';
import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../check_in_providers.dart';
import '../domain/check_in_repository.dart';

final checkInControllerProvider =
    NotifierProvider<CheckInController, CommandState<CheckIn>>(
      CheckInController.new,
    );

final class CheckInController extends Notifier<CommandState<CheckIn>> {
  int _operation = 0;
  String? _createNote;
  String? _createIdempotencyKey;
  late CheckInRepository _repository;
  late IdempotencyKeyGenerator _keyGenerator;
  String? _authSubject;

  int get operationToken => _operation;

  @override
  CommandState<CheckIn> build() {
    _repository = ref.watch(checkInRepositoryProvider);
    _keyGenerator = ref.watch(idempotencyKeyGeneratorProvider);
    final authSubject = ref.watch(currentAuthSubjectProvider);
    if (_authSubject != authSubject) {
      _operation++;
      _createNote = null;
      _createIdempotencyKey = null;
    }
    _authSubject = authSubject;
    return const CommandIdle();
  }

  Future<void> create({
    required String note,
    String? mood,
    String? activity,
    String? locationLabel,
    CheckInVisibility? visibility,
  }) async {
    final normalizedResult = normalizeCheckInNote(note, mood: mood);
    if (normalizedResult case Failure<String>(:final failure)) {
      state = CommandFailed(failure);
      return;
    }
    final normalized = (normalizedResult as Success<String>).value;
    final fingerprint = jsonEncode([
      normalized,
      mood,
      activity,
      locationLabel,
      visibility?.name,
    ]);
    if (_createNote != fingerprint || _createIdempotencyKey == null) {
      _createNote = fingerprint;
      _createIdempotencyKey = _keyGenerator.generate();
    }

    final operation = ++_operation;
    state = const CommandPending();
    final result = await _repository.create(
      note: normalized,
      mood: mood,
      activity: activity,
      locationLabel: locationLabel,
      visibility: visibility,
      idempotencyKey: _createIdempotencyKey!,
    );
    if (!ref.mounted || operation != _operation) return;
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
    await _run(() => _repository.readOwned(checkInId: checkInId));
  }

  Future<void> _run(Future<Result<CheckIn>> Function() command) async {
    final operation = ++_operation;
    state = const CommandPending();
    final result = await command();
    if (!ref.mounted || operation != _operation) return;
    state = switch (result) {
      Success<CheckIn>(:final value) => CommandSucceeded(value),
      Failure<CheckIn>(:final failure) => CommandFailed(failure),
    };
  }

  void abandon([int? operation]) {
    if (operation != null && operation != _operation) return;
    final abandonedOperation = ++_operation;
    // Invalidate synchronously; defer UI notification until route disposal ends.
    // Retain the create Note/key because the server may already have committed.
    Future<void>.microtask(() {
      if (ref.mounted &&
          abandonedOperation == _operation &&
          state is CommandPending<CheckIn>) {
        state = const CommandIdle();
      }
    });
  }
}
