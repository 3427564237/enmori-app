import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/account_preferences_providers.dart';
import 'package:enmori/features/account/domain/account_preferences_repository.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/ai_conversation/ai_conversation_providers.dart';
import 'package:enmori/features/ai_conversation/domain/ai_selected_reply.dart';
import 'package:enmori/features/ai_conversation/presentation/ai_conversation_page.dart';
import 'package:enmori/features/ai_conversation/presentation/ai_selected_sources_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'ai_selected_test_support.dart';

void main() {
  testWidgets(
    'an explicit owned-detail route adds only that ID alongside existing choices and keeps the draft',
    (tester) async {
      final r = await SelectedRig.create(tester, existingTopic: true);
      r.add('already');
      r.add('requested');
      await r.sources.chooseOwned('already');
      r.ai.updateDraft(
        const TextEditingValue(text: 'Keep the existing draft'),
        sessionKey: r.aiState.sessionKey,
      );
      await _pump(tester, r, initialCheckInId: 'requested');
      expect(find.byType(AiSelectedSourcesPage), findsOneWidget);
      expect(r.sourceState.selectedIds, {'already', 'requested'});
      expect(r.checkIns.ownReads, contains('requested'));
      expect(r.repo.selectedPrepares, isEmpty);
      expect(r.repo.selectedExecutes, isEmpty);
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('ai-message-input')))
            .controller!
            .text,
        'Keep the existing draft',
      );
      await _dispose(tester, r);
    },
  );

  testWidgets(
    'detail route during unknown only offers attachment after original no-effect readback and another explicit tap',
    (tester) async {
      final r = await SelectedRig.create(tester);
      r.add('requested');
      r.ai.updateDraft(
        const TextEditingValue(text: 'Original unknown input'),
        sessionKey: r.aiState.sessionKey,
      );
      await r.sources.review();
      r.sources.confirm(r.sourceState.review!.selectionRevision);
      r.repo.nextExecute = Future.value(const Failure(selectedUnknown));
      await r.sources.send('Original unknown input');
      await _pump(tester, r, initialCheckInId: 'requested');
      expect(find.byType(AiSelectedSourcesPage), findsNothing);
      expect(r.checkIns.ownReads, isEmpty);
      expect(
        tester
            .widget<TextButton>(
              find.byKey(const Key('ai-attach-requested-check-in')),
            )
            .onPressed,
        isNull,
      );
      r.repo.nextReadback = Future.value(
        const Success(
          AiReadback(
            operationId: 'operation-1',
            state: AiOutcomeState.noEffect,
          ),
        ),
      );
      await r.ai.checkResult();
      await tester.pumpAndSettle();
      expect(find.byType(AiSelectedSourcesPage), findsNothing);
      expect(r.checkIns.ownReads, isEmpty);
      await _tap(tester, 'ai-attach-requested-check-in');
      expect(r.sourceState.selectedIds, {'requested'});
      expect(r.repo.selectedPrepares, hasLength(1));
      expect(r.repo.selectedExecutes, hasLength(1));
      expect(r.ai.draft.text, 'Original unknown input');
      await _dispose(tester, r);
    },
  );

  testWidgets(
    'same-UID replacement cannot replay the old detail-route attachment intent',
    (tester) async {
      final r = await SelectedRig.create(tester);
      r.add('requested');
      await r.sources.review();
      r.sources.confirm(r.sourceState.review!.selectionRevision);
      r.repo.nextExecute = Future.value(const Failure(selectedUnknown));
      await r.sources.send('An unresolved old operation');
      await _pump(tester, r, initialCheckInId: 'requested');
      expect(r.checkIns.ownReads, isEmpty);
      r.auth.sessions.add(AuthSessionAuthenticated(subject: 'selected-owner'));
      await tester.pump();
      r.container
          .read(accountSettingsSnapshotProvider.notifier)
          .observe(
            const OwnSettings(
              checkInVisibility: CheckInVisibility.private,
              consent: OptionalProcessingConsent.accepted,
              revision: 2,
            ),
          );
      await tester.pumpAndSettle();
      expect(r.aiState.canSend, isTrue);
      expect(r.sourceState.selectedIds, isEmpty);
      expect(r.checkIns.ownReads, isEmpty);
      expect(find.byType(AiSelectedSourcesPage), findsNothing);
      expect(
        tester
            .widget<TextButton>(
              find.byKey(const Key('ai-attach-requested-check-in')),
            )
            .onPressed,
        isNull,
      );
      expect(r.repo.selectedExecutes, hasLength(1));
      await _dispose(tester, r);
    },
  );
  testWidgets(
    'captured Confirm and Exclude cannot act on a different fresh unseen revision',
    (tester) async {
      final r = await SelectedRig.create(tester);
      r.repo.pairs = (n) => [
        AiPreparedHistoryPair(
          historyKey: 'history-$n',
          userMessageId: 'past-user',
          assistantMessageId: 'past-assistant',
          userSequence: 1,
          assistantSequence: 2,
        ),
      ];
      await _pump(tester, r);
      await _tap(tester, 'ai-references');
      await _tap(tester, 'ai-selected-review');
      await _visible(tester, 'ai-review-exclude-history');
      final staleExclude = tester
          .widget<OutlinedButton>(
            find.byKey(const Key('ai-review-exclude-history')),
          )
          .onPressed!;
      await _visible(tester, 'ai-review-confirm');
      final staleConfirm = tester
          .widget<FilledButton>(find.byKey(const Key('ai-review-confirm')))
          .onPressed!;
      await _tap(tester, 'ai-review-refresh');
      expect(r.repo.selectedPrepares, hasLength(2));
      staleConfirm();
      staleExclude();
      await tester.pumpAndSettle();
      expect(find.byType(AiSelectedSourcesPage), findsOneWidget);
      expect(r.sourceState.confirmed, isFalse);
      expect(r.sourceState.excludedHistoryKeys, isEmpty);
      expect(r.repo.selectedPrepares, hasLength(2));
      expect(r.repo.selectedExecutes, isEmpty);
      await _tap(tester, 'ai-review-confirm');
      expect(find.byType(AiSelectedSourcesPage), findsNothing);
      expect(r.sourceState.confirmed, isTrue);
      expect(r.repo.selectedExecutes, isEmpty);
      await _dispose(tester, r);
    },
  );
  testWidgets(
    'two AI pages retain one current draft and selection while the covered Send stays fenced',
    (tester) async {
      final r = await SelectedRig.create(tester, existingTopic: true);
      r.add('owned');
      final navigator = GlobalKey<NavigatorState>();
      await _pump(tester, r, navigator: navigator);
      final input = find.byKey(const Key('ai-message-input'));
      await tester.enterText(input, 'Original draft');
      await _tap(tester, 'ai-references');
      await _tap(tester, 'ai-select-owned');
      await _tap(tester, 'ai-selected-review');
      await _tap(tester, 'ai-review-confirm');
      final staleSend = tester
          .widget<FilledButton>(find.byKey(const Key('ai-send')))
          .onPressed!;
      final recordEditor = TextEditingController(
        text: 'Other record editor stays intact',
      );
      unawaited(
        navigator.currentState!.push<void>(
          MaterialPageRoute(
            builder: (_) => Scaffold(
              body: TextField(
                controller: recordEditor,
                key: const Key('other-record-editor'),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      unawaited(
        navigator.currentState!.push<void>(
          MaterialPageRoute(
            builder: (_) => AiConversationPage(
              onBack: () => navigator.currentState!.pop(),
              onOpenSettings: () {},
              socialStyle: true,
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.enterText(input, 'Draft from the current page');
      tester.widget<TextField>(input).controller!.selection =
          const TextSelection(baseOffset: 2, extentOffset: 11);
      final expected = r.ai.draft;
      staleSend();
      await tester.pump();
      expect(r.repo.selectedExecutes, isEmpty);
      navigator.currentState!.pop();
      await tester.pumpAndSettle();
      expect(recordEditor.text, 'Other record editor stays intact');
      navigator.currentState!.pop();
      await tester.pumpAndSettle();
      expect(tester.widget<TextField>(input).controller!.value, expected);
      expect(r.sourceState.selectedIds, {'owned'});
      expect(r.sources.canSend, isTrue);
      expect(r.repo.selectedExecutes, isEmpty);
      recordEditor.dispose();
      await _dispose(tester, r);
    },
  );
  testWidgets(
    'picker back keeps choices and exact draft; confirmation returns without sending; only explicit Send executes',
    (tester) async {
      final r = await SelectedRig.create(tester);
      r.add('owned');
      await _pump(tester, r);
      final input = find.byKey(const Key('ai-message-input'));
      await tester.enterText(input, 'My unsent question');
      tester.widget<TextField>(input).controller!.selection =
          const TextSelection(baseOffset: 3, extentOffset: 9);
      await tester.pump();
      final expected = r.ai.draft;
      final staleSend = tester
          .widget<FilledButton>(find.byKey(const Key('ai-send')))
          .onPressed!;
      await _tap(tester, 'ai-references');
      expect(r.sourceState.selectedIds, isEmpty);
      expect(r.repo.selectedPrepares, isEmpty);
      expect(r.repo.selectedExecutes, isEmpty);
      await _tap(tester, 'ai-select-owned');
      expect(find.text('Private location never shown'), findsNothing);
      expect(find.text('Own note owned'), findsOneWidget);
      staleSend();
      await tester.pump();
      expect(r.repo.selectedExecutes, isEmpty);
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(tester.widget<TextField>(input).controller!.value, expected);
      expect(r.sourceState.selectedIds, {'owned'});
      expect(
        tester.widget<FilledButton>(find.byKey(const Key('ai-send'))).onPressed,
        isNull,
      );
      await _tap(tester, 'ai-references');
      await _tap(tester, 'ai-selected-review');
      expect(r.repo.selectedPrepares, hasLength(1));
      expect(r.repo.selectedExecutes, isEmpty);
      await _tap(tester, 'ai-review-confirm');
      expect(find.byType(AiSelectedSourcesPage), findsNothing);
      expect(tester.widget<TextField>(input).controller!.value, expected);
      expect(r.repo.selectedExecutes, isEmpty);
      final pending = Completer<Result<AiReply>>();
      r.repo.nextExecute = pending.future;
      await tester.ensureVisible(find.byKey(const Key('ai-send')));
      await tester.pump();
      await tester.tap(find.byKey(const Key('ai-send')));
      await tester.pump();
      expect(r.repo.selectedExecutes, hasLength(1));
      expect(tester.widget<TextField>(input).controller!.text, expected.text);
      expect(tester.widget<TextField>(input).enabled, isFalse);
      pending.complete(const Failure(selectedUnknown));
      await tester.pumpAndSettle();
      expect(tester.widget<TextField>(input).controller!.text, expected.text);
      expect(r.sourceState.selectedIds, {'owned'});
      expect(r.aiState.canCheckResult, isTrue);
      expect(r.repo.ordinaryPrepares, 0);
      expect(r.repo.ordinaryExecutes, 0);
      await _dispose(tester, r);
    },
  );

  testWidgets(
    'expired review keeps draft and choices but cannot send until a new explicitly confirmed review',
    (tester) async {
      final r = await SelectedRig.create(tester);
      r.add('owned');
      await _pump(tester, r);
      await tester.enterText(
        find.byKey(const Key('ai-message-input')),
        'Retain this draft',
      );
      await _tap(tester, 'ai-references');
      await _tap(tester, 'ai-select-owned');
      await _tap(tester, 'ai-selected-review');
      await _tap(tester, 'ai-review-confirm');
      final staleSend = tester
          .widget<FilledButton>(find.byKey(const Key('ai-send')))
          .onPressed!;
      await r.advance(tester, const Duration(seconds: 15));
      await tester.pumpAndSettle();
      staleSend();
      await tester.pump();
      expect(r.repo.selectedExecutes, isEmpty);
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('ai-message-input')))
            .controller!
            .text,
        'Retain this draft',
      );
      expect(r.sourceState.selectedIds, {'owned'});
      expect(
        tester.widget<FilledButton>(find.byKey(const Key('ai-send'))).onPressed,
        isNull,
      );
      await _tap(tester, 'ai-references');
      await _tap(tester, 'ai-selected-review');
      expect(r.repo.selectedPrepares, hasLength(2));
      expect(r.repo.selectedExecutes, isEmpty);
      await _tap(tester, 'ai-review-confirm');
      await _tap(tester, 'ai-send');
      expect(r.repo.selectedExecutes.single.included, ['source-key-2-0']);
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('ai-message-input')))
            .controller!
            .text,
        isEmpty,
      );
      expect(r.sourceState.selectedIds, isEmpty);
      await _dispose(tester, r);
    },
  );

  for (final language in ['en', 'zh']) {
    testWidgets(
      '$language 320px 2x text choices and review actions stay reachable',
      (tester) async {
        tester.view.physicalSize = const Size(320, 720);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final r = await SelectedRig.create(tester);
        r.add('owned', note: 'Original quotation 原始正文');
        await _pump(tester, r, language: language, scale: 2);
        await tester.enterText(
          find.byKey(const Key('ai-message-input')),
          '保留草稿 Keep draft',
        );
        await _tap(tester, 'ai-references');
        await _tap(tester, 'ai-select-owned');
        await _tap(tester, 'ai-selected-review');
        await _visible(tester, 'ai-review-confirm');
        expect(
          find.byKey(const Key('ai-review-confirm')).hitTestable(),
          findsOneWidget,
        );
        expect(tester.takeException(), isNull);
        await _tap(tester, 'ai-review-confirm');
        await _visible(tester, 'ai-send');
        expect(find.byKey(const Key('ai-send')).hitTestable(), findsOneWidget);
        expect(r.repo.selectedExecutes, isEmpty);
        expect(tester.takeException(), isNull);
        await _dispose(tester, r);
      },
    );
  }
}

Future<void> _pump(
  WidgetTester tester,
  SelectedRig r, {
  String language = 'en',
  double scale = 1,
  GlobalKey<NavigatorState>? navigator,
  String? initialCheckInId,
}) async {
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: r.container,
      child: MaterialApp(
        navigatorKey: navigator,
        locale: Locale(language),
        supportedLocales: const [Locale('en'), Locale('zh')],
        localizationsDelegates: GlobalMaterialLocalizations.delegates,
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(
            textScaler: TextScaler.linear(scale),
            disableAnimations: true,
          ),
          child: child!,
        ),
        home: AiConversationPage(
          onBack: () {},
          onOpenSettings: () {},
          socialStyle: true,
          initialCheckInId: initialCheckInId,
          initialCheckInSessionKey: initialCheckInId == null
              ? null
              : r.aiState.sessionKey,
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> _visible(WidgetTester tester, String key) async {
  final finder = find.byKey(Key(key));
  if (finder.evaluate().isEmpty) {
    tester
        .state<ScrollableState>(find.byType(Scrollable).first)
        .position
        .jumpTo(0);
    await tester.pumpAndSettle();
  }
  for (var i = 0; i < 35 && finder.evaluate().isEmpty; i++) {
    await tester.drag(find.byType(Scrollable).first, const Offset(0, -280));
    await tester.pumpAndSettle();
  }
  expect(finder, findsOneWidget);
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  expect(finder.hitTestable(), findsOneWidget);
}

Future<void> _tap(WidgetTester tester, String key) async {
  await _visible(tester, key);
  await tester.tap(find.byKey(Key(key)));
  await tester.pumpAndSettle();
}

Future<void> _dispose(WidgetTester tester, SelectedRig r) async {
  await tester.pumpWidget(const SizedBox.shrink());
  r.dispose();
  await tester.pump();
}
