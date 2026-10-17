import 'dart:convert';

import 'package:enmori/features/ai_conversation/ai_conversation_providers.dart';
import 'package:enmori/harness/ai_conversation/ai_network_harness_app.dart';
import 'package:enmori/harness/ai_conversation/synthetic_auth_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import '../support/ai_connected_repeat_journey.dart';

// Exact device script on the real page/controller/wire mapper, with explicit
// handwritten HTTP/Auth fixtures. No Backend, persistence, model or phone run.
void main() {
  testWidgets(
    'connected device script sends twice and explicitly reloads twice',
    (tester) async {
      final peer = await _mount(tester);
      final stages = <String>[];
      final accepted = await runAiConnectedRepeatJourney(
        tester,
        onStage: stages.add,
      );
      expect(accepted.messages, hasLength(4));
      expect(stages, [
        'first_send_requested',
        'first_reload_state',
        'second_send_requested',
        'two_round_reload_state',
      ]);
      expect(peer.calls.map((call) => call.route), [
        'POST /v1/me/ai/operations',
        'POST /v1/me/ai/operations/${_operation(0)}/execute',
        'GET /v1/me/conversations/$_conversation/messages',
        'POST /v1/me/ai/operations',
        'POST /v1/me/ai/operations/${_operation(1)}/execute',
        'GET /v1/me/conversations/$_conversation/messages',
      ]);
      expect(
        peer.calls
            .where((call) => call.route.endsWith('/operations'))
            .map((call) => call.body),
        [
          {'kind': 'send', 'purpose': 'checkin_conversation'},
          {
            'kind': 'send',
            'purpose': 'checkin_conversation',
            'conversationId': _conversation,
          },
        ],
      );
      final executions = peer.calls.where(
        (call) => call.route.endsWith('/execute'),
      );
      expect(executions.map((call) => call.key), [_key(0), _key(1)]);
      expect(executions.map((call) => call.body), [
        {'text': 'I read a book today.'},
        {'text': 'I read a book today.'},
      ]);
      expect(
        peer.calls.every((call) => call.token == 'Bearer synthetic-ai-token-1'),
        isTrue,
      );
      expect(
        peer.calls
            .where((call) => call.route.startsWith('GET '))
            .every((call) => call.key == null && call.body == null),
        isTrue,
      );
      final returned = await _returnThroughPersonas(tester);
      expect(returned.phase, AiConversationPhase.idle);
      expectAiConnectedHistory(returned, accepted);
      expect(peer.prepares, 2);
      expect(peer.executes, 2);
      expect(peer.reads, 3);
      expect(peer.calls.skip(6).map((call) => call.route), [
        'GET /v1/me/personas',
        'GET /v1/me/conversations/$_conversation/messages',
      ]);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );

  for (final fault in [_Fault.wrongSecondOperation, _Fault.changedHistory]) {
    testWidgets('connected script refuses ${fault.name} without recovery', (
      tester,
    ) async {
      final peer = await _mount(tester, fault: fault);
      final stages = <String>[];
      Object? refusal;
      try {
        // Await the guarded tester journey before inspecting its failure;
        // expectLater would overlap the helper's pending pump guard.
        await runAiConnectedRepeatJourney(tester, onStage: stages.add);
      } on TestFailure catch (error) {
        refusal = error;
      }
      expect(refusal, isA<TestFailure>());
      await tester.pump(const Duration(seconds: 1));
      expect(stages, isNot(contains('two_round_reload_state')));
      expect(peer.prepares, 2);
      expect(peer.executes, 2);
      expect(peer.reads, fault == _Fault.changedHistory ? 2 : 1);
      expect(
        peer.calls.where(
          (call) =>
              call.route.contains('/operations/') &&
              call.route.startsWith('GET '),
        ),
        isEmpty,
      );
      await tester.pumpWidget(const SizedBox.shrink());
    });
  }

  for (final fault in [_Fault.emptyFreshHistory, _Fault.partialFreshHistory]) {
    testWidgets('fresh cleared-view history refuses ${fault.name}', (
      tester,
    ) async {
      final peer = await _mount(tester, fault: fault);
      final saved = await runAiConnectedRepeatJourney(tester);
      final returned = await _returnThroughPersonas(tester);
      Object? refusal;
      try {
        expectAiConnectedHistory(returned, saved);
      } on TestFailure catch (error) {
        refusal = error;
      }
      expect(refusal, isA<TestFailure>());
      expect(
        returned.messages.length,
        fault == _Fault.emptyFreshHistory ? 0 : 2,
      );
      expect(peer.prepares, 2);
      expect(peer.executes, 2);
      expect(peer.reads, 3);
      expect(peer.calls.skip(6).map((call) => call.route), [
        'GET /v1/me/personas',
        'GET /v1/me/conversations/$_conversation/messages',
      ]);
      await tester.pumpWidget(const SizedBox.shrink());
    });
  }
}

Future<AiConversationState> _returnThroughPersonas(WidgetTester tester) async {
  await _tap(tester, 'ai-personas');
  expect(find.byKey(const Key('persona-empty')), findsOneWidget);
  await _tap(tester, 'persona-back');
  await _tap(tester, 'ai-conversation-actions');
  await _tap(tester, 'ai-reload-messages');
  return ProviderScope.containerOf(
    tester.element(find.byKey(const Key('ai-network-harness-banner'))),
  ).read(aiConversationControllerProvider);
}

Future<_Peer> _mount(WidgetTester tester, {_Fault? fault}) async {
  final auth = SyntheticAiAuthRepository();
  final peer = _Peer(fault);
  addTearDown(auth.dispose);
  await tester.pumpWidget(
    AiNetworkHarnessApp(
      baseUri: Uri.parse('https://synthetic-repeat.invalid'),
      auth: auth,
      client: peer,
      environmentLabel: 'Synthetic HTTP and Auth; no real model or storage',
      onOpenSettings: () {},
    ),
  );
  await tester.pumpAndSettle();
  return peer;
}

Future<void> _tap(WidgetTester tester, String key) async {
  final target = find.byKey(Key(key));
  await tester.ensureVisible(target);
  await tester.pumpAndSettle();
  await tester.tap(target);
  await tester.pumpAndSettle();
}

enum _Fault {
  wrongSecondOperation,
  changedHistory,
  emptyFreshHistory,
  partialFreshHistory,
}

const _conversation = '00000000-0000-4000-8000-000000000001';
String _id(int number) =>
    '00000000-0000-4000-8000-${number.toString().padLeft(12, '0')}';
String _operation(int index) => _id(10 + index * 10);
String _key(int index) =>
    base64Url.encode(List.filled(32, index + 1)).replaceAll('=', '');

final class _Call {
  _Call(http.BaseRequest request, this.body)
    : route = '${request.method} ${request.url.path}',
      token = request.headers['Authorization'],
      key = request.headers['AI-Operation-Key'];
  final String route;
  final String? token, key;
  final Object? body;
}

final class _Peer extends http.BaseClient {
  _Peer(this.fault);
  final _Fault? fault;
  final calls = <_Call>[];
  int prepares = 0, executes = 0, reads = 0;

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    final raw = await utf8.decoder.bind(request.finalize()).join();
    calls.add(_Call(request, raw.isEmpty ? null : jsonDecode(raw)));
    final path = request.url.path;
    if (request.method == 'GET' && path == '/v1/me/personas') {
      return _json({
        'personas': {'items': <Object>[], 'stateRevision': 0},
      });
    }
    if (request.method == 'POST' && path == '/v1/me/ai/operations') {
      final index = prepares++;
      return _json({
        'operationId': _operation(index),
        'operationKey': _key(index),
        'conversationId': _conversation,
        'preparationExpiresAt': DateTime.now()
            .toUtc()
            .add(const Duration(seconds: 15))
            .toIso8601String(),
      }, 201);
    }
    if (request.method == 'POST' && path.endsWith('/execute')) {
      final index = executes++;
      return _json({
        'operationId': _operation(
          index == 1 && fault == _Fault.wrongSecondOperation ? 0 : index,
        ),
        'conversationId': _conversation,
        'userMessage': _message(index * 2 + 1),
        'assistantMessage': _message(index * 2 + 2),
      });
    }
    if (request.method == 'GET' && path.endsWith('/messages')) {
      reads++;
      final rows = reads == 3 && fault == _Fault.emptyFreshHistory
          ? 0
          : reads == 3 && fault == _Fault.partialFreshHistory
          ? 2
          : executes * 2;
      return _json({
        'messages': [
          for (var sequence = 1; sequence <= rows; sequence++)
            _message(
              sequence,
              changed:
                  fault == _Fault.changedHistory && reads == 2 && sequence == 2,
            ),
        ],
      });
    }
    if (request.method == 'POST' && path.endsWith('/cancel')) {
      return _json({'operationId': path.split('/')[5], 'state': 'terminal'});
    }
    return _json({
      'error': {'code': 'REQUEST_INVALID', 'message': 'Synthetic refusal.'},
      'requestId': 'synthetic-repeat-request',
    }, 400);
  }

  Map<String, Object> _message(int sequence, {bool changed = false}) => {
    'messageId': _id(100 + sequence),
    'sequence': sequence,
    'role': sequence.isOdd ? 'user' : 'assistant',
    'persistedAt': DateTime.utc(
      2026,
      10,
      17,
      14,
      30,
      sequence,
      123,
      456,
    ).toIso8601String(),
    'availability': 'available',
    'text': sequence.isOdd
        ? 'I read a book today.'
        : changed
        ? 'Changed historical content.'
        : 'Synthetic reply $sequence.',
  };

  http.StreamedResponse _json(Object body, [int status = 200]) =>
      http.StreamedResponse(
        Stream.value(utf8.encode(jsonEncode(body))),
        status,
        headers: {'content-type': 'application/json; charset=utf-8'},
      );
}
