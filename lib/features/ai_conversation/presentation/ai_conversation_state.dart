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
  }) : messages = List.unmodifiable(messages);

  final Object sessionKey;
  final AiConversationPhase phase;
  final List<AiMessage> messages;
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
  bool get isBusy =>
      canCancel || readBusy || phase == AiConversationPhase.deleting;
}
