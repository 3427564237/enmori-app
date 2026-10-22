import 'dart:async';

import 'package:enmori/features/ai_conversation/ai_conversation_providers.dart';
import 'package:enmori/features/ai_conversation/presentation/ai_conversation_page.dart';
import 'package:enmori/harness/social/offline_social_pages.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets(
    'returning chat opens latest and explicit latest preserves draft and older reading',
    (tester) async {
      tester.view.physicalSize = const Size(320, 800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final messages = [
        for (var i = 0; i < 30; i++)
          _message('saved-$i', i + 1, AiRole.user, 'Saved message $i'),
      ];
      final controller = _PageController(
        _state(canSend: true, messages: messages),
      );
      await _pump(tester, controller, socialStyle: true, textScale: 2);
      final scroll = tester
          .state<ScrollableState>(
            find
                .descendant(
                  of: find.byKey(const Key('route-ai-conversation')),
                  matching: find.byType(Scrollable),
                )
                .first,
          )
          .position;
      expect(scroll.extentAfter, lessThanOrEqualTo(1));
      final input = find.byKey(const Key('ai-message-input'));
      await tester.enterText(input, 'Keep this draft');
      scroll.jumpTo(0);
      await tester.pumpAndSettle();
      final olderOffset = scroll.pixels;
      messages.add(
        _message('reply', 31, AiRole.assistant, 'Here is the latest reply.'),
      );
      controller.publish(_state(canSend: true, messages: messages));
      await tester.pumpAndSettle();
      expect(scroll.pixels, olderOffset);
      await tester.tap(find.byKey(const Key('ai-latest-messages')));
      await tester.pumpAndSettle();
      expect(scroll.extentAfter, lessThanOrEqualTo(1));
      expect(find.byKey(const Key('ai-latest-messages')), findsNothing);
      expect(
        tester.widget<TextField>(input).controller!.text,
        'Keep this draft',
      );
      expect(controller.sent, isEmpty);
      expect(controller.reads, isEmpty);
      expect(controller.cancels, 0);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'typing dots animate only while waiting and reduced motion stays static',
    (tester) async {
      for (final reduced in [false, true]) {
        final controller = _PageController(_state(canSend: true));
        await _pump(
          tester,
          controller,
          socialStyle: true,
          reduceMotion: reduced,
        );
        controller.publish(
          _state(
            phase: AiConversationPhase.waiting,
            canCancel: true,
            localOutgoingKey: 'attempt',
            localOutgoingText: 'Waiting input',
          ),
        );
        await tester.pump();
        final first = tester
            .widget<Opacity>(find.byKey(const Key('ai-typing-dot-0')))
            .opacity;
        await tester.pump(const Duration(milliseconds: 300));
        final next = tester
            .widget<Opacity>(find.byKey(const Key('ai-typing-dot-0')))
            .opacity;
        expect(next, reduced ? first : isNot(first));
        controller.publish(
          _state(phase: AiConversationPhase.success, canSend: true),
        );
        await tester.pumpAndSettle();
        expect(find.byKey(const Key('ai-pending-assistant')), findsNothing);
        await tester.pumpWidget(const SizedBox.shrink());
        expect(tester.takeException(), isNull);
      }
    },
  );

  testWidgets(
    'chat keeps safety reachable without repeating it below messages',
    (tester) async {
      final controller = _PageController(
        _state(
          phase: AiConversationPhase.success,
          canSend: true,
          messages: [
            _message('u', 1, AiRole.user, 'A quiet walk after class.'),
            _message(
              'a',
              2,
              AiRole.assistant,
              'What did you notice on your walk?',
            ),
          ],
        ),
      );
      await _pump(tester, controller, socialStyle: true);
      final input = find.byKey(const Key('ai-message-input'));
      await tester.enterText(input, 'Keep this draft');
      expect(find.textContaining('AI can make mistakes'), findsNothing);
      expect(find.byKey(const Key('ai-status')), findsNothing);
      await tester.tap(find.byTooltip('Open conversation menu'));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('ai-safety')));
      await tester.pumpAndSettle();
      expect(
        tester.state<ScaffoldState>(find.byType(Scaffold)).isDrawerOpen,
        isFalse,
      );
      expect(
        find.text(
          'AI can make mistakes. Persona preferences do not change data permissions.',
        ),
        findsOneWidget,
      );
      await tester.tap(find.text('Close'));
      await tester.pumpAndSettle();
      expect(
        tester.widget<TextField>(input).controller!.text,
        'Keep this draft',
      );
      expect(find.text('What did you notice on your walk?'), findsOneWidget);
      expect(controller.sent, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'chat waiting feedback is single and unknown recovery stays visible',
    (tester) async {
      final controller = _PageController(
        _state(
          phase: AiConversationPhase.waiting,
          canCancel: true,
          localOutgoingKey: 'pending',
          localOutgoingText: 'My message',
        ),
      );
      await _pump(tester, controller, socialStyle: true);
      expect(find.text('Waiting for a reply…'), findsOneWidget);
      expect(find.byKey(const Key('ai-cancel')), findsOneWidget);
      expect(find.byKey(const Key('ai-status')), findsOneWidget);
      controller.publish(
        _state(
          phase: AiConversationPhase.unknown,
          canCheckResult: true,
          canLeaveWithoutRetrying: true,
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('ai-check-result')), findsOneWidget);
      expect(find.byKey(const Key('ai-recovery-explanation')), findsOneWidget);
      expect(
        find.byKey(const Key('ai-leave-without-retrying')),
        findsOneWidget,
      );
      expect(find.byKey(const Key('ai-cancel')), findsNothing);
      expect(controller.sent, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'pending bubbles follow the bottom and preserve deliberate older reading',
    (tester) async {
      final messages = [
        for (var i = 0; i < 20; i++)
          _message('old-$i', i + 1, AiRole.user, 'Old message $i'),
      ];
      final controller = _PageController(
        _state(canSend: true, messages: messages),
      );
      await _pump(tester, controller, socialStyle: true);
      final scroll = tester
          .state<ScrollableState>(
            find
                .descendant(
                  of: find.byKey(const Key('route-ai-conversation')),
                  matching: find.byType(Scrollable),
                )
                .first,
          )
          .position;
      for (var i = 0; i < 4; i++) {
        scroll.jumpTo(scroll.maxScrollExtent);
        await tester.pumpAndSettle();
      }
      controller.publish(
        _state(
          phase: AiConversationPhase.preparing,
          canCancel: true,
          messages: messages,
          localOutgoingText: 'New local input',
          localOutgoingKey: 'attempt',
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('ai-local-outgoing')), findsOneWidget);
      expect(find.byKey(const Key('ai-pending-assistant')), findsOneWidget);
      expect(scroll.extentAfter, lessThanOrEqualTo(1));
      expect(
        tester.getTopLeft(find.byKey(const Key('ai-status'))).dy,
        greaterThan(
          tester.getTopLeft(find.byKey(const Key('ai-local-outgoing'))).dy,
        ),
      );
      scroll.jumpTo(0);
      await tester.pumpAndSettle();
      controller.publish(
        _state(
          phase: AiConversationPhase.waiting,
          canCancel: true,
          messages: messages,
          localOutgoingText: 'New local input',
          localOutgoingKey: 'attempt',
        ),
      );
      await tester.pumpAndSettle();
      expect(scroll.pixels, 0);
      controller.publish(
        _state(
          phase: AiConversationPhase.success,
          canSend: true,
          messages: [
            ...messages,
            _message('committed', 21, AiRole.user, 'New local input'),
            _message('reply', 22, AiRole.assistant, 'Saved reply'),
          ],
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('ai-local-outgoing')), findsNothing);
      expect(find.byKey(const Key('ai-pending-assistant')), findsNothing);
      expect(scroll.pixels, 0);
    },
  );

  for (final social in [false, true]) {
    for (final phase in [
      AiConversationPhase.limited,
      AiConversationPhase.authorityChanged,
    ]) {
      testWidgets(
        'withdrawn AI authority clears the editor social=$social phase=$phase',
        (tester) async {
          final controller = _PageController(_state(canSend: true));
          await _pump(tester, controller, socialStyle: social);
          final input = find.byKey(const Key('ai-message-input'));
          await tester.enterText(input, 'Private unsent input');
          final editor = tester.widget<TextField>(input).controller!;
          controller.publish(_state(phase: phase));
          await tester.pumpAndSettle();
          expect(input, findsNothing);
          expect(editor.text, isEmpty);
          expect(controller.sent, isEmpty);
        },
      );
    }
  }
  testWidgets(
    'history selection protects draft and empty scanned page exposes continuation at large text',
    (tester) async {
      tester.view.physicalSize = const Size(320, 640);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final summary = AiConversationSummary(
        conversationId: '11111111-1111-4111-8111-111111111111',
        lastMessageAt: DateTime.utc(2026, 10, 20),
      );
      final controller = _PageController(
        _state(
          canSend: true,
          conversationId: 'old-conversation',
          messages: [_message('old', 1, AiRole.user, 'Saved original message')],
          canBrowseHistory: true,
          canSelectConversation: true,
          historyLoaded: true,
          conversations: [summary],
        ),
      );
      await _pump(tester, controller, socialStyle: true, textScale: 2);
      await tester.enterText(
        find.byKey(const Key('ai-message-input')),
        'Keep this draft',
      );
      final scaffold = tester.state<ScaffoldState>(find.byType(Scaffold));
      await _tap(tester, 'ai-history');
      expect(scaffold.isDrawerOpen, isTrue);
      await _tap(tester, 'ai-history-${summary.conversationId}');
      expect(scaffold.isDrawerOpen, isFalse);
      await tester.tap(find.text('Keep editing'));
      await tester.pumpAndSettle();
      expect(controller.selected, isEmpty);
      expect(controller.view.conversationId, 'old-conversation');
      expect(controller.view.messages.single.text, 'Saved original message');
      expect(find.text('Saved original message'), findsOneWidget);
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('ai-message-input')))
            .controller!
            .text,
        'Keep this draft',
      );
      await _tap(tester, 'ai-history-${summary.conversationId}');
      expect(scaffold.isDrawerOpen, isFalse);
      await tester.tap(find.byKey(const Key('ai-confirm-discard')));
      await tester.pumpAndSettle();
      expect(controller.selected, [summary.conversationId]);
      expect(controller.sent, isEmpty);
      expect(controller.view.messages.single.text, 'Saved original message');
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('ai-message-input')))
            .controller!
            .text,
        isEmpty,
      );
      controller.publish(
        _state(
          canSend: true,
          canBrowseHistory: true,
          historyLoaded: true,
          historyCursor: summary.conversationId,
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('No saved conversations.'), findsNothing);
      await _tap(tester, 'ai-history-more');
      expect(controller.historyLoads, [true]);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'social history selection without a draft closes its own drawer',
    (tester) async {
      final summary = AiConversationSummary(
        conversationId: '11111111-1111-4111-8111-111111111111',
        lastMessageAt: DateTime.utc(2026, 10, 20),
      );
      final controller = _PageController(
        _state(
          canSend: true,
          canBrowseHistory: true,
          canSelectConversation: true,
          historyLoaded: true,
          conversations: [summary],
        ),
      );
      await _pump(tester, controller, socialStyle: true, reduceMotion: false);
      final scaffold = tester.state<ScaffoldState>(find.byType(Scaffold));
      await tester.tap(find.byTooltip('Open conversation menu'));
      await tester.pumpAndSettle();
      expect(scaffold.isDrawerOpen, isTrue);
      await tester.ensureVisible(find.byKey(const Key('ai-history')));
      await tester.tap(find.byKey(const Key('ai-history')));
      await tester.pumpAndSettle();
      await tester.tap(
        find.byKey(ValueKey('ai-history-${summary.conversationId}')),
      );
      await tester.pumpAndSettle();
      expect(scaffold.isDrawerOpen, isFalse);
      expect(controller.selected, [summary.conversationId]);
      expect(find.byType(AlertDialog), findsNothing);
      expect(controller.sent, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );
  for (final social in [false, true]) {
    testWidgets('new replies follow only near the bottom social=$social', (
      tester,
    ) async {
      final messages = [
        for (var i = 0; i < 24; i++)
          _message('saved-$i', i + 1, AiRole.user, 'Saved message $i'),
      ];
      final controller = _PageController(
        _state(canSend: true, messages: messages),
      );
      await _pump(tester, controller, socialStyle: social);
      final scroll = tester
          .state<ScrollableState>(
            find
                .descendant(
                  of: find.byKey(const Key('route-ai-conversation')),
                  matching: find.byType(Scrollable),
                )
                .first,
          )
          .position;
      // Settle lazy layout at the actual end before the next reply arrives.
      for (var i = 0; i < 4; i++) {
        scroll.jumpTo(scroll.maxScrollExtent);
        await tester.pumpAndSettle();
      }
      messages.add(
        _message('reply-1', 25, AiRole.assistant, 'A new reply. ' * 20),
      );
      controller.publish(_state(canSend: true, messages: messages));
      await tester.pumpAndSettle();
      expect(scroll.extentAfter, lessThanOrEqualTo(1));

      scroll.jumpTo(0);
      await tester.pumpAndSettle();
      final readingOffset = scroll.pixels;
      messages.add(
        _message('reply-2', 26, AiRole.assistant, 'Another reply. ' * 20),
      );
      controller.publish(_state(canSend: true, messages: messages));
      await tester.pumpAndSettle();
      expect(scroll.pixels, readingOffset);
      expect(scroll.extentAfter, greaterThan(100));
      expect(controller.sent, isEmpty);
      expect(tester.takeException(), isNull);
    });
  }

  for (final social in [false, true]) {
    testWidgets(
      'New conversation preserves draft, selection and focus social=$social',
      (tester) async {
        final controller = _PageController(
          _state(canSend: true, canStartNewConversation: true),
        );
        await _pump(tester, controller, socialStyle: social);
        final input = find.byKey(const Key('ai-message-input'));
        await tester.enterText(input, 'An unfinished draft');
        final field = tester.widget<TextField>(input);
        const selection = TextSelection(baseOffset: 3, extentOffset: 9);
        field.controller!.selection = selection;
        // Invoke the visible new-conversation action without moving focus.
        if (social) {
          tester
              .widget<IconButton>(find.byKey(const Key('ai-new-conversation')))
              .onPressed!();
        } else {
          tester
              .widget<OutlinedButton>(
                find.byKey(const Key('ai-new-conversation')),
              )
              .onPressed!();
        }
        await tester.pumpAndSettle();
        final current = tester.widget<TextField>(input);
        expect(current.controller!.text, 'An unfinished draft');
        expect(current.controller!.selection, selection);
        expect(current.focusNode!.hasFocus, isTrue);
        expect(controller.events, ['new']);
        expect(controller.sent, isEmpty);
        expect(controller.deletes, 0);
      },
    );
  }

  for (final action in ['delete']) {
    for (final authRejected in [false, true]) {
      testWidgets(
        'session dialog AI $action closes on ${authRejected ? 'auth rejection' : 'session replacement'} and permits fresh use',
        (tester) async {
          final controller = _PageController(
            _state(
              canSend: action == 'discard',
              canCancel: action == 'leave',
              canDelete: action == 'delete',
              phase: action == 'leave'
                  ? AiConversationPhase.waiting
                  : AiConversationPhase.idle,
            ),
          );
          await _pump(
            tester,
            controller,
            onBack: () => controller.events.add('back'),
          );
          if (action == 'discard') {
            await tester.enterText(
              find.byKey(const Key('ai-message-input')),
              'Old session draft',
            );
          }
          await _tap(tester, action == 'delete' ? 'ai-delete' : 'ai-back');
          final confirmation = find.byKey(Key('ai-confirm-$action'));
          final oldRoute = ModalRoute.of(tester.element(confirmation))!;
          final staleAction = tester
              .widget<TextButton>(confirmation)
              .onPressed!;
          controller.publish(
            authRejected
                ? _state(phase: AiConversationPhase.unauthenticated)
                : _state(sessionKey: 'replacement', canSend: true),
          );
          await tester.pumpAndSettle();
          expect(confirmation, findsNothing);
          expect(oldRoute.isActive, isFalse);
          staleAction();
          await tester.pumpAndSettle();
          expect(controller.events, isEmpty);
          expect(controller.cancels, 0);
          expect(controller.deletes, 0);
          expect(controller.sent, isEmpty);
          expect(controller.retried, isEmpty);
          if (authRejected) {
            expect(find.byKey(const Key('ai-message-input')), findsNothing);
            controller.publish(
              _state(sessionKey: 'replacement', canSend: true),
            );
            await tester.pumpAndSettle();
          }
          final input = find.byKey(const Key('ai-message-input'));
          expect(tester.widget<TextField>(input).controller!.text, isEmpty);
          await tester.enterText(input, 'Fresh explicit input');
          await _tap(tester, 'ai-send');
          expect(controller.sent, ['Fresh explicit input']);
          expect(tester.takeException(), isNull);
        },
      );
    }
  }

  testWidgets('session dialog cleanup preserves a newer route above it', (
    tester,
  ) async {
    final controller = _PageController(_state(canSend: true, canDelete: true));
    await _pump(tester, controller);
    await tester.enterText(
      find.byKey(const Key('ai-message-input')),
      'Old session draft',
    );
    await _tap(tester, 'ai-delete');
    final staleAction = tester
        .widget<TextButton>(find.byKey(const Key('ai-confirm-delete')))
        .onPressed!;
    final navigator = Navigator.of(
      tester.element(find.byType(AiConversationPage)),
    );
    unawaited(
      navigator.push<void>(
        MaterialPageRoute(
          builder: (_) => const Scaffold(body: Text('New session destination')),
        ),
      ),
    );
    await tester.pumpAndSettle();
    staleAction();
    await tester.pumpAndSettle();
    expect(find.text('New session destination'), findsOneWidget);
    controller.publish(_state(sessionKey: 'replacement', canSend: true));
    await tester.pumpAndSettle();
    expect(find.text('New session destination'), findsOneWidget);
    navigator.pop();
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('ai-confirm-delete')), findsNothing);
    expect(controller.events, isEmpty);
    expect(controller.sent, isEmpty);
    expect(tester.takeException(), isNull);
  });

  testWidgets('social composer leaves one primary scroll target for PageDown', (
    tester,
  ) async {
    final controller = _PageController(
      _state(
        canSend: true,
        messages: [
          for (var index = 0; index < 40; index++)
            _message('history-$index', index + 1, AiRole.user, 'Saved $index'),
        ],
      ),
    );
    await _pump(tester, controller, socialStyle: true);
    final settingsContext = tester.element(find.byIcon(Icons.menu));
    final settingsFocus = Focus.of(settingsContext);
    settingsFocus.requestFocus();
    await tester.pumpAndSettle();
    expect(settingsFocus.hasFocus, isTrue);
    final primary = PrimaryScrollController.of(settingsContext);
    // Chat now opens at the latest message; move up before testing PageDown.
    primary.jumpTo(0);
    await tester.pumpAndSettle();
    final initialOffset = primary.positions.first.pixels;
    await tester.sendKeyEvent(LogicalKeyboardKey.pageDown);
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    expect(primary.positions, hasLength(1));
    expect(primary.position.pixels, greaterThan(initialOffset));
    expect(controller.sent, isEmpty);
    expect(controller.retried, isEmpty);
  }, variant: TargetPlatformVariant.only(TargetPlatform.android));

  for (final longHistory in [false, true]) {
    for (final retry in [false, true]) {
      testWidgets(
        'social composer preserves editing across keyboard layout changes longHistory=$longHistory retry=$retry',
        (tester) async {
          tester.view.physicalSize = const Size(320, 900);
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          addTearDown(tester.view.resetViewInsets);
          final controller = _PageController(
            _state(
              canSend: !retry,
              canRetry: retry,
              messages: [
                if (longHistory)
                  for (var index = 0; index < 40; index++)
                    _message(
                      'history-$index',
                      index + 1,
                      AiRole.user,
                      'Saved message $index',
                    ),
              ],
            ),
          );
          await _pump(
            tester,
            controller,
            socialStyle: true,
            textScale: 2,
            navigationBarBuilder: (navigate) =>
                OfflineSocialNavigation(selectedIndex: 3, onSelected: (_) {}),
          );
          final input = find.byKey(const Key('ai-message-input'));
          if (longHistory) {
            expect(
              find.byKey(const ValueKey('ai-message-history-0')),
              findsNothing,
              reason: 'Opening at latest should leave distant older rows lazy.',
            );
            expect(
              find.byKey(const ValueKey('ai-message-history-39')),
              findsOneWidget,
            );
          }
          await tester.enterText(input, 'An unfinished draft');
          final field = tester.widget<TextField>(input);
          const selection = TextSelection(baseOffset: 3, extentOffset: 9);
          field.controller!.selection = selection;
          expect(field.focusNode!.hasFocus, isTrue);
          for (final bottom in [400.0, 0.0, 500.0, 0.0]) {
            tester.view.viewInsets = FakeViewPadding(bottom: bottom);
            await tester.pumpAndSettle();
            await tester.ensureVisible(input);
            final current = tester.widget<TextField>(input);
            expect(current.controller!.text, 'An unfinished draft');
            expect(current.controller!.selection, selection);
            expect(current.focusNode!.hasFocus, isTrue);
            expect(controller.sent, isEmpty);
            expect(controller.retried, isEmpty);
            expect(controller.cancels, 0);
            expect(tester.takeException(), isNull);
          }
        },
      );
    }
  }

  for (final retry in [false, true]) {
    testWidgets(
      'social multiline composer remains reachable with keyboard and large text retry=$retry',
      (tester) async {
        tester.view.physicalSize = const Size(320, 640);
        tester.view.devicePixelRatio = 1;
        tester.view.viewInsets = const FakeViewPadding(bottom: 300);
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        addTearDown(tester.view.resetViewInsets);
        final controller = _PageController(
          _state(canSend: !retry, canRetry: retry),
        );
        await _pump(
          tester,
          controller,
          socialStyle: true,
          textScale: 2,
          navigationBarBuilder: (navigate) =>
              OfflineSocialNavigation(selectedIndex: 3, onSelected: (_) {}),
        );
        const text = 'First line\nSecond line\nThird line\nFourth line';
        await tester.scrollUntilVisible(
          find.byKey(const Key('ai-message-input')),
          200,
          scrollable: find
              .descendant(
                of: find.byKey(const Key('route-ai-conversation')),
                matching: find.byType(Scrollable),
              )
              .first,
        );
        await tester.pumpAndSettle();
        await tester.enterText(find.byKey(const Key('ai-message-input')), text);
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        await _tap(tester, retry ? 'ai-retry' : 'ai-send');
        expect(retry ? controller.retried : controller.sent, [text]);
        expect(tester.takeException(), isNull);
      },
    );
  }

  for (final destination in [0, 1, 2, 4]) {
    testWidgets(
      'social AI tab $destination navigates without cancel or confirmation',
      (tester) async {
        final controller = _PageController(
          _state(phase: AiConversationPhase.waiting, canCancel: true),
        );
        await _pump(
          tester,
          controller,
          socialStyle: true,
          navigationBarBuilder: (navigate) => OfflineSocialNavigation(
            selectedIndex: 3,
            onSelected: (index) =>
                navigate(() => controller.events.add('tab-$index')),
          ),
        );
        await _tap(tester, 'social-nav-ai');
        expect(controller.events, isEmpty);
        expect(find.text('Stay'), findsNothing);
        final key = ['home', 'friends', 'check-in', 'ai', 'me'][destination];
        await _tap(tester, 'social-nav-$key');
        expect(find.text('Request cancel and leave'), findsNothing);
        expect(controller.events, ['tab-$destination']);
        expect(controller.cancels, 0);
        expect(controller.sent, isEmpty);
      },
    );
  }

  testWidgets(
    'social AI keeps private content and input hidden for terminal states',
    (tester) async {
      for (final phase in [
        AiConversationPhase.deleting,
        AiConversationPhase.deleteUnknown,
        AiConversationPhase.deleted,
        AiConversationPhase.unauthenticated,
      ]) {
        final controller = _PageController(
          _state(
            phase: phase,
            messages: [
              _message('private', 1, AiRole.user, 'Private hidden draft'),
            ],
          ),
        );
        await _pump(tester, controller, socialStyle: true);
        expect(
          find.text('Private hidden draft'),
          findsNothing,
          reason: phase.name,
        );
        expect(find.byKey(const Key('ai-message-input')), findsNothing);
        expect(find.byKey(const Key('ai-send')), findsNothing);
        if (phase == AiConversationPhase.deleteUnknown) {
          expect(find.byKey(const Key('ai-check-delete')), findsOneWidget);
        }
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox());
      }
    },
  );

  testWidgets(
    'social AI input stays reachable with keyboard and 2x text on a narrow phone',
    (tester) async {
      tester.view.physicalSize = const Size(320, 640);
      tester.view.devicePixelRatio = 1;
      tester.view.viewInsets = const FakeViewPadding(bottom: 300);
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetViewInsets);
      final semantics = tester.ensureSemantics();
      try {
        final controller = _PageController(_state(canSend: true));
        await _pump(
          tester,
          controller,
          socialStyle: true,
          textScale: 2,
          navigationBarBuilder: (navigate) =>
              OfflineSocialNavigation(selectedIndex: 3, onSelected: (_) {}),
        );
        final input = find.byKey(const Key('ai-message-input'));
        await tester.scrollUntilVisible(
          input,
          200,
          scrollable: find
              .descendant(
                of: find.byKey(const Key('route-ai-conversation')),
                matching: find.byType(Scrollable),
              )
              .first,
        );
        await tester.pumpAndSettle();
        await tester.enterText(input, 'Keyboard-safe input');
        await _tap(tester, 'ai-send');
        expect(controller.sent, ['Keyboard-safe input']);
        expect(
          find.byKey(const Key('social-bottom-navigation')),
          findsOneWidget,
        );
        expect(tester.takeException(), isNull);
      } finally {
        semantics.dispose();
      }
    },
  );

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

  for (final destination in ['back', 'settings', 'personas']) {
    testWidgets('$destination freely navigates and keeps the session draft', (
      tester,
    ) async {
      final controller = _PageController(_state(canSend: true));
      await _pump(
        tester,
        controller,
        onBack: () => controller.events.add('back'),
        onSettings: () => controller.events.add('settings'),
        onPersonas: () => controller.events.add('personas'),
      );
      await tester.enterText(
        find.byKey(const Key('ai-message-input')),
        'private draft',
      );
      await _tap(tester, 'ai-$destination');
      expect(find.byType(AlertDialog), findsNothing);
      expect(controller.events, [destination]);
      expect(controller.draft.text, 'private draft');
      expect(controller.cancels, 0);
      expect(controller.sent, isEmpty);
    });
  }

  testWidgets('Persona callback is omitted without a composed destination', (
    tester,
  ) async {
    await _pump(tester, _PageController(_state(canSend: true)));
    expect(find.byKey(const Key('ai-personas')), findsNothing);
  });

  for (final phase in [
    AiConversationPhase.success,
    AiConversationPhase.deleting,
  ]) {
    testWidgets('Persona navigation retains pending ${phase.name} work', (
      tester,
    ) async {
      final controller = _PageController(
        _state(phase: phase, readBusy: phase == AiConversationPhase.success),
      );
      await _pump(
        tester,
        controller,
        onPersonas: () => controller.events.add('personas'),
      );
      await _tap(tester, 'ai-personas');
      expect(find.byType(AlertDialog), findsNothing);
      expect(controller.events, ['personas']);
      expect(controller.cancels, 0);
    });
  }

  testWidgets('Persona return keeps the private draft and never resends', (
    tester,
  ) async {
    final controller = _PageController(_state(canSend: true));
    await _pump(
      tester,
      controller,
      onPersonas: () {
        Navigator.of(
          tester.element(find.byType(AiConversationPage)),
        ).push<void>(
          MaterialPageRoute(
            builder: (_) => Scaffold(
              appBar: AppBar(title: const Text('Persona destination fixture')),
            ),
          ),
        );
      },
    );
    await tester.enterText(
      find.byKey(const Key('ai-message-input')),
      'private draft',
    );
    await _tap(tester, 'ai-personas');
    expect(find.text('Persona destination fixture'), findsOneWidget);
    await tester.tap(find.byType(BackButton));
    await tester.pumpAndSettle();
    expect(controller.events, isEmpty);
    expect(controller.sent, isEmpty);
    expect(controller.retried, isEmpty);
    expect(controller.detaches, 0);
    expect(
      tester
          .widget<TextField>(find.byKey(const Key('ai-message-input')))
          .controller!
          .text,
      'private draft',
    );
  });

  testWidgets(
    'returning from Settings keeps the running request without resending',
    (tester) async {
      final controller = _PageController(
        _state(phase: AiConversationPhase.waiting, canCancel: true),
      );
      await _pump(
        tester,
        controller,
        onSettings: () {
          Navigator.of(tester.element(find.byType(AiConversationPage)))
              .push<void>(
                MaterialPageRoute(
                  builder: (_) => Scaffold(
                    appBar: AppBar(title: const Text('Settings fixture')),
                  ),
                ),
              );
        },
      );
      await _tap(tester, 'ai-settings');
      expect(find.text('Settings fixture'), findsOneWidget);
      expect(controller.events, isEmpty);
      expect(controller.detaches, 0);
      expect(controller.sent, isEmpty);
      await tester.tap(find.byType(BackButton));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('ai-message-input')), findsOneWidget);
      expect(controller.sent, isEmpty);
      expect(controller.retried, isEmpty);
      expect(controller.view.canCancel, isTrue);
      expect(controller.cancels, 0);
    },
  );

  testWidgets('system Back leaves a running request without confirmation', (
    tester,
  ) async {
    final controller = _PageController(
      _state(phase: AiConversationPhase.preparing, canCancel: true),
    );
    await _pump(
      tester,
      controller,
      onBack: () => controller.events.add('back'),
    );
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(find.text('Stay'), findsNothing);
    expect(controller.events, ['back']);
    expect(controller.cancels, 0);
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

  testWidgets('route disposal does not detach the session controller', (
    tester,
  ) async {
    final controller = _PageController(
      _state(phase: AiConversationPhase.preparing, canCancel: true),
    );
    await _pump(tester, controller);
    await tester.pumpWidget(const SizedBox());
    expect(controller.detaches, 0);
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
    expect(controller.detaches, 0);
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
        'AI chat is turned off. You can allow AI data use in Settings.',
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
      final savedTime = tester
          .widgetList<Text>(
            find.descendant(
              of: find.byKey(const Key('ai-message-user')),
              matching: find.byType(Text),
            ),
          )
          .last
          .data!;
      expect(savedTime, contains(' · '));
      expect(savedTime, isNot(user.persistedAt.toUtc().toIso8601String()));
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
      expect(find.text(savedTime), findsOneWidget);
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
        var navigated = false;
        await _pump(
          tester,
          controller,
          textScale: 2,
          onBack: () => navigated = true,
        );
        expect(find.bySemanticsLabel('Waiting for a reply…'), findsOneWidget);
        expect(find.bySemanticsLabel('Cancel'), findsOneWidget);
        final size = tester.getSize(find.byKey(const Key('ai-cancel')));
        expect(size.height, greaterThanOrEqualTo(48));
        expect(size.width, greaterThanOrEqualTo(48));
        expect(tester.takeException(), isNull);
        await _tap(tester, 'ai-back');
        expect(navigated, isTrue);
        expect(find.byType(AlertDialog), findsNothing);
        expect(controller.cancels, 0);
        expect(tester.takeException(), isNull);
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
  String? localOutgoingText,
  Object? localOutgoingKey,
  String? nextCursor,
  bool canSend = false,
  bool canRetry = false,
  bool canCheckResult = false,
  bool canCancel = false,
  bool canLeaveWithoutRetrying = false,
  bool canDelete = false,
  bool canStartNewConversation = false,
  bool readBusy = false,
  bool canBrowseHistory = false,
  bool canSelectConversation = false,
  bool historyLoaded = false,
  String? historyCursor,
  Iterable<AiConversationSummary> conversations = const [],
}) => AiConversationState(
  sessionKey: sessionKey,
  phase: phase,
  messages: messages,
  conversationId: conversationId,
  localOutgoingText: localOutgoingText,
  localOutgoingKey: localOutgoingKey,
  nextCursor: nextCursor,
  canSend: canSend,
  canRetry: canRetry,
  canCheckResult: canCheckResult,
  canCancel: canCancel,
  canLeaveWithoutRetrying: canLeaveWithoutRetrying,
  canDelete: canDelete,
  canStartNewConversation: canStartNewConversation,
  readBusy: readBusy,
  canBrowseHistory: canBrowseHistory,
  canSelectConversation: canSelectConversation,
  historyLoaded: historyLoaded,
  historyCursor: historyCursor,
  conversations: conversations,
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
  VoidCallback? onPersonas,
  double textScale = 1,
  bool reduceMotion = true,
  bool socialStyle = false,
  Widget Function(ValueChanged<VoidCallback>)? navigationBarBuilder,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        aiConversationControllerProvider.overrideWith(() => controller),
      ],
      child: MaterialApp(
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(
            textScaler: TextScaler.linear(textScale),
            disableAnimations: reduceMotion,
          ),
          child: child!,
        ),
        home: AiConversationPage(
          onBack: onBack ?? () {},
          onOpenSettings: onSettings ?? () {},
          socialStyle: socialStyle,
          navigationBarBuilder: navigationBarBuilder,
          onOpenPersonas: onPersonas,
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
  if (key.startsWith('ai-history') &&
      finder.evaluate().isEmpty &&
      find.byTooltip('Open conversation menu').evaluate().isNotEmpty) {
    await tester.tap(find.byTooltip('Open conversation menu'));
    await tester.pumpAndSettle();
    if (key != 'ai-history' && finder.evaluate().isEmpty) {
      await tester.ensureVisible(find.byKey(const Key('ai-history')));
      await tester.tap(find.byKey(const Key('ai-history')));
      await tester.pumpAndSettle();
    }
  }
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
  await tester.pumpAndSettle();
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
  final selected = <String>[];
  final historyLoads = <bool>[];
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
  Future<void> retry(String text) async {
    retried.add(text);
    state = _state(
      sessionKey: state.sessionKey,
      phase: AiConversationPhase.preparing,
      conversationId: state.conversationId,
      messages: state.messages,
      canCancel: true,
    );
  }

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
  Future<void> loadConversations({bool more = false}) async =>
      historyLoads.add(more);

  @override
  Future<void> selectConversation(String id) async => selected.add(id);

  @override
  void startNewConversation() {
    if (!state.canStartNewConversation) return;
    events.add('new');
    state = _state(canSend: true);
  }

  @override
  Future<void> deleteConversation() async {
    deletes++;
    state = _state(phase: AiConversationPhase.deleting);
    await deleteGate?.future;
  }
}
