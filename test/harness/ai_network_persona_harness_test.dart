import 'dart:async';
import 'dart:convert';

import 'package:enmori/harness/ai_conversation/ai_network_harness_app.dart';
import 'package:enmori/harness/ai_conversation/synthetic_auth_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

// Real feature pages, controllers and HTTP mappers with a handwritten HTTP
// double. This suite does not execute Firebase, a model, a device or a Backend.
void main() {
  testWidgets(
    'shared HTTP composition supports Persona CRUD, explicit activation and dirty guards',
    (tester) async {
      final auth = SyntheticAiAuthRepository();
      final client = _Peer();
      addTearDown(auth.dispose);
      await tester.pumpWidget(_app(auth, client));
      await tester.pumpAndSettle();
      await tester.enterText(find.byKey(const Key('ai-message-input')), _input);
      await _tap(tester, 'ai-send');
      expect(find.text(_reply), findsOneWidget);
      await _tap(tester, 'ai-personas');
      expect(find.byKey(const Key('persona-empty')), findsOneWidget);
      await _tap(tester, 'persona-create');
      await tester.enterText(
        find.byKey(const Key('persona-name')),
        '  Synthetic guide  ',
      );
      await _tap(tester, 'persona-save', 'route-persona-create');
      final create = client.requests.singleWhere(
        (r) => r.method == 'POST' && r.url.path == '/v1/me/personas',
      );
      expect(_body(create), {
        'displayName': 'Synthetic guide',
        'tone': 'neutral',
        'responseLength': 'balanced',
        'formatStyle': 'plain',
        'expectedStateRevision': 0,
      });
      expect(
        create.headers['Idempotency-Key'],
        matches(
          r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
        ),
      );
      expect(client.active, isNull);
      await _tap(tester, 'persona-back');
      await _tap(tester, 'persona-select-$_persona');
      expect(client.selectionRequests, isEmpty);
      expect(find.text('Inactive'), findsOneWidget);
      await _tap(tester, 'persona-activate', 'route-persona-management');
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();
      expect(client.selectionRequests, isEmpty);
      await _tap(tester, 'persona-activate', 'route-persona-management');
      await _tap(tester, 'persona-confirm-activate');
      expect(_body(client.selectionRequests.single), {
        'personaId': _persona,
        'expectedRevision': 1,
        'expectedStateRevision': 1,
      });
      expect(client.active, _persona);

      await _tap(tester, 'persona-edit-$_persona', 'route-persona-management');
      await tester.enterText(
        find.byKey(const Key('persona-name')),
        'Unsent edit',
      );
      await _tap(tester, 'persona-back');
      expect(find.text('Discard unsaved changes?'), findsOneWidget);
      await tester.tap(find.text('Keep editing'));
      await tester.pumpAndSettle();
      expect(_name(tester), 'Unsent edit');
      expect(client.editRequests, isEmpty);
      await _tap(tester, 'persona-back');
      await _tap(tester, 'persona-confirm-discard');
      expect(client.editRequests, isEmpty);
      expect(find.text('Synthetic guide'), findsOneWidget);
      await _tap(tester, 'persona-edit-$_persona', 'route-persona-management');
      await tester.enterText(
        find.byKey(const Key('persona-name')),
        'Edited guide',
      );
      await _tap(tester, 'persona-save', 'route-persona-edit');
      expect(_body(client.editRequests.single), {
        'displayName': 'Edited guide',
        'tone': 'neutral',
        'responseLength': 'balanced',
        'formatStyle': 'plain',
        'expectedRevision': 1,
        'expectedStateRevision': 2,
      });
      await _tap(tester, 'persona-back');
      await _tap(
        tester,
        'persona-delete-$_persona',
        'route-persona-management',
      );
      expect(
        find.textContaining('You will have no active Persona'),
        findsOneWidget,
      );
      await _tap(tester, 'persona-confirm-delete');
      final deletion = client.requests.singleWhere((r) => r.method == 'DELETE');
      expect(_body(deletion), {
        'expectedRevision': 2,
        'expectedStateRevision': 3,
      });
      expect(client.active, isNull);
      expect(find.byKey(const Key('persona-empty')), findsOneWidget);
      await _tap(tester, 'persona-back');
      await _menu(tester, 'ai-reload-messages');
      expect(find.text(_input), findsOneWidget);
      expect(find.text(_reply), findsOneWidget);
      expect(client.executions, hasLength(1));
      expect(
        client.requests.every(
          (r) => r.headers['Authorization'] == 'Bearer synthetic-ai-token-1',
        ),
        isTrue,
      );
      // Persona management values are never added to the AI request body.
      expect(_body(client.executions.single), {'text': _input});
      await tester.pumpWidget(const SizedBox.shrink());
      expect(client.closes, 0);
    },
  );

  testWidgets(
    'AI Persona detour cancels original attempt, hides late output and requires explicit readback',
    (tester) async {
      final auth = SyntheticAiAuthRepository();
      final client = _Peer(pendingExecute: true, seeded: true);
      addTearDown(auth.dispose);
      await tester.pumpWidget(_app(auth, client));
      await tester.pumpAndSettle();
      await tester.enterText(find.byKey(const Key('ai-message-input')), _input);
      await _tap(tester, 'ai-send');
      await _tap(tester, 'ai-personas');
      expect(find.text('Request cancel and leave'), findsOneWidget);
      await _tap(tester, 'ai-confirm-leave');
      final cancel = client.requests.singleWhere(
        (r) => r.url.path.endsWith('/cancel'),
      );
      expect(cancel.headers['Authorization'], 'Bearer synthetic-ai-token-1');
      expect(cancel.headers['AI-Operation-Key'], _operationKey);
      await _tap(
        tester,
        'persona-delete-$_persona',
        'route-persona-management',
      );
      await _tap(tester, 'persona-confirm-delete');
      client.executeCompletion.complete(_json(_pair()));
      await tester.pumpAndSettle();
      await _tap(tester, 'persona-back');
      expect(find.text(_reply), findsNothing);
      expect(find.byKey(const Key('ai-check-result')), findsOneWidget);
      expect(find.byKey(const Key('ai-retry')), findsNothing);
      client.authorityChanged = true;
      await _tap(tester, 'ai-check-result');
      expect(find.text('This reply is no longer available.'), findsOneWidget);
      expect(find.text(_reply), findsNothing);
      expect(find.byKey(const Key('ai-retry')), findsNothing);
      expect(client.executions, hasLength(1));
      expect(
        client.requests.where((r) => r.url.path.endsWith('/cancel')),
        hasLength(1),
      );
      await tester.pumpWidget(const SizedBox.shrink());
      expect(client.closes, 0);
    },
  );

  testWidgets(
    'same UID replacement clears Persona draft and ignores old create completion',
    (tester) async {
      final auth = SyntheticAiAuthRepository();
      final client = _Peer(pendingCreate: true);
      addTearDown(auth.dispose);
      await tester.pumpWidget(_app(auth, client));
      await tester.pumpAndSettle();
      await _tap(tester, 'ai-personas');
      await _tap(tester, 'persona-create');
      await tester.enterText(
        find.byKey(const Key('persona-name')),
        'Old session draft',
      );
      await _tap(tester, 'persona-save', 'route-persona-create');
      expect(client.createRequests, hasLength(1));
      expect(
        client.createRequests.single.headers['Authorization'],
        'Bearer synthetic-ai-token-1',
      );
      auth.replaceSession();
      await tester.pumpAndSettle();
      expect(_name(tester), isEmpty);
      final reads = client.personaReads.length;
      client.createCompletion.complete(
        _json({
          'persona': _personaDto(name: 'Old session draft'),
          'stateRevision': 1,
        }, 201),
      );
      await tester.pumpAndSettle();
      expect(_name(tester), isEmpty);
      expect(find.text('Your change was saved.'), findsNothing);
      expect(client.personaReads, hasLength(reads));
      expect(
        client.personaReads.last.headers['Authorization'],
        'Bearer synthetic-ai-token-2',
      );
      expect(client.createRequests, hasLength(1));
      await _tap(tester, 'persona-back');
      await _tap(tester, 'persona-back');
      await tester.pumpWidget(const SizedBox.shrink());
      expect(client.closes, 0);
    },
  );

  testWidgets('caller Persona callback remains the navigation boundary', (
    tester,
  ) async {
    final auth = SyntheticAiAuthRepository();
    final client = _Peer();
    var opens = 0;
    addTearDown(auth.dispose);
    await tester.pumpWidget(_app(auth, client, onOpenPersonas: () => opens++));
    await tester.pumpAndSettle();
    await _tap(tester, 'ai-personas');
    expect(opens, 1);
    expect(find.text('Manage Personas'), findsNothing);
    expect(client.requests, isEmpty);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets(
    'label rebuild preserves Persona draft while replacing the client resets its session',
    (tester) async {
      final auth = SyntheticAiAuthRepository();
      final original = _Peer();
      final replacement = _Peer();
      addTearDown(auth.dispose);
      await tester.pumpWidget(_app(auth, original));
      await tester.pumpAndSettle();
      await _tap(tester, 'ai-personas');
      await _tap(tester, 'persona-create');
      await tester.enterText(
        find.byKey(const Key('persona-name')),
        'Unsent controlled Persona draft',
      );
      final originalReads = original.personaReads.length;
      await tester.pumpWidget(
        _app(auth, original, label: 'Changed synthetic evidence label'),
      );
      await tester.pumpAndSettle();
      expect(_name(tester), 'Unsent controlled Persona draft');
      expect(original.personaReads, hasLength(originalReads));
      await tester.pumpWidget(_app(auth, replacement));
      await tester.pumpAndSettle();
      expect(_name(tester), isEmpty);
      expect(replacement.personaReads, isNotEmpty);
      expect(original.createRequests, isEmpty);
      expect(replacement.createRequests, isEmpty);
      await tester.pumpWidget(const SizedBox.shrink());
      expect(original.closes, 0);
      expect(replacement.closes, 0);
    },
  );

  testWidgets(
    'explicit AI HTTP loopback never bypasses Persona HTTPS authority',
    (tester) async {
      final auth = SyntheticAiAuthRepository();
      final client = _Peer();
      addTearDown(auth.dispose);
      await tester.pumpWidget(
        AiNetworkHarnessApp.isolatedLoopback(
          baseUri: Uri.parse('http://127.0.0.1:8080'),
          auth: auth,
          client: client,
          environmentLabel: 'Synthetic local peer; Persona HTTPS unavailable',
          onOpenSettings: () {},
        ),
      );
      await tester.pumpAndSettle();
      await _tap(tester, 'ai-personas');
      expect(
        find.text('Personas could not be loaded. Try again.'),
        findsOneWidget,
      );
      expect(find.byKey(const Key('persona-empty')), findsNothing);
      expect(client.requests, isEmpty);
      await tester.pumpWidget(const SizedBox.shrink());
      expect(client.closes, 0);
    },
  );
}

Widget _app(
  SyntheticAiAuthRepository auth,
  _Peer client, {
  VoidCallback? onOpenPersonas,
  String label = 'Synthetic HTTP double; no model/storage/device evidence',
}) => AiNetworkHarnessApp(
  baseUri: Uri.parse('https://backend.invalid'),
  auth: auth,
  client: client,
  environmentLabel: label,
  onOpenSettings: () {},
  onOpenPersonas: onOpenPersonas,
);

String _name(WidgetTester tester) => tester
    .widget<TextFormField>(find.byKey(const Key('persona-name')))
    .controller!
    .text;

Future<void> _tap(WidgetTester tester, String key, [String? surface]) async {
  final finder = find.byKey(Key(key));
  if (finder.evaluate().isEmpty && surface != null) {
    await tester.scrollUntilVisible(
      finder,
      200,
      scrollable: find
          .descendant(
            of: find.byKey(Key(surface)),
            matching: find.byType(Scrollable),
          )
          .first,
    );
  }
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

Future<void> _menu(WidgetTester tester, String key) async {
  await _tap(tester, 'ai-conversation-actions');
  await _tap(tester, key);
}

Map<String, dynamic> _body(http.Request request) =>
    jsonDecode(request.body) as Map<String, dynamic>;

const _persona =
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const _conversation = '00000000-0000-4000-8000-000000000001';
const _operation = '00000000-0000-4000-8000-000000000002';
const _user = '00000000-0000-4000-8000-000000000003';
const _assistant = '00000000-0000-4000-8000-000000000004';
const _operationKey = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const _input = 'Synthetic conversation input';
const _reply = 'Synthetic accepted reply';

Map<String, Object> _personaDto({
  String name = 'Synthetic guide',
  int revision = 1,
}) => {
  'personaId': _persona,
  'displayName': name,
  'tone': 'neutral',
  'responseLength': 'balanced',
  'formatStyle': 'plain',
  'createdAt': '2026-10-14T10:00:00.000Z',
  'updatedAt': revision == 1
      ? '2026-10-14T10:00:00.000Z'
      : '2026-10-14T10:01:00.000Z',
  'revision': revision,
};

Map<String, Object> _message(
  String id,
  String role,
  int sequence,
  String text,
) => {
  'messageId': id,
  'role': role,
  'sequence': sequence,
  'persistedAt': '2026-10-14T10:00:00.123456Z',
  'availability': 'available',
  'text': text,
};

Map<String, Object> _pair() => {
  'operationId': _operation,
  'conversationId': _conversation,
  'userMessage': _message(_user, 'user', 1, _input),
  'assistantMessage': _message(_assistant, 'assistant', 2, _reply),
};

http.StreamedResponse _json(Object body, [int status = 200]) =>
    http.StreamedResponse(Stream.value(utf8.encode(jsonEncode(body))), status);

final class _Peer extends http.BaseClient {
  _Peer({
    this.pendingExecute = false,
    this.pendingCreate = false,
    bool seeded = false,
  }) {
    if (seeded) {
      persona = _personaDto();
      active = _persona;
      stateRevision = 1;
    }
  }
  final bool pendingExecute, pendingCreate;
  final requests = <http.Request>[];
  final executeCompletion = Completer<http.StreamedResponse>();
  final createCompletion = Completer<http.StreamedResponse>();
  Map<String, Object>? persona;
  String? active;
  int stateRevision = 0, closes = 0;
  bool authorityChanged = false;

  Iterable<http.Request> get executions =>
      requests.where((r) => r.url.path.endsWith('/execute'));
  Iterable<http.Request> get selectionRequests =>
      requests.where((r) => r.url.path == '/v1/me/persona-selection');
  Iterable<http.Request> get editRequests => requests.where(
    (r) => r.method == 'PUT' && r.url.path == '/v1/me/personas/$_persona',
  );
  Iterable<http.Request> get createRequests => requests.where(
    (r) => r.method == 'POST' && r.url.path == '/v1/me/personas',
  );
  Iterable<http.Request> get personaReads => requests.where(
    (r) => r.method == 'GET' && r.url.path.startsWith('/v1/me/personas'),
  );

  Object _collection() => {
    'personas': {
      'items': [if (persona != null) persona],
      'stateRevision': stateRevision,
      if (active != null) 'activePersonaId': active,
    },
  };

  @override
  Future<http.StreamedResponse> send(http.BaseRequest outbound) async {
    final request = outbound as http.Request;
    requests.add(request);
    final path = request.url.path;
    if (path == '/v1/me/personas') {
      if (request.method == 'GET') return _json(_collection());
      if (pendingCreate) return createCompletion.future;
      final body = _body(request);
      persona = _personaDto(name: body['displayName'] as String);
      stateRevision++;
      return _json({'persona': persona, 'stateRevision': stateRevision}, 201);
    }
    if (path == '/v1/me/persona-selection') {
      active = _body(request)['personaId'] as String;
      stateRevision++;
      return _json(_collection());
    }
    if (path == '/v1/me/personas/$_persona') {
      if (request.method == 'DELETE') {
        persona = null;
        active = null;
        stateRevision++;
        return http.StreamedResponse(const Stream.empty(), 204);
      }
      if (request.method == 'PUT') {
        persona = _personaDto(
          name: _body(request)['displayName'] as String,
          revision: (persona!['revision'] as int) + 1,
        );
        stateRevision++;
      }
      return _json({'persona': persona, 'stateRevision': stateRevision});
    }
    if (path == '/v1/me/ai/operations') {
      return _json({
        'operationId': _operation,
        'operationKey': _operationKey,
        'conversationId': _conversation,
        'preparationExpiresAt': DateTime.now()
            .toUtc()
            .add(const Duration(seconds: 15))
            .toIso8601String(),
      }, 201);
    }
    if (path.endsWith('/execute')) {
      return pendingExecute ? executeCompletion.future : _json(_pair());
    }
    if (path.endsWith('/cancel')) {
      return _json({'operationId': _operation, 'state': 'terminal'});
    }
    if (path.endsWith('/messages')) {
      return _json({
        'messages': [
          _message(_user, 'user', 1, _input),
          _message(_assistant, 'assistant', 2, _reply),
        ],
      });
    }
    if (path == '/v1/me/conversations/$_conversation/operations/$_operation' &&
        authorityChanged) {
      return _json({
        'error': {
          'code': 'AI_AUTHORITY_CHANGED',
          'message': 'Synthetic rejection',
        },
        'requestId': 'synthetic-request',
      }, 409);
    }
    throw StateError('Unscripted synthetic request: ${request.method} $path');
  }

  @override
  void close() => closes++;
}
