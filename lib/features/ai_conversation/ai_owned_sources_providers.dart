import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/result/result.dart';
import '../account/account_preferences_providers.dart';
import '../account/content_access.dart';
import '../account/domain/account_repository.dart';
import '../auth/auth_providers.dart';
import '../auth/domain/auth_repository.dart';
import 'ai_conversation_providers.dart';
import 'domain/ai_conversation_repository.dart';

final class AiOwnedSourcesState {
  AiOwnedSourcesState({
    required this.sessionKey,
    required this.conversationId,
    this.readState,
    this.readBusy = false,
    this.readUnconfirmed = false,
    this.resolvingCardRef,
    this.sourcesNeedRead = true,
    Iterable<String> hiddenMessageIds = const [],
    this.failure,
  }) : hiddenMessageIds = Set.unmodifiable(hiddenMessageIds);
  final Object sessionKey;
  final String? conversationId;
  final AiTopicReadState? readState;
  final bool readBusy, readUnconfirmed, sourcesNeedRead;
  final String? resolvingCardRef;
  final Set<String> hiddenMessageIds;
  final AppFailure? failure;

  bool hides(AiMessage message) =>
      hiddenMessageIds.contains(message.messageId) ||
      (sourcesNeedRead && (message.isProactive || message.sources.isNotEmpty));
  bool isUnread(AiMessage message) =>
      !hides(message) &&
      !readBusy &&
      !readUnconfirmed &&
      readState != null &&
      message.isProactive &&
      message.availability == AiAvailability.available &&
      message.sequence > readState!.readThroughSequence;
}

final aiOwnedSourcesControllerProvider =
    NotifierProvider<AiOwnedSourcesController, AiOwnedSourcesState>(
      AiOwnedSourcesController.new,
    );

/// Every transcript-derived surface uses this same current display boundary.
/// Hiding a source view is temporary and never rewrites its canonical message.
bool canDisplayAiMessage(
  AiConversationState conversation,
  AiMessage message, {
  AiOwnedSourcesState? sources,
}) {
  if (message.availability != AiAvailability.available ||
      message.text == null) {
    return false;
  }
  if (sources == null) return true;
  if (sources.sessionKey != conversation.sessionKey ||
      sources.conversationId != conversation.conversationId) {
    return !message.isProactive && message.sources.isEmpty;
  }
  return !sources.hides(message);
}

/// Source navigation and read metadata have a separate request lifetime. They
/// cannot dispatch/retry chat, acknowledge delivery or extend topic retention.
class AiOwnedSourcesController extends Notifier<AiOwnedSourcesState> {
  Object _epoch = Object();
  late Object _sessionKey;
  String? _topic;
  AuthSession? _actor;
  AiOwnedSourcesRepository? _repository;
  late AuthRepository _auth;
  bool _enabled = false,
      _readBusy = false,
      _readUnconfirmed = false,
      _sourcesNeedRead = true;
  AiTopicReadState? _readState;
  String? _resolving;
  AppFailure? _failure;
  final _hidden = <String>{};
  final _requests = <AiAbortSignal>{};

  @override
  AiOwnedSourcesState build() {
    _abort();
    _epoch = Object();
    _enabled = ref.watch(aiCompanionReferencesEnabledProvider);
    _actor = ref.watch(authSessionProvider).asData?.value;
    _auth = ref.watch(authRepositoryProvider);
    final repo = ref.watch(aiConversationRepositoryProvider);
    _repository = repo is AiOwnedSourcesRepository
        ? repo as AiOwnedSourcesRepository
        : null;
    final conversation = ref.read(aiConversationControllerProvider);
    _sessionKey = conversation.sessionKey;
    _topic = conversation.conversationId;
    _clear();
    ref.onDispose(_abort);
    ref.listen(aiConversationControllerProvider, (before, after) {
      if (after.sessionKey != _sessionKey || after.conversationId != _topic) {
        _abort();
        _epoch = Object();
        _sessionKey = after.sessionKey;
        _topic = after.conversationId;
        _clear();
        _show();
      }
      // Riverpod may coalesce topic selection and its completed page read into
      // one observation. Reset the topic first, then accept that fresh read.
      if (before?.messageReadRevision != after.messageReadRevision &&
          _current(_epoch)) {
        _sourcesNeedRead = false;
        _hidden.removeAll(after.lastReadMessageIds);
        _show();
      }
      if ({
        AiConversationPhase.unauthenticated,
        AiConversationPhase.limited,
        AiConversationPhase.authorityChanged,
        AiConversationPhase.deleted,
      }.contains(after.phase)) {
        _invalidate();
      }
    });
    ref.listen(contentAccessProvider, (_, _) => _invalidate());
    ref.listen(accountSettingsSnapshotProvider, (_, next) {
      if (next?.consent != OptionalProcessingConsent.accepted) _invalidate();
    });
    return _snapshot();
  }

  void _clear() {
    _readState = null;
    _readBusy = false;
    _readUnconfirmed = false;
    _sourcesNeedRead = true;
    _resolving = null;
    _failure = null;
    _hidden.clear();
    _hidden.addAll(
      ref
          .read(aiConversationControllerProvider)
          .messages
          .where((m) => m.isProactive || m.sources.isNotEmpty)
          .map((m) => m.messageId),
    );
  }

  void _abort() {
    for (final signal in _requests.toList()) {
      signal.abort();
    }
    _requests.clear();
  }

  void _invalidate() {
    _abort();
    _epoch = Object();
    _readState = null;
    _readBusy = false;
    _resolving = null;
    _sourcesNeedRead = true;
    _hidden.addAll(
      ref
          .read(aiConversationControllerProvider)
          .messages
          .where((m) => m.isProactive || m.sources.isNotEmpty)
          .map((m) => m.messageId),
    );
    _show();
  }

  AiOwnedSourcesState _snapshot() => AiOwnedSourcesState(
    sessionKey: _sessionKey,
    conversationId: _topic,
    readState: _readState,
    readBusy: _readBusy,
    readUnconfirmed: _readUnconfirmed,
    resolvingCardRef: _resolving,
    sourcesNeedRead: _sourcesNeedRead,
    hiddenMessageIds: _hidden,
    failure: _failure,
  );
  void _show() {
    if (ref.mounted) state = _snapshot();
  }

  bool _current(Object epoch) {
    if (!ref.mounted ||
        !_enabled ||
        _repository == null ||
        !identical(epoch, _epoch) ||
        _actor is! AuthSessionAuthenticated ||
        !identical(_actor, ref.read(authSessionProvider).asData?.value) ||
        !ref.read(contentAccessProvider).foreground ||
        ref.read(accountSettingsSnapshotProvider)?.consent !=
            OptionalProcessingConsent.accepted) {
      return false;
    }
    final current = ref.read(aiConversationControllerProvider);
    return current.sessionKey == _sessionKey &&
        current.conversationId == _topic &&
        _topic != null &&
        !{
          AiConversationPhase.unauthenticated,
          AiConversationPhase.limited,
          AiConversationPhase.authorityChanged,
          AiConversationPhase.deleted,
          AiConversationPhase.deleting,
          AiConversationPhase.deleteUnknown,
        }.contains(current.phase);
  }

  Future<Result<T>> _call<T>(
    Future<Result<T>> Function(String, AiAbortSignal) run,
  ) async {
    final epoch = _epoch;
    if (!_current(epoch)) return const Failure(_notVerified);
    final signal = AiAbortSignal();
    _requests.add(signal);
    final timer = Timer(const Duration(seconds: 15), signal.abort);
    try {
      final token = await Future.any<Result<String>?>([
        _auth.getIdToken(),
        signal.whenAborted.then((_) => null),
      ]);
      if (!_current(epoch) || signal.isAborted || token == null) {
        return const Failure(_notVerified);
      }
      if (token case Failure<String>(:final failure)) return Failure(failure);
      return await Future.any<Result<T>>([
        run((token as Success<String>).value, signal),
        signal.whenAborted.then((_) => const Failure(_notVerified)),
      ]);
    } catch (_) {
      return const Failure(_notVerified);
    } finally {
      timer.cancel();
      signal.abort();
      _requests.remove(signal);
    }
  }

  Future<void> checkReadState() async {
    if (_readBusy ||
        !_current(_epoch) ||
        !ref.read(aiConversationControllerProvider).conversationEstablished) {
      return;
    }
    final epoch = _epoch;
    final topic = _topic!;
    _readBusy = true;
    _failure = null;
    _show();
    final result = await _call(
      (token, abort) => _repository!.readTopicReadState(
        token: token,
        abort: abort,
        conversationId: topic,
      ),
    );
    if (!_current(epoch)) return;
    _readBusy = false;
    if (result case Success<AiTopicReadState>(:final value)) {
      _readState = value;
      _readUnconfirmed = false;
      _failure = null;
    } else {
      _recordFailure((result as Failure<AiTopicReadState>).failure);
    }
    _show();
  }

  Future<void> markActuallyVisible(String messageId) async {
    if (!_current(_epoch) ||
        _readBusy ||
        _readUnconfirmed ||
        _readState == null ||
        _sourcesNeedRead) {
      return;
    }
    final matches = ref
        .read(aiConversationControllerProvider)
        .messages
        .where((m) => m.messageId == messageId);
    if (matches.length != 1) return;
    final message = matches.single;
    if (!message.isProactive ||
        message.availability != AiAvailability.available ||
        _hidden.contains(messageId) ||
        message.sequence <= _readState!.readThroughSequence) {
      return;
    }
    final epoch = _epoch;
    final topic = _topic!;
    final expected = _readState!.revision;
    _readBusy = true;
    _readUnconfirmed = true;
    _failure = null;
    _show();
    final result = await _call(
      (token, abort) => _repository!.markTopicRead(
        token: token,
        abort: abort,
        conversationId: topic,
        expectedRevision: expected,
        readThroughSequence: message.sequence,
      ),
    );
    if (!_current(epoch)) return;
    _readBusy = false;
    if (result case Success<AiTopicReadState>(:final value)) {
      _readState = value;
      _readUnconfirmed = false;
      _failure = null;
    } else {
      _recordFailure((result as Failure<AiTopicReadState>).failure);
    }
    _show(); // Unknown/412 stays fenced until a successful GET, never auto-PUT.
  }

  bool _ownsCard(String messageId, AiSourceCard card) {
    if (_sourcesNeedRead || _hidden.contains(messageId)) return false;
    final matches = ref
        .read(aiConversationControllerProvider)
        .messages
        .where((m) => m.messageId == messageId);
    return matches.length == 1 &&
        matches.single.availability == AiAvailability.available &&
        matches.single.sources.any(
          (c) =>
              c.cardRef == card.cardRef &&
              c.version == card.version &&
              c.kind == card.kind,
        );
  }

  Future<AiSourceTarget?> resolve(String messageId, AiSourceCard card) async {
    if (!_current(_epoch) ||
        _resolving != null ||
        !_ownsCard(messageId, card)) {
      return null;
    }
    final epoch = _epoch;
    final message = AiMessageLocator(
      conversationId: _topic!,
      messageId: messageId,
    );
    _resolving = card.cardRef;
    _failure = null;
    _show();
    final result = await _call(
      (token, abort) => _repository!.resolveSource(
        token: token,
        abort: abort,
        message: message,
        card: card,
      ),
    );
    if (!_current(epoch)) return null;
    _resolving = null;
    if (!_ownsCard(messageId, card)) {
      _failure = _notVerified;
      _show();
      return null;
    }
    if (result case Success<AiSourceTarget>(:final value)) {
      _show();
      return value;
    }
    _recordFailure((result as Failure<AiSourceTarget>).failure);
    // A transcript requested before this later denial must not restore the
    // hidden source body when its older response finally arrives.
    ref
        .read(aiConversationControllerProvider.notifier)
        .invalidateSourceReads(
          sessionKey: _sessionKey,
          conversationId: message.conversationId,
          messageId: messageId,
        );
    _hidden.add(messageId);
    _show();
    return null;
  }

  void _recordFailure(AppFailure failure) {
    _failure = failure;
    ref
        .read(aiConversationControllerProvider.notifier)
        .referenceAuthFailed(failure);
  }
}

const _notVerified = AppFailure(
  kind: AppFailureKind.aiUnavailable,
  message:
      'This reference could not be verified. Keep your draft and check again.',
);
