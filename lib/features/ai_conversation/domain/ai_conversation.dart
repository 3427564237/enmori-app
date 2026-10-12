import 'dart:async';

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
  });

  final String messageId;
  final int sequence;
  final AiRole role;
  final DateTime persistedAt;
  final AiAvailability availability;
  final String? text;
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
