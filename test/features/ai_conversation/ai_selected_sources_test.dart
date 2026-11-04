import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/content_access.dart';
import 'package:enmori/features/account/account_preferences_providers.dart';
import 'package:enmori/features/account/domain/account_preferences_repository.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/ai_conversation/ai_conversation_providers.dart';
import 'package:enmori/features/ai_conversation/ai_selected_sources_providers.dart';
import 'package:enmori/features/ai_conversation/domain/ai_selected_reply.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/check_in/domain/check_in_repository.dart';
import 'package:flutter_test/flutter_test.dart';

import 'ai_selected_test_support.dart';

void main() {
  void observeOpenAi(SelectedRig rig, CloudAiConsent grant, int revision) {
    rig.container
        .read(accountSettingsSnapshotProvider.notifier)
        .observe(
          OwnSettings(
            checkInVisibility: CheckInVisibility.private,
            consent: OptionalProcessingConsent.accepted,
            revision: revision,
            cloudAiConsent: grant,
          ),
        );
  }

  testWidgets('OpenAI withdrawal aborts a pending selection before Execute', (
    tester,
  ) async {
    final r = await SelectedRig.create(
      tester,
      processing: AiClientProcessing.openaiCloud,
    );
    r.add('record');
    await r.sources.chooseOwned('record');
    final response = Completer<Result<AiSelectedReplyTicket>>();
    r.repo.nextPrepare = response.future;
    final pending = r.sources.review();
    await tester.pump();
    expect(r.repo.selectedPrepares, hasLength(1));
    observeOpenAi(r, CloudAiConsent.openaiDeclined, 2);
    await tester.pump();
    await pending;
    expect(r.repo.selectedPrepares.single.abort.isAborted, isTrue);
    expect(r.aiState.phase, AiConversationPhase.limited);
    final operation = AiTicket(
      operationId: 'operation-1',
      operationKey: 'stale',
      conversationId: 'selected-topic',
      preparationExpiresAt: r.utc.add(const Duration(seconds: 15)),
    );
    response.complete(
      Success(
        AiSelectedReplyTicket(
          operation: operation,
          selection: AiPreparedReplySelection(
            selectionRevision: 'old',
            expiresAt: operation.preparationExpiresAt,
            sourceCards: [],
            historyPairs: [],
          ),
        ),
      ),
    );
    await tester.pump();
    await r.sources.send('Private synthetic text');
    expect(r.repo.selectedExecutes, isEmpty);
    expect(r.sourceState.review, isNull);
    r.dispose();
    await tester.pump();
  });

  testWidgets(
    'OpenAI withdrawal cancels in-flight work and reacceptance cannot display cached replies',
    (tester) async {
      final r = await SelectedRig.create(
        tester,
        processing: AiClientProcessing.openaiCloud,
      );
      r.add('record');
      Future<void> review() async {
        await r.sources.chooseOwned('record');
        await r.sources.review();
        r.sources.confirm(r.sourceState.review!.selectionRevision);
      }

      await review();
      await r.sources.send('First synthetic message');
      expect(r.aiState.messages, hasLength(2));
      expect(r.repo.selectedExecutes, hasLength(1));
      await review();
      final response = Completer<Result<AiReply>>();
      r.repo.nextExecute = response.future;
      final pending = r.sources.send('Second synthetic message');
      await tester.pump();
      expect(r.repo.selectedExecutes, hasLength(2));
      final original = r.repo.selectedExecutes.last.ticket.operation;

      observeOpenAi(r, CloudAiConsent.openaiDeclined, 2);
      await tester.pump();
      await pending;
      expect(
        r.repo.cancellations.where(
          (ticket) => ticket.operationId == original.operationId,
        ),
        hasLength(1),
      );
      expect(r.aiState.messages, isEmpty);
      expect(r.aiState.phase, AiConversationPhase.limited);
      observeOpenAi(r, CloudAiConsent.openaiAccepted, 1);
      expect(r.aiState.phase, AiConversationPhase.limited);

      observeOpenAi(r, CloudAiConsent.openaiAccepted, 3);
      expect(r.aiState.messages, isEmpty);
      expect(r.aiState.phase, AiConversationPhase.unknown);
      expect(r.aiState.canCheckResult, isTrue);
      response.complete(const Failure(selectedUnknown));
      await tester.pump();
      expect(r.aiState.messages, isEmpty);
      expect(r.repo.selectedExecutes, hasLength(2));
      r.dispose();
      await tester.pump();
    },
  );

  testWidgets(
    'unknown OpenAI settings close sending while retaining the unsent draft',
    (tester) async {
      final r = await SelectedRig.create(
        tester,
        processing: AiClientProcessing.openaiCloud,
      );
      const text = 'Unsent synthetic draft';
      r.ai.updateDraft(
        const TextEditingValue(text: text),
        sessionKey: r.aiState.sessionKey,
      );
      expect(r.aiState.canSend, isTrue);
      r.container.invalidate(accountSettingsSnapshotProvider);
      await tester.pump();
      expect(r.aiState.canSend, isFalse);
      expect(r.ai.draft.text, text);
      await r.ai.send(text);
      expect(r.repo.ordinaryPrepares, 0);
      observeOpenAi(r, CloudAiConsent.openaiAccepted, 2);
      expect(r.aiState.canSend, isTrue);
      expect(r.ai.draft.text, text);
      r.dispose();
      await tester.pump();
    },
  );

  for (final background in [false, true]) {
    testWidgets(
      'pending selected execution recovers after access retirement (background=$background)',
      (tester) async {
        final r = await SelectedRig.create(tester);
        r.add('record');
        await r.sources.chooseOwned('record');
        const text = 'Keep this original operation';
        r.ai.updateDraft(
          const TextEditingValue(text: text),
          sessionKey: r.aiState.sessionKey,
        );
        await r.sources.review();
        r.sources.confirm(r.sourceState.review!.selectionRevision);
        final response = Completer<Result<AiReply>>();
        r.repo.nextExecute = response.future;
        final pending = r.sources.send(text);
        await tester.pump();
        expect(r.sourceState.sending, isTrue);
        expect(r.repo.selectedExecutes, hasLength(1));
        if (background) {
          r.container.read(contentAccessProvider.notifier).setForeground(false);
        } else {
          r.container.read(contentAccessProvider.notifier).changed();
        }
        // Native lifecycle / explicit Cancel uses the same original-attempt fence.
        r.ai.cancel();
        await tester.pump();
        await pending;
        expect(r.sourceState.sending, isFalse);
        expect(r.sourceState.selectedIds, {'record'});
        expect(r.aiState.canCheckResult, isTrue);
        expect(r.aiState.canSend, isFalse);
        expect(r.ai.draft.text, text);
        expect(r.sourceState.review, isNull);
        if (background) {
          r.container.read(contentAccessProvider.notifier).setForeground(true);
          await tester.pump();
        }
        await r.sources.review();
        expect(r.repo.selectedPrepares, hasLength(1));
        r.repo.nextReadback = Future.value(
          const Success(
            AiReadback(
              operationId: 'operation-1',
              state: AiOutcomeState.noEffect,
            ),
          ),
        );
        await r.ai.checkResult();
        await r.sources.review();
        expect(r.repo.selectedPrepares, hasLength(2));
        expect(r.sources.canSend, isFalse);
        final revision = r.sourceState.review!.selectionRevision;
        response.complete(const Failure(selectedUnknown));
        await tester.pump();
        expect(r.sourceState.review!.selectionRevision, revision);
        expect(r.sourceState.selectedIds, {'record'});
        expect(r.ai.draft.text, text);
        expect(r.repo.selectedExecutes, hasLength(1));
        r.sources.confirm(revision);
        r.repo.nextExecute = null;
        await r.sources.send(text);
        expect(r.repo.selectedExecutes, hasLength(2));
        expect(r.sourceState.selectedIds, isEmpty);
        r.dispose();
        await tester.pump();
      },
    );
  }
  testWidgets(
    'returning to edit while prepare is pending abandons its old keys without losing choices',
    (tester) async {
      final r = await SelectedRig.create(tester);
      r.add('record');
      await r.sources.chooseOwned('record');
      final response = Completer<Result<AiSelectedReplyTicket>>();
      r.repo.nextPrepare = response.future;
      final pending = r.sources.review();
      await tester.pump();
      expect(r.sourceState.busy, isTrue);
      r.sources.editSelection();
      await tester.pump();
      await pending;
      expect(r.sourceState.busy, isFalse);
      expect(r.sourceState.selectedIds, {'record'});
      expect(r.sourceState.review, isNull);
      expect(r.aiState.readBusy, isFalse);
      expect(r.repo.selectedPrepares.single.abort.isAborted, isTrue);
      response.complete(const Failure(selectedUnknown));
      await tester.pump();
      r.repo.nextPrepare = null;
      await r.sources.review();
      expect(r.sources.canSend, isFalse);
      expect(r.repo.selectedExecutes, isEmpty);
      r.dispose();
      await tester.pump();
    },
  );
  testWidgets(
    'explicit new topic retires the review and choices while preserving the draft',
    (tester) async {
      final r = await SelectedRig.create(tester, existingTopic: true);
      r.add('record');
      await r.sources.chooseOwned('record');
      await r.sources.review();
      r.sources.confirm(r.sourceState.review!.selectionRevision);
      final revision = r.sourceState.review!.selectionRevision;
      r.ai.updateDraft(
        const TextEditingValue(text: 'Retain my unsent draft'),
        sessionKey: r.aiState.sessionKey,
      );
      r.ai.startNewConversation();
      await tester.pump();
      expect(r.sourceState.selectedIds, isEmpty);
      expect(r.sourceState.review, isNull);
      expect(r.ai.hasSelectedPreparation(revision), isFalse);
      expect(r.ai.draft.text, 'Retain my unsent draft');
      expect(r.repo.selectedExecutes, isEmpty);
      r.dispose();
      await tester.pump();
    },
  );

  testWidgets(
    'a source crossing the inclusive time boundary cannot use its earlier confirmation',
    (tester) async {
      final r = await SelectedRig.create(tester);
      r.add('boundary', at: r.utc.subtract(const Duration(days: 7)));
      await r.sources.chooseOwned('boundary');
      await r.sources.review();
      r.sources.confirm(r.sourceState.review!.selectionRevision);
      await r.advance(tester, const Duration(microseconds: 1));
      expect(r.sources.canSend, isFalse);
      await r.sources.send('This is now outside the window');
      expect(r.repo.selectedExecutes, isEmpty);
      await r.sources.review();
      expect(r.sourceState.notice, AiSelectionNotice.unavailable);
      expect(r.sourceState.records, isEmpty);
      expect(r.sourceState.selectedIds, {'boundary'});
      expect(r.repo.selectedPrepares, hasLength(1));
      r.dispose();
      await tester.pump();
    },
  );

  testWidgets(
    'background aborts a pending selected prepare without leaving a stuck ordinary-read busy flag',
    (tester) async {
      final r = await SelectedRig.create(tester);
      r.add('record');
      await r.sources.chooseOwned('record');
      final response = Completer<Result<AiSelectedReplyTicket>>();
      r.repo.nextPrepare = response.future;
      final pending = r.sources.review();
      await tester.pump();
      expect(r.aiState.readBusy, isTrue);
      r.container.read(contentAccessProvider.notifier).setForeground(false);
      await tester.pump();
      await pending;
      expect(r.aiState.readBusy, isFalse);
      expect(r.sourceState.review, isNull);
      expect(r.repo.selectedPrepares.single.abort.isAborted, isTrue);
      response.complete(const Failure(selectedUnknown));
      await tester.pump();
      r.container.read(contentAccessProvider.notifier).setForeground(true);
      await tester.pump();
      expect(r.aiState.canSend, isTrue);
      expect(r.repo.selectedExecutes, isEmpty);
      expect(r.sourceState.selectedIds, {'record'});
      r.dispose();
      await tester.pump();
    },
  );

  testWidgets(
    'owned-record authorization failure clears the old display without waiting for the auth stream',
    (tester) async {
      final r = await SelectedRig.create(tester);
      r.add('record');
      await r.sources.chooseOwned('record');
      r.ai.updateDraft(
        const TextEditingValue(text: 'Private editor'),
        sessionKey: r.aiState.sessionKey,
      );
      r.checkIns.ownedResults['record'] = Future.value(
        const Failure(
          AppFailure(
            kind: AppFailureKind.authForbidden,
            message: 'private auth body',
          ),
        ),
      );
      await r.sources.review();
      await tester.pump();
      expect(r.sourceState.records, isEmpty);
      expect(r.sourceState.selectedIds, isEmpty);
      expect(r.sourceState.permitted, isFalse);
      expect(r.ai.draft.text, isEmpty);
      expect(r.repo.selectedPrepares, isEmpty);
      r.dispose();
      await tester.pump();
    },
  );
  testWidgets(
    'zero defaults, five exact choices, sixth blocked and one-reply success clears choices',
    (tester) async {
      final r = await SelectedRig.create(tester);
      for (var i = 0; i < 6; i++) {
        r.add('record-$i');
      }
      await r.sources.loadRecent();
      expect(r.sourceState.selectedIds, isEmpty);
      expect(r.repo.selectedPrepares, isEmpty);
      for (var i = 0; i < 6; i++) {
        r.sources.toggle('record-$i');
      }
      expect(r.sourceState.selectedIds.length, 5);
      expect(r.sourceState.notice, AiSelectionNotice.limit);
      r.ai.updateDraft(
        const TextEditingValue(text: 'My actual question'),
        sessionKey: r.aiState.sessionKey,
      );
      await r.sources.review();
      expect(r.repo.selectedPrepares.single.ids, [
        for (var i = 0; i < 5; i++) 'record-$i',
      ]);
      expect(r.repo.selectedExecutes, isEmpty);
      expect(r.sources.canSend, isFalse);
      r.sources.confirm(r.sourceState.review!.selectionRevision);
      expect(r.sources.canSend, isTrue);
      r.auth.token = 'a refreshed token is not the original scope';
      await r.sources.send('My actual question');
      expect(r.repo.selectedExecutes.single.token, 'original-token');
      expect(r.repo.selectedExecutes.single.included, [
        for (var i = 0; i < 5; i++) 'source-key-1-$i',
      ]);
      expect(r.repo.ordinaryPrepares, 0);
      expect(r.repo.ordinaryExecutes, 0);
      expect(r.aiState.phase, AiConversationPhase.success);
      expect(r.ai.draft.text, isEmpty);
      expect(r.sourceState.selectedIds, isEmpty);
      expect(r.sourceState.active, isFalse);
      expect(r.checkIns.creates, 0);
      r.dispose();
      await tester.pump();
    },
  );

  testWidgets(
    'zero-source review is explicit and carries no invented sources',
    (tester) async {
      final r = await SelectedRig.create(tester);
      await r.sources.review();
      r.sources.confirm(r.sourceState.review!.selectionRevision);
      await r.sources.send('Use only this message');
      expect(r.repo.selectedPrepares.single.ids, isEmpty);
      expect(r.repo.selectedExecutes.single.included, isEmpty);
      expect(r.repo.selectedExecutes.single.excluded, isEmpty);
      r.dispose();
      await tester.pump();
    },
  );

  testWidgets(
    'rolling seven-day inclusive boundary filters future and older records; cursor failure keeps partial data',
    (tester) async {
      final r = await SelectedRig.create(tester);
      r.add('boundary', at: r.utc.subtract(const Duration(days: 7)));
      r.add(
        'too-old',
        at: r.utc.subtract(const Duration(days: 7, microseconds: 1)),
      );
      r.add('at-now', at: r.utc);
      r.add('future', at: r.utc.add(const Duration(microseconds: 1)));
      r.add('a-tie');
      r.add('b-tie');
      final date = r.utc.toIso8601String().substring(0, 10);
      final today = r.checkIns.records.values
          .where(
            (record) => record.createdAt.toIso8601String().startsWith(date),
          )
          .toList();
      r.checkIns.pages['$date|'] = Success(
        CheckInHistoryPage(checkIns: today, nextCursor: 'opaque-next'),
      );
      r.checkIns.pages['2026-10-24|'] = const Failure(
        AppFailure(
          kind: AppFailureKind.serviceUnavailable,
          message: 'not empty',
        ),
      );
      await r.sources.loadRecent();
      expect(r.checkIns.dateReads.length, 8);
      expect(
        r.checkIns.dateReads.every(
          (query) => query.zone == 'UTC' && query.cursor == null,
        ),
        isTrue,
      );
      expect(r.sourceState.records.map((record) => record.id), [
        'at-now',
        'a-tie',
        'b-tie',
        'boundary',
      ]);
      expect(r.sourceState.failedDates, contains('2026-10-24'));
      r.checkIns.pages['$date|opaque-next'] = const Failure(
        AppFailure(
          kind: AppFailureKind.serviceUnavailable,
          message: 'private cursor error',
        ),
      );
      await r.sources.loadMore(date);
      expect(r.sourceState.cursors[date], 'opaque-next');
      expect(r.sourceState.records.map((record) => record.id), [
        'at-now',
        'a-tie',
        'b-tie',
        'boundary',
      ]);
      expect(r.sourceState.notice, AiSelectionNotice.unknown);
      expect(r.checkIns.dateReads.last.cursor, 'opaque-next');
      r.checkIns.pages['$date|opaque-next'] = const Success(
        CheckInHistoryPage(checkIns: [], nextCursor: 'opaque-next'),
      );
      await r.sources.loadMore(date);
      expect(r.sourceState.failedDates, contains(date));
      expect(r.sourceState.cursors[date], 'opaque-next');
      expect(r.repo.selectedPrepares, isEmpty);
      r.dispose();
      await tester.pump();
    },
  );

  testWidgets(
    'expiry drops preparation keys and confirmation; stale Send cannot execute; fresh review needs confirmation',
    (tester) async {
      final r = await SelectedRig.create(tester);
      r.add('record');
      await r.sources.chooseOwned('record');
      await r.sources.review();
      r.sources.confirm(r.sourceState.review!.selectionRevision);
      final oldRevision = r.sourceState.review!.selectionRevision;
      r.ai.updateDraft(
        const TextEditingValue(text: 'Keep my draft'),
        sessionKey: r.aiState.sessionKey,
      );
      await r.advance(tester, const Duration(seconds: 15));
      expect(r.sourceState.review, isNull);
      expect(r.sourceState.confirmed, isFalse);
      expect(r.aiState.selectedPreparationRevision, isNull);
      expect(r.ai.hasSelectedPreparation(oldRevision), isFalse);
      await r.ai.sendSelected(
        'Keep my draft',
        selectionRevision: oldRevision,
        sourceIds: ['record'],
        excludedHistoryKeys: [],
      );
      expect(r.repo.selectedExecutes, isEmpty);
      expect(r.ai.draft.text, 'Keep my draft');
      expect(r.sourceState.selectedIds, {'record'});
      await r.sources.review();
      expect(r.sourceState.review!.selectionRevision, isNot(oldRevision));
      expect(r.sources.canSend, isFalse);
      await r.sources.send('Keep my draft');
      expect(r.repo.selectedExecutes, isEmpty);
      r.sources.confirm(r.sourceState.review!.selectionRevision);
      await r.sources.send('Keep my draft');
      expect(r.repo.selectedExecutes.single.included, ['source-key-2-0']);
      r.dispose();
      await tester.pump();
    },
  );

  testWidgets(
    'background and source mutation retain choices and draft but hide records and retire review without automatic reads',
    (tester) async {
      final r = await SelectedRig.create(tester);
      r.add('record');
      await r.sources.chooseOwned('record');
      await r.sources.review();
      r.sources.confirm(r.sourceState.review!.selectionRevision);
      r.ai.updateDraft(
        const TextEditingValue(text: 'My unsent text'),
        sessionKey: r.aiState.sessionKey,
      );
      final reads = r.checkIns.ownReads.length;
      r.container.read(contentAccessProvider.notifier).setForeground(false);
      await tester.pump();
      expect(r.sourceState.records, isEmpty);
      expect(r.sourceState.review, isNull);
      expect(r.sourceState.selectedIds, {'record'});
      expect(r.ai.draft.text, 'My unsent text');
      r.container.read(contentAccessProvider.notifier).setForeground(true);
      await tester.pump();
      expect(r.sourceState.records, isEmpty);
      expect(r.checkIns.ownReads.length, reads);
      await r.sources.review();
      r.sources.confirm(r.sourceState.review!.selectionRevision);
      r.container.read(contentAccessProvider.notifier).changed();
      await tester.pump();
      expect(r.sourceState.review, isNull);
      expect(r.sources.canSend, isFalse);
      expect(r.sourceState.records, isEmpty);
      expect(r.sourceState.selectedIds, {'record'});
      r.dispose();
      await tester.pump();
    },
  );

  testWidgets(
    'consent withdrawal and same-UID replacement clear all selection data; late prepare cannot restore it',
    (tester) async {
      final r = await SelectedRig.create(tester);
      r.add('record');
      await r.sources.chooseOwned('record');
      final pending = Completer<Result<AiSelectedReplyTicket>>();
      r.repo.nextPrepare = pending.future;
      final preparing = r.sources.review();
      await tester.pump();
      expect(r.repo.selectedPrepares, hasLength(1));
      final request = r.repo.selectedPrepares.single.abort;
      r.auth.sessions.add(AuthSessionAuthenticated(subject: 'selected-owner'));
      await tester.pump();
      expect(request.isAborted, isTrue);
      pending.complete(const Failure(selectedUnknown));
      await preparing;
      expect(r.sourceState.selectedIds, isEmpty);
      expect(r.sourceState.review, isNull);
      expect(r.repo.selectedExecutes, isEmpty);
      r.container
          .read(accountSettingsSnapshotProvider.notifier)
          .observe(
            const OwnSettings(
              checkInVisibility: CheckInVisibility.private,
              consent: OptionalProcessingConsent.accepted,
              revision: 2,
            ),
          );
      r.repo.nextPrepare = null;
      await tester.pump();
      await r.sources.chooseOwned('record');
      await r.sources.review();
      r.container
          .read(accountSettingsSnapshotProvider.notifier)
          .observe(
            const OwnSettings(
              checkInVisibility: CheckInVisibility.private,
              consent: OptionalProcessingConsent.rejected,
              revision: 3,
            ),
          );
      await tester.pump();
      expect(r.sourceState.selectedIds, isEmpty);
      expect(r.sourceState.records, isEmpty);
      expect(r.aiState.selectedPreparationRevision, isNull);
      r.dispose();
      await tester.pump();
    },
  );

  testWidgets(
    'source edit during prepare invalidates review; unknown owned read hides body and preserves exact choice',
    (tester) async {
      final r = await SelectedRig.create(tester);
      r.add('record');
      await r.sources.chooseOwned('record');
      r.repo.onPrepare = () =>
          r.add('record', note: 'Edited current quotation', revision: 2);
      await r.sources.review();
      expect(r.sourceState.review, isNull);
      expect(r.sourceState.notice, AiSelectionNotice.changed);
      expect(r.sourceState.records.single.note, 'Edited current quotation');
      expect(r.repo.selectedExecutes, isEmpty);
      r.repo.onPrepare = null;
      await r.sources.review();
      r.sources.confirm(r.sourceState.review!.selectionRevision);
      r.checkIns.ownedResults['record'] = Future.value(
        const Failure(
          AppFailure(
            kind: AppFailureKind.serviceUnavailable,
            message: 'private read failed',
          ),
        ),
      );
      await r.sources.review();
      expect(r.sourceState.review, isNull);
      expect(r.sourceState.records, isEmpty);
      expect(r.sourceState.selectedIds, {'record'});
      expect(r.sourceState.notice, AiSelectionNotice.unknown);
      expect(r.sources.canSend, isFalse);
      r.dispose();
      await tester.pump();
    },
  );

  testWidgets(
    'history exclusion re-prepares exact pair identities with fresh keys; changed pair set is not silently excluded',
    (tester) async {
      final r = await SelectedRig.create(tester, existingTopic: true);
      r.repo.pairs = (n) => [_pair(n)];
      await r.sources.review();
      expect(r.sourceState.excludedHistoryKeys, isEmpty);
      await r.sources.review(excludeDisplayedHistory: true);
      expect(r.sourceState.excludedHistoryKeys, {'history-2'});
      expect(r.sourceState.confirmed, isFalse);
      expect(r.repo.selectedExecutes, isEmpty);
      r.sources.confirm(r.sourceState.review!.selectionRevision);
      await r.sources.send('Explicitly omit those exchanges');
      expect(r.repo.selectedExecutes.single.history, ['history-2']);
      expect(
        r.repo.selectedExecutes.single.history,
        isNot(contains('history-1')),
      );
      await r.sources.review();
      r.repo.pairs = (n) => [_pair(n, assistant: 'new-assistant', sequence: 9)];
      await r.sources.review(excludeDisplayedHistory: true);
      expect(r.sourceState.excludedHistoryKeys, isEmpty);
      expect(r.sourceState.notice, AiSelectionNotice.pastPairsChanged);
      expect(r.sourceState.confirmed, isFalse);
      expect(r.repo.selectedExecutes, hasLength(1));
      r.dispose();
      await tester.pump();
    },
  );

  testWidgets(
    'execute conflict after saved U stays fenced until readback; selected retry uses original U and never ordinary send',
    (tester) async {
      final r = await SelectedRig.create(tester);
      r.add('record');
      await r.sources.chooseOwned('record');
      const text = 'Keep the exact original user input';
      r.ai.updateDraft(
        const TextEditingValue(text: text),
        sessionKey: r.aiState.sessionKey,
      );
      await r.sources.review();
      r.sources.confirm(r.sourceState.review!.selectionRevision);
      r.repo.nextExecute = Future.value(const Failure(selectedConflict));
      await r.sources.send(text);
      expect(r.aiState.canSend, isFalse);
      expect(r.aiState.canRetry, isFalse);
      expect(r.aiState.canCheckResult, isTrue);
      expect(r.aiState.failureKind, AppFailureKind.aiContextSelectionConflict);
      expect(r.ai.draft.text, text);
      expect(r.sourceState.selectedIds, {'record'});
      expect(r.sourceState.notice, AiSelectionNotice.conflict);
      await r.sources.review();
      await r.sources.send(text);
      expect(r.repo.selectedPrepares, hasLength(1));
      expect(r.repo.selectedExecutes, hasLength(1));
      await r.ai.checkResult();
      expect(r.aiState.canSend, isFalse);
      expect(r.aiState.canRetry, isFalse);
      r.repo.nextReadback = Future.value(
        Success(
          AiReadback(
            operationId: 'operation-1',
            state: AiOutcomeState.userSaved,
            userMessage: r.repo.user(text, id: 'saved-original-U'),
          ),
        ),
      );
      await r.ai.checkResult();
      expect(r.aiState.canRetry, isTrue);
      expect(r.aiState.canSend, isFalse);
      await r.sources.review();
      expect(r.repo.selectedPrepares.last.user, 'saved-original-U');
      r.sources.confirm(r.sourceState.review!.selectionRevision);
      r.repo.nextExecute = null;
      await r.sources.send(text);
      expect(r.repo.selectedExecutes, hasLength(2));
      expect(
        r.aiState.messages
            .where((message) => message.role == AiRole.user)
            .single
            .messageId,
        'saved-original-U',
      );
      expect(r.repo.ordinaryPrepares, 0);
      expect(r.repo.ordinaryExecutes, 0);
      expect(r.ai.draft.text, isEmpty);
      expect(r.sourceState.selectedIds, isEmpty);
      r.dispose();
      await tester.pump();
    },
  );

  testWidgets(
    'unknown then authoritative no-effect preserves choices and draft for a new explicitly reviewed send',
    (tester) async {
      final r = await SelectedRig.create(tester);
      r.add('record');
      await r.sources.chooseOwned('record');
      r.ai.updateDraft(
        const TextEditingValue(text: 'No implicit resend'),
        sessionKey: r.aiState.sessionKey,
      );
      await r.sources.review();
      r.sources.confirm(r.sourceState.review!.selectionRevision);
      r.repo.nextExecute = Future.value(const Failure(selectedUnknown));
      await r.sources.send('No implicit resend');
      expect(r.sourceState.selectedIds, {'record'});
      expect(r.ai.draft.text, 'No implicit resend');
      r.repo.nextReadback = Future.value(
        const Success(
          AiReadback(
            operationId: 'operation-1',
            state: AiOutcomeState.noEffect,
          ),
        ),
      );
      await r.ai.checkResult();
      expect(r.sourceState.selectedIds, {'record'});
      expect(r.aiState.canSend, isTrue);
      expect(r.repo.selectedExecutes, hasLength(1));
      await r.sources.review();
      expect(r.repo.selectedPrepares.last.user, isNull);
      expect(r.sources.canSend, isFalse);
      r.sources.confirm(r.sourceState.review!.selectionRevision);
      r.repo.nextExecute = null;
      await r.sources.send('No implicit resend');
      expect(r.repo.selectedExecutes, hasLength(2));
      r.dispose();
      await tester.pump();
    },
  );

  testWidgets(
    'authoritative assistant-saved recovery clears only matching submitted draft and selected choices',
    (tester) async {
      final r = await SelectedRig.create(tester);
      r.add('record');
      await r.sources.chooseOwned('record');
      r.ai.updateDraft(
        const TextEditingValue(text: 'Original input'),
        sessionKey: r.aiState.sessionKey,
      );
      await r.sources.review();
      r.sources.confirm(r.sourceState.review!.selectionRevision);
      r.repo.nextExecute = Future.value(const Failure(selectedUnknown));
      await r.sources.send('Original input');
      r.repo.nextReadback = Future.value(
        Success(
          AiReadback(
            operationId: 'operation-1',
            state: AiOutcomeState.assistantSaved,
            userMessage: r.repo.user('Original input'),
            assistantMessage: AiMessage(
              messageId: 'accepted-assistant',
              sequence: 2,
              role: AiRole.assistant,
              persistedAt: r.utc,
              availability: AiAvailability.available,
              text: 'Accepted result',
            ),
          ),
        ),
      );
      await r.ai.checkResult();
      await tester.pump();
      expect(r.aiState.phase, AiConversationPhase.success);
      expect(r.ai.draft.text, isEmpty);
      expect(r.sourceState.selectedIds, isEmpty);
      expect(r.repo.selectedExecutes, hasLength(1));
      r.dispose();
      await tester.pump();
    },
  );
}

AiPreparedHistoryPair _pair(
  int n, {
  String assistant = 'past-assistant',
  int sequence = 4,
}) => AiPreparedHistoryPair(
  historyKey: 'history-$n',
  userMessageId: 'past-user',
  assistantMessageId: assistant,
  userSequence: 3,
  assistantSequence: sequence,
);
