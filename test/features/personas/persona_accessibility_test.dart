import 'dart:ui' show SemanticsAction, Tristate;

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/personas/domain/persona.dart';
import 'package:enmori/features/personas/domain/persona_repository.dart';
import 'package:enmori/features/personas/persona_providers.dart';
import 'package:enmori/features/personas/presentation/persona_editor_page.dart';
import 'package:enmori/features/personas/presentation/persona_management_page.dart';
import 'package:enmori/features/personas/presentation/persona_page_parts.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets(
    'structured fields expose their labels and invalid Name receives focus',
    (tester) async {
      final repository = _Repository();
      await _pump(tester, repository, PersonaEditorPage(onBack: () {}));
      for (final label in ['Name', 'Tone', 'Response length', 'Format']) {
        expect(find.bySemanticsLabel(RegExp(label)), findsWidgets);
      }
      await _tap(tester, 'persona-save');
      expect(
        _ownsPrimaryFocus(tester, find.byKey(const Key('persona-name'))),
        isTrue,
      );
      expect(
        find.bySemanticsLabel(
          RegExp('Enter a name of 1–50 characters without control characters.'),
        ),
        findsWidgets,
      );
      expect(repository.creates, 0);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'keyboard traverses form in visual order and submits validation',
    (tester) async {
      final repository = _Repository();
      await _pump(tester, repository, PersonaEditorPage(onBack: () {}));
      await _tap(tester, 'persona-name');
      for (final key in [
        'persona-tone',
        'persona-response-length',
        'persona-format',
        'persona-save',
      ]) {
        await tester.sendKeyEvent(LogicalKeyboardKey.tab);
        await tester.pumpAndSettle();
        expect(
          _ownsPrimaryFocus(tester, find.byKey(Key(key))),
          isTrue,
          reason: 'Tab should reach $key',
        );
      }
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pumpAndSettle();
      expect(
        _ownsPrimaryFocus(tester, find.byKey(const Key('persona-name'))),
        isTrue,
      );
      expect(repository.creates, 0);
    },
  );

  testWidgets(
    'delete dialog starts on Cancel, contains traversal and restores trigger focus',
    (tester) async {
      final repository = _Repository();
      await _pump(
        tester,
        repository,
        PersonaManagementPage(onCreate: () {}, onEdit: (_) {}, onBack: () {}),
      );
      final trigger = find.byKey(Key('persona-delete-${_persona.personaId}'));
      await _focusByTraversal(tester, trigger);
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pumpAndSettle();
      final cancel = find.widgetWithText(TextButton, 'Cancel');
      final destructive = find.byKey(const Key('persona-confirm-delete'));
      expect(_ownsPrimaryFocus(tester, cancel), isTrue);
      expect(
        find.bySemanticsLabel(RegExp('Permanently delete this Persona')),
        findsWidgets,
      );
      expect(find.bySemanticsLabel(RegExp('Delete permanently')), findsWidgets);
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pumpAndSettle();
      expect(_ownsPrimaryFocus(tester, destructive), isTrue);
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pumpAndSettle();
      expect(_ownsPrimaryFocus(tester, cancel), isTrue);
      await tester.sendKeyDownEvent(LogicalKeyboardKey.shiftLeft);
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.sendKeyUpEvent(LogicalKeyboardKey.shiftLeft);
      await tester.pumpAndSettle();
      expect(_ownsPrimaryFocus(tester, destructive), isTrue);
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pumpAndSettle();
      expect(find.byType(AlertDialog), findsNothing);
      expect(repository.deletions, 0);
      expect(_ownsPrimaryFocus(tester, trigger), isTrue);
    },
  );

  testWidgets(
    'selection semantics remains separate from Active and activation cancel restores focus',
    (tester) async {
      final repository = _Repository();
      await _pump(
        tester,
        repository,
        PersonaManagementPage(onCreate: () {}, onEdit: (_) {}, onBack: () {}),
      );
      await _tap(tester, 'persona-select-${_persona.personaId}');
      final selected = tester.getSemantics(
        find.byKey(Key('persona-select-${_persona.personaId}')),
      );
      expect(selected.flagsCollection.isSelected, Tristate.isTrue);
      expect(selected.label, 'Selected for activation: Guide');
      expect(selected.value, 'Not active');
      expect(selected.flagsCollection.isButton, isTrue);
      expect(
        selected.parent?.flagsCollection.isSelected,
        isNot(Tristate.isTrue),
      );
      expect(
        selected.parent?.label,
        contains('Current activation status: Inactive'),
      );
      expect(find.text('Inactive'), findsOneWidget);
      final activate = find.byKey(const Key('persona-activate'));
      await _focusByTraversal(tester, activate);
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pumpAndSettle();
      final cancel = find.widgetWithText(TextButton, 'Cancel');
      expect(_ownsPrimaryFocus(tester, cancel), isTrue);
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pumpAndSettle();
      expect(repository.activations, 0);
      expect(_ownsPrimaryFocus(tester, activate), isTrue);
    },
  );

  testWidgets(
    'spoken selection changes without changing either Persona activation status',
    (tester) async {
      tester.view.physicalSize = const Size(800, 1100);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final activePersona = Persona(
        personaId: 'b' * 64,
        fields: const PersonaFields(
          displayName: 'Companion',
          tone: PersonaTone.warm,
          responseLength: PersonaResponseLength.concise,
          formatStyle: PersonaFormatStyle.plain,
        ),
        createdAt: _persona.createdAt,
        updatedAt: _persona.updatedAt,
        revision: 1,
      );
      final repository = _Repository(
        items: [_persona, activePersona],
        activePersonaId: activePersona.personaId,
      );
      await _pump(
        tester,
        repository,
        PersonaManagementPage(onCreate: () {}, onEdit: (_) {}, onBack: () {}),
      );
      final inactiveButton = find.byKey(
        Key('persona-select-${_persona.personaId}'),
      );
      final activeButton = find.byKey(
        Key('persona-select-${activePersona.personaId}'),
      );
      expect(
        tester.getSemantics(inactiveButton).label,
        'Select for activation: Guide',
      );
      expect(tester.getSemantics(inactiveButton).value, 'Not active');
      expect(
        tester.getSemantics(activeButton).label,
        'Select for activation: Companion',
      );
      expect(tester.getSemantics(activeButton).value, 'Currently active');
      await _focusByTraversal(tester, inactiveButton);
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pumpAndSettle();
      expect(_ownsPrimaryFocus(tester, inactiveButton), isTrue);
      final selectedInactive = tester.getSemantics(inactiveButton);
      final unselectedActive = tester.getSemantics(activeButton);
      expect(selectedInactive.label, 'Selected for activation: Guide');
      expect(selectedInactive.value, 'Not active');
      expect(selectedInactive.flagsCollection.isButton, isTrue);
      expect(
        selectedInactive.getSemanticsData().hasAction(SemanticsAction.tap),
        isTrue,
      );
      expect(selectedInactive.flagsCollection.isSelected, Tristate.isTrue);
      expect(unselectedActive.label, 'Select for activation: Companion');
      expect(unselectedActive.value, 'Currently active');
      expect(unselectedActive.flagsCollection.isButton, isTrue);
      expect(
        unselectedActive.getSemanticsData().hasAction(SemanticsAction.tap),
        isTrue,
      );
      expect(unselectedActive.flagsCollection.isSelected, Tristate.isFalse);
      expect(
        selectedInactive.parent?.label,
        contains('Current activation status: Inactive'),
      );
      expect(
        unselectedActive.parent?.label,
        contains('Current activation status: Active'),
      );
      expect(
        selectedInactive.parent?.flagsCollection.isSelected,
        isNot(Tristate.isTrue),
      );
      unselectedActive.owner!.performAction(
        unselectedActive.id,
        SemanticsAction.tap,
      );
      await tester.pumpAndSettle();
      expect(
        tester.getSemantics(inactiveButton).label,
        'Select for activation: Guide',
      );
      expect(
        tester.getSemantics(inactiveButton).flagsCollection.isSelected,
        Tristate.isFalse,
      );
      expect(tester.getSemantics(inactiveButton).value, 'Not active');
      expect(
        tester.getSemantics(activeButton).label,
        'Selected for activation: Companion',
      );
      expect(
        tester.getSemantics(activeButton).flagsCollection.isSelected,
        Tristate.isTrue,
      );
      expect(tester.getSemantics(activeButton).value, 'Currently active');
      expect(
        tester.getSemantics(inactiveButton).parent?.label,
        contains('Current activation status: Inactive'),
      );
      expect(
        tester.getSemantics(activeButton).parent?.label,
        contains('Current activation status: Active'),
      );
      expect(repository.activations, 0);
    },
  );

  testWidgets(
    'dirty exit defaults to Keep editing and returns focus without losing draft',
    (tester) async {
      final repository = _Repository();
      var exits = 0;
      await _pump(tester, repository, PersonaEditorPage(onBack: () => exits++));
      await tester.enterText(
        find.byKey(const Key('persona-name')),
        'Unsaved draft',
      );
      final back = find.byKey(const Key('persona-back'));
      await _focusByTraversal(tester, back);
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pumpAndSettle();
      expect(
        _ownsPrimaryFocus(
          tester,
          find.widgetWithText(TextButton, 'Keep editing'),
        ),
        isTrue,
      );
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pumpAndSettle();
      expect(exits, 0);
      expect(_ownsPrimaryFocus(tester, back), isTrue);
      expect(
        tester
            .widget<TextFormField>(find.byKey(const Key('persona-name')))
            .controller!
            .text,
        'Unsaved draft',
      );
    },
  );

  testWidgets('progress has a label and outcome feedback is a live region', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(home: Scaffold(body: PersonaLoading())),
    );
    await tester.pump();
    expect(find.bySemanticsLabel('Loading Personas'), findsOneWidget);
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: PersonaStatusPanel(
            state: PersonaSessionState(
              sessionKey: Object(),
              message: 'Your change was saved.',
            ),
            onReload: () {},
            onRetryCreate: () {},
            onEndCreate: () {},
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    final outcome = tester.getSemantics(find.byKey(const Key('persona-saved')));
    expect(outcome.flagsCollection.isLiveRegion, isTrue);
    expect(outcome.label, 'Your change was saved.');
  });
}

bool _ownsPrimaryFocus(WidgetTester tester, Finder owner) {
  final target = tester.element(owner);
  final context = FocusManager.instance.primaryFocus?.context;
  if (context == null) return false;
  if (identical(context, target)) return true;
  var found = false;
  context.visitAncestorElements((element) {
    if (identical(element, target)) {
      found = true;
      return false;
    }
    return true;
  });
  return found;
}

Future<void> _focusByTraversal(WidgetTester tester, Finder target) async {
  for (var attempt = 0; attempt < 16; attempt++) {
    if (_ownsPrimaryFocus(tester, target)) return;
    await tester.sendKeyEvent(LogicalKeyboardKey.tab);
    await tester.pumpAndSettle();
  }
  fail('The expected control was not reachable using keyboard traversal.');
}

Future<void> _tap(WidgetTester tester, String key) async {
  final finder = find.byKey(Key(key));
  await tester.ensureVisible(finder);
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

Future<void> _pump(
  WidgetTester tester,
  _Repository repository,
  Widget page,
) async {
  final session = PersonaSession(
    repository,
    newKey: () => '11111111-1111-4111-8111-111111111111',
  );
  addTearDown(session.dispose);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [personaSessionSourceProvider.overrideWithValue(session)],
      child: MaterialApp(home: page),
    ),
  );
  await tester.pumpAndSettle();
}

final _persona = Persona(
  personaId: 'a' * 64,
  fields: const PersonaFields(
    displayName: 'Guide',
    tone: PersonaTone.neutral,
    responseLength: PersonaResponseLength.balanced,
    formatStyle: PersonaFormatStyle.plain,
  ),
  createdAt: DateTime.utc(2026, 10, 9),
  updatedAt: DateTime.utc(2026, 10, 9),
  revision: 1,
);

final class _Repository implements PersonaRepository {
  _Repository({List<Persona>? items, this.activePersonaId})
    : items = items ?? [_persona];

  final List<Persona> items;
  final String? activePersonaId;
  int creates = 0;
  int activations = 0;
  int deletions = 0;
  @override
  Future<Result<PersonaCollection>> readAll({
    bool Function()? isEligible,
  }) async => Success(
    PersonaCollection(
      items: items,
      stateRevision: 1,
      activePersonaId: activePersonaId,
    ),
  );
  @override
  Future<Result<PersonaMutation>> readOne(
    String personaId, {
    bool Function()? isEligible,
  }) async => Success(PersonaMutation(persona: _persona, stateRevision: 1));
  @override
  PersonaCreateAttempt create(
    PersonaCreateCommand command, {
    required bool Function() isEligible,
  }) {
    creates++;
    throw StateError(
      'Validation should prevent submission in this focus test.',
    );
  }

  @override
  Future<Result<PersonaMutation>> edit(
    String personaId, {
    required PersonaFields fields,
    required int expectedRevision,
    required int expectedStateRevision,
    bool Function()? isEligible,
  }) async => throw StateError('This focus test never edits.');
  @override
  Future<Result<PersonaCollection>> activate(
    String personaId, {
    required int expectedRevision,
    required int expectedStateRevision,
    bool Function()? isEligible,
  }) async {
    activations++;
    return readAll();
  }

  @override
  Future<Result<void>> delete(
    String personaId, {
    required int expectedRevision,
    required int expectedStateRevision,
    bool Function()? isEligible,
  }) async {
    deletions++;
    return const Success(null);
  }
}
