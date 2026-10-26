import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/ai_conversation/ai_conversation_providers.dart';
import 'package:enmori/features/ai_conversation/ai_selected_sources_providers.dart';
import 'package:enmori/features/ai_conversation/domain/ai_selected_reply.dart';
import 'package:enmori/features/ai_conversation/presentation/ai_conversation_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'ai_selected_test_support.dart';

void main() {
  testWidgets(
    'default today permits Chinese composing Send without manual selection or client source reads',
    (tester) async {
      final repo = _TodayRepository();
      final r = await _rig(tester, repo);
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
      final input = find.byKey(const Key('ai-message-input'));
      await tester.ensureVisible(input);
      await tester.showKeyboard(input);
      const value = TextEditingValue(
        text: '今天想聊一聊',
        selection: TextSelection.collapsed(offset: 6),
        composing: TextRange(start: 0, end: 6),
      );
      tester.testTextInput.updateEditingValue(value);
      await tester.pump();
      expect(r.sourceState.mode, AiReferenceMode.today);
      expect(r.sourceState.selectedIds, isEmpty);
      final send = find.byKey(const Key('ai-send'));
      expect(tester.widget<FilledButton>(send).onPressed, isNotNull);
      await tester.ensureVisible(send);
      await tester.tap(send);
      await tester.pumpAndSettle();
      expect(repo.zones, ['Asia/Singapore']);
      expect(repo.selectedExecutes, hasLength(1));
      expect(repo.ordinaryPrepares, 0);
      expect(r.checkIns.ownReads, isEmpty);
      expect(r.checkIns.dateReads, isEmpty);
      await tester.pumpWidget(const SizedBox.shrink());
      r.dispose();
      await tester.pump();
    },
  );

  testWidgets(
    'preview exclusion survives fresh Send keys without filling a sixth record',
    (tester) async {
      final repo = _TodayRepository()
        ..ids = List.generate(5, (i) => 'record-$i')
        ..hasMore = true;
      final r = await _rig(tester, repo);
      for (final id in repo.ids) {
        r.add(id);
      }
      await r.sources.previewToday();
      expect(r.sourceState.today!.hasMore, isTrue);
      expect(r.checkIns.ownReads, repo.ids);
      expect(repo.selectedExecutes, isEmpty);
      final oldKey = r.sourceState.review!.sourceCards.first.selectionKey;
      r.sources.toggleTodaySource('record-0');
      await r.sources.submit('Use the rest');
      expect(repo.zones, hasLength(2));
      expect(repo.selectedExecutes.single.excluded, ['source-key-2-0']);
      expect(repo.selectedExecutes.single.included, hasLength(4));
      expect(repo.selectedExecutes.single.excluded, isNot(contains(oldKey)));
      expect(r.checkIns.ownReads, hasLength(5));
      expect(r.sourceState.excludedCheckInIds, {'record-0'});
      expect(r.sourceState.mode, AiReferenceMode.today);
      r.ai.startNewConversation();
      expect(r.sourceState.excludedCheckInIds, isEmpty);
      r.dispose();
      await tester.pump();
    },
  );

  testWidgets(
    'topic off sends explicit zero sources and persists through success until new topic',
    (tester) async {
      final repo = _TodayRepository();
      final r = await _rig(tester, repo);
      r.sources.setTodayEnabled(false);
      await r.sources.submit('An ordinary question');
      expect(repo.zones, isEmpty);
      expect(repo.selectedPrepares.single.ids, isEmpty);
      expect(repo.selectedExecutes.single.included, isEmpty);
      expect(r.sourceState.mode, AiReferenceMode.off);
      expect(r.sourceState.active, isTrue);
      r.ai.startNewConversation();
      expect(r.sourceState.mode, AiReferenceMode.today);
      r.dispose();
      await tester.pump();
    },
  );

  testWidgets(
    'unknown device day preserves draft and never becomes empty or legacy send',
    (tester) async {
      final repo = _TodayRepository();
      final r = await SelectedRig.create(
        tester,
        repository: repo,
        today: true,
        timeZone: () async => const Failure(selectedUnknown),
      );
      r.ai.updateDraft(
        const TextEditingValue(text: 'Keep my draft'),
        sessionKey: r.aiState.sessionKey,
      );
      await r.sources.submit('Keep my draft');
      expect(r.sourceState.notice, AiSelectionNotice.unknown);
      expect(r.sourceState.today, isNull);
      expect(r.ai.draft.text, 'Keep my draft');
      expect(repo.selectedPrepares, isEmpty);
      expect(repo.selectedExecutes, isEmpty);
      expect(repo.ordinaryPrepares, 0);
      r.dispose();
      await tester.pump();
    },
  );

  testWidgets(
    'today execute conflict keeps original-operation readback before another send',
    (tester) async {
      final repo = _TodayRepository()
        ..nextExecute = Future.value(const Failure(selectedConflict));
      final r = await _rig(tester, repo);
      r.ai.updateDraft(
        const TextEditingValue(text: 'One original input'),
        sessionKey: r.aiState.sessionKey,
      );
      await r.sources.submit('One original input');
      await r.sources.submit('One original input');
      expect(repo.zones, hasLength(1));
      expect(repo.selectedExecutes, hasLength(1));
      expect(r.aiState.canCheckResult, isTrue);
      await r.ai.checkResult();
      expect(repo.operationReads, 1);
      expect(repo.selectedExecutes, hasLength(1));
      expect(r.ai.draft.text, 'One original input');
      r.dispose();
      await tester.pump();
    },
  );
}

Future<SelectedRig> _rig(WidgetTester tester, _TodayRepository repo) =>
    SelectedRig.create(
      tester,
      repository: repo,
      today: true,
      timeZone: () async => const Success('Asia/Singapore'),
    );

final class _TodayRepository extends SelectedAiRepository
    implements AiTodayReplyRepository {
  _TodayRepository() : super(() => selectedNow);
  List<String> ids = ['record'];
  bool hasMore = false;
  final zones = <String>[];
  @override
  Future<Result<AiSelectedReplyTicket>> prepareToday({
    required String token,
    required AiAbortSignal abort,
    required String timeZone,
    String? conversationId,
    String? userMessageId,
  }) async {
    zones.add(timeZone);
    final result = await super.prepareSelected(
      token: token,
      abort: abort,
      sourceIds: ids,
      conversationId: conversationId,
      userMessageId: userMessageId,
    );
    if (result case Failure<AiSelectedReplyTicket>()) return result;
    final ticket = (result as Success<AiSelectedReplyTicket>).value;
    final selection = ticket.selection;
    return Success(
      AiSelectedReplyTicket(
        operation: ticket.operation,
        selection: AiPreparedReplySelection(
          selectionRevision: selection.selectionRevision,
          expiresAt: selection.expiresAt,
          historyPairs: selection.historyPairs,
          today: AiTodayContext(
            date: '2026-10-25',
            timeZone: timeZone,
            hasMore: hasMore,
          ),
          sourceCards: [
            for (var i = 0; i < selection.sourceCards.length; i++)
              AiSelectedSourceCard(
                selectionKey: selection.sourceCards[i].selectionKey,
                card: selection.sourceCards[i].card,
                checkInId: ids[i],
              ),
          ],
        ),
      ),
    );
  }
}
