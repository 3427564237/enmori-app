import 'dart:async';
import 'dart:convert';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/ai_conversation/data/ai_wire_repository.dart';
import 'package:enmori/features/ai_conversation/data/ai_wire_transport.dart';
import 'package:enmori/features/ai_conversation/domain/ai_conversation.dart';
import 'package:enmori/features/ai_conversation/domain/ai_selected_reply.dart';
import 'package:flutter_test/flutter_test.dart';

String id(int value) =>
    '${value.toString().padLeft(8, '0')}-1111-4111-8111-111111111111';
final operationKey = base64Url.encode(List.filled(32, 1)).replaceAll('=', '');
const expires = '2026-10-25T00:00:15.000Z';
Map<String, dynamic> preparation() => {
  'operationId': id(1),
  'conversationId': id(2),
  'operationKey': operationKey,
  'preparationExpiresAt': expires,
  'contextSelection': {
    'selectionRevision': id(3), 'expiresAt': expires,
    'sourceCards': [
      {
        'selectionKey': id(4),
        'cardRef': id(5),
        'kind': 'check_in',
        'version': 'opaque-version',
        'sourceOccurredAt': '2026-10-23T06:00:00.123456789Z',
        'observedAt': '2026-10-25T00:00:00.123456789Z',
        'state': 'available',
        'canNavigate': true,
      },
    ],
    // A successful late Retry of U1 follows the already completed U2/A3 pair.
    'historyPairs': [
      {
        'historyKey': id(6),
        'userMessageId': id(7),
        'assistantMessageId': id(8),
        'userSequence': 2,
        'assistantSequence': 3,
      },
      {
        'historyKey': id(9),
        'userMessageId': id(10),
        'assistantMessageId': id(11),
        'userSequence': 1,
        'assistantSequence': 4,
      },
    ],
  },
};
Map<String, dynamic> reply() => {
  'operationId': id(1),
  'conversationId': id(2),
  'userMessage': {
    'messageId': id(12),
    'sequence': 5,
    'role': 'user',
    'persistedAt': '2026-10-25T00:00:03Z',
    'availability': 'available',
    'text': 'My real question',
  },
  'assistantMessage': {
    'messageId': id(13),
    'sequence': 6,
    'role': 'assistant',
    'persistedAt': '2026-10-25T00:00:04Z',
    'availability': 'available',
    'text': 'A synthetic answer',
  },
};

void main() {
  test('today prepare sends only IANA zone and parses explicit owner IDs and server day', () async {
    final dto=preparation();
    dto['contextSelection']['today']={'date':'2026-10-25','timeZone':'Asia/Singapore','limit':5,'hasMore':false};
    dto['contextSelection']['sourceCards'][0]['checkInId']='own-check-in';
    final transport=_Transport(dto,201);
    final result=await AiWireRepository(transport).prepareToday(token:'t',abort:AiAbortSignal(),timeZone:'Asia/Singapore');
    final selection=(result as Success<AiSelectedReplyTicket>).value.selection;
    expect(jsonDecode(transport.requests.single.body!),{
      'kind':'send','purpose':'checkin_conversation',
      'contextSelection':{'processing':'local','today':{'timeZone':'Asia/Singapore'}},
    });
    expect(selection.today!.date,'2026-10-25');
    expect(selection.today!.limit,5);
    expect(selection.sourceCards.single.checkInId,'own-check-in');
    expect(selection.sourceCards.single.card.version,'opaque-version');
  });

  test('today zero is valid but missing or invalid day/owner metadata is unknown', () async {
    Map<String,dynamic> automatic() {
      final dto=preparation();
      dto['contextSelection']['today']={'date':'2026-10-25','timeZone':'Asia/Singapore','limit':5,'hasMore':false};
      dto['contextSelection']['sourceCards'][0]['checkInId']='own-check-in';
      return dto;
    }
    final changes=<void Function(Map<String,dynamic>)>[
      (d)=>d['contextSelection'].remove('today'),
      (d)=>d['contextSelection']['today']['date']='2026-02-30',
      (d)=>d['contextSelection']['today']['timeZone']='UTC',
      (d)=>d['contextSelection']['today']['limit']=6,
      (d)=>d['contextSelection']['sourceCards'][0].remove('checkInId'),
    ];
    for(final change in changes) {
      final dto=automatic();change(dto);
      expect(await AiWireRepository(_Transport(dto,201)).prepareToday(
        token:'t',abort:AiAbortSignal(),timeZone:'Asia/Singapore'),isA<Failure<AiSelectedReplyTicket>>());
    }
    final empty=automatic();empty['contextSelection']['sourceCards']=[];
    final result=await AiWireRepository(_Transport(empty,201)).prepareToday(
      token:'t',abort:AiAbortSignal(),timeZone:'Asia/Singapore');
    expect((result as Success<AiSelectedReplyTicket>).value.selection.sourceCards,isEmpty);
  });

  test('prepare sends only explicit local IDs and accepts minimized late-Retry metadata', () async {
    final transport = _Transport(preparation(), 201);
    final result = await AiWireRepository(transport).prepareSelected(
      token: 'original-token',
      abort: AiAbortSignal(),
      conversationId: id(2),
      sourceIds: ['own-check-in'],
    );
    final ticket = (result as Success<AiSelectedReplyTicket>).value;
    final request = transport.requests.single;
    expect(request.path, '/v1/me/ai/operations');
    expect(request.headers['Authorization'], 'Bearer original-token');
    expect(jsonDecode(request.body!), {
      'kind': 'send',
      'purpose': 'checkin_conversation',
      'conversationId': id(2),
      'contextSelection': {
        'processing': 'local',
        'sources': [
          {'kind': 'check_in', 'checkInId': 'own-check-in'},
        ],
      },
    });
    expect(
      ticket.selection.sourceCards.single.card.sourceOccurredAt,
      '2026-10-23T06:00:00.123456789Z',
    );
    expect(ticket.selection.historyPairs.map((p) => p.userSequence), [2, 1]);
    expect(() => ticket.selection.historyPairs.clear(), throwsUnsupportedError);
    expect(() => ticket.selection.sourceCards.clear(), throwsUnsupportedError);
  });

  test('selected retry retains the exact saved user ID, and zero-source review is explicit', () async {
    final dto = preparation();
    dto['contextSelection']['sourceCards'] = [];
    final transport = _Transport(dto, 201);
    final result = await AiWireRepository(transport).prepareSelected(
      token: 'original-token',
      abort: AiAbortSignal(),
      conversationId: id(2),
      userMessageId: id(10),
      sourceIds: [],
    );
    expect(result, isA<Success<AiSelectedReplyTicket>>());
    expect(jsonDecode(transport.requests.single.body!), {
      'kind': 'retry',
      'purpose': 'checkin_conversation',
      'conversationId': id(2),
      'userMessageId': id(10),
      'contextSelection': {'processing': 'local', 'sources': []},
    });
  });

  test('invalid source lists and an unbound retry never dispatch', () async {
    final transport = _Transport(preparation(), 201);
    final repo = AiWireRepository(transport);
    for (final ids in [
      List.generate(6, (i) => 'id-$i'),
      ['a', 'a'],
      ['a/b'],
      ['..'],
      ['__reserved__'],
      ['😀' * 376],
    ]) {
      expect(
        await repo.prepareSelected(
          token: 't',
          abort: AiAbortSignal(),
          sourceIds: ids,
        ),
        isA<Failure<AiSelectedReplyTicket>>(),
      );
    }
    expect(
      await repo.prepareSelected(
        token: 't',
        abort: AiAbortSignal(),
        userMessageId: id(10),
        sourceIds: [],
      ),
      isA<Failure<AiSelectedReplyTicket>>(),
    );
    expect(transport.requests, isEmpty);
  });

  test(
    'malformed, mismatched or content-rich selection metadata is rejected',
    () async {
      final changes = <void Function(Map<String, dynamic>)>[
        (d) => d.remove('contextSelection'),
        (d) => d['contextSelection']['sourceCards'][0]['noteText'] =
            'must-not-project',
        (d) => d['contextSelection'].remove('historyPairs'),
        (d) => d['contextSelection']['expiresAt'] = '2026-10-25T00:00:16Z',
        (d) => d['contextSelection']['sourceCards'] = [],
        (d) => d['contextSelection']['sourceCards'][0]['kind'] =
            'conversation_message',
        (d) => d['contextSelection']['historyPairs'][1]['historyKey'] = id(4),
        (d) => d['contextSelection']['historyPairs'][1]['userSequence'] = 2,
        (d) => d['contextSelection']['historyPairs'][1]['assistantMessageId'] =
            id(8),
        (d) => d['contextSelection']['historyPairs'] =
            (d['contextSelection']['historyPairs'] as List).reversed.toList(),
        (d) => d['conversationId'] = id(99),
      ];
      for (final change in changes) {
        final dto = preparation();
        change(dto);
        final transport = _Transport(dto, 201);
        final result = await AiWireRepository(transport).prepareSelected(
          token: 't',
          abort: AiAbortSignal(),
          conversationId: id(2),
          sourceIds: ['own-check-in'],
        );
        expect(result, isA<Failure<AiSelectedReplyTicket>>());
        expect(transport.requests, hasLength(1));
      }
    },
  );

  test('execute sends the reviewed ticket, explicit exclusions and original operation key once', () async {
    final transport = _Transport(preparation(), 201);
    final repo = AiWireRepository(transport);
    final ticket = await prepared(repo);
    transport.response = AiWireResponse(
      statusCode: 200,
      body: jsonEncode(reply()),
    );
    final result = await repo.executeSelected(
      token: 'original-token',
      abort: AiAbortSignal(),
      ticket: ticket,
      text: 'My real question',
      includedKeys: [id(4)],
      excludedKeys: [id(4)],
      excludedHistoryKeys: [id(9)],
      replyToMessageId: id(20),
    );
    expect(result, isA<Success<AiReply>>());
    expect(transport.requests, hasLength(2));
    final request = transport.requests.last;
    expect(request.path, '/v1/me/ai/operations/${id(1)}/execute');
    expect(request.headers['AI-Operation-Key'], operationKey);
    expect(request.headers['Authorization'], 'Bearer original-token');
    expect(jsonDecode(request.body!), {
      'text': 'My real question',
      'replyToMessageId': id(20),
      'contextSelection': {
        'selectionRevision': id(3),
        'includedKeys': [id(4)],
        'excludedKeys': [id(4)],
        'excludedHistoryKeys': [id(9)],
      },
    });
  });

  test(
    'foreign, duplicate and incomplete choices never dispatch an execute',
    () async {
      final transport = _Transport(preparation(), 201);
      final repo = AiWireRepository(transport);
      final ticket = await prepared(repo);
      for (final choice in [
        (<String>[], <String>[], <String>[]),
        ([id(99)], [id(4)], <String>[]),
        ([id(4), id(4)], <String>[], <String>[]),
        ([id(4)], <String>[], [id(99)]),
        ([id(4)], <String>[], [id(6), id(6)]),
      ]) {
        expect(
          await repo.executeSelected(
            token: 'original-token',
            abort: AiAbortSignal(),
            ticket: ticket,
            text: 'My real question',
            includedKeys: choice.$1,
            excludedKeys: choice.$2,
            excludedHistoryKeys: choice.$3,
          ),
          isA<Failure<AiReply>>(),
        );
      }
      expect(transport.requests, hasLength(1));
    },
  );

  test('selection conflict preserves its error without retry or ordinary-send fallback', () async {
    final transport = _Transport(preparation(), 201);
    final repo = AiWireRepository(transport);
    final ticket = await prepared(repo);
    transport.response = AiWireResponse(
      statusCode: 409,
      body: jsonEncode({
        'error': {
          'code': 'AI_CONTEXT_SELECTION_CONFLICT',
          'message': 'Changed selection',
        },
        'requestId': 'fixture',
      }),
    );
    final result = await repo.executeSelected(
      token: 'original-token',
      abort: AiAbortSignal(),
      ticket: ticket,
      text: 'My real question',
      includedKeys: [id(4)],
      excludedKeys: [],
      excludedHistoryKeys: [],
    );
    expect(
      (result as Failure<AiReply>).failure.kind,
      AppFailureKind.aiContextSelectionConflict,
    );
    expect(transport.requests, hasLength(2));
  });

  test('a late aborted selected execute remains unresolved and never repeats dispatch', () async {
    final transport = _Transport(preparation(), 201);
    final repo = AiWireRepository(transport);
    final ticket = await prepared(repo);
    final pending = Completer<AiWireResponse>();
    transport.pending = pending.future;
    final abort = AiAbortSignal();
    final result = repo.executeSelected(
      token: 'original-token',
      abort: abort,
      ticket: ticket,
      text: 'My real question',
      includedKeys: [id(4)],
      excludedKeys: [],
      excludedHistoryKeys: [],
    );
    abort.abort();
    expect(
      (await result as Failure<AiReply>).failure.kind,
      AppFailureKind.aiOutcomeUnresolved,
    );
    pending.complete(
      AiWireResponse(statusCode: 200, body: jsonEncode(reply())),
    );
    await Future<void>.delayed(Duration.zero);
    expect(transport.requests, hasLength(2));
  });
}

Future<AiSelectedReplyTicket> prepared(AiWireRepository repo) async =>
    (await repo.prepareSelected(
      token: 'original-token',
      abort: AiAbortSignal(),
      conversationId: id(2),
      sourceIds: ['own-check-in'],
    ) as Success<AiSelectedReplyTicket>).value;

final class _Transport implements AiWireTransport {
  _Transport(Object body, int status)
    : response = AiWireResponse(statusCode: status, body: jsonEncode(body));
  AiWireResponse response;
  Future<AiWireResponse>? pending;
  final requests = <AiWireRequest>[];
  @override
  Future<AiWireResponse> send(AiWireRequest request) async {
    requests.add(request);
    return pending == null ? response : await pending!;
  }
}
