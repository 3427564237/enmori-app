import 'package:enmori/harness/social/offline_social_pages.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  for (final size in [const Size(320, 480), const Size(640, 320)]) {
    testWidgets(
      'offline entry keeps the action reachable at $size and 2x text',
      (tester) async {
        tester.view.physicalSize = size;
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        var entered = false;
        await tester.pumpWidget(
          MaterialApp(
            builder: (context, child) => MediaQuery(
              data: MediaQuery.of(context).copyWith(
                textScaler: const TextScaler.linear(2),
                disableAnimations: true,
              ),
              child: child!,
            ),
            home: OfflineEntry(onEnter: () => entered = true),
          ),
        );
        await tester.pumpAndSettle();

        expect(tester.takeException(), isNull);
        expect(
          find.text(
            'A synthetic sample account. No email, password or Firebase connection is used.',
          ),
          findsOneWidget,
        );
        final action = find.byKey(const Key('offline-enter'));
        await tester.ensureVisible(action);
        await tester.pumpAndSettle();
        expect(action.hitTestable(), findsOneWidget);
        await tester.tap(action);
        expect(entered, isTrue);
        expect(tester.takeException(), isNull);
      },
    );
  }
}
