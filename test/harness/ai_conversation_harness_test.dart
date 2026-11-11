import '../support/ai_menu.dart';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/ai_conversation/data/ai_wire_repository.dart';
import 'package:enmori/features/ai_conversation/domain/ai_conversation.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/harness/ai_conversation/ai_conversation_harness_app.dart';
import 'package:enmori/harness/ai_conversation/synthetic_ai_transport.dart';
import 'package:enmori/harness/ai_conversation/synthetic_auth_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

const _token = 'synthetic-ai-token-1';
const _input = 'A synthetic note for this fixture.';

void main() {
  test(
    'synthetic auth publishes a distinct same-UID session and no real token',
    () async {
      final auth = SyntheticAiAuthRepository();
      final sessions = <AuthSession>[];
      final subscription = auth.watchSession().listen(sessions.add);
      await Future<void>.delayed(Duration.zero);
      auth.replaceSession();
      await Future<void>.delayed(Duration.zero);
      expect(sessions, hasLength(2));
      expect(sessions[0], isNot(same(sessions[1])));
      expect(
        (sessions[0] as AuthSessionAuthenticated).subject,
        (sessions[1] as AuthSessionAuthenticated).subject,
      );
      expect(await _value(auth.getIdToken()), 'synthetic-ai-token-2');
      await auth.signOut();
      expect(await auth.getIdToken(), isA<Failure<String>>());
      await subscription.cancel();
      await auth.dispose();
    },
  );

  test('actual wire repository consumes synthetic success, tombstone and complete deletion', () async {
    final transport = SyntheticAiTransport(responseDelay: Duration.zero);
    addTearDown(transport.close);
    final repository = AiWireRepository(transport);
    final ticket = await _value(
      repository.prepare(token: _token, abort: AiAbortSignal()),
    );
    final reply = await _value(
      repository.execute(
        token: _token,
        abort: AiAbortSignal(),
        ticket: ticket,
        text: _input,
      ),
    );
    expect(reply.userMessage.text, _input);
    expect(reply.assistantMessage.text, contains('Synthetic reply'));
    final saved = await _value(
      repository.readMessages(
        token: _token,
        abort: AiAbortSignal(),
        conversationId: ticket.conversationId,
      ),
    );
    expect(saved.messages, hasLength(2));
    transport.invalidateSyntheticReplies();
    final invalidated = await _value(
      repository.readOperation(
        token: _token,
        abort: AiAbortSignal(),
        conversationId: ticket.conversationId,
        operationId: ticket.operationId,
      ),
    );
    expect(invalidated.state, AiOutcomeState.assistantSaved);
    expect(
      invalidated.assistantMessage?.availability,
      AiAvailability.unavailable,
    );
    expect(invalidated.assistantMessage?.text, isNull);
    expect(
      await repository.deleteConversation(
        token: _token,
        abort: AiAbortSignal(),
        conversationId: ticket.conversationId,
      ),
      isA<Success<void>>(),
    );
    expect(
      await repository.readMessages(
        token: _token,
        abort: AiAbortSignal(),
        conversationId: ticket.conversationId,
      ),
      isA<Failure<AiMessagePage>>(),
    );
    expect(transport.deleteCalls, 1);
  });

  test('explicit synthetic Retry reuses the original user ID, sequence and timestamp', () async {
    final transport = SyntheticAiTransport(
      scenario: SyntheticAiScenario.dependency,
      responseDelay: Duration.zero,
    );
    addTearDown(transport.close);
    final repository = AiWireRepository(transport);
    final ticket = await _value(
      repository.prepare(token: _token, abort: AiAbortSignal()),
    );
    expect(
      await repository.execute(
        token: _token,
        abort: AiAbortSignal(),
        ticket: ticket,
        text: _input,
      ),
      isA<Failure<AiReply>>(),
    );
    final first = await _value(
      repository.readOperation(
        token: _token,
        abort: AiAbortSignal(),
        conversationId: ticket.conversationId,
        operationId: ticket.operationId,
      ),
    );
    expect(first.state, AiOutcomeState.userSaved);
    final user = first.userMessage!;
    transport.scenario = SyntheticAiScenario.success;
    final retry = await _value(
      repository.prepare(
        token: _token,
        abort: AiAbortSignal(),
        conversationId: ticket.conversationId,
        userMessageId: user.messageId,
      ),
    );
    final success = await _value(
      repository.execute(
        token: _token,
        abort: AiAbortSignal(),
        ticket: retry,
        text: _input,
      ),
    );
    expect(success.userMessage.messageId, user.messageId);
    expect(success.userMessage.sequence, user.sequence);
    expect(success.userMessage.persistedAt, user.persistedAt);
    final oldRead = await _value(
      repository.readOperation(
        token: _token,
        abort: AiAbortSignal(),
        conversationId: ticket.conversationId,
        operationId: ticket.operationId,
      ),
    );
    expect(oldRead.state, AiOutcomeState.assistantSaved);
    expect(
      oldRead.assistantMessage?.messageId,
      success.assistantMessage.messageId,
    );
    expect(transport.executeCalls, 2);
  });

  test('synthetic Cancel aborts only the selected active attempt', () async {
    final transport = SyntheticAiTransport(
      scenario: SyntheticAiScenario.cancellable,
    );
    addTearDown(transport.close);
    final repository = AiWireRepository(transport);
    final ticket = await _value(
      repository.prepare(token: _token, abort: AiAbortSignal()),
    );
    final signal = AiAbortSignal();
    final pending = repository.execute(
      token: _token,
      abort: signal,
      ticket: ticket,
      text: _input,
    );
    await Future<void>.delayed(Duration.zero);
    expect(
      await repository.cancel(
        token: _token,
        abort: AiAbortSignal(),
        ticket: ticket,
      ),
      isA<Success<void>>(),
    );
    expect(await pending, isA<Failure<AiReply>>());
    expect(signal.isAborted, isTrue);
    final result = await _value(
      repository.readOperation(
        token: _token,
        abort: AiAbortSignal(),
        conversationId: ticket.conversationId,
        operationId: ticket.operationId,
      ),
    );
    expect(result.state, AiOutcomeState.userSaved);
    expect(result.assistantMessage, isNull);
    expect(transport.cancelCalls, 1);
  });

  for (final scenario in [
    SyntheticAiScenario.busy,
    SyntheticAiScenario.invalidReply,
    SyntheticAiScenario.unknown,
  ]) {
    test(
      'synthetic ${scenario.label} is mapped to a typed failure, with no automatic repeat',
      () async {
        final transport = SyntheticAiTransport(
          scenario: scenario,
          responseDelay: Duration.zero,
        );
        addTearDown(transport.close);
        final repository = AiWireRepository(transport);
        final ticket = await _value(
          repository.prepare(token: _token, abort: AiAbortSignal()),
        );
        final result = await repository.execute(
          token: _token,
          abort: AiAbortSignal(),
          ticket: ticket,
          text: _input,
        );
        expect(result, isA<Failure<AiReply>>());
        final expected = switch (scenario) {
          SyntheticAiScenario.busy => AppFailureKind.aiBusy,
          SyntheticAiScenario.invalidReply => AppFailureKind.aiReplyRejected,
          _ => AppFailureKind.aiOutcomeUnresolved,
        };
        expect((result as Failure<AiReply>).failure.kind, expected);
        expect(transport.executeCalls, 1);
      },
    );
  }

  testWidgets(
    'standalone harness mounts real page/wire mapping with visible synthetic boundary',
    (tester) async {
      final transport = SyntheticAiTransport(
        responseDelay: const Duration(milliseconds: 1),
      );
      await tester.pumpWidget(AiConversationHarnessApp(transport: transport));
      await tester.pumpAndSettle();
      expect(
        find.text('Synthetic test transport — no real storage or model'),
        findsOneWidget,
      );
      await tester.enterText(find.byKey(const Key('ai-message-input')), _input);
      await tester.pump();
      await tester.tap(find.byKey(const Key('ai-send')));
      await tester.pumpAndSettle();
      expect(transport.executeCalls, 1);
      expect(
        find.textContaining('Synthetic reply for client testing.'),
        findsOneWidget,
      );
      await tester.scrollUntilVisible(
        find.byKey(const Key('ai-delete')),
        250,
        // The page ListView precedes the editor's own Scrollable. Target
        // page scrolling explicitly rather than selecting both viewports.
        scrollable: find
            .descendant(
              of: find.byKey(const Key('route-ai-conversation')),
              matching: find.byType(Scrollable),
            )
            .first,
      );
      await tester.tap(find.byKey(const Key('ai-delete')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('ai-confirm-delete')));
      await tester.pumpAndSettle();
      expect(transport.deleteCalls, 1);
      expect(
        find.textContaining('Synthetic reply for client testing.'),
        findsNothing,
      );
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );

  testWidgets(
    'harness limited fixture and Settings callback remain explicitly synthetic',
    (tester) async {
      final transport = SyntheticAiTransport(
        scenario: SyntheticAiScenario.limited,
      );
      await tester.pumpWidget(AiConversationHarnessApp(transport: transport));
      await tester.pumpAndSettle();
      await tester.enterText(find.byKey(const Key('ai-message-input')), _input);
      await tester.pump();
      await tester.tap(find.byKey(const Key('ai-send')));
      await tester.pumpAndSettle();
      expect(
        find.text(
          'AI chat is turned off. You can allow AI data use in Settings.',
        ),
        findsOneWidget,
      );
      expect(transport.executeCalls, 0);
      await revealAiMenuAction(tester, 'ai-settings');
      await tester.tap(find.byKey(const Key('ai-settings')));
      await tester.pumpAndSettle();
      expect(
        find.text(
          'Synthetic Settings callback received; real Settings is not connected.',
        ),
        findsOneWidget,
      );
      expect(find.byKey(const Key('ai-harness-open')), findsOneWidget);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );

  testWidgets(
    'same-UID fixture replacement removes the old synthetic response',
    (tester) async {
      final auth = SyntheticAiAuthRepository();
      final transport = SyntheticAiTransport(
        responseDelay: const Duration(milliseconds: 1),
      );
      await tester.pumpWidget(
        AiConversationHarnessApp(auth: auth, transport: transport),
      );
      await tester.pumpAndSettle();
      await tester.enterText(find.byKey(const Key('ai-message-input')), _input);
      await tester.pump();
      await tester.tap(find.byKey(const Key('ai-send')));
      await tester.pumpAndSettle();
      expect(
        find.textContaining('Synthetic reply for client testing.'),
        findsOneWidget,
      );
      auth.replaceSession();
      await tester.pumpAndSettle();
      expect(
        find.textContaining('Synthetic reply for client testing.'),
        findsNothing,
      );
      expect(find.byKey(const Key('ai-send')), findsOneWidget);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
}

Future<T> _value<T>(Future<Result<T>> result) async {
  final value = await result;
  if (value is Success<T>) return value.value;
  throw TestFailure(
    'Expected success, got ${(value as Failure<T>).failure.kind}.',
  );
}
