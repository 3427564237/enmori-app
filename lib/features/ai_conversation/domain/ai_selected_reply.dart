import '../../../core/result/result.dart';
import 'ai_conversation.dart';
import 'ai_owned_sources.dart';

/// Opaque keys are valid only for the preparation that issued them. A card is
/// not a client-side mapping back to a Check-in ID or permission for another send.
final class AiSelectedSourceCard {
  const AiSelectedSourceCard({required this.selectionKey, required this.card});
  final String selectionKey;
  final AiSourceCard card;
}

final class AiPreparedHistoryPair {
  const AiPreparedHistoryPair({
    required this.historyKey,
    required this.userMessageId,
    required this.assistantMessageId,
    required this.userSequence,
    required this.assistantSequence,
  });
  final String historyKey, userMessageId, assistantMessageId;
  final int userSequence, assistantSequence;
}

final class AiPreparedReplySelection {
  AiPreparedReplySelection({
    required this.selectionRevision,
    required this.expiresAt,
    required Iterable<AiSelectedSourceCard> sourceCards,
    required Iterable<AiPreparedHistoryPair> historyPairs,
  }) : sourceCards = List.unmodifiable(sourceCards),
       historyPairs = List.unmodifiable(historyPairs);
  final String selectionRevision;
  final DateTime expiresAt;
  final List<AiSelectedSourceCard> sourceCards;
  final List<AiPreparedHistoryPair> historyPairs;
}

final class AiSelectedReplyTicket {
  const AiSelectedReplyTicket({
    required this.operation,
    required this.selection,
  });
  final AiTicket operation;
  final AiPreparedReplySelection selection;
}

/// Optional local-only selected reply capability. The controller retains the
/// original preparation token/operation fence and requires an explicit review.
abstract interface class AiSelectedReplyRepository {
  Future<Result<AiSelectedReplyTicket>> prepareSelected({
    required String token,
    required AiAbortSignal abort,
    String? conversationId,
    String? userMessageId,
    required List<String> sourceIds,
  });

  Future<Result<AiReply>> executeSelected({
    required String token,
    required AiAbortSignal abort,
    required AiSelectedReplyTicket ticket,
    required String text,
    required List<String> includedKeys,
    required List<String> excludedKeys,
    required List<String> excludedHistoryKeys,
    String? replyToMessageId,
  });
}
