import 'dart:async';
import 'dart:convert';

import '../../features/ai_conversation/data/ai_wire_transport.dart';
import '../../features/ai_conversation/domain/ai_conversation.dart';

enum SyntheticAiScenario {
  success('Success'),
  limited('Limited permission'),
  busy('Busy'),
  dependency('Dependency unavailable'),
  invalidReply('Rejected reply'),
  unknown('Unresolved result'),
  cancellable('Wait for Cancel');

  const SyntheticAiScenario(this.label);
  final String label;
}

/// A scripted in-memory wire fixture. This is not a Backend or a datastore.
/// Only the separate synthetic entry point imports this transport.
final class SyntheticAiTransport implements AiWireTransport {
  SyntheticAiTransport({
    this.scenario = SyntheticAiScenario.success,
    this.responseDelay = const Duration(milliseconds: 700),
  });

  SyntheticAiScenario scenario;
  final Duration responseDelay;
  final _operations = <String, _FixtureOperation>{};
  final _messages = <String, List<Map<String, Object?>>>{};
  final _activeSignals = <AiAbortSignal>{};
  int _identifier = 0;
  int executeCalls = 0;
  int cancelCalls = 0;
  int deleteCalls = 0;
  bool _closed = false;

  String _newId() =>
      '00000000-0000-4000-8000-${(++_identifier).toString().padLeft(12, '0')}';

  @override
  Future<AiWireResponse> send(AiWireRequest request) async {
    if (_closed || request.abort.isAborted) {
      return _error(503, 'AI_OUTCOME_UNRESOLVED');
    }
    final token =
        request.headers['Authorization'] ?? request.headers['authorization'];
    if (token == null || !token.startsWith('Bearer synthetic-ai-token-')) {
      return _error(401, 'AUTH_REQUIRED');
    }
    final uri = Uri.parse(request.path);
    final parts = uri.pathSegments;
    if (request.method == 'POST' && uri.path == '/v1/me/ai/operations') {
      if (scenario == SyntheticAiScenario.limited) {
        return _error(403, 'AI_CONTEXT_NOT_PERMITTED');
      }
      final body = jsonDecode(request.body!) as Map<String, dynamic>;
      final id = _newId();
      final conversation = body['conversationId'] as String? ?? _newId();
      final operation = _FixtureOperation(
        id: id,
        conversation: conversation,
        token: token,
        key: base64Url
            .encode(List<int>.filled(32, _identifier % 256))
            .replaceAll('=', ''),
        scenario: scenario,
        retryUserId: body['userMessageId'] as String?,
      );
      _operations[id] = operation;
      return _json(201, {
        'operationId': id,
        'operationKey': operation.key,
        'conversationId': conversation,
        'preparationExpiresAt': DateTime.now()
            .toUtc()
            .add(const Duration(seconds: 15))
            .toIso8601String(),
      });
    }
    if (parts.length == 6 && parts[2] == 'ai' && parts[3] == 'operations') {
      final operation = _operations[parts[4]];
      final key =
          request.headers['AI-Operation-Key'] ??
          request.headers['ai-operation-key'];
      if (operation == null ||
          token != operation.token ||
          key != operation.key) {
        return _error(404, 'AI_OPERATION_UNAVAILABLE');
      }
      if (request.method == 'POST' && parts[5] == 'cancel') {
        cancelCalls += 1;
        if (operation.state == 'unresolved') {
          return _error(503, 'AI_OUTCOME_UNRESOLVED');
        }
        operation.state = operation.user == null ? 'no_effect' : 'user_saved';
        operation.signal?.abort();
        return _json(200, {'operationId': operation.id, 'state': 'terminal'});
      }
      if (request.method == 'POST' && parts[5] == 'execute') {
        return _execute(request, operation);
      }
    }
    if (parts.length >= 4 && parts[2] == 'conversations') {
      final conversation = parts[3];
      if (request.method == 'DELETE' && parts.length == 4) {
        deleteCalls += 1;
        for (final op in _operations.values.where(
          (o) => o.conversation == conversation,
        )) {
          op.signal?.abort();
        }
        _operations.removeWhere((_, op) => op.conversation == conversation);
        for (final message
            in _messages[conversation] ?? <Map<String, Object?>>[]) {
          _assistantByUser.remove(message['messageId']);
        }
        _messages.remove(conversation);
        return const AiWireResponse(statusCode: 204, body: '');
      }
      if (request.method == 'GET' &&
          parts.length == 5 &&
          parts[4] == 'messages') {
        final messages = _messages[conversation];
        if (messages == null) return _error(404, 'CONVERSATION_UNAVAILABLE');
        final before = uri.queryParameters['before'];
        final int? sequence = before == null
            ? null
            : (jsonDecode(
                    utf8.decode(base64Url.decode(base64Url.normalize(before))),
                  ) as Map<String, dynamic>)['before']
                  as int;
        final eligible = messages
            .where(
              (message) =>
                  sequence == null || (message['sequence']! as int) < sequence,
            )
            .toList();
        final page = eligible.length > 20
            ? eligible.sublist(eligible.length - 20)
            : eligible;
        return _json(200, {
          'messages': page,
          if (eligible.length > 20)
            'nextCursor': base64Url
                .encode(
                  utf8.encode(
                    jsonEncode({'v': 1, 'before': page.first['sequence']}),
                  ),
                )
                .replaceAll('=', ''),
        });
      }
      if (request.method == 'GET' &&
          parts.length == 6 &&
          parts[4] == 'operations') {
        final operation = _operations[parts[5]];
        if (operation == null || operation.conversation != conversation) {
          return _error(404, 'AI_OPERATION_UNAVAILABLE');
        }
        final assistant = operation.user == null
            ? null
            : _assistantFor(operation.user!);
        final state =
            operation.state == 'active' || operation.state == 'unresolved'
            ? operation.state
            : assistant == null
            ? operation.state
            : 'assistant_saved';
        return _json(200, {
          'operationId': operation.id,
          'state': state,
          if (state == 'user_saved' || state == 'assistant_saved')
            'userMessage': operation.user,
          if (state == 'assistant_saved') 'assistantMessage': assistant,
        });
      }
    }
    return _error(400, 'REQUEST_INVALID');
  }

  Future<AiWireResponse> _execute(
    AiWireRequest request,
    _FixtureOperation operation,
  ) async {
    executeCalls += 1;
    if (operation.dispatched) return _error(409, 'AI_OPERATION_CONFLICT');
    operation.dispatched = true;
    if (operation.scenario == SyntheticAiScenario.busy) {
      operation.state = 'no_effect';
      return _error(429, 'AI_BUSY');
    }
    if (operation.scenario == SyntheticAiScenario.unknown) {
      operation.state = 'unresolved';
      return _error(503, 'AI_OUTCOME_UNRESOLVED');
    }
    final body = jsonDecode(request.body!) as Map<String, dynamic>;
    final text = body['text'] as String;
    final messages = _messages.putIfAbsent(operation.conversation, () => []);
    if (operation.retryUserId case final String id) {
      final matches = messages
          .where((m) => m['messageId'] == id && m['role'] == 'user')
          .toList();
      if (matches.length != 1 ||
          matches.single['text'] != text ||
          _assistantFor(matches.single) != null) {
        operation.state = 'unresolved';
        return _error(409, 'AI_OPERATION_CONFLICT');
      }
      operation.user = matches.single;
    } else {
      operation.user = _message(messages.length + 1, 'user', text);
      messages.add(operation.user!);
    }
    operation.signal = request.abort;
    _activeSignals.add(request.abort);
    try {
      await _wait(
        request.abort,
        indefinite: operation.scenario == SyntheticAiScenario.cancellable,
      );
      if (request.abort.isAborted || _closed) {
        operation.state = 'user_saved';
        return _error(503, 'AI_OUTCOME_UNRESOLVED');
      }
      if (operation.scenario == SyntheticAiScenario.dependency ||
          operation.scenario == SyntheticAiScenario.invalidReply) {
        operation.state = 'user_saved';
        return operation.scenario == SyntheticAiScenario.dependency
            ? _error(503, 'AI_UNAVAILABLE')
            : _error(502, 'AI_REPLY_REJECTED');
      }
      final assistant = _message(
        messages.length + 1,
        'assistant',
        'Synthetic reply for client testing. No real model or storage was used.',
      );
      messages.add(assistant);
      _assistantByUser[operation.user!['messageId']! as String] = assistant;
      operation.state = 'assistant_saved';
      return _json(200, {
        'operationId': operation.id,
        'conversationId': operation.conversation,
        'userMessage': operation.user,
        'assistantMessage': assistant,
      });
    } finally {
      _activeSignals.remove(request.abort);
      operation.signal = null;
    }
  }

  final _assistantByUser = <String, Map<String, Object?>>{};
  Map<String, Object?>? _assistantFor(Map<String, Object?> user) =>
      _assistantByUser[user['messageId']];

  Map<String, Object?> _message(int sequence, String role, String text) => {
    'messageId': _newId(),
    'sequence': sequence,
    'role': role,
    'persistedAt': DateTime.utc(
      2026,
      10,
      12,
    ).add(Duration(seconds: sequence)).toIso8601String(),
    'availability': 'available',
    'text': text,
  };

  /// Alters only fixture memory so the ordinary read demonstrates tombstone merge.
  void invalidateSyntheticReplies() {
    for (final reply in _assistantByUser.values) {
      reply['availability'] = 'unavailable';
      reply.remove('text');
    }
  }

  Future<void> _wait(AiAbortSignal abort, {required bool indefinite}) {
    final done = Completer<void>();
    Timer? timer;
    void finish() {
      timer?.cancel();
      if (!done.isCompleted) done.complete();
    }

    if (!indefinite) timer = Timer(responseDelay, finish);
    unawaited(abort.whenAborted.then((_) => finish()));
    if (abort.isAborted) finish();
    return done.future;
  }

  void close() {
    _closed = true;
    for (final signal in _activeSignals.toList()) {
      signal.abort();
    }
    _operations.clear();
    _messages.clear();
    _assistantByUser.clear();
  }
}

final class _FixtureOperation {
  _FixtureOperation({
    required this.id,
    required this.conversation,
    required this.token,
    required this.key,
    required this.scenario,
    this.retryUserId,
  });
  final String id;
  final String conversation;
  final String token;
  final String key;
  final SyntheticAiScenario scenario;
  final String? retryUserId;
  bool dispatched = false;
  String state = 'active';
  Map<String, Object?>? user;
  AiAbortSignal? signal;
}

AiWireResponse _json(int status, Object body) =>
    AiWireResponse(statusCode: status, body: jsonEncode(body));
AiWireResponse _error(int status, String code) => _json(status, {
  'error': {'code': code, 'message': 'Synthetic test response.'},
  'requestId': 'synthetic-request',
});
