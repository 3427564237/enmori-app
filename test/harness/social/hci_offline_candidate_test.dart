import '../../support/ai_menu.dart';

import 'package:enmori/app/providers.dart';
import 'package:enmori/hci_offline_harness.dart' as entry;
import 'package:enmori/harness/social/offline_social_app.dart';
import 'package:enmori/harness/social/offline_social_pages.dart';
import 'package:enmori/harness/social/offline_social_store.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

Future<void> tap(WidgetTester tester, String key) async {
  tester.testTextInput.hide();
  await tester.pumpAndSettle();
  await revealAiMenuAction(tester, key);
  final finder = find.byKey(Key(key));
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  expect(finder.hitTestable(), findsOneWidget, reason: key);
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('actual HCI entry reaches Retry through memory-only readback', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    entry.main();
    await tester.pumpAndSettle();
    final container = ProviderScope.containerOf(
      tester.element(find.byType(OfflineSocialHub)),
    );
    expect(container.read(backendBaseUriProvider), isNull);
    expect(
      find.text('HCI FIXTURE · AI/Persona in memory · no model'),
      findsOneWidget,
    );
    await tap(tester, 'social-nav-ai');
    const message = 'One\nTwo\nThree\nFour';
    await tester.enterText(find.byKey(const Key('ai-message-input')), message);
    await tap(tester, 'ai-send');
    await tester.pump(const Duration(seconds: 1));
    await tester.pumpAndSettle();
    await tap(tester, 'ai-conversation-actions');
    await tap(tester, 'ai-check-result-menu');
    expect(find.byKey(const Key('ai-retry')), findsOneWidget);
    expect(find.text(message), findsWidgets);
    expect(
      find.textContaining('Synthetic reply for client testing.'),
      findsNothing,
    );
    // Explicit Retry stays in the same in-memory fixture; no successful-model
    // output is fabricated, and no new endpoint can be selected by this entry.
    await tap(tester, 'ai-retry');
    await tester.pump(const Duration(seconds: 1));
    await tester.pumpAndSettle();
    await tap(tester, 'ai-conversation-actions');
    await tap(tester, 'ai-check-result-menu');
    expect(find.byKey(const Key('ai-retry')), findsOneWidget);
    expect(
      find.textContaining('Synthetic reply for client testing.'),
      findsNothing,
    );
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets(
    'HCI Persona invalid save creates nothing; valid edits stay local',
    (tester) async {
      final store = OfflineSocialStore();
      addTearDown(store.dispose);
      await tester.pumpWidget(
        OfflineSocialApp(store: store, hciRetryFixture: true),
      );
      await tester.pumpAndSettle();
      final before = store.personas.length;
      await tap(tester, 'social-nav-ai');
      await tap(tester, 'ai-personas');
      await tap(tester, 'persona-create');
      await tap(tester, 'persona-save');
      expect(store.personas, hasLength(before));
      final name = find.byKey(const Key('persona-name'));
      final editor = find.descendant(
        of: name,
        matching: find.byType(EditableText),
      );
      expect(tester.widget<EditableText>(editor).focusNode.hasFocus, isTrue);
      await tester.enterText(name, 'HCI sample');
      await tap(tester, 'persona-save');
      expect(store.personas, hasLength(before + 1));
      expect(store.personas.last.fields.displayName, 'HCI sample');
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
}
