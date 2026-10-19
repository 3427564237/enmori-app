import 'dart:convert';
import 'dart:io';

import 'package:enmori/controlled_demo.dart' as candidate;
import 'package:enmori/features/check_in/presentation/check_in_calendar_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

// Real Android + TLS + Firebase + Firestore. Credentials arrive through private
// adb stdin after installation, never through assets, defines or test output.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('retained core native account and records journey', (
    tester,
  ) async {
    expect(Platform.isAndroid, isTrue);
    candidate.main();
    final privateFile = File(
      '${Directory.systemTemp.path}/core-device-input.json',
    );
    await until(tester, () => privateFile.existsSync(), seconds: 180);
    final input =
        jsonDecode(await privateFile.readAsString()) as Map<String, dynamic>;
    await privateFile.delete();
    final primary = input['primary'] as Map<String, dynamic>;
    final readOnly = input['readOnly'] == true;
    await until(
      tester,
      () =>
          key('route-register').evaluate().isNotEmpty ||
          key('route-sign-in').evaluate().isNotEmpty,
      seconds: 90,
    );
    if (readOnly) {
      if (key('route-register').evaluate().isNotEmpty) {
        await tap(tester, 'register-sign-in');
      }
      await login(tester, primary);
      await visible(tester, 'route-home');
      await tap(tester, 'social-nav-me');
      await visible(tester, 'profile-name');
      await until(
        tester,
        () => find.text('Native retained profile').evaluate().isNotEmpty,
      );
      expect(find.text('Native saved BIO'), findsOneWidget);
      await tap(tester, 'social-nav-home');
      await tap(tester, 'home-check-in-history');
      await until(
        tester,
        () => find.text('Native retained Check-in').evaluate().isNotEmpty,
      );
      debugPrint('CORE_DEVICE_PASS: restart_login_profile_checkin_read');
      await back(tester);
      await verifyAccountIsolation(tester, input);
      return;
    }
    if (input['resumeRecords'] == true) {
      if (key('route-register').evaluate().isNotEmpty) {
        await tap(tester, 'register-sign-in');
      }
      await login(tester, primary);
      await visible(tester, 'route-home');
    } else {
      if (key('route-sign-in').evaluate().isNotEmpty) {
        await tap(tester, 'sign-in-create-account');
      }
      await enter(tester, 'r6-register-email', primary['email'] as String);
      await enter(
        tester,
        'r6-register-password',
        primary['password'] as String,
      );
      await enter(
        tester,
        'r6-register-confirm-password',
        primary['password'] as String,
      );
      await tap(tester, 'register-terms');
      await tap(tester, 'r6-register-submit');
      await visible(tester, 'r6-onboarding-username');
      await enter(
        tester,
        'r6-onboarding-username',
        'native_core_${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}',
      );
      await tap(tester, 'r6-onboarding-username-continue');
      await tap(tester, 'r6-initial-choice-info-continue');
      await tap(tester, 'r6-initial-choice-reject');
      await visible(tester, 'route-interests');
      await tester.tap(find.text('Skip for now'));
      await visible(tester, 'route-home');
      debugPrint(
        'CORE_DEVICE_PASS: registration_rejected_consent_skipped_interests',
      );
      await tap(tester, 'social-nav-me');
      await tap(tester, 'profile-edit');
      await enter(tester, 'profile-display-name', 'Native retained profile');
      await enter(tester, 'profile-bio', 'Native saved BIO');
      await enter(tester, 'profile-region', 'Singapore');
      await tap(tester, 'profile-save');
      await visible(tester, 'preferences-save-success');
      await back(tester);
      await until(
        tester,
        () => find.text('Native saved BIO').evaluate().isNotEmpty,
      );
      await tap(tester, 'profile-settings');
      await visible(tester, 'settings-visibility');
      expect(
        tester.widget<SwitchListTile>(key('settings-map-sharing')).value,
        isFalse,
      );
      expect(
        tester.widget<SwitchListTile>(key('settings-consent')).value,
        isFalse,
      );
      await tap(tester, 'settings-save');
      await visible(tester, 'preferences-save-success');
      await back(tester);
      await tap(tester, 'social-nav-home');
      debugPrint('CORE_DEVICE_PASS: profile_settings_saved_reread');
    }
    if (input['recordSaved'] != true) {
      await tap(tester, 'r6-new-check-in-button');
      await enter(tester, 'r6-check-in-note', 'Native retained Check-in');
      await tester.tap(find.text('Mood, activity and visibility'));
      await tester.pump(const Duration(milliseconds: 400));
      await tester.ensureVisible(find.text('Calm'));
      await tester.tap(find.text('Calm'));
      await tap(tester, 'r6-check-in-create');
      await tap(tester, 'r6-check-in-confirm');
      await visible(tester, 'r6-check-in-confirmed');
      await tap(tester, 'r6-return-home-inline');
    }
    await tap(tester, 'home-check-in-history');
    await until(
      tester,
      () => find.text('Native retained Check-in').evaluate().isNotEmpty,
    );
    await tap(tester, 'history-month-calendar');
    await tap(tester, 'calendar-day-${DateTime.now().day}');
    final calendarNote = find.descendant(
      of: find.byType(CheckInCalendarPage),
      matching: find.text('Native retained Check-in'),
    );
    await tester.scrollUntilVisible(
      calendarNote,
      200,
      scrollable: find
          .descendant(
            of: find.byType(CheckInCalendarPage),
            matching: find.byType(Scrollable),
          )
          .first,
    );
    final tile = find.ancestor(
      of: calendarNote,
      matching: find.byType(ListTile),
    );
    final recordKey =
        (tester.widget<ListTile>(tile).key! as ValueKey<String>).value;
    final recordId = recordKey.substring('calendar-record-'.length);
    await tester.tap(tile);
    await until(
      tester,
      () => find.byType(CheckInCalendarPage).evaluate().isEmpty,
    );
    await tap(tester, 'history-entry-$recordId');
    await visible(tester, 'saved-check-in-edit');
    await tap(tester, 'saved-check-in-edit');
    await enter(tester, 'check-in-edit-note', 'Native edited Check-in');
    await tap(tester, 'check-in-edit-save');
    await until(tester, () => key('check-in-edit-note').evaluate().isEmpty);
    await until(
      tester,
      () => find.textContaining('Native edited Check-in').evaluate().isNotEmpty,
    );
    await tap(tester, 'saved-check-in-edit');
    await enter(tester, 'check-in-edit-note', 'Native retained Check-in');
    await tap(tester, 'check-in-edit-save');
    await until(tester, () => key('check-in-edit-note').evaluate().isEmpty);
    await until(
      tester,
      () =>
          find.textContaining('Native retained Check-in').evaluate().isNotEmpty,
    );
    await tap(tester, 'r6-return-home');
    await visible(tester, 'route-home');
    debugPrint(
      'CORE_DEVICE_PASS: checkin_create_calendar_exact_record_edit_reread',
    );
    await verifyAccountIsolation(tester, input);
  });
}

Finder key(String value) => find.byKey(Key(value));
Future<void> until(
  WidgetTester tester,
  bool Function() condition, {
  int seconds = 30,
}) async {
  final deadline = DateTime.now().add(Duration(seconds: seconds));
  while (!condition() && DateTime.now().isBefore(deadline)) {
    await tester.pump(const Duration(milliseconds: 150));
  }
  expect(
    condition(),
    isTrue,
    reason: 'Native stage timed out; no automatic write retry',
  );
}

Future<void> visible(WidgetTester tester, String value) =>
    until(tester, () => key(value).evaluate().isNotEmpty);
Future<void> tap(WidgetTester tester, String value) async {
  debugPrint('CORE_DEVICE_ACTION: $value');
  if (key(value).evaluate().isEmpty &&
      key('route-home').evaluate().isNotEmpty) {
    await tester.scrollUntilVisible(
      key(value),
      250,
      scrollable: find
          .descendant(of: key('route-home'), matching: find.byType(Scrollable))
          .first,
    );
  }
  await visible(tester, value);
  await until(tester, () {
    final route = ModalRoute.of(key(value).evaluate().single);
    return route == null ||
        (route.isCurrent &&
            (route.animation == null || route.animation!.isCompleted));
  });
  await Scrollable.ensureVisible(key(value).evaluate().single, alignment: 0.5);
  await tester.pump(const Duration(milliseconds: 400));
  await tester.tap(key(value));
  await tester.pump(const Duration(milliseconds: 200));
}

Future<void> enter(WidgetTester tester, String value, String text) async {
  await visible(tester, value);
  await tester.ensureVisible(key(value));
  await tester.enterText(key(value), text);
  FocusManager.instance.primaryFocus?.unfocus();
  await tester.pump();
}

Future<void> back(WidgetTester tester) async {
  await tester.pageBack();
  await tester.pump(const Duration(milliseconds: 400));
}

Future<void> login(WidgetTester tester, Map<String, dynamic> identity) async {
  await enter(tester, 'sign-in-email', identity['email'] as String);
  await enter(tester, 'sign-in-password', identity['password'] as String);
  await tap(tester, 'sign-in-submit');
}

Future<void> verifyAccountIsolation(
  WidgetTester tester,
  Map<String, dynamic> input,
) async {
  await tap(tester, 'social-settings');
  await visible(tester, 'settings-visibility');
  await tap(tester, 'settings-sign-out');
  await until(
    tester,
    () =>
        key('route-sign-in').evaluate().isNotEmpty ||
        key('route-register').evaluate().isNotEmpty,
  );
  if (key('route-register').evaluate().isNotEmpty) {
    await tap(tester, 'register-sign-in');
  }
  await login(tester, input['secondary'] as Map<String, dynamic>);
  await visible(tester, 'r6-onboarding-username');
  expect(find.text('Native saved BIO'), findsNothing);
  expect(find.text('Native retained Check-in'), findsNothing);
  debugPrint('CORE_DEVICE_PASS: signout_secondary_isolated_onboarding');
}
