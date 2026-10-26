import 'package:enmori/features/ai_conversation/presentation/ai_conversation_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../test/features/ai_conversation/ai_selected_test_support.dart';

// Independent QA reproduction against the unmodified 087281e baseline.
// Fake repositories only. No model, provider, service, or native operation.
void main() {
  testWidgets('QA: ordinary chat remains sendable after visiting references', (
    tester,
  ) async {
    await _withDraft(tester, (rig) async {
      expect(_send(tester).onPressed, isNotNull);
      await _tap(tester, 'ai-references');
      await tester.pageBack();
      await tester.pumpAndSettle();

      expect(rig.sourceState.selectedIds, isEmpty);
      expect(rig.aiState.canSend, isTrue);
      expect(_send(tester).onPressed, isNotNull);
      _expectDraftAndNoSend(tester, rig);
    });
  });

  testWidgets('QA: removing the last reference must allow ordinary chat', (
    tester,
  ) async {
    await _withDraft(tester, (rig) async {
      await _tap(tester, 'ai-references');
      await _tap(tester, 'ai-select-owned');
      expect(rig.sourceState.selectedIds, {'owned'});
      await _tap(tester, 'ai-select-owned');
      expect(rig.sourceState.selectedIds, isEmpty);
      await tester.pageBack();
      await tester.pumpAndSettle();

      expect(rig.aiState.canSend, isTrue);
      _expectDraftAndNoSend(tester, rig);
      expect(
        _send(tester).onPressed,
        isNotNull,
        reason: 'No selected sources or unresolved operation remain. Ordinary '
            'chat must not require a zero-source review to unblock Send.',
      );
    });
  });

  testWidgets('QA: cancelling an empty review must allow ordinary chat', (
    tester,
  ) async {
    await _withDraft(tester, (rig) async {
      await _tap(tester, 'ai-references');
      await _tap(tester, 'ai-selected-review');
      expect(rig.repo.selectedPrepares, hasLength(1));
      await _tap(tester, 'ai-review-cancel');
      await tester.pageBack();
      await tester.pumpAndSettle();

      expect(rig.sourceState.selectedIds, isEmpty);
      expect(rig.aiState.canSend, isTrue);
      _expectDraftAndNoSend(tester, rig);
      expect(
        _send(tester).onPressed,
        isNotNull,
        reason: 'Cancelling a review with no selected sources must not require '
            'another review to regain ordinary chat.',
      );
    });
  });
}

const _draft = 'Keep this ordinary question';

Future<void> _withDraft(
  WidgetTester tester,
  Future<void> Function(SelectedRig rig) body,
) async {
  final rig = await SelectedRig.create(tester);
  try {
    rig.add('owned');
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: rig.container,
        child: MaterialApp(
          locale: const Locale('en'),
          supportedLocales: const [Locale('en'), Locale('zh')],
          localizationsDelegates: GlobalMaterialLocalizations.delegates,
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context).copyWith(disableAnimations: true),
            child: child!,
          ),
          home: AiConversationPage(
            socialStyle: true,
            onBack: () {},
            onOpenSettings: () {},
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('ai-message-input')), _draft);
    await tester.pump();
    await body(rig);
  } finally {
    await tester.pumpWidget(const SizedBox.shrink());
    rig.dispose();
    await tester.pump();
  }
}

FilledButton _send(WidgetTester tester) =>
    tester.widget<FilledButton>(find.byKey(const Key('ai-send')));

void _expectDraftAndNoSend(WidgetTester tester, SelectedRig rig) {
  expect(
    tester
        .widget<TextField>(find.byKey(const Key('ai-message-input')))
        .controller!
        .text,
    _draft,
  );
  expect(rig.ai.draft.text, _draft);
  expect(rig.repo.selectedExecutes, isEmpty);
  expect(rig.repo.ordinaryExecutes, 0);
  expect(rig.repo.ordinaryPrepares, 0);
}

Future<void> _tap(WidgetTester tester, String key) async {
  final target = find.byKey(Key(key));
  if (target.evaluate().isEmpty) {
    tester
        .state<ScrollableState>(find.byType(Scrollable).first)
        .position
        .jumpTo(0);
    await tester.pumpAndSettle();
  }
  for (var attempt = 0; attempt < 35 && target.evaluate().isEmpty; attempt++) {
    await tester.drag(find.byType(Scrollable).first, const Offset(0, -280));
    await tester.pumpAndSettle();
  }
  expect(target, findsOneWidget);
  await tester.ensureVisible(target);
  await tester.pumpAndSettle();
  expect(target.hitTestable(), findsOneWidget);
  await tester.tap(target);
  await tester.pumpAndSettle();
}
