import 'dart:async';
import 'dart:convert';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/ai_conversation/ai_conversation_providers.dart';
import 'package:enmori/features/ai_conversation/data/ai_wire_repository.dart';
import 'package:enmori/features/ai_conversation/data/http_ai_wire_transport.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

// The real controller, wire mapper and HTTP transport meet a handwritten HTTP
// client fixture. This does not run a listener, Backend, Auth SDK, store or model.
void main() {
  for (final sameInput in [false, true]) {
    testWidgets(
      'Send, Reload and second Send with ${sameInput ? 'the same fixed' : 'different'} '
      'text retain one target and four canonical rows',
      (tester) async {
        final expectedTexts = [_texts[0], sameInput ? _texts[0] : _texts[1]];
        final r = await _Rig.create(tester);
        await r.controller.send(expectedTexts[0]);
        final session = r.state.sessionKey;
        expect(r.state.phase, AiConversationPhase.success);
        _expectRows(r.state, 1);

        r.auth.token = 'synthetic-reload-token';
        await r.controller.loadMessages();
        expect(r.state.sessionKey, same(session));
        expect(r.state.conversationId, _conversation);
        expect(r.state.canSend, isTrue);
        _expectRows(r.state, 1);

        r.peer.holdSecondPrepare = Completer<void>();
        r.auth.token = 'synthetic-second-token';
        final sending = r.controller.send(expectedTexts[1]);
        await tester.pump();
        expect(r.peer.prepares, hasLength(2));
        expect(r.state.phase, AiConversationPhase.preparing);
        r.auth.token = 'synthetic-token-after-second-prepare';
        r.peer.holdSecondPrepare!.complete();
        await sending;

        expect(r.state.sessionKey, same(session));
        expect(r.state.phase, AiConversationPhase.success);
        expect(r.state.conversationId, _conversation);
        expect(r.state.canSend, isTrue);
        expect(r.state.canRetry, isFalse);
        _expectRows(r.state, 2, expectedTexts: expectedTexts);
        expect(r.peer.calls.map((call) => call.route), [
          'POST /v1/me/ai/operations',
          'POST /v1/me/ai/operations/${_operation(0)}/execute',
          'GET /v1/me/conversations/$_conversation/messages',
          'POST /v1/me/ai/operations',
          'POST /v1/me/ai/operations/${_operation(1)}/execute',
        ]);
        expect(r.peer.prepares.map((call) => call.body), [
          {'kind': 'send', 'purpose': 'checkin_conversation'},
          {
            'kind': 'send',
            'purpose': 'checkin_conversation',
            'conversationId': _conversation,
          },
        ]);
        expect(r.peer.prepares.map((call) => call.token), [
          'synthetic-first-token',
          'synthetic-second-token',
        ]);
        expect(r.peer.executes.map((call) => call.token), [
          'synthetic-first-token',
          'synthetic-second-token',
        ]);
        expect(r.peer.executes.map((call) => call.key), [_key(0), _key(1)]);
        expect(r.peer.executes.map((call) => call.body), [
          {'text': expectedTexts[0]},
          {'text': expectedTexts[1]},
        ]);
        expect(r.peer.receivedTexts, {
          0: expectedTexts[0],
          1: expectedTexts[1],
        });
        expect(r.peer.historyReads.single.token, 'synthetic-reload-token');
        expect(r.peer.historyReads.single.key, isNull);
        expect(r.peer.prepares.every((call) => call.key == null), isTrue);
        expect(r.auth.tokenReads, 3);
        _expectTransport(r.peer);
      },
    );
  }

  testWidgets(
    'unknown second Send keeps its barrier through Reload and mismatched readback',
    (tester) async {
      final r = await _Rig.create(tester);
      await r.controller.send(_texts[0]);
      await r.controller.loadMessages();
      r.peer.loseSecondExecuteAck = true;
      r.auth.token = 'synthetic-second-token';
      await r.controller.send(_texts[1]);
      await tester.pump();
      expect(r.state.phase, AiConversationPhase.unknown);
      _expectRows(r.state, 1);
      expect(r.state.canSend, isFalse);
      expect(r.state.canRetry, isFalse);
      expect(r.peer.cancels, hasLength(1));
      expect(
        r.peer.cancels.single.route,
        'POST /v1/me/ai/operations/${_operation(1)}/cancel',
      );
      expect(r.peer.cancels.single.token, 'synthetic-second-token');
      expect(r.peer.cancels.single.key, _key(1));

      r.auth.token = 'synthetic-readback-token';
      await r.controller.loadMessages();
      _expectRows(r.state, 2);
      expect(r.state.canSend, isFalse);
      expect(r.state.canRetry, isFalse);
      await r.controller.send('I read a book today.');
      await r.controller.retry(_texts[1]);
      expect(r.peer.prepares, hasLength(2));
      expect(r.peer.executes, hasLength(2));

      // An otherwise well-formed result for A cannot settle current operation B.
      r.peer.wrongReadbackOperation = true;
      await r.controller.checkResult();
      expect(r.state.canSend, isFalse);
      expect(r.state.canRetry, isFalse);
      expect(
        r.peer.outcomeReads.single.route,
        'GET /v1/me/conversations/$_conversation/operations/${_operation(1)}',
      );
      r.peer.wrongReadbackOperation = false;
      await r.controller.checkResult();
      expect(r.state.phase, AiConversationPhase.success);
      expect(r.state.canSend, isTrue);
      expect(r.state.canRetry, isFalse);
      _expectRows(r.state, 2);
      expect(r.peer.prepares, hasLength(2));
      expect(r.peer.executes, hasLength(2));
      expect(r.peer.outcomeReads.map((call) => call.token).toSet(), {
        'synthetic-readback-token',
      });
      expect(r.peer.outcomeReads.every((call) => call.key == null), isTrue);
      _expectTransport(r.peer);
    },
  );

  testWidgets(
    'same owner new observed session fences late B body and cancels original B only',
    (tester) async {
      final r = await _Rig.create(tester);
      await r.controller.send(_texts[0]);
      await r.controller.loadMessages();
      r.peer.holdSecondExecute = Completer<void>();
      r.auth.token = 'synthetic-second-token';
      final sending = r.controller.send(_texts[1]);
      await tester.pump();
      expect(r.state.phase, AiConversationPhase.waiting);
      expect(r.peer.executes, hasLength(2));
      final originalSession = r.state.sessionKey;
      final originalController = r.controller;

      r.auth.token = 'synthetic-replacement-session-token';
      r.auth.sessions.add(AuthSessionAuthenticated(subject: _subject));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 1));
      await sending;
      expect(r.state.sessionKey, isNot(same(originalSession)));
      expect(r.state.phase, AiConversationPhase.idle);
      expect(r.state.canSend, isTrue);
      expect(r.state.conversationId, isNull);
      expect(r.state.messages, isEmpty);
      expect(r.peer.cancels, hasLength(1));
      _expectTransport(r.peer);
      expect(
        r.peer.cancels.single.route,
        'POST /v1/me/ai/operations/${_operation(1)}/cancel',
      );
      expect(r.peer.cancels.single.token, 'synthetic-second-token');
      expect(r.peer.cancels.single.key, _key(1));
      expect(r.peer.executes.last.token, 'synthetic-second-token');

      // The client fixture ignores abort and finishes the already acquired B.
      // The actual HTTP transport/controller must still discard its late body.
      r.peer.holdSecondExecute!.complete();
      await tester.pump();
      originalController.detach(sessionKey: originalSession);
      await tester.pump();
      expect(r.state.conversationId, isNull);
      expect(r.state.messages, isEmpty);
      expect(r.state.canSend, isTrue);
      expect(r.state.canCheckResult, isFalse);
      expect(r.peer.prepares, hasLength(2));
      expect(r.peer.executes, hasLength(2));
      expect(r.peer.cancels, hasLength(1));
    },
  );
}

const _subject = 'synthetic-repeat-owner';
const _conversation = '00000000-0000-4000-8000-000000000001';
const _texts = ['I read a book today.', 'I took a walk today.'];
final _date = DateTime.utc(2026, 10, 16, 14, 30, 0, 123, 456);

String _id(int number) =>
    '00000000-0000-4000-8000-${number.toString().padLeft(12, '0')}';
String _operation(int index) => _id(10 + index * 10);
String _key(int index) =>
    base64Url.encode(List.filled(32, index + 1)).replaceAll('=', '');

Map<String, Object> _message(
  int index, {
  required bool assistant,
  required String input,
}) => {
  'messageId': _id(11 + index * 10 + (assistant ? 1 : 0)),
  'sequence': index * 2 + (assistant ? 2 : 1),
  'role': assistant ? 'assistant' : 'user',
  'persistedAt': _date
      .add(Duration(seconds: index * 2 + (assistant ? 1 : 0)))
      .toIso8601String(),
  'availability': 'available',
  'text': assistant ? 'Synthetic accepted reply ${index + 1}.' : input,
};

void _expectRows(
  AiConversationState state,
  int pairs, {
  List<String> expectedTexts = _texts,
}) {
  expect(state.messages.map((message) => message.messageId), [
    for (var index = 0; index < pairs; index++) ...[
      _id(11 + index * 10),
      _id(12 + index * 10),
    ],
  ]);
  expect(state.messages.map((message) => message.sequence), [
    for (var sequence = 1; sequence <= pairs * 2; sequence++) sequence,
  ]);
  for (var index = 0; index < pairs; index++) {
    expect(state.messages[index * 2].text, expectedTexts[index]);
    expect(
      state.messages[index * 2].persistedAt,
      _date.add(Duration(seconds: index * 2)),
    );
    expect(
      state.messages[index * 2 + 1].text,
      'Synthetic accepted reply ${index + 1}.',
    );
    expect(
      state.messages[index * 2 + 1].persistedAt,
      _date.add(Duration(seconds: index * 2 + 1)),
    );
  }
}

void _expectTransport(_WirePeer peer) {
  for (final call in peer.calls) {
    expect(call.scheme, 'https');
    expect(call.host, 'synthetic-repeat.invalid');
    expect(call.followRedirects, isFalse);
    expect(call.accept, 'application/json');
    expect(call.cacheControl, 'no-store');
  }
}

final class _Rig {
  _Rig();

  final auth = _Auth();
  final peer = _WirePeer();
  late final ProviderContainer container;
  late final ProviderSubscription<AiConversationState> subscription;

  static Future<_Rig> create(WidgetTester tester) async {
    final r = _Rig();
    final repository = AiWireRepository(
      HttpAiWireTransport(
        baseUri: Uri.parse('https://synthetic-repeat.invalid'),
        client: r.peer,
      ),
    );
    r.container = ProviderContainer(
      overrides: [
        authRepositoryProvider.overrideWithValue(r.auth),
        aiConversationRepositoryProvider.overrideWithValue(repository),
        aiConversationNowProvider.overrideWithValue(() => Duration.zero),
        aiConversationUtcNowProvider.overrideWithValue(() => _date),
      ],
    );
    r.subscription = r.container.listen(
      aiConversationControllerProvider,
      (_, _) {},
    );
    addTearDown(() async {
      r.subscription.close();
      r.container.dispose();
      r.peer.close();
      await r.auth.sessions.close();
    });
    await tester.pump();
    r.auth.sessions.add(AuthSessionAuthenticated(subject: _subject));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 1));
    expect(r.state.canSend, isTrue);
    return r;
  }

  AiConversationState get state =>
      container.read(aiConversationControllerProvider);
  AiConversationController get controller =>
      container.read(aiConversationControllerProvider.notifier);
}

final class _Auth implements AuthRepository {
  final sessions = StreamController<AuthSession>.broadcast();
  String token = 'synthetic-first-token';
  int tokenReads = 0;

  @override
  Stream<AuthSession> watchSession() => sessions.stream;

  @override
  Future<Result<String>> getIdToken() async {
    tokenReads++;
    return Success(token);
  }

  @override
  Future<Result<void>> signIn({
    required String email,
    required String password,
  }) async => const Success(null);

  @override
  Future<Result<void>> register({
    required String email,
    required String password,
  }) async => const Success(null);

  @override
  Future<Result<void>> signOut() async => const Success(null);
}

final class _Call {
  _Call(http.BaseRequest request, this.body)
    : route = '${request.method} ${request.url.path}',
      scheme = request.url.scheme,
      host = request.url.host,
      followRedirects = request.followRedirects,
      accept = request.headers['Accept'],
      cacheControl = request.headers['Cache-Control'],
      token = request.headers['Authorization']?.replaceFirst('Bearer ', ''),
      key = request.headers['AI-Operation-Key'];

  final String route;
  final String scheme, host;
  final bool followRedirects;
  final String? accept, cacheControl;
  final String? token, key;
  final Object? body;
}

final class _WirePeer extends http.BaseClient {
  final calls = <_Call>[];
  final prepares = <_Call>[];
  final executes = <_Call>[];
  final cancels = <_Call>[];
  final historyReads = <_Call>[];
  final outcomeReads = <_Call>[];
  final saved = <int>{};
  final receivedTexts = <int, String>{};
  Completer<void>? holdSecondPrepare, holdSecondExecute;
  bool loseSecondExecuteAck = false;
  bool wrongReadbackOperation = false;

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    final rawBody = await utf8.decoder.bind(request.finalize()).join();
    final call = _Call(request, rawBody.isEmpty ? null : jsonDecode(rawBody));
    calls.add(call);
    final path = request.url.path;
    if (request.method == 'POST' && path == '/v1/me/ai/operations') {
      final index = prepares.length;
      prepares.add(call);
      if (index > 1) return _failure();
      if (index == 1) await holdSecondPrepare?.future;
      return _json({
        'operationId': _operation(index),
        'operationKey': _key(index),
        'conversationId': _conversation,
        'preparationExpiresAt': _date
            .add(const Duration(seconds: 15))
            .toIso8601String(),
      }, 201);
    }
    if (request.method == 'POST' && path.endsWith('/execute')) {
      final index = path.contains(_operation(0)) ? 0 : 1;
      executes.add(call);
      if (call.body case {'text': final String text}) {
        receivedTexts[index] = text;
      } else {
        return _failure();
      }
      saved.add(index);
      if (index == 1) {
        if (loseSecondExecuteAck) {
          throw http.ClientException('Synthetic lost acknowledgement.');
        }
        await holdSecondExecute?.future;
      }
      return _json({
        'operationId': _operation(index),
        'conversationId': _conversation,
        'userMessage': _row(index, assistant: false),
        'assistantMessage': _row(index, assistant: true),
      });
    }
    if (request.method == 'POST' && path.endsWith('/cancel')) {
      cancels.add(call);
      return _json({'operationId': path.split('/')[5], 'state': 'terminal'});
    }
    if (request.method == 'GET' && path.endsWith('/messages')) {
      historyReads.add(call);
      return _json({
        'messages': [
          for (var index = 0; index < 2; index++)
            if (saved.contains(index)) ...[
              _row(index, assistant: false),
              _row(index, assistant: true),
            ],
        ],
      });
    }
    if (request.method == 'GET' && path.contains('/operations/')) {
      outcomeReads.add(call);
      final index = wrongReadbackOperation ? 0 : 1;
      return _json({
        'operationId': _operation(index),
        'state': 'assistant_saved',
        'userMessage': _row(index, assistant: false),
        'assistantMessage': _row(index, assistant: true),
      });
    }
    return _failure();
  }

  Map<String, Object> _row(int index, {required bool assistant}) {
    final input = receivedTexts[index];
    if (input == null) throw StateError('Synthetic execute was not received.');
    return _message(index, assistant: assistant, input: input);
  }

  http.StreamedResponse _failure() => _json({
    'error': {'code': 'REQUEST_INVALID', 'message': 'Synthetic refusal.'},
    'requestId': 'synthetic-repeat-request',
  }, 400);

  http.StreamedResponse _json(Object body, [int status = 200]) =>
      http.StreamedResponse(
        Stream.value(utf8.encode(jsonEncode(body))),
        status,
        headers: {'content-type': 'application/json; charset=utf-8'},
      );
}
