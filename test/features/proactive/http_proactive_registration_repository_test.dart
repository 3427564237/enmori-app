import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/proactive/data/http_proactive_registration_repository.dart';
import 'package:enmori/features/proactive/domain/proactive.dart';
import 'package:enmori/features/proactive/domain/proactive_messaging.dart';

const installation = '00000000-0000-4000-8000-000000000001';
Map<String, Object?> metadata({int revision = 1, bool enabled = true}) => {
  'revision': revision,
  'enabled': enabled,
  'availability': enabled ? 'registered' : 'unregistered',
  if (enabled) 'installationRef': installation,
  if (enabled) 'expiresAt': '2026-10-25T10:45:00.000Z',
};

final class Client extends http.BaseClient {
  Client(this.handler);
  final Future<http.StreamedResponse> Function(http.BaseRequest) handler;
  final requests = <http.BaseRequest>[];
  int closes = 0;
  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) {
    requests.add(request);
    return handler(request);
  }

  @override
  void close() {
    closes++;
  }
}

http.StreamedResponse response(Object? body, {int status = 200}) =>
    http.StreamedResponse(Stream.value(utf8.encode(jsonEncode(body))), status);
HttpProactiveRegistrationRepository repo(Client c) =>
    HttpProactiveRegistrationRepository(
      baseUri: Uri.parse('https://backend.example.test'),
      client: c,
    );
Future<Result<ProactiveRegistration>> put(
  HttpProactiveRegistrationRepository r, {
  String value = 'synthetic-fcm-token',
}) => r.replace(
  token: 'synthetic-bearer',
  abort: ProactiveAbortSignal(),
  expectedRevision: 0,
  installationRef: installation,
  registrationValue: value,
);

void main() {
  test('exact registration command and allowlisted metadata, without SDK or provider request', () async {
    final c = Client((request) async {
      expect(
        request.url.toString(),
        'https://backend.example.test/v1/me/proactive-registration',
      );
      expect(request.method, 'PUT');
      expect(request.followRedirects, isFalse);
      expect(
        request.headers.keys.map((v) => v.toLowerCase()),
        isNot(contains('idempotency-key')),
      );
      expect(jsonDecode((request as http.Request).body), {
        'expectedRevision': 0,
        'installationRef': installation,
        'registrationKind': 'fcm_token',
        'registrationValue': 'synthetic-fcm-token',
        'enabled': true,
      });
      return response(metadata());
    });
    final result = await put(repo(c));
    expect(result, isA<Success<ProactiveRegistration>>());
    final value = (result as Success<ProactiveRegistration>).value;
    expect(value.installationRef, installation);
    expect(value.revision, 1);
    expect(c.requests, hasLength(1));
    expect(c.closes, 0);
  });
  test('GET absent is explicitly unregistered; DELETE uses only JSON CAS, including disabled no-op', () async {
    final c = Client(
      (request) async => response(metadata(revision: 0, enabled: false)),
    );
    final r = repo(c);
    expect(
      await r.read(token: 'fixture', abort: ProactiveAbortSignal()),
      isA<Success<ProactiveRegistration>>(),
    );
    final result = await r.delete(
      token: 'fixture',
      abort: ProactiveAbortSignal(),
      expectedRevision: 0,
      installationRef: installation,
    );
    expect(result, isA<Success<ProactiveRegistration>>());
    expect(c.requests.map((r) => r.method), ['GET', 'DELETE']);
    expect((c.requests.first as http.Request).body, isEmpty);
    expect(jsonDecode((c.requests.last as http.Request).body), {
      'expectedRevision': 0,
      'installationRef': installation,
    });
  });
  test('secret echo, unknown fields, inconsistent states and noncanonical dates reject the complete result', () async {
    for (final row in [
      {...metadata(), 'registrationValue': 'private-canary'},
      {...metadata(), 'owner': 'private-canary'},
      {...metadata(), 'enabled': false},
      {...metadata(), 'expiresAt': '2026-10-25T10:45:00Z'},
      {...metadata(), 'availability': 'missing'},
      {...metadata(), 'revision': 9007199254740992},
      {...metadata(), 'expiresAt': '2026-02-31T10:45:00.000Z'},
    ]) {
      final c = Client((_) async => response(row));
      final r = repo(c);
      final read = await r.read(
        token: 'fixture',
        abort: ProactiveAbortSignal(),
      );
      expect(read, isA<Failure<ProactiveRegistration>>());
      expect((read as Failure).failure.message, isNot(contains('private')));
      final write = await put(r);
      expect(
        (write as Failure).failure.kind,
        AppFailureKind.aiOutcomeUnresolved,
      );
    }
  });
  test('invalid UTF-16, oversized UTF-8, control values and invalid installation perform no request', () async {
    final c = Client((_) async => response(metadata()));
    final r = repo(c);
    for (final value in ['', ' ', '\ud800', '界' * 1366, 'bad\nvalue']) {
      expect(await put(r, value: value), isA<Failure>());
    }
    expect(
      await r.delete(
        token: 'fixture',
        abort: ProactiveAbortSignal(),
        expectedRevision: 1,
        installationRef: 'bad',
      ),
      isA<Failure>(),
    );
    expect(c.requests, isEmpty);
  });
  test('412 and unknown are distinct; errors never use provider text and are not retried', () async {
    for (final (status, code, kind) in [
      (
        412,
        'PROACTIVE_REVISION_PRECONDITION_FAILED',
        AppFailureKind.proactiveRevisionPreconditionFailed,
      ),
      (503, 'AI_OUTCOME_UNRESOLVED', AppFailureKind.aiOutcomeUnresolved),
    ]) {
      final c = Client(
        (_) async => response({
          'error': {'code': code, 'message': 'private-provider-body'},
          'requestId': 'synthetic-request',
        }, status: status),
      );
      final result = await put(repo(c));
      expect((result as Failure).failure.kind, kind);
      expect((result as Failure).failure.message, isNot(contains('private')));
      expect(c.requests, hasLength(1));
    }
  });
  test('abort after submission stays unknown, late completion is discarded, caller client stays open', () async {
    final pending = Completer<http.StreamedResponse>();
    final c = Client((_) => pending.future), r = repo(c);
    final abort = ProactiveAbortSignal();
    final future = r.replace(
      token: 'fixture',
      abort: abort,
      expectedRevision: 0,
      installationRef: installation,
      registrationValue: 'synthetic',
    );
    abort.abort();
    expect(
      (await future as Failure).failure.kind,
      AppFailureKind.aiOutcomeUnresolved,
    );
    pending.complete(response(metadata()));
    await Future<void>.delayed(Duration.zero);
    expect(c.requests, hasLength(1));
    expect(c.closes, 0);
  });
  test('redirect, truncated UTF-8, oversized body and mismatched ACK are never success or replay', () async {
    final callbacks =
        <Future<http.StreamedResponse> Function(http.BaseRequest)>[
          (_) async => response(null, status: 302),
          (_) async => http.StreamedResponse(Stream.value([0xc3, 0x28]), 200),
          (_) async =>
              http.StreamedResponse(Stream.value(List.filled(8193, 32)), 200),
          (_) async => response({...metadata(), 'revision': 9}),
        ];
    for (final callback in callbacks) {
      final c = Client(callback);
      expect(await put(repo(c)), isA<Failure>());
      expect(c.requests, hasLength(1));
    }
  });
  test(
    'base URI restrictions and pre-aborted request require no transport',
    () async {
      final c = Client((_) async => response(metadata()));
      expect(
        () => HttpProactiveRegistrationRepository(
          baseUri: Uri.parse('http://public.example'),
          client: c,
        ),
        throwsArgumentError,
      );
      final abort = ProactiveAbortSignal()..abort();
      expect(
        await repo(c).read(token: 'fixture', abort: abort),
        isA<Failure>(),
      );
      expect(c.requests, isEmpty);
    },
  );
}
