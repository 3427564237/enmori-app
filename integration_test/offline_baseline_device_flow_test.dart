import 'dart:io';

import 'package:enmori/app/providers.dart';
import 'package:enmori/harness/social/offline_setup_auth_repository.dart';
import 'package:enmori/harness/social/offline_social_app.dart';
import 'package:enmori/harness/social/offline_social_pages.dart';
import 'package:enmori/harness/social/offline_social_store.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

// Assigned Android viewport and real IME only. Auth, AI and Note repositories
// remain the existing process-local synthetic preview; no service/model runs.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'offline baseline protects AI draft and confirms a Note through Footprint',
    (tester) async {
      expect(Platform.isAndroid, isTrue);
      final store = OfflineSocialStore();
      final auth = OfflineSetupAuthRepository(automaticallyObserve: false);
      addTearDown(store.dispose);
      addTearDown(auth.dispose);
      await tester.pumpWidget(
        OfflineSocialApp(store: store, accountSetup: true, setupAuth: auth),
      );
      // Never settle an unresolved startup spinner. Observe the normal signed
      // out surface first, then explicitly emit this synthetic session.
      await _unique(tester, find.byKey(const Key('route-sign-in')));
      expect(find.byType(OfflineSocialHub), findsNothing);
      auth.observeSampleSession();
      await _unique(tester, find.byType(OfflineSocialHub));
      final scope = ProviderScope.containerOf(
        tester.element(find.byType(OfflineSocialHub)),
      );
      expect(scope.read(backendBaseUriProvider), isNull);
      debugPrint('ENMORI_OFFLINE_STAGE home_ready');

      await _tapKey(tester, 'social-nav-ai');
      final input = find.byKey(const Key('ai-message-input'));
      await _unique(tester, input);
      const draft = 'An unsent synthetic device draft.';
      await tester.enterText(input, draft);
      // This is the assigned device's real keyboard metric, never a mocked
      // inset, forced viewport or test text-scale override.
      await _until(tester, () => tester.view.viewInsets.bottom > 0);
      debugPrint('ENMORI_OFFLINE_STAGE native_keyboard_observed');
      await _tapKey(tester, 'ai-personas');
      await _unique(tester, find.text('Discard unsaved changes?'));
      await _tap(tester, find.text('Keep editing'));
      expect(tester.widget<TextField>(input).controller!.text, draft);
      expect(find.byKey(const Key('route-persona-management')), findsNothing);
      await _tapKey(tester, 'ai-personas');
      await _tapKey(tester, 'ai-confirm-discard');
      await _unique(tester, find.byKey(const Key('route-persona-management')));
      await _tapKey(tester, 'persona-back');
      await _unique(tester, input);
      expect(tester.widget<TextField>(input).controller!.text, isEmpty);
      debugPrint('ENMORI_OFFLINE_STAGE draft_guard_and_return_pass');

      await _tapKey(tester, 'social-nav-home');
      await _tapKey(tester, 'social-nav-check-in');
      final noteInput = find.byKey(const Key('r6-check-in-note'));
      await _unique(tester, noteInput);
      const note = 'A synthetic moment saved during the Android baseline test.';
      final originalNotes = store.notes.length;
      await tester.enterText(noteInput, note);
      await _until(tester, () => tester.view.viewInsets.bottom > 0);
      await _tapKey(
        tester,
        'r6-check-in-create',
        scrollSurface: 'route-check-in',
      );
      await _atTop(tester, 'route-check-in');
      await _unique(tester, find.byKey(const Key('r6-check-in-committed')));
      expect(store.notes.length, originalNotes + 1);
      final savedId = store.notes.first.checkInId;
      expect(store.notes.first.note, note);
      await _tapKey(
        tester,
        'r6-check-in-confirm',
        scrollSurface: 'route-check-in',
      );
      await _atTop(tester, 'route-check-in');
      await _unique(tester, find.byKey(const Key('r6-check-in-confirmed')));
      expect(find.textContaining(note), findsOneWidget);
      expect(store.notes.length, originalNotes + 1);
      await _tapKey(
        tester,
        'r6-return-home-inline',
        scrollSurface: 'route-check-in',
      );
      await _unique(tester, find.byKey(const Key('social-tab-0')));
      debugPrint('ENMORI_OFFLINE_STAGE note_saved_and_confirmed');

      await _tap(tester, find.text('Footprint'), scrollSurface: 'social-tab-0');
      await _unique(tester, find.byKey(const Key('history-list')));
      expect(find.text('Footprint'), findsOneWidget);
      await _tapKey(tester, 'history-entry-$savedId');
      await _unique(
        tester,
        find.byKey(const Key('r6-saved-check-in-confirmed')),
      );
      expect(find.textContaining(note), findsOneWidget);
      await _tapKey(
        tester,
        'r6-return-home',
        scrollSurface: 'route-check-in-saved',
      );
      await _unique(tester, find.byKey(const Key('history-list')));
      expect(find.byKey(Key('history-entry-$savedId')), findsOneWidget);
      await _tap(tester, find.byTooltip('Back'));
      await _unique(tester, find.byKey(const Key('social-tab-0')));
      debugPrint('ENMORI_OFFLINE_STAGE footprint_read_and_back_pass');

      await _tapKey(tester, 'social-nav-me');
      await _unique(tester, find.byKey(const Key('social-tab-4')));
      await _tapKey(tester, 'social-settings');
      await _unique(tester, find.byKey(const Key('route-settings')));
      await _tap(tester, find.byTooltip('Back'));
      await _unique(tester, find.byKey(const Key('social-tab-4')));
      expect(scope.read(backendBaseUriProvider), isNull);
      expect(store.notes.length, originalNotes + 1);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      debugPrint('ENMORI_OFFLINE_STAGE baseline_journey_pass');
    },
    timeout: const Timeout(Duration(minutes: 5)),
  );
}

Future<void> _until(WidgetTester tester, bool Function() ready) async {
  final deadline = DateTime.now().add(const Duration(seconds: 30));
  while (true) {
    await tester.pump(const Duration(milliseconds: 100));
    if (ready()) return;
    if (DateTime.now().isAfter(deadline)) {
      throw TestFailure('The synthetic device journey did not reach its gate.');
    }
  }
}

Future<void> _unique(WidgetTester tester, Finder target) =>
    _until(tester, () => target.evaluate().length == 1);

Future<void> _hideKeyboard(WidgetTester tester) async {
  FocusManager.instance.primaryFocus?.unfocus();
  await _until(tester, () => tester.view.viewInsets.bottom == 0);
}

Finder _scrollable(String surface) => find
    .descendant(of: find.byKey(Key(surface)), matching: find.byType(Scrollable))
    .first;

Future<void> _atTop(WidgetTester tester, String surface) async {
  final scroll = _scrollable(surface);
  await _unique(tester, scroll);
  tester.state<ScrollableState>(scroll).position.jumpTo(0);
  await tester.pump(const Duration(milliseconds: 100));
}

Future<void> _tapKey(
  WidgetTester tester,
  String key, {
  String? scrollSurface,
}) => _tap(tester, find.byKey(Key(key)), scrollSurface: scrollSurface);

Future<void> _tap(
  WidgetTester tester,
  Finder target, {
  String? scrollSurface,
}) async {
  await _hideKeyboard(tester);
  if (scrollSurface != null) {
    await _atTop(tester, scrollSurface);
    if (target.evaluate().isEmpty) {
      await tester.scrollUntilVisible(
        target,
        200,
        scrollable: _scrollable(scrollSurface),
      );
    }
  }
  await _unique(tester, target);
  await tester.ensureVisible(target);
  await _until(tester, () {
    if (target.evaluate().length != 1 ||
        target.hitTestable().evaluate().length != 1) {
      return false;
    }
    return ModalRoute.of(tester.element(target))?.animation?.isCompleted ??
        true;
  });
  await tester.tap(target);
  await tester.pump();
}
