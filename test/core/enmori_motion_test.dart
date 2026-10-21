import 'package:enmori/app/enmori_theme.dart';
import 'package:enmori/core/presentation/enmori_motion.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('rapid retarget and live reduced motion preserve focused input', (
    tester,
  ) async {
    final input = TextEditingController();
    final focus = FocusNode();
    addTearDown(input.dispose);
    addTearDown(focus.dispose);
    var reduced = false;
    var revision = 0;
    late StateSetter update;
    await tester.pumpWidget(
      MaterialApp(
        home: StatefulBuilder(
          builder: (context, setState) {
            update = setState;
            return MediaQuery(
              data: MediaQuery.of(context).copyWith(disableAnimations: reduced),
              child: Scaffold(
                body: MotionReveal(
                  trigger: revision,
                  child: Column(
                    children: [
                      Text('Current $revision'),
                      TextField(controller: input, focusNode: focus),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
    await tester.tap(find.byType(TextField));
    await tester.enterText(find.byType(TextField), 'keep this draft');
    update(() => revision++);
    await tester.pump(const Duration(milliseconds: 40));
    update(() => revision++);
    await tester.pump(const Duration(milliseconds: 20));
    expect(find.text('Current 1'), findsNothing);
    expect(find.text('Current 2'), findsOneWidget);
    expect(focus.hasFocus, isTrue);
    expect(input.text, 'keep this draft');
    update(() => reduced = true);
    await tester.pump();
    final opacity = tester.widget<Opacity>(
      find
          .descendant(
            of: find.byType(MotionReveal),
            matching: find.byType(Opacity),
          )
          .first,
    );
    expect(opacity.opacity, 1);
    expect(focus.hasFocus, isTrue);
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump();
    expect(tester.takeException(), isNull);
  });

  for (final platform in [TargetPlatform.android, TargetPlatform.iOS]) {
    for (final reduced in [false, true]) {
      testWidgets('$platform reduced=$reduced keeps route result and timing', (
        tester,
      ) async {
        int? result;
        await tester.pumpWidget(
          MaterialApp(
            theme: enmoriTheme().copyWith(platform: platform),
            builder: (context, child) => MediaQuery(
              data: MediaQuery.of(context).copyWith(disableAnimations: reduced),
              child: EnmoriMotionPreferences(child: child!),
            ),
            home: Builder(
              builder: (context) => Scaffold(
                body: FilledButton(
                  onPressed: () async {
                    result = await Navigator.of(context).push<int>(
                      MaterialPageRoute(
                        builder: (context) => Scaffold(
                          body: FilledButton(
                            onPressed: () => Navigator.pop(context, 7),
                            child: const Text('Back'),
                          ),
                        ),
                      ),
                    );
                  },
                  child: const Text('Open'),
                ),
              ),
            ),
          ),
        );
        await tester.tap(find.text('Open'));
        await tester.pumpAndSettle();
        final context = tester.element(find.text('Back'));
        final route = ModalRoute.of(context)!;
        expect(
          route.transitionDuration,
          reduced ? Duration.zero : EnmoriMotion.navigation,
        );
        expect(
          Theme.of(context).filledButtonTheme.style!.animationDuration,
          reduced ? Duration.zero : EnmoriMotion.feedback,
        );
        await tester.tap(find.text('Back'));
        await tester.pumpAndSettle();
        expect(result, 7);
        expect(tester.takeException(), isNull);
      });
    }
  }
}
