import 'dart:async';
import 'dart:convert';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/ai_conversation/data/ai_wire_repository.dart';
import 'package:enmori/features/ai_conversation/data/ai_wire_transport.dart';
import 'package:enmori/features/ai_conversation/domain/ai_conversation.dart';
import 'package:flutter_test/flutter_test.dart';

const _conversation = '11111111-1111-4111-8111-111111111111';
const _operation = '22222222-2222-4222-8222-222222222222';
const _user = '33333333-3333-4333-8333-333333333333';
const _assistant = '44444444-4444-4444-8444-444444444444';
const _other = '55555555-5555-4555-8555-555555555555';
const _key = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const _time = '2026-10-12T12:00:00.000Z';
const _token = 'original-token';

AiTicket get _ticket => AiTicket(
  operationId: _operation,
  operationKey: _key,
  conversationId: _conversation,
  preparationExpiresAt: DateTime.parse(_time),
);

Map<String, Object?> _ticketJson() => {
  'operationId': _operation,
  'operationKey': _key,
  'conversationId': _conversation,
  'preparationExpiresAt': _time,
};

Map<String, Object?> _message({
  bool assistant = false,
  bool unavailable = false,
  String text = 'message',
  int? sequence,
}) => {
  'messageId': assistant ? _assistant : _user,
  'sequence': sequence ?? (assistant ? 2 : 1),
  'role': assistant ? 'assistant' : 'user',
  'persistedAt': _time,
  'availability': unavailable ? 'unavailable' : 'available',
  if (!unavailable) 'text': text,
};

Map<String, Object?> _reply({String text = 'message'}) => {
  'operationId': _operation,
  'conversationId': _conversation,
  'userMessage': _message(text: text),
  'assistantMessage': _message(assistant: true, text: 'reply'),
};

String _cursor(int before) => base64Url
    .encode(utf8.encode(jsonEncode({'v': 1, 'before': before})))
    .replaceAll('=', '');

AiWireResponse _json(Object? body, [int status = 200]) =>
    AiWireResponse(statusCode: status, body: jsonEncode(body));

AppFailureKind _failure<T>(Result<T> result) =>
    (result as Failure<T>).failure.kind;

final class _Transport implements AiWireTransport {
  _Transport(this.handle);

  final Future<AiWireResponse> Function(AiWireRequest) handle;
  final requests = <AiWireRequest>[];

  @override
  Future<AiWireResponse> send(AiWireRequest request) {
    requests.add(request);
    return handle(request);
  }
}

void main() {
  group('N01 wire requests', () {
    test('prepares Send and Retry with exactly selected fields', () async {
      final transport = _Transport((_) async => _json(_ticketJson(), 201));
      final repository = AiWireRepository(transport);
      final abort = AiAbortSignal();

      final result = await repository.prepare(token: _token, abort: abort);
      final ticket = (result as Success<AiTicket>).value;
      expect(ticket.operationId, _operation);
      expect(ticket.operationKey, _key);
      expect(ticket.preparationExpiresAt, DateTime.parse(_time));
      expect(transport.requests.single.method, 'POST');
      expect(transport.requests.single.path, '/v1/me/ai/operations');
      expect(transport.requests.single.abort, same(abort));
      expect(transport.requests.single.headers, {
        'Authorization': 'Bearer $_token',
        'Accept': 'application/json',
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json',
      });
      expect(jsonDecode(transport.requests.single.body!), {
        'kind': 'send',
        'purpose': 'checkin_conversation',
      });

      await repository.prepare(
        token: _token,
        abort: AiAbortSignal(),
        conversationId: _conversation,
      );
      expect(jsonDecode(transport.requests.last.body!), {
        'kind': 'send',
        'purpose': 'checkin_conversation',
        'conversationId': _conversation,
      });
      await repository.prepare(
        token: _token,
        abort: AiAbortSignal(),
        conversationId: _conversation,
        userMessageId: _user,
      );
      expect(jsonDecode(transport.requests.last.body!), {
        'kind': 'retry',
        'purpose': 'checkin_conversation',
        'conversationId': _conversation,
        'userMessageId': _user,
      });
    });

    test(
      'execute preserves scalar text, original token and operation key',
      () async {
        final original = '  今天\n${List.filled(1200, '🌱').join()}  ';
        final transport = _Transport(
          (_) async => _json(_reply(text: original)),
        );
        final result = await AiWireRepository(transport).execute(
          token: _token,
          abort: AiAbortSignal(),
          ticket: _ticket,
          text: original,
        );
        final request = transport.requests.single;
        expect(request.method, 'POST');
        expect(request.path, '/v1/me/ai/operations/$_operation/execute');
        expect(request.headers['Authorization'], 'Bearer $_token');
        expect(request.headers['AI-Operation-Key'], _key);
        expect(jsonDecode(request.body!), {'text': original});
        final reply = (result as Success<AiReply>).value;
        expect(reply.userMessage.text, original);
        expect(reply.userMessage.persistedAt, DateTime.parse(_time));
        expect(reply.assistantMessage.role, AiRole.assistant);
      },
    );

    test(
      'cancel, reads and delete use selected identity and empty bodies',
      () async {
        final transport = _Transport((request) async {
          if (request.path.endsWith('/cancel')) {
            return _json({'operationId': _operation, 'state': 'terminal'});
          }
          if (request.path.endsWith('/operations/$_operation')) {
            return _json({'operationId': _operation, 'state': 'no_effect'});
          }
          if (request.method == 'DELETE') {
            return const AiWireResponse(statusCode: 204, body: '');
          }
          return _json({'messages': <Object>[]});
        });
        final repository = AiWireRepository(transport);
        expect(
          await repository.cancel(
            token: _token,
            abort: AiAbortSignal(),
            ticket: _ticket,
          ),
          isA<Success<void>>(),
        );
        expect(transport.requests.last.headers['AI-Operation-Key'], _key);
        expect(
          transport.requests.last.path,
          '/v1/me/ai/operations/$_operation/cancel',
        );
        expect(
          await repository.readOperation(
            token: 'current-token',
            abort: AiAbortSignal(),
            conversationId: _conversation,
            operationId: _operation,
          ),
          isA<Success<AiReadback>>(),
        );
        expect(
          await repository.readMessages(
            token: 'current-token',
            abort: AiAbortSignal(),
            conversationId: _conversation,
            before: _cursor(21),
          ),
          isA<Success<AiMessagePage>>(),
        );
        expect(
          transport.requests.last.path,
          '/v1/me/conversations/$_conversation/messages?before=${_cursor(21)}',
        );
        expect(
          await repository.deleteConversation(
            token: 'current-token',
            abort: AiAbortSignal(),
            conversationId: _conversation,
          ),
          isA<Success<void>>(),
        );
        expect(transport.requests.last.method, 'DELETE');
        expect(
          transport.requests.last.path,
          '/v1/me/conversations/$_conversation',
        );
        for (final request in transport.requests) {
          expect(request.body, isNull);
          expect(request.headers.containsKey('Content-Type'), isFalse);
        }
        for (final request in transport.requests.skip(1)) {
          expect(request.headers['Authorization'], 'Bearer current-token');
          expect(request.headers.containsKey('AI-Operation-Key'), isFalse);
        }
      },
    );
  });

  group('strict DTO and local input validation', () {
    test(
      'invalid inputs never dispatch; token cannot inject headers',
      () async {
        final transport = _Transport(
          (_) async => throw StateError('must not send'),
        );
        final repository = AiWireRepository(transport);
        for (final token in ['', ' ', 'token\nheader', 'token\u0000']) {
          expect(
            _failure(
              await repository.prepare(token: token, abort: AiAbortSignal()),
            ),
            AppFailureKind.authRequired,
          );
        }
        for (final id in [
          'short',
          _conversation.toUpperCase().replaceFirst('1', 'A'),
          _conversation.replaceFirst('-4111-', '-1111-'),
        ]) {
          expect(
            _failure(
              await repository.prepare(
                token: _token,
                abort: AiAbortSignal(),
                conversationId: id,
              ),
            ),
            AppFailureKind.requestInvalid,
          );
        }
        expect(
          _failure(
            await repository.prepare(
              token: _token,
              abort: AiAbortSignal(),
              userMessageId: _user,
            ),
          ),
          AppFailureKind.requestInvalid,
        );
        for (final text in [
          '',
          ' \n\t',
          List.filled(2401, '🌱').join(),
          String.fromCharCode(0xd800),
          String.fromCharCode(0xdc00),
        ]) {
          expect(
            _failure(
              await repository.execute(
                token: _token,
                abort: AiAbortSignal(),
                ticket: _ticket,
                text: text,
              ),
            ),
            AppFailureKind.aiInputInvalid,
          );
        }
        expect(transport.requests, isEmpty);
      },
    );

    test(
      '2400 Unicode scalars accepted and original content not trimmed',
      () async {
        final text = List.filled(2400, '🌱').join();
        final transport = _Transport((_) async => _json(_reply(text: text)));
        expect(
          await AiWireRepository(transport).execute(
            token: _token,
            abort: AiAbortSignal(),
            ticket: _ticket,
            text: text,
          ),
          isA<Success<AiReply>>(),
        );
        expect(jsonDecode(transport.requests.single.body!)['text'], text);
        expect(
          utf8.encode(transport.requests.single.body!).length,
          lessThanOrEqualTo(16384),
        );
      },
    );

    test('ticket rejects unknown fields, invalid UUID, noncanonical keys and dates', () async {
      final cases = <Map<String, Object?>>[
        {..._ticketJson(), 'sourceId': 'private'},
        {
          ..._ticketJson(),
          'operationId': _operation.replaceFirst('-4222-', '-1222-'),
        },
        {..._ticketJson(), 'operationKey': '$_key='},
        {..._ticketJson(), 'operationKey': 'short'},
        {..._ticketJson(), 'operationKey': '${_key.substring(0, 42)}B'},
        {..._ticketJson(), 'preparationExpiresAt': '2026-02-30T12:00:00Z'},
        {..._ticketJson(), 'preparationExpiresAt': '2026-10-12T12:00:00+00:00'},
        {..._ticketJson(), 'conversationId': _other},
      ];
      for (final body in cases) {
        final transport = _Transport((_) async => _json(body, 201));
        expect(
          _failure(
            await AiWireRepository(transport).prepare(
              token: _token,
              abort: AiAbortSignal(),
              conversationId: _conversation,
            ),
          ),
          AppFailureKind.unexpected,
        );
      }
    });

    test(
      'execute rejects identity mismatch, missing content and message metadata',
      () async {
        final cases = <Map<String, Object?>>[
          {..._reply(), 'operationId': _other},
          {..._reply(), 'conversationId': _other},
          {..._reply(), 'userMessage': _message(text: 'changed')},
          {
            ..._reply(),
            'assistantMessage': _message(assistant: true, unavailable: true),
          },
          {
            ..._reply(),
            'assistantMessage': {
              ..._message(assistant: true),
              'personaId': 'private',
            },
          },
          {
            ..._reply(),
            'assistantMessage': {..._message(assistant: true), 'sequence': 1},
          },
          {
            ..._reply(),
            'assistantMessage': {
              ..._message(assistant: true),
              'messageId': _user,
            },
          },
          {
            ..._reply(),
            'assistantMessage': {..._message(assistant: true), 'text': null},
          },
        ];
        for (final body in cases) {
          final transport = _Transport((_) async => _json(body));
          expect(
            _failure(
              await AiWireRepository(transport).execute(
                token: _token,
                abort: AiAbortSignal(),
                ticket: _ticket,
                text: 'message',
              ),
            ),
            AppFailureKind.unexpected,
          );
        }
      },
    );

    test('all five readback states enforce message combinations and tombstone rules', () async {
      final cases = <(String, AiOutcomeState, Map<String, Object?>)>[
        ('active', AiOutcomeState.active, {}),
        ('no_effect', AiOutcomeState.noEffect, {}),
        ('unresolved', AiOutcomeState.unresolved, {}),
        ('user_saved', AiOutcomeState.userSaved, {'userMessage': _message()}),
        (
          'assistant_saved',
          AiOutcomeState.assistantSaved,
          {
            'userMessage': _message(),
            'assistantMessage': _message(assistant: true, unavailable: true),
          },
        ),
      ];
      for (final (state, expected, messages) in cases) {
        final transport = _Transport(
          (_) async =>
              _json({'operationId': _operation, 'state': state, ...messages}),
        );
        final result = await AiWireRepository(transport).readOperation(
          token: _token,
          abort: AiAbortSignal(),
          conversationId: _conversation,
          operationId: _operation,
        );
        final readback = (result as Success<AiReadback>).value;
        expect(readback.state, expected);
        expect(readback.assistantMessage?.text, isNull);
      }
      for (final body in <Map<String, Object?>>[
        {'state': 'active', 'userMessage': _message()},
        {'state': 'no_effect', 'assistantMessage': null},
        {'state': 'unresolved', 'userMessage': _message()},
        {'state': 'user_saved'},
        {
          'state': 'user_saved',
          'userMessage': _message(),
          'assistantMessage': _message(assistant: true),
        },
        {'state': 'assistant_saved', 'userMessage': _message()},
        {'state': 'user_saved', 'userMessage': _message(unavailable: true)},
        {
          'state': 'assistant_saved',
          'userMessage': _message(),
          'assistantMessage': {
            ..._message(assistant: true, unavailable: true),
            'text': 'removed',
          },
        },
        {'state': 'unknown'},
      ]) {
        final transport = _Transport(
          (_) async => _json({'operationId': _operation, ...body}),
        );
        expect(
          _failure(
            await AiWireRepository(transport).readOperation(
              token: _token,
              abort: AiAbortSignal(),
              conversationId: _conversation,
              operationId: _operation,
            ),
          ),
          AppFailureKind.unexpected,
        );
      }
    });

    test('page retains ascending sequence and immutable tombstones', () async {
      final transport = _Transport(
        (_) async => _json({
          'messages': [
            _message(sequence: 19),
            _message(assistant: true, unavailable: true, sequence: 20),
          ],
          'nextCursor': _cursor(19),
        }),
      );
      final result = await AiWireRepository(transport).readMessages(
        token: _token,
        abort: AiAbortSignal(),
        conversationId: _conversation,
        before: _cursor(21),
      );
      final page = (result as Success<AiMessagePage>).value;
      expect(page.messages.map((message) => message.sequence), [19, 20]);
      expect(page.messages.last.availability, AiAvailability.unavailable);
      expect(page.messages.last.text, isNull);
      expect(page.nextCursor, _cursor(19));
      expect(() => page.messages.clear(), throwsUnsupportedError);
    });

    test(
      'cursors reject noncanonical encodings, unknown keys and unsafe values',
      () async {
        String encode(String value) =>
            base64Url.encode(utf8.encode(value)).replaceAll('=', '');
        final cursors = [
          '',
          '${_cursor(2)}=',
          'a' * 129,
          'not+a+cursor',
          encode('{"v":1,"before":0}'),
          encode('{"v":1,"before":-1}'),
          encode('{"v":1,"before":9007199254740992}'),
          encode('{"v":1,"before":2.0}'),
          encode('{"v":2,"before":2}'),
          encode('{"v":1,"before":2,"owner":"another"}'),
          encode('{ "v":1,"before":2}'),
          base64Url.encode([0xff]).replaceAll('=', ''),
        ];
        final transport = _Transport(
          (_) async => _json({'messages': <Object>[]}),
        );
        final repository = AiWireRepository(transport);
        for (final cursor in cursors) {
          expect(
            _failure(
              await repository.readMessages(
                token: _token,
                abort: AiAbortSignal(),
                conversationId: _conversation,
                before: cursor,
              ),
            ),
            AppFailureKind.requestInvalid,
          );
        }
        expect(transport.requests, isEmpty);
      },
    );

    test('page rejects duplicates, unordered rows, boundary violations and excessive rows', () async {
      final bodies = [
        {
          'messages': [_message(), _message()],
        },
        {
          'messages': [
            _message(sequence: 2),
            _message(assistant: true, sequence: 1),
          ],
        },
        {
          'messages': [_message(sequence: 21)],
        },
        {'messages': List.filled(21, _message())},
        {
          'messages': [_message()],
          'nextCursor': 'invalid',
        },
        {
          'messages': [_message()],
          'sourceIds': <Object>[],
        },
        {
          'messages': [
            {..._message(), 'sequence': 1.5},
          ],
        },
        {
          'messages': [
            {..._message(), 'role': 'system'},
          ],
        },
      ];
      for (final body in bodies) {
        final transport = _Transport((_) async => _json(body));
        expect(
          _failure(
            await AiWireRepository(transport).readMessages(
              token: _token,
              abort: AiAbortSignal(),
              conversationId: _conversation,
              before: _cursor(21),
            ),
          ),
          AppFailureKind.unexpected,
        );
      }
    });

    test('exact status and empty delete body required; no 202 generation continuation', () async {
      final wrongPrepare = _Transport((_) async => _json(_ticketJson(), 200));
      expect(
        _failure(
          await AiWireRepository(wrongPrepare)
              .prepare(token: _token, abort: AiAbortSignal()),
        ),
        AppFailureKind.unexpected,
      );
      final accepted = _Transport((_) async => _json(_reply(), 202));
      expect(
        _failure(
          await AiWireRepository(accepted).execute(
            token: _token,
            abort: AiAbortSignal(),
            ticket: _ticket,
            text: 'message',
          ),
        ),
        AppFailureKind.unexpected,
      );
      for (final response in [
        const AiWireResponse(statusCode: 204, body: '{}'),
        const AiWireResponse(statusCode: 200, body: ''),
      ]) {
        final transport = _Transport((_) async => response);
        expect(
          _failure(
            await AiWireRepository(transport).deleteConversation(
              token: _token,
              abort: AiAbortSignal(),
              conversationId: _conversation,
            ),
          ),
          AppFailureKind.unexpected,
        );
      }
      final cancel = _Transport(
        (_) async => _json({'operationId': _operation, 'state': 'cancelled'}),
      );
      expect(
        _failure(
          await AiWireRepository(cancel)
              .cancel(token: _token, abort: AiAbortSignal(), ticket: _ticket),
        ),
        AppFailureKind.unexpected,
      );
    });
  });

  group('exact error mapping', () {
    const mappings = <String, (int, AppFailureKind)>{
      'REQUEST_INVALID': (400, AppFailureKind.requestInvalid),
      'AUTH_REQUIRED': (401, AppFailureKind.authRequired),
      'AUTH_FORBIDDEN': (403, AppFailureKind.authForbidden),
      'ONBOARDING_REQUIRED': (409, AppFailureKind.onboardingRequired),
      'AI_CONTEXT_NOT_PERMITTED': (403, AppFailureKind.aiContextNotPermitted),
      'CONVERSATION_UNAVAILABLE': (404, AppFailureKind.conversationUnavailable),
      'AI_OPERATION_UNAVAILABLE': (404, AppFailureKind.aiOperationUnavailable),
      'AI_OPERATION_CONFLICT': (409, AppFailureKind.aiOperationConflict),
      'REQUEST_TOO_LARGE': (413, AppFailureKind.requestTooLarge),
      'AI_INPUT_INVALID': (422, AppFailureKind.aiInputInvalid),
      'AI_BUSY': (429, AppFailureKind.aiBusy),
      'AI_UNAVAILABLE': (503, AppFailureKind.aiUnavailable),
      'AI_REPLY_REJECTED': (502, AppFailureKind.aiReplyRejected),
      'AI_AUTHORITY_CHANGED': (409, AppFailureKind.aiAuthorityChanged),
      'AI_OUTCOME_UNRESOLVED': (503, AppFailureKind.aiOutcomeUnresolved),
    };
    for (final entry in mappings.entries) {
      test(
        '${entry.key} requires status ${entry.value.$1} and no server copy exposure',
        () async {
          final body = {
            'error': {'code': entry.key, 'message': 'untrusted server details'},
            'requestId': 'req-1',
          };
          final transport = _Transport(
            (_) async => _json(body, entry.value.$1),
          );
          final result = await AiWireRepository(transport)
              .prepare(token: _token, abort: AiAbortSignal());
          final failure = (result as Failure<AiTicket>).failure;
          expect(failure.kind, entry.value.$2);
          expect(failure.requestId, 'req-1');
          expect(failure.message, isNot(contains('untrusted')));
          final mismatch = _Transport((_) async => _json(body, 418));
          expect(
            _failure(
              await AiWireRepository(mismatch)
                  .prepare(token: _token, abort: AiAbortSignal()),
            ),
            AppFailureKind.unexpected,
          );
        },
      );
    }

    test('unknown code and extra error fields are rejected', () async {
      for (final body in [
        {
          'error': {'code': 'OTHER', 'message': 'detail'},
          'requestId': 'req',
        },
        {
          'error': {
            'code': 'AI_UNAVAILABLE',
            'message': 'detail',
            'sourceId': 'secret',
          },
          'requestId': 'req',
        },
        {
          'error': {'code': 'AI_UNAVAILABLE', 'message': 'detail'},
          'requestId': 'req',
          'debug': 'secret',
        },
        {
          'error': {
            'code': 'AI_UNAVAILABLE',
            'message': 'detail',
            'requestId': 'req',
          },
        },
      ]) {
        final transport = _Transport((_) async => _json(body, 503));
        expect(
          _failure(
            await AiWireRepository(transport)
                .prepare(token: _token, abort: AiAbortSignal()),
          ),
          AppFailureKind.unexpected,
        );
      }
    });
  });

  group('request scoped abort and unknown transport results', () {
    test(
      'pre-aborted signal never dispatches and repeated abort is safe',
      () async {
        final transport = _Transport((_) async => _json(_ticketJson(), 201));
        final signal = AiAbortSignal()
          ..abort()
          ..abort();
        expect(
          _failure(
            await AiWireRepository(transport)
                .prepare(token: _token, abort: signal),
          ),
          AppFailureKind.aiOutcomeUnresolved,
        );
        expect(signal.isAborted, isTrue);
        await signal.whenAborted;
        expect(transport.requests, isEmpty);
      },
    );

    test('abort during incomplete body settles unknown and drops late success without retry', () async {
      final pendingBody = Completer<AiWireResponse>();
      final transport = _Transport((_) => pendingBody.future);
      final signal = AiAbortSignal();
      final pending = AiWireRepository(
        transport,
      ).execute(token: _token, abort: signal, ticket: _ticket, text: 'message');
      expect(transport.requests, hasLength(1));
      signal.abort();
      expect(_failure(await pending), AppFailureKind.aiOutcomeUnresolved);
      pendingBody.complete(_json(_reply()));
      await Future<void>.delayed(Duration.zero);
      expect(transport.requests, hasLength(1));
    });

    test(
      'abort does not poison shared transport; late error is consumed',
      () async {
        final first = Completer<AiWireResponse>();
        final second = Completer<AiWireResponse>();
        var calls = 0;
        final transport = _Transport(
          (_) => calls++ == 0 ? first.future : second.future,
        );
        final repository = AiWireRepository(transport);
        final firstSignal = AiAbortSignal();
        final secondSignal = AiAbortSignal();
        final firstRequest = repository.prepare(
          token: _token,
          abort: firstSignal,
        );
        final secondRequest = repository.prepare(
          token: _token,
          abort: secondSignal,
        );
        firstSignal.abort();
        expect(
          _failure(await firstRequest),
          AppFailureKind.aiOutcomeUnresolved,
        );
        expect(secondSignal.isAborted, isFalse);
        second.complete(_json(_ticketJson(), 201));
        expect(await secondRequest, isA<Success<AiTicket>>());
        first.completeError(StateError('late body error'));
        await Future<void>.delayed(Duration.zero);
        expect(transport.requests, hasLength(2));
      },
    );

    test(
      'transport failure proves neither absence nor success and never retries',
      () async {
        final transport = _Transport(
          (_) async => throw StateError('connection closed'),
        );
        expect(
          _failure(
            await AiWireRepository(transport).execute(
              token: _token,
              abort: AiAbortSignal(),
              ticket: _ticket,
              text: 'message',
            ),
          ),
          AppFailureKind.aiOutcomeUnresolved,
        );
        expect(transport.requests, hasLength(1));
      },
    );
  });
}
