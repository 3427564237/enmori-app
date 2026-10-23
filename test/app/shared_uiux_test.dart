import 'dart:io';
import 'dart:ui' as ui;

import 'package:enmori/app/enmori_theme.dart';
import 'package:enmori/app/home_shell_page.dart';
import 'package:enmori/app/route_status_pages.dart';
import 'package:enmori/core/presentation/status_panel.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  for (final size in [const Size(375, 667), const Size(667, 375)]) {
    testWidgets('Home actions and navigation remain reachable at $size', (
      tester,
    ) async {
      final actions = <String>[];
      await _pump(
        tester,
        HomeShellPage(
          socialStyle: true,
          onStartCheckIn: () => actions.add('check-in'),
          onSeeAllEvents: () => actions.add('recommendations'),
          onBrowseActivities: () => actions.add('browse'),
          onOpenAi: () => actions.add('ai'),
          onOpenHistory: () => actions.add('history'),
          onManagePersonas: () => actions.add('personas'),
          onEditInterests: () => actions.add('interests'),
          onOpenSettings: () => actions.add('settings'),
          onSelectTab: (index) => actions.add('tab-$index'),
        ),
        size: size,
      );
      await _capture(tester, 'home-${size.width.toInt()}');
      for (final key in [
        'r6-new-check-in-button',
        'home-browse-activities',
        'social-ai-card',
        'home-check-in-history',
        'home-manage-personas',
        'edit-interests-button',
      ]) {
        final target = find.byKey(Key(key));
        await tester.scrollUntilVisible(
          target,
          180,
          scrollable: find.byType(Scrollable).first,
        );
        await tester.ensureVisible(target);
        await tester.pumpAndSettle();
        expect(target.hitTestable(), findsOneWidget, reason: key);
        await tester.tap(target);
      }
      await _capture(tester, 'home-actions-${size.width.toInt()}');
      await tester.tap(find.byKey(const Key('social-settings')));
      await tester.tap(find.byKey(const Key('social-nav-home')));
      await tester.tap(find.byKey(const Key('social-nav-events')));
      expect(actions, [
        'check-in',
        'browse',
        'ai',
        'history',
        'personas',
        'interests',
        'settings',
        'tab-2',
      ]);
      expect(find.textContaining('saved Notes'), findsNothing);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('unwired Home shortcuts explain availability without chevrons', (
    tester,
  ) async {
    await _pump(
      tester,
      HomeShellPage(
        socialStyle: true,
        onStartCheckIn: () {},
        onSeeAllEvents: () {},
      ),
    );
    for (final key in ['social-ai-card', 'home-check-in-history']) {
      final target = find.byKey(Key(key));
      await tester.scrollUntilVisible(
        target,
        180,
        scrollable: find.byType(Scrollable).first,
      );
      final tile = tester.widget<ListTile>(
        find.descendant(of: target, matching: find.byType(ListTile)),
      );
      expect(tile.enabled, isFalse);
      expect(tile.onTap, isNull);
      expect(tile.trailing, isNull);
      expect(
        find.descendant(
          of: target,
          matching: find.text('Unavailable in this version.'),
        ),
        findsOneWidget,
      );
    }
    await _capture(tester, 'home-unavailable');
    await tester.scrollUntilVisible(
      find.byKey(const Key('edit-interests-button')),
      180,
      scrollable: find.byType(Scrollable).first,
    );
    expect(
      find.text('Edit interests is unavailable in this version.'),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('startup, error retry and configuration states stay distinct', (
    tester,
  ) async {
    await _pump(tester, const StartupPage());
    expect(find.text('Opening ENMORI'), findsOneWidget);
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    expect(find.byType(FilledButton), findsNothing);
    await _capture(tester, 'startup');

    var retries = 0;
    await _pump(
      tester,
      UnavailablePage(onRetry: () => retries++),
      size: const Size(667, 375),
    );
    expect(find.byType(CircularProgressIndicator), findsNothing);
    expect(retries, 0);
    final retry = find.byKey(const Key('startup-retry'));
    await tester.ensureVisible(retry);
    await tester.pumpAndSettle();
    await tester.tap(retry);
    expect(retries, 1);
    await _capture(tester, 'service-error');

    await _pump(tester, const ConfigurationUnavailablePage());
    expect(find.text('Setup unavailable'), findsOneWidget);
    expect(find.byType(FilledButton), findsNothing);
    expect(find.byType(CircularProgressIndicator), findsNothing);
    await _pump(tester, const AccountUnavailablePage());
    expect(find.text('This account cannot continue.'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'shared empty and error panels keep long recovery actions visible',
    (tester) async {
      var retries = 0;
      await _pump(
        tester,
        Scaffold(
          body: SafeArea(
            child: ListView(
              padding: const EdgeInsets.all(24),
              children: [
                const StatusPanel(
                  title: 'No event recommendations right now',
                  body: 'Update your interests or check again later.',
                  icon: Icons.event_busy_outlined,
                ),
                const SizedBox(height: 16),
                StatusPanel(
                  title: 'Event recommendations unavailable',
                  body: 'This service is temporarily unavailable. Try again.',
                  icon: Icons.cloud_off_outlined,
                  isError: true,
                  action: FilledButton(
                    onPressed: () => retries++,
                    child: const Text('Retry event recommendations'),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
      await _capture(tester, 'empty-and-error');
      await tester.ensureVisible(find.byType(FilledButton));
      await tester.pumpAndSettle();
      await tester.tap(find.byType(FilledButton));
      expect(retries, 1);
      expect(find.byType(CircularProgressIndicator), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'themed field validation retains input and clears on correction',
    (tester) async {
      final form = GlobalKey<FormState>();
      final controller = TextEditingController();
      addTearDown(controller.dispose);
      await _pump(
        tester,
        Scaffold(
          body: SafeArea(
            child: Form(
              key: form,
              child: ListView(
                padding: const EdgeInsets.all(24),
                children: [
                  TextFormField(
                    controller: controller,
                    decoration: const InputDecoration(
                      labelText: 'Display name',
                      helperText: 'Choose the name other people will see on your profile.',
                    ),
                    validator: (value) => (value?.length ?? 0) < 2
                        ? 'Enter at least two characters for this preview.'
                        : null,
                  ),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: () => form.currentState!.validate(),
                    child: const Text('Validate preview'),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
      await tester.enterText(find.byType(TextFormField), 'A');
      await tester.tap(find.byType(FilledButton));
      await tester.pumpAndSettle();
      expect(
        find.text('Enter at least two characters for this preview.'),
        findsOneWidget,
      );
      expect(controller.text, 'A');
      await _capture(tester, 'form-error');
      await tester.enterText(find.byType(TextFormField), 'Alex');
      await tester.tap(find.byType(FilledButton));
      await tester.pumpAndSettle();
      expect(
        find.text('Enter at least two characters for this preview.'),
        findsNothing,
      );
      expect(controller.text, 'Alex');
      expect(tester.takeException(), isNull);
    },
  );
}

Future<void> _pump(
  WidgetTester tester,
  Widget page, {
  Size size = const Size(375, 667),
}) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  if (Platform.environment['ENMORI_UIUX_CAPTURE'] != null) {
    for (final (family, asset) in [
      (
        'Playfair Display',
        'assets/fonts/playfair_display/PlayfairDisplay[wght].ttf',
      ),
      ('MaterialIcons', 'fonts/MaterialIcons-Regular.otf'),
    ]) {
      await tester.runAsync(
        () => (FontLoader(family)..addFont(rootBundle.load(asset))).load(),
      );
    }
    final fontPath = Platform.environment['ENMORI_CAPTURE_FONT'];
    if (fontPath != null) {
      final bytes = await tester.runAsync(() => File(fontPath).readAsBytes());
      await (FontLoader(
        'Roboto',
      )..addFont(Future.value(ByteData.sublistView(bytes!)))).load();
    }
  }
  await tester.pumpWidget(
    RepaintBoundary(
      key: const Key('uiux-capture'),
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: enmoriTheme(),
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context)
              .copyWith(textScaler: const TextScaler.linear(1.3)),
          child: child!,
        ),
        home: page,
      ),
    ),
  );
  await tester.pump(const Duration(milliseconds: 300));
}

Future<void> _capture(WidgetTester tester, String name) async {
  final output = Platform.environment['ENMORI_UIUX_CAPTURE'];
  if (output == null) return;
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(const Key('uiux-capture')),
  );
  final bitmap = await tester.runAsync(() => boundary.toImage(pixelRatio: 1));
  final data = await tester.runAsync(
    () => bitmap!.toByteData(format: ui.ImageByteFormat.png),
  );
  await tester.runAsync(() async {
    await Directory(output).create(recursive: true);
    await File('$output/$name.png').writeAsBytes(data!.buffer.asUint8List());
  });
  bitmap!.dispose();
}
