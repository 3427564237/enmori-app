import '../domain/ai_conversation.dart';

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
    Iterable<AiConversationSummary> conversations = const [],
    this.historyLoaded = false,
    this.historyCursor,
    this.historyError,
    this.canBrowseHistory = false,
    this.canSelectConversation = false,
  }) : messages = List.unmodifiable(messages),
       conversations = List.unmodifiable(conversations);

  final Object sessionKey;
  final AiConversationPhase phase;
  final List<AiMessage> messages;

  /// Presentation-only input, never a persisted message or resend queue.
  final String? localOutgoingText;
  final Object? localOutgoingKey;
  final String? outgoingMessageId;
  final String? conversationId;
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
  final List<AiConversationSummary> conversations;
  final bool historyLoaded;
  final String? historyCursor;
  final String? historyError;
  final bool canBrowseHistory;
  final bool canSelectConversation;
  bool get isBusy =>
      canCancel || readBusy || phase == AiConversationPhase.deleting;
}
