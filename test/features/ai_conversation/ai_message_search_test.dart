import 'dart:async';

import 'package:enmori/features/ai_conversation/ai_conversation_providers.dart';
import 'package:enmori/features/ai_conversation/presentation/ai_conversation_page.dart';
import 'package:enmori/features/ai_conversation/presentation/ai_message_search_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  for (final social in [false, true]) {
    testWidgets(
      'find, read context and return preserve chat draft (social=$social)',
      (tester) async {
        final controller = _Controller(_state());
        await _pump(tester, controller, social: social);
        final composer = find.byKey(const Key('ai-message-input'));
        if (!social) {
          await tester.scrollUntilVisible(
            composer,
            200,
            scrollable: find
                .descendant(
                  of: find.byKey(const Key('route-ai-conversation')),
                  matching: find.byType(Scrollable),
                )
                .first,
          );
        }
        await tester.ensureVisible(composer);
        await tester.enterText(composer, 'My unchanged draft');
        final editor = tester.widget<TextField>(composer).controller!;
        editor.selection = const TextSelection(baseOffset: 3, extentOffset: 7);
        final original = editor.value;
        final readsBefore = controller.reads.length;
        await _open(tester, social: social);
        await tester.enterText(
          find.byKey(const Key('ai-search-query')),
          'exam',
        );
        await tester.pumpAndSettle();
        expect(find.text('2 matching messages'), findsOneWidget);
        expect(find.byKey(const Key('ai-search-match-hidden')), findsNothing);
        expect(find.byKey(const Key('ai-search-match-blank')), findsNothing);
        await _tap(tester, 'ai-search-match-a');
        expect(find.text('Selected message'), findsOneWidget);
        expect(find.text('Prepare for the EXAM'), findsOneWidget);
        expect(find.text('Take one exam topic at a time.'), findsOneWidget);
        expect(find.text('Message unavailable'), findsOneWidget);
        await _tap(tester, 'ai-search-results-back');
        expect(
          tester
              .widget<TextField>(find.byKey(const Key('ai-search-query')))
              .controller!
              .text,
          'exam',
        );
        await _tap(tester, 'ai-search-return');
        expect(tester.widget<TextField>(composer).controller!.value, original);
        expect(controller.reads.length, readsBefore);
        expect(controller.commands, isEmpty);
        expect(tester.takeException(), isNull);
      },
    );
  }

  testWidgets(
    'earlier pages are explicit; failure is not an empty successful search',
    (tester) async {
      final controller = _Controller(_state(cursor: 'before-10'));
      await _pump(tester, controller);
      await _open(tester);
      await tester.enterText(find.byKey(const Key('ai-search-query')), 'older');
      await tester.pumpAndSettle();
      expect(
        find.textContaining('No matches in loaded messages'),
        findsOneWidget,
      );
      final originalReads = List<String?>.of(controller.reads);
      final pending = Completer<void>();
      controller.earlier = (cursor) async {
        expect(cursor, 'before-10');
        controller.publish(_state(cursor: cursor, readBusy: true));
        await pending.future;
        controller.publish(
          _state(cursor: cursor, phase: AiConversationPhase.unavailable),
        );
      };
      await tester.ensureVisible(
        find.byKey(const Key('ai-search-load-earlier')),
      );
      await tester.tap(find.byKey(const Key('ai-search-load-earlier')));
      await tester.pump();
      expect(controller.reads, [...originalReads, 'before-10']);
      expect(find.byType(LinearProgressIndicator), findsOneWidget);
      expect(find.byKey(const Key('ai-search-load-earlier')), findsNothing);
      pending.complete();
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('ai-search-load-error')), findsOneWidget);
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('ai-search-query')))
            .controller!
            .text,
        'older',
      );
      controller.earlier = (_) async => controller.publish(
        _state(
          messages: [_message('old', 1, 'An older saved reply'), ..._messages],
        ),
      );
      await _tap(tester, 'ai-search-load-earlier');
      expect(find.byKey(const Key('ai-search-load-error')), findsNothing);
      expect(find.text('1 matching message'), findsOneWidget);
      expect(find.byKey(const Key('ai-search-match-old')), findsOneWidget);
      expect(find.byKey(const Key('ai-search-load-earlier')), findsNothing);
      expect(controller.commands, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'same-ID tombstones remove matches and selected content immediately',
    (tester) async {
      final controller = _Controller(_state());
      await _pump(tester, controller);
      await _open(tester);
      await tester.enterText(find.byKey(const Key('ai-search-query')), 'exam');
      await tester.pumpAndSettle();
      await _tap(tester, 'ai-search-match-a');
      controller.publish(
        _state(
          messages: [
            _messages.first,
            _message('a', 11, 'stale body must not show', unavailable: true),
            _messages[2],
          ],
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('This message is no longer available.'), findsOneWidget);
      expect(find.text('Take one exam topic at a time.'), findsNothing);
      expect(find.textContaining('stale body'), findsNothing);
      await _tap(tester, 'ai-search-results-back');
      expect(find.byKey(const Key('ai-search-match-a')), findsNothing);
      expect(find.text('1 matching message'), findsOneWidget);
      expect(controller.commands, isEmpty);
    },
  );

  testWidgets(
    'late earlier page cannot restore a cleared search after consent changes',
    (tester) async {
      final initial = _state(cursor: 'before-10');
      final controller = _Controller(initial);
      await _pump(tester, controller);
      await _open(tester);
      await tester.enterText(
        find.byKey(const Key('ai-search-query')),
        'private query',
      );
      await tester.pumpAndSettle();
      final pending = Completer<void>();
      controller.earlier = (_) async {
        controller.publish(_state(cursor: 'before-10', readBusy: true));
        await pending.future;
        controller.publish(initial);
      };
      await tester.ensureVisible(
        find.byKey(const Key('ai-search-load-earlier')),
      );
      await tester.tap(find.byKey(const Key('ai-search-load-earlier')));
      await tester.pump();
      controller.publish(_state(phase: AiConversationPhase.limited));
      await tester.pumpAndSettle();
      pending.complete();
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('ai-search-query')), findsNothing);
      expect(find.text('private query'), findsNothing);
      expect(find.byKey(const Key('ai-search-load-earlier')), findsNothing);
      expect(controller.commands, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );

  for (final change in [
    'session',
    'conversation',
    'consent',
    'unknown',
    'deleted',
  ]) {
    testWidgets('$change invalidates query/context and cannot revive it', (
      tester,
    ) async {
      final initial = _state(cursor: 'before-10');
      final controller = _Controller(initial);
      await _pump(tester, controller);
      await _open(tester);
      await tester.enterText(
        find.byKey(const Key('ai-search-query')),
        'private query',
      );
      await tester.pumpAndSettle();
      controller.publish(
        _state(
          session: change == 'session' ? Object() : initial.sessionKey,
          conversation: change == 'conversation' ? 'different' : 'conversation',
          phase: switch (change) {
            'consent' => AiConversationPhase.limited,
            'unknown' => AiConversationPhase.unknown,
            'deleted' => AiConversationPhase.deleted,
            _ => AiConversationPhase.idle,
          },
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('ai-search-query')), findsNothing);
      expect(
        find.textContaining('This search has been cleared'),
        findsOneWidget,
      );
      expect(find.byKey(const Key('ai-search-load-earlier')), findsNothing);
      controller.publish(initial);
      await tester.pumpAndSettle();
      expect(find.text('private query'), findsNothing);
      expect(find.byKey(const Key('ai-search-query')), findsNothing);
      expect(controller.commands, isEmpty);
      expect(tester.takeException(), isNull);
    });
  }

  for (final phase in [
    AiConversationPhase.waiting,
    AiConversationPhase.unknown,
    AiConversationPhase.deleteUnknown,
  ]) {
    testWidgets('$phase offers no search entry or operation escape', (
      tester,
    ) async {
      final controller = _Controller(_state(phase: phase));
      await _pump(tester, controller);
      await tester.tap(find.byKey(const Key('ai-conversation-actions')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('ai-find-messages')), findsNothing);
      expect(controller.commands, isEmpty);
      expect(canFindAiMessages(controller.view), isFalse);
    });
  }

  for (final language in ['en', 'zh']) {
    testWidgets(
      '$language narrow 2x text search and context remain reachable',
      (tester) async {
        tester.view.physicalSize = const Size(320, 640);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final controller = _Controller(
          _state(
            messages: [
              _message('u', 10, '考试之前应该怎么准备？', user: true),
              _message('a', 11, '${'这是一条消息。' * 20} 先整理考试资料 😀'),
            ],
          ),
        );
        await _pump(tester, controller, locale: Locale(language), scale: 2);
        await _open(tester);
        await tester.enterText(find.byKey(const Key('ai-search-query')), '考试');
        await tester.pumpAndSettle();
        await _reveal(tester, 'ai-search-count');
        expect(
          find.text(language == 'zh' ? '2 条匹配消息' : '2 matching messages'),
          findsOneWidget,
        );
        await _tap(tester, 'ai-search-match-a');
        await _reveal(tester, 'ai-search-context-a');
        expect(
          find.text(language == 'zh' ? '已选消息' : 'Selected message'),
          findsOneWidget,
        );
        await _tap(tester, 'ai-search-results-back', delta: -160);
        await _tap(tester, 'ai-search-clear');
        final emptyHint = language == 'zh'
            ? '输入你记得的词或一句话。'
            : 'Enter a word or phrase you remember.';
        await tester.scrollUntilVisible(
          find.text(emptyHint),
          160,
          scrollable: find
              .descendant(
                of: find.byType(AiMessageSearchPage),
                matching: find.byType(Scrollable),
              )
              .first,
        );
        expect(
          find.text(
            language == 'zh'
                ? '输入你记得的词或一句话。'
                : 'Enter a word or phrase you remember.',
          ),
          findsOneWidget,
        );
        await _tap(tester, 'ai-search-return');
        expect(controller.commands, isEmpty);
        expect(tester.takeException(), isNull);
      },
    );
  }
}

final _session = Object();
final _messages = [
  _message('u', 10, 'Prepare for the EXAM', user: true),
  _message('a', 11, 'Take one exam topic at a time.'),
  _message('hidden', 12, 'exam must never appear', unavailable: true),
  _message('blank', 13, null),
];

AiMessage _message(
  String id,
  int sequence,
  String? text, {
  bool user = false,
  bool unavailable = false,
}) => AiMessage(
  messageId: id,
  sequence: sequence,
  role: user ? AiRole.user : AiRole.assistant,
  persistedAt: DateTime.utc(2026, 10, 23, 10, sequence),
  availability: unavailable
      ? AiAvailability.unavailable
      : AiAvailability.available,
  text: text,
);

AiConversationState _state({
  Object? session,
  String conversation = 'conversation',
  AiConversationPhase phase = AiConversationPhase.idle,
  List<AiMessage>? messages,
  String? cursor,
  bool readBusy = false,
}) {
  final idle =
      phase == AiConversationPhase.idle ||
      phase == AiConversationPhase.unavailable;
  return AiConversationState(
    sessionKey: session ?? _session,
    conversationId: conversation,
    phase: phase,
    messages: messages ?? _messages,
    nextCursor: cursor,
    readBusy: readBusy,
    canSelectConversation: idle && !readBusy,
    canStartNewConversation: idle && !readBusy,
    canSend: idle && !readBusy,
    canCheckResult: !idle,
  );
}

Future<void> _pump(
  WidgetTester tester,
  _Controller controller, {
  bool social = true,
  Locale locale = const Locale('en'),
  double scale = 1,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        aiConversationControllerProvider.overrideWith(() => controller),
      ],
      child: MaterialApp(
        locale: locale,
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
          socialStyle: social,
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> _open(WidgetTester tester, {bool social = true}) async {
  if (social) {
    await tester.tap(find.byKey(const Key('ai-conversation-actions')));
    await tester.pumpAndSettle();
  }
  await _tap(tester, 'ai-find-messages');
}

Future<void> _reveal(
  WidgetTester tester,
  String key, {
  double delta = 160,
}) async {
  final finder = find.byKey(Key(key));
  if (finder.evaluate().isEmpty) {
    await tester.scrollUntilVisible(
      finder,
      delta,
      scrollable: find
          .descendant(
            of: find.byType(AiMessageSearchPage),
            matching: find.byType(Scrollable),
          )
          .first,
    );
  }
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
}

Future<void> _tap(WidgetTester tester, String key, {double delta = 160}) async {
  await _reveal(tester, key, delta: delta);
  final finder = find.byKey(Key(key));
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

class _Controller extends AiConversationController {
  _Controller(this.initial);
  final AiConversationState initial;
  final reads = <String?>[];
  final commands = <String>[];
  Future<void> Function(String)? earlier;
  AiConversationState get view => state;
  void publish(AiConversationState value) => state = value;
  @override
  AiConversationState build() => initial;
  @override
  Future<void> loadMessages({String? before}) async {
    reads.add(before);
    if (before != null) await earlier?.call(before);
  }

  @override
  Future<void> send(String text) async => commands.add('send');
  @override
  Future<void> retry(String text) async => commands.add('retry');
  @override
  Future<void> checkResult() async => commands.add('check');
  @override
  void cancel() => commands.add('cancel');
}
