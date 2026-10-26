import 'dart:async';
import 'dart:convert';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/proactive/data/http_proactive_repository.dart';
import 'package:enmori/features/proactive/domain/proactive.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

const topic = '00000000-0000-4000-8000-000000000001';
const source = '00000000-0000-4000-8000-000000000002';
const intent = '00000000-0000-4000-8000-000000000003';
final due = DateTime.utc(2026, 10, 26, 8, 30);
Map<String, Object?> settingsJson({
  int revision = 0,
  String mode = 'off',
  String zone = '',
}) => {
  'revision': revision,
  'mode': mode,
  'categories': mode == 'on' ? ['explicit_follow_up'] : [],
  'timeZone': zone,
  'quiet': {'kind': 'window', 'startMinute': 1320, 'endMinute': 480},
  'maximumInRolling24h': 1,
  'cooldownMinutes': 480,
  'pushEnabled': false,
  'preview': 'generic',
};
Map<String, Object?> intentJson({String state = 'queued'}) => {
  'intentId': intent,
  'revision': 0,
  'state': state,
  'dueAt': due.toIso8601String(),
  'expiresAt': due.add(const Duration(hours: 2)).toIso8601String(),
  'category': 'explicit_follow_up',
  'conversationId': topic,
};
CreateFollowUp command() => CreateFollowUp(
  intentId: intent,
  conversationId: topic,
  sourceMessageId: source,
  time: FollowUpTime(
    dueAt: due,
    timeZone: 'Asia/Singapore',
    displayTime: '2026-10-26 16:30',
    offsetLabel: 'UTC+08:00',
  ),
  expectedSettingsRevision: 1,
);

void main() {
  test('initial off has no selected zone and is not fabricated UTC', () async {
    final repo = _repo(
      (r) async => http.Response(jsonEncode(settingsJson()), 200),
    );
    final result = await repo.readSettings(
      token: 'fixture',
      abort: ProactiveAbortSignal(),
    );
    expect(result, isA<Success<ProactiveSettings>>());
    final value = (result as Success<ProactiveSettings>).value;
    expect(value.timeZone, isEmpty);
    expect(value.mode, ProactiveMode.off);
    expect(value.pushEnabled, isFalse);
    expect(value.categories, isEmpty);
  });
  test('only revision-zero off may use an unselected zone', () async {
    final repo = _repo(
      (r) async => http.Response(jsonEncode(settingsJson(revision: 1)), 200),
    );
    expect(
      await repo.readSettings(token: 'fixture', abort: ProactiveAbortSignal()),
      isA<Failure<ProactiveSettings>>(),
    );
  });
  test('create sends exact IDs/local/time/revision and one UUID header, never source text', () async {
    final requests = <http.Request>[];
    final repo = _repo((r) async {
      requests.add(r);
      return http.Response(jsonEncode(intentJson()), 201);
    });
    final result = await repo.createIntent(
      token: 'fixture',
      abort: ProactiveAbortSignal(),
      command: command(),
    );
    expect(result, isA<Success<FollowUpIntent>>());
    expect(requests, hasLength(1));
    final request = requests.single;
    expect(request.method, 'POST');
    expect(request.url.path, '/v1/me/proactive-intents');
    expect(request.headers['Idempotency-Key'], intent);
    expect(request.followRedirects, isFalse);
    expect(jsonDecode(request.body), {
      'conversationId': topic,
      'sourceMessageId': source,
      'category': 'explicit_follow_up',
      'dueAt': due.toIso8601String(),
      'timeZone': 'Asia/Singapore',
      'processing': 'local',
      'expectedSettingsRevision': 1,
    });
    expect(
      request.headers.keys.any((v) => v.toLowerCase() == 'ai-operation-key'),
      isFalse,
    );
  });
  test(
    'minimal public status accepts provider acceptance without delivery fields',
    () async {
      final repo = _repo(
        (r) async => http.Response(
          jsonEncode({
            ...intentJson(state: 'accepted'),
            'recallPossible': false,
          }),
          200,
        ),
      );
      final result = await repo.readIntent(
        token: 'fixture',
        abort: ProactiveAbortSignal(),
        intentId: intent,
      );
      expect(
        (result as Success<FollowUpIntent>).value.state,
        FollowUpIntentState.accepted,
      );
      expect(result.value.recallPossible, isFalse);
    },
  );
  test('private grants/sources/internal dispatch cannot enter the public projection', () async {
    final repo = _repo(
      (r) async => http.Response(
        jsonEncode({
          ...intentJson(),
          'sourceMessageId': source,
          'dispatchState': 'accepted',
        }),
        200,
      ),
    );
    expect(
      await repo.readIntent(
        token: 'fixture',
        abort: ProactiveAbortSignal(),
        intentId: intent,
      ),
      isA<Failure<FollowUpIntent>>(),
    );
  });
  test('wrong create ACK identity is unresolved instead of success', () async {
    final repo = _repo(
      (r) async => http.Response(
        jsonEncode({...intentJson(), 'conversationId': source}),
        201,
      ),
    );
    final result = await repo.createIntent(
      token: 'fixture',
      abort: ProactiveAbortSignal(),
      command: command(),
    );
    expect(
      (result as Failure<FollowUpIntent>).failure.kind,
      AppFailureKind.aiOutcomeUnresolved,
    );
  });
  test(
    'DELETE uses only JSON revision and keeps irreversible status',
    () async {
      late http.Request sent;
      final repo = _repo((r) async {
        sent = r;
        return http.Response(
          jsonEncode({
            ...intentJson(state: 'unknown'),
            'recallPossible': false,
          }),
          200,
        );
      });
      final result = await repo.cancelIntent(
        token: 'fixture',
        abort: ProactiveAbortSignal(),
        intentId: intent,
        expectedRevision: 4,
      );
      expect(sent.method, 'DELETE');
      expect(sent.url.query, isEmpty);
      expect(sent.headers['If-Match'], isNull);
      expect(jsonDecode(sent.body), {'expectedRevision': 4});
      expect(
        (result as Success<FollowUpIntent>).value.state,
        FollowUpIntentState.unknown,
      );
    },
  );
  for (final (status, code, kind) in [
    (404, 'AI_SOURCE_UNAVAILABLE', AppFailureKind.aiSourceUnavailable),
    (
      409,
      'AI_CONTEXT_SELECTION_CONFLICT',
      AppFailureKind.aiContextSelectionConflict,
    ),
    (
      412,
      'PROACTIVE_REVISION_PRECONDITION_FAILED',
      AppFailureKind.proactiveRevisionPreconditionFailed,
    ),
    (422, 'PROACTIVE_INPUT_INVALID', AppFailureKind.proactiveInputInvalid),
    (503, 'AI_OUTCOME_UNRESOLVED', AppFailureKind.aiOutcomeUnresolved),
  ]) {
    test('N01 $code has top-level requestId and safe local copy', () async {
      final repo = _repo(
        (r) async => http.Response(
          jsonEncode({
            'error': {'code': code, 'message': 'private vendor payload'},
            'requestId': 'fixture-request',
          }),
          status,
        ),
      );
      final result = await repo.createIntent(
        token: 'fixture',
        abort: ProactiveAbortSignal(),
        command: command(),
      );
      final failure = (result as Failure<FollowUpIntent>).failure;
      expect(failure.kind, kind);
      expect(failure.message, isNot(contains('private vendor')));
    });
  }
  test(
    'wrong legacy nested error envelope does not claim a confirmed rejection',
    () async {
      final repo = _repo(
        (r) async => http.Response(
          jsonEncode({
            'error': {
              'code': 'PROACTIVE_INPUT_INVALID',
              'message': 'bad',
              'requestId': 'fixture',
            },
          }),
          422,
        ),
      );
      final result = await repo.createIntent(
        token: 'fixture',
        abort: ProactiveAbortSignal(),
        command: command(),
      );
      expect(
        (result as Failure<FollowUpIntent>).failure.kind,
        AppFailureKind.aiOutcomeUnresolved,
      );
    },
  );
  for (final status in [307, 503]) {
    test(
      '$status makes one HTTP attempt and never redirects/retries',
      () async {
        var calls = 0;
        final repo = _repo((r) async {
          calls++;
          expect(r.followRedirects, isFalse);
          return http.Response(
            '',
            status,
            headers: {'location': 'https://other.invalid'},
          );
        });
        expect(
          await repo.createIntent(
            token: 'fixture',
            abort: ProactiveAbortSignal(),
            command: command(),
          ),
          isA<Failure<FollowUpIntent>>(),
        );
        expect(calls, 1);
      },
    );
  }
  test(
    'aborted uncertain create cannot accept a late body or replay',
    () async {
      final gate = Completer<http.Response>();
      var calls = 0;
      final repo = _repo((r) {
        calls++;
        return gate.future;
      });
      final abort = ProactiveAbortSignal();
      final request = repo.createIntent(
        token: 'fixture',
        abort: abort,
        command: command(),
      );
      await Future<void>.delayed(Duration.zero);
      abort.abort();
      final result = await request;
      expect(
        (result as Failure<FollowUpIntent>).failure.kind,
        AppFailureKind.aiOutcomeUnresolved,
      );
      gate.complete(http.Response(jsonEncode(intentJson()), 201));
      await Future<void>.delayed(Duration.zero);
      expect(calls, 1);
    },
  );
  test('failed active read is not an empty successful set', () async {
    final repo = _repo((r) async => http.Response('', 503));
    expect(
      await repo.readActiveIntents(
        token: 'fixture',
        abort: ProactiveAbortSignal(),
      ),
      isA<Failure<List<FollowUpIntent>>>(),
    );
  });
  test(
    'bounded complete active set rejects duplicates and overlong lists',
    () async {
      for (final count in [2, 4]) {
        final repo = _repo(
          (r) async => http.Response(
            jsonEncode({'intents': List.generate(count, (_) => intentJson())}),
            200,
          ),
        );
        expect(
          await repo.readActiveIntents(
            token: 'fixture',
            abort: ProactiveAbortSignal(),
          ),
          isA<Failure<List<FollowUpIntent>>>(),
        );
      }
    },
  );
  test(
    'calendar normalization or noncanonical UTC cannot prove an intent receipt',
    () async {
      for (final date in [
        '2026-02-30T08:30:00.000Z',
        '2026-10-26T08:30:00',
        '2026-10-26T08:30:00Z',
      ]) {
        final repo = _repo(
          (r) async =>
              http.Response(jsonEncode({...intentJson(), 'dueAt': date}), 200),
        );
        expect(
          await repo.readIntent(
            token: 'fixture',
            abort: ProactiveAbortSignal(),
            intentId: intent,
          ),
          isA<Failure<FollowUpIntent>>(),
        );
      }
    },
  );
  test(
    'backend URL cannot carry credentials, a subpath or redirect policy',
    () {
      for (final uri in [
        'http://api.invalid',
        'https://name:secret@api.invalid',
        'https://api.invalid/subpath',
        'https://api.invalid/?x=1',
      ]) {
        expect(
          () => HttpProactiveRepository(
            baseUri: Uri.parse(uri),
            client: MockClient((r) async => http.Response('', 500)),
          ),
          throwsArgumentError,
        );
      }
    },
  );
}

HttpProactiveRepository _repo(
  Future<http.Response> Function(http.Request) handler,
) => HttpProactiveRepository(
  baseUri: Uri.parse('https://api.invalid'),
  client: MockClient(handler),
);
