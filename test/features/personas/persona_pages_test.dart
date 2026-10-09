import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/personas/domain/persona.dart';
import 'package:enmori/features/personas/domain/persona_repository.dart';
import 'package:enmori/features/personas/persona_providers.dart';
import 'package:enmori/features/personas/presentation/persona_editor_page.dart';
import 'package:enmori/features/personas/presentation/persona_management_page.dart';
import 'package:enmori/features/personas/presentation/persona_overview_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('initial load failure never masquerades as empty or no Active', (
    tester,
  ) async {
    final repository = _Repository()..readFailure = _offline;
    await _pump(
      tester,
      repository,
      PersonaOverviewPage(onManage: () {}, onBack: () {}),
    );
    expect(
      find.text('Personas could not be loaded. Try again.'),
      findsOneWidget,
    );
    expect(find.byKey(const Key('persona-no-active')), findsNothing);
    expect(find.byKey(const Key('persona-empty')), findsNothing);
    repository.readFailure = null;
    await tester.tap(find.byKey(const Key('persona-retry')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('persona-no-active')), findsOneWidget);
  });

  testWidgets('selection and cancelled confirmation never activate', (
    tester,
  ) async {
    final repository = _Repository()..items.add(_persona('a'));
    var back = 0;
    await _pump(
      tester,
      repository,
      PersonaManagementPage(
        onCreate: () {},
        onEdit: (_) {},
        onBack: () => back++,
      ),
    );
    await tester.tap(find.byKey(Key('persona-select-${'a' * 64}')));
    await tester.pump();
    expect(repository.activations, 0);
    expect(find.text('Inactive'), findsOneWidget);
    expect(find.text('Selected'), findsOneWidget);
    await _tapVisible(tester, 'persona-activate');
    expect(
      find.text(
        'Activate this Persona? It will replace your current active selection.',
      ),
      findsOneWidget,
    );
    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();
    expect(repository.activations, 0);
    await tester.tap(find.byKey(const Key('persona-back')));
    expect(back, 1);
    expect(repository.activations, 0);
    await _tapVisible(tester, 'persona-activate');
    await tester.tap(find.byKey(const Key('persona-confirm-activate')));
    await tester.pumpAndSettle();
    expect(repository.activations, 1);
    expect(repository.reads, 2);
    expect(find.text('Active'), findsOneWidget);
  });

  testWidgets(
    'capacity disables create and delete Active needs explicit confirmation',
    (tester) async {
      final repository = _Repository()
        ..items.addAll([
          for (final id in ['a', 'b', 'c', 'd', 'e']) _persona(id),
        ])
        ..active = 'a' * 64;
      await _pump(
        tester,
        repository,
        PersonaManagementPage(onCreate: () {}, onEdit: (_) {}, onBack: () {}),
      );
      expect(
        find.text('You have 5 Personas. Delete one before creating another.'),
        findsOneWidget,
      );
      expect(
        tester
            .widget<FilledButton>(find.byKey(const Key('persona-create')))
            .onPressed,
        isNull,
      );
      await _tapVisible(tester, 'persona-delete-${'a' * 64}');
      expect(
        find.textContaining(
          'You will have no active Persona until you activate another.',
        ),
        findsOneWidget,
      );
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();
      expect(repository.deletions, 0);
      await _tapVisible(tester, 'persona-delete-${'a' * 64}');
      await tester.tap(find.byKey(const Key('persona-confirm-delete')));
      await tester.pumpAndSettle();
      expect(repository.deletions, 1);
      expect(repository.active, isNull);
      expect(repository.items, hasLength(4));
      expect(repository.reads, 2);
    },
  );

  for (final deleting in [false, true]) {
    testWidgets(
      '${deleting ? 'delete' : 'activation'} rechecks the reviewed set after confirmation',
      (tester) async {
        final repository = _Repository()..items.add(_persona('a'));
        final container = await _pump(
          tester,
          repository,
          PersonaManagementPage(onCreate: () {}, onEdit: (_) {}, onBack: () {}),
        );
        if (!deleting) {
          await _tapVisible(tester, 'persona-select-${'a' * 64}');
          await _tapVisible(tester, 'persona-activate');
        } else {
          await _tapVisible(tester, 'persona-delete-${'a' * 64}');
          expect(
            find.textContaining('You will have no active Persona'),
            findsNothing,
          );
        }
        repository.active = 'a' * 64;
        repository.revision++;
        await container.read(personaSessionControllerProvider.notifier).load();
        await tester.pump();
        await tester.tap(
          find.byKey(
            Key(
              deleting ? 'persona-confirm-delete' : 'persona-confirm-activate',
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(repository.deletions, 0);
        expect(repository.activations, 0);
        expect(
          find.text('Your Personas changed. Reload them before trying again.'),
          findsOneWidget,
        );
        await _tapVisible(tester, 'persona-confirmation-reload');
        if (deleting) {
          await _tapVisible(tester, 'persona-delete-${'a' * 64}');
          expect(
            find.textContaining(
              'You will have no active Persona until you activate another.',
            ),
            findsOneWidget,
          );
          await tester.tap(find.text('Cancel'));
          await tester.pumpAndSettle();
        }
      },
    );
  }

  testWidgets(
    'create uses structured defaults, validates name and independently rereads',
    (tester) async {
      final repository = _Repository();
      await _pump(tester, repository, PersonaEditorPage(onBack: () {}));
      expect(find.text('neutral'), findsOneWidget);
      expect(find.text('balanced'), findsOneWidget);
      expect(find.text('plain'), findsOneWidget);
      expect(
        tester
            .widget<TextFormField>(find.byKey(const Key('persona-name')))
            .controller!
            .text,
        isEmpty,
      );
      await _tapVisible(tester, 'persona-save');
      expect(
        find.text(
          'Enter a name of 1–50 characters without control characters.',
        ),
        findsOneWidget,
      );
      expect(repository.creates, isEmpty);
      await tester.enterText(
        find.byKey(const Key('persona-name')),
        '  Friendly 🌿  ',
      );
      await _tapVisible(tester, 'persona-save');
      expect(repository.creates, hasLength(1));
      expect(repository.creates.single.fields.displayName, 'Friendly 🌿');
      expect(repository.creates.single.fields.tone, PersonaTone.neutral);
      expect(
        repository.creates.single.fields.responseLength,
        PersonaResponseLength.balanced,
      );
      expect(
        repository.creates.single.fields.formatStyle,
        PersonaFormatStyle.plain,
      );
      expect(repository.reads, 2);
      expect(repository.active, isNull);
      expect(find.byKey(const Key('persona-saved')), findsOneWidget);
      expect(
        tester
            .widget<FilledButton>(find.byKey(const Key('persona-save')))
            .onPressed,
        isNull,
      );
    },
  );

  testWidgets(
    'dirty Back supports keep editing and discard without a request',
    (tester) async {
      final repository = _Repository();
      var back = 0;
      await _pump(tester, repository, PersonaEditorPage(onBack: () => back++));
      await tester.enterText(find.byKey(const Key('persona-name')), 'Unsaved');
      await tester.tap(find.byKey(const Key('persona-back')));
      await tester.pumpAndSettle();
      expect(find.text('Discard unsaved changes?'), findsOneWidget);
      await tester.tap(find.text('Keep editing'));
      await tester.pumpAndSettle();
      expect(back, 0);
      await tester.tap(find.byKey(const Key('persona-back')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('persona-confirm-discard')));
      await tester.pumpAndSettle();
      expect(back, 1);
      expect(repository.creates, isEmpty);
    },
  );

  testWidgets(
    'in-flight leave does not cancel session command or update disposed view',
    (tester) async {
      final foreground = Completer<Result<PersonaMutation>>();
      final completion = Completer<Result<PersonaMutation>>();
      final repository = _Repository()
        ..nextAttempt = PersonaCreateAttempt(
          foreground: foreground.future,
          completion: completion.future,
          wasDispatched: () => true,
        );
      var back = 0;
      final container = await _pump(
        tester,
        repository,
        PersonaEditorPage(onBack: () => back++),
      );
      await tester.enterText(find.byKey(const Key('persona-name')), 'Late');
      await tester.ensureVisible(find.byKey(const Key('persona-save')));
      await tester.tap(find.byKey(const Key('persona-save')));
      await tester.pump();
      expect(
        tester
            .widget<FilledButton>(find.byKey(const Key('persona-save')))
            .onPressed,
        isNull,
      );
      await tester.tap(find.byKey(const Key('persona-back')));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 250));
      expect(
        find.text('The request may still complete. Leave this screen?'),
        findsOneWidget,
      );
      await tester.tap(find.byKey(const Key('persona-confirm-leave')));
      await tester.pump();
      expect(back, 1);
      await tester.pumpWidget(const SizedBox.shrink());
      final persona = _persona('a', name: 'Late');
      repository.items.add(persona);
      repository.revision = 1;
      final result = Success(
        PersonaMutation(persona: persona, stateRevision: 1),
      );
      completion.complete(result);
      foreground.complete(result);
      await tester.pump();
      expect(
        container.read(personaSessionControllerProvider).lastConfirmedCreateKey,
        repository.creates.single.idempotencyKey,
      );
      expect(
        container.read(personaSessionControllerProvider).collection?.items,
        hasLength(1),
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'uncertain create recovery 412 closes retry and requires explicit disposition',
    (tester) async {
      final completion = Completer<Result<PersonaMutation>>();
      final repository = _Repository()
        ..nextAttempt = PersonaCreateAttempt(
          foreground: Future.value(const Failure(_offline)),
          completion: completion.future,
          wasDispatched: () => true,
        );
      await _pump(tester, repository, PersonaEditorPage(onBack: () {}));
      await tester.enterText(find.byKey(const Key('persona-name')), 'Pending');
      await _tapVisible(tester, 'persona-save');
      expect(find.byKey(const Key('persona-retry-create')), findsOneWidget);
      expect(
        tester
            .widget<TextFormField>(find.byKey(const Key('persona-name')))
            .enabled,
        isFalse,
      );
      final conflict = Future<Result<PersonaMutation>>.value(
        const Failure(
          AppFailure(
            kind: AppFailureKind.personaRevisionPreconditionFailed,
            message: 'conflict',
          ),
        ),
      );
      repository.nextAttempt = PersonaCreateAttempt(
        foreground: conflict,
        completion: conflict,
        wasDispatched: () => true,
      );
      await _tapVisible(tester, 'persona-retry-create');
      expect(repository.creates, hasLength(2));
      expect(identical(repository.creates[0], repository.creates[1]), isTrue);
      expect(find.byKey(const Key('persona-retry-create')), findsNothing);
      expect(
        find.text(
          'Your Personas changed, so this request can no longer be recovered. Review your Personas before starting a new create.',
        ),
        findsOneWidget,
      );
      repository.items.add(_persona('b', name: 'Saved before review'));
      repository.active = 'b' * 64;
      repository.revision = 2;
      await _tapVisible(tester, 'persona-reload');
      expect(find.byKey(const Key('persona-end-create')), findsOneWidget);
      expect(find.byKey(const Key('persona-reconciled-set')), findsOneWidget);
      expect(find.text('Saved before review'), findsOneWidget);
      expect(find.text('Active'), findsOneWidget);
      expect(
        tester
            .widget<FilledButton>(find.byKey(const Key('persona-save')))
            .onPressed,
        isNull,
      );
      await _tapVisible(tester, 'persona-end-create');
      expect(
        tester
            .widget<TextFormField>(find.byKey(const Key('persona-name')))
            .controller!
            .text,
        isEmpty,
      );
      expect(
        tester
            .widget<FilledButton>(find.byKey(const Key('persona-save')))
            .onPressed,
        isNotNull,
      );
      completion.complete(const Failure(_offline));
      await tester.pump();
      expect(find.byKey(const Key('persona-retry-create')), findsNothing);
    },
  );

  testWidgets(
    'late create success updates a mounted form after rendering and leaves it clean',
    (tester) async {
      final completion = Completer<Result<PersonaMutation>>();
      final repository = _Repository()
        ..nextAttempt = PersonaCreateAttempt(
          foreground: Future.value(const Failure(_offline)),
          completion: completion.future,
          wasDispatched: () => true,
        );
      var back = 0;
      await _pump(tester, repository, PersonaEditorPage(onBack: () => back++));
      await tester.enterText(
        find.byKey(const Key('persona-name')),
        '  Late form  ',
      );
      await _tapVisible(tester, 'persona-save');
      final persona = _persona('a', name: 'Late form');
      repository.items.add(persona);
      repository.revision = 1;
      completion.complete(
        Success(PersonaMutation(persona: persona, stateRevision: 1)),
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(
        tester
            .widget<TextFormField>(find.byKey(const Key('persona-name')))
            .controller!
            .text,
        'Late form',
      );
      expect(
        tester
            .widget<FilledButton>(find.byKey(const Key('persona-save')))
            .onPressed,
        isNull,
      );
      await tester.tap(find.byKey(const Key('persona-back')));
      expect(back, 1);
      expect(find.text('Discard unsaved changes?'), findsNothing);
    },
  );

  testWidgets(
    'empty reconciliation still displays accepted empty and no-Active states',
    (tester) async {
      final completion = Completer<Result<PersonaMutation>>();
      final repository = _Repository()
        ..nextAttempt = PersonaCreateAttempt(
          foreground: Future.value(const Failure(_offline)),
          completion: completion.future,
          wasDispatched: () => true,
        );
      await _pump(tester, repository, PersonaEditorPage(onBack: () {}));
      await tester.enterText(find.byKey(const Key('persona-name')), 'Unknown');
      await _tapVisible(tester, 'persona-save');
      await _tapVisible(tester, 'persona-reload');
      expect(find.byKey(const Key('persona-reconciled-set')), findsOneWidget);
      expect(find.text('You have no Personas yet.'), findsOneWidget);
      expect(
        find.text(
          'No Persona is active. Future AI requests use default presentation until you activate one.',
        ),
        findsOneWidget,
      );
      expect(
        find.textContaining('Ending this request does not mean it failed.'),
        findsOneWidget,
      );
      completion.complete(const Failure(_offline));
      await tester.pump();
    },
  );

  testWidgets(
    'same UID new observed session clears the previous private draft',
    (tester) async {
      final auth = StreamController<AuthSession>();
      addTearDown(auth.close);
      final repository = _Repository();
      final container = ProviderContainer(
        overrides: [
          authSessionProvider.overrideWith((ref) => auth.stream),
          personaRepositoryProvider.overrideWithValue(repository),
        ],
      );
      addTearDown(container.dispose);
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(home: PersonaEditorPage(onBack: () {})),
        ),
      );
      auth.add(const AuthSessionAuthenticated(subject: 'synthetic-owner'));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const Key('persona-name')),
        'Owner draft',
      );
      final oldKey = container
          .read(personaSessionControllerProvider)
          .sessionKey;
      auth.add(const AuthSessionUnauthenticated());
      await tester.pumpAndSettle();
      auth.add(const AuthSessionAuthenticated(subject: 'synthetic-owner'));
      await tester.pumpAndSettle();
      expect(
        container.read(personaSessionControllerProvider).sessionKey,
        isNot(same(oldKey)),
      );
      expect(
        tester
            .widget<TextFormField>(find.byKey(const Key('persona-name')))
            .controller!
            .text,
        isEmpty,
      );
    },
  );

  testWidgets('edit unavailable target reveals no previous private fields', (
    tester,
  ) async {
    final repository = _Repository();
    await _pump(
      tester,
      repository,
      PersonaEditorPage(personaId: 'a' * 64, onBack: () {}),
    );
    expect(find.text('This Persona is unavailable.'), findsOneWidget);
    expect(find.byKey(const Key('persona-name')), findsNothing);
    expect(find.text('Back to Personas'), findsOneWidget);
  });

  testWidgets(
    'edit saves explicit fields and keeps successful form clean on Back',
    (tester) async {
      final repository = _Repository()..items.add(_persona('a'));
      var back = 0;
      await _pump(
        tester,
        repository,
        PersonaEditorPage(personaId: 'a' * 64, onBack: () => back++),
      );
      await tester.enterText(find.byKey(const Key('persona-name')), 'Edited');
      await _tapVisible(tester, 'persona-save');
      expect(repository.edits, 1);
      expect(repository.items.single.fields.displayName, 'Edited');
      expect(repository.reads, 2);
      await tester.tap(find.byKey(const Key('persona-back')));
      expect(back, 1);
      expect(find.text('Discard unsaved changes?'), findsNothing);
    },
  );

  testWidgets(
    'small phone, landscape, dark mode and enlarged text stay scrollable',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(375, 667));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      final repository = _Repository();
      await _pump(
        tester,
        repository,
        PersonaEditorPage(onBack: () {}),
        textScale: 2,
        dark: true,
      );
      expect(tester.takeException(), isNull);
      await tester.enterText(
        find.byKey(const Key('persona-name')),
        'Accessible',
      );
      await tester.ensureVisible(find.byKey(const Key('persona-save')));
      expect(tester.takeException(), isNull);
      await tester.binding.setSurfaceSize(const Size(667, 375));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.byKey(const Key('persona-save')));
      expect(tester.takeException(), isNull);
      final semantics = tester.ensureSemantics();
      await tester.binding.setSurfaceSize(const Size(375, 667));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('persona-back')), findsOneWidget);
      await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
      await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
      semantics.dispose();
    },
  );
}

Future<ProviderContainer> _pump(
  WidgetTester tester,
  _Repository repository,
  Widget page, {
  double textScale = 1,
  bool dark = false,
}) async {
  final session = PersonaSession(
    repository,
    newKey: () => '12345678-1234-4234-8234-123456789012',
  );
  final container = ProviderContainer(
    overrides: [personaSessionSourceProvider.overrideWithValue(session)],
  );
  addTearDown(container.dispose);
  addTearDown(session.dispose);
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp(
        theme: dark ? ThemeData.dark() : ThemeData.light(),
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(
            textScaler: TextScaler.linear(textScale),
            disableAnimations: true,
          ),
          child: child!,
        ),
        home: page,
      ),
    ),
  );
  await tester.pumpAndSettle();
  return container;
}

Future<void> _tapVisible(WidgetTester tester, String key) async {
  final finder = find.byKey(Key(key));
  await tester.ensureVisible(finder);
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

const _offline = AppFailure(
  kind: AppFailureKind.serviceUnavailable,
  message: 'offline',
);

Persona _persona(String id, {String name = 'Sample', int revision = 0}) =>
    Persona(
      personaId: id * 64,
      fields: PersonaFields(
        displayName: name,
        tone: PersonaTone.neutral,
        responseLength: PersonaResponseLength.balanced,
        formatStyle: PersonaFormatStyle.plain,
      ),
      createdAt: DateTime.utc(2026, 10, 9),
      updatedAt: DateTime.utc(2026, 10, 9),
      revision: revision,
    );

final class _Repository implements PersonaRepository {
  final items = <Persona>[];
  String? active;
  int revision = 0;
  int reads = 0;
  int activations = 0;
  int deletions = 0;
  int edits = 0;
  AppFailure? readFailure;
  PersonaCreateAttempt? nextAttempt;
  final creates = <PersonaCreateCommand>[];

  PersonaCollection get collection => PersonaCollection(
    items: items,
    stateRevision: revision,
    activePersonaId: active,
  );

  @override
  Future<Result<PersonaCollection>> readAll({
    bool Function()? isEligible,
  }) async {
    reads++;
    final failure = readFailure;
    return failure == null ? Success(collection) : Failure(failure);
  }

  @override
  Future<Result<PersonaMutation>> readOne(
    String personaId, {
    bool Function()? isEligible,
  }) async {
    final target = items.where((p) => p.personaId == personaId).firstOrNull;
    return target == null
        ? const Failure(
            AppFailure(
              kind: AppFailureKind.personaUnavailable,
              message: 'missing',
            ),
          )
        : Success(PersonaMutation(persona: target, stateRevision: revision));
  }

  @override
  PersonaCreateAttempt create(
    PersonaCreateCommand command, {
    required bool Function() isEligible,
  }) {
    creates.add(command);
    if (nextAttempt case final attempt?) return attempt;
    final persona = _persona('a', name: command.fields.displayName);
    items.add(persona);
    revision++;
    final result = Future<Result<PersonaMutation>>.value(
      Success(PersonaMutation(persona: persona, stateRevision: revision)),
    );
    return PersonaCreateAttempt(
      foreground: result,
      completion: result,
      wasDispatched: () => true,
    );
  }

  @override
  Future<Result<PersonaMutation>> edit(
    String personaId, {
    required PersonaFields fields,
    required int expectedRevision,
    required int expectedStateRevision,
    bool Function()? isEligible,
  }) async {
    edits++;
    final index = items.indexWhere((p) => p.personaId == personaId);
    final old = items[index];
    final updated = Persona(
      personaId: personaId,
      fields: fields,
      createdAt: old.createdAt,
      updatedAt: old.updatedAt,
      revision: expectedRevision + 1,
    );
    items[index] = updated;
    revision++;
    return Success(PersonaMutation(persona: updated, stateRevision: revision));
  }

  @override
  Future<Result<PersonaCollection>> activate(
    String personaId, {
    required int expectedRevision,
    required int expectedStateRevision,
    bool Function()? isEligible,
  }) async {
    activations++;
    active = personaId;
    revision++;
    return Success(collection);
  }

  @override
  Future<Result<void>> delete(
    String personaId, {
    required int expectedRevision,
    required int expectedStateRevision,
    bool Function()? isEligible,
  }) async {
    deletions++;
    items.removeWhere((p) => p.personaId == personaId);
    if (active == personaId) active = null;
    revision++;
    return const Success(null);
  }
}
