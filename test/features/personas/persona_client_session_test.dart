import 'dart:async';
import 'dart:convert';

import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/personas/data/backend_persona_repository.dart';
import 'package:enmori/features/personas/domain/persona.dart';
import 'package:enmori/features/personas/domain/persona_session.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

const key = '11111111-1111-4111-8111-111111111111';
const fields = PersonaFields(
  displayName: 'Guide',
  tone: PersonaTone.neutral,
  responseLength: PersonaResponseLength.balanced,
  formatStyle: PersonaFormatStyle.plain,
);
final row = <String, Object?>{
  'personaId': 'a' * 64,
  'displayName': 'Guide',
  'tone': 'neutral',
  'responseLength': 'balanced',
  'formatStyle': 'plain',
  'revision': 1,
  'createdAt': '2026-10-09T00:00:00.000Z',
  'updatedAt': '2026-10-09T00:00:00.000Z',
};
Map<String, Object?> get saved => {'persona': row, 'stateRevision': 1};
http.StreamedResponse reply(int status, Object body) => http.StreamedResponse(
  Stream.value(utf8.encode(jsonEncode(body))),
  status,
  headers: {'content-type': 'application/json'},
);

void main() {
  for (final delayedBody in [false, true]) {
    test('real client/session: timeout -> recovery 412 -> original late '
        '201 (${delayedBody ? 'body' : 'headers'})', () async {
      final transport = _Transport(delayedBody: delayedBody);
      final client = BackendApiClient(
        Uri.parse('https://example.test'),
        () async => const Success('synthetic-token'),
        httpClient: transport,
        operationTimeout: const Duration(milliseconds: 40),
      );
      final session = PersonaSession(
        BackendPersonaRepository(client),
        newKey: () => key,
      );
      addTearDown(() {
        session.dispose();
        client.close();
      });
      await session.load();
      expect(await session.create(fields), isFalse);
      expect(
        session.state.pendingCreate!.status,
        PersonaCreateStatus.uncertain,
      );
      await session.retryCreate();
      await Future<void>.delayed(Duration.zero);
      expect(
        session.state.pendingCreate!.status,
        PersonaCreateStatus.recoveryClosed,
      );
      expect(session.state.confirmedWriteCount, 0);
      expect(transport.posts.length, 2);
      expect(transport.posts[0].headers['Idempotency-Key'], key);
      expect(transport.posts[0].body, transport.posts[1].body);
      final confirmed = session.changes.firstWhere(
        (s) => s.isCurrent && s.pendingCreate == null,
      );
      transport.release();
      await confirmed.timeout(const Duration(seconds: 2));
      expect(session.state.lastConfirmedCreateKey, key);
      expect(session.state.confirmedWriteCount, 1);
      expect(
        session.state.collection!.items.single.fields.displayName,
        'Guide',
      );
      expect(
        transport.gets,
        2,
        reason: 'Independent reread after commit proof',
      );
    });
  }

  test('session end during real token wait prevents dispatch', () async {
    final token = Completer<Result<String>>();
    final transport = _Transport(delayedBody: false);
    var tokens = 0;
    final client = BackendApiClient(
      Uri.parse('https://example.test'),
      () => ++tokens == 1
          ? Future.value(const Success('synthetic'))
          : token.future,
      httpClient: transport,
      operationTimeout: const Duration(milliseconds: 60),
    );
    final session = PersonaSession(
      BackendPersonaRepository(client),
      newKey: () => key,
    );
    addTearDown(() {
      session.dispose();
      client.close();
    });
    await session.load();
    final creating = session.create(fields);
    session.dispose();
    token.complete(const Success('old-session-token'));
    expect(await creating, isFalse);
    expect(transport.posts, isEmpty);
  });

  test(
    'real valid immediate success gives the initiating page a success result',
    () async {
      final transport = _Transport(delayedBody: false)..immediate = true;
      final client = BackendApiClient(
        Uri.parse('https://example.test'),
        () async => const Success('synthetic'),
        httpClient: transport,
      );
      final session = PersonaSession(
        BackendPersonaRepository(client),
        newKey: () => key,
      );
      addTearDown(() {
        session.dispose();
        client.close();
      });
      await session.load();
      expect(await session.create(fields), isTrue);
      await Future<void>.delayed(Duration.zero);
      expect(session.state.pendingCreate, isNull);
      expect(session.state.confirmedWriteCount, 1);
    },
  );
}

final class _Transport extends http.BaseClient {
  _Transport({required this.delayedBody});
  final bool delayedBody;
  bool immediate = false;
  bool committed = false;
  int gets = 0;
  final posts = <http.Request>[];
  final headers = Completer<http.StreamedResponse>();
  final body = StreamController<List<int>>();
  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    if (request.method == 'GET') {
      gets++;
      return reply(200, {
        'personas': {
          'items': committed ? [row] : [],
          'stateRevision': committed ? 1 : 0,
        },
      });
    }
    posts.add(request as http.Request);
    if (immediate) {
      committed = true;
      return reply(201, saved);
    }
    if (posts.length == 1) {
      return delayedBody
          ? http.StreamedResponse(
              body.stream,
              201,
              headers: {'content-type': 'application/json'},
            )
          : headers.future;
    }
    return reply(412, {
      'error': {
        'code': 'PERSONA_REVISION_PRECONDITION_FAILED',
        'message': 'Your Personas changed. Reload them before trying again.',
        'requestId': 'synthetic-request',
      },
    });
  }

  void release() {
    committed = true;
    if (delayedBody) {
      body.add(utf8.encode(jsonEncode(saved)));
      unawaited(body.close());
    } else {
      headers.complete(reply(201, saved));
    }
  }
}
