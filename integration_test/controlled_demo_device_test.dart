import 'dart:convert';
import 'dart:io';

import 'package:enmori/controlled_demo.dart' as candidate;
import 'package:enmori/features/ai_conversation/ai_conversation_providers.dart';
import 'package:enmori/features/check_in/presentation/check_in_history_controller.dart';
import 'package:enmori/features/event_browse/domain/activity_repository.dart';
import 'package:enmori/features/event_browse/presentation/activity_controller.dart';
import 'package:enmori/features/event_browse/presentation/activity_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

// Actual dedicated-device acceptance. No injected Auth/HTTP/repository/model.
// The private test-only command file schedules host-owned controls; it grants
// neither Backend enable authority nor an authenticated application session.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('controlled demo saved Note, real AI and Activity lifetime', (
    tester,
  ) async {
    if (!Platform.isAndroid) throw TestFailure('Assigned Android required.');
    candidate.main();
    await visible(tester, 'route-home', const Duration(minutes: 3));
    stage('observed_home');

    await tap(tester, 'edit-interests-button');
    await visible(tester, 'route-interests');
    await until(
      tester,
      () => find.byType(CheckboxListTile).evaluate().isNotEmpty,
    );
    final option = find.byType(CheckboxListTile).first;
    await tester.ensureVisible(option);
    await tester.tap(option);
    await tap(tester, 'interest-save');
    await visible(tester, 'interest-save-success');
    await tap(tester, 'interest-done');
    await visible(tester, 'route-home');
    stage('interests_saved');

    await tap(tester, 'home-friends');
    await visible(tester, 'route-friends');
    await tap(tester, 'open-my-friends');
    await visible(tester, 'route-my-friends');
    await tester.enterText(
      find.byKey(const Key('my-friends-search-query')),
      'guide',
    );
    await tap(tester, 'my-friends-search');
    await until(
      tester,
      () =>
          find
              .text('No matching friends in this page.')
              .evaluate()
              .isNotEmpty ||
          find.textContaining('No matching').evaluate().isNotEmpty,
    );
    await back(tester);
    await back(tester);
    await visible(tester, 'route-home');
    stage('empty_friend_search');

    const note = 'I read a book today.';
    await tap(tester, 'r6-new-check-in-button');
    await visible(tester, 'r6-check-in-note');
    await tester.enterText(find.byKey(const Key('r6-check-in-note')), note);
    await tap(tester, 'r6-check-in-create');
    await visible(tester, 'r6-check-in-committed');
    await tap(tester, 'r6-check-in-confirm');
    await visible(tester, 'r6-check-in-confirmed');
    await tap(tester, 'r6-return-home-inline');
    await visible(tester, 'route-home');
    await tap(tester, 'home-check-in-history');
    await visible(tester, 'history-device-zone');
    final historyScope = scope(tester, 'history-device-zone');
    await until(
      tester,
      () =>
          historyScope.read(checkInHistoryControllerProvider).phase ==
          CheckInHistoryPhase.ready,
    );
    final history = historyScope.read(checkInHistoryControllerProvider);
    expect(history.entries.length, 1);
    expect(history.entries.single.checkIn.note, note);
    expect(history.ianaZone, isNotEmpty);
    final savedId = history.entries.single.checkIn.checkInId;
    await tap(tester, 'history-entry-$savedId');
    await visible(tester, 'r6-saved-check-in-confirmed');
    await tap(tester, 'r6-return-home');
    // The accepted saved-return flow may return to retained History.
    if (find.byKey(const Key('route-home')).evaluate().isEmpty) {
      await back(tester);
    }
    await visible(tester, 'route-home');
    stage('checkin_footprint_saved_read');
    await command(tester, 'host-note-baseline');

    await tap(tester, 'home-ai-conversation');
    await visible(tester, 'ai-message-input');
    final aiScope = scope(tester, 'route-ai-conversation');
    await until(
      tester,
      () => aiScope.read(aiConversationControllerProvider).canSend,
    );
    await tester.enterText(find.byKey(const Key('ai-message-input')), note);
    await tap(tester, 'ai-send');
    stage('real_note_send_requested');
    await until(
      tester,
      () => !const {
        AiConversationPhase.preparing,
        AiConversationPhase.waiting,
      }.contains(aiScope.read(aiConversationControllerProvider).phase),
      const Duration(seconds: 70),
    );
    final accepted = aiScope.read(aiConversationControllerProvider);
    expect(accepted.phase, AiConversationPhase.success);
    expect(accepted.messages.length, 2);
    expect(accepted.messages.last.availability, AiAvailability.available);
    expect(accepted.messages.last.text, isNotEmpty);
    final ids = accepted.messages.map((m) => m.messageId).toList();
    await tap(tester, 'ai-reload-messages');
    await until(
      tester,
      () => !aiScope.read(aiConversationControllerProvider).readBusy,
    );
    expect(
      aiScope
          .read(aiConversationControllerProvider)
          .messages
          .map((m) => m.messageId)
          .toList(),
      ids,
    );
    expect(
      aiScope.read(aiConversationControllerProvider).messages.last.text,
      accepted.messages.last.text,
    );
    stage('real_note_pair_readback');
    await command(tester, 'host-note-readback');
    await tap(tester, 'ai-delete');
    await tap(tester, 'ai-confirm-delete');
    await until(
      tester,
      () =>
          aiScope.read(aiConversationControllerProvider).phase ==
          AiConversationPhase.deleted,
    );
    expect(aiScope.read(aiConversationControllerProvider).messages, isEmpty);
    await tap(tester, 'ai-back');
    await visible(tester, 'route-home');

    stage('ready_for_event');
    final eventCommand = await command(tester, 'event-enabled');
    await tap(tester, 'home-browse-activities');
    await until(tester, () => find.byType(ActivityPage).evaluate().isNotEmpty);
    final activityScope = ProviderScope.containerOf(
      tester.element(find.byType(ActivityPage).last),
    );
    await until(tester, () {
      final state = activityScope.read(activityControllerProvider(''));
      return state.hasError || state.value is ActivityBatch;
    });
    final batchState = activityScope.read(activityControllerProvider(''));
    expect(batchState.hasError, isFalse);
    final batch = batchState.value as ActivityBatch;
    expect(batch.items, isNotEmpty);
    expect(
      find.textContaining('Activity requests pass through ENMORI'),
      findsOneWidget,
    );
    final first = batch.items.first;
    final tile = find.widgetWithText(ListTile, first.title).first;
    await tester.ensureVisible(tile);
    await tester.tap(tile);
    await tester.pump();
    await until(
      tester,
      () =>
          activityScope.read(activityControllerProvider(first.browseId)).value
              is ActivityDetail,
    );
    final detailProvider = activityControllerProvider(first.browseId);
    final detail = activityScope.read(detailProvider).value as ActivityDetail;
    expect(detail.summary.browseId, first.browseId);
    expect(detail.summary.title, first.title);
    final staleOpen = activityScope.read(detailProvider.notifier);
    final openButton = find.widgetWithText(
      FilledButton,
      'View on Ticketmaster',
    );
    await tester.ensureVisible(openButton);
    expect(
      find.textContaining('Opening or copying a link does not register'),
      findsOneWidget,
    );
    stage('real_event_detail');
    if (eventCommand['browserAllowed'] == true) {
      await tester.tap(openButton);
      await tester.pump();
      stage('browser_dispatched');
      await command(tester, 'browser-returned');
      expect(activityScope.read(detailProvider).value, isNull);
    } else {
      stage('browser_not_run_use_condition');
    }
    stage('ready_for_disable');
    await command(tester, 'event-disabled');
    // Explicitly dispose the assigned view; disable alone does not erase it.
    await back(tester);
    await back(tester);
    await visible(tester, 'route-home');
    expect(await staleOpen.sourceAction(open: true), isNull);
    await tap(tester, 'home-browse-activities');
    await until(tester, () => find.byType(ActivityPage).evaluate().isNotEmpty);
    final refusedScope = ProviderScope.containerOf(
      tester.element(find.byType(ActivityPage).last),
    );
    await until(
      tester,
      () => refusedScope.read(activityControllerProvider('')).hasError,
    );
    expect(find.widgetWithText(ListTile, first.title), findsNothing);
    expect(find.text('View on Ticketmaster'), findsNothing);
    expect(tester.takeException(), isNull);
    stage('disabled_client_clear_stale_action');
    await tester.pumpWidget(const SizedBox.shrink());
    stage('complete');
  });
}

ProviderContainer scope(WidgetTester tester, String key) =>
    ProviderScope.containerOf(tester.element(find.byKey(Key(key))));

void stage(String value) {
  File('${Directory.systemTemp.path}/li-demo-stage.json')
      .writeAsStringSync(jsonEncode({'schemaVersion': 1, 'stage': value}));
  debugPrint('LI_DEMO_STAGE: $value');
}

Future<Map<String, dynamic>> command(
  WidgetTester tester,
  String expected,
) async {
  final file = File('${Directory.systemTemp.path}/li-demo-command.json');
  Map<String, dynamic>? value;
  await until(tester, () {
    if (!file.existsSync()) return false;
    final parsed = jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
    if (parsed['stage'] != expected) {
      return false;
    }
    value = parsed;
    file.deleteSync();
    return true;
  }, const Duration(minutes: 2));
  return value!;
}

Future<void> until(
  WidgetTester tester,
  bool Function() condition, [
  Duration timeout = const Duration(seconds: 30),
]) async {
  final deadline = DateTime.now().add(timeout);
  while (true) {
    await tester.pump(const Duration(milliseconds: 100));
    if (condition()) return;
    if (DateTime.now().isAfter(deadline)) {
      throw TestFailure(
        'Controlled demo did not reach its non-content checkpoint.',
      );
    }
  }
}

Future<void> visible(
  WidgetTester tester,
  String key, [
  Duration timeout = const Duration(seconds: 30),
]) => until(tester, () => find.byKey(Key(key)).evaluate().length == 1, timeout);

Future<void> tap(WidgetTester tester, String key) async {
  FocusManager.instance.primaryFocus?.unfocus();
  await until(tester, () => tester.view.viewInsets.bottom == 0);
  await visible(tester, key);
  final target = find.byKey(Key(key));
  await tester.ensureVisible(target);
  await until(
    tester,
    () =>
        target.hitTestable().evaluate().isNotEmpty &&
        (ModalRoute.of(tester.element(target))?.animation?.isCompleted ?? true),
  );
  await tester.tap(target);
  await tester.pump();
}

Future<void> back(WidgetTester tester) async {
  final target = find.byType(BackButton).hitTestable();
  await until(
    tester,
    () =>
        target.evaluate().length == 1 &&
        (ModalRoute.of(tester.element(target))?.animation?.isCompleted ?? true),
  );
  await tester.tap(target);
  await tester.pumpAndSettle();
}
