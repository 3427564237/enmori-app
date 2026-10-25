import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/ai_conversation/ai_conversation_providers.dart';
import 'package:enmori/features/ai_conversation/domain/ai_selected_reply.dart';
import 'package:enmori/features/ai_conversation/presentation/ai_conversation_page.dart';
import 'package:enmori/features/ai_conversation/presentation/ai_selected_sources_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'ai_selected_test_support.dart';

void main() {
  testWidgets(
    'explicit Send preserves history exclusions across ticket expiry using only fresh keys',
    (tester) async {
      final r = await SelectedRig.create(tester);
      r.repo.pairs = (n) => [_pair(n)];
      await r.sources.review();
      await r.sources.review(
        excludeDisplayedHistory: true,
        expectedRevision: r.sourceState.review!.selectionRevision,
      );
      final oldKey = r.sourceState.excludedHistoryKeys.single;
      await r.advance(tester, const Duration(seconds: 15));
      r.ai.updateDraft(
        const TextEditingValue(text: 'Keep the exclusions'),
        sessionKey: r.aiState.sessionKey,
      );
      await r.sources.submit('Keep the exclusions');
      expect(r.repo.selectedPrepares, hasLength(3));
      expect(r.repo.selectedExecutes.single.history, ['history-3']);
      expect(r.repo.selectedExecutes.single.history, isNot(contains(oldKey)));
      expect(r.repo.ordinaryPrepares, 0);
      r.dispose();
      await tester.pump();
    },
  );

  testWidgets(
    'changed excluded pair identities keep the draft until the actual current set is reviewed',
    (tester) async {
      final r = await SelectedRig.create(tester);
      r.repo.pairs = (n) => [_pair(n)];
      await r.sources.review();
      await r.sources.review(
        excludeDisplayedHistory: true,
        expectedRevision: r.sourceState.review!.selectionRevision,
      );
      await r.advance(tester, const Duration(seconds: 15));
      r.repo.pairs = (n) => [_pair(n, assistant: 'new-unseen-assistant')];
      r.ai.updateDraft(
        const TextEditingValue(text: 'Retain current draft'),
        sessionKey: r.aiState.sessionKey,
      );
      await r.sources.submit('Retain current draft');
      expect(r.repo.selectedExecutes, isEmpty);
      expect(r.sourceState.confirmed, isFalse);
      expect(r.sourceState.excludedHistoryKeys, isEmpty);
      expect(r.ai.draft.text, 'Retain current draft');
      r.sources.confirm(r.sourceState.review!.selectionRevision);
      await r.sources.submit('Retain current draft');
      expect(r.repo.selectedExecutes, hasLength(1));
      expect(r.repo.ordinaryPrepares, 0);
      r.dispose();
      await tester.pump();
    },
  );

  testWidgets(
    'explicit selected Send retains unknown and saved-user recovery without ordinary bypass',
    (tester) async {
      final r = await SelectedRig.create(tester);
      r.add('record');
      await r.sources.chooseOwned('record');
      r.ai.updateDraft(
        const TextEditingValue(text: 'One original user input'),
        sessionKey: r.aiState.sessionKey,
      );
      r.repo.nextExecute = Future.value(const Failure(selectedUnknown));
      await r.sources.submit('One original user input');
      await r.sources.submit('One original user input');
      expect(r.repo.selectedPrepares, hasLength(1));
      expect(r.repo.selectedExecutes, hasLength(1));
      r.repo.nextReadback = Future.value(
        Success(
          AiReadback(
            operationId: 'operation-1',
            state: AiOutcomeState.userSaved,
            userMessage: r.repo.user(
              'One original user input',
              id: 'original-U',
            ),
          ),
        ),
      );
      await r.ai.checkResult();
      r.repo.nextExecute = null;
      await r.sources.submit('Changed original input');
      expect(r.repo.selectedPrepares, hasLength(1));
      await r.sources.submit('One original user input');
      expect(r.repo.selectedPrepares.last.user, 'original-U');
      expect(r.repo.selectedExecutes, hasLength(2));
      expect(r.repo.ordinaryPrepares, 0);
      expect(
        r.aiState.messages.where((m) => m.role == AiRole.user).single.messageId,
        'original-U',
      );
      r.dispose();
      await tester.pump();
    },
  );

  testWidgets(
    'invalid selected draft performs no source or preparation requests',
    (tester) async {
      final r = await SelectedRig.create(tester);
      r.add('record');
      await r.sources.chooseOwned('record');
      final reads = r.checkIns.ownReads.length;
      await r.sources.submit('x' * 2401);
      expect(r.checkIns.ownReads.length, reads);
      expect(r.repo.selectedPrepares, isEmpty);
      expect(r.repo.ordinaryPrepares, 0);
      r.dispose();
      await tester.pump();
    },
  );
  for (final social in [false, true]) {
    testWidgets(
      'ordinary IME input enables Send without selecting a Check-in (social=$social)',
      (tester) async {
        final r = await SelectedRig.create(tester);
        await _pump(tester, r, social: social);
        final input = find.byKey(const Key('ai-message-input'));
        expect(_send(tester).onPressed, isNull);
        await tester.ensureVisible(input);
        await tester.showKeyboard(input);
        const value = TextEditingValue(
          text: '今天想聊一聊',
          selection: TextSelection.collapsed(offset: 6),
          composing: TextRange(start: 0, end: 6),
        );
        tester.testTextInput.updateEditingValue(value);
        await tester.pump();
        expect(r.ai.draft, value);
        expect(r.aiState.canSend, isTrue);
        expect(r.sourceState.active, isFalse);
        expect(r.sourceState.selectedIds, isEmpty);
        expect(_send(tester).onPressed, isNotNull);
        expect(r.repo.selectedPrepares, isEmpty);
        expect(r.checkIns.ownReads, isEmpty);
        await tester.ensureVisible(find.byKey(const Key('ai-send')));
        await tester.tap(find.byKey(const Key('ai-send')));
        await tester.pumpAndSettle();
        expect(r.repo.ordinaryPrepares, 1);
        expect(r.repo.selectedPrepares, isEmpty);
        await _dispose(tester, r);
      },
    );
  }

  testWidgets(
    'returning from a chosen reference should allow the explicit Send action without a separate preparation ceremony',
    (tester) async {
      final r = await SelectedRig.create(tester);
      r.add('record');
      await _pump(tester, r, social: true);
      await tester.enterText(
        find.byKey(const Key('ai-message-input')),
        'Keep this ordinary question',
      );
      await tester.tap(find.byKey(const Key('ai-references')));
      await tester.pumpAndSettle();
      final checkbox = find.byKey(const Key('ai-select-record'));
      await tester.ensureVisible(checkbox);
      await tester.tap(checkbox);
      await tester.pumpAndSettle();
      expect(find.byType(AiSelectedSourcesPage), findsOneWidget);
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(r.aiState.canSend, isTrue);
      expect(r.ai.draft.text, 'Keep this ordinary question');
      expect(r.sourceState.selectedIds, {'record'});
      expect(_send(tester).onPressed, isNotNull);
      expect(r.repo.selectedPrepares, isEmpty);
      expect(r.repo.selectedExecutes, isEmpty);
      await tester.ensureVisible(find.byKey(const Key('ai-send')));
      await tester.tap(find.byKey(const Key('ai-send')));
      await tester.pumpAndSettle();
      expect(r.repo.selectedPrepares.single.ids, ['record']);
      expect(r.repo.selectedExecutes, hasLength(1));
      expect(r.repo.ordinaryPrepares, 0);
      await _dispose(tester, r);
    },
  );
}

AiPreparedHistoryPair _pair(int n, {String assistant = 'same-assistant'}) =>
    AiPreparedHistoryPair(
      historyKey: 'history-$n',
      userMessageId: 'same-user',
      assistantMessageId: assistant,
      userSequence: 1,
      assistantSequence: 2,
    );

FilledButton _send(WidgetTester tester) =>
    tester.widget<FilledButton>(find.byKey(const Key('ai-send')));
Future<void> _pump(
  WidgetTester tester,
  SelectedRig r, {
  required bool social,
}) async {
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: r.container,
      child: MaterialApp(
        home: AiConversationPage(
          onBack: () {},
          onOpenSettings: () {},
          socialStyle: social,
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> _dispose(WidgetTester tester, SelectedRig r) async {
  await tester.pumpWidget(const SizedBox.shrink());
  r.dispose();
  await tester.pump();
}
