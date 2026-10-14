import 'dart:async';

import 'package:enmori/features/ai_conversation/ai_conversation_providers.dart';
import 'package:enmori/features/ai_conversation/presentation/ai_conversation_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('Send needs input and Cancel dispatches synchronously', (
    tester,
  ) async {
    final controller = _PageController(_state(canSend: true));
    await _pump(tester, controller);
    expect(controller.sent, isEmpty);
    expect(_filledButton(tester, 'ai-send').onPressed, isNull);
    await tester.enterText(
      find.byKey(const Key('ai-message-input')),
      '  hello  ',
    );
    await _tap(tester, 'ai-send');
    expect(controller.sent, ['  hello  ']);
    expect(find.text('Sending…'), findsOneWidget);
    expect(_filledButton(tester, 'ai-send').onPressed, isNull);
    await tester.tap(find.byKey(const Key('ai-cancel')));
    expect(controller.cancels, 1);
    await tester.pumpAndSettle();
    expect(find.text('Check result'), findsOneWidget);
    expect(find.byKey(const Key('ai-retry')), findsNothing);
    expect(controller.sent, hasLength(1));
  });

  for (final destination in ['back', 'settings']) {
    testWidgets('$destination confirms and leaves before navigation', (
      tester,
    ) async {
      final controller = _PageController(
        _state(phase: AiConversationPhase.waiting, canCancel: true),
      );
      await _pump(
        tester,
        controller,
        onBack: () => controller.events.add('back'),
        onSettings: () => controller.events.add('settings'),
      );
      await _tap(tester, 'ai-$destination');
      expect(find.text('Request cancel and leave'), findsOneWidget);
      await tester.tap(find.text('Stay'));
      await tester.pumpAndSettle();
      expect(controller.events, isEmpty);
      await _tap(tester, 'ai-$destination');
      await _tap(tester, 'ai-confirm-leave');
      expect(controller.events, ['leave', destination]);
    });
  }

  testWidgets('returning from Settings permits only a new explicit action', (
    tester,
  ) async {
    final controller = _PageController(
      _state(phase: AiConversationPhase.waiting, canCancel: true),
    );
    await _pump(
      tester,
      controller,
      onSettings: () {
        Navigator.of(
          tester.element(find.byType(AiConversationPage)),
        ).push<void>(
          MaterialPageRoute(
            builder: (_) =>
                Scaffold(appBar: AppBar(title: const Text('Settings fixture'))),
          ),
        );
      },
    );
    await _tap(tester, 'ai-settings');
    await _tap(tester, 'ai-confirm-leave');
    expect(find.text('Settings fixture'), findsOneWidget);
    expect(controller.events, ['leave']);
    expect(controller.detaches, 0);
    expect(controller.sent, isEmpty);
    await tester.tap(find.byType(BackButton));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('ai-message-input')), findsOneWidget);
    expect(controller.sent, isEmpty);
    expect(controller.retried, isEmpty);
    await tester.enterText(
      find.byKey(const Key('ai-message-input')),
      'new explicit input',
    );
    await _tap(tester, 'ai-send');
    expect(controller.sent, ['new explicit input']);
  });

  testWidgets('system Back uses the same in-progress confirmation', (
    tester,
  ) async {
    final controller = _PageController(
      _state(phase: AiConversationPhase.preparing, canCancel: true),
    );
    await _pump(tester, controller);
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(find.text('Stay'), findsOneWidget);
    expect(controller.events, isEmpty);
    await tester.tap(find.text('Stay'));
    await tester.pumpAndSettle();
  });

  testWidgets(
    'inactive preserves work; paused and detached request cancellation',
    (tester) async {
      final controller = _PageController(
        _state(phase: AiConversationPhase.waiting, canCancel: true),
      );
      await _pump(tester, controller);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      expect(controller.cancels, 0);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      expect(controller.cancels, 1);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.detached);
      expect(controller.cancels, 2);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pumpAndSettle();
    },
  );

  testWidgets('disposal synchronously detaches without a provider write', (
    tester,
  ) async {
    final controller = _PageController(
      _state(phase: AiConversationPhase.preparing, canCancel: true),
    );
    await _pump(tester, controller);
    await tester.pumpWidget(const SizedBox());
    expect(controller.detaches, 1);
    expect(tester.takeException(), isNull);
  });

  testWidgets('session replacement removes the composer draft', (tester) async {
    final controller = _PageController(_state(canSend: true));
    await _pump(tester, controller);
    await tester.enterText(
      find.byKey(const Key('ai-message-input')),
      'private draft',
    );
    controller.publish(_state(sessionKey: 'new-session', canSend: true));
    await tester.pumpAndSettle();
    final input = tester.widget<TextField>(
      find.byKey(const Key('ai-message-input')),
    );
    expect(input.controller!.text, isEmpty);
    expect(controller.detaches, 1);
    expect(controller.sent, isEmpty);
  });

  testWidgets('same-session auth rejection clears the draft before recovery', (
    tester,
  ) async {
    final controller = _PageController(_state(canSend: true));
    await _pump(tester, controller);
    await tester.enterText(
      find.byKey(const Key('ai-message-input')),
      'private unsent draft',
    );
    final input = tester.widget<TextField>(
      find.byKey(const Key('ai-message-input')),
    );
    expect(input.focusNode!.hasFocus, isTrue);
    controller.publish(_state(phase: AiConversationPhase.unauthenticated));
    expect(input.controller!.text, isEmpty);
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('ai-message-input')), findsNothing);
    expect(input.focusNode!.hasFocus, isFalse);
    expect(controller.detaches, 0);
    controller.publish(_state(canSend: true));
    await tester.pumpAndSettle();
    final restored = tester.widget<TextField>(
      find.byKey(const Key('ai-message-input')),
    );
    expect(restored.controller!.text, isEmpty);
    expect(_filledButton(tester, 'ai-send').onPressed, isNull);
    expect(controller.sent, isEmpty);
    expect(controller.retried, isEmpty);
  });

  const outcomes = {
    AiConversationPhase.limited:
        'Check-in context is not available under your current permissions.',
    AiConversationPhase.busy: 'AI is busy. Try again later.',
    AiConversationPhase.unavailable:
        'AI is unavailable right now. Try again later.',
    AiConversationPhase.rejected: 'A reply could not be provided.',
    AiConversationPhase.timedOut:
        'This request timed out. Check saved messages before trying again.',
    AiConversationPhase.unknown: 'We couldn’t confirm the result. Check saved messages before trying again.',
    AiConversationPhase.authorityChanged: 'This reply is no longer available.',
    AiConversationPhase.deleted: 'Conversation deleted.',
    AiConversationPhase.unauthenticated:
        'Your session has expired. Sign in again.',
  };
  for (final outcome in outcomes.entries) {
    testWidgets(
      '${outcome.key.name} displays non-content state without auto retry',
      (tester) async {
        final controller = _PageController(_state(phase: outcome.key));
        await _pump(tester, controller);
        expect(find.text(outcome.value), findsOneWidget);
        expect(find.byKey(const Key('ai-retry')), findsNothing);
        expect(controller.sent, isEmpty);
        expect(controller.retried, isEmpty);
        expect(controller.checks, 0);
      },
    );
  }

  testWidgets(
    'Retry requires newly entered text and preserves displayed user time',
    (tester) async {
      final user = _message('user', 1, AiRole.user, 'original text');
      final controller = _PageController(
        _state(
          phase: AiConversationPhase.success,
          messages: [user],
          canRetry: true,
        ),
      );
      await _pump(tester, controller);
      await tester.ensureVisible(find.byKey(const Key('ai-retry')));
      expect(
        tester
            .widget<OutlinedButton>(find.byKey(const Key('ai-retry')))
            .onPressed,
        isNull,
      );
      expect(controller.retried, isEmpty);
      await tester.enterText(
        find.byKey(const Key('ai-message-input')),
        'original text',
      );
      await _tap(tester, 'ai-retry');
      expect(controller.retried, ['original text']);
      expect(controller.sent, isEmpty);
      expect(find.byKey(const Key('ai-message-user')), findsOneWidget);
      expect(
        find.text(user.persistedAt.toUtc().toIso8601String()),
        findsOneWidget,
      );
    },
  );

  testWidgets(
    'messages are plain text and a tombstone removes existing content',
    (tester) async {
      final controller = _PageController(
        _state(
          phase: AiConversationPhase.success,
          messages: [
            _message('reply', 2, AiRole.assistant, '<b>Plain text</b>'),
          ],
        ),
      );
      await _pump(tester, controller);
      expect(find.text('<b>Plain text</b>'), findsOneWidget);
      controller.publish(
        _state(
          phase: AiConversationPhase.success,
          messages: [
            _message('reply', 2, AiRole.assistant, null, unavailable: true),
          ],
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('<b>Plain text</b>'), findsNothing);
      expect(find.text('This reply is no longer available.'), findsOneWidget);
      expect(find.byKey(const Key('ai-message-reply')), findsOneWidget);
      expect(find.byKey(const Key('ai-retry')), findsNothing);
    },
  );

  testWidgets(
    'Delete requires confirmation, hides immediately and Check again only deletes',
    (tester) async {
      final controller = _PageController(
        _state(
          phase: AiConversationPhase.success,
          conversationId: 'conversation',
          messages: [_message('user', 1, AiRole.user, 'saved private text')],
          canDelete: true,
        ),
      );
      controller.deleteGate = Completer<void>();
      await _pump(tester, controller);
      await _tap(tester, 'ai-delete');
      expect(
        find.text(
          'Delete this conversation? All messages will be permanently deleted.',
        ),
        findsOneWidget,
      );
      await tester.tap(find.text('Keep'));
      await tester.pumpAndSettle();
      expect(controller.deletes, 0);
      await _tap(tester, 'ai-delete');
      await _tap(tester, 'ai-confirm-delete');
      expect(controller.deletes, 1);
      expect(find.text('saved private text'), findsNothing);
      expect(find.text('Deleting…'), findsOneWidget);
      controller.publish(
        _state(
          phase: AiConversationPhase.deleteUnknown,
          conversationId: 'conversation',
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Conversation deleted.'), findsNothing);
      await _tap(tester, 'ai-check-delete');
      expect(controller.deletes, 2);
      expect(controller.checks, 0);
      expect(controller.sent, isEmpty);
      controller.deleteGate!.complete();
      await tester.pumpAndSettle();
    },
  );

  testWidgets('ordinary reads and outcome checks do not resend', (
    tester,
  ) async {
    final controller = _PageController(
      _state(
        phase: AiConversationPhase.unknown,
        conversationId: 'conversation',
        nextCursor: 'earlier',
        canCheckResult: true,
      ),
    );
    await _pump(tester, controller);
    expect(controller.reads, [null]);
    await _tap(tester, 'ai-check-result');
    await _tap(tester, 'ai-reload-messages');
    await _tap(tester, 'ai-load-earlier');
    expect(controller.checks, 1);
    expect(controller.reads, [null, null, 'earlier']);
    expect(controller.sent, isEmpty);
    expect(controller.retried, isEmpty);
  });

  testWidgets(
    'R-A explains unknown and clears private display and draft before leaving',
    (tester) async {
      final controller = _PageController(_state(canSend: true));
      late TextEditingController draft;
      await _pump(
        tester,
        controller,
        onBack: () {
          expect(draft.text, isEmpty);
          expect(controller.view.messages, isEmpty);
          expect(controller.view.canSend, isFalse);
          controller.events.add('back');
        },
      );
      await tester.enterText(
        find.byKey(const Key('ai-message-input')),
        'private unsent draft',
      );
      draft = tester
          .widget<TextField>(find.byKey(const Key('ai-message-input')))
          .controller!;
      controller.publish(
        _state(
          phase: AiConversationPhase.unknown,
          conversationId: 'conversation',
          messages: [_message('user', 1, AiRole.user, 'saved private text')],
          canCheckResult: true,
          canLeaveWithoutRetrying: true,
        ),
      );
      await tester.pumpAndSettle();
      expect(
        find.text(
          'We couldn’t confirm the result. Check saved messages before trying again.',
        ),
        findsOneWidget,
      );
      expect(
        find.text(
          'We may not be able to confirm whether this message was saved. '
          'You can leave without retrying it. Leaving does not delete saved messages.',
        ),
        findsOneWidget,
      );
      await _tap(tester, 'ai-leave-without-retrying');
      expect(controller.events, ['leave', 'back']);
      expect(find.text('saved private text'), findsNothing);
      expect(find.text('Conversation deleted.'), findsNothing);
      expect(find.byKey(const Key('ai-retry')), findsNothing);
      expect(controller.sent, isEmpty);
      expect(controller.retried, isEmpty);
      expect(controller.checks, 0);
      expect(controller.deletes, 0);
    },
  );

  testWidgets(
    'R-A exit stays reachable during a result read at 2x text on a small screen',
    (tester) async {
      tester.view.physicalSize = const Size(320, 640);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final semantics = tester.ensureSemantics();
      try {
        final controller = _PageController(
          _state(
            phase: AiConversationPhase.unknown,
            conversationId: 'conversation',
            canLeaveWithoutRetrying: true,
            readBusy: true,
          ),
        );
        await _pump(tester, controller, textScale: 2);
        final exit = find.byKey(const Key('ai-leave-without-retrying'));
        await tester.scrollUntilVisible(
          exit,
          200,
          scrollable: find
              .descendant(
                of: find.byKey(const Key('route-ai-conversation')),
                matching: find.byType(Scrollable),
              )
              .first,
        );
        await tester.ensureVisible(exit);
        await tester.pumpAndSettle();
        expect(find.bySemanticsLabel('Leave without retrying'), findsOneWidget);
        expect(tester.getSize(exit).height, greaterThanOrEqualTo(48));
        expect(tester.getSize(exit).width, greaterThanOrEqualTo(48));
        expect(tester.widget<OutlinedButton>(exit).onPressed, isNotNull);
        expect(tester.takeException(), isNull);
        await _tap(tester, 'ai-leave-without-retrying');
        expect(controller.events, ['leave']);
        expect(controller.checks, 0);
        expect(controller.sent, isEmpty);
        expect(controller.retried, isEmpty);
        expect(tester.takeException(), isNull);
      } finally {
        semantics.dispose();
      }
    },
  );

  testWidgets(
    'small screen at 2x text keeps labeled Cancel reachable at 48dp',
    (tester) async {
      tester.view.physicalSize = const Size(320, 640);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final semantics = tester.ensureSemantics();
      try {
        final controller = _PageController(
          _state(phase: AiConversationPhase.waiting, canCancel: true),
        );
        await _pump(tester, controller, textScale: 2);
        expect(find.bySemanticsLabel('Waiting for a reply…'), findsOneWidget);
        expect(find.bySemanticsLabel('Cancel'), findsOneWidget);
        final size = tester.getSize(find.byKey(const Key('ai-cancel')));
        expect(size.height, greaterThanOrEqualTo(48));
        expect(size.width, greaterThanOrEqualTo(48));
        expect(tester.takeException(), isNull);
        await _tap(tester, 'ai-back');
        expect(find.text('Stay'), findsOneWidget);
        expect(find.text('Request cancel and leave'), findsOneWidget);
        expect(tester.takeException(), isNull);
        await tester.tap(find.text('Stay'));
        await tester.pumpAndSettle();
      } finally {
        semantics.dispose();
      }
    },
  );
}

AiConversationState _state({
  Object sessionKey = 'session',
  AiConversationPhase phase = AiConversationPhase.idle,
  Iterable<AiMessage> messages = const [],
  String? conversationId,
  String? nextCursor,
  bool canSend = false,
  bool canRetry = false,
  bool canCheckResult = false,
  bool canCancel = false,
  bool canLeaveWithoutRetrying = false,
  bool canDelete = false,
  bool readBusy = false,
}) => AiConversationState(
  sessionKey: sessionKey,
  phase: phase,
  messages: messages,
  conversationId: conversationId,
  nextCursor: nextCursor,
  canSend: canSend,
  canRetry: canRetry,
  canCheckResult: canCheckResult,
  canCancel: canCancel,
  canLeaveWithoutRetrying: canLeaveWithoutRetrying,
  canDelete: canDelete,
  readBusy: readBusy,
);

AiMessage _message(
  String id,
  int sequence,
  AiRole role,
  String? text, {
  bool unavailable = false,
}) => AiMessage(
  messageId: id,
  sequence: sequence,
  role: role,
  persistedAt: DateTime.utc(2026, 10, 12, 12, sequence),
  availability: unavailable
      ? AiAvailability.unavailable
      : AiAvailability.available,
  text: text,
);

Future<void> _pump(
  WidgetTester tester,
  _PageController controller, {
  VoidCallback? onBack,
  VoidCallback? onSettings,
  double textScale = 1,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        aiConversationControllerProvider.overrideWith(() => controller),
      ],
      child: MaterialApp(
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context)
              .copyWith(textScaler: TextScaler.linear(textScale)),
          child: child!,
        ),
        home: AiConversationPage(
          onBack: onBack ?? () {},
          onOpenSettings: onSettings ?? () {},
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

FilledButton _filledButton(WidgetTester tester, String key) =>
    tester.widget<FilledButton>(find.byKey(Key(key)));

Future<void> _tap(WidgetTester tester, String key) async {
  await tester.pump();
  final finder = find.byKey(Key(key));
  if (finder.evaluate().isEmpty) {
    await tester.scrollUntilVisible(
      finder,
      200,
      scrollable: find
          .descendant(
            of: find.byKey(const Key('route-ai-conversation')),
            matching: find.byType(Scrollable),
          )
          .first,
    );
  }
  await tester.ensureVisible(finder);
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

/// Tests the public page/controller boundary; no transport or auth is contacted.
class _PageController extends AiConversationController {
  _PageController(this.initial);

  final AiConversationState initial;
  final sent = <String>[];
  final retried = <String>[];
  final reads = <String?>[];
  final events = <String>[];
  int cancels = 0;
  int detaches = 0;
  int checks = 0;
  int deletes = 0;
  Completer<void>? deleteGate;

  @override
  AiConversationState build() => initial;

  AiConversationState get view => state;

  void publish(AiConversationState next) => state = next;

  @override
  Future<void> send(String text) async {
    sent.add(text);
    state = _state(phase: AiConversationPhase.preparing, canCancel: true);
  }

  @override
  Future<void> retry(String text) async => retried.add(text);

  @override
  void cancel() {
    cancels++;
    state = _state(phase: AiConversationPhase.unknown, canCheckResult: true);
  }

  @override
  void leave() {
    events.add('leave');
    state = state.canLeaveWithoutRetrying
        ? _state(
            phase: AiConversationPhase.unknown,
            conversationId: state.conversationId,
            canCheckResult: true,
            canLeaveWithoutRetrying: true,
          )
        : _state(canSend: true);
  }

  @override
  void detach({Object? sessionKey}) => detaches++;

  @override
  Future<void> checkResult() async => checks++;

  @override
  Future<void> loadMessages({String? before}) async => reads.add(before);

  @override
  Future<void> deleteConversation() async {
    deletes++;
    state = _state(phase: AiConversationPhase.deleting);
    await deleteGate?.future;
  }
}
