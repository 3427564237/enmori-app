import 'package:enmori/app/app.dart';
import 'package:enmori/app/providers.dart';
import 'package:enmori/app/router/app_router.dart';
import 'package:enmori/features/ai_conversation/ai_conversation_providers.dart';
import 'package:enmori/features/ai_conversation/presentation/ai_conversation_page.dart';
import 'package:enmori/harness/ai_conversation/ai_home_router_harness_app.dart';
import 'package:enmori/harness/ai_conversation/synthetic_ai_transport.dart';
import 'package:enmori/harness/ai_conversation/synthetic_auth_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:integration_test/integration_test.dart';

const _note = 'Synthetic R-A shared-route gate input.';

// JIN-authored changed-source gate fixture, not a product change or SHI review.
// Runs the real accepted Home/router/client with the existing synthetic wire
// transport. It makes no real Backend, persistence, model or device-back claim.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets(
    'R-A shared Leave preserves same-session protection and drops it on replacement',
    (tester) async {
      final fixture = _Fixture();
      await tester.pumpWidget(
        AiHomeRouterHarnessApp(
          auth: fixture.auth,
          transport: fixture.transport,
        ),
      );
      await _frames(tester);
      fixture.container = ProviderScope.containerOf(
        tester.element(find.byType(EnmoriApp)),
      );
      expect(fixture.router.state.uri.path, AppRoutes.home);
      expect(fixture.container.read(backendBaseUriProvider), isNull);
      expect(
        find.byKey(const Key('ai-home-synthetic-warning')),
        findsOneWidget,
      );

      await _openAi(tester);
      expect(find.byType(AiConversationPage), findsOneWidget);
      expect(fixture.state.canSend, isTrue);
      await tester.enterText(find.byKey(const Key('ai-message-input')), _note);
      await tester.pump();
      await _tap(tester, 'ai-send');
      expect(fixture.transport.executeCalls, 1);
      expect(fixture.transport.deleteCalls, 0);
      expect(fixture.state.phase, AiConversationPhase.unknown);
      final originalSession = fixture.state.sessionKey;
      final originalTarget = fixture.state.conversationId;
      expect(originalTarget, isNotNull);
      _expectProtected(tester, fixture);

      await _tap(tester, 'ai-leave-without-retrying');
      expect(fixture.router.state.uri.path, AppRoutes.home);
      expect(find.byType(AiConversationPage), findsNothing);
      expect(find.byKey(const Key('ai-message-input')), findsNothing);
      expect(find.text(_note, skipOffstage: false), findsNothing);
      expect(fixture.transport.executeCalls, 1);
      expect(fixture.transport.deleteCalls, 0);

      await _openAi(tester);
      expect(fixture.router.state.uri.path, AppRoutes.aiAssistant);
      expect(fixture.state.sessionKey, same(originalSession));
      expect(fixture.state.conversationId, originalTarget);
      _expectProtected(tester, fixture);

      // This unchanged synthetic unknown scenario never created messages. Its
      // ordinary history reload may report unavailable; that cannot release the
      // original unresolved target. Only the explicit action below reads its
      // outcome. Neither route re-entry nor that read dispatches generation.
      await _tap(tester, 'ai-check-result');
      expect(fixture.state.phase, AiConversationPhase.unknown);
      expect(fixture.state.sessionKey, same(originalSession));
      expect(fixture.state.conversationId, originalTarget);
      _expectProtected(tester, fixture);

      final originalRouter = fixture.router;
      final originalGeneration = fixture.auth.generation;
      await _tap(tester, 'ai-home-new-session');
      expect(fixture.auth.generation, originalGeneration + 1);
      expect(fixture.router, isNot(same(originalRouter)));
      expect(fixture.router.state.uri.path, AppRoutes.home);
      expect(find.byType(AiConversationPage), findsNothing);
      expect(find.text(_note, skipOffstage: false), findsNothing);
      await _openAi(tester);
      expect(fixture.state.sessionKey, isNot(same(originalSession)));
      expect(fixture.state.conversationId, isNull);
      expect(fixture.state.messages, isEmpty);
      expect(fixture.state.canCheckResult, isFalse);
      expect(fixture.state.canLeaveWithoutRetrying, isFalse);
      expect(fixture.state.canRetry, isFalse);
      expect(fixture.state.canSend, isTrue);
      expect(find.byKey(const Key('ai-check-result')), findsNothing);
      expect(find.byKey(const Key('ai-leave-without-retrying')), findsNothing);
      expect(_input(tester).controller!.text, isEmpty);
      expect(fixture.transport.executeCalls, 1);
      expect(fixture.transport.deleteCalls, 0);
      expect(tester.takeException(), isNull);

      debugPrint('JIN_RA_SHARED_EXIT_REENTRY_SESSION_PROTECTION: Pass');
      await tester.pumpWidget(const SizedBox.shrink());
      await _frames(tester);
      expect(tester.takeException(), isNull);
    },
  );
}

void _expectProtected(WidgetTester tester, _Fixture fixture) {
  expect(fixture.state.canSend, isFalse);
  expect(fixture.state.canRetry, isFalse);
  expect(fixture.state.canCheckResult, isTrue);
  expect(fixture.state.canLeaveWithoutRetrying, isTrue);
  expect(fixture.state.messages, isEmpty);
  expect(_input(tester).controller!.text, isEmpty);
  expect(_input(tester).enabled, isFalse);
  expect(find.byKey(const Key('ai-retry')), findsNothing);
  expect(
    tester.widget<FilledButton>(find.byKey(const Key('ai-send'))).onPressed,
    isNull,
  );
  expect(fixture.transport.executeCalls, 1);
  expect(fixture.transport.deleteCalls, 0);
  expect(tester.takeException(), isNull);
}

TextField _input(WidgetTester tester) =>
    tester.widget<TextField>(find.byKey(const Key('ai-message-input')));

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
  final auth = SyntheticAiAuthRepository();
  final transport = SyntheticAiTransport(
    scenario: SyntheticAiScenario.unknown,
    responseDelay: Duration.zero,
  );
  late final ProviderContainer container;
  GoRouter get router => container.read(appRouterProvider);
  AiConversationState get state =>
      container.read(aiConversationControllerProvider);
}
