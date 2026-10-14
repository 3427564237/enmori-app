import 'dart:async';
import 'dart:convert';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/harness/ai_conversation/ai_network_harness_app.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

void main() {
  testWidgets(
    'network harness uses observed Auth, reviewed social page and caller-owned client',
    (tester) async {
      final auth = _ObservedAuth(authenticated: false);
      final client = _Client();
      addTearDown(auth.dispose);
      await tester.pumpWidget(_app(auth, client));
      await tester.pumpAndSettle();
      expect(
        find.byKey(const Key('ai-network-harness-banner')),
        findsOneWidget,
      );
      expect(
        find.text(
          'Synthetic account and input only. Storage, Note, model and cleanup evidence belong to the selected Backend.',
        ),
        findsOneWidget,
      );
      expect(find.byKey(const Key('ai-message-input')), findsNothing);
      expect(client.requests, isEmpty);
      expect(auth.observers, 1);
      auth.replaceSession();
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('ai-pinned-composer')), findsOneWidget);
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('ai-message-input')))
            .enabled,
        isTrue,
      );
      await tester.pumpWidget(const SizedBox.shrink());
      expect(client.closes, 0);
    },
  );

  testWidgets(
    'label-only rebuild preserves draft and existing observed session',
    (tester) async {
      final auth = _ObservedAuth(authenticated: true);
      final client = _Client();
      addTearDown(auth.dispose);
      await tester.pumpWidget(_app(auth, client));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const Key('ai-message-input')),
        'Unsent synthetic draft',
      );
      await tester.pumpWidget(
        _app(auth, client, label: 'Synthetic changed evidence label'),
      );
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('ai-message-input')))
            .controller!
            .text,
        'Unsent synthetic draft',
      );
      expect(auth.observers, 1);
      expect(client.requests, isEmpty);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );

  testWidgets(
    'same UID replacement detaches original execution and late body',
    (tester) async {
      final auth = _ObservedAuth(authenticated: true);
      final client = _Client();
      addTearDown(auth.dispose);
      await tester.pumpWidget(_app(auth, client));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const Key('ai-message-input')),
        'Synthetic pending input',
      );
      await tester.pump();
      await tester.tap(find.byKey(const Key('ai-send')));
      await tester.pump();
      await tester.pump();
      expect(
        client.requests.where(
          (request) => request.url.path.endsWith('/execute'),
        ),
        hasLength(1),
      );
      auth.replaceSession();
      await tester.pump();
      await tester.pump();
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('ai-message-input')))
            .controller!
            .text,
        isEmpty,
      );
      final cancel = client.requests.singleWhere(
        (request) => request.url.path.endsWith('/cancel'),
      );
      expect(cancel.headers['Authorization'], 'Bearer synthetic-token-1');
      client.execution.complete(
        _json({
          'operationId': _operation,
          'conversationId': _conversation,
          'userMessage': _message(_user, 'user', 1, 'Synthetic pending input'),
          'assistantMessage': _message(
            _assistant,
            'assistant',
            2,
            'Late synthetic reply',
          ),
        }),
      );
      await tester.pump();
      await tester.pump();
      expect(find.text('Late synthetic reply'), findsNothing);
      expect(
        client.requests.where(
          (request) => request.url.path.endsWith('/execute'),
        ),
        hasLength(1),
      );
      expect(auth.observers, 1);
      await tester.pumpWidget(const SizedBox.shrink());
      expect(client.closes, 0);
    },
  );
}

Widget _app(
  _ObservedAuth auth,
  _Client client, {
  String label = 'Synthetic HTTP peer; no storage/model evidence',
}) => AiNetworkHarnessApp(
  key: const Key('controlled-network-composition'),
  baseUri: Uri.parse('https://backend.invalid'),
  auth: auth,
  client: client,
  environmentLabel: label,
  onOpenSettings: () {},
);

const _conversation = '00000000-0000-4000-8000-000000000001';
const _operation = '00000000-0000-4000-8000-000000000002';
const _user = '00000000-0000-4000-8000-000000000003';
const _assistant = '00000000-0000-4000-8000-000000000004';

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

http.StreamedResponse _json(Object body, [int status = 200]) =>
    http.StreamedResponse(Stream.value(utf8.encode(jsonEncode(body))), status);

final class _Client extends http.BaseClient {
  final requests = <http.BaseRequest>[];
  final execution = Completer<http.StreamedResponse>();
  int closes = 0;

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    requests.add(request);
    if (request.url.path.endsWith('/execute')) return execution.future;
    if (request.url.path.endsWith('/cancel')) {
      return _json({'operationId': _operation, 'state': 'terminal'});
    }
    return _json({
      'operationId': _operation,
      'operationKey': 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      'conversationId': _conversation,
      'preparationExpiresAt': DateTime.now()
          .toUtc()
          .add(const Duration(seconds: 15))
          .toIso8601String(),
    }, 201);
  }

  @override
  void close() => closes++;
}

final class _ObservedAuth implements AuthRepository {
  _ObservedAuth({required bool authenticated})
    : _session = authenticated
          ? AuthSessionAuthenticated(subject: 'synthetic-owner')
          : const AuthSessionUnauthenticated();
  final _changes = StreamController<AuthSession>.broadcast(sync: true);
  AuthSession _session;
  int generation = 1, observers = 0;

  void replaceSession() {
    generation++;
    _session = AuthSessionAuthenticated(subject: 'synthetic-owner');
    _changes.add(_session);
  }

  @override
  Stream<AuthSession> watchSession() async* {
    observers++;
    yield _session;
    yield* _changes.stream;
  }

  @override
  Future<Result<String>> getIdToken() async =>
      Success('synthetic-token-$generation');

  @override
  Future<Result<void>> signOut() async {
    _session = const AuthSessionUnauthenticated();
    _changes.add(_session);
    return const Success(null);
  }

  @override
  Future<Result<void>> register({
    required String email,
    required String password,
  }) async => const Failure(_unsupported);

  @override
  Future<Result<void>> signIn({
    required String email,
    required String password,
  }) async => const Failure(_unsupported);

  Future<void> dispose() => _changes.close();
}

const _unsupported = AppFailure(
  kind: AppFailureKind.configurationUnavailable,
  message: 'Synthetic test Auth only.',
);
