import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/ai_conversation/ai_conversation_providers.dart';
import 'package:enmori/features/ai_conversation/presentation/ai_conversation_page.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'ai_reference_test_support.dart';

void main() {
  testWidgets(
    'reserved new topic does not request read-state before persistence',
    (tester) async {
      final r = await _mountNewTopic(tester);
      final reply = Completer<Result<AiReply>>();
      r.repo.nextExecute = reply.future;
      r.repo.nextRead = Future.value(const Failure(_notYetPersisted));
      final sending = r.conversation.send('Synthetic first message');
      await _frames(tester);
      await r.sources.checkReadState();
      final prematureReads = r.repo.readStates;
      final prematureWarning = r.sourceState.failure;
      final prematureAction = find
          .byKey(const Key('ai-check-read-state'))
          .evaluate()
          .length;
      r.repo.nextRead = null;
      reply.complete(Success(_savedReply));
      await sending;
      await tester.pumpAndSettle();
      await _dispose(tester, r);

      expect(prematureReads, 0);
      expect(prematureWarning, isNull);
      expect(prematureAction, 0);
    },
  );

  testWidgets(
    'first saved pair gets current read-state without a reserved-topic warning',
    (tester) async {
      final r = await _mountNewTopic(tester);
      final reply = Completer<Result<AiReply>>();
      r.repo.nextExecute = reply.future;
      r.repo.nextRead = Future.value(const Failure(_notYetPersisted));
      final sending = r.conversation.send('Synthetic first message');
      await _frames(tester);
      r.repo.nextRead = null;
      reply.complete(Success(_savedReply));
      await sending;
      await tester.pumpAndSettle();
      final failure = r.sourceState.failure;
      final readState = r.sourceState.readState;
      final visibleWarning = find
          .byKey(const Key('ai-reference-failure'))
          .evaluate()
          .length;
      expect(r.conversationState.phase, AiConversationPhase.success);
      expect(r.conversationState.messages, hasLength(2));
      expect(r.repo.prepares, 1);
      expect(r.repo.executes, 1);
      expect(r.repo.readStates, 1);
      await tester.pump(const Duration(seconds: 30));
      expect(r.repo.readStates, 1);
      await _dispose(tester, r);

      expect(failure, isNull);
      expect(readState, isNotNull);
      expect(visibleWarning, 0);
    },
  );

  testWidgets(
    'an established topic still checks read-state during a new reply',
    (tester) async {
      final r = await AiReferenceRig.create(tester, messages: [referenceUser]);
      await _mount(tester, r);
      final loadingHistory = r.conversation.loadConversations();
      expect(r.conversationState.readBusy, isTrue);
      expect(r.conversationState.conversationEstablished, isTrue);
      await r.sources.checkReadState();
      await loadingHistory;
      final reads = r.repo.readStates;
      final reply = Completer<Result<AiReply>>();
      r.repo.nextExecute = reply.future;
      final sending = r.conversation.send('Synthetic first message');
      await _frames(tester);
      expect(r.conversationState.phase, AiConversationPhase.waiting);
      await r.sources.checkReadState();
      expect(r.repo.readStates, reads + 1);
      expect(r.sourceState.readState, isNotNull);
      reply.complete(const Failure(referenceUnknown));
      await sending;
      await tester.pumpAndSettle();
      expect(r.repo.executes, 1);
      await _dispose(tester, r);
    },
  );

  testWidgets(
    'a real post-save read failure remains until an explicit successful GET',
    (tester) async {
      final r = await _mountNewTopic(tester);
      r.repo.nextRead = Future.value(const Failure(referenceUnknown));
      await r.conversation.send('Synthetic first message');
      await tester.pumpAndSettle();
      expect(r.conversationState.phase, AiConversationPhase.success);
      expect(r.sourceState.failure, isNotNull);
      expect(r.repo.readStates, 1);
      await _showReferenceStatus(tester);
      expect(find.byKey(const Key('ai-reference-failure')), findsOneWidget);
      await tester.pump(const Duration(seconds: 30));
      expect(r.repo.readStates, 1);
      r.repo.nextRead = null;
      final action = find.byKey(const Key('ai-check-read-state'));
      await tester.ensureVisible(action);
      await tester.tap(action);
      await tester.pumpAndSettle();
      expect(r.repo.readStates, 2);
      expect(r.sourceState.failure, isNull);
      expect(find.byKey(const Key('ai-reference-failure')), findsNothing);
      expect(r.repo.prepares, 1);
      expect(r.repo.executes, 1);
      expect(r.repo.marks, isEmpty);
      await _dispose(tester, r);
    },
  );

  for (final outcome in [
    AiOutcomeState.noEffect,
    AiOutcomeState.userSaved,
    AiOutcomeState.assistantSaved,
  ]) {
    testWidgets(
      'unknown new-topic send waits for authoritative $outcome readback',
      (tester) async {
        final r = await _mountNewTopic(tester);
        r.repo.nextExecute = Future.value(const Failure(referenceUnknown));
        await r.conversation.send('Synthetic first message');
        await _frames(tester);
        expect(r.conversationState.conversationEstablished, isFalse);
        expect(r.repo.readStates, 0);
        await r.sources.checkReadState();
        expect(r.repo.readStates, 0);
        r.repo.nextOperation = Future.value(
          Success(
            AiReadback(
              operationId: _savedReply.operationId,
              state: outcome,
              userMessage: outcome == AiOutcomeState.noEffect
                  ? null
                  : _savedReply.userMessage,
              assistantMessage: outcome == AiOutcomeState.assistantSaved
                  ? _savedReply.assistantMessage
                  : null,
            ),
          ),
        );
        await r.conversation.checkResult();
        await tester.pumpAndSettle();
        expect(
          r.conversationState.conversationEstablished,
          outcome != AiOutcomeState.noEffect,
        );
        expect(r.repo.readStates, outcome == AiOutcomeState.noEffect ? 0 : 1);
        expect(r.sourceState.failure, isNull);
        expect(r.repo.prepares, 1);
        expect(r.repo.executes, 1);
        expect(r.repo.marks, isEmpty);
        await _dispose(tester, r);
      },
    );
  }

  testWidgets(
    'a late read-state response cannot cross same-UID session replacement',
    (tester) async {
      final r = await _mountNewTopic(tester);
      final read = Completer<Result<AiTopicReadState>>();
      r.repo.nextRead = read.future;
      await r.conversation.send('Synthetic first message');
      await _frames(tester);
      expect(r.repo.readStates, 1);
      expect(r.sourceState.readBusy, isTrue);
      r.auth.sessions.add(AuthSessionAuthenticated(subject: 'same-user'));
      await _frames(tester);
      read.complete(const Failure(referenceUnknown));
      await tester.pumpAndSettle();
      expect(r.conversationState.conversationId, isNull);
      expect(r.conversationState.conversationEstablished, isFalse);
      expect(r.sourceState.failure, isNull);
      expect(r.sourceState.readState, isNull);
      expect(find.byKey(const Key('ai-reference-failure')), findsNothing);
      expect(r.repo.executes, 1);
      await _dispose(tester, r);
    },
  );

  testWidgets(
    'queued first-persistence check cannot read a new reserved topic',
    (tester) async {
      final r = await _mountNewTopic(tester);
      await r.conversation.send('Synthetic first message');
      expect(r.conversationState.conversationEstablished, isTrue);
      expect(r.repo.readStates, 0);
      r.conversation.startNewConversation();
      const nextTopic = '55555555-5555-4555-8555-555555555555';
      r.repo.newConversationId = nextTopic;
      final reply = Completer<Result<AiReply>>();
      r.repo.nextExecute = reply.future;
      final sending = r.conversation.send('Synthetic first message');
      await _frames(tester);
      expect(r.conversationState.conversationId, nextTopic);
      expect(r.conversationState.conversationEstablished, isFalse);
      expect(r.repo.readStates, 0);
      expect(r.sourceState.failure, isNull);
      reply.complete(
        Success(
          AiReply(
            operationId: _savedReply.operationId,
            conversationId: nextTopic,
            userMessage: _savedReply.userMessage,
            assistantMessage: _savedReply.assistantMessage,
          ),
        ),
      );
      await sending;
      await tester.pumpAndSettle();
      expect(r.repo.readStates, 1);
      expect(r.repo.prepares, 2);
      expect(r.repo.executes, 2);
      await _dispose(tester, r);
    },
  );
}

const _notYetPersisted = AppFailure(
  kind: AppFailureKind.conversationUnavailable,
  message: 'The reserved topic has not been persisted.',
);

final _savedReply = AiReply(
  operationId: 'fixture-operation',
  conversationId: referenceTopic,
  userMessage: AiMessage(
    messageId: 'first-user',
    sequence: 1,
    role: AiRole.user,
    persistedAt: referenceDate,
    availability: AiAvailability.available,
    text: 'Synthetic first message',
  ),
  assistantMessage: AiMessage(
    messageId: 'first-assistant',
    sequence: 2,
    role: AiRole.assistant,
    persistedAt: referenceDate.add(const Duration(seconds: 1)),
    availability: AiAvailability.available,
    text: 'Synthetic saved reply',
  ),
);

Future<AiReferenceRig> _mountNewTopic(WidgetTester tester) async {
  final r = await AiReferenceRig.create(
    tester,
    messages: [],
    selectExistingConversation: false,
  );
  await _mount(tester, r);
  expect(r.conversationState.conversationId, isNull);
  expect(r.repo.readStates, 0);
  return r;
}

Future<void> _mount(WidgetTester tester, AiReferenceRig r) async {
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: r.container,
      child: MaterialApp(
        home: AiConversationPage(onBack: () {}, onOpenSettings: () {}),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> _frames(WidgetTester tester) async {
  for (var i = 0; i < 5; i++) {
    await tester.pump();
  }
}

Future<void> _showReferenceStatus(WidgetTester tester) async {
  final scroll = find.byType(Scrollable).first;
  tester.state<ScrollableState>(scroll).position.jumpTo(0);
  await tester.pump();
  await tester.scrollUntilVisible(
    find.byKey(const Key('ai-check-read-state')),
    180,
    scrollable: scroll,
    maxScrolls: 20,
  );
  await tester.pumpAndSettle();
}

Future<void> _dispose(WidgetTester tester, AiReferenceRig r) async {
  await tester.pumpWidget(const SizedBox());
  r.dispose();
  await tester.pump();
}
