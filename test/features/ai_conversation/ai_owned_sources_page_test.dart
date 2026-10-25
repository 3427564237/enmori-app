import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/ai_conversation/ai_conversation_providers.dart';
import 'package:enmori/features/ai_conversation/presentation/ai_conversation_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'ai_reference_test_support.dart';

void main() {
  testWidgets(
    'stacked target page preserves original unknown operation and returns an empty unsent editor',
    (tester) async {
      final r = await AiReferenceRig.create(tester);
      final navigator = GlobalKey<NavigatorState>();
      r.repo.nextExecute = Future.value(const Failure(referenceUnknown));
      await _pump(tester, r, navigator: navigator);
      final input = find.byKey(const Key('ai-message-input'));
      await tester.enterText(input, 'One original request');
      await tester.pump();
      final staleSend = tester
          .widget<FilledButton>(find.byKey(const Key('ai-send')))
          .onPressed!;
      await tester.tap(find.byKey(const Key('ai-send')));
      await tester.pumpAndSettle();
      expect(r.conversationState.canCheckResult, isTrue);
      expect(r.repo.executes, 1);
      unawaited(
        navigator.currentState!.push<void>(
          MaterialPageRoute(
            builder: (_) => AiConversationPage(
              onBack: () => navigator.currentState!.pop(),
              onOpenSettings: () {},
              socialStyle: true,
              initialMessage: const AiMessageLocator(
                conversationId: 'other-owned-topic',
                messageId: referenceMessage,
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      staleSend();
      await tester.pump();
      expect(r.repo.anchors, isEmpty);
      expect(r.repo.executes, 1);
      expect(r.conversationState.canCheckResult, isTrue);
      expect(
        find.byKey(const Key('ai-open-requested-message')),
        findsOneWidget,
      );
      navigator.currentState!.pop();
      await tester.pumpAndSettle();
      expect(tester.widget<TextField>(input).controller!.text, isEmpty);
      expect(r.conversationState.localOutgoingText, 'One original request');
      expect(r.conversationState.canCheckResult, isTrue);
      expect(r.repo.executes, 1);
      await _dispose(tester, r);
    },
  );
  testWidgets(
    'stacked AI pages share one draft; returning old initial locator cannot revive discarded text',
    (tester) async {
      final r = await AiReferenceRig.create(tester);
      final navigator = GlobalKey<NavigatorState>();
      await _pump(
        tester,
        r,
        navigator: navigator,
        initial: const AiMessageLocator(
          conversationId: referenceTopic,
          messageId: referenceMessage,
        ),
      );
      final input = find.byKey(const Key('ai-message-input'));
      await tester.enterText(input, 'Discarded old AI draft');
      await tester.pump();
      final staleSend = tester
          .widget<FilledButton>(find.byKey(const Key('ai-send')))
          .onPressed!;
      final checkIn = TextEditingController(text: 'Keep this Check-in edit');
      unawaited(
        navigator.currentState!.push<void>(
          MaterialPageRoute(
            builder: (_) => Scaffold(
              body: TextField(
                key: const Key('covered-checkin-draft'),
                controller: checkIn,
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
              initialMessage: const AiMessageLocator(
                conversationId: 'other-owned-topic',
                messageId: referenceMessage,
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('ai-confirm-discard')), findsOneWidget);
      await tester.tap(find.byKey(const Key('ai-confirm-discard')));
      await tester.pumpAndSettle();
      await tester.enterText(input, 'Current draft from the new AI page');
      final currentEditor = tester.widget<TextField>(input).controller!;
      currentEditor.selection = const TextSelection(
        baseOffset: 2,
        extentOffset: 10,
      );
      final expected = currentEditor.value;
      staleSend();
      await tester.pumpAndSettle();
      expect(r.repo.prepares, 0);
      expect(r.repo.executes, 0);
      expect(r.conversation.draft, expected);
      navigator.currentState!.pop();
      await tester.pumpAndSettle();
      expect(checkIn.text, 'Keep this Check-in edit');
      navigator.currentState!.pop();
      await tester.pumpAndSettle();
      expect(tester.widget<TextField>(input).controller!.value, expected);
      expect(r.conversationState.conversationId, 'other-owned-topic');
      expect(find.byKey(const Key('ai-message-location-status')), findsNothing);
      expect(
        find.byKey(const Key('ai-message-$referenceMessage')),
        findsOneWidget,
      );
      expect(r.repo.prepares, 0);
      expect(r.repo.executes, 0);
      checkIn.dispose();
      await _dispose(tester, r);
    },
  );
  testWidgets(
    'offscreen proactive body is not read; real visibility marks only its committed sequence',
    (tester) async {
      final many = [
        for (var i = 1; i <= 18; i++)
          AiMessage(
            messageId: 'user-$i',
            sequence: i,
            role: AiRole.user,
            persistedAt: referenceDate,
            availability: AiAvailability.available,
            text: 'Saved synthetic message $i\n${'line\n' * 3}',
          ),
        _proactive(sequence: 19),
      ];
      final r = await AiReferenceRig.create(tester, messages: many);
      r.repo.nextMark = Future.value(const Failure(referenceUnknown));
      await _pump(tester, r, social: false);
      expect(r.repo.marks, isEmpty);
      await _visible(tester, 'ai-message-$referenceMessage');
      await tester.ensureVisible(find.text(referenceProactive.text!));
      await tester.pumpAndSettle();
      expect(r.repo.marks.single.sequence, 19);
      expect(r.sourceState.readUnconfirmed, isTrue);
      await _visible(tester, 'ai-read-unconfirmed');
      expect(
        find.text('Opened. Read status has not synced yet.'),
        findsOneWidget,
      );
      expect(find.textContaining('private failure'), findsNothing);
      await _visible(tester, 'ai-message-$referenceMessage');
      await tester.pumpAndSettle();
      expect(r.repo.marks, hasLength(1));
      expect(r.repo.prepares, 0);
      expect(r.repo.executes, 0);
      await _dispose(tester, r);
    },
  );
  testWidgets(
    'covered route cannot mark a body from geometry or notification receipt',
    (tester) async {
      final r = await AiReferenceRig.create(tester);
      final response = Completer<Result<AiTopicReadState>>();
      r.repo.nextRead = response.future;
      final navigator = GlobalKey<NavigatorState>();
      await _pump(tester, r, navigator: navigator);
      unawaited(
        navigator.currentState!.push<void>(
          MaterialPageRoute(
            builder: (_) => const Scaffold(body: Text('Another page')),
          ),
        ),
      );
      await tester.pumpAndSettle();
      response.complete(
        const Success(AiTopicReadState(revision: 0, readThroughSequence: 0)),
      );
      await tester.pumpAndSettle();
      expect(r.repo.marks, isEmpty);
      navigator.currentState!.pop();
      await tester.pumpAndSettle();
      expect(r.repo.marks, hasLength(1));
      expect(r.repo.marks.single.sequence, 2);
      await _dispose(tester, r);
    },
  );
  testWidgets(
    'failed exact location opens no latest or old body and has explicit read-only recovery',
    (tester) async {
      final r = await AiReferenceRig.create(tester);
      r.repo.messages = [referenceUser];
      r.repo.messageReads.clear();
      const target = AiMessageLocator(
        conversationId: 'other-owned-topic',
        messageId: referenceMessage,
      );
      await _pump(tester, r, initial: target);
      expect(
        find.byKey(const Key('ai-message-location-status')),
        findsOneWidget,
      );
      expect(find.text(referenceUser.text!), findsNothing);
      expect(find.text(referenceProactive.text!), findsNothing);
      expect(r.repo.messageReads, hasLength(1));
      expect(r.repo.messageReads.single.before, isNotNull);
      await _tap(tester, 'ai-retry-message-location');
      expect(r.repo.messageReads, hasLength(2));
      expect(r.repo.messageReads.every((v) => v.before != null), isTrue);
      expect(r.repo.prepares, 0);
      expect(r.repo.executes, 0);
      expect(r.repo.marks, isEmpty);
      await _dispose(tester, r);
    },
  );
  testWidgets(
    'typed current source opens only after resolver and keeps the exact chat draft',
    (tester) async {
      const card = AiSourceCard(
        cardRef: referenceCard,
        kind: AiSourceKind.checkIn,
        version: 'source-v1',
        sourceOccurredAt: '2026-10-25T00:00:00.000Z',
        observedAt: '2026-10-25T01:00:00.000Z',
      );
      final r = await AiReferenceRig.create(
        tester,
        messages: [
          referenceUser,
          _proactive(sources: const [card]),
        ],
      );
      final opened = <AiSourceTarget>[];
      await _pump(tester, r, onSource: opened.add);
      final input = find.byKey(const Key('ai-message-input'));
      await tester.enterText(input, 'Keep my unsent draft');
      final editor = tester.widget<TextField>(input).controller!;
      editor.selection = const TextSelection(baseOffset: 2, extentOffset: 6);
      final before = editor.value;
      await _tap(tester, 'ai-source-$referenceMessage-$referenceCard');
      expect(opened.single, isA<AiCheckInTarget>());
      expect((opened.single as AiCheckInTarget).checkInId, 'source-checkin');
      expect(r.repo.resolves, hasLength(1));
      expect(editor.value, before);
      expect(r.repo.prepares, 0);
      expect(r.repo.executes, 0);
      await _dispose(tester, r);
    },
  );
  testWidgets(
    'unavailable reference masks old assistant content and does not navigate or send draft',
    (tester) async {
      final r = await AiReferenceRig.create(tester);
      r.repo.nextResolve = Future.value(
        const Failure(
          AppFailure(
            kind: AppFailureKind.aiSourceUnavailable,
            message: 'private stale contents',
          ),
        ),
      );
      final opened = <AiSourceTarget>[];
      await _pump(tester, r, onSource: opened.add);
      final input = find.byKey(const Key('ai-message-input'));
      await tester.enterText(input, 'Unsent draft');
      await _tap(tester, 'ai-source-$referenceMessage-$referenceCard');
      expect(opened, isEmpty);
      expect(find.text(referenceProactive.text!), findsNothing);
      expect(tester.widget<TextField>(input).controller!.text, 'Unsent draft');
      expect(find.textContaining('private stale'), findsNothing);
      expect(r.repo.prepares, 0);
      expect(r.repo.executes, 0);
      await _dispose(tester, r);
    },
  );
  testWidgets(
    'reply affordance adds same-topic association but only explicit Send creates a real user turn',
    (tester) async {
      final r = await AiReferenceRig.create(tester);
      await _pump(tester, r);
      final input = find.byKey(const Key('ai-message-input'));
      await tester.enterText(input, 'My real response');
      await _tap(tester, 'ai-reply-follow-up-$referenceMessage');
      expect(find.byKey(const Key('ai-reply-context')), findsOneWidget);
      expect(
        tester.widget<TextField>(input).controller!.text,
        'My real response',
      );
      expect(r.repo.prepares, 0);
      expect(r.repo.executes, 0);
      await tester.tap(find.byKey(const Key('ai-send')));
      await tester.pumpAndSettle();
      expect(r.repo.replies, [referenceMessage]);
      expect(r.repo.executes, 1);
      expect(
        r.conversationState.messages.where((m) => m.role == AiRole.user),
        hasLength(2),
      );
      expect(
        r.conversationState.messages.where((m) => m.isProactive),
        hasLength(1),
      );
      await _dispose(tester, r);
    },
  );
  testWidgets(
    '320px Chinese 2x source actions and reply stay reachable without changing raw message',
    (tester) async {
      tester.view.physicalSize = const Size(320, 740);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final r = await AiReferenceRig.create(tester);
      await _pump(tester, r, chinese: true, scale: 2);
      await _visible(tester, 'ai-source-$referenceMessage-$referenceCard');
      expect(
        find
            .byKey(const Key('ai-source-$referenceMessage-$referenceCard'))
            .hitTestable(),
        findsOneWidget,
      );
      await _visible(tester, 'ai-reply-follow-up-$referenceMessage');
      expect(
        find
            .byKey(const Key('ai-reply-follow-up-$referenceMessage'))
            .hitTestable(),
        findsOneWidget,
      );
      expect(
        r.conversationState.messages
            .singleWhere((m) => m.messageId == referenceMessage)
            .text,
        referenceProactive.text,
      );
      expect(tester.takeException(), isNull);
      await _dispose(tester, r);
    },
  );
}

AiMessage _proactive({
  int sequence = 2,
  List<AiSourceCard> sources = const [referenceSource],
}) => AiMessage(
  messageId: referenceMessage,
  sequence: sequence,
  role: AiRole.assistant,
  persistedAt: referenceProactive.persistedAt,
  availability: AiAvailability.available,
  text: referenceProactive.text,
  origin: AiMessageOrigin.proactive,
  occurrenceId: referenceOccurrence,
  sources: sources,
);
Future<void> _pump(
  WidgetTester tester,
  AiReferenceRig r, {
  bool social = true,
  bool chinese = false,
  double scale = 1,
  GlobalKey<NavigatorState>? navigator,
  AiMessageLocator? initial,
  ValueChanged<AiSourceTarget>? onSource,
}) async {
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: r.container,
      child: MaterialApp(
        navigatorKey: navigator,
        locale: Locale(chinese ? 'zh' : 'en'),
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
          initialMessage: initial,
          onOpenSourceTarget: onSource,
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> _visible(WidgetTester tester, String key) async {
  final scroll = find
      .descendant(
        of: find.byKey(const Key('route-ai-conversation')),
        matching: find.byType(Scrollable),
      )
      .first;
  tester.state<ScrollableState>(scroll).position.jumpTo(0);
  await tester.pump();
  final finder = find.byKey(Key(key));
  await tester.scrollUntilVisible(
    finder,
    180,
    scrollable: scroll,
    maxScrolls: 45,
  );
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
}

Future<void> _tap(WidgetTester tester, String key) async {
  await _visible(tester, key);
  expect(find.byKey(Key(key)).hitTestable(), findsOneWidget);
  await tester.tap(find.byKey(Key(key)));
  await tester.pumpAndSettle();
}

Future<void> _dispose(WidgetTester tester, AiReferenceRig r) async {
  await tester.pumpWidget(const SizedBox());
  r.dispose();
  await tester.pump();
}
