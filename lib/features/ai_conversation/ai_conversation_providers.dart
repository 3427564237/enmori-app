import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/result/result.dart';
import '../auth/auth_providers.dart';
import '../auth/domain/auth_repository.dart';
import 'domain/ai_conversation.dart';
import 'domain/ai_conversation_repository.dart';
import 'presentation/ai_conversation_state.dart';

export 'domain/ai_conversation.dart';
export 'presentation/ai_conversation_state.dart';

// No ordinary/demo transport is composed. The explicit synthetic harness injects
// the real wire mapper with its controlled transport through this boundary.
final aiConversationRepositoryProvider = Provider<AiConversationRepository?>(
  (ref) => null,
);

final aiConversationNowProvider = Provider<Duration Function()>((ref) {
  final clock = Stopwatch()..start();
  ref.onDispose(clock.stop);
  return () => clock.elapsed;
});
final aiConversationUtcNowProvider = Provider<DateTime Function()>(
  (ref) =>
      () => DateTime.now().toUtc(),
);

// Only opaque references/status survive route disposal, never messages, input,
// tokens or ticket keys. A new observed session (including the same UID) replaces
// this record; the app-owned Auth provider remains the sole session observer.
final _memoryProvider = Provider<_Memory>((ref) {
  final auth = ref.watch(authSessionProvider).asData?.value;
  return _Memory(auth is AuthSessionAuthenticated);
});

final aiConversationControllerProvider =
    NotifierProvider.autoDispose<AiConversationController, AiConversationState>(
      AiConversationController.new,
    );

class AiConversationController extends Notifier<AiConversationState> {
  AiConversationRepository? _repository;
  late AuthRepository _auth;
  late _Memory _memory;
  late Duration Function() _now;
  late DateTime Function() _utcNow;
  Object _epoch = Object();
  bool _alive = false;
  _Attempt? _attempt;
  final Set<_ReadTask> _reads = {};
  final Map<String, int> _messageVersions = {};
  final Set<String> _tombstones = {};
  int _requestNumber = 0;
  int _commandVersion = 0;
  AiMessage? _retryUser;

  @override
  AiConversationState build() {
    _shutdown();
    _repository = ref.watch(aiConversationRepositoryProvider);
    _auth = ref.watch(authRepositoryProvider);
    _memory = ref.watch(_memoryProvider);
    _now = ref.watch(aiConversationNowProvider);
    _utcNow = ref.watch(aiConversationUtcNowProvider);
    _epoch = Object();
    _alive = true;
    _messageVersions.clear();
    _tombstones.clear();
    _retryUser = null;
    ref.onDispose(_shutdown);
    final phase = !_memory.authenticated
        ? AiConversationPhase.unauthenticated
        : _repository == null
        ? AiConversationPhase.unavailable
        : _memory.deleting
        ? AiConversationPhase.deleteUnknown
        : _memory.deleted
        ? AiConversationPhase.deleted
        : _memory.unresolved
        ? AiConversationPhase.unknown
        : AiConversationPhase.idle;
    return _snapshot(phase);
  }

  AiConversationState _snapshot(
    AiConversationPhase phase, {
    Iterable<AiMessage> messages = const [],
    String? nextCursor,
    String? statusMessage,
  }) {
    final available = _alive && _memory.authenticated && _repository != null;
    final terminalView = {
      AiConversationPhase.limited,
      AiConversationPhase.unauthenticated,
      AiConversationPhase.deleted,
      AiConversationPhase.authorityChanged,
    }.contains(phase);
    final generating = _attempt?.dispatchAllowed == true;
    final hasTarget = _memory.conversationId != null && !_memory.deleted;
    final ready =
        available &&
        !generating &&
        _reads.isEmpty &&
        !_memory.deleting &&
        !_memory.deleted;
    return AiConversationState(
      sessionKey: _memory.key,
      phase: phase,
      messages: messages,
      conversationId: _memory.conversationId,
      nextCursor: nextCursor,
      statusMessage: statusMessage,
      canSend:
          ready && !terminalView && !_memory.unresolved && _retryUser == null,
      canRetry:
          ready && !terminalView && !_memory.unresolved && _retryUser != null,
      canCheckResult: ready && hasTarget && _memory.operationId != null,
      canCancel: available && generating,
      canDelete:
          available &&
          hasTarget &&
          _reads.isEmpty &&
          phase != AiConversationPhase.deleting &&
          phase != AiConversationPhase.unauthenticated,
      readBusy: _reads.isNotEmpty,
    );
  }

  void _show(AiConversationPhase phase, {String? message, bool clear = false}) {
    if (!_alive || !ref.mounted) return;
    state = _snapshot(
      phase,
      messages: clear ? const [] : state.messages,
      nextCursor: clear ? null : state.nextCursor,
      statusMessage: message,
    );
  }

  Future<void> send(String text) async {
    if (!state.canSend) return;
    await _start(text);
  }

  Future<void> retry(String text) async {
    final user = _retryUser;
    if (!state.canRetry || user == null) return;
    if (text != user.text) {
      _show(state.phase, message: 'Enter the same saved message to retry.');
      return;
    }
    await _start(text, userMessageId: user.messageId);
  }

  Future<void> _start(String text, {String? userMessageId}) {
    if (!_validInput(text)) {
      _show(state.phase, message: 'Enter 1–2400 characters of valid text.');
      return Future.value();
    }
    _invalidateReads();
    if (userMessageId != null) _memory.unresolved = true;
    _retryUser = null;
    final attempt = _Attempt(
      epoch: _epoch,
      repository: _repository!,
      auth: _auth,
      started: _now(),
      text: text,
      conversationId: _memory.established ? _memory.conversationId : null,
      userMessageId: userMessageId,
    );
    _attempt = attempt;
    attempt.prepareTimer = Timer(const Duration(seconds: 15), () {
      _close(attempt, AiConversationPhase.timedOut);
    });
    attempt.totalTimer = Timer(const Duration(seconds: 90), () {
      _close(attempt, AiConversationPhase.timedOut);
    });
    _show(AiConversationPhase.preparing);
    unawaited(_run(attempt));
    return attempt.ended.future;
  }

  bool _current(_Attempt attempt) =>
      _alive &&
      ref.mounted &&
      identical(_epoch, attempt.epoch) &&
      identical(_attempt, attempt) &&
      attempt.dispatchAllowed;

  Future<void> _run(_Attempt attempt) async {
    try {
      final token = await attempt.auth.getIdToken();
      if (!_current(attempt)) return;
      if (_now() - attempt.started >= const Duration(seconds: 15)) {
        _close(attempt, AiConversationPhase.timedOut);
        return;
      }
      if (token case Failure<String>(:final failure)) {
        _failed(attempt, failure);
        return;
      }
      attempt.token = (token as Success<String>).value;
      final prepared = await attempt.repository.prepare(
        token: attempt.token!,
        abort: attempt.abort,
        conversationId: attempt.conversationId,
        userMessageId: attempt.userMessageId,
      );
      if (prepared case Success<AiTicket>(:final value)) {
        attempt.ticket = value;
      }
      if (!_current(attempt)) {
        _cleanup(attempt);
        return;
      }
      if (prepared case Failure<AiTicket>(:final failure)) {
        _failed(attempt, failure);
        return;
      }
      if (_now() - attempt.started >= const Duration(seconds: 15) ||
          !attempt.ticket!.preparationExpiresAt.isAfter(_utcNow())) {
        _close(attempt, AiConversationPhase.timedOut);
        return;
      }
      attempt.prepareTimer?.cancel();
      _memory.conversationId = attempt.ticket!.conversationId;
      _memory.operationId = attempt.ticket!.operationId;
      _memory.unresolved = true;
      attempt.dispatched = true;
      attempt.executeStarted = _now();
      attempt.executeTimer = Timer(const Duration(seconds: 75), () {
        _close(attempt, AiConversationPhase.timedOut);
      });
      _show(AiConversationPhase.waiting);
      // No yield between the final original-attempt check and this dispatch.
      if (!_current(attempt)) return;
      final input = attempt.text!;
      attempt.text = null;
      final reply = await attempt.repository.execute(
        token: attempt.token!,
        abort: attempt.abort,
        ticket: attempt.ticket!,
        text: input,
      );
      if (!_current(attempt)) return;
      if (_now() - attempt.started >= const Duration(seconds: 90) ||
          _now() - attempt.executeStarted! >= const Duration(seconds: 75)) {
        _close(attempt, AiConversationPhase.timedOut);
        return;
      }
      switch (reply) {
        case Success<AiReply>(:final value):
          _finish(attempt);
          _memory.established = true;
          _memory.unresolved = false;
          if (_merge([
            value.userMessage,
            value.assistantMessage,
          ], ++_requestNumber)) {
            _show(AiConversationPhase.success);
          }
        case Failure<AiReply>(:final failure):
          _failed(attempt, failure);
      }
    } catch (_) {
      if (_current(attempt)) _close(attempt, AiConversationPhase.unknown);
    } finally {
      if (!attempt.dispatchAllowed && attempt.ticket == null) {
        // With no ticket, expiry is the only remaining prepare cleanup.
        attempt.releaseSecrets();
      }
    }
  }

  void _failed(_Attempt attempt, AppFailure failure) {
    final wasDispatched = attempt.dispatched;
    attempt.dispatchAllowed = false;
    attempt.abort.abort();
    _cleanup(attempt);
    _finish(attempt);
    // Even a rejected reply can follow a saved user message. Only an explicit
    // authoritative readback releases a dispatched logical input for retry.
    if (wasDispatched) _memory.unresolved = true;
    _failure(failure);
  }

  void _failure(AppFailure failure) {
    final phase = switch (failure.kind) {
      AppFailureKind.authRequired ||
      AppFailureKind.authForbidden => AiConversationPhase.unauthenticated,
      AppFailureKind.aiContextNotPermitted => AiConversationPhase.limited,
      AppFailureKind.aiBusy => AiConversationPhase.busy,
      AppFailureKind.aiReplyRejected => AiConversationPhase.rejected,
      AppFailureKind.aiAuthorityChanged => AiConversationPhase.authorityChanged,
      AppFailureKind.aiOutcomeUnresolved ||
      AppFailureKind.aiOperationConflict ||
      AppFailureKind.aiOperationUnavailable => AiConversationPhase.unknown,
      _ => AiConversationPhase.unavailable,
    };
    if (phase == AiConversationPhase.unauthenticated ||
        phase == AiConversationPhase.limited ||
        phase == AiConversationPhase.authorityChanged ||
        failure.kind == AppFailureKind.conversationUnavailable) {
      _invalidateReads();
      _retryUser = null;
      _memory.unresolved = true;
      _show(phase, clear: true);
    } else {
      _show(phase);
    }
  }

  void _finish(_Attempt attempt) {
    attempt.dispatchAllowed = false;
    attempt.stopTimers();
    attempt.releaseSecrets();
    if (identical(_attempt, attempt)) _attempt = null;
    if (!attempt.ended.isCompleted) attempt.ended.complete();
  }

  void cancel() {
    final attempt = _attempt;
    if (attempt != null) {
      _close(
        attempt,
        AiConversationPhase.unknown,
        message: 'Cancellation requested. The result has not been confirmed.',
      );
    }
  }

  void _close(
    _Attempt attempt,
    AiConversationPhase phase, {
    bool notify = true,
    String? message,
  }) {
    if (!attempt.dispatchAllowed) return;
    // This synchronous irreversible fence precedes abort and every awaited I/O.
    attempt.dispatchAllowed = false;
    attempt.text = null;
    attempt.stopTimers();
    attempt.abort.abort();
    if (!attempt.ended.isCompleted) attempt.ended.complete();
    final current =
        identical(_attempt, attempt) && identical(_epoch, attempt.epoch);
    if (current) {
      _attempt = null;
      if (attempt.dispatched) _memory.unresolved = true;
    }
    _cleanup(attempt);
    // Keep an already acquired original token only briefly for a late prepare
    // ticket's best-effort invalidation, then release it even if transport hangs.
    if (attempt.ticket == null && attempt.token != null) {
      attempt.cleanupTimer = Timer(
        const Duration(seconds: 15),
        attempt.releaseSecrets,
      );
    }
    if (notify && current) {
      _show(phase, message: message);
    }
  }

  void _cleanup(_Attempt attempt) {
    final token = attempt.token;
    final ticket = attempt.ticket;
    if (token == null || ticket == null || attempt.cancelSent) return;
    attempt.cancelSent = true;
    attempt.releaseSecrets();
    final signal = AiAbortSignal();
    final timer = Timer(const Duration(seconds: 15), signal.abort);
    unawaited(() async {
      try {
        await Future.any<Object?>([
          attempt.repository.cancel(
            token: token,
            abort: signal,
            ticket: ticket,
          ),
          signal.whenAborted,
        ]);
      } catch (_) {
        // Cancellation acknowledgment never proves that nothing was saved.
      } finally {
        timer.cancel();
      }
    }());
  }

  Future<Result<T>> _ordinary<T>(
    Future<Result<T>> Function(String token, AiAbortSignal abort) invoke,
  ) {
    final task = _ReadTask(_epoch, _commandVersion);
    final completion = Completer<Result<T>>();
    _reads.add(task);
    _show(state.phase, message: state.statusMessage);
    final auth = _auth;
    final started = _now();
    void deadline() {
      task.abort.abort();
      if (!completion.isCompleted) completion.complete(const Failure(_unknown));
    }

    final timer = Timer(const Duration(seconds: 15), deadline);
    unawaited(() async {
      try {
        final token = await auth.getIdToken();
        if (!_readCurrent(task)) return;
        if (_now() - started >= const Duration(seconds: 15)) {
          deadline();
          return;
        }
        final result = switch (token) {
          Success<String>(:final value) => await invoke(value, task.abort),
          Failure<String>(:final failure) => Failure<T>(failure),
        };
        if (_now() - started >= const Duration(seconds: 15)) {
          deadline();
          return;
        }
        if (_readCurrent(task) && !completion.isCompleted) {
          completion.complete(result);
        }
      } catch (_) {
        if (!completion.isCompleted) {
          completion.complete(const Failure(_unknown));
        }
      }
    }());
    unawaited(
      task.abort.whenAborted.then((_) {
        if (!completion.isCompleted) {
          completion.complete(const Failure(_unknown));
        }
      }),
    );
    return completion.future.whenComplete(() {
      timer.cancel();
      _reads.remove(task);
    });
  }

  bool _readCurrent(_ReadTask task) =>
      _alive &&
      ref.mounted &&
      identical(task.epoch, _epoch) &&
      task.commandVersion == _commandVersion &&
      !task.abort.isAborted;

  Future<void> checkResult() async {
    if (!state.canCheckResult) return;
    final conversation = _memory.conversationId!;
    final operation = _memory.operationId!;
    final epoch = _epoch;
    final command = _commandVersion;
    final number = ++_requestNumber;
    final repository = _repository!;
    final result = await _ordinary(
      (token, abort) => repository.readOperation(
        token: token,
        abort: abort,
        conversationId: conversation,
        operationId: operation,
      ),
    );
    if (!_validReadResult(epoch, command) || operation != _memory.operationId) {
      return;
    }
    switch (result) {
      case Failure<AiReadback>(:final failure):
        _memory.unresolved = true;
        _failure(failure);
      case Success<AiReadback>(:final value):
        _retryUser = null;
        _memory.unresolved = true;
        switch (value.state) {
          case AiOutcomeState.active:
          case AiOutcomeState.unresolved:
            _show(AiConversationPhase.unknown);
          case AiOutcomeState.noEffect:
            _memory.unresolved = false;
            if (!_memory.established) {
              _memory.conversationId = null;
              _memory.operationId = null;
            }
            _show(AiConversationPhase.idle);
          case AiOutcomeState.userSaved:
            _memory.established = true;
            if (_merge([value.userMessage!], number)) {
              _retryUser = value.userMessage;
              _memory.unresolved = false;
              _show(AiConversationPhase.idle);
            }
          case AiOutcomeState.assistantSaved:
            _memory.established = true;
            if (_merge([value.userMessage!, value.assistantMessage!], number)) {
              _memory.unresolved = false;
              _show(AiConversationPhase.success);
            }
        }
    }
  }

  Future<void> loadMessages({String? before}) async {
    final conversation = _memory.conversationId;
    if (!_alive ||
        !_memory.authenticated ||
        _repository == null ||
        conversation == null ||
        _memory.deleted ||
        _memory.deleting ||
        _attempt != null) {
      return;
    }
    final epoch = _epoch;
    final command = _commandVersion;
    final number = ++_requestNumber;
    final repository = _repository!;
    final result = await _ordinary(
      (token, abort) => repository.readMessages(
        token: token,
        abort: abort,
        conversationId: conversation,
        before: before,
      ),
    );
    if (!_validReadResult(epoch, command)) return;
    switch (result) {
      case Failure<AiMessagePage>(:final failure):
        _failure(failure);
      case Success<AiMessagePage>(:final value):
        _memory.established = true;
        if (_merge(value.messages, number)) {
          state = _snapshot(
            state.phase,
            messages: state.messages,
            nextCursor: value.nextCursor,
            statusMessage: state.statusMessage,
          );
        }
    }
  }

  bool _validReadResult(Object epoch, int command) =>
      _alive &&
      ref.mounted &&
      identical(epoch, _epoch) &&
      command == _commandVersion;

  bool _merge(Iterable<AiMessage> incoming, int number) {
    final messages = {
      for (final message in state.messages) message.messageId: message,
    };
    for (final message in incoming) {
      final previous = messages[message.messageId];
      if (previous != null &&
          (previous.role != message.role ||
              previous.sequence != message.sequence ||
              previous.persistedAt != message.persistedAt ||
              (message.role == AiRole.user && previous.text != message.text))) {
        _memory.unresolved = true;
        _show(AiConversationPhase.unknown, clear: true);
        return false;
      }
      if (message.availability == AiAvailability.available &&
          (_messageVersions[message.messageId] ?? 0) > number) {
        continue;
      }
      if (_tombstones.contains(message.messageId) &&
          message.availability == AiAvailability.available) {
        continue;
      }
      if (message.availability == AiAvailability.unavailable) {
        _tombstones.add(message.messageId);
      }
      messages[message.messageId] = message;
      _messageVersions[message.messageId] = number;
    }
    final ordered = messages.values.toList()
      ..sort((a, b) => a.sequence.compareTo(b.sequence));
    if (ordered.map((m) => m.sequence).toSet().length != ordered.length) {
      _memory.unresolved = true;
      _show(AiConversationPhase.unknown, clear: true);
      return false;
    }
    state = _snapshot(
      state.phase,
      messages: ordered,
      nextCursor: state.nextCursor,
      statusMessage: state.statusMessage,
    );
    return true;
  }

  Future<void> deleteConversation() async {
    if (!state.canDelete) return;
    final conversation = _memory.conversationId!;
    cancel();
    _invalidateReads();
    _retryUser = null;
    _memory.deleting = true;
    _memory.unresolved = true;
    _show(AiConversationPhase.deleting, clear: true);
    final epoch = _epoch;
    final command = _commandVersion;
    final repository = _repository!;
    final result = await _ordinary(
      (token, abort) => repository.deleteConversation(
        token: token,
        abort: abort,
        conversationId: conversation,
      ),
    );
    if (!_validReadResult(epoch, command)) return;
    switch (result) {
      case Success<void>():
        _memory.deleting = false;
        _memory.deleted = true;
        _memory.operationId = null;
        _show(AiConversationPhase.deleted, clear: true);
      case Failure<void>(:final failure):
        if (failure.kind == AppFailureKind.authRequired ||
            failure.kind == AppFailureKind.authForbidden) {
          _failure(failure);
        } else {
          _show(AiConversationPhase.deleteUnknown, clear: true);
        }
    }
  }

  void _invalidateReads() {
    _commandVersion++;
    for (final read in _reads.toList()) {
      read.abort.abort();
    }
    _reads.clear();
  }

  void leave() {
    cancel();
    _invalidateReads();
    if (_retryUser != null) _memory.unresolved = true;
    _retryUser = null;
    final phase = _memory.deleted
        ? AiConversationPhase.deleted
        : _memory.deleting
        ? AiConversationPhase.deleteUnknown
        : {
            AiConversationPhase.limited,
            AiConversationPhase.authorityChanged,
            AiConversationPhase.unauthenticated,
          }.contains(state.phase)
        ? state.phase
        : _memory.unresolved
        ? AiConversationPhase.unknown
        : AiConversationPhase.idle;
    _show(phase, clear: true);
  }

  // Safe during widget disposal: close control synchronously without a provider
  // write. Auto-disposal drops page content; only _Memory's references survive.
  void detach({Object? sessionKey}) {
    if (sessionKey != null && !identical(sessionKey, _memory.key)) return;
    _shutdown();
  }

  void _shutdown() {
    if (!_alive) return;
    final attempt = _attempt;
    if (attempt != null) {
      _close(attempt, AiConversationPhase.unknown, notify: false);
    }
    _alive = false;
    _invalidateReads();
    if (_retryUser != null) _memory.unresolved = true;
    _retryUser = null;
  }
}

final class _Memory {
  _Memory(this.authenticated);
  final bool authenticated;
  final Object key = Object();
  String? conversationId;
  String? operationId;
  bool unresolved = false;
  bool established = false;
  bool deleting = false;
  bool deleted = false;
}

final class _Attempt {
  _Attempt({
    required this.epoch,
    required this.repository,
    required this.auth,
    required this.started,
    required this.text,
    this.conversationId,
    this.userMessageId,
  });
  final Object epoch;
  final AiConversationRepository repository;
  final AuthRepository auth;
  final Duration started;
  final String? conversationId;
  final String? userMessageId;
  final AiAbortSignal abort = AiAbortSignal();
  final Completer<void> ended = Completer<void>();
  String? text;
  String? token;
  AiTicket? ticket;
  bool dispatched = false;
  bool dispatchAllowed = true;
  bool cancelSent = false;
  Duration? executeStarted;
  Timer? prepareTimer, executeTimer, totalTimer, cleanupTimer;
  void stopTimers() {
    prepareTimer?.cancel();
    executeTimer?.cancel();
    totalTimer?.cancel();
  }

  void releaseSecrets() {
    text = null;
    token = null;
    ticket = null;
    cleanupTimer?.cancel();
  }
}

final class _ReadTask {
  _ReadTask(this.epoch, this.commandVersion);
  final Object epoch;
  final int commandVersion;
  final AiAbortSignal abort = AiAbortSignal();
}

bool _validInput(String text) {
  if (text.trim().isEmpty || text.runes.length > 2400) return false;
  final units = text.codeUnits;
  for (var i = 0; i < units.length; i++) {
    final unit = units[i];
    if (unit >= 0xd800 && unit <= 0xdbff) {
      if (++i >= units.length || units[i] < 0xdc00 || units[i] > 0xdfff) {
        return false;
      }
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return false;
    }
  }
  return true;
}

const _unknown = AppFailure(
  kind: AppFailureKind.aiOutcomeUnresolved,
  message: 'The result could not be confirmed.',
);
