import 'dart:async';

import '../../../core/result/result.dart';
import 'persona.dart';
import 'persona_repository.dart';

enum PersonaCreateStatus { waiting, uncertain, recoveryClosed }

final class PersonaPendingCreate {
  const PersonaPendingCreate({
    required this.command,
    required this.status,
    required this.canRetry,
    required this.canEnd,
  });

  final PersonaCreateCommand command;
  final PersonaCreateStatus status;
  final bool canRetry;
  final bool canEnd;
}

final class PersonaSessionState {
  const PersonaSessionState({
    required this.sessionKey,
    this.collection,
    this.isLoading = false,
    this.isBusy = false,
    this.isCurrent = false,
    this.message,
    this.failure,
    this.pendingCreate,
    this.confirmedWriteCount = 0,
    this.lastConfirmedCreateKey,
  });

  final Object sessionKey;
  final PersonaCollection? collection;
  final bool isLoading;
  final bool isBusy;
  final bool isCurrent;
  final String? message;
  final AppFailure? failure;
  final PersonaPendingCreate? pendingCreate;
  final int confirmedWriteCount;
  final String? lastConfirmedCreateKey;

  bool get canStartNewCreate =>
      isCurrent &&
      !isBusy &&
      pendingCreate == null &&
      (collection?.items.length ?? 5) < 5;
}

/// Owns in-memory command settlement for one observed authenticated session.
/// Page disposal never disposes this source. Auth/session disposal always does.
final class PersonaSession {
  PersonaSession(this._repository, {required this.newKey});

  final PersonaRepository _repository;
  final String Function() newKey;
  final Object sessionKey = Object();
  final _changes = StreamController<PersonaSessionState>.broadcast(sync: true);
  bool _active = true;
  PersonaCollection? _collection;
  int _knownRevision = -1;
  int _readCounter = 0;
  int _acceptedRead = 0;
  int _minimumRead = 0;
  bool _loading = false;
  bool _writing = false;
  bool _unconfirmed = true;
  String? _message;
  AppFailure? _failure;
  _CreateCommand? _pending;
  Object? _foreground;
  int _confirmedWrites = 0;
  int _feedbackGeneration = 0;
  String? _lastConfirmedCreateKey;

  Stream<PersonaSessionState> get changes => _changes.stream;
  bool get isActive => _active;
  bool get _current =>
      !_unconfirmed &&
      _collection != null &&
      _collection!.stateRevision >= _knownRevision;

  PersonaSessionState get state {
    final pending = _pending;
    return PersonaSessionState(
      sessionKey: sessionKey,
      collection: _collection,
      isLoading: _loading,
      isBusy: _writing || _foreground != null,
      isCurrent: _current,
      message: _message,
      failure: _failure,
      confirmedWriteCount: _confirmedWrites,
      lastConfirmedCreateKey: _lastConfirmedCreateKey,
      pendingCreate: pending == null
          ? null
          : PersonaPendingCreate(
              command: pending.command,
              status: _foreground != null
                  ? PersonaCreateStatus.waiting
                  : pending.closed
                  ? PersonaCreateStatus.recoveryClosed
                  : PersonaCreateStatus.uncertain,
              canRetry: _foreground == null && !_writing && !pending.closed,
              canEnd:
                  _foreground == null &&
                  !_writing &&
                  _current &&
                  _acceptedRead > pending.reconcileAfter,
            ),
    );
  }

  void _emit() {
    if (_active) _changes.add(state);
  }

  Future<void> load() async {
    if (!_active) return;
    final read = ++_readCounter;
    _loading = true;
    _failure = null;
    _emit();
    final result = await _repository.readAll(isEligible: () => _active);
    if (!_active) return;
    if (read == _readCounter) _loading = false;
    switch (result) {
      case Success<PersonaCollection>(:final value):
        if (value.stateRevision >= _knownRevision && read >= _minimumRead) {
          _knownRevision = value.stateRevision;
          _collection = value;
          _unconfirmed = false;
          if (read > _acceptedRead) _acceptedRead = read;
          if (read == _readCounter) {
            _failure = null;
            if (_pending == null && !_writing) _message = null;
          }
        } else if (read == _readCounter) {
          _message = 'Your Personas changed. Reload them before trying again.';
        }
      case Failure<PersonaCollection>(:final failure):
        if (read == _readCounter) {
          _failure = failure;
          _unconfirmed = true;
          _minimumRead = _readCounter + 1;
          _message = 'Personas could not be loaded. Try again.';
        }
    }
    _emit();
  }

  Future<Result<PersonaMutation>> readPersona(String id) async {
    if (!_active) return const Failure(_ended);
    final result = await _repository.readOne(id, isEligible: () => _active);
    if (!_active) return const Failure(_ended);
    if (result case Success<PersonaMutation>(:final value)) {
      _observeRevision(value.stateRevision);
      if (!_current) {
        _message = 'Your Personas changed. Reload them before trying again.';
      }
      _emit();
    }
    return result;
  }

  Future<bool> create(PersonaFields fields) async {
    if (!_active || !state.canStartNewCreate) return false;
    final command = _CreateCommand(
      PersonaCreateCommand(
        fields: fields.normalized,
        expectedStateRevision: _collection!.stateRevision,
        idempotencyKey: newKey(),
      ),
    );
    _pending = command;
    await _attemptCreate(command);
    return _active && _lastConfirmedCreateKey == command.command.idempotencyKey;
  }

  Future<void> retryCreate() async {
    final command = _pending;
    if (!_active || command == null || !state.pendingCreate!.canRetry) return;
    await _attemptCreate(command);
  }

  bool _matches(_CreateCommand command) =>
      _active && identical(_pending, command);

  Future<void> _attemptCreate(_CreateCommand command) async {
    _feedbackGeneration++;
    final attemptId = Object();
    _foreground = attemptId;
    command.outstanding.add(attemptId);
    _failure = null;
    _message = null;
    _emit();
    final attempt = _repository.create(
      command.command,
      isEligible: () => _matches(command),
    );
    // This observer belongs to the session, not the foreground page Future.
    void settle(Result<PersonaMutation> result) {
      if (!_matches(command) || !command.outstanding.remove(attemptId)) {
        return;
      }
      if (identical(_foreground, attemptId)) _foreground = null;
      switch (result) {
        case Success<PersonaMutation>(:final value):
          _observeRevision(value.stateRevision);
          _unconfirmed = true;
          _minimumRead = _readCounter + 1;
          _lastConfirmedCreateKey = command.command.idempotencyKey;
          _confirmedWrites++;
          _pending = null;
          _foreground = null;
          _failure = null;
          _message = 'Your change was saved.';
          _emit();
          unawaited(_readAfterWrite());
        case Failure<PersonaMutation>(:final failure):
          _failure = failure;
          if (failure.kind ==
              AppFailureKind.personaRevisionPreconditionFailed) {
            _unconfirmed = true;
            _minimumRead = _readCounter + 1;
          }
          if (command.closed) {
            _message = _closedCreate;
          } else if (command.uncertain &&
              failure.kind ==
                  AppFailureKind.personaRevisionPreconditionFailed) {
            command.closed = true;
            command.reconcileAfter = _readCounter;
            _message = _closedCreate;
          } else if (!command.uncertain &&
              command.outstanding.isEmpty &&
              (!attempt.dispatched || _definiteRejection(failure))) {
            _pending = null;
            _message = _failureCopy(failure);
          } else {
            command.uncertain = true;
            command.reconcileAfter = _readCounter;
            _message = _uncertainCreate;
          }
          _emit();
      }
    }

    unawaited(attempt.completion.then(settle));
    final result = await attempt.foreground;
    if (result is Success<PersonaMutation> ||
        (result is Failure<PersonaMutation> &&
            (!attempt.dispatched || _definiteRejection(result.failure)))) {
      settle(result);
    }
    if (!_matches(command) || !identical(_foreground, attemptId)) return;
    _foreground = null;
    if (result is Failure<PersonaMutation> &&
        command.outstanding.contains(attemptId)) {
      // A dispatched timeout has no bearing on eventual server commitment.
      if (attempt.dispatched) command.uncertain = true;
      command.reconcileAfter = _readCounter;
      _message = _uncertainCreate;
    }
    _emit();
  }

  bool endUnresolvedCreate() {
    if (!_active || state.pendingCreate?.canEnd != true) return false;
    _pending = null;
    _feedbackGeneration++;
    _foreground = null;
    _failure = null;
    _message = null;
    _emit();
    return true;
  }

  Future<bool> edit(Persona target, PersonaFields fields) async {
    if (!_canMutate) return false;
    _beginWrite();
    final result = await _repository.edit(
      target.personaId,
      fields: fields.normalized,
      expectedRevision: target.revision,
      expectedStateRevision: _collection!.stateRevision,
      isEligible: () => _active,
    );
    if (!_active) return false;
    switch (result) {
      case Success<PersonaMutation>(:final value):
        _observeRevision(value.stateRevision);
        await _writeSucceeded();
        return true;
      case Failure<PersonaMutation>(:final failure):
        _writeFailed(failure);
        return false;
    }
  }

  Future<void> activate(Persona target) async {
    if (!_canMutate) return;
    _beginWrite();
    final result = await _repository.activate(
      target.personaId,
      expectedRevision: target.revision,
      expectedStateRevision: _collection!.stateRevision,
      isEligible: () => _active,
    );
    if (!_active) return;
    switch (result) {
      case Success<PersonaCollection>(:final value):
        _observeRevision(value.stateRevision);
        await _writeSucceeded();
      case Failure<PersonaCollection>(:final failure):
        _writeFailed(failure);
    }
  }

  Future<void> delete(Persona target) async {
    if (!_canMutate) return;
    _beginWrite();
    final result = await _repository.delete(
      target.personaId,
      expectedRevision: target.revision,
      expectedStateRevision: _collection!.stateRevision,
      isEligible: () => _active,
    );
    if (!_active) return;
    switch (result) {
      case Success<void>():
        // DELETE has no revision body; never fabricate the next revision.
        await _writeSucceeded();
      case Failure<void>(:final failure):
        _writeFailed(failure);
    }
  }

  bool get _canMutate => _active && _current && !state.isBusy;
  void _beginWrite() {
    _feedbackGeneration++;
    _writing = true;
    _failure = null;
    _message = null;
    _emit();
  }

  Future<void> _writeSucceeded() async {
    _writing = false;
    _unconfirmed = true;
    _minimumRead = _readCounter + 1;
    _confirmedWrites++;
    _message = 'Your change was saved.';
    _emit();
    await _readAfterWrite();
  }

  Future<void> _readAfterWrite() async {
    final write = _confirmedWrites;
    final feedback = _feedbackGeneration;
    await load();
    if (!_active ||
        _writing ||
        _pending != null ||
        write != _confirmedWrites ||
        feedback != _feedbackGeneration) {
      return;
    }
    _message = _current
        ? 'Your change was saved.'
        : 'Your change was saved, but the latest state could not be loaded. '
              'Reload to confirm it.';
    _emit();
  }

  void _writeFailed(AppFailure failure) {
    _writing = false;
    _unconfirmed = true;
    _minimumRead = _readCounter + 1;
    _failure = failure;
    _message = switch (failure.kind) {
      AppFailureKind.personaRevisionPreconditionFailed =>
        'Your Personas changed. Reload them before trying again.',
      AppFailureKind.personaUnavailable => 'This Persona is unavailable.',
      _ =>
        _definiteRejection(failure)
            ? _failureCopy(failure)
            : 'The change could not be confirmed. Reload before trying again.',
    };
    _emit();
  }

  void _observeRevision(int revision) {
    if (revision > _knownRevision) _knownRevision = revision;
  }

  void dispose() {
    if (!_active) return;
    _active = false;
    _pending = null;
    _collection = null;
    _foreground = null;
    unawaited(_changes.close());
  }
}

final class _CreateCommand {
  _CreateCommand(this.command);
  final PersonaCreateCommand command;
  final Set<Object> outstanding = {};
  bool uncertain = false;
  bool closed = false;
  int reconcileAfter = 0;
}

const _ended = AppFailure(
  kind: AppFailureKind.authRequired,
  message: 'Authentication is required.',
);
const _uncertainCreate =
    'Creation could not be confirmed. Recover this request '
    'or review your saved Personas before creating another.';
const _closedCreate =
    'Your Personas changed, so this request can no longer '
    'be recovered. Review your Personas before starting a new create.';

bool _definiteRejection(AppFailure failure) => switch (failure.kind) {
  AppFailureKind.personaInvalid ||
  AppFailureKind.personaUnavailable ||
  AppFailureKind.personaLimitReached ||
  AppFailureKind.personaCommandConflict ||
  AppFailureKind.personaRevisionPreconditionFailed ||
  AppFailureKind.authRequired ||
  AppFailureKind.authForbidden ||
  AppFailureKind.onboardingRequired ||
  AppFailureKind.requestInvalid ||
  AppFailureKind.idempotencyKeyInvalid => true,
  _ => false,
};

String _failureCopy(AppFailure failure) => switch (failure.kind) {
  AppFailureKind.personaInvalid =>
    'Use a name of 1–50 characters, valid style options and valid versions.',
  AppFailureKind.personaLimitReached =>
    'You have 5 Personas. Delete one before creating another.',
  AppFailureKind.personaUnavailable => 'This Persona is unavailable.',
  AppFailureKind.personaCommandConflict => 'This create request conflicts with an earlier operation. Reload before continuing.',
  AppFailureKind.personaRevisionPreconditionFailed =>
    'Your Personas changed. Reload them before trying again.',
  _ => 'Personas could not be loaded. Try again.',
};
