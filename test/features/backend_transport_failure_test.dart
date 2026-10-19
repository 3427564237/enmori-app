import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/presentation/command_state.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/ai_conversation/ai_conversation_providers.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/check_in/check_in_providers.dart';
import 'package:enmori/features/check_in/data/backend_check_in_repository.dart';
import 'package:enmori/features/check_in/domain/check_in_repository.dart';
import 'package:enmori/features/check_in/presentation/check_in_controller.dart';
import 'package:enmori/features/check_in/presentation/check_in_page.dart';
import 'package:enmori/harness/ai_conversation/ai_network_harness_app.dart';
import 'package:enmori/harness/ai_conversation/synthetic_auth_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/io_client.dart';
import 'package:http/testing.dart';

void main() {
  testWidgets('stalled AI execution leaves waiting at its existing deadline', (
    tester,
  ) async {
    final peer = _StalledAiPeer();
    final auth = SyntheticAiAuthRepository();
    addTearDown(auth.dispose);
    addTearDown(peer.close);
    await tester.pumpWidget(
      AiNetworkHarnessApp(
        baseUri: Uri.parse('https://synthetic.invalid'),
        auth: auth,
        client: peer,
        environmentLabel: 'Synthetic never-completing HTTP peer; no model',
        onOpenSettings: () {},
      ),
    );
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('ai-message-input')), _note);
    await tester.pump();
    await tester.tap(find.byKey(const Key('ai-send')));
    await tester.pump();
    await tester.pump();
    final container = ProviderScope.containerOf(
      tester.element(find.byKey(const Key('ai-message-input'))),
    );
    expect(
      container.read(aiConversationControllerProvider).phase,
      AiConversationPhase.waiting,
    );
    await tester.pump(const Duration(seconds: 75));
    await tester.pumpAndSettle();
    final state = container.read(aiConversationControllerProvider);
    expect(state.phase, AiConversationPhase.timedOut);
    expect(state.canCancel, isFalse);
    expect(state.canRetry, isFalse);
    expect(state.canSend, isFalse);
    expect(
      find.text(
        'This request timed out. Check saved messages before trying again.',
      ),
      findsOneWidget,
    );
    expect(find.byKey(const Key('ai-check-result')), findsOneWidget);
    expect(peer.executes, 1);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump();
  });

  test('token platform failure becomes a safe result without HTTP', () async {
    var sends = 0;
    final client = BackendApiClient(
      Uri.parse('https://synthetic.invalid'),
      () async => throw PlatformException(code: 'synthetic-token-channel'),
      httpClient: MockClient((_) async {
        sends++;
        return http.Response('{}', 200);
      }),
    );
    addTearDown(client.close);
    _expectUnavailable(await client.get('/v1/me/settings'));
    expect(sends, 0);
  });

  test(
    'native IOClient TLS failure becomes a safe result without bypass',
    () async {
      final native = _TlsFailureClient();
      final client = BackendApiClient(
        Uri.parse('https://synthetic.invalid'),
        () async => const Success('synthetic-token'),
        httpClient: IOClient(native),
      );
      addTearDown(client.close);
      _expectUnavailable(
        await client.post('/v1/check-ins', body: {'note': _note}),
      );
      expect(native.opens, 1);
      expect(native.closes, 0);
    },
  );

  test('response body TLS failure becomes a safe result', () async {
    final peer = _BodyFailureClient();
    final client = BackendApiClient(
      Uri.parse('https://synthetic.invalid'),
      () async => const Success('synthetic-token'),
      httpClient: peer,
    );
    addTearDown(client.close);
    _expectUnavailable(await client.get('/v1/me/settings'));
    expect(peer.sends, 1);
  });

  test(
    'malformed response keeps its existing invalid-response classification',
    () async {
      final client = BackendApiClient(
        Uri.parse('https://synthetic.invalid'),
        () async => const Success('synthetic-token'),
        httpClient: MockClient((_) async => http.Response('{', 200)),
      );
      addTearDown(client.close);
      final result = await client.get('/v1/me/settings');
      expect(
        (result as Failure<JsonObject>).failure.kind,
        AppFailureKind.unexpected,
      );
    },
  );

  testWidgets(
    'TLS save failure releases loading and permits explicit same-key recovery',
    (tester) async {
      final peer = _SavePeer();
      final client = BackendApiClient(
        Uri.parse('https://synthetic.invalid'),
        () async => const Success('synthetic-token'),
        httpClient: peer,
      );
      addTearDown(client.close);
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentAuthSubjectProvider.overrideWithValue('synthetic-owner'),
            checkInRepositoryProvider.overrideWithValue(
              BackendCheckInRepository(client),
            ),
          ],
          child: MaterialApp(home: CheckInComposerPage(onReturnHome: () {})),
        ),
      );
      await tester.enterText(find.byKey(const Key('r6-check-in-note')), _note);
      await tester.pump();
      final save = find.byKey(const Key('r6-check-in-create'));
      await tester.ensureVisible(save);
      final escaped = <Object>[];
      // Capture an escaped callback error so the old-source regression can also
      // inspect the actual stuck widget state, rather than fail at the first throw.
      runZonedGuarded(
        () => tester.widget<FilledButton>(save).onPressed!(),
        (error, _) => escaped.add(error),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      final container = ProviderScope.containerOf(tester.element(save));
      expect(
        container.read(checkInControllerProvider),
        isA<CommandFailed<CheckIn>>(),
      );
      expect(find.byKey(const Key('r6-check-in-saving')), findsNothing);
      expect(find.byKey(const Key('r6-check-in-failure')), findsOneWidget);
      expect(escaped, isEmpty);
      expect(tester.widget<FilledButton>(save).onPressed, isNotNull);
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('r6-check-in-note')))
            .controller!
            .text,
        _note,
      );
      expect(peer.posts, hasLength(1));

      await tester.tap(save);
      await tester.pumpAndSettle();
      expect(peer.posts, hasLength(2));
      expect(
        peer.posts[1].headers['Idempotency-Key'],
        peer.posts[0].headers['Idempotency-Key'],
      );
      expect(peer.posts[0].headers['Idempotency-Key'], isNotEmpty);
      expect(
        container.read(checkInControllerProvider),
        isA<CommandSucceeded<CheckIn>>(),
      );
      expect(tester.takeException(), isNull);
    },
  );
}

void _expectUnavailable(Result<JsonObject> result) {
  final failure = (result as Failure<JsonObject>).failure;
  expect(failure.kind, AppFailureKind.serviceUnavailable);
  expect(failure.message, 'The service is unavailable. Try again.');
  expect(failure.requestId, isNull);
}

const _note = 'Synthetic demonstration note';

// Real package:http IOClient is exercised without opening a network socket.
final class _TlsFailureClient implements HttpClient {
  int opens = 0, closes = 0;
  @override
  Future<HttpClientRequest> openUrl(String method, Uri url) async {
    opens++;
    throw const HandshakeException('synthetic TLS refusal');
  }

  @override
  void close({bool force = false}) => closes++;
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

final class _BodyFailureClient extends http.BaseClient {
  int sends = 0;
  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    sends++;
    return http.StreamedResponse(
      Stream.error(const HandshakeException('synthetic body refusal')),
      200,
    );
  }
}

final class _SavePeer extends http.BaseClient {
  final posts = <http.Request>[];
  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    if (request.method != 'POST') {
      throw StateError('Unexpected synthetic read');
    }
    posts.add(request as http.Request);
    if (posts.length == 1) {
      throw const HandshakeException('synthetic save refusal');
    }
    return http.StreamedResponse(
      Stream.value(
        utf8.encode(
          jsonEncode({
            'checkIn': {
              'checkInId': 'synthetic-check-in',
              'note': _note,
              'createdAt': '2026-10-19T00:00:00.000Z',
            },
          }),
        ),
      ),
      201,
    );
  }
}

final class _StalledAiPeer extends http.BaseClient {
  final _execution = Completer<http.StreamedResponse>();
  int executes = 0;
  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    if (request.url.path.endsWith('/execute')) {
      executes++;
      return _execution.future;
    }
    const operation = '00000000-0000-4000-8000-000000000002';
    final cancelling = request.url.path.endsWith('/cancel');
    final body = cancelling
        ? {'operationId': operation, 'state': 'terminal'}
        : {
            'operationId': operation,
            'operationKey': 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
            'conversationId': '00000000-0000-4000-8000-000000000001',
            'preparationExpiresAt': DateTime.now()
                .toUtc()
                .add(const Duration(seconds: 15))
                .toIso8601String(),
          };
    return http.StreamedResponse(
      Stream.value(utf8.encode(jsonEncode(body))),
      cancelling ? 200 : 201,
    );
  }
}
