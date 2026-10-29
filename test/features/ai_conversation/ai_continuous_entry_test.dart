import 'package:enmori/app/enmori_theme.dart';
import 'package:enmori/features/ai_conversation/ai_conversation_providers.dart';
import 'package:enmori/features/ai_conversation/presentation/ai_conversation_page.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('opening the current conversation keeps the exact unsent draft', (
    tester,
  ) async {
    final controller = _Controller(_ready());
    await _pump(tester, controller);
    final input = find.byKey(const Key('ai-message-input'));
    await tester.enterText(input, 'Continue this draft. 继续这份草稿。');
    final editor = tester.widget<TextField>(input).controller!;
    editor.selection = const TextSelection(baseOffset: 3, extentOffset: 8);
    final before = editor.value;
    final readsBefore = controller.reads.length;
    await tester.tap(find.byTooltip('Open conversation menu'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('ai-history-current')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('ai-confirm-discard')), findsNothing);
    expect(editor.value, before);
    expect(controller.reads, hasLength(readsBefore));
    expect(controller.selected, isEmpty);
    expect(controller.sends, 0);
    expect(controller.retries, 0);
    expect(tester.takeException(), isNull);
  });

  testWidgets('an empty entry offers History without selecting or sending', (
    tester,
  ) async {
    final controller = _Controller(
      AiConversationState(
        sessionKey: 'session',
        canSend: true,
        canBrowseHistory: true,
        canSelectConversation: true,
      ),
    );
    await _pump(tester, controller);
    expect(find.byKey(const Key('ai-entry-empty')), findsOneWidget);
    expect(controller.reads, isEmpty);
    expect(controller.historyLoads, 0);
    final history = find.byKey(const Key('ai-open-history'));
    expect(history.hitTestable(), findsOneWidget);
    await tester.tap(history);
    await tester.pumpAndSettle();
    expect(controller.historyLoads, 1);
    expect(controller.selected, isEmpty);
    expect(controller.sends, 0);
    expect(controller.retries, 0);
    expect(tester.takeException(), isNull);
  });

  testWidgets('returning in the same session resumes the one exact draft', (
    tester,
  ) async {
    final visible = ValueNotifier(true);
    addTearDown(visible.dispose);
    final controller = _Controller(_ready());
    await _pump(tester, controller, visible: visible);
    final input = find.byKey(const Key('ai-message-input'));
    await tester.enterText(input, 'My current words. 当前草稿。');
    final editor = tester.widget<TextField>(input).controller!;
    editor.selection = const TextSelection(baseOffset: 2, extentOffset: 7);
    final before = editor.value;
    visible.value = false;
    await tester.pumpAndSettle();
    expect(find.text('Elsewhere'), findsOneWidget);
    expect(controller.draft, before);
    visible.value = true;
    await tester.pumpAndSettle();
    expect(tester.widget<TextField>(input).controller!.value, before);
    expect(find.text('A saved conversation. 一段已保存的对话。'), findsOneWidget);
    expect(controller.historyLoads, 0);
    expect(controller.selected, isEmpty);
    expect(controller.sends, 0);
    expect(controller.retries, 0);
    expect(tester.takeException(), isNull);
  });

  testWidgets('another conversation still requires an explicit draft discard', (
    tester,
  ) async {
    final controller = _Controller(_ready());
    await _pump(tester, controller);
    final input = find.byKey(const Key('ai-message-input'));
    await tester.enterText(input, 'Keep or explicitly discard this draft');
    final before = tester.widget<TextField>(input).controller!.value;
    await _openHistory(tester);
    await tester.tap(find.byKey(const Key('ai-history-other')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('ai-confirm-discard')), findsOneWidget);
    await tester.tap(find.text('Keep editing'));
    await tester.pumpAndSettle();
    expect(tester.widget<TextField>(input).controller!.value, before);
    expect(controller.selected, isEmpty);
    await _openHistory(tester);
    await tester.tap(find.byKey(const Key('ai-history-other')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('ai-confirm-discard')));
    await tester.pumpAndSettle();
    expect(tester.widget<TextField>(input).controller!.text, isEmpty);
    expect(controller.selected, ['other']);
    expect(controller.sends, 0);
    expect(controller.retries, 0);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'unknown entry bounds automatic readback and keeps independent navigation explicit',
    (tester) async {
      final ready = _ready();
      final controller = _Controller(
        AiConversationState(
          sessionKey: ready.sessionKey,
          phase: AiConversationPhase.unknown,
          conversationId: ready.conversationId,
          messages: ready.messages,
          conversations: ready.conversations,
          historyLoaded: true,
          canBrowseHistory: true,
          canStartNewConversation: true,
          canSelectConversation: true,
          canCheckResult: true,
          canLeaveWithoutRetrying: true,
        ),
      );
      await _pump(tester, controller);
      expect(controller.reads, [null]);
      expect(controller.checks, 1);
      await tester.pump(const Duration(seconds: 1));
      await tester.pump(const Duration(seconds: 3));
      await tester.pump(const Duration(seconds: 30));
      expect(controller.checks, 3);
      expect(find.byKey(const Key('ai-entry-empty')), findsNothing);
      expect(
        tester
            .widget<IconButton>(find.byKey(const Key('ai-new-conversation')))
            .onPressed,
        isNotNull,
      );
      await _openHistory(tester);
      expect(
        tester
            .widget<ListTile>(find.byKey(const Key('ai-history-other')))
            .enabled,
        isTrue,
      );
      expect(
        tester
            .widget<ListTile>(find.byKey(const Key('ai-drawer-find')))
            .enabled,
        isFalse,
      );
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(controller.selected, isEmpty);
      expect(controller.newTopics, 0);
      expect(controller.sends, 0);
      expect(controller.retries, 0);
      await tester.tap(find.byKey(const Key('ai-conversation-actions')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('ai-check-result-menu')), findsOneWidget);
      expect(controller.checks, 3);
      await tester.tap(find.byKey(const Key('ai-check-result-menu')));
      await tester.pumpAndSettle();
      expect(controller.checks, 4);
      expect(controller.sends, 0);
      expect(controller.retries, 0);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'a loading current conversation does not claim a first empty entry',
    (tester) async {
      final controller = _Controller(
        AiConversationState(
          sessionKey: 'session',
          conversationId: 'current',
          readBusy: true,
        ),
      );
      await _pump(tester, controller);
      expect(
        find.byKey(const Key('ai-conversation-read-status')),
        findsOneWidget,
      );
      expect(find.byKey(const Key('ai-entry-empty')), findsNothing);
      expect(controller.reads, isEmpty);
      controller.publish(_ready());
      await tester.pumpAndSettle();
      expect(
        find.byKey(const Key('ai-conversation-read-status')),
        findsNothing,
      );
      expect(find.text('A saved conversation. 一段已保存的对话。'), findsOneWidget);
      expect(controller.sends, 0);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('stale History action cannot reopen old account content', (
    tester,
  ) async {
    final controller = _Controller(_ready());
    await _pump(tester, controller);
    await tester.enterText(
      find.byKey(const Key('ai-message-input')),
      'Private old draft',
    );
    final oldOpen = tester
        .widget<IconButton>(find.byKey(const Key('ai-open-history')))
        .onPressed!;
    controller.publish(
      AiConversationState(
        sessionKey: 'session',
        phase: AiConversationPhase.limited,
      ),
    );
    await tester.pumpAndSettle();
    oldOpen();
    await tester.pumpAndSettle();
    expect(
      tester.state<ScaffoldState>(find.byType(Scaffold)).isDrawerOpen,
      isFalse,
    );
    expect(controller.historyLoads, 0);
    controller.publish(
      AiConversationState(sessionKey: Object(), canSend: true),
    );
    await tester.pumpAndSettle();
    expect(
      tester
          .widget<TextField>(find.byKey(const Key('ai-message-input')))
          .controller!
          .text,
      isEmpty,
    );
    expect(find.text('A saved conversation. 一段已保存的对话。'), findsNothing);
    expect(controller.sends, 0);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'New topic keeps the draft and previous history without dispatch',
    (tester) async {
      final controller = _Controller(_ready());
      await _pump(tester, controller);
      final input = find.byKey(const Key('ai-message-input'));
      await tester.enterText(input, 'Draft for the next topic');
      final editor = tester.widget<TextField>(input).controller!;
      editor.selection = const TextSelection(baseOffset: 2, extentOffset: 9);
      final before = editor.value;
      expect(find.byTooltip('New topic'), findsOneWidget);
      tester
          .widget<IconButton>(find.byKey(const Key('ai-new-conversation')))
          .onPressed!();
      await tester.pumpAndSettle();
      expect(editor.value, before);
      expect(controller.newTopics, 1);
      expect(find.text('A saved conversation. 一段已保存的对话。'), findsNothing);
      await _openHistory(tester);
      expect(find.byKey(const Key('ai-history-current')), findsOneWidget);
      expect(controller.sends, 0);
      expect(controller.retries, 0);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'current-conversation Find and whole Delete remain in the action menu',
    (tester) async {
      final controller = _Controller(_ready());
      await _pump(tester, controller);
      await tester.tap(find.byKey(const Key('ai-conversation-actions')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('ai-find-messages')), findsOneWidget);
      expect(find.text('Delete conversation'), findsOneWidget);
      expect(controller.sends, 0);
      expect(controller.retries, 0);
      expect(tester.takeException(), isNull);
    },
  );

  for (final (size, locale) in [
    (const Size(320, 740), const Locale('en')),
    (const Size(320, 740), const Locale('zh')),
    (const Size(740, 375), const Locale('en')),
  ]) {
    testWidgets(
      'History and Find stay reachable with 2x text ($size/$locale)',
      (tester) async {
        tester.view.physicalSize = size;
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final controller = _Controller(_ready());
        await _pump(tester, controller, locale: locale, textScale: 2);
        final input = find.byKey(const Key('ai-message-input'));
        await tester.ensureVisible(input);
        await tester.enterText(input, 'Do not replace this draft');
        final before = tester.widget<TextField>(input).controller!.value;
        final history = find.byKey(const Key('ai-open-history'));
        expect(tester.getSize(history).width, greaterThanOrEqualTo(48));
        expect(tester.getSize(history).height, greaterThanOrEqualTo(48));
        expect(history.hitTestable(), findsOneWidget);
        await tester.tap(history);
        await tester.pumpAndSettle();
        final lookup = find.byKey(const Key('ai-drawer-find'));
        await tester.scrollUntilVisible(
          lookup,
          120,
          maxScrolls: 10,
          scrollable: find
              .descendant(
                of: find.byType(Drawer),
                matching: find.byType(Scrollable),
              )
              .first,
        );
        await tester.pumpAndSettle();
        expect(lookup.hitTestable(), findsOneWidget);
        await tester.tap(lookup);
        await tester.pumpAndSettle();
        expect(find.byKey(const Key('ai-search-query')), findsOneWidget);
        await tester.binding.handlePopRoute();
        await tester.pumpAndSettle();
        expect(tester.widget<TextField>(input).controller!.value, before);
        expect(controller.sends, 0);
        expect(controller.retries, 0);
        expect(tester.takeException(), isNull);
      },
    );
  }
}

AiConversationState _ready() => AiConversationState(
  sessionKey: 'session',
  conversationId: 'current',
  canSend: true,
  canStartNewConversation: true,
  canBrowseHistory: true,
  canSelectConversation: true,
  canDelete: true,
  historyLoaded: true,
  conversations: [
    AiConversationSummary(
      conversationId: 'current',
      lastMessageAt: DateTime.utc(2026, 10, 25, 12),
    ),
    AiConversationSummary(
      conversationId: 'other',
      lastMessageAt: DateTime.utc(2026, 10, 23, 12),
    ),
  ],
  messages: [
    AiMessage(
      messageId: 'user',
      sequence: 1,
      role: AiRole.user,
      persistedAt: DateTime.utc(2026, 10, 25, 12),
      availability: AiAvailability.available,
      text: 'A saved conversation. 一段已保存的对话。',
    ),
  ],
);

Future<void> _pump(
  WidgetTester tester,
  _Controller controller, {
  Locale locale = const Locale('en'),
  double textScale = 1,
  ValueListenable<bool>? visible,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        aiConversationControllerProvider.overrideWith(() => controller),
      ],
      child: MaterialApp(
        theme: enmoriTheme(),
        locale: locale,
        localizationsDelegates: GlobalMaterialLocalizations.delegates,
        supportedLocales: const [Locale('en'), Locale('zh')],
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(
            disableAnimations: true,
            textScaler: TextScaler.linear(textScale),
          ),
          child: child!,
        ),
        home: visible == null
            ? AiConversationPage(
                onBack: () {},
                onOpenSettings: () {},
                socialStyle: true,
              )
            : ValueListenableBuilder(
                valueListenable: visible,
                builder: (context, show, _) => show
                    ? AiConversationPage(
                        onBack: () {},
                        onOpenSettings: () {},
                        socialStyle: true,
                      )
                    : const Scaffold(body: Text('Elsewhere')),
              ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> _openHistory(WidgetTester tester) async {
  await tester.tap(find.byKey(const Key('ai-open-history')));
  await tester.pumpAndSettle();
}

class _Controller extends AiConversationController {
  _Controller(this.initial);
  final AiConversationState initial;
  final selected = <String>[];
  final reads = <String?>[];
  int historyLoads = 0;
  int sends = 0;
  int retries = 0;
  int newTopics = 0;
  int checks = 0;

  @override
  AiConversationState build() => initial;

  void publish(AiConversationState next) => state = next;

  @override
  Future<void> loadMessages({String? before}) async => reads.add(before);

  @override
  Future<void> loadConversations({bool more = false}) async => historyLoads++;

  @override
  Future<void> selectConversation(String id) async => selected.add(id);

  @override
  Future<void> send(String text) async => sends++;

  @override
  Future<void> retry(String text) async => retries++;

  @override
  Future<void> checkResult() async => checks++;

  @override
  void startNewConversation() {
    if (!state.canStartNewConversation) return;
    newTopics++;
    state = AiConversationState(
      sessionKey: state.sessionKey,
      canSend: true,
      canBrowseHistory: true,
      canSelectConversation: true,
      historyLoaded: state.historyLoaded,
      conversations: state.conversations,
    );
  }
}
