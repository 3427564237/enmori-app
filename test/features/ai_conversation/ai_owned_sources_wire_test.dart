import 'dart:convert';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/ai_conversation/data/ai_wire_repository.dart';
import 'package:enmori/features/ai_conversation/data/ai_wire_transport.dart';
import 'package:enmori/features/ai_conversation/domain/ai_conversation.dart';
import 'package:enmori/features/ai_conversation/domain/ai_owned_sources.dart';
import 'package:flutter_test/flutter_test.dart';

const topic = '11111111-1111-4111-8111-111111111111';
const message = '22222222-2222-4222-8222-222222222222';
const reference = '33333333-3333-4333-8333-333333333333';
const occurrence = '44444444-4444-4444-8444-444444444444';
const locator = AiMessageLocator(conversationId: topic, messageId: message);
const sourceCard = AiSourceCard(
  cardRef: reference,
  kind: AiSourceKind.conversationMessage,
  version: 'opaque-version',
  sourceOccurredAt: '2026-10-25T00:00:00.123456789Z',
  observedAt: '2026-10-25T01:00:00.123456789Z',
);
Map<String, Object?> cardJson() => {
  'cardRef': reference,
  'kind': 'conversation_message',
  'version': 'opaque-version',
  'sourceOccurredAt': sourceCard.sourceOccurredAt,
  'observedAt': sourceCard.observedAt,
  'state': 'available',
  'canNavigate': true,
};
Map<String, Object?> messageJson() => {
  'messageId': message,
  'sequence': 9,
  'role': 'assistant',
  'persistedAt': '2026-10-25T01:00:00.123456Z',
  'availability': 'available',
  'text': 'A synthetic requested follow-up.',
  'origin': 'proactive',
  'occurrenceId': occurrence,
  'category': 'explicit_follow_up',
  'sources': [cardJson()],
};
String cursor(int before) => base64Url
    .encode(utf8.encode(jsonEncode({'v': 1, 'before': before})))
    .replaceAll('=', '');
Map<String, Object?> anchorJson() => {
  'conversationId': topic,
  'messageId': message,
  'sequence': 9,
  'pageBefore': cursor(10),
};

void main() {
  test('opaque delivery reference resolves only through authenticated fixed endpoint and no read write', () async {
    final t = _Transport(anchorJson());
    final repo = AiWireRepository(t);
    final result = await repo.resolveDelivery(
      token: 'fixture',
      abort: AiAbortSignal(),
      deliveryRef: occurrence,
    );
    expect(result, isA<Success<AiMessageAnchor>>());
    expect(t.requests.single.path, '/v1/me/ai/delivery-references/resolve');
    expect(jsonDecode(t.requests.single.body!), {'deliveryRef': occurrence});
    expect(t.requests.single.method, 'POST');
    expect(
      await repo.resolveDelivery(
        token: 'fixture',
        abort: AiAbortSignal(),
        deliveryRef: 'https://model.invalid',
      ),
      isA<Failure<AiMessageAnchor>>(),
    );
    expect(t.requests, hasLength(1));
  });
  test('explicit reply carries only real user text and same-topic reply locator in the existing execute', () async {
    final assistant =
        {...messageJson(), 'sequence': 11, 'text': 'An ordinary reply'}
          ..remove('origin')
          ..remove('occurrenceId')
          ..remove('category')
          ..remove('sources');
    final t = _Transport({
      'operationId': occurrence,
      'conversationId': topic,
      'userMessage': {
        'messageId': reference,
        'sequence': 10,
        'role': 'user',
        'persistedAt': '2026-10-25T01:01:00Z',
        'availability': 'available',
        'text': 'My real reply',
      },
      'assistantMessage': assistant,
    });
    final key = base64Url.encode(List.filled(32, 1)).replaceAll('=', '');
    final ticket = AiTicket(
      operationId: occurrence,
      operationKey: key,
      conversationId: topic,
      preparationExpiresAt: DateTime.utc(2026, 10, 26),
    );
    final result = await AiWireRepository(t).executeReply(
      token: 'fixture',
      abort: AiAbortSignal(),
      ticket: ticket,
      text: 'My real reply',
      replyToMessageId: message,
    );
    expect(result, isA<Success<AiReply>>());
    expect(jsonDecode(t.requests.single.body!), {
      'text': 'My real reply',
      'replyToMessageId': message,
    });
    expect(t.requests.single.headers['AI-Operation-Key'], key);
    expect(t.requests.single.path, '/v1/me/ai/operations/$occurrence/execute');
  });
  test('genuine proactive row and minimized nanosecond source sidecar decode without a fake user', () async {
    final t = _Transport({
      'messages': [messageJson()],
    });
    final r = AiWireRepository(t);
    final result = await r.readMessages(
      token: 'fixture',
      abort: AiAbortSignal(),
      conversationId: topic,
    );
    final rows = (result as Success<AiMessagePage>).value.messages;
    expect(rows, hasLength(1));
    expect(rows.single.isProactive, isTrue);
    expect(rows.single.role, AiRole.assistant);
    expect(
      rows.single.sources.single.sourceOccurredAt,
      sourceCard.sourceOccurredAt,
    );
    expect(rows.single.sources.single.version, 'opaque-version');
    expect(() => rows.single.sources.clear(), throwsUnsupportedError);
  });
  test('partial origin, user-origin, unavailable source body and content-rich cards are rejected', () async {
    for (final row in [
      {...messageJson()}..remove('occurrenceId'),
      {...messageJson(), 'role': 'user'},
      {...messageJson(), 'availability': 'unavailable'}..remove('text'),
      {
        ...messageJson(),
        'sources': [
          {...cardJson(), 'url': 'https://model.invalid'},
        ],
      },
      {
        ...messageJson(),
        'sources': [
          {...cardJson(), 'state': 'changed'},
        ],
      },
      {
        ...messageJson(),
        'sources': [
          {...cardJson(), 'sourceOccurredAt': '2026-02-30T00:00:00Z'},
        ],
      },
    ]) {
      final r = AiWireRepository(
        _Transport({
          'messages': [row],
        }),
      );
      expect(
        await r.readMessages(
          token: 'fixture',
          abort: AiAbortSignal(),
          conversationId: topic,
        ),
        isA<Failure<AiMessagePage>>(),
      );
    }
  });
  test(
    'unavailable proactive retains origin but has no text or source card',
    () async {
      final row = {...messageJson(), 'availability': 'unavailable'}
        ..remove('text')
        ..remove('sources');
      final result =
          await AiWireRepository(
            _Transport({
              'messages': [row],
            }),
          ).readMessages(
            token: 'fixture',
            abort: AiAbortSignal(),
            conversationId: topic,
          );
      final value = (result as Success<AiMessagePage>).value.messages.single;
      expect(value.isProactive, isTrue);
      expect(value.text, isNull);
      expect(value.sources, isEmpty);
    },
  );
  test(
    'a proactive message cannot prove an ordinary operation reply pair',
    () async {
      final t = _Transport({
        'operationId': occurrence,
        'state': 'assistant_saved',
        'userMessage': {
          'messageId': reference,
          'sequence': 8,
          'role': 'user',
          'persistedAt': '2026-10-25T00:00:00Z',
          'availability': 'available',
          'text': 'real user',
        },
        'assistantMessage': messageJson(),
      });
      expect(
        await AiWireRepository(t).readOperation(
          token: 'fixture',
          abort: AiAbortSignal(),
          conversationId: topic,
          operationId: occurrence,
        ),
        isA<Failure<AiReadback>>(),
      );
    },
  );
  test(
    'anchor binds exact identity and canonical existing before cursor',
    () async {
      final t = _Transport(anchorJson());
      final r = AiWireRepository(t);
      final result = await r.readMessageAnchor(
        token: 'fixture',
        abort: AiAbortSignal(),
        locator: locator,
      );
      expect((result as Success<AiMessageAnchor>).value.pageBefore, cursor(10));
      expect(
        t.requests.single.path,
        '/v1/me/conversations/$topic/messages/$message/anchor',
      );
      expect(t.requests.single.method, 'GET');
      expect(t.requests.single.body, isNull);
      for (final malformed in [
        {...anchorJson(), 'messageId': reference},
        {...anchorJson(), 'pageBefore': cursor(9)},
        {...anchorJson(), 'pageBefore': '${cursor(10)}='},
        {...anchorJson(), 'pageBefore': 10},
        {...anchorJson(), 'sequence': 9007199254740991},
      ]) {
        expect(
          await AiWireRepository(_Transport(malformed)).readMessageAnchor(
            token: 'fixture',
            abort: AiAbortSignal(),
            locator: locator,
          ),
          isA<Failure<AiMessageAnchor>>(),
        );
      }
    },
  );
  test('source resolution sends only trusted receipt IDs and returns a typed anchor', () async {
    final t = _Transport({
      'kind': 'conversation_message',
      'anchor': anchorJson(),
    });
    final result = await AiWireRepository(t).resolveSource(
      token: 'fixture',
      abort: AiAbortSignal(),
      message: locator,
      card: sourceCard,
    );
    expect(result, isA<Success<AiSourceTarget>>());
    expect(
      (result as Success<AiSourceTarget>).value,
      isA<AiConversationMessageTarget>(),
    );
    expect(jsonDecode(t.requests.single.body!), {
      'conversationId': topic,
      'messageId': message,
      'cardRef': reference,
    });
    expect(t.requests.single.path, '/v1/me/ai/source-references/resolve');
    expect(t.requests.single.headers.keys, isNot(contains('AI-Operation-Key')));
    expect(t.requests.single.headers.keys, isNot(contains('Idempotency-Key')));
  });
  test('model URLs, database paths and cross-kind resolver results are never navigable', () async {
    for (final raw in [
      {'kind': 'url', 'url': 'https://model.invalid'},
      {'kind': 'check_in', 'checkInId': 'records/private'},
      {'kind': 'check_in', 'checkInId': 'valid-but-wrong-kind'},
      {
        'kind': 'conversation_message',
        'anchor': anchorJson(),
        'path': 'accounts/private',
      },
    ]) {
      expect(
        await AiWireRepository(_Transport(raw)).resolveSource(
          token: 'fixture',
          abort: AiAbortSignal(),
          message: locator,
          card: sourceCard,
        ),
        isA<Failure<AiSourceTarget>>(),
      );
    }
  });
  test('read watermark uses versioned owner topic PUT and requires a nondecreasing ACK', () async {
    final t = _Transport({'revision': 3, 'readThroughSequence': 9});
    final r = AiWireRepository(t);
    final result = await r.markTopicRead(
      token: 'fixture',
      abort: AiAbortSignal(),
      conversationId: topic,
      expectedRevision: 2,
      readThroughSequence: 9,
    );
    expect((result as Success<AiTopicReadState>).value.readThroughSequence, 9);
    expect(t.requests.single.path, '/v1/me/conversations/$topic/read-state');
    expect(t.requests.single.method, 'PUT');
    expect(jsonDecode(t.requests.single.body!), {
      'expectedRevision': 2,
      'readThroughSequence': 9,
    });
    expect(
      await AiWireRepository(
        _Transport({'revision': 3, 'readThroughSequence': 8}),
      ).markTopicRead(
        token: 'fixture',
        abort: AiAbortSignal(),
        conversationId: topic,
        expectedRevision: 2,
        readThroughSequence: 9,
      ),
      isA<Failure<AiTopicReadState>>(),
    );
  });
  test('source conflict and read precondition errors retain their typed nonretry meaning', () async {
    for (final (code, status, kind) in [
      ('AI_SOURCE_UNAVAILABLE', 404, AppFailureKind.aiSourceUnavailable),
      (
        'AI_CONTEXT_SELECTION_CONFLICT',
        409,
        AppFailureKind.aiContextSelectionConflict,
      ),
      (
        'PROACTIVE_REVISION_PRECONDITION_FAILED',
        412,
        AppFailureKind.proactiveRevisionPreconditionFailed,
      ),
    ]) {
      final t = _Transport({
        'error': {'code': code, 'message': 'private error'},
        'requestId': 'fixture-id',
      }, status: status);
      final result = await AiWireRepository(t).readTopicReadState(
        token: 'fixture',
        abort: AiAbortSignal(),
        conversationId: topic,
      );
      expect((result as Failure<AiTopicReadState>).failure.kind, kind);
      expect(result.failure.message, isNot(contains('private')));
      expect(t.requests, hasLength(1));
    }
  });
}

final class _Transport implements AiWireTransport {
  _Transport(this.response, {this.status = 200});
  final Object response;
  final int status;
  final requests = <AiWireRequest>[];
  @override
  Future<AiWireResponse> send(AiWireRequest request) async {
    requests.add(request);
    return AiWireResponse(statusCode: status, body: jsonEncode(response));
  }
}
