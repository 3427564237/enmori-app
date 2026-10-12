import 'package:enmori/app/app.dart';
import 'package:enmori/app/providers.dart';
import 'package:enmori/app/router/app_router.dart';
import 'package:enmori/features/ai_conversation/presentation/ai_conversation_page.dart';
import 'package:enmori/harness/ai_conversation/ai_home_router_harness_app.dart';
import 'package:enmori/harness/ai_conversation/synthetic_ai_transport.dart';
import 'package:enmori/harness/ai_conversation/synthetic_auth_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

const _note = 'A synthetic shared-route note.';

void main() {
  testWidgets(
    'explicit harness binds real AI, hides History and blocks real URL',
    (tester) async {
      final f = await _pump(tester);
      expect(f.container.read(backendBaseUriProvider), isNull);
      expect(
        find.byKey(const Key('ai-home-synthetic-warning')),
        findsOneWidget,
      );
      expect(find.byKey(const Key('home-check-in-history')), findsNothing);
      await _openAi(tester);
      expect(find.byType(AiConversationPage), findsOneWidget);
      expect(f.router.state.uri.path, AppRoutes.aiAssistant);
      await _tap(tester, 'ai-back');
      expect(f.router.state.uri.path, AppRoutes.home);
      expect(f.transport.executeCalls, 0);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'real wire success survives Back and explicit authorized reread',
    (tester) async {
      final f = await _pump(tester);
      await _openAi(tester);
      await _send(tester);
      expect(f.transport.executeCalls, 1);
      expect(find.text(_note), findsOneWidget);
      expect(
        find.textContaining('Synthetic reply for client testing'),
        findsOneWidget,
      );
      await _tap(tester, 'ai-back');
      expect(f.router.state.uri.path, AppRoutes.home);
      expect(find.text(_note), findsNothing);
      await _openAi(tester);
      expect(find.text(_note), findsOneWidget);
      expect(
        find.textContaining('Synthetic reply for client testing'),
        findsOneWidget,
      );
      expect(f.transport.executeCalls, 1);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('actual Settings route returns to AI and permits Back to Home', (
    tester,
  ) async {
    final f = await _pump(tester);
    await _openAi(tester);
    await _tap(tester, 'ai-settings');
    expect(f.router.state.uri.path, AppRoutes.settings);
    expect(find.byKey(const Key('route-settings')), findsOneWidget);
    expect(find.byKey(const Key('ai-home-synthetic-warning')), findsOneWidget);
    // No fake Settings success is supplied. Its existing repository is unavailable.
    expect(find.textContaining('Settings could not be loaded'), findsOneWidget);
    f.router.pop();
    await _frames(tester);
    await _tap(tester, 'ai-back');
    expect(f.router.state.uri.path, AppRoutes.home);
    expect(f.transport.executeCalls, 0);
    expect(tester.takeException(), isNull);
  });

  for (final settings in [false, true]) {
    testWidgets(
      'pending real page owns exit before shared navigation ($settings)',
      (tester) async {
        final f = await _pump(
          tester,
          scenario: SyntheticAiScenario.cancellable,
        );
        await _openAi(tester);
        await _send(tester);
        expect(f.transport.executeCalls, 1);
        await _exit(tester, settings);
        expect(find.text('Leave this conversation?'), findsOneWidget);
        await tester.tap(find.text('Stay'));
        await _frames(tester);
        expect(f.router.state.uri.path, AppRoutes.aiAssistant);
        expect(f.transport.cancelCalls, 0);
        await _exit(tester, settings);
        await _tap(tester, 'ai-confirm-leave');
        expect(
          f.router.state.uri.path,
          settings ? AppRoutes.settings : AppRoutes.home,
        );
        expect(f.transport.cancelCalls, 1);
        expect(find.text(_note, skipOffstage: false), findsNothing);
        if (settings) {
          f.router.pop();
          await _frames(tester);
        } else {
          await _openAi(tester);
        }
        // Returning never resumes or resends the original pending message.
        expect(f.transport.executeCalls, 1);
        expect(find.byKey(const Key('ai-check-result')), findsOneWidget);
        expect(find.byKey(const Key('ai-retry')), findsNothing);
        expect(tester.takeException(), isNull);
      },
    );
  }

  for (final logout in [false, true]) {
    testWidgets(
      'session replacement/logout clears actual pending page ($logout)',
      (tester) async {
        final f = await _pump(
          tester,
          scenario: SyntheticAiScenario.cancellable,
        );
        await _openAi(tester);
        await _send(tester);
        final oldRouter = f.router;
        await _tap(tester, logout ? 'ai-home-logout' : 'ai-home-new-session');
        expect(f.router, isNot(same(oldRouter)));
        expect(find.byType(AiConversationPage), findsNothing);
        expect(find.text(_note, skipOffstage: false), findsNothing);
        expect(f.transport.cancelCalls, 1);
        expect(f.transport.executeCalls, 1);
        if (logout) {
          expect(f.router.state.uri.path, AppRoutes.register);
          await _tap(tester, 'ai-home-new-session');
        }
        expect(f.router.state.uri.path, AppRoutes.home);
        await _openAi(tester);
        expect(find.text(_note), findsNothing);
        expect(find.byKey(const Key('ai-check-result')), findsNothing);
        expect(f.transport.executeCalls, 1);
        expect(tester.takeException(), isNull);
      },
    );
  }
}

Future<_Fixture> _pump(
  WidgetTester tester, {
  SyntheticAiScenario scenario = SyntheticAiScenario.success,
}) async {
  final f = _Fixture(scenario);
  await tester.pumpWidget(
    AiHomeRouterHarnessApp(auth: f.auth, transport: f.transport),
  );
  await _frames(tester);
  f.container = ProviderScope.containerOf(
    tester.element(find.byType(EnmoriApp)),
  );
  return f;
}

Future<void> _openAi(WidgetTester tester) async {
  final scroll = find
      .descendant(
        of: find.byKey(const Key('route-home')),
        matching: find.byType(Scrollable),
      )
      .first;
  await tester.scrollUntilVisible(
    find.byKey(const Key('home-ai-conversation')),
    180,
    scrollable: scroll,
  );
  await _tap(tester, 'home-ai-conversation');
}

Future<void> _send(WidgetTester tester) async {
  await tester.enterText(find.byKey(const Key('ai-message-input')), _note);
  await tester.pump();
  await _tap(tester, 'ai-send');
}

Future<void> _exit(WidgetTester tester, bool settings) async {
  if (settings) {
    await _tap(tester, 'ai-settings');
  } else {
    await tester.binding.handlePopRoute();
    await _frames(tester);
  }
}

Future<void> _tap(WidgetTester tester, String key) async {
  final finder = find.byKey(Key(key));
  await tester.ensureVisible(finder);
  await tester.tap(finder);
  await _frames(tester);
}

Future<void> _frames(WidgetTester tester) async {
  for (var i = 0; i < 6; i++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}

final class _Fixture {
  _Fixture(SyntheticAiScenario scenario)
    : transport = SyntheticAiTransport(
        scenario: scenario,
        responseDelay: Duration.zero,
      );
  final auth = SyntheticAiAuthRepository();
  final SyntheticAiTransport transport;
  late final ProviderContainer container;
  GoRouter get router => container.read(appRouterProvider);
}
