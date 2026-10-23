import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:enmori/app/enmori_theme.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/personas/domain/persona.dart';
import 'package:enmori/features/personas/domain/persona_repository.dart';
import 'package:enmori/features/personas/persona_providers.dart';
import 'package:enmori/features/personas/persona_preview_providers.dart';
import 'package:enmori/features/personas/domain/persona_preview_repository.dart';
import 'package:enmori/features/personas/presentation/persona_editor_page.dart';
import 'package:enmori/features/personas/presentation/persona_management_page.dart';
import 'package:enmori/features/personas/presentation/persona_overview_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets(
    'Chinese Persona actions and current deletion warning preserve identity',
    (tester) async {
      final repository = _Repository()
        ..items.add(_persona('a'))
        ..active = 'a' * 64;
      await _pump(
        tester,
        repository,
        PersonaManagementPage(onCreate: () {}, onEdit: (_) {}, onBack: () {}),
        locale: const Locale('zh'),
      );
      expect(find.text('管理人设'), findsOneWidget);
      expect(find.text('语气: 自然'), findsOneWidget);
      await _tapVisible(tester, 'persona-more-${'a' * 64}');
      await tester.tap(find.text('删除人设'));
      await tester.pumpAndSettle();
      expect(find.textContaining('删除后将使用默认表达'), findsOneWidget);
      await tester.tap(find.text('取消'));
      await tester.pumpAndSettle();
      expect(repository.deletions, 0);
      expect(repository.active, 'a' * 64);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets('More options edits or opens the existing delete confirmation', (
    tester,
  ) async {
    final repository = _Repository()..items.add(_persona('a'));
    String? edited;
    await _pump(
      tester,
      repository,
      PersonaManagementPage(
        onCreate: () {},
        onEdit: (id) => edited = id,
        onBack: () {},
      ),
    );
    await _tapVisible(tester, 'persona-more-${'a' * 64}');
    await tester.tap(find.text('Edit Persona'));
    await tester.pumpAndSettle();
    expect(edited, 'a' * 64);
    await _tapVisible(tester, 'persona-more-${'a' * 64}');
    await tester.tap(find.text('Delete Persona'));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('persona-confirm-delete')), findsOneWidget);
    await tester.tap(find.widgetWithText(TextButton, 'Cancel'));
    await tester.pumpAndSettle();
    expect(repository.deletions, 0);
  });
  testWidgets(
    'all approved fields save, reread and reopen with current draft preview isolated',
    (tester) async {
      if (Platform.environment['ENMORI_AI_CAPTURE'] != null) {
        tester.view.physicalSize = const Size(390, 844);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final path = Platform.environment['ENMORI_AI_CAPTURE_FONT'];
        final bytes = path == null
            ? null
            : await tester.runAsync(() => File(path).readAsBytes());
        for (final (family, asset) in [
          (
            'Playfair Display',
            'assets/fonts/playfair_display/PlayfairDisplay[wght].ttf',
          ),
          ('MaterialIcons', 'fonts/MaterialIcons-Regular.otf'),
        ]) {
          await tester.runAsync(() {
            final loader = FontLoader(family)..addFont(rootBundle.load(asset));
            if (family == 'Playfair Display' && bytes != null) {
              loader.addFont(Future.value(ByteData.sublistView(bytes)));
            }
            return loader.load();
          });
        }
        if (bytes != null) {
          await tester.runAsync(
            () => (FontLoader(
              'Roboto',
            )..addFont(Future.value(ByteData.sublistView(bytes)))).load(),
          );
        }
      }
      final repository = _Repository();
      final preview = _ImmediatePreview();
      var previewAllowed = true;
      final language = ValueNotifier(const Locale('zh'));
      addTearDown(language.dispose);
      final auth = StreamController<AuthSession>();
      final container = ProviderContainer(
        overrides: [
          authSessionProvider.overrideWith((ref) => auth.stream),
          personaRepositoryProvider.overrideWithValue(repository),
          personaPreviewAccessProvider.overrideWith((ref) => previewAllowed),
          personaPreviewRepositoryProvider.overrideWithValue(preview),
        ],
      );
      addTearDown(() {
        container.dispose();
        unawaited(auth.close());
      });
      final authSub = container.listen(authSessionProvider, (_, _) {});
      addTearDown(authSub.close);
      auth.add(AuthSessionAuthenticated(subject: 'synthetic-owner'));
      await container.pump();
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: RepaintBoundary(
            key: const Key('persona-capture'),
            child: ValueListenableBuilder(
              valueListenable: language,
              builder: (context, locale, _) => MaterialApp(
                debugShowCheckedModeBanner: false,
                theme: enmoriTheme(),
                locale: locale,
                localizationsDelegates: GlobalMaterialLocalizations.delegates,
                supportedLocales: const [Locale('en'), Locale('zh')],
                home: PersonaEditorPage(onBack: () {}),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('创建人设'), findsWidgets);
      await tester.enterText(
        find.byKey(const Key('persona-name')),
        'Full draft',
      );
      final values = {
        'relationship': 'Companion',
        'shortIntroduction': 'A small step at a time',
        'description': 'A calm guide',
        'personality': 'Curious',
        'communicationStyle': 'Use examples',
        'interests': 'Handmade interests',
        'extraInstructions': 'Ask one question',
      };
      for (final entry in values.entries) {
        await tester.pumpAndSettle();
        final field = find.byKey(Key('persona-${entry.key}'));
        await tester.ensureVisible(field);
        await tester.pumpAndSettle();
        await tester.enterText(field, entry.value);
      }
      await _tapVisible(tester, 'persona-preview');
      expect(find.text('试聊人设'), findsOneWidget);
      await tester.enterText(
        find.byKey(const Key('persona-preview-input')),
        'Hello preview',
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('persona-preview-send')));
      await tester.pumpAndSettle();
      expect(preview.draft?.expressionFields, values);
      expect(repository.creates, isEmpty);
      expect(repository.activations, 0);
      expect(repository.items, isEmpty);
      await _capturePersona(tester, 'persona-preview-zh');
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      language.value = const Locale('en');
      await tester.pumpAndSettle();
      expect(find.text('Create Persona'), findsWidgets);
      for (final entry in values.entries) {
        expect(
          tester
              .widget<TextFormField>(find.byKey(Key('persona-${entry.key}')))
              .controller!
              .text,
          entry.value,
        );
      }
      // Reuse the same trial message after editing; each try gets the new
      // unsaved fields and has no implicit create/activation/history effect.
      values['communicationStyle'] = 'One short question';
      final style = find.byKey(const Key('persona-communicationStyle'));
      await tester.ensureVisible(style);
      await tester.enterText(style, values['communicationStyle']!);
      await _tapVisible(tester, 'persona-preview-quick');
      final previewInput = find.byKey(const Key('persona-preview-input'));
      expect(
        tester.widget<TextFormField>(previewInput).controller!.text,
        'Hello preview',
      );
      expect(find.text('A synthetic preview'), findsNothing);
      await _tapVisible(tester, 'persona-preview-send');
      expect(preview.draft?.communicationStyle, 'One short question');
      expect(preview.text, 'Hello preview');
      expect(repository.creates, isEmpty);
      expect(repository.activations, 0);
      await _tapVisible(tester, 'persona-preview-edit');
      previewAllowed = false;
      container.invalidate(personaPreviewAccessProvider);
      await tester.pumpAndSettle();
      previewAllowed = true;
      container.invalidate(personaPreviewAccessProvider);
      await tester.pumpAndSettle();
      await _tapVisible(tester, 'persona-preview-quick');
      expect(
        tester.widget<TextFormField>(previewInput).controller!.text,
        isEmpty,
      );
      await tester.pageBack();
      await tester.pumpAndSettle();
      await _tapVisible(tester, 'persona-save');
      expect(repository.creates.single.fields.expressionFields, values);
      expect(repository.items.single.fields.expressionFields, values);
      expect(repository.active, isNull);
      expect(repository.reads, greaterThan(1));
      final saved = repository.items.single;
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            home: PersonaEditorPage(personaId: saved.personaId, onBack: () {}),
          ),
        ),
      );
      await tester.pumpAndSettle();
      for (final entry in values.entries) {
        expect(
          tester
              .widget<TextFormField>(find.byKey(Key('persona-${entry.key}')))
              .controller!
              .text,
          entry.value,
        );
      }
      expect(tester.takeException(), isNull);
    },
  );
  for (final signOut in [false, true]) {
    for (final deleting in [false, true]) {
      testWidgets(
        'session-owned Persona ${deleting ? 'delete' : 'activation'} closes after signOut=$signOut',
        (tester) async {
          final repository = _Repository()..items.add(_persona('a'));
          var back = 0;
          final observed = await _pumpObservedSession(
            tester,
            repository,
            PersonaManagementPage(
              onCreate: () {},
              onEdit: (_) {},
              onBack: () => back++,
            ),
          );
          final action = deleting ? 'delete' : 'activate';
          Future<void> openConfirmation() async {
            if (!deleting) {
              await _tapVisible(tester, 'persona-select-${'a' * 64}');
            }
            await _tapVisible(
              tester,
              deleting ? 'persona-delete-${'a' * 64}' : 'persona-activate',
            );
          }

          await openConfirmation();
          final confirm = find.byKey(Key('persona-confirm-$action'));
          final staleAction = tester.widget<FilledButton>(confirm).onPressed!;
          await _replaceObservedSession(tester, observed, signOut: signOut);
          expect(confirm, findsNothing);
          expect(repository.activations, 0);
          expect(repository.deletions, 0);
          expect(back, 0);

          // A retained callback belongs to the old dialog, even while a fresh
          // confirmation for the replacement session is now on top.
          await openConfirmation();
          staleAction();
          await tester.pumpAndSettle();
          expect(confirm, findsOneWidget);
          expect(repository.activations, 0);
          expect(repository.deletions, 0);
          await tester.tap(confirm);
          await tester.pumpAndSettle();
          expect(repository.activations, deleting ? 0 : 1);
          expect(repository.deletions, deleting ? 1 : 0);
          expect(back, 0);
          expect(tester.takeException(), isNull);
        },
      );
    }

    testWidgets('session-owned Persona discard closes after signOut=$signOut', (
      tester,
    ) async {
      final repository = _Repository();
      var back = 0;
      final observed = await _pumpObservedSession(
        tester,
        repository,
        PersonaEditorPage(onBack: () => back++),
      );
      final name = find.byKey(const Key('persona-name'));
      await tester.enterText(name, 'Old session draft');
      await _tapVisible(tester, 'persona-back');
      final confirm = find.byKey(const Key('persona-confirm-discard'));
      final staleAction = tester.widget<FilledButton>(confirm).onPressed!;
      await _replaceObservedSession(tester, observed, signOut: signOut);
      expect(confirm, findsNothing);
      expect(tester.widget<TextFormField>(name).controller!.text, isEmpty);
      expect(back, 0);
      expect(repository.creates, isEmpty);

      await tester.enterText(name, 'New session draft');
      await _tapVisible(tester, 'persona-back');
      staleAction();
      await tester.pumpAndSettle();
      expect(confirm, findsOneWidget);
      expect(back, 0);
      expect(
        tester.widget<TextFormField>(name).controller!.text,
        'New session draft',
      );
      await tester.tap(confirm);
      await tester.pumpAndSettle();
      expect(back, 1);
      expect(repository.creates, isEmpty);
      expect(tester.takeException(), isNull);
    });

    for (final page in ['overview', 'management', 'editor']) {
      for (final busy in [false, true]) {
        testWidgets(
          'session-owned Persona $page ${busy ? 'busy' : 'pending'} exit closes after signOut=$signOut',
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
            final surface = switch (page) {
              'overview' => PersonaOverviewPage(
                onManage: () {},
                onBack: () => back++,
              ),
              'management' => PersonaManagementPage(
                onCreate: () {},
                onEdit: (_) {},
                onBack: () => back++,
              ),
              _ => PersonaEditorPage(onBack: () => back++),
            };
            final observed = await _pumpObservedSession(
              tester,
              repository,
              surface,
            );
            final request = observed.$1
                .read(personaSessionControllerProvider.notifier)
                .create(_persona('b').fields);
            if (!busy) foreground.complete(const Failure(_offline));
            await tester.pump();
            expect(
              observed.$1.read(personaSessionControllerProvider).isBusy,
              busy,
            );
            expect(
              observed.$1.read(personaSessionControllerProvider).pendingCreate,
              isNotNull,
            );
            await tester.tap(find.byKey(const Key('persona-back')));
            await tester.pump();
            await tester.pump(const Duration(milliseconds: 250));
            final confirm = find.byKey(const Key('persona-confirm-leave'));
            final staleAction = tester.widget<FilledButton>(confirm).onPressed!;
            await _replaceObservedSession(tester, observed, signOut: signOut);
            expect(confirm, findsNothing);
            staleAction();
            if (busy) foreground.complete(const Failure(_offline));
            completion.complete(const Failure(_offline));
            await request;
            await tester.pumpAndSettle();
            expect(back, 0);
            expect(repository.creates, hasLength(1));
            expect(repository.activations, 0);
            expect(repository.deletions, 0);
            expect(repository.edits, 0);
            expect(
              observed.$1.read(personaSessionControllerProvider).pendingCreate,
              isNull,
            );
            await _tapVisible(tester, 'persona-back');
            expect(back, 1);
            expect(tester.takeException(), isNull);
          },
        );
      }
    }
  }

  testWidgets(
    'session-owned Persona removes only its dialog below a newer route',
    (tester) async {
      final repository = _Repository();
      var back = 0;
      final page = ValueNotifier<Widget>(
        PersonaEditorPage(onBack: () => back++),
      );
      addTearDown(page.dispose);
      final observed = await _pumpObservedSession(
        tester,
        repository,
        ValueListenableBuilder<Widget>(
          valueListenable: page,
          builder: (_, value, _) => value,
        ),
      );
      await tester.enterText(
        find.byKey(const Key('persona-name')),
        'Old session draft',
      );
      await _tapVisible(tester, 'persona-back');
      final navigator = tester.state<NavigatorState>(find.byType(Navigator));
      unawaited(
        navigator.push(
          MaterialPageRoute<void>(
            builder: (_) => const Scaffold(body: Text('Unrelated new route')),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await _replaceObservedSession(tester, observed, signOut: false);
      // Teardown may be scheduled by app composition while an unrelated route
      // is above the dialog. Cleanup must target the owned route, not the top.
      page.value = const SizedBox.shrink();
      await tester.pumpAndSettle();
      expect(find.text('Unrelated new route'), findsOneWidget);
      expect(
        find.byKey(const Key('persona-confirm-discard'), skipOffstage: false),
        findsNothing,
      );
      navigator.pop();
      await tester.pumpAndSettle();
      expect(find.byType(AlertDialog), findsNothing);
      page.value = PersonaEditorPage(onBack: () => back++);
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('persona-name')), findsOneWidget);
      expect(back, 0);
      expect(repository.creates, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );

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
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.byKey(const Key('persona-save')));
      await tester.pumpAndSettle();
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

Future<void> _capturePersona(WidgetTester tester, String name) async {
  final output = Platform.environment['ENMORI_AI_CAPTURE'];
  if (output == null) return;
  FocusManager.instance.primaryFocus?.unfocus();
  await tester.pumpAndSettle();
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(const Key('persona-capture')),
  );
  final bitmap = await tester.runAsync(() => boundary.toImage(pixelRatio: 1));
  final bytes = await tester.runAsync(
    () => bitmap!.toByteData(format: ui.ImageByteFormat.png),
  );
  await tester.runAsync(() async {
    await Directory(output).create(recursive: true);
    await File('$output/$name.png').writeAsBytes(bytes!.buffer.asUint8List());
  });
  bitmap!.dispose();
}

Future<ProviderContainer> _pump(
  WidgetTester tester,
  _Repository repository,
  Widget page, {
  double textScale = 1,
  bool dark = false,
  Locale locale = const Locale('en'),
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
        locale: locale,
        localizationsDelegates: GlobalMaterialLocalizations.delegates,
        supportedLocales: const [Locale('en'), Locale('zh')],
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

Future<(ProviderContainer, StreamController<AuthSession>)> _pumpObservedSession(
  WidgetTester tester,
  _Repository repository,
  Widget page,
) async {
  final auth = StreamController<AuthSession>();
  final container = ProviderContainer(
    overrides: [
      authSessionProvider.overrideWith((ref) => auth.stream),
      personaRepositoryProvider.overrideWithValue(repository),
    ],
  );
  addTearDown(auth.close);
  addTearDown(container.dispose);
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp(home: page),
    ),
  );
  auth.add(const AuthSessionAuthenticated(subject: 'synthetic-owner'));
  await tester.pumpAndSettle();
  return (container, auth);
}

Future<void> _replaceObservedSession(
  WidgetTester tester,
  (ProviderContainer, StreamController<AuthSession>) observed, {
  required bool signOut,
}) async {
  final oldKey = observed.$1.read(personaSessionControllerProvider).sessionKey;
  final auth = observed.$2;
  auth.add(
    signOut
        ? const AuthSessionUnauthenticated()
        : AuthSessionAuthenticated(subject: 'synthetic-owner'),
  );
  await tester.pumpAndSettle();
  expect(
    observed.$1.read(personaSessionControllerProvider).sessionKey,
    isNot(same(oldKey)),
  );
  if (signOut) {
    expect(find.byType(AlertDialog, skipOffstage: false), findsNothing);
    auth.add(const AuthSessionAuthenticated(subject: 'synthetic-owner'));
    await tester.pumpAndSettle();
  }
}

Future<void> _tapVisible(WidgetTester tester, String key) async {
  final finder = find.byKey(Key(key));
  await tester.pumpAndSettle();
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

const _offline = AppFailure(
  kind: AppFailureKind.serviceUnavailable,
  message: 'offline',
);

Persona _persona(
  String id, {
  String name = 'Sample',
  int revision = 0,
  PersonaFields? fields,
}) => Persona(
  personaId: id * 64,
  fields:
      fields ??
      PersonaFields(
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
    final persona = _persona('a', fields: command.fields);
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

final class _ImmediatePreview implements PersonaPreviewRepository {
  PersonaFields? draft;
  String? text;
  @override
  Future<Result<String>> preview({
    required PersonaFields draft,
    required String text,
    required bool Function() isEligible,
  }) async {
    this.draft = draft;
    this.text = text;
    return const Success('A synthetic preview');
  }
}
