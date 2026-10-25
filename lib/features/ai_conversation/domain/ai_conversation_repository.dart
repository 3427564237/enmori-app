import '../../../core/result/result.dart';
import 'ai_conversation.dart';
import 'ai_owned_sources.dart';

/// Optional first-flow capability. Legacy adapters and ordinary/demo routes
/// need not expose it; composition separately enables its UI/controller use.
abstract interface class AiOwnedSourcesRepository {
  Future<Result<AiMessageAnchor>> resolveDelivery({
    required String token,
    required AiAbortSignal abort,
    required String deliveryRef,
  });
  Future<Result<AiMessageAnchor>> readMessageAnchor({
    required String token,
    required AiAbortSignal abort,
    required AiMessageLocator locator,
  });
  Future<Result<AiSourceTarget>> resolveSource({
    required String token,
    required AiAbortSignal abort,
    required AiMessageLocator message,
    required AiSourceCard card,
  });
  Future<Result<AiTopicReadState>> readTopicReadState({
    required String token,
    required AiAbortSignal abort,
    required String conversationId,
  });
  Future<Result<AiTopicReadState>> markTopicRead({
    required String token,
    required AiAbortSignal abort,
    required String conversationId,
    required int expectedRevision,
    required int readThroughSequence,
  });
}

abstract interface class AiCompanionReplyRepository {
  Future<Result<AiReply>> executeReply({
    required String token,
    required AiAbortSignal abort,
    required AiTicket ticket,
    required String text,
    required String replyToMessageId,
  });
}

/// Optional owner-only discovery capability; ordinary disabled adapters expose none.
abstract interface class AiConversationHistoryRepository {
  Future<Result<AiConversationHistoryPage>> listConversations({
    required String token,
    required AiAbortSignal abort,
    String? after,
  });
}

/// The caller owns token/session identity and operation-specific time budgets.
abstract interface class AiConversationRepository {
  Future<Result<AiTicket>> prepare({
    required String token,
    required AiAbortSignal abort,
    String? conversationId,
    String? userMessageId,
  });

  Future<Result<AiReply>> execute({
    required String token,
    required AiAbortSignal abort,
    required AiTicket ticket,
    required String text,
  });

  Future<Result<void>> cancel({
    required String token,
    required AiAbortSignal abort,
    required AiTicket ticket,
  });

  Future<Result<AiReadback>> readOperation({
    required String token,
    required AiAbortSignal abort,
    required String conversationId,
    required String operationId,
  });

  Future<Result<AiMessagePage>> readMessages({
    required String token,
    required AiAbortSignal abort,
    required String conversationId,
    String? before,
  });

  Future<Result<void>> deleteConversation({
    required String token,
    required AiAbortSignal abort,
    required String conversationId,
  });
}
