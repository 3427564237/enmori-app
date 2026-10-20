import 'dart:async';
import 'dart:convert';

import '../../../core/result/result.dart';
import '../domain/ai_conversation.dart';
import '../domain/ai_conversation_repository.dart';
import 'ai_wire_transport.dart';

final class AiWireRepository
    implements AiConversationRepository, AiConversationHistoryRepository {
  AiWireRepository(this._transport);

  final AiWireTransport _transport;

  @override
  Future<Result<AiConversationHistoryPage>> listConversations({
    required String token,
    required AiAbortSignal abort,
    String? after,
  }) {
    if (after != null && !_uuid(after)) return _invalid();
    return _call(
      token: token,
      abort: abort,
      method: 'GET',
      path: '/v1/me/conversations${after == null ? '' : '?after=$after'}',
      status: 200,
      parse: (value) {
        final dto = _object(value, {'conversations'}, {'nextCursor'});
        final rows = dto['conversations'];
        _require(rows is List && rows.length <= 20);
        final summaries = <AiConversationSummary>[];
        for (final row in rows as List) {
          final item = _object(row, {'conversationId', 'lastMessageAt'});
          final id = _id(item['conversationId']);
          _require(
            (after == null || id.compareTo(after) > 0) &&
                (summaries.isEmpty ||
                    id.compareTo(summaries.last.conversationId) > 0),
          );
          summaries.add(
            AiConversationSummary(
              conversationId: id,
              lastMessageAt: _utc(item['lastMessageAt']),
            ),
          );
        }
        final cursor = dto.containsKey('nextCursor')
            ? _id(dto['nextCursor'])
            : null;
        _require(
          cursor == null ||
              ((after == null || cursor.compareTo(after) > 0) &&
                  (summaries.isEmpty ||
                      cursor.compareTo(summaries.last.conversationId) >= 0)),
        );
        return AiConversationHistoryPage(
          conversations: summaries,
          nextCursor: cursor,
        );
      },
    );
  }

  @override
  Future<Result<AiTicket>> prepare({
    required String token,
    required AiAbortSignal abort,
    String? conversationId,
    String? userMessageId,
  }) {
    if ((conversationId != null && !_uuid(conversationId)) ||
        (userMessageId != null &&
            (conversationId == null || !_uuid(userMessageId)))) {
      return _invalid();
    }
    return _call(
      token: token,
      abort: abort,
      method: 'POST',
      path: '/v1/me/ai/operations',
      body: {
        'kind': userMessageId == null ? 'send' : 'retry',
        'purpose': 'checkin_conversation',
        'conversationId': ?conversationId,
        'userMessageId': ?userMessageId,
      },
      status: 201,
      parse: (value) {
        final dto = _object(value, {
          'operationId',
          'operationKey',
          'conversationId',
          'preparationExpiresAt',
        });
        final result = AiTicket(
          operationId: _id(dto['operationId']),
          operationKey: _key(dto['operationKey']),
          conversationId: _id(dto['conversationId']),
          preparationExpiresAt: _utc(dto['preparationExpiresAt']),
        );
        _require(
          conversationId == null || result.conversationId == conversationId,
        );
        return result;
      },
    );
  }

  @override
  Future<Result<AiReply>> execute({
    required String token,
    required AiAbortSignal abort,
    required AiTicket ticket,
    required String text,
  }) {
    if (!_ticket(ticket)) return _invalid();
    if (!_validText(text)) {
      return Future.value(const Failure(_invalidInput));
    }
    final body = {'text': text};
    if (utf8.encode(jsonEncode(body)).length > 16 * 1024) {
      return Future.value(const Failure(_tooLarge));
    }
    return _call(
      token: token,
      abort: abort,
      method: 'POST',
      path: '/v1/me/ai/operations/${ticket.operationId}/execute',
      operationKey: ticket.operationKey,
      body: body,
      status: 200,
      parse: (value) {
        final dto = _object(value, {
          'operationId',
          'conversationId',
          'userMessage',
          'assistantMessage',
        });
        _require(_id(dto['operationId']) == ticket.operationId);
        _require(_id(dto['conversationId']) == ticket.conversationId);
        final user = _message(dto['userMessage']);
        final assistant = _message(dto['assistantMessage']);
        _pair(user, assistant);
        _require(assistant.availability == AiAvailability.available);
        _require(user.text == text);
        return AiReply(
          operationId: ticket.operationId,
          conversationId: ticket.conversationId,
          userMessage: user,
          assistantMessage: assistant,
        );
      },
    );
  }

  @override
  Future<Result<void>> cancel({
    required String token,
    required AiAbortSignal abort,
    required AiTicket ticket,
  }) {
    if (!_ticket(ticket)) return _invalid();
    return _call<void>(
      token: token,
      abort: abort,
      method: 'POST',
      path: '/v1/me/ai/operations/${ticket.operationId}/cancel',
      operationKey: ticket.operationKey,
      status: 200,
      parse: (value) {
        final dto = _object(value, {'operationId', 'state'});
        _require(_id(dto['operationId']) == ticket.operationId);
        _require(dto['state'] == 'terminal');
      },
    );
  }

  @override
  Future<Result<AiReadback>> readOperation({
    required String token,
    required AiAbortSignal abort,
    required String conversationId,
    required String operationId,
  }) {
    if (!_uuid(conversationId) || !_uuid(operationId)) return _invalid();
    return _call(
      token: token,
      abort: abort,
      method: 'GET',
      path: '/v1/me/conversations/$conversationId/operations/$operationId',
      status: 200,
      parse: (value) {
        final dto = _object(
          value,
          {'operationId', 'state'},
          {'userMessage', 'assistantMessage'},
        );
        _require(_id(dto['operationId']) == operationId);
        final state = switch (dto['state']) {
          'active' => AiOutcomeState.active,
          'no_effect' => AiOutcomeState.noEffect,
          'user_saved' => AiOutcomeState.userSaved,
          'assistant_saved' => AiOutcomeState.assistantSaved,
          'unresolved' => AiOutcomeState.unresolved,
          _ => throw const FormatException(),
        };
        AiMessage? user;
        AiMessage? assistant;
        if (state == AiOutcomeState.userSaved ||
            state == AiOutcomeState.assistantSaved) {
          user = _message(dto['userMessage']);
          _require(user.role == AiRole.user);
          if (state == AiOutcomeState.assistantSaved) {
            assistant = _message(dto['assistantMessage']);
            _pair(user, assistant);
          } else {
            _require(!dto.containsKey('assistantMessage'));
          }
        } else {
          _require(
            !dto.containsKey('userMessage') &&
                !dto.containsKey('assistantMessage'),
          );
        }
        return AiReadback(
          operationId: operationId,
          state: state,
          userMessage: user,
          assistantMessage: assistant,
        );
      },
    );
  }

  @override
  Future<Result<AiMessagePage>> readMessages({
    required String token,
    required AiAbortSignal abort,
    required String conversationId,
    String? before,
  }) {
    if (!_uuid(conversationId)) return _invalid();
    int? boundary;
    try {
      if (before != null) boundary = _cursor(before);
    } on FormatException {
      return _invalid();
    }
    return _call(
      token: token,
      abort: abort,
      method: 'GET',
      path:
          '/v1/me/conversations/$conversationId/messages'
          '${before == null ? '' : '?before=${Uri.encodeQueryComponent(before)}'}',
      status: 200,
      parse: (value) {
        final dto = _object(value, {'messages'}, {'nextCursor'});
        final rows = dto['messages'];
        _require(rows is List && rows.length <= 20);
        final messages = (rows as List).map(_message).toList();
        final ids = <String>{};
        var previous = 0;
        for (final message in messages) {
          _require(ids.add(message.messageId));
          _require(message.sequence > previous);
          _require(boundary == null || message.sequence < boundary);
          previous = message.sequence;
        }
        String? cursor;
        if (dto.containsKey('nextCursor')) {
          final raw = dto['nextCursor'];
          _require(raw is String);
          cursor = raw as String;
          final next = _cursor(cursor);
          _require(messages.isNotEmpty && next == messages.first.sequence);
        }
        return AiMessagePage(messages: messages, nextCursor: cursor);
      },
    );
  }

  @override
  Future<Result<void>> deleteConversation({
    required String token,
    required AiAbortSignal abort,
    required String conversationId,
  }) {
    if (!_uuid(conversationId)) return _invalid();
    return _call<void>(
      token: token,
      abort: abort,
      method: 'DELETE',
      path: '/v1/me/conversations/$conversationId',
      status: 204,
      parse: (_) {},
    );
  }

  Future<Result<T>> _call<T>({
    required String token,
    required AiAbortSignal abort,
    required String method,
    required String path,
    required int status,
    required T Function(Object?) parse,
    String? operationKey,
    Map<String, Object>? body,
  }) async {
    if (abort.isAborted) return const Failure(_unresolved);
    if (token.isEmpty ||
        token.contains(RegExp(r'[\s\x00-\x1f\x7f]')) ||
        !_wellFormed(token)) {
      return const Failure(_authRequired);
    }
    final request = AiWireRequest(
      method: method,
      path: path,
      abort: abort,
      headers: {
        'Authorization': 'Bearer $token',
        'Accept': 'application/json',
        'Cache-Control': 'no-store',
        if (body != null) 'Content-Type': 'application/json',
        'AI-Operation-Key': ?operationKey,
      },
      body: body == null ? null : jsonEncode(body),
    );
    try {
      final response = await Future.any<AiWireResponse?>([
        _transport.send(request),
        abort.whenAborted.then((_) => null),
      ]);
      if (abort.isAborted || response == null) {
        return const Failure(_unresolved);
      }
      if (response.statusCode == status) {
        if (status == 204) {
          _require(response.body.isEmpty);
          return Success(parse(null));
        }
        return Success(parse(jsonDecode(response.body)));
      }
      return Failure(_error(response));
    } on FormatException {
      return const Failure(_invalidResponse);
    } catch (_) {
      // A transport exception never proves that a dispatched write was absent.
      return const Failure(_unresolved);
    }
  }
}

const _maxSafeInteger = 9007199254740991;
final _uuidPattern = RegExp(
  r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
);
final _urlPattern = RegExp(r'^[A-Za-z0-9_-]+$');
final _utcPattern = RegExp(
  r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$',
);

bool _uuid(String value) => _uuidPattern.hasMatch(value);
String _id(Object? value) {
  _require(value is String && _uuid(value));
  return value as String;
}

String _key(Object? value) {
  _require(value is String && _urlPattern.hasMatch(value));
  final text = value as String;
  final decoded = base64Url.decode(base64Url.normalize(text));
  _require(
    decoded.length == 32 &&
        base64Url.encode(decoded).replaceAll('=', '') == text,
  );
  return text;
}

bool _ticket(AiTicket ticket) {
  try {
    _id(ticket.operationId);
    _id(ticket.conversationId);
    _key(ticket.operationKey);
    return ticket.preparationExpiresAt.isUtc;
  } on FormatException {
    return false;
  }
}

Map<String, dynamic> _object(
  Object? value,
  Set<String> required, [
  Set<String> optional = const {},
]) {
  _require(value is Map<String, dynamic>);
  final map = value as Map<String, dynamic>;
  _require(required.every(map.containsKey));
  _require(
    map.keys.every((key) => required.contains(key) || optional.contains(key)),
  );
  return map;
}

void _require(bool condition) {
  if (!condition) throw const FormatException('Invalid AI wire value');
}

DateTime _utc(Object? value) {
  _require(value is String && _utcPattern.hasMatch(value));
  final parsed = DateTime.tryParse(value as String);
  _require(parsed != null && parsed.isUtc);
  // DateTime.parse normalizes overflow dates; compare every supplied component.
  _require(
    parsed!.toIso8601String().substring(0, 19) == value.substring(0, 19),
  );
  return parsed;
}

bool _wellFormed(String value) {
  final units = value.codeUnits;
  for (var i = 0; i < units.length; i++) {
    final unit = units[i];
    if (unit >= 0xd800 && unit <= 0xdbff) {
      if (++i >= units.length || units[i] < 0xdc00 || units[i] > 0xdfff) {
        return false;
      }
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return false;
    }
  }
  return true;
}

bool _validText(String value) =>
    _wellFormed(value) && value.trim().isNotEmpty && value.runes.length <= 2400;

AiMessage _message(Object? value) {
  final dto = _object(
    value,
    {'messageId', 'sequence', 'role', 'persistedAt', 'availability'},
    {'text'},
  );
  final sequence = dto['sequence'];
  _require(sequence is int && sequence > 0 && sequence <= _maxSafeInteger);
  final role = switch (dto['role']) {
    'user' => AiRole.user,
    'assistant' => AiRole.assistant,
    _ => throw const FormatException(),
  };
  final availability = switch (dto['availability']) {
    'available' => AiAvailability.available,
    'unavailable' => AiAvailability.unavailable,
    _ => throw const FormatException(),
  };
  String? text;
  if (availability == AiAvailability.unavailable) {
    _require(role == AiRole.assistant && !dto.containsKey('text'));
  } else {
    final raw = dto['text'];
    _require(raw is String && _validText(raw));
    text = raw as String;
  }
  return AiMessage(
    messageId: _id(dto['messageId']),
    sequence: sequence as int,
    role: role,
    persistedAt: _utc(dto['persistedAt']),
    availability: availability,
    text: text,
  );
}

void _pair(AiMessage user, AiMessage assistant) {
  _require(user.role == AiRole.user && assistant.role == AiRole.assistant);
  _require(
    user.messageId != assistant.messageId && user.sequence < assistant.sequence,
  );
}

int _cursor(String value) {
  _require(value.length <= 128 && _urlPattern.hasMatch(value));
  final bytes = base64Url.decode(base64Url.normalize(value));
  _require(base64Url.encode(bytes).replaceAll('=', '') == value);
  final text = utf8.decode(bytes, allowMalformed: false);
  final dto = _object(jsonDecode(text), {'v', 'before'});
  final before = dto['before'];
  _require(dto['v'] is int && dto['v'] == 1);
  _require(before is int && before > 0 && before <= _maxSafeInteger);
  _require(text == jsonEncode({'v': 1, 'before': before}));
  return before as int;
}

Future<Result<T>> _invalid<T>() => Future.value(const Failure(_invalidRequest));
const _invalidRequest = AppFailure(
  kind: AppFailureKind.requestInvalid,
  message: 'The request is invalid.',
);
const _invalidInput = AppFailure(
  kind: AppFailureKind.aiInputInvalid,
  message: 'Enter a message of 1–2400 characters.',
);
const _tooLarge = AppFailure(
  kind: AppFailureKind.requestTooLarge,
  message: 'The request is too large.',
);
const _authRequired = AppFailure(
  kind: AppFailureKind.authRequired,
  message: 'Sign in to continue.',
);
const _unresolved = AppFailure(
  kind: AppFailureKind.aiOutcomeUnresolved,
  message: 'We couldn’t confirm the result. Check saved messages before trying again.',
);
const _invalidResponse = AppFailure(
  kind: AppFailureKind.unexpected,
  message: 'The service returned an invalid response.',
);

AppFailure _error(AiWireResponse response) {
  final dto = _object(jsonDecode(response.body), {'error', 'requestId'});
  final error = _object(dto['error'], {'code', 'message'});
  _require(
    error['message'] is String &&
        (error['message'] as String).trim().isNotEmpty,
  );
  _require(
    dto['requestId'] is String &&
        (dto['requestId'] as String).trim().isNotEmpty,
  );
  final mapping = _errors[error['code']];
  _require(mapping != null && response.statusCode == mapping.$1);
  return AppFailure(
    kind: mapping!.$2,
    message: mapping.$3,
    requestId: dto['requestId'] as String,
  );
}

const _errors = <String, (int, AppFailureKind, String)>{
  'REQUEST_INVALID': (
    400,
    AppFailureKind.requestInvalid,
    'The request is invalid.',
  ),
  'AUTH_REQUIRED': (401, AppFailureKind.authRequired, 'Sign in to continue.'),
  'AUTH_FORBIDDEN': (
    403,
    AppFailureKind.authForbidden,
    'This account cannot continue.',
  ),
  'ONBOARDING_REQUIRED': (
    409,
    AppFailureKind.onboardingRequired,
    'Complete your account setup.',
  ),
  'AI_CONTEXT_NOT_PERMITTED': (
    403,
    AppFailureKind.aiContextNotPermitted,
    'Check-in context is not available under your current permissions.',
  ),
  'CONVERSATION_UNAVAILABLE': (
    404,
    AppFailureKind.conversationUnavailable,
    'This conversation is not available.',
  ),
  'AI_OPERATION_UNAVAILABLE': (
    404,
    AppFailureKind.aiOperationUnavailable,
    'This operation is not available.',
  ),
  'AI_OPERATION_CONFLICT': (
    409,
    AppFailureKind.aiOperationConflict,
    'Check saved messages before trying again.',
  ),
  'REQUEST_TOO_LARGE': (
    413,
    AppFailureKind.requestTooLarge,
    'The request is too large.',
  ),
  'AI_INPUT_INVALID': (
    422,
    AppFailureKind.aiInputInvalid,
    'The message cannot be processed.',
  ),
  'AI_BUSY': (429, AppFailureKind.aiBusy, 'AI is busy. Try again later.'),
  'AI_UNAVAILABLE': (
    503,
    AppFailureKind.aiUnavailable,
    'AI is unavailable right now. Try again later.',
  ),
  'AI_REPLY_REJECTED': (
    502,
    AppFailureKind.aiReplyRejected,
    'A reply could not be provided.',
  ),
  'AI_AUTHORITY_CHANGED': (
    409,
    AppFailureKind.aiAuthorityChanged,
    'This reply is no longer available.',
  ),
  'AI_OUTCOME_UNRESOLVED': (
    503,
    AppFailureKind.aiOutcomeUnresolved,
    'We couldn’t confirm the result. Check saved messages before trying again.',
  ),
};
