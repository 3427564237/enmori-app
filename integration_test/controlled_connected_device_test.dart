import 'dart:io';

import 'package:enmori/controlled_phone_harness.dart' as candidate;
import 'package:enmori/features/ai_conversation/ai_conversation_providers.dart';
import 'package:enmori/features/account/presentation/account_preferences_controller.dart';
import 'package:enmori/features/personas/persona_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import '../test/support/ai_connected_repeat_journey.dart';

// Actual assigned-device entrypoint. Private runtime handoff is delivered by
// the host only after the candidate's own fresh readiness nonce is visible.
// No fake Auth, repository, compiler or model is supplied here.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('ongoing controlled candidate Settings, Persona and saved AI', (
    tester,
  ) async {
    if (!Platform.isAndroid) throw TestFailure('Assigned Android required.');
    await candidate.main();
    await _visible(
      tester,
      'ai-network-harness-banner',
      timeout: const Duration(minutes: 3),
    );
    await _until(tester, () => _state(tester).canSend);
    debugPrint('LI_CONNECTED_STAGE: observed_auth');
    await _tap(tester, 'ai-settings');
    await _visible(tester, 'route-settings');
    final settingsScope = ProviderScope.containerOf(
      tester.element(find.byKey(const Key('route-settings'))),
    );
    final settingsProvider = accountPreferencesControllerProvider(
      PreferencesView.settings,
    );
    await _until(
      tester,
      () =>
          settingsScope.read(settingsProvider).phase == PreferencesPhase.ready,
    );
    final beforeSettings = settingsScope.read(settingsProvider).settings!;
    final settingsList = find
        .descendant(
          of: find.byKey(const Key('route-settings')),
          matching: find.byType(Scrollable),
        )
        .first;
    final position = tester.state<ScrollableState>(settingsList).position;
    position.jumpTo(position.maxScrollExtent);
    await tester.pump();
    await _tap(tester, 'settings-save');
    await _until(tester, () => settingsScope.read(settingsProvider).saved);
    final savedSettings = settingsScope.read(settingsProvider).settings!;
    expect(savedSettings.checkInVisibility, beforeSettings.checkInVisibility);
    expect(savedSettings.consent, beforeSettings.consent);
    expect(savedSettings.revision, beforeSettings.revision + 1);
    position.jumpTo(position.maxScrollExtent);
    await _visible(tester, 'preferences-save-success');
    position.jumpTo(0);
    await tester.pump();
    await _tap(tester, 'settings-profile');
    await _visible(tester, 'profile-display-name');
    await _until(
      tester,
      () =>
          tester
              .widget<FilledButton>(find.byKey(const Key('profile-save')))
              .onPressed !=
          null,
    );
    await _back(tester, 'route-profile-edit');
    await _back(tester, 'route-settings');
    debugPrint('LI_CONNECTED_STAGE: settings_saved_profile_read');
    await _tap(tester, 'ai-personas');
    debugPrint('LI_CONNECTED_STAGE: personas_opened');
    await _visible(tester, 'persona-create');
    expect(find.byKey(const Key('persona-empty')), findsOneWidget);
    debugPrint('LI_CONNECTED_STAGE: personas_loaded');
    await _tap(tester, 'persona-create');
    await _visible(tester, 'persona-name');
    debugPrint('LI_CONNECTED_STAGE: persona_editor_opened');
    await tester.enterText(
      find.byKey(const Key('persona-name')),
      'Controlled mobile guide',
    );
    await _tap(tester, 'persona-save');
    debugPrint('LI_CONNECTED_STAGE: persona_create_requested');
    await _saved(tester, 'route-persona-create');
    debugPrint('LI_CONNECTED_STAGE: persona_saved');
    await _tap(tester, 'persona-back');
    debugPrint('LI_CONNECTED_STAGE: personas_returned');
    final scope = ProviderScope.containerOf(
      tester.element(find.byKey(const Key('route-persona-management'))),
    );
    final collection = scope.read(personaSessionControllerProvider).collection;
    expect(collection?.items.length, 1);
    debugPrint('LI_CONNECTED_STAGE: persona_created');
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
    debugPrint('LI_CONNECTED_STAGE: persona_active');
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
    debugPrint('LI_CONNECTED_STAGE: persona_edited');
    await _tap(tester, 'persona-back');
    await _visible(tester, 'ai-message-input');
    debugPrint('LI_CONNECTED_STAGE: ai_input_visible');
    await _until(tester, () => _state(tester).canSend);
    debugPrint('LI_CONNECTED_STAGE: ai_return_ready');

    // Exercise the same script in local HTTP fixtures and on the assigned
    // device. Fixtures never certify a model response or canonical storage.
    final accepted = await runAiConnectedRepeatJourney(
      tester,
      onStage: (stage) => debugPrint('ZHOU_CONNECTED_STAGE: $stage'),
    );
    debugPrint('ZHOU_CONNECTED_AI_TWO_ROUNDS_DELIVERED: Pass');

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
    expectAiConnectedHistory(_state(tester), accepted);
    // Persona navigation cleared the previous display. This comparison now
    // requires history fetched into a fresh view, rather than cached rows.
    debugPrint('ZHOU_CONNECTED_AI_TWO_ROUNDS_FRESH_VIEW_READBACK: Pass');
    debugPrint('LI_CONNECTED_AI_ACCEPTED_PERSISTED_READBACK: Pass');
    await _menu(tester, 'ai-delete');
    await _tap(tester, 'ai-confirm-delete');
    await _until(
      tester,
      () => _state(tester).phase == AiConversationPhase.deleted,
    );
    expect(_state(tester).messages, isEmpty);
    expect(tester.takeException(), isNull);
    debugPrint('LI_CONNECTED_STAGE: conversation_deleted');
    debugPrint(
      'LI_CONNECTED_PERSONA_DELETE_PRESERVES_HISTORY_AND_CONVERSATION_DELETE: Pass',
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

Future<void> _visible(
  WidgetTester tester,
  String key, {
  Duration timeout = const Duration(seconds: 30),
}) => _until(
  tester,
  () => find.byKey(Key(key)).evaluate().length == 1,
  timeout: timeout,
);

Future<void> _tap(WidgetTester tester, String key) async {
  // Real-device keyboard insets can keep ensureVisible's target outside the
  // hit-test area. Dismiss input and wait for the actual viewport to settle.
  FocusManager.instance.primaryFocus?.unfocus();
  await _until(tester, () => tester.view.viewInsets.bottom == 0);
  await _visible(tester, key);
  final target = find.byKey(Key(key));
  await tester.ensureVisible(target);
  await _until(tester, () {
    if (target.evaluate().length != 1 ||
        target.hitTestable().evaluate().isEmpty) {
      return false;
    }
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

Future<void> _back(WidgetTester tester, String routeKey) async {
  final page = find.byKey(Key(routeKey));
  await _until(tester, () {
    if (page.evaluate().length != 1) return false;
    final route = ModalRoute.of(tester.element(page));
    return route?.isCurrent == true && (route?.animation?.isCompleted ?? true);
  });
  final back = find.byType(BackButton).hitTestable();
  expect(back, findsOneWidget);
  await tester.tap(back);
  await tester.pumpAndSettle();
}
