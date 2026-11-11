import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/proactive/domain/proactive_messaging.dart';
import 'package:enmori/features/proactive/presentation/proactive_push_controls.dart';

import 'proactive_messaging_test_support.dart';

Future<void> show(
  WidgetTester tester,
  MessagingRig r, {
  double scale = 1,
  Locale locale = const Locale('en'),
  bool use24HourFormat = false,
}) => tester.pumpWidget(
  UncontrolledProviderScope(
    container: r.container,
    child: MaterialApp(
      locale: locale,
      supportedLocales: const [Locale('en'), Locale('zh')],
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      home: MediaQuery(
        data: MediaQueryData(
          textScaler: TextScaler.linear(scale),
          alwaysUse24HourFormat: use24HourFormat,
        ),
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
      await tester.tap(find.text('Check notification status'));
      await tester.pumpAndSettle();
      expect(find.textContaining('Registration expiry:'), findsNothing);
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
  for (final expired in [false, true]) {
    testWidgets(
      '${expired ? 'expired Chinese' : 'active English'} registration displays its known local expiry',
      (tester) async {
        final r = await MessagingRig.create(tester);
        addTearDown(r.dispose);
        r.registrations.metadata = ProactiveRegistration(
          revision: 1,
          enabled: !expired,
          availability: expired
              ? ProactiveRegistrationAvailability.expired
              : ProactiveRegistrationAvailability.registered,
          installationRef: messagingInstallation,
          expiresAt: DateTime(
            2026,
            expired ? 10 : 12,
            expired ? 24 : 11,
            18,
            45,
          ).toUtc(),
        );
        await show(
          tester,
          r,
          locale: Locale(expired ? 'zh' : 'en'),
          use24HourFormat: expired,
        );
        await tester.pumpAndSettle();
        await tester.tap(
          find.text(expired ? '核对通知状态' : 'Check notification status'),
        );
        await tester.pumpAndSettle();
        final expiry = find.textContaining(
          expired ? '登记到期时间：' : 'Registration expiry:',
        );
        expect(expiry, findsOneWidget);
        final label = tester.widget<Text>(expiry).data!;
        expect(label, contains(expired ? '10月24日' : 'Dec 11'));
        expect(label, contains(expired ? '18:45' : '6:45 PM'));
        expect(label, contains(expired ? '本地时间' : 'local time'));
        expect(
          find.textContaining(
            expired ? '本次通知登记已过期' : 'Notification registration is active.',
          ),
          findsOneWidget,
        );
        expect(
          tester.widget<FilledButton>(find.byType(FilledButton)).onPressed,
          isNotNull,
        );
        expect(r.registrations.puts, 0);
        expect(r.sdk.calls, isNot(contains('token')));
      },
    );
  }
  testWidgets('unknown write disables new mutations and offers only readback', (
    tester,
  ) async {
    final r = await MessagingRig.create(tester);
    addTearDown(r.dispose);
    r.registrations.metadata = registered();
    r.registrations.nextReplace = Future.value(
      const Failure(
        AppFailure(
          kind: AppFailureKind.aiOutcomeUnresolved,
          message: 'Read current status.',
        ),
      ),
    );
    await show(tester, r);
    await tester.tap(find.text('Check notification status'));
    await tester.pumpAndSettle();
    expect(find.textContaining('Registration expiry:'), findsOneWidget);
    await tester.tap(find.text('Enable system notifications'));
    await tester.pumpAndSettle();
    expect(
      find.textContaining('Notification changes are unconfirmed.'),
      findsOneWidget,
    );
    expect(find.textContaining('Registration expiry:'), findsNothing);
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
      final r = await MessagingRig.create(tester);
      addTearDown(r.dispose);
      r.registrations.metadata = registered();
      await show(tester, r, scale: 2);
      await tester.tap(find.text('Check notification status'));
      await tester.pumpAndSettle();
      expect(find.textContaining('Registration expiry:'), findsOneWidget);
      expect(tester.takeException(), isNull);
      expect(find.byType(SingleChildScrollView), findsOneWidget);
      expect(r.sdk.calls, isNot(contains('token')));
    },
  );
}
