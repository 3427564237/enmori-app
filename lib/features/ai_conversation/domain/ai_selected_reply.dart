import '../../../core/result/result.dart';
import 'ai_conversation.dart';
import 'ai_owned_sources.dart';

/// Opaque keys are valid only for the preparation that issued them. A card is
/// not a client-side mapping back to a Check-in ID or permission for another send.
/// Only automatic-day receipts explicitly supply the owned ID for exclusions.
final class AiSelectedSourceCard {
  const AiSelectedSourceCard({required this.selectionKey, required this.card,this.checkInId});
  final String selectionKey;
  final AiSourceCard card;
  final String? checkInId;
}

final class AiTodayContext {
  const AiTodayContext({required this.date,required this.timeZone,required this.hasMore});
  final String date,timeZone;
  final bool hasMore;
  int get limit=>5;
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
    this.today,
  }) : sourceCards = List.unmodifiable(sourceCards),
       historyPairs = List.unmodifiable(historyPairs);
  final String selectionRevision;
  final DateTime expiresAt;
  final List<AiSelectedSourceCard> sourceCards;
  final List<AiPreparedHistoryPair> historyPairs;
  final AiTodayContext? today;
}

/// The server derives the current civil day and reads a bounded owner-only set.
/// The client cannot choose a date, clock, owner or an enlarged source limit.
abstract interface class AiTodayReplyRepository {
  Future<Result<AiSelectedReplyTicket>> prepareToday({
    required String token,required AiAbortSignal abort,required String timeZone,
    String? conversationId,String? userMessageId,
  });
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
