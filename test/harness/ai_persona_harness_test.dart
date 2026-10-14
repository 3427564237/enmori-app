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

  testWidgets('draft guard prevents navigation until explicit discard', (
    tester,
  ) async {
    final transport = SyntheticAiTransport(responseDelay: Duration.zero);
    await tester.pumpWidget(AiPersonaHarnessApp(transport: transport));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const Key('ai-message-input')),
      'private unsent fixture',
    );
    await _tap(tester, 'ai-personas', 'route-ai-conversation');
    expect(find.text('Discard unsaved changes?'), findsOneWidget);
    expect(find.text('Manage Personas'), findsNothing);
    await tester.tap(find.text('Keep editing'));
    await tester.pumpAndSettle();
    await _tap(tester, 'ai-personas', 'route-ai-conversation');
    await _tap(tester, 'ai-confirm-discard');
    expect(find.text('Manage Personas'), findsOneWidget);
    await _tap(tester, 'persona-back', 'route-persona-management');
    expect(
      tester
          .widget<TextField>(find.byKey(const Key('ai-message-input')))
          .controller!
          .text,
      isEmpty,
    );
    expect(transport.executeCalls, 0);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets(
    'Persona detour cancels only the active attempt and never resumes it',
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
      await _tap(tester, 'ai-personas', 'route-ai-conversation');
      expect(find.text('Request cancel and leave'), findsOneWidget);
      await _tap(tester, 'ai-confirm-leave');
      expect(find.text('Manage Personas'), findsOneWidget);
      expect(transport.cancelCalls, 1);
      await _tap(tester, 'persona-back', 'route-persona-management');
      expect(transport.executeCalls, 1);
      expect(find.byKey(const Key('ai-check-result')), findsOneWidget);
      expect(find.byKey(const Key('ai-retry')), findsNothing);
      expect(
        find.textContaining('Synthetic reply for client testing.'),
        findsNothing,
      );
      await _tap(tester, 'ai-check-result', 'route-ai-conversation');
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
  final finder = find.byKey(Key(key));
  if (finder.evaluate().isEmpty && surface != null) {
    await tester.scrollUntilVisible(
      finder,
      200,
      scrollable: find
          .descendant(
            of: find.byKey(Key(surface)),
            matching: find.byType(Scrollable),
          )
          .first,
    );
  }
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  await tester.tap(finder);
  await tester.pumpAndSettle();
}
