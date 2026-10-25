import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/content_access.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/proactive/presentation/proactive_follow_up_page.dart';
import 'package:enmori/features/proactive/presentation/proactive_settings_page.dart';
import 'package:enmori/features/proactive/proactive_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'proactive_test_support.dart';

void main() {
  for (final failed in ['settings', 'active']) {
    testWidgets(
      'follow-up form recovers a failed first $failed GET without losing choices or creating',
      (tester) async {
        final r = await ProactiveRig.create(tester);
        r.repo.settings = fixtureSettings(mode: ProactiveMode.on, revision: 1);
        if (failed == 'settings') {
          r.repo.nextReadSettings = Future.value(
            const Failure(unavailableResult),
          );
        } else {
          r.repo.nextActive = Future.value(const Failure(unavailableResult));
        }
        await _pump(
          tester,
          r,
          ProactiveFollowUpPage(source: fixtureSource, onBack: () {}),
        );
        await _verify(tester);
        await _tap(tester, 'proactive-confirm-time');
        expect(_schedule(tester).onPressed, isNull);
        r.repo.nextReadSettings = null;
        r.repo.nextActive = null;
        await _tap(
          tester,
          failed == 'settings'
              ? 'proactive-check-settings'
              : 'proactive-check-active-intents',
        );
        expect(r.repo.saved, isEmpty);
        expect(r.repo.creates, isEmpty);
        await _visible(tester, 'proactive-date');
        expect(
          tester
              .widget<TextField>(find.byKey(const Key('proactive-date')))
              .controller!
              .text,
          '2026-10-26',
        );
        await _visible(tester, 'proactive-time');
        expect(
          tester
              .widget<TextField>(find.byKey(const Key('proactive-time')))
              .controller!
              .text,
          '16:30',
        );
        await _visible(tester, 'proactive-confirm-time');
        expect(
          tester
              .widget<CheckboxListTile>(
                find.byKey(const Key('proactive-confirm-time')),
              )
              .value,
          isTrue,
        );
        await _visible(tester, 'proactive-schedule');
        expect(_schedule(tester).onPressed, isNotNull);
        await _dispose(tester, r);
      },
    );
  }
  testWidgets(
    'time review then settings ACK then separate explicit one-shot create',
    (tester) async {
      final r = await ProactiveRig.create(tester);
      var backs = 0;
      await _pump(
        tester,
        r,
        ProactiveFollowUpPage(source: fixtureSource, onBack: () => backs++),
      );
      expect(r.repo.saved, isEmpty);
      expect(r.repo.creates, isEmpty);
      expect(find.text(fixtureSource.text), findsOneWidget);
      await _verify(tester);
      expect(_schedule(tester).onPressed, isNull);
      await _tap(tester, 'proactive-confirm-time');
      await _tap(tester, 'proactive-schedule');
      expect(r.repo.saved, hasLength(1));
      expect(r.repo.creates, isEmpty);
      expect(find.text('Confirm one follow-up'), findsOneWidget);
      await _tap(tester, 'proactive-schedule');
      expect(r.repo.creates, hasLength(1));
      expect(find.byKey(const Key('proactive-receipt')), findsOneWidget);
      expect(_schedule(tester).onPressed, isNull);
      await _tap(tester, 'proactive-done');
      expect(backs, 1);
      expect(r.repo.creates, hasLength(1));
      expect(tester.takeException(), isNull);
      await _dispose(tester, r);
    },
  );

  testWidgets(
    'fold requires exact candidate choice and edits clear confirmation',
    (tester) async {
      final r = await ProactiveRig.create(tester);
      r.repo.settings = fixtureSettings(
        mode: ProactiveMode.on,
        revision: 1,
        timeZone: 'Europe/Berlin',
        quiet: const ProactiveQuietDisabled(),
      );
      r.time.deviceZone = 'Europe/Berlin';
      final earlier = FollowUpTime(
        dueAt: DateTime.utc(2026, 10, 25, 0, 30),
        timeZone: 'Europe/Berlin',
        displayTime: '2026-10-25 02:30',
        offsetLabel: 'UTC+02:00',
      );
      final later = FollowUpTime(
        dueAt: DateTime.utc(2026, 10, 25, 1, 30),
        timeZone: 'Europe/Berlin',
        displayTime: '2026-10-25 02:30',
        offsetLabel: 'UTC+01:00',
      );
      r.time.resolution = Success([earlier, later]);
      await _pump(
        tester,
        r,
        ProactiveFollowUpPage(source: fixtureSource, onBack: () {}),
      );
      await _verify(tester, date: '2026-10-25', time: '02:30');
      final choices = find.byType(RadioGroup<FollowUpTime>);
      expect(
        tester.widget<RadioGroup<FollowUpTime>>(choices).groupValue,
        isNull,
      );
      await _visible(tester, 'proactive-confirm-time');
      expect(
        tester
            .widget<CheckboxListTile>(
              find.byKey(const Key('proactive-confirm-time')),
            )
            .onChanged,
        isNull,
      );
      await _tap(tester, 'proactive-time-${later.dueAt.toIso8601String()}');
      await _tap(tester, 'proactive-confirm-time');
      expect(_schedule(tester).onPressed, isNotNull);
      await _enter(tester, 'proactive-time', '03:30');
      await _visible(tester, 'proactive-confirm-time');
      expect(
        tester
            .widget<CheckboxListTile>(
              find.byKey(const Key('proactive-confirm-time')),
            )
            .value,
        isFalse,
      );
      expect(_schedule(tester).onPressed, isNull);
      expect(r.repo.creates, isEmpty);
      await _dispose(tester, r);
    },
  );

  testWidgets(
    'quiet time stays unchanged until allowed-time choice and fresh confirmation',
    (tester) async {
      final r = await ProactiveRig.create(tester);
      await _pump(
        tester,
        r,
        ProactiveFollowUpPage(source: fixtureSource, onBack: () {}),
      );
      await _verify(tester, date: '2026-10-25', time: '22:30');
      expect(r.repo.saved, isEmpty);
      expect(r.repo.creates, isEmpty);
      expect(_schedule(tester).onPressed, isNull);
      await _visible(tester, 'proactive-time');
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('proactive-time')))
            .controller!
            .text,
        '22:30',
      );
      r.time.resolution = Success([
        FollowUpTime(
          dueAt: DateTime.utc(2026, 10, 26),
          timeZone: 'Asia/Singapore',
          displayTime: '2026-10-26 08:00',
          offsetLabel: 'UTC+08:00',
        ),
      ]);
      await _tap(tester, 'proactive-use-allowed-time');
      await _visible(tester, 'proactive-date');
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('proactive-date')))
            .controller!
            .text,
        '2026-10-26',
      );
      await _visible(tester, 'proactive-time');
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('proactive-time')))
            .controller!
            .text,
        '08:00',
      );
      await _visible(tester, 'proactive-confirm-time');
      expect(
        tester
            .widget<CheckboxListTile>(
              find.byKey(const Key('proactive-confirm-time')),
            )
            .value,
        isFalse,
      );
      expect(_schedule(tester).onPressed, isNull);
      expect(r.time.resolves, 2);
      await _dispose(tester, r);
    },
  );
  testWidgets(
    'device zone change holds submission until an explicit choice and reconfirmation',
    (tester) async {
      final r = await ProactiveRig.create(tester);
      await r.ready(tester);
      await _pump(
        tester,
        r,
        ProactiveFollowUpPage(source: fixtureSource, onBack: () {}),
      );
      await _verify(tester);
      await _tap(tester, 'proactive-confirm-time');
      r.time.deviceZone = 'Europe/London';
      await _tap(tester, 'proactive-schedule');
      expect(r.repo.creates, isEmpty);
      await _tap(tester, 'proactive-keep-zone');
      expect(_schedule(tester).onPressed, isNull);
      await _tap(tester, 'proactive-confirm-time');
      await _tap(tester, 'proactive-schedule');
      expect(r.repo.creates.single.time.timeZone, 'Asia/Singapore');
      await _dispose(tester, r);
    },
  );

  testWidgets(
    'unknown create keeps choices across remount and checks the original ID',
    (tester) async {
      final r = await ProactiveRig.create(tester);
      await r.ready(tester);
      r.repo.nextCreate = Future.value(const Failure(unknownResult));
      await _pump(
        tester,
        r,
        ProactiveFollowUpPage(source: fixtureSource, onBack: () {}),
      );
      await _verify(tester);
      await _tap(tester, 'proactive-confirm-time');
      await _tap(tester, 'proactive-schedule');
      expect(r.repo.creates, hasLength(1));
      expect(r.state.pendingIntent!.intentId, fixtureIntent);
      await tester.pumpWidget(const SizedBox());
      await tester.pump();
      await _pump(
        tester,
        r,
        ProactiveFollowUpPage(source: fixtureSource, onBack: () {}),
      );
      await _visible(tester, 'proactive-date');
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('proactive-date')))
            .controller!
            .text,
        '2026-10-26',
      );
      await _visible(tester, 'proactive-confirm-time');
      expect(
        tester
            .widget<CheckboxListTile>(
              find.byKey(const Key('proactive-confirm-time')),
            )
            .value,
        isFalse,
      );
      expect(_schedule(tester).onPressed, isNull);
      await _tap(tester, 'proactive-check-intent');
      expect(r.repo.reads, [fixtureIntent]);
      expect(r.repo.creates, hasLength(1));
      expect(find.textContaining('Unsafe server'), findsNothing);
      await _dispose(tester, r);
    },
  );

  testWidgets('retired source hides text and ignores a late time resolution', (
    tester,
  ) async {
    final r = await ProactiveRig.create(tester);
    final response = Completer<Result<List<FollowUpTime>>>();
    r.time.delayedResolution = response.future;
    await _pump(
      tester,
      r,
      ProactiveFollowUpPage(source: fixtureSource, onBack: () {}),
    );
    await _enter(tester, 'proactive-date', '2026-10-26');
    await _enter(tester, 'proactive-time', '16:30');
    await _tap(tester, 'proactive-resolve-time', settle: false);
    r.container.read(contentAccessProvider.notifier).changed();
    await tester.pumpAndSettle();
    expect(find.text(fixtureSource.text), findsNothing);
    response.complete(Success([fixtureTime]));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('proactive-confirm-time')), findsNothing);
    expect(r.repo.creates, isEmpty);
    expect(tester.takeException(), isNull);
    await _dispose(tester, r);
  });

  testWidgets('same UID session replacement hides old form and cannot submit', (
    tester,
  ) async {
    final r = await ProactiveRig.create(tester);
    await _pump(
      tester,
      r,
      ProactiveFollowUpPage(source: fixtureSource, onBack: () {}),
    );
    await _verify(tester);
    await _tap(tester, 'proactive-confirm-time');
    r.auth.sessions.add(AuthSessionAuthenticated(subject: 'same-user'));
    await tester.pumpAndSettle();
    expect(find.text(fixtureSource.text), findsNothing);
    expect(find.byKey(const Key('proactive-schedule')), findsNothing);
    expect(r.repo.saved, isEmpty);
    expect(r.repo.creates, isEmpty);
    await _dispose(tester, r);
  });

  testWidgets(
    'failed settings and active-list reads never display default off or zero requests',
    (tester) async {
      final r = await ProactiveRig.create(tester);
      r.repo.nextReadSettings = Future.value(const Failure(unavailableResult));
      r.repo.nextActive = Future.value(const Failure(unavailableResult));
      await _pump(tester, r, ProactiveSettingsPage(onBack: () {}));
      expect(find.byKey(const Key('proactive-mode')), findsNothing);
      await _visible(tester, 'proactive-reload-intents', settings: true);
      expect(find.text('No active follow-up requests.'), findsNothing);
      expect(
        find.text('Active requests have not been confirmed.'),
        findsOneWidget,
      );
      expect(r.repo.saved, isEmpty);
      expect(r.repo.cancels, isEmpty);
      await _dispose(tester, r);
    },
  );

  testWidgets(
    'narrow large-text Chinese form keeps raw source and all actions reachable',
    (tester) async {
      tester.view.physicalSize = const Size(320, 740);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final r = await ProactiveRig.create(tester);
      await _pump(
        tester,
        r,
        ProactiveFollowUpPage(source: fixtureSource, onBack: () {}),
        chinese: true,
        scale: 2,
      );
      expect(find.text(fixtureSource.text), findsOneWidget);
      await _verify(tester);
      await _tap(tester, 'proactive-confirm-time');
      await _visible(tester, 'proactive-schedule');
      expect(
        find.byKey(const Key('proactive-schedule')).hitTestable(),
        findsOneWidget,
      );
      expect(find.text('开启并继续'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await _dispose(tester, r);
    },
  );
}

Future<void> _pump(
  WidgetTester tester,
  ProactiveRig r,
  Widget child, {
  bool chinese = false,
  double scale = 1,
}) async {
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: r.container,
      child: MaterialApp(
        locale: Locale(chinese ? 'zh' : 'en'),
        supportedLocales: const [Locale('en'), Locale('zh')],
        localizationsDelegates: GlobalMaterialLocalizations.delegates,
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(
            textScaler: TextScaler.linear(scale),
            disableAnimations: true,
          ),
          child: Localizations.override(
            context: context,
            locale: Locale(chinese ? 'zh' : 'en'),
            child: child!,
          ),
        ),
        home: child,
      ),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> _dispose(WidgetTester tester, ProactiveRig r) async {
  await tester.pumpWidget(const SizedBox());
  r.dispose();
  await tester.pump();
}

FilledButton _schedule(WidgetTester tester) =>
    tester.widget<FilledButton>(find.byKey(const Key('proactive-schedule')));
Future<void> _visible(
  WidgetTester tester,
  String key, {
  bool settings = false,
}) async {
  final scroll = find
      .descendant(
        of: find.byKey(
          Key(
            settings ? 'proactive-settings-page' : 'proactive-follow-up-page',
          ),
        ),
        matching: find.byType(Scrollable),
      )
      .first;
  tester.state<ScrollableState>(scroll).position.jumpTo(0);
  await tester.pump();
  final finder = find.byKey(Key(key));
  await tester.scrollUntilVisible(
    finder,
    180,
    scrollable: scroll,
    maxScrolls: 35,
  );
  await tester.ensureVisible(finder);
  await tester.pump();
}

Future<void> _tap(WidgetTester tester, String key, {bool settle = true}) async {
  await _visible(tester, key);
  expect(find.byKey(Key(key)).hitTestable(), findsOneWidget);
  await tester.tap(find.byKey(Key(key)));
  if (settle) {
    await tester.pumpAndSettle();
  } else {
    await tester.pump();
  }
}

Future<void> _enter(WidgetTester tester, String key, String text) async {
  await _visible(tester, key);
  await tester.enterText(find.byKey(Key(key)), text);
  await tester.pump();
}

Future<void> _verify(
  WidgetTester tester, {
  String date = '2026-10-26',
  String time = '16:30',
}) async {
  await _enter(tester, 'proactive-date', date);
  await _enter(tester, 'proactive-time', time);
  await _tap(tester, 'proactive-resolve-time');
  await _visible(tester, 'proactive-schedule');
}
