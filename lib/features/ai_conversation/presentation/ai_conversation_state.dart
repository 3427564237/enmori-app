import '../domain/ai_conversation.dart';
import '../domain/ai_owned_sources.dart';
import '../../../core/result/result.dart';

enum AiConversationPhase {
  idle,
  preparing,
  waiting,
  success,
  limited,
  busy,
  unavailable,
  rejected,
  timedOut,
  unknown,
  authorityChanged,
  deleted,
  deleting,
  deleteUnknown,
  unauthenticated,
}

final class AiConversationState {
  AiConversationState({
    required this.sessionKey,
    this.phase = AiConversationPhase.idle,
    Iterable<AiMessage> messages = const [],
    this.conversationId,
    this.contextScopeKey,
    this.localOutgoingText,
    this.localOutgoingKey,
    this.outgoingMessageId,
    this.nextCursor,
    this.statusMessage,
    this.canSend = false,
    this.canRetry = false,
    this.canCheckResult = false,
    this.canCancel = false,
    this.canLeaveWithoutRetrying = false,
    this.canDelete = false,
    this.canStartNewConversation = false,
    this.readBusy = false,
    this.messageReadRevision = 0,
    Iterable<String> lastReadMessageIds = const [],
    this.messageLocation,
    this.replyToMessageId,
    this.selectedPreparationRevision,
    this.selectedPreparationBusy = false,
    this.failureKind,
    this.draftSyncRevision = 0,
    Iterable<AiConversationSummary> conversations = const [],
    this.historyLoaded = false,
    this.historyCursor,
    this.historyError,
    this.canBrowseHistory = false,
    this.canSelectConversation = false,
  }) : messages = List.unmodifiable(messages),
       conversations = List.unmodifiable(conversations),
       lastReadMessageIds = List.unmodifiable(lastReadMessageIds);

  final Object sessionKey;
  final AiConversationPhase phase;
  final List<AiMessage> messages;

  /// Presentation-only input, never a persisted message or resend queue.
  final String? localOutgoingText;
  final Object? localOutgoingKey;
  final String? outgoingMessageId;
  final String? conversationId;

  /// Changes on an explicit topic switch, not on a reserved operation's ID.
  final Object? contextScopeKey;
  final String? nextCursor;
  final String? statusMessage;
  final bool canSend;
  final bool canRetry;
  final bool canCheckResult;
  final bool canCancel;

  /// Stop this unresolved flow's local recovery without releasing its guard.
  final bool canLeaveWithoutRetrying;
  final bool canDelete;
  final bool canStartNewConversation;
  final bool readBusy;

  /// Advances only after an authoritative transcript page was accepted.
  final int messageReadRevision;

  /// Only the exact accepted page was rechecked, never all cached history.
  final List<String> lastReadMessageIds;
  final AiMessageLocation? messageLocation;
  final String? replyToMessageId;
  final String? selectedPreparationRevision;
  final bool selectedPreparationBusy;
  final AppFailureKind? failureKind;
  final int draftSyncRevision;
  final List<AiConversationSummary> conversations;
  final bool historyLoaded;
  final String? historyCursor;
  final String? historyError;
  final bool canBrowseHistory;
  final bool canSelectConversation;
  bool get isBusy =>
      canCancel || readBusy || phase == AiConversationPhase.deleting;
}
