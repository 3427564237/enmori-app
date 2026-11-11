import '../support/ai_menu.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:enmori/features/ai_conversation/ai_conversation_providers.dart';

import 'package:enmori/harness/ai_conversation/synthetic_ai_transport.dart';
import 'package:enmori/harness/ai_conversation/synthetic_auth_repository.dart';
import 'package:enmori/harness/ai_persona/ai_persona_harness_app.dart';
import 'package:enmori/harness/ai_persona/synthetic_persona_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets(
    'AI → real Persona pages → return uses explicit fixture read only',
    (tester) async {
      final transport = SyntheticAiTransport(responseDelay: Duration.zero);
      final personas = SyntheticPersonaRepository();
      await tester.pumpWidget(
        AiPersonaHarnessApp(transport: transport, personas: personas),
      );
      await tester.pumpAndSettle();
      expect(
        find.text(
          'Synthetic AI and Persona fixtures — no real storage or model',
        ),
        findsOneWidget,
      );
      await tester.enterText(
        find.byKey(const Key('ai-message-input')),
        'synthetic input',
      );
      await _tap(tester, 'ai-send', 'route-ai-conversation');
      expect(transport.executeCalls, 1);
      await _tap(tester, 'ai-personas', 'route-ai-conversation');
      expect(find.text('Manage Personas'), findsOneWidget);
      await _tap(tester, 'persona-create', 'route-persona-management');
      await tester.enterText(
        find.byKey(const Key('persona-name')),
        'Synthetic warm style',
      );
      await _tap(tester, 'persona-save', 'route-persona-create');
      expect(personas.collection.items, hasLength(1));
      expect(personas.collection.activePersonaId, isNull);
      await _tap(tester, 'persona-back', 'route-persona-create');
      final id = personas.collection.items.single.personaId;
      await _tap(tester, 'persona-select-$id', 'route-persona-management');
      await _tap(tester, 'persona-activate', 'route-persona-management');
      await _tap(tester, 'persona-confirm-activate');
      expect(personas.collection.activePersonaId, id);
      expect(personas.activations, 1);
      await _tap(tester, 'persona-edit-$id', 'route-persona-management');
      await tester.enterText(
        find.byKey(const Key('persona-name')),
        'Synthetic updated style',
      );
      await _tap(tester, 'persona-save', 'route-persona-edit');
      await _tap(tester, 'persona-back', 'route-persona-edit');
      expect(
        personas.collection.items.single.fields.displayName,
        'Synthetic updated style',
      );
      await _tap(tester, 'persona-back', 'route-persona-management');
      expect(transport.executeCalls, 1);
      final input = tester.widget<TextField>(
        find.byKey(const Key('ai-message-input')),
      );
      expect(input.controller!.text, isEmpty);
      await _tap(tester, 'ai-reload-messages', 'route-ai-conversation');
      expect(find.text('synthetic input'), findsOneWidget);
      expect(
        find.textContaining('Synthetic reply for client testing.'),
        findsOneWidget,
      );
      expect(transport.executeCalls, 1);
      await _tap(tester, 'ai-personas', 'route-ai-conversation');
      await _tap(tester, 'persona-delete-$id', 'route-persona-management');
      await _tap(tester, 'persona-confirm-delete');
      expect(personas.collection.items, isEmpty);
      expect(personas.collection.activePersonaId, isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );

  testWidgets(
    'ordinary Persona navigation preserves the same-session AI draft',
    (tester) async {
      final transport = SyntheticAiTransport(responseDelay: Duration.zero);
      await tester.pumpWidget(AiPersonaHarnessApp(transport: transport));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const Key('ai-message-input')),
        'private unsent fixture',
      );
      await _tap(tester, 'ai-personas', 'route-ai-conversation');
      expect(find.text('Discard unsaved changes?'), findsNothing);
      expect(find.text('Manage Personas'), findsOneWidget);
      await _tap(tester, 'persona-back', 'route-persona-management');
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('ai-message-input')))
            .controller!
            .text,
        'private unsent fixture',
      );
      expect(transport.executeCalls, 0);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );

  testWidgets(
    'explicit cancellation before a Persona detour never resumes the attempt',
    (tester) async {
      final transport = SyntheticAiTransport(
        scenario: SyntheticAiScenario.cancellable,
      );
      await tester.pumpWidget(AiPersonaHarnessApp(transport: transport));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const Key('ai-message-input')),
        'synthetic pending input',
      );
      await _tap(tester, 'ai-send', 'route-ai-conversation');
      expect(transport.executeCalls, 1);
      await _tap(tester, 'ai-cancel', 'route-ai-conversation');
      await _tap(tester, 'ai-personas', 'route-ai-conversation');
      expect(find.text('Manage Personas'), findsOneWidget);
      expect(transport.cancelCalls, 1);
      await _tap(tester, 'persona-back', 'route-persona-management');
      expect(transport.executeCalls, 1);
      // The bounded outcome read confirms the cancelled user-only request.
      // Navigation must not resume it or dispatch another model request.
      final state = ProviderScope.containerOf(
        tester.element(find.byKey(const Key('route-ai-conversation'))),
      ).read(aiConversationControllerProvider);
      expect(state.canRetry, isTrue);
      expect(state.messages.map((message) => message.text), [
        'synthetic pending input',
      ]);
      await tester.scrollUntilVisible(
        find.byKey(const Key('ai-retry')),
        100,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('ai-retry')), findsOneWidget);
      expect(
        find.textContaining('Synthetic reply for client testing.'),
        findsNothing,
      );
      expect(transport.cancelCalls, 1);
      expect(transport.executeCalls, 1);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );

  testWidgets(
    'same-UID replacement removes Persona editor draft and AI content',
    (tester) async {
      final auth = SyntheticAiAuthRepository();
      final transport = SyntheticAiTransport(responseDelay: Duration.zero);
      await tester.pumpWidget(
        AiPersonaHarnessApp(auth: auth, transport: transport),
      );
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const Key('ai-message-input')),
        'synthetic old session text',
      );
      await _tap(tester, 'ai-send', 'route-ai-conversation');
      await _tap(tester, 'ai-personas', 'route-ai-conversation');
      await _tap(tester, 'persona-create', 'route-persona-management');
      await tester.enterText(
        find.byKey(const Key('persona-name')),
        'private Persona draft',
      );
      auth.replaceSession();
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<TextFormField>(find.byKey(const Key('persona-name')))
            .controller!
            .text,
        isEmpty,
      );
      await _tap(tester, 'persona-back', 'route-persona-create');
      await _tap(tester, 'persona-back', 'route-persona-management');
      expect(find.text('synthetic old session text'), findsNothing);
      expect(
        find.textContaining('Synthetic reply for client testing.'),
        findsNothing,
      );
      expect(transport.executeCalls, 1);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
}

Future<void> _tap(WidgetTester tester, String key, [String? surface]) async {
  await tester.pump();
  tester.testTextInput.hide();
  await pumpAiUi(tester);
  await revealAiMenuAction(tester, key);
  final finder = find.byKey(Key(key));
  if (finder.evaluate().isEmpty && surface != null) {
    await tester.scrollUntilVisible(
      finder,
      key.startsWith('ai-') ? -200 : 200,
      scrollable: find
          .descendant(
            of: find.byKey(Key(surface)),
            matching: find.byType(Scrollable),
          )
          .first,
    );
  }
  await tester.ensureVisible(finder);
  await pumpAiUi(tester);
  expect(finder.hitTestable(), findsOneWidget, reason: key);
  await tester.tap(finder);
  await pumpAiUi(tester);
}
