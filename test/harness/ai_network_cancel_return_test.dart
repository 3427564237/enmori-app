import '../support/ai_menu.dart';

import 'dart:async';
import 'dart:convert';

import 'package:enmori/features/ai_conversation/ai_conversation_providers.dart';
import 'package:enmori/harness/ai_conversation/ai_network_harness_app.dart';
import 'package:enmori/harness/ai_conversation/synthetic_auth_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

// Actual pages, controllers and typed HTTP mappers with an abort-ignoring HTTP
// double. No Backend, Firebase, real model, phone or runtime is executed here.
void main() {
  testWidgets(
    'explicit cancel and repeated return retain the target until a confirmed outcome',
    (tester) async {
      final auth = SyntheticAiAuthRepository();
      final peer = _Peer();
      addTearDown(auth.dispose);
      await _pump(tester, auth, peer);
      final container = ProviderScope.containerOf(
        tester.element(find.byKey(const Key('ai-message-input'))),
      );
      final session = container
          .read(aiConversationControllerProvider)
          .sessionKey;

      await _send(tester, _inputA);
      final original = container.read(
        aiConversationControllerProvider.notifier,
      );
      expect(peer.prepares, hasLength(1));
      expect(peer.executions, hasLength(1));
      expect(peer.originalPersisted, isTrue);
      expect(peer.originalReplyDelivered, isFalse);
      await _tap(tester, 'ai-cancel');
      await _tap(tester, 'ai-back');
      expect(find.byKey(const Key('ai-network-reopen')), findsOneWidget);
      _expectOriginalCancel(peer);

      for (var returning = 0; returning < 2; returning++) {
        await _tap(tester, 'ai-network-reopen');
        final state = container.read(aiConversationControllerProvider);
        expect(state.sessionKey, same(session));
        expect(state.phase, AiConversationPhase.unknown);
        expect(state.canSend, isFalse);
        expect(state.canRetry, isFalse);
        expect(state.canLeaveWithoutRetrying, isTrue);
        expect(state.messages.map((message) => message.text), [
          _inputA,
          _replyA,
        ]);
        expect(state.messages.map((message) => message.sequence), [1, 2]);
        expect(
          container.read(aiConversationControllerProvider.notifier),
          same(original),
        );
        expect(_draft(tester), isEmpty);
        expect(peer.prepares, hasLength(1));
        expect(peer.executions, hasLength(1));
        expect(peer.outcomeReads.length, inInclusiveRange(1, 9));
        expect(peer.historyReads, hasLength(returning + 1));
        expect(peer.originalReplyDelivered, isFalse);
        if (returning == 0) {
          await _tap(tester, 'ai-back');
        }
      }

      // Canonical U/A were persisted before Cancel's terminal acknowledgment.
      // Neither ordinary history nor a delayed execute HTTP success can settle
      // the original operation in the client; only matching outcome readback can.
      peer.deliverOriginalReply();
      await tester.pumpAndSettle();
      expect(peer.originalReplyDelivered, isTrue);
      expect(
        container
            .read(aiConversationControllerProvider)
            .messages
            .map((m) => m.text),
        [_inputA, _replyA],
      );
      expect(
        container.read(aiConversationControllerProvider).phase,
        AiConversationPhase.unknown,
      );
      expect(container.read(aiConversationControllerProvider).canSend, isFalse);
      expect(
        container.read(aiConversationControllerProvider).canRetry,
        isFalse,
      );
      expect(peer.outcomeReads.length, inInclusiveRange(1, 9));
      _expectOriginalCancel(peer);

      // The initial page and two returns each permit at most three reads.
      // Finish those bounded automatic reads before measuring this manual one.
      for (var i = 0; i < 3; i++) {
        await tester.pump(const Duration(seconds: 3));
        await pumpAiUi(tester);
      }
      expect(peer.outcomeReads.length, inInclusiveRange(1, 9));
      final readsBeforeConfirmation = peer.outcomeReads.length;
      peer.outcomeReady = true;
      await _tap(tester, 'ai-check-result-menu');
      expect(peer.outcomeReads.length, readsBeforeConfirmation + 1);
      expect(
        peer.outcomeReads.every((r) => r.url.path == _readOperationA),
        isTrue,
      );
      expect(find.text(_inputA), findsOneWidget);
      expect(find.text(_replyA), findsOneWidget);
      expect(container.read(aiConversationControllerProvider).canSend, isTrue);
      expect(peer.prepares, hasLength(1));
      expect(peer.executions, hasLength(1));

      await _send(tester, _inputB);
      expect(peer.prepares, hasLength(2));
      expect(_body(peer.prepares.last), {
        'kind': 'send',
        'purpose': 'checkin_conversation',
        'conversationId': _conversationA,
      });
      expect(peer.executions, hasLength(2));
      expect(peer.executions.last.url.path, _executeB);
      expect(peer.executions.last.headers['AI-Operation-Key'], _keyB);
      expect(_body(peer.executions.last), {'text': _inputB});
      final messages = container
          .read(aiConversationControllerProvider)
          .messages;
      expect(messages.map((m) => m.sequence), [1, 2, 3, 4]);
      expect(messages.map((m) => m.messageId).toSet(), hasLength(4));
      expect(messages.last.text, _replyB);
      expect(find.text(_replyA), findsOneWidget);
      await tester.scrollUntilVisible(
        find.text(_replyB),
        200,
        scrollable: find
            .descendant(
              of: find.byKey(const Key('route-ai-conversation')),
              matching: find.byType(Scrollable),
            )
            .first,
      );
      expect(find.text(_replyB), findsOneWidget);
      expect(peer.outcomeReads.length, readsBeforeConfirmation + 1);
      _expectOriginalCancel(peer);
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pump();
      expect(peer.closes, 0);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'same UID replacement fences late AI and Persona drafts across repeated detours',
    (tester) async {
      final auth = SyntheticAiAuthRepository();
      final peer = _Peer(newSessionConversation: true);
      addTearDown(auth.dispose);
      await _pump(tester, auth, peer);
      final container = ProviderScope.containerOf(
        tester.element(find.byKey(const Key('ai-message-input'))),
      );
      final oldSession = container
          .read(aiConversationControllerProvider)
          .sessionKey;
      await _send(tester, _inputA);
      await _tap(tester, 'ai-personas');
      expect(peer.cancels, isEmpty);
      await _tap(tester, 'persona-create');
      await tester.enterText(
        find.byKey(const Key('persona-name')),
        'Synthetic old-session draft',
      );
      expect(_personaDraft(tester), 'Synthetic old-session draft');

      auth.replaceSession();
      await tester.pumpAndSettle();
      expect(_personaDraft(tester), isEmpty);
      expect(
        peer.personaReads.last.headers['Authorization'],
        'Bearer synthetic-ai-token-2',
      );
      expect(
        container.read(aiConversationControllerProvider).sessionKey,
        isNot(same(oldSession)),
      );
      peer.deliverOriginalReply();
      await tester.pumpAndSettle();
      expect(_personaDraft(tester), isEmpty);
      await _tap(tester, 'persona-back');
      await _tap(tester, 'persona-back');
      expect(_draft(tester), isEmpty);
      expect(find.text(_inputA), findsNothing);
      expect(find.text(_replyA), findsNothing);
      final fresh = container.read(aiConversationControllerProvider);
      expect(fresh.conversationId, isNull);
      expect(fresh.canSend, isTrue);
      expect(fresh.canCheckResult, isFalse);
      expect(peer.historyReads, isEmpty);
      expect(peer.outcomeReads, isEmpty);
      expect(peer.executions, hasLength(1));

      await tester.enterText(
        find.byKey(const Key('ai-message-input')),
        'Synthetic new-session unsent draft',
      );
      final readsBefore = peer.personaReads.length;
      await _tap(tester, 'ai-personas');
      expect(find.text('Discard unsaved changes?'), findsNothing);
      expect(peer.personaReads, hasLength(readsBefore + 1));
      expect(find.byKey(const Key('persona-empty')), findsOneWidget);
      await _tap(tester, 'persona-back');
      expect(_draft(tester), 'Synthetic new-session unsent draft');
      expect(peer.prepares, hasLength(1));
      expect(peer.executions, hasLength(1));
      expect(peer.requests.where((r) => r.method == 'DELETE'), isEmpty);
      expect(
        peer.requests.where(
          (r) => r.url.path == '/v1/me/personas' && r.method != 'GET',
        ),
        isEmpty,
      );

      await _send(tester, _inputB);
      expect(peer.prepares, hasLength(2));
      expect(_body(peer.prepares.last), {
        'kind': 'send',
        'purpose': 'checkin_conversation',
      });
      expect(
        peer.prepares.last.headers['Authorization'],
        'Bearer synthetic-ai-token-2',
      );
      expect(
        peer.executions.last.headers['Authorization'],
        'Bearer synthetic-ai-token-2',
      );
      expect(peer.executions.last.headers['AI-Operation-Key'], _keyB);
      expect(peer.executions, hasLength(2));
      expect(find.text(_replyA), findsNothing);
      expect(find.text(_replyB), findsOneWidget);
      expect(
        container.read(aiConversationControllerProvider).conversationId,
        _conversationB,
      );
      expect(peer.outcomeReads, isEmpty);
      _expectOriginalCancel(peer);
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pump();
      expect(peer.closes, 0);
      expect(tester.takeException(), isNull);
    },
  );
}

Future<void> _pump(
  WidgetTester tester,
  SyntheticAiAuthRepository auth,
  _Peer peer,
) async {
  await tester.pumpWidget(
    AiNetworkHarnessApp(
      baseUri: Uri.parse('https://backend.invalid'),
      auth: auth,
      client: peer,
      environmentLabel: 'Synthetic HTTP double; no Backend, model or device',
      onOpenSettings: () {},
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> _send(WidgetTester tester, String text) async {
  await tester.enterText(find.byKey(const Key('ai-message-input')), text);
  await _tap(tester, 'ai-send');
}

Future<void> _tap(WidgetTester tester, String key) async {
  tester.testTextInput.hide();
  await pumpAiUi(tester);
  await revealAiMenuAction(tester, key);
  if (key == 'ai-back') {
    await tester.binding.handlePopRoute();
    await pumpAiUi(tester);
    return;
  }
  final target = find.byKey(Key(key));
  if (target.evaluate().isEmpty) {
    await tester.scrollUntilVisible(
      target,
      key.startsWith('ai-') ? -200 : 200,
      scrollable: find
          .descendant(
            of: find.byKey(const Key('route-ai-conversation')),
            matching: find.byType(Scrollable),
          )
          .first,
    );
  }
  await tester.ensureVisible(target);
  await pumpAiUi(tester);
  expect(target.hitTestable(), findsOneWidget, reason: key);
  await tester.tap(target);
  await pumpAiUi(tester);
}

String _draft(WidgetTester tester) => tester
    .widget<TextField>(find.byKey(const Key('ai-message-input')))
    .controller!
    .text;

String _personaDraft(WidgetTester tester) => tester
    .widget<TextFormField>(find.byKey(const Key('persona-name')))
    .controller!
    .text;

void _expectOriginalCancel(_Peer peer) {
  expect(peer.cancels, hasLength(1));
  expect(peer.cancels.single.url.path, _cancelA);
  expect(
    peer.cancels.single.headers['Authorization'],
    'Bearer synthetic-ai-token-1',
  );
  expect(peer.cancels.single.headers['AI-Operation-Key'], _keyA);
}

Map<String, dynamic> _body(http.Request request) =>
    jsonDecode(request.body) as Map<String, dynamic>;

const _conversationA = '00000000-0000-4000-8000-000000000001';
const _conversationB = '00000000-0000-4000-8000-000000000011';
const _operationA = '00000000-0000-4000-8000-000000000002';
const _operationB = '00000000-0000-4000-8000-000000000012';
const _userA = '00000000-0000-4000-8000-000000000003';
const _assistantA = '00000000-0000-4000-8000-000000000004';
const _userB = '00000000-0000-4000-8000-000000000013';
const _assistantB = '00000000-0000-4000-8000-000000000014';
const _keyA = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const _keyB = 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBA';
const _inputA = 'I read a book today.';
const _inputB = 'I drank water today.';
const _replyA = 'Synthetic original accepted reply';
const _replyB = 'Synthetic explicit next reply';
const _executeA = '/v1/me/ai/operations/$_operationA/execute';
const _executeB = '/v1/me/ai/operations/$_operationB/execute';
const _cancelA = '/v1/me/ai/operations/$_operationA/cancel';
const _readOperationA =
    '/v1/me/conversations/$_conversationA/operations/$_operationA';

Map<String, Object> _message(
  String id,
  String role,
  int sequence,
  String text,
) => {
  'messageId': id,
  'role': role,
  'sequence': sequence,
  'persistedAt': '2026-10-16T10:00:00.123456Z',
  'availability': 'available',
  'text': text,
};

Map<String, Object> _pair({required bool next, bool newConversation = false}) =>
    {
      'operationId': next ? _operationB : _operationA,
      'conversationId': newConversation ? _conversationB : _conversationA,
      'userMessage': _message(
        next ? _userB : _userA,
        'user',
        next && !newConversation ? 3 : 1,
        next ? _inputB : _inputA,
      ),
      'assistantMessage': _message(
        next ? _assistantB : _assistantA,
        'assistant',
        next && !newConversation ? 4 : 2,
        next ? _replyB : _replyA,
      ),
    };

http.StreamedResponse _json(Object value, [int status = 200]) =>
    http.StreamedResponse(Stream.value(utf8.encode(jsonEncode(value))), status);

final class _Peer extends http.BaseClient {
  bool outcomeReady = false;
  _Peer({this.newSessionConversation = false});

  final bool newSessionConversation;
  final requests = <http.Request>[];
  final _original = Completer<http.StreamedResponse>();
  bool originalPersisted = false;
  bool get originalReplyDelivered => _original.isCompleted;
  int closes = 0;

  List<http.Request> get prepares => requests
      .where((r) => r.method == 'POST' && r.url.path == '/v1/me/ai/operations')
      .toList();
  List<http.Request> get executions =>
      requests.where((r) => r.url.path.endsWith('/execute')).toList();
  List<http.Request> get cancels =>
      requests.where((r) => r.url.path.endsWith('/cancel')).toList();
  List<http.Request> get historyReads => requests
      .where((r) => r.method == 'GET' && r.url.path.endsWith('/messages'))
      .toList();
  List<http.Request> get outcomeReads => requests
      .where((r) => r.method == 'GET' && r.url.path == _readOperationA)
      .toList();
  List<http.Request> get personaReads => requests
      .where((r) => r.method == 'GET' && r.url.path == '/v1/me/personas')
      .toList();

  void deliverOriginalReply() {
    if (!originalPersisted) {
      throw StateError('Original reply must already be canonical.');
    }
    _original.complete(_json(_pair(next: false)));
  }

  @override
  Future<http.StreamedResponse> send(http.BaseRequest outbound) async {
    final request = outbound as http.Request;
    requests.add(request);
    final path = request.url.path;
    if (request.method == 'GET' && path == '/v1/me/conversations') {
      return _json({'conversations': []});
    }
    if (request.method == 'GET' && path == '/v1/me/personas') {
      return _json({
        'personas': {'items': [], 'stateRevision': 0},
      });
    }
    if (request.method == 'POST' && path == '/v1/me/ai/operations') {
      final next = prepares.length == 2;
      if (prepares.length > 2) {
        throw StateError('Unexpected automatic prepare.');
      }
      return _json({
        'operationId': next ? _operationB : _operationA,
        'operationKey': next ? _keyB : _keyA,
        'conversationId': next && newSessionConversation
            ? _conversationB
            : _conversationA,
        'preparationExpiresAt': DateTime.now()
            .toUtc()
            .add(const Duration(seconds: 15))
            .toIso8601String(),
      }, 201);
    }
    if (request.method == 'POST' && path == _executeA) {
      // Model persistence precedes Cancel's terminal ACK in this schedule;
      // only original HTTP delivery is held. Canonical GETs remain authoritative.
      originalPersisted = true;
      return _original.future;
    }
    if (request.method == 'POST' && path == _executeB) {
      return _json(_pair(next: true, newConversation: newSessionConversation));
    }
    if (request.method == 'POST' && path == _cancelA) {
      return _json({'operationId': _operationA, 'state': 'terminal'});
    }
    if (request.method == 'GET' && path.endsWith('/messages')) {
      final pair = _pair(next: false);
      return _json({
        'messages': [
          if (originalPersisted) pair['userMessage'],
          if (originalPersisted) pair['assistantMessage'],
        ],
      });
    }
    if (request.method == 'GET' &&
        path == _readOperationA &&
        originalPersisted) {
      if (!outcomeReady) {
        return _json({'operationId': _operationA, 'state': 'unresolved'});
      }
      final pair = _pair(next: false);
      return _json({
        'operationId': _operationA,
        'state': 'assistant_saved',
        'userMessage': pair['userMessage'],
        'assistantMessage': pair['assistantMessage'],
      });
    }
    throw StateError('Unexpected synthetic request.');
  }

  @override
  void close() => closes++;
}
