import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/content_access.dart';
import 'package:enmori/features/ai_conversation/ai_conversation_providers.dart';
import 'package:enmori/features/ai_conversation/ai_owned_sources_providers.dart';
import 'package:enmori/features/ai_conversation/domain/ai_conversation_repository.dart';
import 'package:enmori/features/ai_conversation/domain/ai_selected_reply.dart';
import 'package:enmori/features/ai_conversation/presentation/ai_conversation_page.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'ai_selected_test_support.dart';

void main() {
  testWidgets(
    'first sourced reply is independently read back and displayed without another tap',
    (tester) async {
      final repo = _SourcedTodayRepository();
      final r = await _mount(tester, repo);
      expect(r.aiState.conversationId, isNull);
      await _send(tester);

      expect(repo.selectedExecutes, hasLength(1));
      expect(r.aiState.phase, AiConversationPhase.success);
      expect(repo.messageReads, [repo.savedReply!.conversationId]);
      // The execute receipt must not bypass current source authorization.
      expect(find.text(_replyText), findsNothing);
      expect(
        r.container.read(aiOwnedSourcesControllerProvider).sourcesNeedRead,
        isTrue,
      );

      repo.completeReadback();
      await tester.pumpAndSettle();
      expect(find.text(_replyText), findsOneWidget);
      expect(
        r.container.read(aiOwnedSourcesControllerProvider).sourcesNeedRead,
        isFalse,
      );
      expect(repo.selectedExecutes, hasLength(1));
      expect(repo.ordinaryExecutes, 0);
      expect(r.ai.draft.text, isEmpty);
      await _dispose(tester, r);
    },
  );

  testWidgets(
    'failed independent read keeps the sourced body hidden without looping or resending',
    (tester) async {
      final repo = _SourcedTodayRepository();
      final r = await _mount(tester, repo);
      await _send(tester);
      expect(repo.messageReads, hasLength(1));
      repo.readback.complete(const Failure(selectedUnknown));
      await tester.pumpAndSettle();
      expect(find.text(_replyText), findsNothing);
      expect(
        r.container.read(aiOwnedSourcesControllerProvider).sourcesNeedRead,
        isTrue,
      );
      expect(repo.messageReads, hasLength(1));
      expect(repo.selectedExecutes, hasLength(1));
      final input = find.byKey(const Key('ai-message-input'));
      await tester.ensureVisible(input);
      await tester.enterText(input, 'Keep my next unsent draft');
      await tester.pumpAndSettle();
      expect(r.ai.draft.text, 'Keep my next unsent draft');
      expect(repo.messageReads, hasLength(1));
      expect(repo.selectedExecutes, hasLength(1));
      await _dispose(tester, r);
    },
  );

  testWidgets(
    'assistant-saved original-operation recovery reads the saved sourced reply once',
    (tester) async {
      final repo = _SourcedTodayRepository()..executeUnknown = true;
      final r = await _mount(tester, repo);
      await _send(tester);
      expect(r.aiState.canCheckResult, isTrue);
      expect(repo.messageReads, isEmpty);
      final saved = repo.savedReply!;
      repo.nextReadback = Future.value(
        Success(
          AiReadback(
            operationId: saved.operationId,
            state: AiOutcomeState.assistantSaved,
            userMessage: saved.userMessage,
            assistantMessage: saved.assistantMessage,
          ),
        ),
      );
      await r.ai.checkResult();
      await _pumpFrames(tester);
      expect(repo.operationReads, 1);
      expect(repo.selectedExecutes, hasLength(1));
      expect(repo.messageReads, [saved.conversationId]);
      expect(find.text(_replyText), findsNothing);
      repo.completeReadback();
      await tester.pumpAndSettle();
      expect(find.text(_replyText), findsOneWidget);
      expect(repo.selectedExecutes, hasLength(1));
      await _dispose(tester, r);
    },
  );

  testWidgets('queued readback cannot read a newly selected topic', (
    tester,
  ) async {
    final repo = _SourcedTodayRepository();
    final r = await _mount(tester, repo);
    // Complete the explicit send before the next UI frame runs its queued GET.
    await r.sources.submit('Use today and save this reply');
    expect(r.aiState.phase, AiConversationPhase.success);
    expect(repo.messageReads, isEmpty);
    r.ai.startNewConversation();
    expect(r.aiState.conversationId, isNull);
    await tester.pumpAndSettle();
    expect(repo.messageReads, isEmpty);
    expect(r.aiState.messages, isEmpty);
    expect(find.text(_replyText), findsNothing);
    expect(repo.selectedExecutes, hasLength(1));
    await _dispose(tester, r);
  });

  testWidgets(
    'source invalidation retires a pending read until a fresh explicit transcript GET',
    (tester) async {
      final repo = _SourcedTodayRepository();
      final r = await _mount(tester, repo);
      await _send(tester);
      expect(repo.messageReads, hasLength(1));
      expect(r.aiState.readBusy, isTrue);
      r.container.read(contentAccessProvider.notifier).changed();
      await tester.pump();
      repo.completeReadback();
      await tester.pumpAndSettle();
      expect(find.text(_replyText), findsNothing);
      expect(
        r.container.read(aiOwnedSourcesControllerProvider).sourcesNeedRead,
        isTrue,
      );
      expect(r.aiState.readBusy, isFalse);
      expect(repo.messageReads, hasLength(1));
      expect(repo.selectedExecutes, hasLength(1));

      // A newly requested current transcript page may release the source gate.
      repo.nextMessages = Future.value(Success(repo.savedPage));
      await r.ai.loadMessages();
      await tester.pumpAndSettle();
      expect(find.text(_replyText), findsOneWidget);
      expect(
        r.container.read(aiOwnedSourcesControllerProvider).sourcesNeedRead,
        isFalse,
      );
      expect(repo.messageReads, hasLength(2));
      expect(repo.selectedExecutes, hasLength(1));
      await _dispose(tester, r);
    },
  );

  testWidgets(
    'source invalidation while a read token is pending prevents transcript dispatch',
    (tester) async {
      final repo = _SourcedTodayRepository();
      final r = await _mount(tester, repo);
      await r.sources.submit('Use today and save this reply');
      final token = Completer<Result<String>>();
      r.auth.nextToken = token.future;
      await _pumpFrames(tester);
      expect(r.aiState.readBusy, isTrue);
      expect(repo.messageReads, isEmpty);
      r.container.read(contentAccessProvider.notifier).changed();
      await tester.pump();
      token.complete(const Success('original-token'));
      await tester.pumpAndSettle();
      expect(repo.messageReads, isEmpty);
      expect(r.aiState.readBusy, isFalse);
      expect(find.text(_replyText), findsNothing);
      expect(repo.selectedExecutes, hasLength(1));
      expect(
        r.container.read(aiOwnedSourcesControllerProvider).sourcesNeedRead,
        isTrue,
      );

      r.auth.nextToken = null;
      repo.nextMessages = Future.value(Success(repo.savedPage));
      await r.ai.loadMessages();
      await tester.pumpAndSettle();
      expect(repo.messageReads, hasLength(1));
      expect(find.text(_replyText), findsOneWidget);
      expect(repo.selectedExecutes, hasLength(1));
      await _dispose(tester, r);
    },
  );

  for (final replaceSession in [false, true]) {
    testWidgets(
      'late reply read cannot restore the retired ${replaceSession ? 'same-UID session' : 'topic'}',
      (tester) async {
        final repo = _SourcedTodayRepository();
        final r = await _mount(tester, repo);
        await _send(tester);
        expect(repo.messageReads, hasLength(1));
        final previousSession = r.aiState.sessionKey;
        if (replaceSession) {
          r.auth.sessions.add(
            AuthSessionAuthenticated(subject: 'selected-owner'),
          );
          await tester.pump();
          expect(r.aiState.sessionKey, isNot(same(previousSession)));
        } else {
          // Retire the pending read before the existing explicit new-topic path.
          r.ai.leave();
          await tester.pump();
          r.ai.startNewConversation();
        }
        expect(r.aiState.conversationId, isNull);
        repo.completeReadback();
        await tester.pumpAndSettle();
        expect(r.aiState.conversationId, isNull);
        expect(r.aiState.messages, isEmpty);
        expect(find.text(_replyText), findsNothing);
        expect(repo.messageReads, hasLength(1));
        expect(repo.selectedExecutes, hasLength(1));
        await _dispose(tester, r);
      },
    );
  }
}

Future<SelectedRig> _mount(
  WidgetTester tester,
  _SourcedTodayRepository repo,
) async {
  final r = await SelectedRig.create(
    tester,
    repository: repo,
    today: true,
    timeZone: () async => const Success('Asia/Singapore'),
  );
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: r.container,
      child: MaterialApp(
        home: AiConversationPage(
          onBack: () {},
          onOpenSettings: () {},
          socialStyle: true,
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
  return r;
}

Future<void> _send(WidgetTester tester) async {
  final input = find.byKey(const Key('ai-message-input'));
  await tester.ensureVisible(input);
  await tester.enterText(input, 'Use today and save this reply');
  await tester.pump();
  final send = find.byKey(const Key('ai-send'));
  expect(tester.widget<FilledButton>(send).onPressed, isNotNull);
  await tester.ensureVisible(send);
  await tester.tap(send);
  await _pumpFrames(tester);
}

Future<void> _pumpFrames(WidgetTester tester) async {
  for (var frame = 0; frame < 4; frame++) {
    await tester.pump(const Duration(milliseconds: 1));
  }
}

Future<void> _dispose(WidgetTester tester, SelectedRig r) async {
  await tester.pumpWidget(const SizedBox.shrink());
  r.dispose();
  await tester.pump();
}

const _replyText = 'A saved response using the current owned Check-in.';

final class _SourcedTodayRepository extends SelectedAiRepository
    implements AiTodayReplyRepository, AiOwnedSourcesRepository {
  _SourcedTodayRepository() : super(() => selectedNow);
  final readback = Completer<Result<AiMessagePage>>();
  final messageReads = <String>[];
  Future<Result<AiMessagePage>>? nextMessages;
  AiReply? savedReply;
  bool executeUnknown = false;

  AiMessagePage get savedPage => AiMessagePage(
    messages: [savedReply!.userMessage, savedReply!.assistantMessage],
  );

  void completeReadback() => readback.complete(Success(savedPage));

  @override
  Future<Result<AiSelectedReplyTicket>> prepareToday({
    required String token,
    required AiAbortSignal abort,
    required String timeZone,
    String? conversationId,
    String? userMessageId,
  }) async {
    final result = await super.prepareSelected(
      token: token,
      abort: abort,
      sourceIds: ['today-record'],
      conversationId: conversationId,
      userMessageId: userMessageId,
    );
    if (result case Failure<AiSelectedReplyTicket>()) return result;
    final ticket = (result as Success<AiSelectedReplyTicket>).value;
    return Success(
      AiSelectedReplyTicket(
        operation: ticket.operation,
        selection: AiPreparedReplySelection(
          selectionRevision: ticket.selection.selectionRevision,
          expiresAt: ticket.selection.expiresAt,
          historyPairs: ticket.selection.historyPairs,
          today: AiTodayContext(
            date: '2026-10-25',
            timeZone: timeZone,
            hasMore: false,
          ),
          sourceCards: [
            for (final source in ticket.selection.sourceCards)
              AiSelectedSourceCard(
                selectionKey: source.selectionKey,
                card: source.card,
                checkInId: 'today-record',
              ),
          ],
        ),
      ),
    );
  }

  @override
  Future<Result<AiReply>> executeSelected({
    required String token,
    required AiAbortSignal abort,
    required AiSelectedReplyTicket ticket,
    required String text,
    required List<String> includedKeys,
    required List<String> excludedKeys,
    required List<String> excludedHistoryKeys,
    String? replyToMessageId,
  }) async {
    final result = await super.executeSelected(
      token: token,
      abort: abort,
      ticket: ticket,
      text: text,
      includedKeys: includedKeys,
      excludedKeys: excludedKeys,
      excludedHistoryKeys: excludedHistoryKeys,
      replyToMessageId: replyToMessageId,
    );
    if (result case Failure<AiReply>()) return result;
    final reply = (result as Success<AiReply>).value;
    savedReply = AiReply(
      operationId: reply.operationId,
      conversationId: reply.conversationId,
      userMessage: reply.userMessage,
      assistantMessage: AiMessage(
        messageId: reply.assistantMessage.messageId,
        sequence: reply.assistantMessage.sequence,
        role: AiRole.assistant,
        persistedAt: reply.assistantMessage.persistedAt,
        availability: AiAvailability.available,
        text: _replyText,
        sources: ticket.selection.sourceCards
            .map((source) => source.card)
            .toList(),
      ),
    );
    return executeUnknown
        ? const Failure(selectedUnknown)
        : Success(savedReply!);
  }

  @override
  Future<Result<AiMessagePage>> readMessages({
    required String token,
    required AiAbortSignal abort,
    required String conversationId,
    String? before,
  }) {
    messageReads.add(conversationId);
    return nextMessages ?? readback.future;
  }

  @override
  Future<Result<AiTopicReadState>> readTopicReadState({
    required String token,
    required AiAbortSignal abort,
    required String conversationId,
  }) async =>
      const Success(AiTopicReadState(revision: 0, readThroughSequence: 0));

  @override
  Future<Result<AiTopicReadState>> markTopicRead({
    required String token,
    required AiAbortSignal abort,
    required String conversationId,
    required int expectedRevision,
    required int readThroughSequence,
  }) async => const Failure(selectedUnknown);

  @override
  Future<Result<AiMessageAnchor>> readMessageAnchor({
    required String token,
    required AiAbortSignal abort,
    required AiMessageLocator locator,
  }) async => const Failure(selectedUnknown);

  @override
  Future<Result<AiMessageAnchor>> resolveDelivery({
    required String token,
    required AiAbortSignal abort,
    required String deliveryRef,
  }) async => const Failure(selectedUnknown);

  @override
  Future<Result<AiSourceTarget>> resolveSource({
    required String token,
    required AiAbortSignal abort,
    required AiMessageLocator message,
    required AiSourceCard card,
  }) async => const Failure(selectedUnknown);
}
