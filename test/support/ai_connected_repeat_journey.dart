import 'package:enmori/features/ai_conversation/ai_conversation_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

/// Runs only explicit UI actions against the already connected app. The caller
/// owns its Auth, service and device; this script supplies no reply or recovery.
Future<AiConversationState> runAiConnectedRepeatJourney(
  WidgetTester tester, {
  void Function(String)? onStage,
}) async {
  await _until(tester, () => _state(tester).canSend);
  expect(_state(tester).messages, isEmpty);
  final first = await _send(
    tester,
    onRequested: () => onStage?.call('first_send_requested'),
  );
  _expectRows(first, 1);
  await _reload(tester);
  expectAiConnectedHistory(_state(tester), first);
  onStage?.call('first_reload_state');

  final second = await _send(
    tester,
    onRequested: () => onStage?.call('second_send_requested'),
  );
  _expectRows(second, 2);
  expect(second.conversationId == first.conversationId, isTrue);
  expect(identical(second.sessionKey, first.sessionKey), isTrue);
  _expectSameMessages(second.messages.take(2).toList(), first.messages);
  await _reload(tester);
  expectAiConnectedHistory(_state(tester), second);
  // Ordinary history merges with current rows. A later cleared-view read is a
  // separate gate; this stage alone cannot prove the GET returned all four.
  onStage?.call('two_round_reload_state');
  return second;
}

/// Compare every exposed historical field, including microsecond timestamps.
/// UI readback is not independent proof of canonical storage or provenance.
void expectAiConnectedHistory(
  AiConversationState actual,
  AiConversationState saved,
) {
  // Ordinary navigation retains same-session rows. Verify the latest GET
  // actually returned each row; cached merging alone is not fresh-read proof.
  expect(
    actual.phase,
    anyOf(AiConversationPhase.idle, AiConversationPhase.success),
  );
  expect(actual.readBusy, isFalse);
  expect(actual.canSend, isTrue);
  expect(actual.conversationId == saved.conversationId, isTrue);
  expect(identical(actual.sessionKey, saved.sessionKey), isTrue);
  expect(
    actual.lastReadMessageIds.toSet(),
    saved.messages.map((message) => message.messageId).toSet(),
  );
  _expectSameMessages(actual.messages, saved.messages);
}

const _input = 'I read a book today.';

AiConversationState _state(WidgetTester tester) => ProviderScope.containerOf(
  tester.element(find.byKey(const Key('ai-network-harness-banner'))),
).read(aiConversationControllerProvider);

Future<AiConversationState> _send(
  WidgetTester tester, {
  required void Function() onRequested,
}) async {
  await _until(tester, () => _state(tester).canSend);
  await tester.enterText(find.byKey(const Key('ai-message-input')), _input);
  await _tap(tester, 'ai-send');
  onRequested();
  // The client's existing preparation/execute/total budgets remain unchanged.
  await _until(
    tester,
    () => !const {
      AiConversationPhase.preparing,
      AiConversationPhase.waiting,
    }.contains(_state(tester).phase),
    timeout: const Duration(seconds: 95),
  );
  final accepted = _state(tester);
  expect(accepted.phase, AiConversationPhase.success);
  return accepted;
}

void _expectRows(AiConversationState state, int pairs) {
  expect(state.conversationId, isNotNull);
  expect(state.messages, hasLength(pairs * 2));
  expect(
    state.messages.map((message) => message.messageId).toSet().length,
    pairs * 2,
  );
  expect(state.messages.map((message) => message.sequence), [
    for (var sequence = 1; sequence <= pairs * 2; sequence++) sequence,
  ]);
  for (var index = 0; index < pairs; index++) {
    final user = state.messages[index * 2];
    final assistant = state.messages[index * 2 + 1];
    expect(user.role, AiRole.user);
    expect(user.availability, AiAvailability.available);
    expect(user.text, _input);
    expect(assistant.role, AiRole.assistant);
    expect(assistant.availability, AiAvailability.available);
    expect(assistant.text, isNotNull);
    expect(assistant.text, isNotEmpty);
  }
}

void _expectSameMessages(List<AiMessage> actual, List<AiMessage> saved) {
  expect(actual.length, saved.length);
  for (var index = 0; index < saved.length; index++) {
    final current = actual[index];
    final original = saved[index];
    // A real-device failure must not print complete AI content in matcher logs.
    expect(
      current.messageId == original.messageId &&
          current.sequence == original.sequence &&
          current.role == original.role &&
          current.persistedAt == original.persistedAt &&
          current.availability == original.availability &&
          current.text == original.text,
      isTrue,
      reason: 'Historical row $index must retain every exposed field.',
    );
  }
}

Future<void> _reload(WidgetTester tester) async {
  await _tap(tester, 'ai-conversation-actions');
  await _tap(tester, 'ai-reload-messages');
  await _until(tester, () => !_state(tester).readBusy);
}

Future<void> _tap(WidgetTester tester, String key) async {
  FocusManager.instance.primaryFocus?.unfocus();
  await _until(tester, () => tester.view.viewInsets.bottom == 0);
  final target = find.byKey(Key(key));
  await _until(tester, () => target.evaluate().length == 1);
  await tester.ensureVisible(target);
  await _until(tester, () {
    if (target.evaluate().length != 1 ||
        target.hitTestable().evaluate().isEmpty) {
      return false;
    }
    final route = ModalRoute.of(tester.element(target));
    return route?.animation?.isCompleted ?? true;
  });
  await tester.tap(target);
  await tester.pump();
}

Future<void> _until(
  WidgetTester tester,
  bool Function() condition, {
  Duration timeout = const Duration(seconds: 30),
}) async {
  final deadline = DateTime.now().add(timeout);
  do {
    await tester.pump(const Duration(milliseconds: 100));
    if (condition()) return;
  } while (DateTime.now().isBefore(deadline));
  throw TestFailure('The connected repeat-use journey did not reach its gate.');
}
