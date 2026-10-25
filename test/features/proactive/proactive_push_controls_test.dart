import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/proactive/presentation/proactive_push_controls.dart';

import 'proactive_messaging_test_support.dart';

Future<void> show(WidgetTester tester, MessagingRig r, {double scale = 1}) =>
    tester.pumpWidget(
      UncontrolledProviderScope(
        container: r.container,
        child: MaterialApp(
          home: MediaQuery(
            data: MediaQueryData(textScaler: TextScaler.linear(scale)),
            child: const Scaffold(
              body: SingleChildScrollView(
                child: Padding(
                  padding: EdgeInsets.all(16),
                  child: ProactivePushControls(),
                ),
              ),
            ),
          ),
        ),
      ),
    );
void main() {
  testWidgets(
    'unconfigured installation is explicit and every SDK command stays disabled',
    (tester) async {
      final r = await MessagingRig.create(tester, configured: false);
      addTearDown(r.dispose);
      await show(tester, r);
      expect(
        find.textContaining('not configured for this installation'),
        findsOneWidget,
      );
      expect(
        tester.widget<FilledButton>(find.byType(FilledButton)).onPressed,
        isNull,
      );
      expect(r.sdk.calls, isEmpty);
      expect(r.registrations.reads, 0);
      expect(r.preferences.reads, 0);
    },
  );
  testWidgets(
    'enabled metadata is only displayed after the explicit button command',
    (tester) async {
      final r = await MessagingRig.create(tester);
      addTearDown(r.dispose);
      await show(tester, r);
      expect(r.registrations.puts, 0);
      expect(
        find.textContaining('off or have not been checked'),
        findsOneWidget,
      );
      await tester.tap(find.text('Enable system notifications'));
      await tester.pumpAndSettle();
      expect(r.registrations.puts, 1);
      expect(
        find.text(
          'Notification registration is active. Delivery is not guaranteed.',
        ),
        findsOneWidget,
      );
      expect(r.targets, isEmpty);
    },
  );
  testWidgets('unknown write disables new mutations and offers only readback', (
    tester,
  ) async {
    final r = await MessagingRig.create(tester);
    addTearDown(r.dispose);
    r.registrations.nextReplace = Future.value(
      const Failure(
        AppFailure(
          kind: AppFailureKind.aiOutcomeUnresolved,
          message: 'Read current status.',
        ),
      ),
    );
    await show(tester, r);
    await tester.tap(find.text('Enable system notifications'));
    await tester.pumpAndSettle();
    expect(
      find.textContaining('Notification changes are unconfirmed.'),
      findsOneWidget,
    );
    expect(
      tester.widget<FilledButton>(find.byType(FilledButton)).onPressed,
      isNull,
    );
    final status = tester.widget<OutlinedButton>(
      find.widgetWithText(OutlinedButton, 'Check notification status'),
    );
    expect(status.onPressed, isNotNull);
    expect(r.registrations.puts, 1);
  });
  testWidgets(
    'small viewport with enlarged text stays scrollable without overflow',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(320, 640));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      final r = await MessagingRig.create(tester, configured: false);
      addTearDown(r.dispose);
      await show(tester, r, scale: 2);
      await tester.pump();
      expect(tester.takeException(), isNull);
      expect(find.byType(SingleChildScrollView), findsOneWidget);
      expect(r.sdk.calls, isEmpty);
    },
  );
}
