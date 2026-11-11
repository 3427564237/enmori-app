import 'dart:convert';

import 'package:enmori/features/ai_conversation/ai_conversation_providers.dart';
import 'package:enmori/features/ai_conversation/data/ai_wire_repository.dart';
import 'package:enmori/features/ai_conversation/data/http_ai_wire_transport.dart';
import 'package:enmori/features/ai_conversation/presentation/ai_conversation_page.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/harness/ai_conversation/ai_network_harness_app.dart';
import 'package:enmori/harness/ai_conversation/synthetic_auth_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

// Real page, controller, wire mapper and HTTP adapter; the HTTP peer and Auth
// are explicit synthetic doubles. No service, persistence, device or model use.
void main() {
  for (final social in [false, true]) {
    final invalidDrafts = {
      'overlong text': 'x' * 2401,
      'overlong Unicode scalars': '🌱' * 2401,
    };
    for (final entry in invalidDrafts.entries) {
      testWidgets('local rejection keeps ${entry.key} editable social=$social', (
        tester,
      ) async {
        final peer = await _mount(tester, social: social);
        final editor = _field(tester);
        final value = TextEditingValue(
          text: entry.value,
          selection: const TextSelection(baseOffset: 1, extentOffset: 3),
          composing: const TextRange(start: 0, end: 4),
        );
        await tester.showKeyboard(_input);
        tester.testTextInput.updateEditingValue(value);
        await tester.pumpAndSettle();
        await _tap(tester, 'ai-send');
        expect(editor.controller!.value == value, isTrue);
        expect(editor.focusNode!.hasFocus, isTrue);
        // With a pinned composer, the error follows the empty-topic intro in
        // the independent lazy history viewport; scroll down to read it.
        await _ensure(tester, find.byKey(const Key('ai-status')));
        expect(
          find.text('Enter 1–2400 characters of valid text.'),
          findsOneWidget,
        );
        expect(peer.calls, isEmpty);
        expect(_state(tester).canSend, isTrue);

        // Correction is a new deliberate action, with no resend or truncation.
        await _enter(tester, 'Corrected synthetic input');
        await _tap(tester, 'ai-send');
        expect(peer.prepares, 1);
        expect(peer.executes, 1);
        expect(_state(tester).phase, AiConversationPhase.success);
        expect(editor.controller!.text, isEmpty);
        expect(editor.focusNode!.hasFocus, isFalse);
        expect(peer.messages.first['text'], 'Corrected synthetic input');
        expect(tester.takeException(), isNull);
      });
    }

    testWidgets('local admission accepts 2400 Unicode scalars social=$social', (
      tester,
    ) async {
      final peer = await _mount(tester, social: social);
      final editor = _field(tester);
      final draft = '🌱' * 2400;
      await tester.enterText(_input, draft);
      await _tap(tester, 'ai-send');
      expect(peer.prepares, 1);
      expect(peer.executes, 1);
      expect(peer.messages.first['text'] == draft, isTrue);
      expect(_state(tester).phase, AiConversationPhase.success);
      expect(editor.controller!.text, isEmpty);
      expect(editor.focusNode!.hasFocus, isFalse);
      expect(tester.takeException(), isNull);
    });

    testWidgets(
      'local Retry mismatch retains draft after bounded recovery and before exact Retry readback and next Send social=$social',
      (tester) async {
        final peer = await _mount(
          tester,
          social: social,
          firstUnresolved: true,
        );
        final editor = _field(tester);
        const original = 'Saved synthetic input';
        await tester.enterText(_input, original);
        await _tap(tester, 'ai-send');
        // The approved bounded foreground read resolves the saved user turn.
        expect(_state(tester).phase, AiConversationPhase.idle);
        expect(peer.outcomeReads, 1);
        expect(editor.controller!.text, isEmpty);
        expect(_state(tester).canRetry, isTrue);
        final saved = Map<String, Object>.of(peer.messages.single);
        const mismatch = TextEditingValue(
          text: 'Saved synthetic input edited',
          selection: TextSelection(baseOffset: 6, extentOffset: 15),
          composing: TextRange(start: 0, end: 5),
        );
        await _ensure(tester, _input);
        await tester.showKeyboard(_input);
        tester.testTextInput.updateEditingValue(mismatch);
        await tester.pumpAndSettle();
        expect(editor.controller!.text, mismatch.text);
        expect(editor.controller!.selection, mismatch.selection);
        final before = peer.calls.length;
        await _tap(tester, 'ai-retry');
        expect(editor.controller!.text, mismatch.text);
        expect(editor.controller!.selection, mismatch.selection);
        expect(editor.focusNode!.hasFocus, isTrue);
        expect(
          _state(tester).statusMessage,
          'Enter the same saved message to retry.',
        );
        // The standalone ListView builds the status lazily above the composer.
        // New conversation adds an action there, so scroll back to the status
        // before asserting its rendering; keep exact Retry and draft assertions.
        await _ensure(tester, find.byKey(const Key('ai-status')), delta: -200);
        expect(
          find.text('Enter the same saved message to retry.'),
          findsOneWidget,
        );
        expect(peer.calls.length, before);
        expect(peer.prepares, 1);
        expect(peer.executes, 1);
        expect(_state(tester).canRetry, isTrue);

        await _enter(tester, original);
        await _tap(tester, 'ai-retry');
        expect(peer.prepares, 2);
        expect(peer.executes, 2);
        expect(peer.prepareBodies[1], {
          'kind': 'retry',
          'purpose': 'checkin_conversation',
          'conversationId': _conversation,
          'userMessageId': saved['messageId'],
        });
        expect(peer.sentTexts, [original, original]);
        expect(peer.messages.first, saved);
        expect(_state(tester).messages, hasLength(2));
        expect(_state(tester).phase, AiConversationPhase.success);
        expect(editor.controller!.text, isEmpty);
        await _reload(tester, social: social);
        expect(_state(tester).messages, hasLength(2));
        await _enter(tester, 'Next explicit input');
        await _tap(tester, 'ai-send');
        await _reload(tester, social: social);
        expect(peer.prepares, 3);
        expect(peer.executes, 3);
        expect(peer.prepareBodies[2], {
          'kind': 'send',
          'purpose': 'checkin_conversation',
          'conversationId': _conversation,
        });
        expect(peer.sentTexts, [original, original, 'Next explicit input']);
        expect(_state(tester).messages.map((m) => m.sequence), [1, 2, 3, 4]);
        expect(peer.messages.first, saved);
        expect(_state(tester).canSend, isTrue);
        expect(tester.takeException(), isNull);
      },
    );
  }
}

Finder get _input => find.byKey(const Key('ai-message-input'));
TextField _field(WidgetTester tester) => tester.widget<TextField>(_input);
AiConversationState _state(WidgetTester tester) =>
    ProviderScope.containerOf(tester.element(find.byType(AiConversationPage)))
        .read(aiConversationControllerProvider);

Future<_Peer> _mount(
  WidgetTester tester, {
  required bool social,
  bool firstUnresolved = false,
}) async {
  final peer = _Peer(firstUnresolved: firstUnresolved);
  final auth = SyntheticAiAuthRepository();
  addTearDown(auth.dispose);
  if (social) {
    await tester.pumpWidget(
      AiNetworkHarnessApp(
        baseUri: Uri.parse('https://synthetic-local-rejection.invalid'),
        auth: auth,
        client: peer,
        environmentLabel: 'Synthetic local-input rejection peer only',
        onOpenSettings: () {},
      ),
    );
  } else {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(auth),
          aiConversationRepositoryProvider.overrideWithValue(
            AiWireRepository(
              HttpAiWireTransport(
                baseUri: Uri.parse('https://synthetic-local-rejection.invalid'),
                client: peer,
              ),
            ),
          ),
        ],
        child: MaterialApp(
          home: AiConversationPage(onBack: () {}, onOpenSettings: () {}),
        ),
      ),
    );
  }
  await tester.pumpAndSettle();
  return peer;
}

Future<void> _tap(WidgetTester tester, String key) async {
  final target = find.byKey(Key(key));
  await _ensure(tester, target);
  await tester.tap(target);
  await tester.pumpAndSettle();
}

Future<void> _enter(WidgetTester tester, String text) async {
  await _ensure(tester, _input);
  await tester.enterText(_input, text);
}

Future<void> _ensure(
  WidgetTester tester,
  Finder target, {
  double delta = 200,
}) async {
  await tester.pump();
  if (target.evaluate().isEmpty) {
    await tester.scrollUntilVisible(
      target,
      delta,
      scrollable: find
          .descendant(
            of: find.byKey(const Key('route-ai-conversation')),
            matching: find.byType(Scrollable),
          )
          .first,
    );
  }
  await tester.ensureVisible(target);
}

Future<void> _reload(WidgetTester tester, {required bool social}) async {
  if (social) await _tap(tester, 'ai-conversation-actions');
  if (!social) {
    await _ensure(
      tester,
      find.byKey(const Key('ai-reload-messages')),
      delta: -200,
    );
  }
  await _tap(tester, 'ai-reload-messages');
}

const _conversation = '00000000-0000-4000-8000-000000000001';
String _id(int number) =>
    '00000000-0000-4000-8000-${number.toString().padLeft(12, '0')}';

final class _Peer extends http.BaseClient {
  _Peer({required this.firstUnresolved});
  final bool firstUnresolved;
  int outcomeReads = 0;
  final calls = <http.BaseRequest>[];
  final prepareBodies = <Map<String, dynamic>>[];
  final sentTexts = <String>[];
  final messages = <Map<String, Object>>[];
  int prepares = 0, executes = 0;
  bool _retry = false;

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    calls.add(request);
    final raw = await utf8.decoder.bind(request.finalize()).join();
    final body = raw.isEmpty ? null : jsonDecode(raw) as Map<String, dynamic>;
    if (request.method == 'POST' && request.url.path.endsWith('/operations')) {
      prepares++;
      prepareBodies.add(Map<String, dynamic>.of(body!));
      _retry = body['kind'] == 'retry';
      return _json({
        'operationId': _id(10 + prepares),
        'operationKey': base64Url
            .encode(List.filled(32, prepares))
            .replaceAll('=', ''),
        'conversationId': _conversation,
        'preparationExpiresAt': DateTime.now()
            .toUtc()
            .add(const Duration(seconds: 15))
            .toIso8601String(),
      }, 201);
    }
    if (request.url.path.endsWith('/execute')) {
      executes++;
      sentTexts.add(body!['text'] as String);
      final user = _retry
          ? messages.last
          : _message('user', body['text'] as String);
      if (!_retry) messages.add(user);
      if (firstUnresolved && executes == 1) {
        return _json({
          'error': {
            'code': 'AI_OUTCOME_UNRESOLVED',
            'message': 'Synthetic unresolved execution.',
          },
          'requestId': 'synthetic-local-rejection',
        }, 503);
      }
      final assistant = _message('assistant', 'Synthetic reply $executes');
      messages.add(assistant);
      return _json({
        'operationId': _id(10 + prepares),
        'conversationId': _conversation,
        'userMessage': user,
        'assistantMessage': assistant,
      });
    }
    if (request.method == 'GET' && request.url.path.endsWith('/messages')) {
      return _json({'messages': messages});
    }
    if (request.method == 'GET' && request.url.path.endsWith('/${_id(11)}')) {
      outcomeReads++;
      return _json({
        'operationId': _id(11),
        'state': 'user_saved',
        'userMessage': messages.single,
      });
    }
    throw StateError('Unexpected synthetic local-rejection request.');
  }

  Map<String, Object> _message(String role, String text) => {
    'messageId': _id(100 + messages.length),
    'sequence': messages.length + 1,
    'role': role,
    'persistedAt': DateTime.utc(
      2026,
      10,
      18,
      12,
      0,
      messages.length,
    ).toIso8601String(),
    'availability': 'available',
    'text': text,
  };

  http.StreamedResponse _json(Object body, [int status = 200]) =>
      http.StreamedResponse(
        Stream.value(utf8.encode(jsonEncode(body))),
        status,
        headers: {'content-type': 'application/json; charset=utf-8'},
      );
}
