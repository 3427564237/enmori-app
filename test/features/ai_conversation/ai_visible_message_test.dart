import 'package:enmori/features/ai_conversation/presentation/ai_visible_message.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets(
    'zero opacity layout is not a visible body; completed fade can be observed',
    (tester) async {
      var visible = 0;
      final opacity = AnimationController(
        vsync: tester,
        duration: const Duration(milliseconds: 200),
      );
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ListView(
              children: [
                FadeTransition(
                  opacity: opacity,
                  child: AiVisibleMessage(
                    onVisible: () => visible++,
                    child: const Text(
                      'A committed message body\nTwo visible lines',
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
      expect(visible, 0);
      opacity.forward();
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      expect(visible, 0);
      await tester.pumpAndSettle();
      expect(visible, greaterThan(0));
      await tester.pumpWidget(const SizedBox());
      opacity.dispose();
    },
  );
  testWidgets(
    'offstage or zero-opacity child cannot turn retained geometry into reading',
    (tester) async {
      var visible = 0;
      Future<void> show(bool offstage, double opacity) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: ListView(
                children: [
                  Offstage(
                    offstage: offstage,
                    child: Opacity(
                      opacity: opacity,
                      child: AiVisibleMessage(
                        onVisible: () => visible++,
                        child: const Text('A committed body\nMore text'),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
        await tester.pump();
      }

      await show(true, 1);
      expect(visible, 0);
      await show(false, 0);
      expect(visible, 0);
      await show(false, 1);
      expect(visible, greaterThan(0));
    },
  );
}
