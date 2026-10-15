import 'dart:io';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/ai_conversation/ai_conversation_providers.dart';
import 'package:enmori/features/auth/data/firebase_auth_repository.dart';
import 'package:enmori/features/personas/persona_providers.dart';
import 'package:enmori/harness/ai_conversation/ai_network_harness_app.dart';
import 'package:enmori/harness/ai_conversation/controlled_mobile_fixture_configuration.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/io_client.dart';
import 'package:integration_test/integration_test.dart';

// This target requires the explicit run-owned HTTPS Backend, real Auth/Firestore
// Emulators and selected real model fixture. No mock, synthetic transport or
// default Firebase project is composed here. Absent prerequisites fail the test.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('controlled Android Auth, AI readback and Persona journey', (
    tester,
  ) async {
    if (!Platform.isAndroid) {
      throw TestFailure(
        'This target requires an assigned Android test device.',
      );
    }
    debugPrint('ZHOU_MOBILE_RUNTIME_CONFIGURATION_REQUIRED');
    final configurationFile = File(
      '${Directory.systemTemp.path}/${ControlledMobileFixtureConfiguration.cacheFileName}',
    );
    addTearDown(() async {
      if (await configurationFile.exists()) await configurationFile.delete();
    });
    final delivered = DateTime.now().add(const Duration(seconds: 60));
    while (!await configurationFile.exists()) {
      if (DateTime.now().isAfter(delivered)) {
        throw TestFailure('Runtime-only controlled fixture was not delivered.');
      }
      await Future<void>.delayed(const Duration(milliseconds: 100));
    }
    final configuration = await ControlledMobileFixtureConfiguration.consume(
      configurationFile,
    );
    debugPrint('ZHOU_MOBILE_STAGE: config_consumed');
    final firebase = await Firebase.initializeApp(
      name: 'zhou-mobile-controlled',
      options: const FirebaseOptions(
        apiKey: 'controlled-emulator-key',
        appId: '1:1234567890:android:controlledtest',
        messagingSenderId: '1234567890',
        projectId: ControlledMobileFixtureConfiguration.projectId,
      ),
    );
    debugPrint('ZHOU_MOBILE_STAGE: firebase_ready');
    addTearDown(firebase.delete);
    final firebaseAuth = FirebaseAuth.instanceFor(app: firebase);
    await firebaseAuth.useAuthEmulator(
      configuration.baseUri.host,
      9099,
      automaticHostMapping: false,
    );
    debugPrint('ZHOU_MOBILE_STAGE: auth_emulator');
    final auth = FirebaseAuthRepository(firebaseAuth);
    addTearDown(auth.signOut);
    final trust = SecurityContext(withTrustedRoots: false)
      ..setTrustedCertificatesBytes(configuration.certificate);
    final client = IOClient(HttpClient(context: trust));
    addTearDown(client.close);
    await tester.pumpWidget(
      AiNetworkHarnessApp(
        baseUri: configuration.baseUri,
        auth: auth,
        client: client,
        environmentLabel: 'Run-owned Auth/Firestore; real Qwen9B fixture',
        onOpenSettings: () {},
      ),
    );
    // Mount the sole app-owned observer before the ordinary sign-in command.
    await tester.pump();
    debugPrint('ZHOU_MOBILE_STAGE: harness_mounted');
    final signedIn = await configuration.signIn(auth);
    expect(signedIn is Success<void>, isTrue);
    debugPrint('ZHOU_MOBILE_STAGE: signed_in');
    await _until(tester, () => _state(tester).canSend);
    debugPrint('ZHOU_MOBILE_STAGE: ai_ready');
    await _tap(tester, 'ai-personas');
    debugPrint('ZHOU_MOBILE_STAGE: personas_opened');
    await _visible(tester, 'persona-create');
    expect(find.byKey(const Key('persona-empty')), findsOneWidget);
    debugPrint('ZHOU_MOBILE_STAGE: personas_loaded');
    await _tap(tester, 'persona-create');
    await _visible(tester, 'persona-name');
    debugPrint('ZHOU_MOBILE_STAGE: persona_editor_opened');
    await tester.enterText(
      find.byKey(const Key('persona-name')),
      'Controlled mobile guide',
    );
    await _tap(tester, 'persona-save');
    debugPrint('ZHOU_MOBILE_STAGE: persona_create_requested');
    await _saved(tester, 'route-persona-create');
    debugPrint('ZHOU_MOBILE_STAGE: persona_saved');
    await _tap(tester, 'persona-back');
    debugPrint('ZHOU_MOBILE_STAGE: personas_returned');
    final scope = ProviderScope.containerOf(
      tester.element(find.byKey(const Key('route-persona-management'))),
    );
    final collection = scope.read(personaSessionControllerProvider).collection;
    expect(collection?.items.length, 1);
    debugPrint('ZHOU_MOBILE_STAGE: persona_created');
    final persona = collection!.items.single;
    await _tap(tester, 'persona-select-${persona.personaId}');
    await _tap(tester, 'persona-activate');
    await _tap(tester, 'persona-confirm-activate');
    await _until(
      tester,
      () =>
          scope
              .read(personaSessionControllerProvider)
              .collection
              ?.activePersonaId ==
          persona.personaId,
    );
    debugPrint('ZHOU_MOBILE_STAGE: persona_active');
    await _tap(tester, 'persona-edit-${persona.personaId}');
    await _visible(tester, 'persona-name');
    await tester.enterText(
      find.byKey(const Key('persona-name')),
      'Edited controlled mobile guide',
    );
    await _tap(tester, 'persona-save');
    await _saved(tester, 'route-persona-edit');
    await _tap(tester, 'persona-back');
    await _visible(tester, 'persona-edit-${persona.personaId}');
    final edited = scope.read(personaSessionControllerProvider).collection!;
    expect(edited.items.single.revision, 2);
    expect(edited.stateRevision, 3);
    expect(edited.activePersonaId == persona.personaId, isTrue);
    debugPrint('ZHOU_MOBILE_STAGE: persona_edited');
    await _tap(tester, 'persona-back');
    await _visible(tester, 'ai-message-input');

    // Exact harmless routine lies inside the reviewed bounded semantic grammar.
    // The test never supplies an expected model reply or repairs its output.
    const input = 'I read a book today.';
    await tester.enterText(find.byKey(const Key('ai-message-input')), input);
    await _tap(tester, 'ai-send');
    debugPrint('ZHOU_MOBILE_STAGE: send_requested');
    await _until(
      tester,
      () => !const {
        AiConversationPhase.preparing,
        AiConversationPhase.waiting,
      }.contains(_state(tester).phase),
      timeout: const Duration(seconds: 65),
    );
    final accepted = _state(tester);
    expect(accepted.phase, AiConversationPhase.success);
    expect(accepted.messages.length, 2);
    expect(accepted.messages.first.role, AiRole.user);
    expect(accepted.messages.last.role, AiRole.assistant);
    expect(accepted.messages.last.availability, AiAvailability.available);
    expect(accepted.messages.last.text?.isNotEmpty, isTrue);
    final ids = accepted.messages.map((message) => message.messageId).toList();
    await _menu(tester, 'ai-reload-messages');
    await _until(tester, () => !_state(tester).readBusy);
    expect(
      listEquals(
        _state(tester).messages.map((message) => message.messageId).toList(),
        ids,
      ),
      isTrue,
    );
    expect(_state(tester).messages.last.availability, AiAvailability.available);
    debugPrint('ZHOU_MOBILE_STAGE: ai_readback');
    debugPrint('ZHOU_MOBILE_AI_ACCEPTED_PERSISTED_READBACK: Pass');

    await _tap(tester, 'ai-personas');
    await _visible(tester, 'persona-edit-${persona.personaId}');
    await _tap(tester, 'persona-edit-${persona.personaId}');
    await _visible(tester, 'persona-name');
    await tester.enterText(
      find.byKey(const Key('persona-name')),
      'Unsaved controlled draft',
    );
    await _tap(tester, 'persona-back');
    await _visible(tester, 'persona-confirm-discard');
    await _tap(tester, 'persona-confirm-discard');
    await _tap(tester, 'persona-delete-${persona.personaId}');
    await _tap(tester, 'persona-confirm-delete');
    await _visible(tester, 'persona-empty');
    expect(
      scope.read(personaSessionControllerProvider).collection?.activePersonaId,
      isNull,
    );
    await _tap(tester, 'persona-back');
    await _visible(tester, 'ai-conversation-actions');
    await _menu(tester, 'ai-reload-messages');
    await _until(tester, () => !_state(tester).readBusy);
    // Q19: deletion after accepted delivery must not rewrite historical A.
    // Deleting a used Persona during generation is a separate late-A barrier.
    expect(_state(tester).messages.last.messageId == ids.last, isTrue);
    expect(_state(tester).messages.last.availability, AiAvailability.available);
    expect(
      _state(tester).messages.last.text == accepted.messages.last.text,
      isTrue,
    );
    await _menu(tester, 'ai-delete');
    await _tap(tester, 'ai-confirm-delete');
    await _until(
      tester,
      () => _state(tester).phase == AiConversationPhase.deleted,
    );
    expect(_state(tester).messages, isEmpty);
    expect(tester.takeException(), isNull);
    debugPrint('ZHOU_MOBILE_STAGE: conversation_deleted');
    debugPrint(
      'ZHOU_MOBILE_PERSONA_DELETE_PRESERVES_HISTORY_AND_CONVERSATION_DELETE: Pass',
    );
    await tester.pumpWidget(const SizedBox.shrink());
  });
}

AiConversationState _state(WidgetTester tester) => ProviderScope.containerOf(
  tester.element(find.byKey(const Key('ai-network-harness-banner'))),
).read(aiConversationControllerProvider);

Future<void> _until(
  WidgetTester tester,
  bool Function() condition, {
  Duration timeout = const Duration(seconds: 30),
}) async {
  final deadline = DateTime.now().add(timeout);
  while (true) {
    await tester.pump(const Duration(milliseconds: 100));
    if (condition()) return;
    if (DateTime.now().isAfter(deadline)) {
      throw TestFailure(
        'The controlled network journey did not reach its gate.',
      );
    }
  }
}

Future<void> _visible(WidgetTester tester, String key) =>
    _until(tester, () => find.byKey(Key(key)).evaluate().isNotEmpty);

Future<void> _tap(WidgetTester tester, String key) async {
  // Real-device keyboard insets can keep ensureVisible's target outside the
  // hit-test area. Dismiss input and wait for the actual viewport to settle.
  FocusManager.instance.primaryFocus?.unfocus();
  await _until(tester, () => tester.view.viewInsets.bottom == 0);
  await _visible(tester, key);
  final target = find.byKey(Key(key));
  await tester.ensureVisible(target);
  await _until(tester, () {
    if (target.hitTestable().evaluate().isEmpty) return false;
    final route = ModalRoute.of(tester.element(target));
    return route?.animation?.isCompleted ?? true;
  });
  await tester.tap(target);
  await tester.pump();
}

Future<void> _saved(WidgetTester tester, String surface) async {
  // The success panel is a separate lazy-list child above the form. Restore
  // that viewport before waiting for the original success assertion.
  final scrollable = find
      .descendant(
        of: find.byKey(Key(surface)),
        matching: find.byType(Scrollable),
      )
      .first;
  tester.state<ScrollableState>(scrollable).position.jumpTo(0);
  await _visible(tester, 'persona-saved');
}

Future<void> _menu(WidgetTester tester, String key) async {
  await _tap(tester, 'ai-conversation-actions');
  await _tap(tester, key);
}
