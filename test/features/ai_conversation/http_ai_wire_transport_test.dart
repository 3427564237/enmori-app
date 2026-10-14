import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/ai_conversation/data/ai_wire_repository.dart';
import 'package:enmori/features/ai_conversation/data/ai_wire_transport.dart';
import 'package:enmori/features/ai_conversation/data/http_ai_wire_transport.dart';
import 'package:enmori/features/ai_conversation/domain/ai_conversation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

void main() {
  test('ordinary transport requires HTTPS and no URI credentials or query', () {
    final client = _Client((_) async => _response(''));
    for (final address in [
      'http://127.0.0.1:1234',
      'http://backend.invalid',
      'https://owner:secret@backend.invalid',
      'https://backend.invalid?token=private',
      'https://backend.invalid#private',
      'https://backend.invalid/not-the-root',
    ]) {
      expect(
        () => HttpAiWireTransport(baseUri: Uri.parse(address), client: client),
        throwsArgumentError,
      );
    }
    expect(client.sent, isEmpty);
  });

  test('explicit loopback transport cannot enable remote clear-text HTTP', () {
    final client = _Client((_) async => _response(''));
    for (final address in [
      'http://backend.invalid',
      'http://192.168.1.1:1234',
      'http://10.0.2.2:1234',
      'http://localhost:1234',
      'http://owner:secret@127.0.0.1:1234',
    ]) {
      expect(
        () => HttpAiWireTransport.isolatedLoopback(
          baseUri: Uri.parse(address),
          client: client,
        ),
        throwsArgumentError,
      );
    }
    expect(
      HttpAiWireTransport.isolatedLoopback(
        baseUri: Uri.parse('http://127.0.0.1:1234'),
        client: client,
      ),
      isA<AiWireTransport>(),
    );
  });

  test(
    'wire bytes and query survive; credentials are not redirected',
    () async {
      final client = _Client((_) async => _response('{"text":"你好"}'));
      final transport = _transport(client);
      final signal = AiAbortSignal();
      final result = await transport.send(
        _request(
          signal,
          path: '/v1/me/conversations/synthetic/messages?before=eyJhIjoxfQ',
          body: '{"text":"你好"}',
        ),
      );
      final outbound = client.sent.single as http.AbortableRequest;
      expect(outbound.url.scheme, 'https');
      expect(outbound.url.host, 'backend.invalid');
      expect(outbound.url.query, 'before=eyJhIjoxfQ');
      expect(outbound.headers['Authorization'], 'Bearer synthetic-only');
      expect(outbound.headers['AI-Operation-Key'], 'synthetic-only-key');
      expect(outbound.followRedirects, isFalse);
      expect(utf8.decode(outbound.bodyBytes), '{"text":"你好"}');
      expect(result.body, '{"text":"你好"}');
      expect(client.closes, 0);
    },
  );

  test('cross-origin or fragment request paths never dispatch', () async {
    final client = _Client((_) async => _response(''));
    for (final path in [
      '//other.invalid/v1/me/ai/operations',
      'https://other.invalid/v1/me/ai/operations',
      '/v1/me/ai/operations#private',
      'v1/me/ai/operations',
    ]) {
      await expectLater(
        _transport(client).send(_request(AiAbortSignal(), path: path)),
        throwsFormatException,
      );
    }
    expect(client.sent, isEmpty);
  });

  test(
    'a redirect is not followed or accepted as a successful operation',
    () async {
      final client = _Client(
        (_) async => http.StreamedResponse(
          Stream.value(utf8.encode('{"redirect":"synthetic-only"}')),
          302,
          headers: const {'location': 'https://other.invalid/'},
        ),
      );
      final result = await AiWireRepository(_transport(client))
          .prepare(token: 'synthetic-only', abort: AiAbortSignal());
      expect(result, isA<Failure<AiTicket>>());
      expect(client.sent, hasLength(1));
      expect(client.sent.single.followRedirects, isFalse);
      expect(client.sent.single.url.host, 'backend.invalid');
    },
  );

  test('already aborted work never dispatches', () async {
    final client = _Client((_) async => _response(''));
    final signal = AiAbortSignal()..abort();
    await expectLater(
      _transport(client).send(_request(signal)),
      throwsException,
    );
    expect(client.sent, isEmpty);
    expect(client.closes, 0);
  });

  test(
    'abort before headers settles and detaches a late response stream',
    () async {
      final headers = Completer<http.StreamedResponse>();
      final cancelled = Completer<void>();
      final body = StreamController<List<int>>(onCancel: cancelled.complete);
      final client = _Client((_) => headers.future);
      final signal = AiAbortSignal();
      final outcome = _transport(client).send(_request(signal));
      final assertion = expectLater(outcome, throwsException);
      signal.abort();
      await assertion;
      headers.complete(http.StreamedResponse(body.stream, 200));
      await cancelled.future;
      await body.close();
      expect(client.closes, 0);
    },
  );

  test(
    'body abort cancels only its stream, preserving another request',
    () async {
      final cancelled = Completer<void>();
      final body = StreamController<List<int>>(onCancel: cancelled.complete);
      final client = _Client(
        (request) async => request.url.path.endsWith('/slow')
            ? http.StreamedResponse(body.stream, 200)
            : _response('independent response'),
      );
      final transport = _transport(client);
      final signal = AiAbortSignal();
      final first = transport.send(_request(signal, path: '/slow'));
      final assertion = expectLater(first, throwsException);
      await Future<void>.delayed(Duration.zero);
      body.add(utf8.encode('private partial response'));
      final second = await transport.send(
        _request(AiAbortSignal(), path: '/fast'),
      );
      expect(second.body, 'independent response');
      signal.abort();
      await assertion;
      await cancelled.future;
      await body.close();
      expect(client.closes, 0);
      expect(client.sent, hasLength(2));
    },
  );

  test('settlement waits for the entire body and strict UTF-8', () async {
    final body = StreamController<List<int>>();
    final client = _Client(
      (_) async => http.StreamedResponse(body.stream, 200),
    );
    var settled = false;
    final result = _transport(client).send(_request(AiAbortSignal()))
      ..then((_) => settled = true);
    await Future<void>.delayed(Duration.zero);
    body.add(utf8.encode('{"synthetic":'));
    await Future<void>.delayed(Duration.zero);
    expect(settled, isFalse);
    body.add(utf8.encode('true}'));
    await body.close();
    expect((await result).body, '{"synthetic":true}');
    final invalid = _Client(
      (_) async => http.StreamedResponse(Stream.value([0xff]), 200),
    );
    await expectLater(
      _transport(invalid).send(_request(AiAbortSignal())),
      throwsFormatException,
    );
  });

  test(
    'network failure maps to unknown without exposing raw error or retry',
    () async {
      final client = _Client(
        (_) async => throw StateError('private vendor text'),
      );
      final result = await AiWireRepository(_transport(client))
          .prepare(token: 'synthetic-only', abort: AiAbortSignal());
      expect(result, isA<Failure<AiTicket>>());
      final failure = (result as Failure<AiTicket>).failure;
      expect(failure.kind, AppFailureKind.aiOutcomeUnresolved);
      expect(failure.message, isNot(contains('private vendor text')));
      expect(client.sent, hasLength(1));
      expect(client.closes, 0);
    },
  );

  test(
    'actual loopback HTTP abort during response keeps shared client usable',
    () async {
      final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
      final client = http.Client();
      addTearDown(client.close);
      addTearDown(() => server.close(force: true));
      final started = Completer<void>();
      final release = Completer<void>();
      final subscription = server.listen((request) async {
        if (request.uri.path == '/slow') {
          request.response
            ..headers.contentType = ContentType.json
            ..write('{"partial":');
          await request.response.flush();
          started.complete();
          await release.future;
          try {
            request.response.write('true}');
            await request.response.close();
          } catch (_) {
            // The synthetic peer may have aborted this one response.
          }
        } else {
          request.response.write('synthetic independent response');
          await request.response.close();
        }
      });
      addTearDown(subscription.cancel);
      final transport = HttpAiWireTransport.isolatedLoopback(
        baseUri: Uri.parse('http://127.0.0.1:${server.port}'),
        client: client,
      );
      final signal = AiAbortSignal();
      final slow = transport.send(_request(signal, path: '/slow'));
      final assertion = expectLater(slow, throwsException);
      await started.future;
      signal.abort();
      await assertion;
      final fast = await transport.send(
        _request(AiAbortSignal(), path: '/fast'),
      );
      expect(fast.body, 'synthetic independent response');
      release.complete();
    },
  );
}

HttpAiWireTransport _transport(http.Client client) => HttpAiWireTransport(
  baseUri: Uri.parse('https://backend.invalid'),
  client: client,
);

AiWireRequest _request(
  AiAbortSignal signal, {
  String path = '/v1/me/ai/operations',
  String? body,
}) => AiWireRequest(
  method: body == null ? 'GET' : 'POST',
  path: path,
  abort: signal,
  headers: const {
    'Authorization': 'Bearer synthetic-only',
    'AI-Operation-Key': 'synthetic-only-key',
    'Content-Type': 'application/json',
  },
  body: body,
);

http.StreamedResponse _response(String body) =>
    http.StreamedResponse(Stream.value(utf8.encode(body)), 200);

final class _Client extends http.BaseClient {
  _Client(this._send);
  final Future<http.StreamedResponse> Function(http.BaseRequest) _send;
  final sent = <http.BaseRequest>[];
  int closes = 0;

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) {
    sent.add(request);
    return _send(request);
  }

  @override
  void close() => closes++;
}
