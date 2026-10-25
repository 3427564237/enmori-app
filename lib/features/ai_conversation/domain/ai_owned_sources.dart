enum AiSourceKind { conversationMessage, checkIn }

/// Minimized server sidecar. It contains no record body, URL or database path.
final class AiSourceCard {
  const AiSourceCard({
    required this.cardRef,
    required this.kind,
    required this.version,
    required this.sourceOccurredAt,
    required this.observedAt,
  });
  final String cardRef, version;
  final AiSourceKind kind;
  // Preserve the source's full-precision projection. DateTime is for display
  // only; neither a parsed time nor client contents authorize source use.
  final String sourceOccurredAt, observedAt;
}

final class AiMessageLocator {
  const AiMessageLocator({
    required this.conversationId,
    required this.messageId,
  });
  final String conversationId, messageId;
}

final class AiMessageAnchor {
  const AiMessageAnchor({
    required this.locator,
    required this.sequence,
    required this.pageBefore,
  });
  final AiMessageLocator locator;
  final int sequence;
  final String pageBefore;
}

sealed class AiSourceTarget {
  const AiSourceTarget();
}

final class AiConversationMessageTarget extends AiSourceTarget {
  const AiConversationMessageTarget(this.anchor);
  final AiMessageAnchor anchor;
}

final class AiCheckInTarget extends AiSourceTarget {
  const AiCheckInTarget(this.checkInId);
  final String checkInId;
}

final class AiTopicReadState {
  const AiTopicReadState({
    required this.revision,
    required this.readThroughSequence,
  });
  final int revision, readThroughSequence;
}

enum AiMessageLocationPhase { checking, ready, failed }

final class AiMessageLocation {
  const AiMessageLocation({
    required this.locator,
    required this.phase,
    this.sequence,
  });
  final AiMessageLocator locator;
  final AiMessageLocationPhase phase;
  final int? sequence;
}
