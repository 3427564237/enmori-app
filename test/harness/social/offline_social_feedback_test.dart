import 'dart:io';
import 'dart:ui' as ui;

import 'package:enmori/app/providers.dart';
import 'package:enmori/app/router/app_router.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/ai_conversation/ai_conversation_providers.dart';
import 'package:enmori/features/ai_conversation/presentation/ai_conversation_page.dart';
import 'package:enmori/harness/social/offline_setup_auth_repository.dart';
import 'package:enmori/harness/social/offline_social_app.dart';
import 'package:enmori/harness/social/offline_social_pages.dart';
import 'package:enmori/harness/social/offline_social_store.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

Future<void> start(WidgetTester tester, OfflineSocialStore store) async {
  tester.view.physicalSize = const Size(390, 844);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  final auth = OfflineSetupAuthRepository();
  addTearDown(auth.dispose);
  await tester.pumpWidget(
    RepaintBoundary(
      key: const Key('feedback-capture'),
      child: OfflineSocialApp(
        store: store,
        accountSetup: true,
        setupAuth: auth,
      ),
    ),
  );
  await tester.pumpAndSettle();
  auth.observeSampleSession();
  await tester.pumpAndSettle();
}

Future<void> tap(WidgetTester tester, String key) async {
  final target = find.byKey(Key(key));
  if (target.evaluate().isEmpty) {
    await tester.scrollUntilVisible(
      target,
      200,
      scrollable: find.byType(Scrollable).first,
    );
  }
  await tester.ensureVisible(target);
  await tester.pumpAndSettle();
  await tester.tap(target);
  await tester.pumpAndSettle();
}

Future<void> capture(WidgetTester tester, String name) async {
  final output = Platform.environment['ENMORI_CAPTURE_SOCIAL_FEEDBACK'];
  if (output == null) return;
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(const Key('feedback-capture')),
  );
  final bitmap = await tester.runAsync(() => boundary.toImage(pixelRatio: 2));
  final data = await tester.runAsync(
    () => bitmap!.toByteData(format: ui.ImageByteFormat.png),
  );
  await tester.runAsync(() async {
    await Directory(output).create(recursive: true);
    await File('$output/$name.png').writeAsBytes(data!.buffer.asUint8List());
  });
  bitmap!.dispose();
}

void main() {
  testWidgets(
    'chat action menu preserves delete confirmation and immediate content hiding',
    (tester) async {
      final store = OfflineSocialStore();
      addTearDown(store.dispose);
      await start(tester, store);
      await tap(tester, 'social-nav-ai');
      final container = ProviderScope.containerOf(
        tester.element(find.byType(AiConversationPage)),
      );
      await tester.enterText(
        find.byKey(const Key('ai-message-input')),
        'A sample to delete',
      );
      await tap(tester, 'ai-send');
      await tester.pump(const Duration(seconds: 1));
      await tester.pumpAndSettle();
      await tap(tester, 'ai-conversation-actions');
      await tap(tester, 'ai-delete');
      await tester.tap(find.text('Keep'));
      await tester.pumpAndSettle();
      expect(find.text('A sample to delete'), findsOneWidget);
      await tap(tester, 'ai-conversation-actions');
      await tap(tester, 'ai-delete');
      await tap(tester, 'ai-confirm-delete');
      expect(find.text('A sample to delete'), findsNothing);
      expect(find.byKey(const Key('ai-message-input')), findsNothing);
      expect(
        container.read(aiConversationControllerProvider).phase,
        AiConversationPhase.deleted,
      );
      expect(tester.takeException(), isNull);
    },
  );
  test('scripted token is unavailable outside observation and rotates for a fresh same-UID session', () async {
    final auth = OfflineSetupAuthRepository(automaticallyObserve: false);
    expect(await auth.getIdToken(), isA<Failure<String>>());
    await auth.signIn(
      email: 'invented@example.invalid',
      password: 'InventedOnly123',
    );
    expect(await auth.getIdToken(), isA<Failure<String>>());
    auth.observeSampleSession();
    final first = (await auth.getIdToken() as Success<String>).value;
    expect(first, startsWith('synthetic-ai-token-'));
    expect(first.contains('.'), isFalse);
    auth.observeSampleSession();
    final next = (await auth.getIdToken() as Success<String>).value;
    expect(next, isNot(first));
    await auth.signOut();
    expect(await auth.getIdToken(), isA<Failure<String>>());
    await auth.dispose();
    expect(await auth.getIdToken(), isA<Failure<String>>());
  });
  testWidgets(
    'Account-entry AI tab can send through the existing scripted wire',
    (tester) async {
      final store = OfflineSocialStore();
      addTearDown(store.dispose);
      await start(tester, store);
      await tap(tester, 'social-nav-ai');
      expect(find.byKey(const Key('social-bottom-navigation')), findsOneWidget);
      expect(
        tester.widget<NavigationBar>(find.byType(NavigationBar)).selectedIndex,
        3,
      );
      final container = ProviderScope.containerOf(
        tester.element(find.byType(AiConversationPage)),
      );
      expect(container.read(appRouterProvider).canPop(), isFalse);
      expect(container.read(backendBaseUriProvider), isNull);
      await tester.enterText(
        find.byKey(const Key('ai-message-input')),
        'An invented sample message',
      );
      await tap(tester, 'ai-send');
      await tester.pump(const Duration(seconds: 1));
      await tester.pumpAndSettle();
      expect(
        container.read(aiConversationControllerProvider).phase,
        AiConversationPhase.success,
      );
      expect(find.text('An invented sample message'), findsOneWidget);
      expect(
        container.read(aiConversationControllerProvider).messages,
        hasLength(2),
      );
      await tap(tester, 'social-nav-ai');
      expect(
        container.read(aiConversationControllerProvider).messages,
        hasLength(2),
      );
      await tap(tester, 'social-nav-home');
      expect(find.byType(OfflineSocialHub), findsOneWidget);
      expect(find.byKey(const Key('route-ai-conversation')), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'Home and Friends open the current minimum sample profile; Me has no duplicate friend entry',
    (tester) async {
      final store = OfflineSocialStore();
      addTearDown(store.dispose);
      await start(tester, store);
      await tap(tester, 'social-friend-alex_sample');
      expect(
        find.byKey(const Key('route-offline-friend-profile')),
        findsOneWidget,
      );
      expect(find.text('@alex_sample'), findsOneWidget);
      expect(find.text(store.notes.single.note), findsNothing);
      expect(find.text('Edit profile'), findsNothing);
      await tester.tap(find.byTooltip('Back'));
      await tester.pumpAndSettle();
      await tap(tester, 'social-nav-friends');
      await tap(tester, 'social-friend-jamie_sample');
      expect(find.text('@jamie_sample'), findsOneWidget);
      await tester.tap(find.byTooltip('Back'));
      await tester.pumpAndSettle();
      await tap(tester, 'social-friends-list');
      await tester.enterText(
        find.byKey(const Key('my-friends-search-query')),
        'Jamie',
      );
      await tap(tester, 'my-friends-search');
      expect(find.text('Jamie · Sample'), findsOneWidget);
      expect(find.text('Alex · Sample'), findsNothing);
      await tap(tester, 'my-friend-profile-jamie_sample');
      expect(find.text('@jamie_sample'), findsOneWidget);
      await tap(tester, 'offline-friend-back');
      expect(find.byKey(const Key('route-my-friends')), findsOneWidget);
      expect(find.text('Alex · Sample'), findsNothing);
      await tester.tap(find.byTooltip('Back'));
      await tester.pumpAndSettle();
      await tap(tester, 'social-nav-me');
      expect(find.byKey(const Key('social-profile-friends')), findsNothing);
      expect(find.byKey(const Key('social-history')), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'sample profile fails closed after removal and for an unknown Username',
    (tester) async {
      final store = OfflineSocialStore();
      addTearDown(store.dispose);
      await start(tester, store);
      final container = ProviderScope.containerOf(
        tester.element(find.byType(OfflineSocialHub)),
      );
      container
          .read(appRouterProvider)
          .push<void>(offlineFriendProfilePath('alex_sample'));
      await tester.pumpAndSettle();
      store.friends.removeWhere((friend) => friend.username == 'alex_sample');
      store.changed();
      await tester.pumpAndSettle();
      expect(
        find.byKey(const Key('offline-friend-unavailable')),
        findsOneWidget,
      );
      expect(find.text('@alex_sample'), findsNothing);
      container
          .read(appRouterProvider)
          .go(offlineFriendProfilePath('not_available'));
      await tester.pumpAndSettle();
      expect(
        find.byKey(const Key('offline-friend-unavailable')),
        findsOneWidget,
      );
      await tap(tester, 'offline-friend-back');
      expect(find.byType(OfflineSocialHub), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'new phone layouts and optional actual Flutter rasters retain Note confirmation',
    (tester) async {
      final store = OfflineSocialStore();
      addTearDown(store.dispose);
      for (final (family, variable) in [
        ('Roboto', 'ENMORI_CAPTURE_FONT'),
        ('MaterialIcons', 'ENMORI_CAPTURE_ICONS'),
      ]) {
        final path = Platform.environment[variable];
        if (path != null) {
          final bytes = await tester.runAsync(() => File(path).readAsBytes());
          await tester.runAsync(
            () => (FontLoader(
              family,
            )..addFont(Future.value(ByteData.sublistView(bytes!)))).load(),
          );
        }
      }
      await start(tester, store);
      final container = ProviderScope.containerOf(
        tester.element(find.byType(OfflineSocialHub)),
      );
      container.read(appRouterProvider).go(AppRoutes.aiAssistant);
      await tester.pumpAndSettle();
      await capture(tester, 'ai-empty');
      await tester.enterText(
        find.byKey(const Key('ai-message-input')),
        'I took a little time for myself today.',
      );
      await tap(tester, 'ai-send');
      await tester.pump(const Duration(seconds: 1));
      await tester.pumpAndSettle();
      expect(
        container.read(aiConversationControllerProvider).phase,
        AiConversationPhase.success,
      );
      await capture(tester, 'ai-chat');
      await tap(tester, 'social-nav-check-in');
      expect(find.text('Keep a little moment'), findsOneWidget);
      await capture(tester, 'check-in');
      await tester.enterText(
        find.byKey(const Key('r6-check-in-note')),
        'A small moment I want to keep.',
      );
      await tap(tester, 'r6-check-in-create');
      expect(find.byKey(const Key('r6-check-in-committed')), findsOneWidget);
      expect(find.byKey(const Key('r6-check-in-confirmed')), findsNothing);
      await tap(tester, 'r6-check-in-confirm');
      expect(find.byKey(const Key('r6-check-in-confirmed')), findsOneWidget);
      container
          .read(appRouterProvider)
          .go(offlineFriendProfilePath('alex_sample'));
      await tester.pumpAndSettle();
      await capture(tester, 'friend-profile');
      tester.view.physicalSize = const Size(320, 640);
      tester.platformDispatcher.textScaleFactorTestValue = 1.5;
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      for (final path in [
        AppRoutes.aiAssistant,
        AppRoutes.checkIn,
        offlineFriendProfilePath('alex_sample'),
        '/friends',
        AppRoutes.profile,
      ]) {
        container.read(appRouterProvider).go(path);
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull, reason: path);
      }
    },
  );
}
