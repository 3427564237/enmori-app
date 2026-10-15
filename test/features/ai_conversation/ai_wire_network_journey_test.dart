import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/ai_conversation/data/ai_wire_repository.dart';
import 'package:enmori/features/ai_conversation/data/http_ai_wire_transport.dart';
import 'package:enmori/features/ai_conversation/domain/ai_conversation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import '../../../tool/ai_wire_controlled_probe.dart';

// Real TCP/HTTP and the actual client mapper. This peer is a handwritten N01
// fixture, not JIN's Backend, Firebase Auth, Firestore or a model.
void main() {
  test(
    'real loopback probe preserves six-digit UTC and original message IDs',
    () async {
      final peer = await _Peer.create();
      final result = await runAiWireControlledProbe(
        repository: peer.repository,
        token: _token,
      );
      expect(result.passed, isTrue);
      expect(result.steps, [
        'prepare:pass',
        'execute:pass',
        'readOutcome:pass',
        'readMessages:pass',
        'deleteConversation:pass',
      ]);
      expect(result.cleanupConversationId, isNull);
      expect(peer.paths, [
        'POST /v1/me/ai/operations',
        'POST /v1/me/ai/operations/$_operation/execute',
        'GET /v1/me/conversations/$_conversation/operations/$_operation',
        'GET /v1/me/conversations/$_conversation/messages',
        'DELETE /v1/me/conversations/$_conversation',
      ]);
      expect(peer.tokens.toSet(), {_token});
      expect(peer.texts, [controlledProbeInput]);
      expect(peer.deleted, isTrue);
    },
  );

  test(
    'execute disconnect stays blocked and uses original ticket for one cancel',
    () async {
      final peer = await _Peer.create(loseExecuteAck: true);
      final result = await runAiWireControlledProbe(
        repository: peer.repository,
        token: _token,
      );
      expect(result.passed, isFalse);
      expect(result.steps, [
        'prepare:pass',
        'execute:blocked:aiOutcomeUnresolved',
        'cancel:pass',
        'deleteConversation:pass',
      ]);
      expect(
        peer.paths.where((path) => path.endsWith('/execute')),
        hasLength(1),
      );
      expect(
        peer.paths.where((path) => path.endsWith('/cancel')),
        hasLength(1),
      );
      expect(peer.keys, [_key, _key]);
      expect(peer.deleted, isTrue);
    },
  );

  test('missing whole-delete capability holds cleanup only and retains private fixture ref', () async {
    final peer = await _Peer.create(blockDelete: true);
    final result = await runAiWireControlledProbe(
      repository: peer.repository,
      token: _token,
    );
    expect(
      result.steps.take(4).every((step) => step.endsWith(':pass')),
      isTrue,
    );
    expect(result.steps.last, 'deleteConversation:blocked:aiUnavailable');
    expect(result.cleanupConversationId, _conversation);
    expect(result.steps.join(), isNot(contains(_conversation)));
    expect(result.steps.join(), isNot(contains(_token)));
    expect(peer.deleted, isFalse);
    expect(peer.paths.where((path) => path.endsWith('/execute')), hasLength(1));
  });

  test(
    'prepare refusal never executes, cancels or deletes another Conversation',
    () async {
      final peer = await _Peer.create(blockPrepare: true);
      final result = await runAiWireControlledProbe(
        repository: peer.repository,
        token: _token,
      );
      expect(result.steps, ['prepare:blocked:aiContextNotPermitted']);
      expect(result.cleanupConversationId, isNull);
      expect(peer.paths, ['POST /v1/me/ai/operations']);
    },
  );

  test(
    'explicit Retry over real HTTP reuses U unchanged and appends only A',
    () async {
      final peer = await _Peer.create(loseExecuteAck: true);
      final repository = peer.repository;
      final first = (await repository.prepare(
        token: _token,
        abort: AiAbortSignal(),
      ) as Success<AiTicket>).value;
      final unknown = await repository.execute(
        token: _token,
        abort: AiAbortSignal(),
        ticket: first,
        text: controlledProbeInput,
      );
      expect(unknown, isA<Failure<AiReply>>());
      await repository.cancel(
        token: _token,
        abort: AiAbortSignal(),
        ticket: first,
      );
      final readback = (await repository.readOperation(
        token: 'synthetic-refreshed-token',
        abort: AiAbortSignal(),
        conversationId: _conversation,
        operationId: first.operationId,
      ) as Success<AiReadback>).value;
      expect(readback.state, AiOutcomeState.userSaved);
      peer.loseExecuteAck = false;
      final retry = (await repository.prepare(
        token: 'synthetic-refreshed-token',
        abort: AiAbortSignal(),
        conversationId: _conversation,
        userMessageId: readback.userMessage!.messageId,
      ) as Success<AiTicket>).value;
      final reply = (await repository.execute(
        token: 'synthetic-refreshed-token',
        abort: AiAbortSignal(),
        ticket: retry,
        text: controlledProbeInput,
      ) as Success<AiReply>).value;
      expect(reply.userMessage.messageId, readback.userMessage!.messageId);
      expect(reply.userMessage.sequence, readback.userMessage!.sequence);
      expect(reply.userMessage.persistedAt, readback.userMessage!.persistedAt);
      expect(reply.userMessage.text, readback.userMessage!.text);
      final page = (await repository.readMessages(
        token: 'synthetic-refreshed-token',
        abort: AiAbortSignal(),
        conversationId: _conversation,
      ) as Success<AiMessagePage>).value;
      expect(page.messages.map((message) => message.messageId), [
        _userId,
        _assistantId,
      ]);
      expect(peer.prepareBodies.last, {
        'kind': 'retry',
        'purpose': 'checkin_conversation',
        'conversationId': _conversation,
        'userMessageId': _userId,
      });
      await repository.deleteConversation(
        token: _token,
        abort: AiAbortSignal(),
        conversationId: _conversation,
      );
    },
  );
}

const _conversation = '00000000-0000-4000-8000-000000000001';
const _operation = '00000000-0000-4000-8000-000000000002';
const _retryOperation = '00000000-0000-4000-8000-000000000005';
const _userId = '00000000-0000-4000-8000-000000000003';
const _assistantId = '00000000-0000-4000-8000-000000000004';
const _key = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const _token = 'synthetic-initial-token';

Map<String, Object> _user() => {
  'messageId': _userId,
  'sequence': 1,
  'role': 'user',
  'persistedAt': '2026-10-14T09:00:00.123456Z',
  'availability': 'available',
  'text': controlledProbeInput,
};
Map<String, Object> _assistant() => {
  'messageId': _assistantId,
  'sequence': 2,
  'role': 'assistant',
  'persistedAt': '2026-10-14T09:00:01.654321Z',
  'availability': 'available',
  'text': 'Synthetic accepted reply.',
};

final class _Peer {
  _Peer(
    this.server,
    this.client, {
    required this.loseExecuteAck,
    required this.blockDelete,
    required this.blockPrepare,
  }) {
    repository = AiWireRepository(
      HttpAiWireTransport.isolatedLoopback(
        baseUri: Uri.parse('http://127.0.0.1:${server.port}'),
        client: client,
      ),
    );
    subscription = server.listen(_handle);
  }

  final HttpServer server;
  final http.Client client;
  late final AiWireRepository repository;
  late final StreamSubscription<HttpRequest> subscription;
  final paths = <String>[];
  final tokens = <String>[];
  final keys = <String>[];
  final texts = <String>[];
  final prepareBodies = <Object?>[];
  bool loseExecuteAck;
  final bool blockDelete, blockPrepare;
  bool userSaved = false, assistantSaved = false, deleted = false;

  static Future<_Peer> create({
    bool loseExecuteAck = false,
    bool blockDelete = false,
    bool blockPrepare = false,
  }) async {
    final peer = _Peer(
      await HttpServer.bind(InternetAddress.loopbackIPv4, 0),
      http.Client(),
      loseExecuteAck: loseExecuteAck,
      blockDelete: blockDelete,
      blockPrepare: blockPrepare,
    );
    addTearDown(() async {
      peer.client.close();
      await peer.server.close(force: true);
      await peer.subscription.cancel();
    });
    return peer;
  }

  Future<void> _handle(HttpRequest request) async {
    final path = request.uri.path;
    paths.add('${request.method} $path');
    tokens.add(request.headers.value('authorization')!.substring(7));
    final body = await utf8.decoder.bind(request).join();
    if (path == '/v1/me/ai/operations') {
      if (blockPrepare) return _error(request, 403, 'AI_CONTEXT_NOT_PERMITTED');
      final input = jsonDecode(body) as Map<String, dynamic>;
      prepareBodies.add(input);
      final retry = input['kind'] == 'retry';
      if (!retry) expect(input.containsKey('conversationId'), isFalse);
      return _json(request, {
        'operationId': retry ? _retryOperation : _operation,
        'operationKey': _key,
        'conversationId': _conversation,
        'preparationExpiresAt': DateTime.now()
            .toUtc()
            .add(const Duration(seconds: 15))
            .toIso8601String(),
      }, 201);
    }
    if (path.endsWith('/execute')) {
      keys.add(request.headers.value('ai-operation-key')!);
      texts.add((jsonDecode(body) as Map<String, dynamic>)['text'] as String);
      userSaved = true;
      if (loseExecuteAck) {
        final socket = await request.response.detachSocket(writeHeaders: false);
        socket.destroy();
        return;
      }
      assistantSaved = true;
      return _json(request, {
        'operationId': path.split('/')[5],
        'conversationId': _conversation,
        'userMessage': _user(),
        'assistantMessage': _assistant(),
      });
    }
    if (path.endsWith('/cancel')) {
      keys.add(request.headers.value('ai-operation-key')!);
      expect(body, isEmpty);
      return _json(request, {
        'operationId': path.split('/')[5],
        'state': 'terminal',
      });
    }
    if (path.contains('/operations/')) {
      return _json(request, {
        'operationId': path.split('/').last,
        'state': assistantSaved
            ? 'assistant_saved'
            : userSaved
            ? 'user_saved'
            : 'no_effect',
        if (userSaved) 'userMessage': _user(),
        if (assistantSaved) 'assistantMessage': _assistant(),
      });
    }
    if (path.endsWith('/messages')) {
      return _json(request, {
        'messages': [if (userSaved) _user(), if (assistantSaved) _assistant()],
      });
    }
    if (request.method == 'DELETE' &&
        path == '/v1/me/conversations/$_conversation') {
      if (blockDelete) return _error(request, 503, 'AI_UNAVAILABLE');
      deleted = true;
      request.response.statusCode = 204;
      await request.response.close();
      return;
    }
    return _error(request, 400, 'REQUEST_INVALID');
  }

  Future<void> _error(HttpRequest request, int status, String code) =>
      _json(request, {
        'error': {'code': code, 'message': 'Synthetic controlled failure.'},
        'requestId': 'synthetic-request',
      }, status);

  Future<void> _json(
    HttpRequest request,
    Object body, [
    int status = 200,
  ]) async {
    request.response
      ..statusCode = status
      ..headers.contentType = ContentType.json
      ..write(jsonEncode(body));
    await request.response.close();
  }
}
