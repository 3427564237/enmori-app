import 'dart:io';
import 'dart:ui' as ui;

import 'package:enmori/app/enmori_theme.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/account_preferences_providers.dart';
import 'package:enmori/features/account/domain/account_preferences_repository.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/ai_conversation/ai_conversation_providers.dart';
import 'package:enmori/features/ai_conversation/ai_selected_sources_providers.dart';
import 'package:enmori/features/ai_conversation/domain/ai_selected_reply.dart';
import 'package:enmori/features/ai_conversation/presentation/ai_conversation_page.dart';
import 'package:enmori/features/ai_conversation/presentation/ai_selected_sources_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'ai_selected_test_support.dart';

void main() {
  for (final (name, size, scale, dark) in [
    ('small-large-text', const Size(375, 812), 2.0, false),
    ('landscape-dark', const Size(812, 375), 2.0, true),
    ('phone-preview', const Size(390, 844), 1.0, false),
  ]) {
    testWidgets('reference panel layout: $name', (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = size;
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);
      final captureDir = Platform.environment['ENMORI_REFERENCE_CAPTURE_DIR'];
      if (captureDir != null) {
        for (final (family, variable) in [
          ('Roboto', 'ENMORI_CAPTURE_FONT'),
          ('ReferenceCjk', 'ENMORI_CAPTURE_CJK_FONT'),
          ('MaterialIcons', 'ENMORI_CAPTURE_MATERIAL_FONT'),
        ]) {
          final path = Platform.environment[variable];
          if (path != null) {
            await tester.runAsync(() async {
              final bytes = await File(path).readAsBytes();
              await (FontLoader(
                family,
              )..addFont(Future.value(ByteData.sublistView(bytes)))).load();
            });
          }
        }
      }
      final repo = _TodayRepository();
      final r = await _rig(tester, repo);
      r.add('record', note: '今天复习了课程，也想聊聊接下来的安排。');
      final boundary = GlobalKey();
      final theme = dark ? ThemeData.dark() : enmoriTheme();
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: r.container,
          child: MaterialApp(
            locale: const Locale('zh'),
            supportedLocales: const [Locale('en'), Locale('zh')],
            localizationsDelegates: const [
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            theme: theme.copyWith(
              splashFactory: NoSplash.splashFactory,
              appBarTheme: theme.appBarTheme.copyWith(
                titleTextStyle: theme.appBarTheme.titleTextStyle?.copyWith(
                  fontFamilyFallback: const ['ReferenceCjk'],
                ),
              ),
              textTheme: theme.textTheme.apply(
                fontFamilyFallback: const ['ReferenceCjk'],
              ),
            ),
            builder: (context, child) => MediaQuery(
              data: MediaQuery.of(context).copyWith(
                textScaler: TextScaler.linear(scale),
                disableAnimations: true,
              ),
              child: child!,
            ),
            home: RepaintBoundary(
              key: boundary,
              child: const AiSelectedSourcesPage(),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('ai-today-enabled')), findsOneWidget);
      expect(tester.takeException(), isNull);
      if (captureDir != null) {
        final render =
            boundary.currentContext!.findRenderObject()!
                as RenderRepaintBoundary;
        await tester.runAsync(() async {
          final image = await render.toImage(pixelRatio: 1.5);
          try {
            final bytes = await image.toByteData(
              format: ui.ImageByteFormat.png,
            );
            await File('$captureDir/$name.png')
                .writeAsBytes(bytes!.buffer.asUint8List());
          } finally {
            image.dispose();
          }
        });
      }
      await tester.pumpWidget(const SizedBox.shrink());
      r.dispose();
      await tester.pump();
    });
  }

  testWidgets('a stale reference toggle cannot change a replacement session', (
    tester,
  ) async {
    final repo = _TodayRepository();
    final r = await _rig(tester, repo);
    r.add('record');
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: r.container,
        child: const MaterialApp(home: AiSelectedSourcesPage()),
      ),
    );
    await tester.pumpAndSettle();
    final toggle = tester
        .widget<SwitchListTile>(find.byKey(const Key('ai-today-enabled')))
        .onChanged!;
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
    toggle(false);
    await tester.pumpAndSettle();
    expect(r.sourceState.mode, AiReferenceMode.today);
    expect(repo.selectedExecutes, isEmpty);
    await tester.pumpWidget(const SizedBox.shrink());
    r.dispose();
    await tester.pump();
  });

  testWidgets(
    'owned Check-in entry can switch back to automatic today without restarting',
    (tester) async {
      final repo = _TodayRepository();
      final r = await _rig(tester, repo);
      r.add('older', at: selectedNow.subtract(const Duration(days: 2)));
      r.add('record');
      r.ai.updateDraft(
        const TextEditingValue(text: 'Keep this draft'),
        sessionKey: r.aiState.sessionKey,
      );
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: r.container,
          child: const MaterialApp(
            home: AiSelectedSourcesPage(initialCheckInId: 'older'),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(r.sourceState.mode, AiReferenceMode.manual);
      expect(r.sourceState.selectedIds, {'older'});
      final automatic = find.byKey(const Key('ai-today-enabled'));
      expect(automatic, findsOneWidget);
      await tester.ensureVisible(automatic);
      await tester.tap(automatic);
      await tester.pumpAndSettle();
      expect(r.sourceState.mode, AiReferenceMode.today);
      expect(repo.zones, ['Asia/Singapore']);
      expect(r.ai.draft.text, 'Keep this draft');
      expect(repo.selectedExecutes, isEmpty);
      await tester.pumpWidget(const SizedBox.shrink());
      r.dispose();
      await tester.pump();
    },
  );

  testWidgets(
    'one reference panel returns from today to cross-day manual choices',
    (tester) async {
      final repo = _TodayRepository();
      final r = await _rig(tester, repo);
      r.add('record');
      r.add('older', at: selectedNow.subtract(const Duration(days: 2)));
      r.add('another-day', at: selectedNow.subtract(const Duration(days: 4)));
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: r.container,
          child: const MaterialApp(home: AiSelectedSourcesPage()),
        ),
      );
      await tester.pumpAndSettle();
      final manual = find.byKey(const Key('ai-reference-manual'));
      expect(manual, findsOneWidget);
      await tester.ensureVisible(manual);
      await tester.tap(manual);
      await tester.pumpAndSettle();
      expect(r.sourceState.mode, AiReferenceMode.manual);
      for (final id in ['older', 'another-day']) {
        final choice = find.byKey(Key('ai-select-$id'));
        await tester.scrollUntilVisible(
          choice,
          250,
          scrollable: find
              .descendant(
                of: find.byType(ListView).first,
                matching: find.byType(Scrollable),
              )
              .first,
        );
        await tester.pumpAndSettle();
        expect(choice.hitTestable(), findsOneWidget);
        await tester.tap(choice);
        await tester.pumpAndSettle();
      }
      expect(r.sourceState.selectedIds, {'older', 'another-day'});
      expect(repo.selectedExecutes, isEmpty);
      await tester.pumpWidget(const SizedBox.shrink());
      r.dispose();
      await tester.pump();
    },
  );

  testWidgets(
    'default today permits Chinese composing Send without manual selection or client source reads',
    (tester) async {
      final repo = _TodayRepository();
      final r = await _rig(tester, repo);
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: r.container,
          child: MaterialApp(
            home: AiConversationPage(
              onBack: () {},
              onOpenSettings: () {},
              socialStyle: true,
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      final input = find.byKey(const Key('ai-message-input'));
      await tester.ensureVisible(input);
      await tester.showKeyboard(input);
      const value = TextEditingValue(
        text: '今天想聊一聊',
        selection: TextSelection.collapsed(offset: 6),
        composing: TextRange(start: 0, end: 6),
      );
      tester.testTextInput.updateEditingValue(value);
      await tester.pump();
      expect(r.sourceState.mode, AiReferenceMode.today);
      expect(r.sourceState.selectedIds, isEmpty);
      final send = find.byKey(const Key('ai-send'));
      expect(tester.widget<FilledButton>(send).onPressed, isNotNull);
      await tester.ensureVisible(send);
      await tester.tap(send);
      await tester.pumpAndSettle();
      expect(repo.zones, ['Asia/Singapore']);
      expect(repo.selectedExecutes, hasLength(1));
      expect(repo.ordinaryPrepares, 0);
      expect(r.checkIns.ownReads, isEmpty);
      expect(r.checkIns.dateReads, isEmpty);
      await tester.pumpWidget(const SizedBox.shrink());
      r.dispose();
      await tester.pump();
    },
  );

  testWidgets(
    'preview exclusion survives fresh Send keys without filling a sixth record',
    (tester) async {
      final repo = _TodayRepository()
        ..ids = List.generate(5, (i) => 'record-$i')
        ..hasMore = true;
      final r = await _rig(tester, repo);
      for (final id in repo.ids) {
        r.add(id);
      }
      await r.sources.previewToday();
      expect(r.sourceState.today!.hasMore, isTrue);
      expect(r.checkIns.ownReads, repo.ids);
      expect(repo.selectedExecutes, isEmpty);
      final oldKey = r.sourceState.review!.sourceCards.first.selectionKey;
      r.sources.toggleTodaySource('record-0');
      await r.sources.submit('Use the rest');
      expect(repo.zones, hasLength(2));
      expect(repo.selectedExecutes.single.excluded, ['source-key-2-0']);
      expect(repo.selectedExecutes.single.included, hasLength(4));
      expect(repo.selectedExecutes.single.excluded, isNot(contains(oldKey)));
      expect(r.checkIns.ownReads, hasLength(5));
      expect(r.sourceState.excludedCheckInIds, {'record-0'});
      expect(r.sourceState.mode, AiReferenceMode.today);
      r.ai.startNewConversation();
      expect(r.sourceState.excludedCheckInIds, isEmpty);
      r.dispose();
      await tester.pump();
    },
  );

  testWidgets(
    'topic off sends explicit zero sources and persists through success until new topic',
    (tester) async {
      final repo = _TodayRepository();
      final r = await _rig(tester, repo);
      r.sources.setTodayEnabled(false);
      await r.sources.submit('An ordinary question');
      expect(repo.zones, isEmpty);
      expect(repo.selectedPrepares.single.ids, isEmpty);
      expect(repo.selectedExecutes.single.included, isEmpty);
      expect(r.sourceState.mode, AiReferenceMode.off);
      expect(r.sourceState.active, isTrue);
      r.ai.startNewConversation();
      expect(r.sourceState.mode, AiReferenceMode.today);
      r.dispose();
      await tester.pump();
    },
  );

  testWidgets(
    'off skips the exact current two exchanges without deleting history',
    (tester) async {
      final repo = _TodayRepository()
        ..pairs = (n) => [
          for (var i = 0; i < 2; i++)
            AiPreparedHistoryPair(
              historyKey: 'history-$n-$i',
              userMessageId: 'old-user-$i',
              assistantMessageId: 'old-assistant-$i',
              userSequence: 1 + 2 * i,
              assistantSequence: 2 + 2 * i,
            ),
        ];
      final r = await _rig(tester, repo);
      r.sources.setTodayEnabled(false);
      await r.sources.submit('A fresh question without earlier references');
      expect(repo.selectedPrepares.single.ids, isEmpty);
      expect(repo.selectedExecutes.single.history, [
        'history-1-0',
        'history-1-1',
      ]);
      expect(repo.selectedExecutes.single.included, isEmpty);
      expect(
        repo.selectedExecutes.single.ticket.selection.historyPairs,
        hasLength(2),
      );
      expect(repo.ordinaryExecutes, 0);
      expect(r.aiState.phase, AiConversationPhase.success);
      r.dispose();
      await tester.pump();
    },
  );

  testWidgets('off uses fresh exclusion keys when the latest window changes', (
    tester,
  ) async {
    final repo = _TodayRepository()
      ..pairs = (n) => [
        AiPreparedHistoryPair(
          historyKey: 'history-$n',
          userMessageId: 'old-user-$n',
          assistantMessageId: 'old-assistant-$n',
          userSequence: 2 * n - 1,
          assistantSequence: 2 * n,
        ),
      ];
    final r = await _rig(tester, repo);
    r.sources.setTodayEnabled(false);
    await r.sources.review();
    expect(r.sourceState.excludedHistoryKeys, {'history-1'});
    await r.sources.submit('Use only the new input');
    expect(repo.selectedPrepares, hasLength(2));
    expect(repo.selectedExecutes.single.history, ['history-2']);
    expect(
      repo
          .selectedExecutes
          .single
          .ticket
          .selection
          .historyPairs
          .single
          .userMessageId,
      'old-user-2',
    );
    expect(r.sourceState.reviewRequired, isFalse);
    r.dispose();
    await tester.pump();
  });

  testWidgets(
    'unknown device day preserves draft and never becomes empty or legacy send',
    (tester) async {
      final repo = _TodayRepository();
      final r = await SelectedRig.create(
        tester,
        repository: repo,
        today: true,
        timeZone: () async => const Failure(selectedUnknown),
      );
      r.ai.updateDraft(
        const TextEditingValue(text: 'Keep my draft'),
        sessionKey: r.aiState.sessionKey,
      );
      await r.sources.submit('Keep my draft');
      expect(r.sourceState.notice, AiSelectionNotice.unknown);
      expect(r.sourceState.today, isNull);
      expect(r.ai.draft.text, 'Keep my draft');
      expect(repo.selectedPrepares, isEmpty);
      expect(repo.selectedExecutes, isEmpty);
      expect(repo.ordinaryPrepares, 0);
      r.dispose();
      await tester.pump();
    },
  );

  testWidgets(
    'today execute conflict keeps original-operation readback before another send',
    (tester) async {
      final repo = _TodayRepository()
        ..nextExecute = Future.value(const Failure(selectedConflict));
      final r = await _rig(tester, repo);
      r.ai.updateDraft(
        const TextEditingValue(text: 'One original input'),
        sessionKey: r.aiState.sessionKey,
      );
      await r.sources.submit('One original input');
      await r.sources.submit('One original input');
      expect(repo.zones, hasLength(1));
      expect(repo.selectedExecutes, hasLength(1));
      expect(r.aiState.canCheckResult, isTrue);
      await r.ai.checkResult();
      expect(repo.operationReads, 1);
      expect(repo.selectedExecutes, hasLength(1));
      expect(r.ai.draft.text, 'One original input');
      r.dispose();
      await tester.pump();
    },
  );
}

Future<SelectedRig> _rig(WidgetTester tester, _TodayRepository repo) =>
    SelectedRig.create(
      tester,
      repository: repo,
      today: true,
      timeZone: () async => const Success('Asia/Singapore'),
    );

final class _TodayRepository extends SelectedAiRepository
    implements AiTodayReplyRepository {
  _TodayRepository() : super(() => selectedNow);
  List<String> ids = ['record'];
  bool hasMore = false;
  final zones = <String>[];
  @override
  Future<Result<AiSelectedReplyTicket>> prepareToday({
    required String token,
    required AiAbortSignal abort,
    required String timeZone,
    String? conversationId,
    String? userMessageId,
  }) async {
    zones.add(timeZone);
    final result = await super.prepareSelected(
      token: token,
      abort: abort,
      sourceIds: ids,
      conversationId: conversationId,
      userMessageId: userMessageId,
    );
    if (result case Failure<AiSelectedReplyTicket>()) return result;
    final ticket = (result as Success<AiSelectedReplyTicket>).value;
    final selection = ticket.selection;
    return Success(
      AiSelectedReplyTicket(
        operation: ticket.operation,
        selection: AiPreparedReplySelection(
          selectionRevision: selection.selectionRevision,
          expiresAt: selection.expiresAt,
          historyPairs: selection.historyPairs,
          today: AiTodayContext(
            date: '2026-10-25',
            timeZone: timeZone,
            hasMore: hasMore,
          ),
          sourceCards: [
            for (var i = 0; i < selection.sourceCards.length; i++)
              AiSelectedSourceCard(
                selectionKey: selection.sourceCards[i].selectionKey,
                card: selection.sourceCards[i].card,
                checkInId: ids[i],
              ),
          ],
        ),
      ),
    );
  }
}
