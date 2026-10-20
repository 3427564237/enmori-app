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

// Only target/operation references, status, the original U's non-content identity
// and known tombstone IDs for this session's current conversation survive route
// disposal, never messages, input, tokens or keys.
// A new observed session (including the same UID) replaces this record; the
// app-owned Auth provider remains the sole session observer. No disk restoration.
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
  // Only explicit execute/readback pairs establish assistant ownership. History
  // order alone cannot identify a reply's user when earlier inputs are retried.
  final Map<String, String> _assistantUsers = {};
  final Map<String, int> _assistantObservations = {};
  int _assistantRevision = 0;
  int _requestNumber = 0;
  int _commandVersion = 0;
  AiMessage? _retryUser;
  List<AiConversationSummary> _conversations = const [];
  String? _historyCursor;
  String? _historyError;
  bool _historyLoaded = false;

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
    _assistantUsers.clear();
    final assistant = _memory.operationAssistantId;
    final user = _memory.operationUserId;
    if (assistant != null && user != null) {
      _assistantUsers[assistant] = user;
    }
    _assistantObservations.clear();
    _assistantRevision = 0;
    _retryUser = null;
    _conversations = const [];
    _historyCursor = null;
    _historyError = null;
    _historyLoaded = false;
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
      // R-A can stop an ordinary read too; readBusy must not trap the user in
      // recovery. Only an already dispatched target has this unknown-result exit.
      canLeaveWithoutRetrying:
          available &&
          hasTarget &&
          _memory.operationId != null &&
          _memory.unresolved &&
          !generating &&
          !_memory.deleting &&
          phase != AiConversationPhase.unauthenticated,
      canDelete:
          available &&
          hasTarget &&
          _reads.isEmpty &&
          phase != AiConversationPhase.deleting &&
          phase != AiConversationPhase.unauthenticated,
      canStartNewConversation:
          available &&
          !generating &&
          _reads.isEmpty &&
          !_memory.deleting &&
          _memory.conversationId != null &&
          (!_memory.unresolved || _memory.deleted),
      readBusy: _reads.isNotEmpty,
      conversations: _conversations,
      historyLoaded: _historyLoaded,
      historyCursor: _historyCursor,
      historyError: _historyError,
      canBrowseHistory:
          available &&
          (!terminalView || phase == AiConversationPhase.deleted) &&
          !generating &&
          !_memory.deleting &&
          _repository is AiConversationHistoryRepository,
      canSelectConversation:
          available &&
          (!terminalView || phase == AiConversationPhase.deleted) &&
          !generating &&
          !_memory.deleting &&
          _reads.isEmpty &&
          !_memory.unresolved,
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
    await _start(text, retryUser: user);
  }

  Future<void> _start(String text, {AiMessage? retryUser}) {
    if (!_validInput(text)) {
      _show(state.phase, message: 'Enter 1–2400 characters of valid text.');
      return Future.value();
    }
    _invalidateReads();
    if (retryUser != null) _memory.unresolved = true;
    _retryUser = null;
    final attempt = _Attempt(
      epoch: _epoch,
      repository: _repository!,
      auth: _auth,
      started: _now(),
      text: text,
      conversationId: _memory.established ? _memory.conversationId : null,
      userMessageId: retryUser?.messageId,
      userSequence: retryUser?.sequence,
      userPersistedAt: retryUser?.persistedAt,
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
      _memory.operationUserId = attempt.userMessageId;
      _memory.operationUserSequence = attempt.userSequence;
      _memory.operationUserPersistedAt = attempt.userPersistedAt;
      _memory.operationHasAssistant = false;
      _memory.operationAssistantId = null;
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
          // Reject the whole response before releasing protection or merging any
          // row. A valid UUID and matching text do not prove this is the Retry U.
          if (!attempt.matchesUser(value.userMessage) ||
              !_consistentPair(value.userMessage, value.assistantMessage)) {
            _failed(attempt, _unknown);
            return;
          }
          _finish(attempt);
          _memory.established = true;
          _memory.unresolved = false;
          if (_merge([
            value.userMessage,
            value.assistantMessage,
          ], ++_requestNumber)) {
            _recordPair(value.userMessage, value.assistantMessage);
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
      _conversations = const [];
      _historyCursor = null;
      _historyLoaded = false;
      _historyError = null;
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
    final assistantRevision = _assistantRevision;
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
        final user = value.userMessage;
        if (user != null && !_memory.matchesOperationUser(user)) {
          _show(AiConversationPhase.unknown);
          break;
        }
        switch (value.state) {
          case AiOutcomeState.active:
          case AiOutcomeState.unresolved:
            _show(AiConversationPhase.unknown);
          case AiOutcomeState.noEffect:
            if (_memory.operationUserId != null) {
              _show(AiConversationPhase.unknown);
              break;
            }
            _memory.unresolved = false;
            if (!_memory.established) {
              _memory.conversationId = null;
              _memory.operationId = null;
            }
            _show(AiConversationPhase.idle);
          case AiOutcomeState.userSaved:
            _memory.established = true;
            if (_merge([value.userMessage!], number)) {
              final user = value.userMessage!;
              if (_memory.operationHasAssistant ||
                  _assistantUsers.containsValue(user.messageId) ||
                  _newAssistantSince(user, assistantRevision)) {
                _show(AiConversationPhase.unknown);
                break;
              }
              _memory.recordOperationUser(user);
              _retryUser = value.userMessage;
              _memory.unresolved = false;
              _show(AiConversationPhase.idle);
            }
          case AiOutcomeState.assistantSaved:
            if (!_consistentPair(value.userMessage!, value.assistantMessage!)) {
              _show(AiConversationPhase.unknown);
              break;
            }
            _memory.established = true;
            if (_merge([value.userMessage!, value.assistantMessage!], number)) {
              _recordPair(value.userMessage!, value.assistantMessage!);
              _memory.unresolved = false;
              _show(AiConversationPhase.success);
            }
        }
    }
  }

  Future<void> loadConversations({bool more = false}) async {
    final repository = _repository;
    if (!state.canBrowseHistory ||
        state.readBusy ||
        repository is! AiConversationHistoryRepository) {
      return;
    }
    final history = repository as AiConversationHistoryRepository;
    final after = more ? _historyCursor : null;
    if (more && after == null) return;
    final epoch = _epoch, command = _commandVersion;
    _historyError = null;
    final result = await _ordinary(
      (token, abort) =>
          history.listConversations(token: token, abort: abort, after: after),
    );
    if (!_validReadResult(epoch, command)) return;
    switch (result) {
      case Success<AiConversationHistoryPage>(:final value):
        _conversations = more
            ? [..._conversations, ...value.conversations]
            : value.conversations;
        _historyCursor = value.nextCursor;
        _historyLoaded = true;
        _show(state.phase);
      case Failure<AiConversationHistoryPage>(:final failure):
        _historyError = 'Could not load conversation history. Try again.';
        _failure(failure);
    }
  }

  Future<void> selectConversation(String conversationId) async {
    if (!state.canSelectConversation ||
        !_conversations.any((c) => c.conversationId == conversationId)) {
      return;
    }
    _invalidateReads();
    _retryUser = null;
    _messageVersions.clear();
    _assistantUsers.clear();
    _assistantObservations.clear();
    _assistantRevision = 0;
    _memory.conversationId = conversationId;
    _memory.operationId = null;
    _memory.operationUserId = null;
    _memory.operationUserSequence = null;
    _memory.operationUserPersistedAt = null;
    _memory.operationAssistantId = null;
    _memory.operationHasAssistant = false;
    _memory.established = true;
    _memory.deleted = false;
    _show(AiConversationPhase.idle, clear: true);
    await loadMessages();
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
        // Discovery is an ordinary read: a subsequently expired/deleted target
        // has no unresolved write. Keep actual operation fences untouched.
        if (failure.kind == AppFailureKind.conversationUnavailable &&
            _memory.operationId == null) {
          _conversations = _conversations
              .where((c) => c.conversationId != conversation)
              .toList();
          _memory.conversationId = null;
          _memory.established = false;
          _memory.unresolved = false;
          _show(
            AiConversationPhase.idle,
            clear: true,
            message: 'This conversation is no longer available. Choose another conversation or send a new message.',
          );
          return;
        }
        _failure(failure);
      case Success<AiMessagePage>(:final value):
        _memory.established = true;
        if (_merge(value.messages, number, fromHistory: true)) {
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

  bool _relevantAssistant(AiMessage assistant, AiMessage user) =>
      assistant.role == AiRole.assistant &&
      assistant.sequence > user.sequence &&
      (_assistantUsers[assistant.messageId] == null ||
          _assistantUsers[assistant.messageId] == user.messageId);

  bool _newAssistantSince(AiMessage user, int revision) => state.messages.any(
    (message) =>
        _relevantAssistant(message, user) &&
        (_assistantObservations[message.messageId] ?? 0) > revision,
  );

  void _recordPair(AiMessage user, AiMessage assistant) {
    _assistantUsers[assistant.messageId] = user.messageId;
    _memory.recordOperationUser(user);
    _memory.operationHasAssistant = true;
    _memory.operationAssistantId = assistant.messageId;
  }

  bool _consistentPair(AiMessage user, AiMessage assistant) =>
      (_assistantUsers[assistant.messageId] == null ||
          _assistantUsers[assistant.messageId] == user.messageId) &&
      !_assistantUsers.entries.any(
        (pair) =>
            pair.value == user.messageId && pair.key != assistant.messageId,
      );

  bool _invalidMerge() {
    // A cleared display must not erase the fence against older readbacks.
    _invalidateReads();
    _retryUser = null;
    _memory.unresolved = true;
    _show(AiConversationPhase.unknown, clear: true);
    return false;
  }

  bool _merge(
    Iterable<AiMessage> incoming,
    int number, {
    bool fromHistory = false,
  }) {
    final messages = {
      for (final message in state.messages) message.messageId: message,
    };
    final newAssistants = <AiMessage>[];
    for (final incomingMessage in incoming) {
      final unavailable = _memory.tombstones.contains(
        incomingMessage.messageId,
      );
      if (unavailable && incomingMessage.role != AiRole.assistant) {
        return _invalidMerge();
      }
      // Clearing private content cannot release a known unavailable ID within
      // this session/conversation, including one observed only through history.
      final message = unavailable
          ? AiMessage(
              messageId: incomingMessage.messageId,
              sequence: incomingMessage.sequence,
              role: incomingMessage.role,
              persistedAt: incomingMessage.persistedAt,
              availability: AiAvailability.unavailable,
            )
          : incomingMessage;
      if (message.messageId == _memory.operationUserId &&
          !_memory.matchesOperationUser(message)) {
        return _invalidMerge();
      }
      final previous = messages[message.messageId];
      if (previous != null &&
          (previous.role != message.role ||
              previous.sequence != message.sequence ||
              previous.persistedAt != message.persistedAt ||
              (message.role == AiRole.user && previous.text != message.text))) {
        return _invalidMerge();
      }
      if (message.availability == AiAvailability.available &&
          (_messageVersions[message.messageId] ?? 0) > number) {
        continue;
      }
      if (message.role == AiRole.assistant &&
          (previous == null ||
              (previous.availability == AiAvailability.available &&
                  message.availability == AiAvailability.unavailable))) {
        newAssistants.add(message);
      }
      if (message.role == AiRole.assistant &&
          message.availability == AiAvailability.unavailable) {
        _memory.tombstones.add(message.messageId);
      }
      messages[message.messageId] = message;
      _messageVersions[message.messageId] = number;
    }
    final ordered = messages.values.toList()
      ..sort((a, b) => a.sequence.compareTo(b.sequence));
    if (ordered.map((m) => m.sequence).toSet().length != ordered.length) {
      return _invalidMerge();
    }
    var phase = state.phase;
    if (fromHistory) {
      for (final assistant in newAssistants) {
        _assistantObservations[assistant.messageId] = ++_assistantRevision;
        final user = _retryUser;
        if (user != null && _relevantAssistant(assistant, user)) {
          _retryUser = null;
          _memory.unresolved = true;
          phase = AiConversationPhase.unknown;
        }
      }
    }
    state = _snapshot(
      phase,
      messages: ordered,
      nextCursor: state.nextCursor,
      statusMessage: state.statusMessage,
    );
    return true;
  }

  /// Uses the existing reserved-new prepare path on the next explicit send.
  /// No DELETE, automatic resend, unknown-result escape or message replacement.
  void startNewConversation() {
    if (!state.canStartNewConversation) return;
    final previousWasDeleted = _memory.deleted;
    _invalidateReads();
    _retryUser = null;
    _messageVersions.clear();
    _assistantUsers.clear();
    _assistantObservations.clear();
    _assistantRevision = 0;
    _memory.conversationId = null;
    _memory.operationId = null;
    _memory.operationUserId = null;
    _memory.operationUserSequence = null;
    _memory.operationUserPersistedAt = null;
    _memory.operationHasAssistant = false;
    _memory.operationAssistantId = null;
    _memory.unresolved = false;
    _memory.established = false;
    _memory.deleted = false;
    _show(
      AiConversationPhase.idle,
      clear: true,
      message: previousWasDeleted
          ? 'New conversation.'
          : 'New conversation. Previous messages remain saved.',
    );
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
        _memory.unresolved = false;
        _conversations = _conversations
            .where((c) => c.conversationId != conversation)
            .toList();
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
  String? _conversationId;
  String? get conversationId => _conversationId;
  set conversationId(String? value) {
    if (value != _conversationId) tombstones.clear();
    _conversationId = value;
  }

  final Set<String> tombstones = {};
  String? operationId;
  String? operationUserId;
  int? operationUserSequence;
  DateTime? operationUserPersistedAt;
  bool operationHasAssistant = false;
  String? operationAssistantId;
  bool unresolved = false;
  bool established = false;
  bool deleting = false;
  bool deleted = false;

  void recordOperationUser(AiMessage user) {
    operationUserId = user.messageId;
    operationUserSequence = user.sequence;
    operationUserPersistedAt = user.persistedAt;
  }

  bool matchesOperationUser(AiMessage user) =>
      operationUserId == null ||
      (operationUserId == user.messageId &&
          operationUserSequence == user.sequence &&
          operationUserPersistedAt == user.persistedAt &&
          user.role == AiRole.user &&
          user.availability == AiAvailability.available);
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
    this.userSequence,
    this.userPersistedAt,
  });
  final Object epoch;
  final AiConversationRepository repository;
  final AuthRepository auth;
  final Duration started;
  final String? conversationId;
  final String? userMessageId;
  final int? userSequence;
  final DateTime? userPersistedAt;
  bool matchesUser(AiMessage user) =>
      userMessageId == null ||
      (user.messageId == userMessageId &&
          user.sequence == userSequence &&
          user.persistedAt == userPersistedAt &&
          user.role == AiRole.user &&
          user.availability == AiAvailability.available);
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
