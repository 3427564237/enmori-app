import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/widgets.dart';

import '../account/account_preferences_providers.dart';
import '../account/domain/account_repository.dart';
import '../account/content_access.dart';

import '../../core/result/result.dart';
import '../auth/auth_providers.dart';
import '../auth/domain/auth_repository.dart';
import 'domain/ai_conversation.dart';
import 'domain/ai_conversation_repository.dart';
import 'domain/ai_owned_sources.dart';
import 'domain/ai_selected_reply.dart';
import 'presentation/ai_conversation_state.dart';

export 'domain/ai_conversation.dart';
export 'domain/ai_owned_sources.dart';
export 'presentation/ai_conversation_state.dart';

// No ordinary/demo transport is composed. The explicit synthetic harness injects
// the real wire mapper with its controlled transport through this boundary.
final aiConversationRepositoryProvider = Provider<AiConversationRepository?>(
  (ref) => null,
);

final aiCompanionReferencesEnabledProvider = Provider<bool>((ref) => false);

final aiConversationNowProvider = Provider<Duration Function()>((ref) {
  final clock = Stopwatch()..start();
  ref.onDispose(clock.stop);
  return () => clock.elapsed;
});
final aiConversationUtcNowProvider = Provider<DateTime Function()>(
  (ref) =>
      () => DateTime.now().toUtc(),
);

// Operation identity is session-owned. The controller also keeps messages and
// the unsent editor value in RAM across routes; all are replaced on a new auth
// observation, including the same UID. Nothing is restored from disk.
final _memoryProvider = Provider<_Memory>((ref) {
  final auth = ref.watch(authSessionProvider).asData?.value;
  return _Memory(auth is AuthSessionAuthenticated);
});

final aiConversationControllerProvider =
    NotifierProvider<AiConversationController, AiConversationState>(
      AiConversationController.new,
    );

class AiConversationController extends Notifier<AiConversationState> {
  AiConversationRepository? _repository;
  late AuthRepository _auth;
  late _Memory _memory;
  late Duration Function() _now;
  late DateTime Function() _utcNow;
  Object _epoch = Object();
  Object _contextScopeKey = Object();
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
  int _messageReadRevision = 0;
  List<String> _lastReadMessageIds = const [];
  final _unverifiedReplyTargets = <String>{};
  AiMessageLocation? _location;
  String? _replyToMessageId;
  _SelectedPreparation? _selectedPreparation;
  AppFailureKind? _lastFailureKind;
  String? _selectedSubmittedText;
  int _draftSyncRevision = 0;
  AiMessage? _retryUser;
  String? _localOutgoingText, _outgoingMessageId;
  Object? _localOutgoingKey;
  List<AiConversationSummary> _conversations = const [];
  String? _historyCursor;
  String? _historyError;
  bool _historyLoaded = false;

  TextEditingValue _draft = TextEditingValue.empty;
  Object? _draftSessionKey;
  Object? _draftEditor;
  TextEditingValue get draft => _draft;
  TextEditingValue draftFor(Object sessionKey) =>
      identical(_draftSessionKey, sessionKey) ? _draft : TextEditingValue.empty;
  void claimDraftEditor(Object editor, {required Object sessionKey}) {
    if (ref.mounted && state.sessionKey == sessionKey) _draftEditor = editor;
  }

  bool ownsDraftEditor(Object editor, {required Object sessionKey}) =>
      ref.mounted &&
      state.sessionKey == sessionKey &&
      identical(_draftEditor, editor);
  void releaseDraftEditor(Object editor) {
    if (identical(_draftEditor, editor)) _draftEditor = null;
  }

  void updateDraft(
    TextEditingValue value, {
    required Object sessionKey,
    Object? editor,
  }) {
    if (!ref.mounted || state.sessionKey != sessionKey) return;
    if (editor != null && !identical(_draftEditor, editor)) return;
    _draftSessionKey = sessionKey;
    if ({
      AiConversationPhase.limited,
      AiConversationPhase.unauthenticated,
      AiConversationPhase.authorityChanged,
    }.contains(state.phase)) {
      _draft = TextEditingValue.empty;
    } else {
      _draft = value;
    }
  }

  @override
  AiConversationState build() {
    _shutdown();
    _draft = TextEditingValue.empty;
    _draftSessionKey = null;
    _draftEditor = null;
    _localOutgoingText = null;
    _localOutgoingKey = null;
    _outgoingMessageId = null;
    _repository = ref.watch(aiConversationRepositoryProvider);
    _auth = ref.watch(authRepositoryProvider);
    _memory = ref.watch(_memoryProvider);
    _now = ref.watch(aiConversationNowProvider);
    _utcNow = ref.watch(aiConversationUtcNowProvider);
    _epoch = Object();
    _contextScopeKey = Object();
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
    _messageReadRevision = 0;
    _lastReadMessageIds = const [];
    _unverifiedReplyTargets.clear();
    _location = null;
    _replyToMessageId = null;
    _selectedPreparation = null;
    _lastFailureKind = null;
    _selectedSubmittedText = null;
    _draftSyncRevision = 0;
    ref.onDispose(_shutdown);
    final lifecycle = _AiLifecycleObserver(_suspend);
    WidgetsBinding.instance.addObserver(lifecycle);
    ref.onDispose(() => WidgetsBinding.instance.removeObserver(lifecycle));
    ref.listen(contentAccessProvider, (_, _) {
      discardSelectedPreparation();
      _unverifiedReplyTargets.addAll(
        state.messages.where((m) => m.isProactive).map((m) => m.messageId),
      );
      if (_location != null) {
        _invalidateReads();
        _location = AiMessageLocation(
          locator: _location!.locator,
          phase: AiMessageLocationPhase.failed,
        );
        _show(state.phase, clear: true);
      } else if (_replyToMessageId != null) {
        _show(state.phase);
      }
    });
    ref.listen(accountSettingsSnapshotProvider, (previous, next) {
      if (next?.consent != OptionalProcessingConsent.accepted) {
        discardSelectedPreparation();
      }
      if (next?.consent == OptionalProcessingConsent.rejected) {
        cancel();
        _failure(
          const AppFailure(
            kind: AppFailureKind.aiContextNotPermitted,
            message: 'AI data use is turned off.',
          ),
          preserveOutcome: true,
        );
      } else if (next?.consent == OptionalProcessingConsent.accepted &&
          state.phase == AiConversationPhase.limited) {
        _show(
          _memory.unresolved
              ? AiConversationPhase.unknown
              : AiConversationPhase.idle,
        );
      }
    });
    final phase = !_memory.authenticated
        ? AiConversationPhase.unauthenticated
        : ref.read(accountSettingsSnapshotProvider)?.consent ==
              OptionalProcessingConsent.rejected
        ? AiConversationPhase.limited
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
    final located =
        _location == null || _location!.phase == AiMessageLocationPhase.ready;
    final replyAvailable =
        _replyToMessageId == null ||
        (!_unverifiedReplyTargets.contains(_replyToMessageId) &&
            messages.any(
              (m) =>
                  m.messageId == _replyToMessageId &&
                  m.isProactive &&
                  m.availability == AiAvailability.available,
            ));
    return AiConversationState(
      sessionKey: _memory.key,
      phase: phase,
      messages: messages,
      localOutgoingText:
          _outgoingMessageId != null &&
              messages.any((m) => m.messageId == _outgoingMessageId)
          ? null
          : _localOutgoingText,
      localOutgoingKey: _localOutgoingKey,
      outgoingMessageId: _outgoingMessageId,
      conversationId: _memory.conversationId,
      contextScopeKey: _contextScopeKey,
      nextCursor: nextCursor,
      statusMessage: statusMessage,
      canSend:
          ready &&
          located &&
          replyAvailable &&
          !terminalView &&
          !_memory.unresolved &&
          _retryUser == null,
      canRetry:
          ready &&
          located &&
          !terminalView &&
          !_memory.unresolved &&
          _retryUser != null,
      canCheckResult:
          ready && located && hasTarget && _memory.operationId != null,
      canCancel: available && generating,
      // R-A can stop an ordinary read too; readBusy must not trap the user in
      // recovery. Only an already dispatched target has this unknown-result exit.
      canLeaveWithoutRetrying:
          available &&
          hasTarget &&
          located &&
          _memory.operationId != null &&
          _memory.unresolved &&
          !generating &&
          !_memory.deleting &&
          phase != AiConversationPhase.unauthenticated,
      canDelete:
          available &&
          hasTarget &&
          located &&
          _reads.isEmpty &&
          phase != AiConversationPhase.deleting &&
          phase != AiConversationPhase.unauthenticated,
      canStartNewConversation:
          available &&
          !generating &&
          _reads.isEmpty &&
          !_memory.deleting &&
          (_memory.conversationId != null || _location != null) &&
          (!_memory.unresolved || _memory.deleted),
      readBusy: _reads.isNotEmpty,
      messageReadRevision: _messageReadRevision,
      lastReadMessageIds: _lastReadMessageIds,
      messageLocation: _location,
      replyToMessageId: _replyToMessageId,
      selectedPreparationRevision:
          _selectedPreparation?.ticket?.selection.selectionRevision,
      selectedPreparationBusy:
          _selectedPreparation != null && _selectedPreparation!.ticket == null,
      failureKind: _lastFailureKind,
      draftSyncRevision: _draftSyncRevision,
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
    if (clear) {
      _localOutgoingText = null;
      _localOutgoingKey = null;
      _outgoingMessageId = null;
    }
    state = _snapshot(
      phase,
      messages: clear ? const [] : state.messages,
      nextCursor: clear ? null : state.nextCursor,
      statusMessage: message,
    );
  }

  Future<void> send(String text) async {
    if (!state.canSend) return;
    if (_selectedPreparation != null) return;
    await _start(text);
  }

  Future<void> retry(String text) async {
    final user = _retryUser;
    if (!state.canRetry || user == null) return;
    if (_selectedPreparation != null) return;
    if (text != user.text) {
      _show(state.phase, message: 'Enter the same saved message to retry.');
      return;
    }
    await _start(text, retryUser: user);
  }

  /// Local validation before a selected Send performs any source reads.
  bool validateSelectedInput(String text) {
    if (!state.canSend && !state.canRetry) return false;
    if (!_validInput(text)) {
      _show(state.phase, message: 'Enter 1–2400 characters of valid text.');
      return false;
    }
    if (state.canRetry && _retryUser?.text != text) {
      _show(state.phase, message: 'Enter the same saved message to retry.');
      return false;
    }
    return true;
  }

  bool hasSelectedPreparation(String revision) {
    final p = _selectedPreparation;
    return p != null &&
        p.ticket?.selection.selectionRevision == revision &&
        _selectedCurrent(p) &&
        _selectedRemaining(p) > Duration.zero;
  }

  bool _selectedCurrent(_SelectedPreparation p) =>
      _alive &&
      ref.mounted &&
      identical(_epoch, p.epoch) &&
      identical(_selectedPreparation, p) &&
      ref.read(aiCompanionReferencesEnabledProvider) &&
      !_memory.deleting &&
      !_memory.deleted &&
      _memory.conversationId == p.scopeConversationId &&
      ref.read(contentAccessProvider).foreground &&
      ref.read(accountSettingsSnapshotProvider)?.consent ==
          OptionalProcessingConsent.accepted;

  Future<Result<AiPreparedReplySelection>> prepareSelectedSources(
    List<String> sourceIds,
  ) => _prepareReferenceSources(sourceIds: sourceIds);

  Future<Result<AiPreparedReplySelection>> prepareTodaySources(
    String timeZone,
  ) => _prepareReferenceSources(todayZone: timeZone);

  Future<Result<AiPreparedReplySelection>> _prepareReferenceSources({
    List<String> sourceIds = const [],
    String? todayZone,
  }) async {
    final repository = _repository;
    if ((!state.canSend && !state.canRetry) ||
        sourceIds.length > 5 ||
        sourceIds.toSet().length != sourceIds.length ||
        sourceIds.any((id) => id.isEmpty) ||
        !ref.read(aiCompanionReferencesEnabledProvider) ||
        repository is! AiSelectedReplyRepository ||
        (todayZone != null &&
            (todayZone.isEmpty || repository is! AiTodayReplyRepository)) ||
        !ref.read(contentAccessProvider).foreground ||
        ref.read(accountSettingsSnapshotProvider)?.consent !=
            OptionalProcessingConsent.accepted) {
      return const Failure(_unknown);
    }
    final epoch = _epoch, command = _commandVersion;
    await _discardSelected();
    if (!_validReadResult(epoch, command) ||
        (!state.canSend && !state.canRetry)) {
      return const Failure(_unknown);
    }
    final p = _SelectedPreparation(
      epoch: epoch,
      repository: repository!,
      started: _now(),
      scopeConversationId: _memory.conversationId,
      conversationId: _memory.established ? _memory.conversationId : null,
      retryUser: _retryUser,
      sourceIds: sourceIds,
      todayZone: todayZone,
    );
    _selectedPreparation = p;
    _lastFailureKind = null;
    final selectedRepo = repository as AiSelectedReplyRepository;
    final result = await _ordinary((token, abort) {
      p.token = token;
      p.requestAbort = abort;
      if (todayZone != null) {
        return (repository as AiTodayReplyRepository).prepareToday(
          token: token,
          abort: abort,
          timeZone: todayZone,
          conversationId: p.conversationId,
          userMessageId: p.retryUser?.messageId,
        );
      }
      return selectedRepo.prepareSelected(
        token: token,
        abort: abort,
        conversationId: p.conversationId,
        userMessageId: p.retryUser?.messageId,
        sourceIds: p.sourceIds,
      );
    });
    if (!_selectedCurrent(p)) {
      p.release();
      _show(state.phase);
      return const Failure(_unknown);
    }
    if (result case Failure<AiSelectedReplyTicket>(:final failure)) {
      await _discardSelected();
      _lastFailureKind = failure.kind;
      referenceAuthFailed(failure);
      _show(state.phase);
      return Failure(failure);
    }
    p.ticket = (result as Success<AiSelectedReplyTicket>).value;
    if (todayZone != null) {
      final selection = p.ticket!.selection;
      final ids = selection.sourceCards.map((card) => card.checkInId).toList();
      if (selection.today?.timeZone != todayZone ||
          ids.any((id) => id == null || id.isEmpty) ||
          ids.length > 5 ||
          ids.toSet().length != ids.length) {
        await _discardSelected();
        return const Failure(_unknown);
      }
    }
    final remaining = _selectedRemaining(p);
    if (remaining <= Duration.zero) {
      await _discardSelected();
      return const Failure(_unknown);
    }
    p.expiry = Timer(remaining, discardSelectedPreparation);
    _show(state.phase);
    return Success(p.ticket!.selection);
  }

  Duration _selectedRemaining(_SelectedPreparation p) {
    var budget = const Duration(seconds: 15) - (_now() - p.started);
    final ticket = p.ticket;
    if (ticket != null) {
      for (final expiresAt in [
        ticket.operation.preparationExpiresAt,
        ticket.selection.expiresAt,
      ]) {
        final absolute = expiresAt.difference(_utcNow());
        if (absolute < budget) budget = absolute;
      }
    }
    return budget;
  }

  void discardSelectedPreparation() {
    unawaited(_discardSelected());
  }

  Future<void> _discardSelected({bool notify = true}) async {
    final p = _selectedPreparation;
    if (p == null) return;
    _selectedPreparation = null;
    p.expiry?.cancel();
    p.requestAbort?.abort();
    final token = p.token, ticket = p.ticket?.operation;
    final budget = _selectedRemaining(p);
    p.release();
    if (notify && ref.mounted && _alive) _show(state.phase);
    if (token == null || ticket == null || budget <= Duration.zero) return;
    final abort = AiAbortSignal();
    final timer = Timer(budget, abort.abort);
    try {
      await Future.any<Object?>([
        p.repository.cancel(token: token, abort: abort, ticket: ticket),
        abort.whenAborted,
      ]);
    } catch (_) {
      // Prepared-only cleanup cannot authorize or dispatch a reply.
    } finally {
      timer.cancel();
      abort.abort();
    }
  }

  Future<void> sendSelected(
    String text, {
    required String selectionRevision,
    required List<String> sourceIds,
    required List<String> excludedHistoryKeys,
    List<String> excludedSourceIds = const [],
  }) async {
    final p = _selectedPreparation;
    if (p == null ||
        (!state.canSend && !state.canRetry) ||
        !hasSelectedPreparation(selectionRevision) ||
        sourceIds.length != p.authorizedIds.length ||
        sourceIds.toSet().length != sourceIds.length ||
        !sourceIds.every(p.authorizedIds.contains) ||
        excludedSourceIds.toSet().length != excludedSourceIds.length ||
        !excludedSourceIds.every(p.authorizedIds.contains) ||
        (p.todayZone == null && excludedSourceIds.isNotEmpty)) {
      return;
    }
    final retry = state.canRetry ? p.retryUser : null;
    if (retry != null && text != retry.text) {
      _show(state.phase, message: 'Enter the same saved message to retry.');
      return;
    }
    if (!_validInput(text)) {
      _show(state.phase, message: 'Enter 1–2400 characters of valid text.');
      return;
    }
    final history = p.ticket!.selection.historyPairs
        .map((v) => v.historyKey)
        .toSet();
    if (excludedHistoryKeys.toSet().length != excludedHistoryKeys.length ||
        !excludedHistoryKeys.every(history.contains)) {
      return;
    }
    final excludedKeys = [
      for (final card in p.ticket!.selection.sourceCards)
        if (excludedSourceIds.contains(card.checkInId)) card.selectionKey,
    ];
    _selectedPreparation = null;
    p.expiry?.cancel();
    final ticket = p.ticket!, token = p.token!;
    p.release();
    await _start(
      text,
      retryUser: retry,
      selected: ticket,
      selectedToken: token,
      selectionStarted: p.started,
      excludedHistoryKeys: excludedHistoryKeys,
      excludedSourceKeys: excludedKeys,
    );
  }

  Future<void> _start(
    String text, {
    AiMessage? retryUser,
    AiSelectedReplyTicket? selected,
    String? selectedToken,
    Duration? selectionStarted,
    List<String> excludedHistoryKeys = const [],
    List<String> excludedSourceKeys = const [],
  }) {
    if (!_validInput(text)) {
      _show(state.phase, message: 'Enter 1–2400 characters of valid text.');
      return Future.value();
    }
    _invalidateReads();
    if (retryUser != null) _memory.unresolved = true;
    _retryUser = null;
    _lastFailureKind = null;
    _selectedSubmittedText = selected == null ? null : text;
    final attempt = _Attempt(
      epoch: _epoch,
      repository: _repository!,
      auth: _auth,
      started: selectionStarted ?? _now(),
      text: text,
      conversationId: _memory.established ? _memory.conversationId : null,
      userMessageId: retryUser?.messageId,
      userSequence: retryUser?.sequence,
      userPersistedAt: retryUser?.persistedAt,
      replyToMessageId: retryUser == null ? _replyToMessageId : null,
    );
    attempt.selectedTicket = selected;
    attempt.selectedHistoryKeys = List.unmodifiable(excludedHistoryKeys);
    attempt.selectedExcludedSourceKeys = List.unmodifiable(excludedSourceKeys);
    attempt.token = selectedToken;
    attempt.ticket = selected?.operation;
    _localOutgoingText = text;
    _localOutgoingKey = attempt;
    _outgoingMessageId = retryUser?.messageId;
    _attempt = attempt;
    attempt.prepareTimer = Timer(
      const Duration(seconds: 15) - (_now() - attempt.started),
      () {
        _close(attempt, AiConversationPhase.timedOut);
      },
    );
    attempt.totalTimer = Timer(
      const Duration(seconds: 90) - (_now() - attempt.started),
      () {
        _close(attempt, AiConversationPhase.timedOut);
      },
    );
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
      if (attempt.selectedTicket == null) {
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
      }
      if (!_current(attempt)) return;
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
      _replyToMessageId = null;
      attempt.executeStarted = _now();
      attempt.executeTimer = Timer(const Duration(seconds: 75), () {
        _close(attempt, AiConversationPhase.timedOut);
      });
      _show(AiConversationPhase.waiting);
      // No yield between the final original-attempt check and this dispatch.
      if (!_current(attempt)) return;
      final input = attempt.text!;
      attempt.text = null;
      final companion = attempt.repository;
      final selected = attempt.selectedTicket;
      final reply = selected != null && companion is AiSelectedReplyRepository
          ? await (companion as AiSelectedReplyRepository).executeSelected(
              token: attempt.token!,
              abort: attempt.abort,
              ticket: selected,
              text: input,
              includedKeys: selected.selection.sourceCards
                  .map((v) => v.selectionKey)
                  .where(
                    (key) =>
                        !(attempt.selectedExcludedSourceKeys?.contains(key) ??
                            false),
                  )
                  .toList(),
              excludedKeys: attempt.selectedExcludedSourceKeys ?? const [],
              excludedHistoryKeys: attempt.selectedHistoryKeys ?? const [],
              replyToMessageId: attempt.replyToMessageId,
            )
          : attempt.replyToMessageId != null &&
                companion is AiCompanionReplyRepository
          ? await (companion as AiCompanionReplyRepository).executeReply(
              token: attempt.token!,
              abort: attempt.abort,
              ticket: attempt.ticket!,
              text: input,
              replyToMessageId: attempt.replyToMessageId!,
            )
          : await attempt.repository.execute(
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
          _completeSelectedDraft();
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
    final wasSelected = attempt.selectedTicket != null;
    attempt.dispatchAllowed = false;
    attempt.abort.abort();
    _cleanup(attempt);
    _finish(attempt);
    // Even a rejected reply can follow a saved user message. Only an explicit
    // authoritative readback releases a dispatched logical input for retry.
    if (wasDispatched) _memory.unresolved = true;
    if (wasSelected &&
        {
          AppFailureKind.aiAuthorityChanged,
          AppFailureKind.aiSourceUnavailable,
          AppFailureKind.aiContextSelectionConflict,
        }.contains(failure.kind)) {
      _lastFailureKind = failure.kind;
      _show(AiConversationPhase.unavailable);
      return;
    }
    _failure(failure);
  }

  void _failure(AppFailure failure, {bool preserveOutcome = false}) {
    _lastFailureKind = failure.kind;
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
      discardSelectedPreparation();
      _replyToMessageId = null;
      _selectedSubmittedText = null;
      _draft = TextEditingValue.empty;
      _invalidateReads();
      _retryUser = null;
      if (!preserveOutcome) _memory.unresolved = true;
      _conversations = const [];
      _historyCursor = null;
      _historyLoaded = false;
      _historyError = null;
      _show(phase, clear: true);
    } else {
      _show(phase);
    }
  }

  void _completeSelectedDraft() {
    final submitted = _selectedSubmittedText;
    _selectedSubmittedText = null;
    if (submitted != null && _draft.text == submitted) {
      _draft = TextEditingValue.empty;
      _draftSyncRevision++;
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
    _lastFailureKind = null;
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
              _outgoingMessageId = user.messageId;
              _localOutgoingText = null;
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
              _completeSelectedDraft();
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
    _resetConversationIdentity(conversationId);
    _show(AiConversationPhase.idle, clear: true);
    await loadMessages();
  }

  void _resetConversationIdentity(String conversationId) {
    _contextScopeKey = Object();
    _selectedSubmittedText = null;
    discardSelectedPreparation();
    _invalidateReads();
    _location = null;
    _replyToMessageId = null;
    _lastReadMessageIds = const [];
    _unverifiedReplyTargets.clear();
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
  }

  void replyToFollowUp(String messageId) {
    if (!state.canSend ||
        !ref.read(aiCompanionReferencesEnabledProvider) ||
        _repository is! AiCompanionReplyRepository ||
        _unverifiedReplyTargets.contains(messageId) ||
        !state.messages.any(
          (m) =>
              m.messageId == messageId &&
              m.isProactive &&
              m.availability == AiAvailability.available,
        )) {
      return;
    }
    discardSelectedPreparation();
    _replyToMessageId = messageId;
    _show(state.phase);
  }

  void clearReplyTarget() {
    discardSelectedPreparation();
    _replyToMessageId = null;
    _show(state.phase);
  }

  void referenceAuthFailed(AppFailure failure) {
    if ({
      AppFailureKind.authRequired,
      AppFailureKind.authForbidden,
      AppFailureKind.aiContextNotPermitted,
    }.contains(failure.kind)) {
      _failure(failure, preserveOutcome: true);
    }
  }

  void invalidateSourceReads({
    required Object sessionKey,
    required String conversationId,
    required String messageId,
  }) {
    if (!ref.mounted ||
        state.sessionKey != sessionKey ||
        state.conversationId != conversationId) {
      return;
    }
    discardSelectedPreparation();
    _unverifiedReplyTargets.add(messageId);
    _invalidateReads();
    _show(state.phase);
  }

  void _suspend() {
    discardSelectedPreparation();
    cancel();
    if (_location?.phase == AiMessageLocationPhase.checking) {
      _invalidateReads();
      _location = AiMessageLocation(
        locator: _location!.locator,
        phase: AiMessageLocationPhase.failed,
      );
      _show(state.phase, clear: true);
    }
  }

  Future<void> openMessage(AiMessageLocator locator) async {
    final repository = _repository;
    if (!state.canSelectConversation ||
        !ref.read(aiCompanionReferencesEnabledProvider) ||
        repository is! AiOwnedSourcesRepository ||
        !ref.read(contentAccessProvider).foreground) {
      return;
    }
    discardSelectedPreparation();
    _invalidateReads();
    _location = AiMessageLocation(
      locator: locator,
      phase: AiMessageLocationPhase.checking,
    );
    _show(state.phase, clear: true);
    final epoch = _epoch;
    final command = _commandVersion;
    final sources = repository as AiOwnedSourcesRepository;
    final anchorResult = await _ordinary(
      (token, abort) => sources.readMessageAnchor(
        token: token,
        abort: abort,
        locator: locator,
      ),
    );
    if (!_validReadResult(epoch, command)) return;
    if (anchorResult case Failure<AiMessageAnchor>(:final failure)) {
      _locationFailed(locator, failure);
      return;
    }
    final anchor = (anchorResult as Success<AiMessageAnchor>).value;
    if (anchor.locator.conversationId != locator.conversationId ||
        anchor.locator.messageId != locator.messageId) {
      _locationFailed(locator, _unknown);
      return;
    }
    final pageResult = await _ordinary(
      (token, abort) => repository!.readMessages(
        token: token,
        abort: abort,
        conversationId: locator.conversationId,
        before: anchor.pageBefore,
      ),
    );
    if (!_validReadResult(epoch, command)) return;
    if (pageResult case Failure<AiMessagePage>(:final failure)) {
      _locationFailed(locator, failure);
      return;
    }
    final page = (pageResult as Success<AiMessagePage>).value;
    final targets = page.messages.where(
      (m) =>
          m.messageId == locator.messageId &&
          m.sequence == anchor.sequence &&
          m.availability == AiAvailability.available,
    );
    if (targets.length != 1) {
      _locationFailed(locator, _unknown);
      return;
    }
    final sameTopic = locator.conversationId == _memory.conversationId;
    final phase = sameTopic ? state.phase : AiConversationPhase.idle;
    if (!sameTopic) {
      _resetConversationIdentity(locator.conversationId);
    }
    _location = AiMessageLocation(
      locator: locator,
      phase: AiMessageLocationPhase.ready,
      sequence: anchor.sequence,
    );
    _show(phase, clear: true);
    if (!_merge(page.messages, ++_requestNumber, fromHistory: true)) {
      _locationFailed(locator, _unknown);
      return;
    }
    _messageReadRevision++;
    _lastReadMessageIds = List.unmodifiable(
      page.messages.map((m) => m.messageId),
    );
    _unverifiedReplyTargets.removeAll(_lastReadMessageIds);
    state = _snapshot(
      state.phase,
      messages: state.messages,
      nextCursor: page.nextCursor,
    );
  }

  void _locationFailed(AiMessageLocator locator, AppFailure failure) {
    _location = AiMessageLocation(
      locator: locator,
      phase: AiMessageLocationPhase.failed,
    );
    if ({
      AppFailureKind.authRequired,
      AppFailureKind.authForbidden,
      AppFailureKind.aiContextNotPermitted,
    }.contains(failure.kind)) {
      _failure(failure, preserveOutcome: true);
    } else {
      _show(state.phase, clear: true);
    }
  }

  void dismissMessageLocation() {
    if (_location == null) return;
    _invalidateReads();
    _location = null;
    _show(state.phase);
    unawaited(loadMessages());
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
    if (_location != null && _location!.phase != AiMessageLocationPhase.ready) {
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
          _messageReadRevision++;
          _lastReadMessageIds = List.unmodifiable(
            value.messages.map((m) => m.messageId),
          );
          _unverifiedReplyTargets.removeAll(_lastReadMessageIds);
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
      !assistant.isProactive &&
      assistant.sequence > user.sequence &&
      (_assistantUsers[assistant.messageId] == null ||
          _assistantUsers[assistant.messageId] == user.messageId);

  bool _newAssistantSince(AiMessage user, int revision) => state.messages.any(
    (message) =>
        _relevantAssistant(message, user) &&
        (_assistantObservations[message.messageId] ?? 0) > revision,
  );

  void _recordPair(AiMessage user, AiMessage assistant) {
    _outgoingMessageId = user.messageId;
    _localOutgoingText = null;
    _assistantUsers[assistant.messageId] = user.messageId;
    _memory.recordOperationUser(user);
    _memory.operationHasAssistant = true;
    _memory.operationAssistantId = assistant.messageId;
  }

  bool _consistentPair(AiMessage user, AiMessage assistant) =>
      !assistant.isProactive &&
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
              origin: incomingMessage.origin,
              occurrenceId: incomingMessage.occurrenceId,
            )
          : incomingMessage;
      if (message.messageId == _memory.operationUserId &&
          !_memory.matchesOperationUser(message)) {
        return _invalidMerge();
      }
      final previous = messages[message.messageId];
      if (previous != null &&
          (previous.role != message.role ||
              previous.origin != message.origin ||
              previous.occurrenceId != message.occurrenceId ||
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
          !message.isProactive &&
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
    _contextScopeKey = Object();
    discardSelectedPreparation();
    _selectedSubmittedText = null;
    final previousWasDeleted = _memory.deleted;
    _invalidateReads();
    _location = null;
    _replyToMessageId = null;
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
    discardSelectedPreparation();
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
    discardSelectedPreparation();
    cancel();
    _invalidateReads();
    _location = null;
    _replyToMessageId = null;
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

  // Explicit ownership teardown only; ordinary route disposal must not call this.
  void detach({Object? sessionKey}) {
    if (sessionKey != null && !identical(sessionKey, _memory.key)) return;
    _shutdown();
    _localOutgoingText = null;
    _localOutgoingKey = null;
    _outgoingMessageId = null;
  }

  void _shutdown() {
    if (!_alive) return;
    unawaited(_discardSelected(notify: false));
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

final class _SelectedPreparation {
  _SelectedPreparation({
    required this.epoch,
    required this.repository,
    required this.started,
    required this.scopeConversationId,
    required this.conversationId,
    required this.retryUser,
    required Iterable<String> sourceIds,
    this.todayZone,
  }) : sourceIds = List.unmodifiable(sourceIds);
  final Object epoch;
  final AiConversationRepository repository;
  final Duration started;
  final String? scopeConversationId, conversationId;
  final AiMessage? retryUser;
  final List<String> sourceIds;
  final String? todayZone;
  List<String> get authorizedIds => todayZone == null
      ? sourceIds
      : [
          for (final card
              in ticket?.selection.sourceCards ?? <AiSelectedSourceCard>[])
            card.checkInId!,
        ];
  String? token;
  AiSelectedReplyTicket? ticket;
  AiAbortSignal? requestAbort;
  Timer? expiry;
  void release() {
    token = null;
    ticket = null;
    requestAbort = null;
    expiry?.cancel();
  }
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
    this.replyToMessageId,
  });
  final Object epoch;
  final AiConversationRepository repository;
  final AuthRepository auth;
  final Duration started;
  final String? conversationId;
  final String? userMessageId;
  final int? userSequence;
  final DateTime? userPersistedAt;
  final String? replyToMessageId;
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
  AiSelectedReplyTicket? selectedTicket;
  List<String>? selectedHistoryKeys;
  List<String>? selectedExcludedSourceKeys;
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
    selectedTicket = null;
    selectedHistoryKeys = null;
    selectedExcludedSourceKeys = null;
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

final class _AiLifecycleObserver extends WidgetsBindingObserver {
  _AiLifecycleObserver(this.cancel);
  final VoidCallback cancel;
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.detached) {
      cancel();
    }
  }
}
