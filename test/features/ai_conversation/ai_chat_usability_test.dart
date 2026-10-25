import 'package:enmori/app/enmori_theme.dart';
import 'package:enmori/features/ai_conversation/ai_conversation_providers.dart';
import 'package:enmori/features/ai_conversation/presentation/ai_conversation_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  for (final social in [false, true]) {
    for (final language in ['en', 'zh']) {
      testWidgets(
        'retained outgoing text stops claiming Sending after unknown ($social/$language)',
        (tester) async {
          final attempt = Object();
          final controller = _Controller(
            _pending(attempt, AiConversationPhase.waiting),
          );
          await _pump(tester, controller, social: social, language: language);
          final bubble = find.byKey(ObjectKey(attempt));
          await _show(tester, bubble);
          expect(
            find.descendant(
              of: bubble,
              matching: find.text(language == 'en' ? 'Sending…' : '正在发送…'),
            ),
            findsOneWidget,
          );
          controller.publish(_pending(attempt, AiConversationPhase.unknown));
          await tester.pumpAndSettle();
          await _show(tester, bubble);
          expect(
            find.text('An unchanged local message. 尚未确认的消息。'),
            findsOneWidget,
          );
          expect(
            find.descendant(
              of: bubble,
              matching: find.text(language == 'en' ? 'Sending…' : '正在发送…'),
            ),
            findsNothing,
          );
          expect(
            find.descendant(
              of: bubble,
              matching: find.text(
                language == 'en' ? 'Not confirmed as saved' : '尚未确认保存',
              ),
            ),
            findsOneWidget,
          );
          expect(find.byKey(const Key('ai-cancel')), findsNothing);
          expect(find.byKey(const Key('ai-pending-assistant')), findsNothing);
          expect(controller.sends, 0);
          expect(controller.retries, 0);
          expect(controller.checks, 0);
          expect(controller.view.canSend, isFalse);
          expect(controller.view.canRetry, isFalse);
          expect(controller.view.canCheckResult, isTrue);
          expect(tester.takeException(), isNull);
        },
      );
    }
  }

  testWidgets(
    'system Back closes the conversation drawer before leaving chat',
    (tester) async {
      final controller = _Controller(
        AiConversationState(sessionKey: 'session', canSend: true),
      );
      var departures = 0;
      await _pump(tester, controller, onBack: () => departures++);
      final input = find.byKey(const Key('ai-message-input'));
      await tester.enterText(input, 'Keep this unsent draft');
      final editor = tester.widget<TextField>(input).controller!;
      editor.selection = const TextSelection(baseOffset: 3, extentOffset: 9);
      final before = editor.value;
      await tester.tap(find.byTooltip('Open conversation menu'));
      await tester.pumpAndSettle();
      expect(
        tester.state<ScaffoldState>(find.byType(Scaffold)).isDrawerOpen,
        isTrue,
      );
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(departures, 0);
      expect(
        tester.state<ScaffoldState>(find.byType(Scaffold)).isDrawerOpen,
        isFalse,
      );
      expect(editor.value, before);
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(departures, 1);
      expect(editor.value, before);
      expect(controller.sends, 0);
      expect(controller.retries, 0);
      expect(tester.takeException(), isNull);
    },
  );

  for (final (size, scale, language, inset) in [
    (const Size(375, 812), 1.0, 'en', 280.0),
    (const Size(320, 740), 2.0, 'zh', 260.0),
    (const Size(740, 375), 2.0, 'en', 160.0),
  ]) {
    testWidgets(
      'long reply scrolls without truncation and keyboard preserves IME ($size/$scale/$language)',
      (tester) async {
        tester.view.physicalSize = size;
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        addTearDown(tester.view.resetViewInsets);
        final reply = List.generate(
          12,
          (i) =>
              '$i. A paragraph with the original words and line breaks. '
              '保留原文与换行，过去的记录仍然标明过去。\nSecond line. 第二行。',
        ).join('\n\n');
        final controller = _Controller(
          AiConversationState(
            sessionKey: 'session',
            canSend: true,
            messages: [
              AiMessage(
                messageId: 'long-reply',
                sequence: 2,
                role: AiRole.assistant,
                persistedAt: DateTime.utc(2026, 10, 25),
                availability: AiAvailability.available,
                text: reply,
              ),
            ],
          ),
        );
        await _pump(tester, controller, textScale: scale, language: language);
        final body = find.text(reply);
        expect(body, findsOneWidget);
        final paragraph = tester.renderObject<RenderParagraph>(body);
        expect(paragraph.text.toPlainText(), reply);
        expect(paragraph.didExceedMaxLines, isFalse);
        final history = find
            .descendant(
              of: find.byKey(const Key('route-ai-conversation')),
              matching: find.byType(Scrollable),
            )
            .first;
        final scroll = tester.state<ScrollableState>(history).position;
        expect(scroll.maxScrollExtent, greaterThan(0));
        expect(scroll.extentAfter, lessThanOrEqualTo(1));
        final input = find.byKey(const Key('ai-message-input'));
        await _show(tester, input);
        await tester.showKeyboard(input);
        const editing = TextEditingValue(
          text: 'My draft 正在输入',
          selection: TextSelection.collapsed(offset: 13),
          composing: TextRange(start: 9, end: 13),
        );
        tester.testTextInput.updateEditingValue(editing);
        await tester.pump();
        final editor = tester.widget<TextField>(input).controller!;
        for (final bottom in [inset, 0.0]) {
          tester.view.viewInsets = FakeViewPadding(bottom: bottom);
          await tester.pumpAndSettle();
          await _show(tester, input);
          expect(tester.widget<TextField>(input).controller, same(editor));
          expect(editor.value, editing);
        }
        // Read older lines through the real primary history scroll, then return
        // using the existing explicit latest action without changing the draft.
        scroll.jumpTo(0);
        await tester.pumpAndSettle();
        final latest = find.byKey(const Key('ai-latest-messages'));
        expect(latest, findsOneWidget);
        await tester.tap(latest);
        await tester.pumpAndSettle();
        expect(scroll.extentAfter, lessThanOrEqualTo(1));
        expect(editor.value.text, editing.text);
        expect(controller.sends, 0);
        expect(controller.retries, 0);
        expect(controller.checks, 0);
        expect(tester.takeException(), isNull);
      },
    );
  }
}

AiConversationState _pending(Object attempt, AiConversationPhase phase) =>
    AiConversationState(
      sessionKey: 'session',
      phase: phase,
      localOutgoingText: 'An unchanged local message. 尚未确认的消息。',
      localOutgoingKey: attempt,
      canCancel: phase == AiConversationPhase.waiting,
      canCheckResult: phase == AiConversationPhase.unknown,
      canLeaveWithoutRetrying: phase == AiConversationPhase.unknown,
    );

Future<void> _pump(
  WidgetTester tester,
  _Controller controller, {
  bool social = true,
  String language = 'en',
  double textScale = 1,
  VoidCallback? onBack,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        aiConversationControllerProvider.overrideWith(() => controller),
      ],
      child: MaterialApp(
        theme: enmoriTheme(),
        locale: Locale(language),
        localizationsDelegates: GlobalMaterialLocalizations.delegates,
        supportedLocales: const [Locale('en'), Locale('zh')],
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(
            disableAnimations: true,
            textScaler: TextScaler.linear(textScale),
          ),
          child: child!,
        ),
        home: AiConversationPage(
          onBack: onBack ?? () {},
          onOpenSettings: () {},
          socialStyle: social,
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> _show(WidgetTester tester, Finder finder) async {
  if (finder.evaluate().isEmpty) {
    await tester.scrollUntilVisible(
      finder,
      160,
      scrollable: find
          .descendant(
            of: find.byKey(const Key('route-ai-conversation')),
            matching: find.byType(Scrollable),
          )
          .first,
    );
  }
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
}

class _Controller extends AiConversationController {
  _Controller(this.initial);
  final AiConversationState initial;
  int sends = 0;
  int retries = 0;
  int checks = 0;

  AiConversationState get view => state;
  void publish(AiConversationState value) => state = value;

  @override
  AiConversationState build() => initial;

  @override
  Future<void> send(String text) async => sends++;

  @override
  Future<void> retry(String text) async => retries++;

  @override
  Future<void> checkResult() async => checks++;
}
