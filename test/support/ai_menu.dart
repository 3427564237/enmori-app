import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// Follow the visible menu route in the social layout; compact layouts expose
/// the same actions directly in their app bar.
Future<void> revealAiMenuAction(WidgetTester tester, String key) async {
  if ((key == 'ai-reload-messages' || key == 'ai-check-result-menu') &&
      find.byKey(const Key('ai-conversation-actions')).evaluate().isNotEmpty &&
      find.byKey(Key(key)).evaluate().isEmpty) {
    await tester.tap(find.byKey(const Key('ai-conversation-actions')));
    await pumpAiUi(tester);
    return;
  }
  if (key != 'ai-personas' && key != 'ai-settings') return;
  final menu = find.byTooltip('Open conversation menu');
  if (menu.hitTestable().evaluate().isEmpty) return;
  await tester.tap(menu);
  await pumpAiUi(tester);
  final target = find.byKey(Key(key));
  if (target.evaluate().isEmpty) {
    await tester.scrollUntilVisible(
      target,
      100,
      scrollable: find
          .descendant(
            of: find.byType(Drawer),
            matching: find.byType(Scrollable),
          )
          .first,
    );
  }
  await tester.ensureVisible(target);
  await pumpAiUi(tester);
}

/// Typing animations intentionally remain active while a reply is pending.
/// Waiting for all frames to settle would advance fake time to the timeout.
Future<void> pumpAiUi(WidgetTester tester) async {
  for (var i = 0; i < 5; i++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}
