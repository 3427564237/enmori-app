import 'dart:async';

import '../../ai_conversation/domain/ai_conversation.dart';

/// Per-request cancellation; never closes a caller-owned shared client.
final class ProactiveAbortSignal {
  final _completion = Completer<void>();
  bool get isAborted => _completion.isCompleted;
  Future<void> get whenAborted => _completion.future;
  void abort() {
    if (!isAborted) _completion.complete();
  }
}

enum ProactiveMode { off, on, paused }

enum ProactivePreview { generic, hidden }

sealed class ProactiveQuiet {
  const ProactiveQuiet();
}

final class ProactiveQuietWindow extends ProactiveQuiet {
  const ProactiveQuietWindow(this.startMinute, this.endMinute);
  final int startMinute, endMinute;
}

final class ProactiveQuietDisabled extends ProactiveQuiet {
  const ProactiveQuietDisabled();
}

final class ProactiveSettings {
  ProactiveSettings({
    required this.revision,
    required this.mode,
    required Iterable<String> categories,
    required this.timeZone,
    required this.quiet,
    required this.maximumInRolling24h,
    required this.cooldownMinutes,
    required this.pushEnabled,
    required this.preview,
    this.pausedUntil,
  }) : categories = List.unmodifiable(categories);

  final int revision;
  final ProactiveMode mode;
  final List<String> categories;
  final String timeZone;
  final ProactiveQuiet quiet;
  final int maximumInRolling24h, cooldownMinutes;
  final bool pushEnabled;
  final ProactivePreview preview;
  final DateTime? pausedUntil;

  bool get allowsExplicitFollowUp =>
      mode == ProactiveMode.on && categories.contains('explicit_follow_up');
}

/// UI-local view of a saved user message. Only its IDs enter the command.
/// Backend reauthorizes the live topic/source; this object grants no permission.
final class SavedFollowUpSource {
  const SavedFollowUpSource._({
    required this.conversationId,
    required this.messageId,
    required this.sequence,
    required this.occurredAt,
    required this.text,
  });

  static SavedFollowUpSource? fromMessage({
    required String conversationId,
    required AiMessage message,
  }) {
    if (conversationId.isEmpty ||
        message.role != AiRole.user ||
        message.availability != AiAvailability.available ||
        message.text?.trim().isNotEmpty != true) {
      return null;
    }
    return SavedFollowUpSource._(
      conversationId: conversationId,
      messageId: message.messageId,
      sequence: message.sequence,
      occurredAt: message.persistedAt,
      text: message.text!,
    );
  }

  final String conversationId, messageId, text;
  final int sequence;
  final DateTime occurredAt;
}

final class FollowUpTime {
  const FollowUpTime({
    required this.dueAt,
    required this.timeZone,
    required this.displayTime,
    required this.offsetLabel,
  });
  final DateTime dueAt;
  final String timeZone, displayTime, offsetLabel;
}

final class FollowUpCivilTime {
  const FollowUpCivilTime({
    required this.year,
    required this.month,
    required this.day,
    required this.hour,
    required this.minute,
  });
  final int year, month, day, hour, minute;
}

enum FollowUpIntentState {
  queued,
  reserved,
  prepared,
  published,
  failed,
  cancelled,
  expired,
  dispatching,
  accepted,
  unknown,
}

final class FollowUpIntent {
  const FollowUpIntent({
    required this.intentId,
    required this.revision,
    required this.state,
    required this.dueAt,
    required this.expiresAt,
    required this.conversationId,
    this.recallPossible,
  });
  final String intentId, conversationId;
  final int revision;
  final FollowUpIntentState state;
  final DateTime dueAt, expiresAt;
  final bool? recallPossible;
}

final class CreateFollowUp {
  const CreateFollowUp({
    required this.intentId,
    required this.conversationId,
    required this.sourceMessageId,
    required this.time,
    required this.expectedSettingsRevision,
  });
  final String intentId, conversationId, sourceMessageId;
  final FollowUpTime time;
  final int expectedSettingsRevision;
}
