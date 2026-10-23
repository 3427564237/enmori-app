import '../../../core/result/result.dart';
import 'ai_conversation.dart';

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
