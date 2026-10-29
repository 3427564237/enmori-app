import 'dart:async';

import 'ai_owned_sources.dart';

/// Cancels only the request receiving this signal; it never closes a client.
final class AiAbortSignal {
  final Completer<void> _aborted = Completer<void>();

  bool get isAborted => _aborted.isCompleted;
  Future<void> get whenAborted => _aborted.future;

  void abort() {
    if (!isAborted) _aborted.complete();
  }
}

enum AiRole { user, assistant }

enum AiMessageOrigin { ordinary, proactive }

enum AiAvailability { available, unavailable }

enum AiOutcomeState { active, noEffect, userSaved, assistantSaved, unresolved }

final class AiTicket {
  const AiTicket({
    required this.operationId,
    required this.operationKey,
    required this.conversationId,
    required this.preparationExpiresAt,
  });

  final String operationId;
  final String operationKey;
  final String conversationId;
  final DateTime preparationExpiresAt;
}

final class AiMessage {
  const AiMessage({
    required this.messageId,
    required this.sequence,
    required this.role,
    required this.persistedAt,
    required this.availability,
    this.text,
    this.origin = AiMessageOrigin.ordinary,
    this.occurrenceId,
    this.sources = const [],
    this.cloudProcessed = false,
  });

  final String messageId;
  final int sequence;
  final AiRole role;
  final DateTime persistedAt;
  final AiAvailability availability;
  final String? text;
  final AiMessageOrigin origin;
  final String? occurrenceId;
  final List<AiSourceCard> sources;
  final bool cloudProcessed;
  bool get isProactive =>
      role == AiRole.assistant && origin == AiMessageOrigin.proactive;
}

final class AiReply {
  const AiReply({
    required this.operationId,
    required this.conversationId,
    required this.userMessage,
    required this.assistantMessage,
  });

  final String operationId;
  final String conversationId;
  final AiMessage userMessage;
  final AiMessage assistantMessage;
}

final class AiReadback {
  const AiReadback({
    required this.operationId,
    required this.state,
    this.userMessage,
    this.assistantMessage,
  });

  final String operationId;
  final AiOutcomeState state;
  final AiMessage? userMessage;
  final AiMessage? assistantMessage;
}

final class AiMessagePage {
  AiMessagePage({required Iterable<AiMessage> messages, this.nextCursor})
    : messages = List.unmodifiable(messages);

  final List<AiMessage> messages;
  final String? nextCursor;
}

final class AiConversationSummary {
  const AiConversationSummary({
    required this.conversationId,
    required this.lastMessageAt,
  });
  final String conversationId;
  final DateTime lastMessageAt;
}

final class AiConversationHistoryPage {
  AiConversationHistoryPage({
    required Iterable<AiConversationSummary> conversations,
    this.nextCursor,
  }) : conversations = List.unmodifiable(conversations);
  final List<AiConversationSummary> conversations;
  final String? nextCursor;
}
