import 'dart:async';
import 'dart:convert';

import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/personas/data/backend_persona_repository.dart';
import 'package:enmori/features/personas/domain/persona.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

final _id = 'a' * 64;
final _otherId = 'b' * 64;
const _fields = PersonaFields(
  displayName: 'Warm guide',
  tone: PersonaTone.warm,
  responseLength: PersonaResponseLength.balanced,
  formatStyle: PersonaFormatStyle.plain,
);
const _key = '12345678-1234-4234-8234-123456789abc';

void main() {
  group('Persona values', () {
    test('uses scalar length and exact ECMAScript trim without composition changes', () {
      expect(PersonaFields.nameValidationMessage('😀' * 50), isNull);
      expect(PersonaFields.nameValidationMessage('😀' * 51), isNotNull);
      expect(PersonaFields.nameValidationMessage(''), isNotNull);
      expect(PersonaFields.nameValidationMessage('  '), isNotNull);
      expect(normalizePersonaName('\ufeff \tName\u3000'), 'Name');
      expect(normalizePersonaName('a  e\u0301'), 'a  e\u0301');
      for (final name in [
        '\u0085Name',
        'a\u200db',
        'a\u2028b',
        'a\u2029b',
        'a\u0000b',
        '\ud800',
        '\udc00',
      ]) {
        expect(PersonaFields.nameValidationMessage(name), isNotNull);
      }
      expect(_fields, _fields.normalized);
      expect(isPersonaId('$_id\n'), isFalse);
    });
  });

  group('Persona DTO and wire operations', () {
    test(
      'full expression fields round trip through create, read and edit',
      () async {
        const fields = PersonaFields(
          displayName: 'Warm guide',
          tone: PersonaTone.warm,
          responseLength: PersonaResponseLength.balanced,
          formatStyle: PersonaFormatStyle.plain,
          relationship: 'Companion',
          shortIntroduction: 'Hello',
          description: 'A study guide',
          personality: 'Calm',
          communicationStyle: 'Ask a follow-up',
          interests: 'My custom interest',
          extraInstructions: 'Use examples\nKeep my pace.',
        );
        final requests = <http.Request>[];
        final repository = _repo((request) async {
          requests.add(request);
          return _response({
            'persona': {..._persona(), ...fields.expressionFields},
            'stateRevision': 1,
          }, request.method == 'POST' ? 201 : 200);
        });
        final attempt = repository.create(
          _command(fields: fields),
          isEligible: () => true,
        );
        expect(
          (await attempt.foreground as Success<PersonaMutation>)
              .value
              .persona
              .fields,
          fields,
        );
        expect(
          (await repository.readOne(
            _id,
          ) as Success<PersonaMutation>).value.persona.fields,
          fields,
        );
        expect(
          (await repository.edit(
            _id,
            fields: fields,
            expectedRevision: 1,
            expectedStateRevision: 1,
          ) as Success<PersonaMutation>).value.persona.fields,
          fields,
        );
        for (final request in [requests.first, requests.last]) {
          expect(
            jsonDecode(request.body),
            containsPair('interests', 'My custom interest'),
          );
          expect(
            jsonDecode(request.body),
            containsPair('extraInstructions', 'Use examples\nKeep my pace.'),
          );
        }
        expect(fields.normalized, fields);
        expect(fields.hashCode, fields.normalized.hashCode);
        expect(fields, isNot(_fields));
      },
    );

    test('legacy missing free fields safely default empty; malformed values fail closed', () async {
      final legacy = await _repo((_) async => _response(_mutation()))
          .readOne(_id);
      final fields = (legacy as Success<PersonaMutation>).value.persona.fields;
      expect(fields.expressionFields.values, everyElement(''));
      for (final key in fields.expressionFields.keys) {
        for (final invalid in <Object?>[
          null,
          42,
          ['unapproved'],
          '\ud800',
        ]) {
          final repository = _repo(
            (_) async => _response({
              'persona': {..._persona(), key: invalid},
              'stateRevision': 1,
            }),
          );
          expect(
            await repository.readOne(_id),
            isA<Failure<PersonaMutation>>(),
            reason: key,
          );
        }
      }
    });

    test(
      'all six exact operations, revisions, normalized fields and JSON DELETE',
      () async {
        final requests = <http.Request>[];
        final repository = _repo((request) async {
          requests.add(request);
          if (request.method == 'DELETE') return http.Response('', 204);
          if (request.url.path == '/v1/me/persona-selection') {
            return _response(_set(active: _id));
          }
          if (request.method == 'GET' &&
              request.url.path == '/v1/me/personas') {
            return _response(_set());
          }
          return _response(_mutation(), request.method == 'POST' ? 201 : 200);
        });
        expect(await repository.readAll(), isA<Success<PersonaCollection>>());
        expect(await repository.readOne(_id), isA<Success<PersonaMutation>>());
        final attempt = repository.create(_command(), isEligible: () => true);
        expect(await attempt.foreground, isA<Success<PersonaMutation>>());
        expect(await attempt.completion, isA<Success<PersonaMutation>>());
        expect(attempt.dispatched, isTrue);
        expect(
          await repository.edit(
            _id,
            fields: _fields,
            expectedRevision: 1,
            expectedStateRevision: 1,
          ),
          isA<Success<PersonaMutation>>(),
        );
        expect(
          await repository.activate(
            _id,
            expectedRevision: 1,
            expectedStateRevision: 1,
          ),
          isA<Success<PersonaCollection>>(),
        );
        expect(
          await repository.delete(
            _id,
            expectedRevision: 1,
            expectedStateRevision: 1,
          ),
          isA<Success<void>>(),
        );
        expect(requests.map((r) => r.method), [
          'GET',
          'GET',
          'POST',
          'PUT',
          'PUT',
          'DELETE',
        ]);
        expect(requests.every((r) => r.url.query.isEmpty), isTrue);
        expect(requests[2].headers['Idempotency-Key'], _key);
        expect(jsonDecode(requests[2].body), {
          'displayName': 'Warm guide',
          'tone': 'warm',
          'responseLength': 'balanced',
          'formatStyle': 'plain',
          ..._fields.expressionFields,
          'expectedStateRevision': 0,
        });
        expect(jsonDecode(requests.last.body), {
          'expectedRevision': 1,
          'expectedStateRevision': 1,
        });
        expect(
          requests.last.headers['Content-Type'],
          contains('application/json'),
        );
      },
    );

    test(
      'accepts empty set with omitted Active and duplicate display names',
      () async {
        final empty = _repo(
          (_) async => _response({
            'personas': {'items': [], 'stateRevision': 0},
          }),
        );
        final result =
            (await empty.readAll() as Success<PersonaCollection>).value;
        expect(result.items, isEmpty);
        expect(result.activePersona, isNull);
        final duplicates = _repo(
          (_) async => _response({
            'personas': {
              'items': [_persona(), _persona(id: _otherId)],
              'stateRevision': 2,
            },
          }),
        );
        final parsed =
            (await duplicates.readAll() as Success<PersonaCollection>).value;
        expect(parsed.items.length, 2);
        expect(() => parsed.items.clear(), throwsUnsupportedError);
      },
    );

    test(
      'rejects malformed coherent-set envelopes instead of inventing empty',
      () async {
        final invalid = <Object>[
          {},
          {..._set(), 'owner': 'injected'},
          {
            'personas': {
              'items': [],
              'stateRevision': 0,
              'activePersonaId': null,
            },
          },
          {
            'personas': {
              'items': [],
              'stateRevision': 0,
              'activePersonaId': _id,
            },
          },
          {
            'personas': {
              'items': [_persona(), _persona()],
              'stateRevision': 2,
            },
          },
          {
            'personas': {
              'items': [_persona(id: _otherId), _persona()],
              'stateRevision': 2,
            },
          },
          {
            'personas': {
              'items': List.filled(6, _persona()),
              'stateRevision': 6,
            },
          },
          {
            'personas': {'items': [], 'stateRevision': 1.0},
          },
          {
            'personas': {'items': [], 'stateRevision': -1},
          },
          {
            'personas': {
              'items': [],
              'stateRevision': personaMaximumRevision + 1,
            },
          },
          {
            'personas': {
              'items': [],
              'stateRevision': 0,
              'cursor': 'unapproved',
            },
          },
        ];
        for (final body in invalid) {
          expect(
            await _repo((_) async => _response(body)).readAll(),
            isA<Failure<PersonaCollection>>(),
          );
        }
      },
    );

    test(
      'strict view fields, enums, IDs, real UTC dates and safe revisions',
      () async {
        final changes = <Map<String, Object?>>[
          {'personaId': _id.toUpperCase()},
          {'personaId': '$_id\n'},
          {'owner': 'injected'},
          {'displayName': '  Warm guide '},
          {'displayName': 'a\u200db'},
          {'displayName': '\ud800'},
          {'tone': 'cheerful'},
          {'formatStyle': 'markdown'},
          {'responseLength': null},
          {'createdAt': '2026-02-30T00:00:00.000Z'},
          {'updatedAt': '2026-10-09T00:00:00Z'},
          {'updatedAt': '2026-10-09T00:00:00.000+00:00'},
          {'revision': 0},
          {'revision': 1.5},
          {'revision': personaMaximumRevision + 1},
        ];
        for (final change in changes) {
          final response = {
            'persona': {..._persona(), ...change},
            'stateRevision': 1,
          };
          expect(
            await _repo((_) async => _response(response)).readOne(_id),
            isA<Failure<PersonaMutation>>(),
            reason: change.keys.join(','),
          );
        }
        expect(
          await _repo(
            (_) async => _response({
              'persona': _persona(id: _otherId),
              'stateRevision': 1,
            }),
          ).readOne(_id),
          isA<Failure<PersonaMutation>>(),
        );
      },
    );

    test(
      'requires operation-specific success statuses and truly empty DELETE 204',
      () async {
        for (final status in [201, 202, 204]) {
          expect(
            await _repo((_) async => _response(_set(), status)).readAll(),
            isA<Failure<PersonaCollection>>(),
          );
        }
        for (final status in [202, 204]) {
          final attempt = _repo((_) async => _response(_mutation(), status))
              .create(_command(), isEligible: () => true);
          expect(await attempt.completion, isA<Failure<PersonaMutation>>());
        }
        for (final response in [
          http.Response('', 200),
          http.Response('{}', 204),
          http.Response(' ', 204),
        ]) {
          expect(
            await _repo((_) async => response)
                .delete(_id, expectedRevision: 1, expectedStateRevision: 1),
            isA<Failure<void>>(),
          );
        }
      },
    );

    test(
      'only valid exact create response proves a committed command',
      () async {
        final invalid = [
          {
            'persona': {..._persona(), 'displayName': 'Other input'},
            'stateRevision': 1,
          },
          {
            'persona': {..._persona(), 'revision': 2},
            'stateRevision': 1,
          },
          {'persona': _persona(), 'stateRevision': 2},
          {'persona': _persona(), 'stateRevision': 1, 'extra': true},
        ];
        for (final response in invalid) {
          final attempt = _repo((_) async => _response(response, 201))
              .create(_command(), isEligible: () => true);
          expect(await attempt.completion, isA<Failure<PersonaMutation>>());
        }
        final replay = _repo((_) async => _response(_mutation(), 200))
            .create(_command(), isEligible: () => true);
        expect(await replay.completion, isA<Success<PersonaMutation>>());
      },
    );

    test(
      'invalid requests are not dispatched and name normalizes once',
      () async {
        var sends = 0;
        final repository = _repo((request) async {
          sends++;
          return _response(_mutation(), 201);
        });
        expect(
          await repository.readOne('not-an-id'),
          isA<Failure<PersonaMutation>>(),
        );
        final invalid = repository.create(
          _command(key: '$_key\n'),
          isEligible: () => true,
        );
        expect(
          (await invalid.completion as Failure<PersonaMutation>).failure.kind,
          AppFailureKind.idempotencyKeyInvalid,
        );
        expect(invalid.dispatched, isFalse);
        expect(
          await repository.delete(
            _id,
            expectedRevision: 0,
            expectedStateRevision: 1,
          ),
          isA<Failure<void>>(),
        );
        expect(sends, 0);
        final spaced = PersonaFields(
          displayName: ' \tWarm guide\ufeff',
          tone: _fields.tone,
          responseLength: _fields.responseLength,
          formatStyle: _fields.formatStyle,
        );
        expect(
          await repository
              .create(_command(fields: spaced), isEligible: () => true)
              .completion,
          isA<Success<PersonaMutation>>(),
        );
      },
    );

    test(
      'maps the five typed failures and rejects status/code mismatch',
      () async {
        final cases = <(String, int, AppFailureKind)>[
          ('PERSONA_INVALID', 422, AppFailureKind.personaInvalid),
          ('PERSONA_UNAVAILABLE', 404, AppFailureKind.personaUnavailable),
          ('PERSONA_LIMIT_REACHED', 409, AppFailureKind.personaLimitReached),
          (
            'PERSONA_COMMAND_CONFLICT',
            409,
            AppFailureKind.personaCommandConflict,
          ),
          (
            'PERSONA_REVISION_PRECONDITION_FAILED',
            412,
            AppFailureKind.personaRevisionPreconditionFailed,
          ),
        ];
        for (final (code, status, kind) in cases) {
          final result = await _repo(
            (_) async => _error(code, status),
          ).readOne(_id) as Failure<PersonaMutation>;
          expect(result.failure.kind, kind);
          expect(result.failure.message, isNot('private remote content'));
          final mismatch = await _repo(
            (_) async => _error(code, 500),
          ).readOne(_id) as Failure<PersonaMutation>;
          expect(mismatch.failure.kind, AppFailureKind.serviceUnavailable);
        }
      },
    );
  });

  group('real BackendApiClient create foreground and terminal observation', () {
    test('late headers give one completion after foreground timeout', () async {
      final headers = Completer<http.StreamedResponse>();
      final transport = _ControlledClient((_) => headers.future);
      final repository = BackendPersonaRepository(_client(transport));
      final attempt = repository.create(_command(), isEligible: () => true);
      var foregroundCount = 0;
      var terminalCount = 0;
      unawaited(
        attempt.foreground.then((_) {
          foregroundCount++;
        }),
      );
      unawaited(
        attempt.completion.then((_) {
          terminalCount++;
        }),
      );
      expect(await attempt.foreground, isA<Failure<PersonaMutation>>());
      expect(attempt.dispatched, isTrue);
      expect(terminalCount, 0);
      headers.complete(_streamResponse(_mutation(), 201));
      expect(await attempt.completion, isA<Success<PersonaMutation>>());
      await Future<void>.delayed(Duration.zero);
      expect(foregroundCount, 1);
      expect(terminalCount, 1);
      expect(transport.sends, 1);
      expect(transport.closed, isFalse);
    });

    test(
      'headers and a partial body never prove success before full late body',
      () async {
        final body = StreamController<List<int>>();
        final transport = _ControlledClient(
          (_) async => http.StreamedResponse(body.stream, 201),
        );
        final attempt = BackendPersonaRepository(_client(transport))
            .create(_command(), isEligible: () => true);
        final bytes = utf8.encode(jsonEncode(_mutation()));
        body.add(bytes.sublist(0, 20));
        var terminal = false;
        unawaited(
          attempt.completion.then((_) {
            terminal = true;
          }),
        );
        expect(await attempt.foreground, isA<Failure<PersonaMutation>>());
        expect(terminal, isFalse);
        body.add(bytes.sublist(20));
        await body.close();
        expect(await attempt.completion, isA<Success<PersonaMutation>>());
      },
    );

    test('late token cannot dispatch after the one original budget', () async {
      final token = Completer<Result<String>>();
      final transport = _ControlledClient(
        (_) async => _streamResponse(_mutation(), 201),
      );
      final attempt = BackendPersonaRepository(
        _client(transport, token: () => token.future),
      ).create(_command(), isEligible: () => true);
      expect(await attempt.foreground, isA<Failure<PersonaMutation>>());
      expect(await attempt.completion, isA<Failure<PersonaMutation>>());
      token.complete(const Success('synthetic-token'));
      await Future<void>.delayed(Duration.zero);
      expect(attempt.dispatched, isFalse);
      expect(transport.sends, 0);
    });

    test(
      'session or command ending while token is pending prevents dispatch',
      () async {
        final token = Completer<Result<String>>();
        var eligible = true;
        final transport = _ControlledClient(
          (_) async => _streamResponse(_mutation(), 201),
        );
        final attempt = BackendPersonaRepository(
          _client(transport, token: () => token.future),
        ).create(_command(), isEligible: () => eligible);
        eligible = false;
        token.complete(const Success('synthetic-token'));
        expect(await attempt.completion, isA<Failure<PersonaMutation>>());
        expect(attempt.dispatched, isFalse);
        expect(transport.sends, 0);
      },
    );

    test(
      'uses original budget across token, headers and delayed complete body',
      () async {
        final token = Completer<Result<String>>();
        final headers = Completer<http.StreamedResponse>();
        final body = StreamController<List<int>>();
        final transport = _ControlledClient((_) => headers.future);
        final attempt = BackendPersonaRepository(
          _client(
            transport,
            token: () => token.future,
            timeout: const Duration(milliseconds: 200),
          ),
        ).create(_command(), isEligible: () => true);
        await Future<void>.delayed(const Duration(milliseconds: 60));
        token.complete(const Success('synthetic-token'));
        await Future<void>.delayed(const Duration(milliseconds: 60));
        headers.complete(http.StreamedResponse(body.stream, 201));
        final result = await attempt.foreground;
        expect(result, isA<Failure<PersonaMutation>>());
        body.add(utf8.encode(jsonEncode(_mutation())));
        await body.close();
        expect(await attempt.completion, isA<Success<PersonaMutation>>());
        expect(transport.sends, 1);
      },
    );

    test(
      'consumes partial, invalid UTF-8 and thrown late transport failures',
      () async {
        for (final bytes in [
          utf8.encode('{"persona":'),
          [0xff, 0xfe],
        ]) {
          final transport = _ControlledClient(
            (_) async => http.StreamedResponse(Stream.value(bytes), 201),
          );
          final attempt = BackendPersonaRepository(_client(transport))
              .create(_command(), isEligible: () => true);
          expect(await attempt.completion, isA<Failure<PersonaMutation>>());
        }
        final headers = Completer<http.StreamedResponse>();
        final attempt = BackendPersonaRepository(
          _client(_ControlledClient((_) => headers.future)),
        ).create(_command(), isEligible: () => true);
        await attempt.foreground;
        headers.completeError(StateError('synthetic transport failure'));
        expect(await attempt.completion, isA<Failure<PersonaMutation>>());
      },
    );
  });
}

PersonaCreateCommand _command({
  PersonaFields fields = _fields,
  String key = _key,
}) => PersonaCreateCommand(
  fields: fields,
  expectedStateRevision: 0,
  idempotencyKey: key,
);
Map<String, Object?> _persona({String? id}) => {
  'personaId': id ?? _id,
  'displayName': 'Warm guide',
  'tone': 'warm',
  'responseLength': 'balanced',
  'formatStyle': 'plain',
  'createdAt': '2026-10-09T00:00:00.000Z',
  'updatedAt': '2026-10-09T00:00:00.000Z',
  'revision': 1,
};
Map<String, Object?> _mutation() => {'persona': _persona(), 'stateRevision': 1};
Map<String, Object?> _set({String? active}) => {
  'personas': {
    'items': [_persona()],
    'stateRevision': 1,
    'activePersonaId': ?active,
  },
};
http.Response _response(Object body, [int status = 200]) => http.Response(
  jsonEncode(body),
  status,
  headers: {'content-type': 'application/json; charset=utf-8'},
);
http.Response _error(String code, int status) => _response({
  'error': {
    'code': code,
    'message': 'private remote content',
    'requestId': 'req_synthetic',
  },
}, status);
http.StreamedResponse _streamResponse(Object body, int status) =>
    http.StreamedResponse(Stream.value(utf8.encode(jsonEncode(body))), status);

BackendPersonaRepository _repo(
  Future<http.Response> Function(http.Request) handler,
) => BackendPersonaRepository(
  _client(MockClient(handler), timeout: const Duration(seconds: 2)),
);
BackendApiClient _client(
  http.Client transport, {
  AuthTokenProvider? token,
  Duration timeout = const Duration(milliseconds: 50),
}) {
  final client = BackendApiClient(
    Uri.parse('https://example.invalid'),
    token ?? () async => const Success('synthetic-token'),
    httpClient: transport,
    operationTimeout: timeout,
  );
  addTearDown(client.close);
  return client;
}

final class _ControlledClient extends http.BaseClient {
  _ControlledClient(this.handler);
  final Future<http.StreamedResponse> Function(http.BaseRequest) handler;
  int sends = 0;
  bool closed = false;
  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) {
    sends++;
    return handler(request);
  }

  @override
  void close() {
    closed = true;
  }
}
