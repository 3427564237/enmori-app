import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/content_access.dart';
import 'package:enmori/features/ai_conversation/ai_conversation_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:flutter_test/flutter_test.dart';

import 'ai_reference_test_support.dart';

void main() {
  testWidgets(
    'same-topic source lookup keeps a confirmed user-saved retry binding',
    (tester) async {
      final r = await AiReferenceRig.create(tester);
      r.repo.nextExecute = Future.value(const Failure(referenceUnknown));
      await r.conversation.send('One saved real input');
      final saved = AiMessage(
        messageId: 'new-saved-user',
        sequence: 3,
        role: AiRole.user,
        persistedAt: referenceDate.add(const Duration(hours: 1, minutes: 1)),
        availability: AiAvailability.available,
        text: 'One saved real input',
      );
      r.repo.nextOperation = Future.value(
        Success(
          AiReadback(
            operationId: 'fixture-operation',
            state: AiOutcomeState.userSaved,
            userMessage: saved,
          ),
        ),
      );
      await r.conversation.checkResult();
      expect(r.conversationState.canRetry, isTrue);
      await r.conversation.openMessage(
        const AiMessageLocator(
          conversationId: referenceTopic,
          messageId: referenceMessage,
        ),
      );
      expect(r.conversationState.canRetry, isTrue);
      expect(r.conversationState.canSend, isFalse);
      expect(r.conversationState.canCheckResult, isTrue);
      expect(r.repo.prepares, 1);
      expect(r.repo.executes, 1);
      r.dispose();
    },
  );
  testWidgets(
    'fresh unrelated page cannot reauthorize cached hidden source or its reply',
    (tester) async {
      final r = await AiReferenceRig.create(tester);
      r.conversation.replyToFollowUp(referenceMessage);
      r.repo.nextResolve = Future.value(
        const Failure(
          AppFailure(
            kind: AppFailureKind.aiSourceUnavailable,
            message: 'source lost',
          ),
        ),
      );
      await r.sources.resolve(referenceMessage, referenceSource);
      expect(r.sourceState.hides(referenceProactive), isTrue);
      expect(r.conversationState.canSend, isFalse);
      r.repo.messages = [referenceUser];
      await r.conversation.loadMessages();
      expect(r.sourceState.hides(referenceProactive), isTrue);
      expect(r.conversationState.canSend, isFalse);
      expect(r.conversationState.lastReadMessageIds, [referenceUser.messageId]);
      r.repo.messages = [referenceUser, referenceProactive];
      await r.conversation.openMessage(
        const AiMessageLocator(
          conversationId: referenceTopic,
          messageId: referenceMessage,
        ),
      );
      expect(r.sourceState.hides(referenceProactive), isFalse);
      expect(r.conversationState.replyToMessageId, referenceMessage);
      expect(r.conversationState.canSend, isTrue);
      expect(
        r.conversationState.lastReadMessageIds,
        contains(referenceMessage),
      );
      expect(r.repo.prepares, 0);
      expect(r.repo.executes, 0);
      r.dispose();
    },
  );
  testWidgets(
    'removing a retired reply association is explicit and keeps the unsent draft',
    (tester) async {
      final r = await AiReferenceRig.create(tester);
      const draft = TextEditingValue(text: 'Keep my own words');
      r.conversation.updateDraft(
        draft,
        sessionKey: r.conversationState.sessionKey,
      );
      r.conversation.replyToFollowUp(referenceMessage);
      r.repo.nextResolve = Future.value(
        const Failure(
          AppFailure(
            kind: AppFailureKind.aiSourceUnavailable,
            message: 'source lost',
          ),
        ),
      );
      await r.sources.resolve(referenceMessage, referenceSource);
      expect(r.conversationState.canSend, isFalse);
      expect(r.conversationState.replyToMessageId, referenceMessage);
      r.conversation.clearReplyTarget();
      expect(r.conversationState.canSend, isTrue);
      expect(r.conversation.draft, draft);
      expect(r.repo.prepares, 0);
      expect(r.repo.executes, 0);
      r.dispose();
    },
  );
  testWidgets(
    'late earlier transcript cannot restore a later rejected source body',
    (tester) async {
      final r = await AiReferenceRig.create(tester);
      final earlier = Completer<Result<AiMessagePage>>();
      r.repo.nextMessages = earlier.future;
      final reading = r.conversation.loadMessages();
      await tester.pump();
      r.repo.nextResolve = Future.value(
        const Failure(
          AppFailure(
            kind: AppFailureKind.aiSourceUnavailable,
            message: 'source lost',
          ),
        ),
      );
      await r.sources.resolve(referenceMessage, referenceSource);
      await reading;
      expect(r.sourceState.hides(referenceProactive), isTrue);
      earlier.complete(
        Success(AiMessagePage(messages: [referenceUser, referenceProactive])),
      );
      await tester.pump();
      expect(r.sourceState.hides(referenceProactive), isTrue);
      r.repo.nextMessages = null;
      await r.conversation.loadMessages();
      expect(r.sourceState.hides(referenceProactive), isFalse);
      expect(r.repo.prepares, 0);
      expect(r.repo.executes, 0);
      r.dispose();
    },
  );
  testWidgets(
    'read sidecar alone never marks read; actual committed proactive visibility uses exact revision',
    (tester) async {
      final r = await AiReferenceRig.create(tester);
      await r.sources.checkReadState();
      expect(r.sourceState.sourcesNeedRead, isFalse);
      expect(r.repo.marks, isEmpty);
      expect(r.sourceState.isUnread(referenceProactive), isTrue);
      await r.sources.markActuallyVisible(referenceUser.messageId);
      expect(r.repo.marks, isEmpty);
      await r.sources.markActuallyVisible(referenceMessage);
      expect(r.repo.marks.single, (
        topic: referenceTopic,
        revision: 0,
        sequence: 2,
      ));
      expect(r.sourceState.isUnread(referenceProactive), isFalse);
      await r.sources.markActuallyVisible(referenceMessage);
      expect(r.repo.marks, hasLength(1));
      expect(r.repo.prepares, 0);
      expect(r.repo.executes, 0);
      r.dispose();
    },
  );
  testWidgets(
    'unknown read PUT is fenced until successful GET and never shown synced',
    (tester) async {
      final r = await AiReferenceRig.create(tester);
      await r.sources.checkReadState();
      r.repo.nextMark = Future.value(const Failure(referenceUnknown));
      await r.sources.markActuallyVisible(referenceMessage);
      expect(r.sourceState.readUnconfirmed, isTrue);
      expect(r.sourceState.isUnread(referenceProactive), isFalse);
      await r.sources.markActuallyVisible(referenceMessage);
      expect(r.repo.marks, hasLength(1));
      r.repo.nextRead = Future.value(const Failure(referenceUnknown));
      await r.sources.checkReadState();
      expect(r.sourceState.readUnconfirmed, isTrue);
      r.repo.nextRead = Future.value(
        const Success(AiTopicReadState(revision: 1, readThroughSequence: 2)),
      );
      await r.sources.checkReadState();
      expect(r.sourceState.readUnconfirmed, isFalse);
      expect(r.repo.marks, hasLength(1));
      r.dispose();
    },
  );
  testWidgets(
    'failed source resolver hides old message until authoritative transcript refresh',
    (tester) async {
      final r = await AiReferenceRig.create(tester);
      r.repo.nextResolve = Future.value(
        const Failure(
          AppFailure(
            kind: AppFailureKind.aiSourceUnavailable,
            message: 'private',
          ),
        ),
      );
      expect(
        await r.sources.resolve(referenceMessage, referenceSource),
        isNull,
      );
      expect(r.sourceState.hides(referenceProactive), isTrue);
      expect(r.repo.resolves.single.message.conversationId, referenceTopic);
      expect(r.repo.resolves.single.card.version, referenceSource.version);
      await r.sources.resolve(referenceMessage, referenceSource);
      expect(r.repo.resolves, hasLength(1));
      await r.conversation.loadMessages();
      expect(r.sourceState.hides(referenceProactive), isFalse);
      expect(r.repo.prepares, 0);
      r.dispose();
    },
  );
  testWidgets(
    'background aborts source navigation and late target cannot cross authority',
    (tester) async {
      final r = await AiReferenceRig.create(tester);
      final response = Completer<Result<AiSourceTarget>>();
      r.repo.nextResolve = response.future;
      final resolving = r.sources.resolve(referenceMessage, referenceSource);
      await tester.pump();
      final abort = r.repo.aborts.last;
      r.container.read(contentAccessProvider.notifier).setForeground(false);
      await tester.pump();
      expect(await resolving, isNull);
      expect(abort.isAborted, isTrue);
      response.complete(const Success(AiCheckInTarget('stale-target')));
      await tester.pump();
      expect(r.sourceState.resolvingCardRef, isNull);
      expect(r.sourceState.hides(referenceProactive), isTrue);
      r.container.read(contentAccessProvider.notifier).setForeground(true);
      await tester.pump();
      await r.sources.markActuallyVisible(referenceMessage);
      expect(r.repo.marks, isEmpty);
      r.dispose();
    },
  );
  testWidgets('same UID replacement retires old read-state acknowledgement', (
    tester,
  ) async {
    final r = await AiReferenceRig.create(tester);
    await r.sources.checkReadState();
    final response = Completer<Result<AiTopicReadState>>();
    r.repo.nextMark = response.future;
    final marking = r.sources.markActuallyVisible(referenceMessage);
    await tester.pump();
    r.auth.sessions.add(AuthSessionAuthenticated(subject: 'same-user'));
    await tester.pump();
    await marking;
    response.complete(
      const Success(AiTopicReadState(revision: 1, readThroughSequence: 2)),
    );
    await tester.pump();
    expect(r.sourceState.readState, isNull);
    expect(r.sourceState.conversationId, isNull);
    expect(r.conversationState.messages, isEmpty);
    r.dispose();
  });
  testWidgets(
    'anchor opens only exact returned page without global latest or dispatch',
    (tester) async {
      final r = await AiReferenceRig.create(tester);
      r.repo.messageReads.clear();
      const target = AiMessageLocator(
        conversationId: 'other-owned-topic',
        messageId: referenceMessage,
      );
      await r.conversation.openMessage(target);
      expect(r.conversationState.conversationId, target.conversationId);
      expect(
        r.conversationState.messageLocation!.phase,
        AiMessageLocationPhase.ready,
      );
      expect(r.conversationState.messageLocation!.sequence, 2);
      expect(r.repo.messageReads.single, (
        conversationId: target.conversationId,
        before: 'eyJ2IjoxLCJiZWZvcmUiOjN9',
      ));
      expect(r.repo.prepares, 0);
      expect(r.repo.executes, 0);
      expect(r.repo.marks, isEmpty);
      r.dispose();
    },
  );
  testWidgets(
    'absent anchor target cannot fall back, delete previous topic or send there',
    (tester) async {
      final r = await AiReferenceRig.create(tester);
      r.repo.messages = [referenceUser];
      r.repo.messageReads.clear();
      const draft = TextEditingValue(text: 'Keep this unsent draft');
      r.conversation.updateDraft(
        draft,
        sessionKey: r.conversationState.sessionKey,
      );
      await r.conversation.openMessage(
        const AiMessageLocator(
          conversationId: 'other-owned-topic',
          messageId: referenceMessage,
        ),
      );
      expect(
        r.conversationState.messageLocation!.phase,
        AiMessageLocationPhase.failed,
      );
      expect(r.conversationState.messages, isEmpty);
      expect(r.conversationState.canSend, isFalse);
      expect(r.conversationState.canDelete, isFalse);
      expect(r.conversation.draft, draft);
      expect(r.repo.messageReads, hasLength(1));
      expect(r.repo.messageReads.single.before, isNotNull);
      await r.conversation.loadMessages();
      expect(r.repo.messageReads, hasLength(1));
      r.dispose();
    },
  );
  testWidgets(
    'anchor unknown and late page after background never select a replacement topic',
    (tester) async {
      final r = await AiReferenceRig.create(tester);
      final response = Completer<Result<AiMessageAnchor>>();
      r.repo.nextAnchor = response.future;
      final opening = r.conversation.openMessage(
        const AiMessageLocator(
          conversationId: 'other-owned-topic',
          messageId: referenceMessage,
        ),
      );
      await tester.pump();
      r.container.read(contentAccessProvider.notifier).setForeground(false);
      await tester.pump();
      await opening;
      response.complete(
        const Success(
          AiMessageAnchor(
            locator: AiMessageLocator(
              conversationId: 'other-owned-topic',
              messageId: referenceMessage,
            ),
            sequence: 2,
            pageBefore: 'eyJ2IjoxLCJiZWZvcmUiOjN9',
          ),
        ),
      );
      await tester.pump();
      expect(r.conversationState.conversationId, referenceTopic);
      expect(
        r.conversationState.messageLocation!.phase,
        AiMessageLocationPhase.failed,
      );
      expect(r.conversationState.messages, isEmpty);
      r.dispose();
    },
  );
  testWidgets('reply association stays local until explicit real-user Send', (
    tester,
  ) async {
    final r = await AiReferenceRig.create(tester);
    r.conversation.replyToFollowUp(referenceMessage);
    expect(r.conversationState.replyToMessageId, referenceMessage);
    expect(r.repo.prepares, 0);
    expect(r.repo.executes, 0);
    await r.conversation.send('My real response');
    expect(r.repo.replies, [referenceMessage]);
    expect(r.repo.executes, 1);
    expect(
      r.conversationState.messages.where((m) => m.role == AiRole.user),
      hasLength(2),
    );
    expect(
      r.conversationState.messages.where((m) => m.isProactive),
      hasLength(1),
    );
    expect(r.conversationState.replyToMessageId, isNull);
    r.dispose();
  });
  testWidgets(
    'ordinary off composition exposes no source calls or reply association',
    (tester) async {
      final r = await AiReferenceRig.create(tester, enabled: false);
      await r.sources.checkReadState();
      await r.sources.markActuallyVisible(referenceMessage);
      await r.sources.resolve(referenceMessage, referenceSource);
      r.conversation.replyToFollowUp(referenceMessage);
      await r.conversation.openMessage(
        const AiMessageLocator(
          conversationId: referenceTopic,
          messageId: referenceMessage,
        ),
      );
      expect(r.repo.readStates, 0);
      expect(r.repo.marks, isEmpty);
      expect(r.repo.resolves, isEmpty);
      expect(r.repo.anchors, isEmpty);
      expect(r.conversationState.replyToMessageId, isNull);
      r.dispose();
    },
  );
}
