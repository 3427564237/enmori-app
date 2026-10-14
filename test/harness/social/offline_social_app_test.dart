import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:enmori/app/providers.dart';
import 'package:enmori/app/router/app_router.dart';
import 'package:enmori/harness/social/offline_social_app.dart';
import 'package:enmori/harness/social/offline_social_pages.dart';
import 'package:enmori/harness/social/offline_social_store.dart';

Future<void> start(WidgetTester tester, OfflineSocialStore store) async {
  tester.view.physicalSize = const Size(390, 844);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(
    RepaintBoundary(
      key: const Key('social-capture'),
      child: OfflineSocialApp(store: store),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> tap(WidgetTester tester, Finder target) async {
  await tester.ensureVisible(target);
  await tester.pumpAndSettle();
  await tester.tap(target);
  await tester.pumpAndSettle();
}

void main() {
  testWidgets(
    'Persona creation uses the existing session controller and survives returning to management',
    (tester) async {
      final store = OfflineSocialStore();
      addTearDown(store.dispose);
      await start(tester, store);
      final container = ProviderScope.containerOf(
        tester.element(find.byType(OfflineSocialHub)),
      );
      container.read(appRouterProvider).push<void>(AppRoutes.managePersonas);
      await tester.pumpAndSettle();
      await tap(tester, find.byKey(const Key('persona-create')));
      await tester.enterText(
        find.byKey(const Key('persona-name')),
        'Study buddy',
      );
      await tap(tester, find.byKey(const Key('persona-save')));
      expect(store.personas, hasLength(2));
      expect(store.personas.last.fields.displayName, 'Study buddy');
      await tap(tester, find.byKey(const Key('persona-back')));
      expect(find.byKey(const Key('route-persona-management')), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'AI navigation retains the scripted transport and clears its screen on exit',
    (tester) async {
      final store = OfflineSocialStore();
      addTearDown(store.dispose);
      await start(tester, store);
      await tap(tester, find.text('AI').last);
      expect(find.byKey(const Key('route-ai-conversation')), findsOneWidget);
      await tester.enterText(
        find.byKey(const Key('ai-message-input')),
        'A scripted sample message',
      );
      await tap(tester, find.byKey(const Key('ai-send')));
      await tester.pump(const Duration(seconds: 1));
      await tester.pumpAndSettle();
      expect(find.text('A scripted sample message'), findsWidgets);
      await tap(tester, find.byKey(const Key('ai-back')));
      expect(find.byType(OfflineSocialHub), findsOneWidget);
      expect(find.byKey(const Key('route-ai-conversation')), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'offline five-entry navigation uses existing feature pages with no Backend URI',
    (tester) async {
      final store = OfflineSocialStore();
      addTearDown(store.dispose);
      await start(tester, store);
      final container = ProviderScope.containerOf(
        tester.element(find.byType(OfflineSocialHub)),
      );
      expect(container.read(backendBaseUriProvider), isNull);
      expect(find.byKey(const Key('offline-social-warning')), findsOneWidget);
      await tap(tester, find.byKey(const Key('social-event-offline_walk')));
      expect(find.byKey(const Key('route-event-detail')), findsOneWidget);
      await tap(tester, find.byTooltip('Back'));
      await tap(tester, find.text('Friends').last);
      await tap(tester, find.byKey(const Key('social-manage-friends')));
      await tap(
        tester,
        find.byKey(const Key('friend-accept-offline_riley_request')),
      );
      expect(store.requests, isEmpty);
      expect(store.friends, hasLength(3));
      await tap(tester, find.byTooltip('Back'));
      await tap(tester, find.text('Me').last);
      expect(find.text('Your Name'), findsOneWidget);
      await tap(tester, find.byKey(const Key('social-personas')));
      expect(find.text('Mio'), findsWidgets);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'profile edits and new Check-in reflect on the social pages and History',
    (tester) async {
      final store = OfflineSocialStore();
      addTearDown(store.dispose);
      await start(tester, store);
      await tap(tester, find.text('Me').last);
      await tap(tester, find.byKey(const Key('social-edit-profile')));
      await tester.enterText(
        find.byKey(const Key('profile-display-name')),
        'New Member',
      );
      await tap(tester, find.byKey(const Key('profile-save')));
      await tap(tester, find.byTooltip('Back'));
      expect(find.text('New Member'), findsOneWidget);
      await tap(tester, find.text('Check-in').last);
      await tester.enterText(
        find.byKey(const Key('r6-check-in-note')),
        'This is my new offline moment.',
      );
      await tap(tester, find.byKey(const Key('r6-check-in-create')));
      expect(find.byKey(const Key('r6-check-in-committed')), findsOneWidget);
      await tap(tester, find.byKey(const Key('r6-check-in-confirm')));
      expect(find.byKey(const Key('r6-check-in-confirmed')), findsOneWidget);
      await tap(tester, find.byKey(const Key('r6-return-home-inline')));
      await tap(tester, find.byKey(const Key('social-history')));
      expect(find.text('This is my new offline moment.'), findsOneWidget);
      await tap(
        tester,
        find.byKey(Key('history-entry-${store.notes.first.checkInId}')),
      );
      expect(
        find.byKey(const Key('r6-saved-check-in-confirmed')),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'synthetic signout clears the route stack and can reenter without credentials',
    (tester) async {
      final store = OfflineSocialStore();
      addTearDown(store.dispose);
      await start(tester, store);
      await tap(tester, find.byKey(const Key('social-settings')));
      await tap(tester, find.byKey(const Key('settings-sign-out')));
      expect(find.byKey(const Key('offline-enter')), findsOneWidget);
      expect(find.byType(OfflineSocialHub), findsNothing);
      await tap(tester, find.byKey(const Key('offline-enter')));
      expect(find.byType(OfflineSocialHub), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'small and large-text hub layouts and optional actual widget captures',
    (tester) async {
      final store = OfflineSocialStore();
      addTearDown(store.dispose);
      final fontPath = Platform.environment['ENMORI_CAPTURE_FONT'];
      if (fontPath != null) {
        final bytes = await tester.runAsync(() => File(fontPath).readAsBytes());
        await tester.runAsync(
          () => (FontLoader(
            'Roboto',
          )..addFont(Future.value(ByteData.sublistView(bytes!)))).load(),
        );
      }
      final iconsPath = Platform.environment['ENMORI_CAPTURE_ICONS'];
      if (iconsPath != null) {
        final bytes = await tester.runAsync(
          () => File(iconsPath).readAsBytes(),
        );
        await tester.runAsync(
          () => (FontLoader(
            'MaterialIcons',
          )..addFont(Future.value(ByteData.sublistView(bytes!)))).load(),
        );
      }
      await start(tester, store);
      final container = ProviderScope.containerOf(
        tester.element(find.byType(OfflineSocialHub)),
      );
      final output = Platform.environment['ENMORI_CAPTURE_SOCIAL_UI'];
      for (final (name, path) in [
        ('home', AppRoutes.home),
        ('profile', AppRoutes.profile),
        ('friends', '/friends'),
      ]) {
        container.read(appRouterProvider).go(path);
        await tester.pumpAndSettle();
        if (output != null) {
          final boundary = tester.renderObject<RenderRepaintBoundary>(
            find.byKey(const Key('social-capture')),
          );
          final image = await tester.runAsync(
            () => boundary.toImage(pixelRatio: 2),
          );
          final data = await tester.runAsync(
            () => image!.toByteData(format: ui.ImageByteFormat.png),
          );
          await tester.runAsync(() async {
            await Directory(output).create(recursive: true);
            await File('$output/$name.png')
                .writeAsBytes(data!.buffer.asUint8List());
          });
          image!.dispose();
        }
        expect(tester.takeException(), isNull, reason: path);
      }
      tester.view.physicalSize = const Size(320, 640);
      tester.platformDispatcher.textScaleFactorTestValue = 1.5;
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      for (final path in [AppRoutes.home, AppRoutes.profile, '/friends']) {
        container.read(appRouterProvider).go(path);
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull, reason: path);
      }
    },
  );
}
