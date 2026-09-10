import 'dart:async';
import 'dart:convert';

import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/data/backend_account_repository.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/check_in/data/backend_check_in_repository.dart';
import 'package:enmori/features/check_in/domain/check_in_repository.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  group('BackendApiClient', () {
    test('rejects non-HTTPS configuration before token or request', () async {
      for (final uri in [
        Uri.parse('http://example.invalid'),
        Uri.parse('ftp://example.invalid'),
      ]) {
        var tokenCalls = 0;
        var requestCalls = 0;
        final client = BackendApiClient(
          uri,
          () async {
            tokenCalls++;
            return const Success('synthetic-token');
          },
          httpClient: MockClient((request) async {
            requestCalls++;
            return http.Response('{}', 200);
          }),
        );

        final result = await client.get('/v1/me/onboarding');
        client.close();

        expect(
          (result as Failure<JsonObject>).failure.kind,
          AppFailureKind.configurationUnavailable,
        );
        expect(tokenCalls, 0);
        expect(requestCalls, 0);
      }
    });

    test('bounds token acquisition without sending a request', () async {
      final token = Completer<Result<String>>();
      var requestCalls = 0;
      final client = BackendApiClient(
        Uri.parse('https://example.invalid'),
        () => token.future,
        httpClient: MockClient((request) async {
          requestCalls++;
          return http.Response('{}', 200);
        }),
        operationTimeout: const Duration(milliseconds: 10),
      );

      final result = await client.get('/v1/me/onboarding');
      client.close();

      expect(
        (result as Failure<JsonObject>).failure.kind,
        AppFailureKind.serviceUnavailable,
      );
      expect(requestCalls, 0);
    });

    test('bounds waiting for response headers', () async {
      final response = Completer<http.Response>();
      final client = BackendApiClient(
        Uri.parse('https://example.invalid'),
        () async => const Success('synthetic-token'),
        httpClient: MockClient((request) => response.future),
        operationTimeout: const Duration(milliseconds: 10),
      );

      final result = await client.get('/v1/me/onboarding');
      client.close();

      expect(
        (result as Failure<JsonObject>).failure.kind,
        AppFailureKind.serviceUnavailable,
      );
    });

    test('bounds reading a response body', () async {
      final body = StreamController<List<int>>();
      addTearDown(body.close);
      final client = BackendApiClient(
        Uri.parse('https://example.invalid'),
        () async => const Success('synthetic-token'),
        httpClient: _HangingBodyClient(body.stream),
        operationTimeout: const Duration(milliseconds: 10),
      );

      final result = await client.get('/v1/me/onboarding');
      client.close();

      expect(
        (result as Failure<JsonObject>).failure.kind,
        AppFailureKind.serviceUnavailable,
      );
    });

    test('rejects missing and non-string request IDs', () async {
      final invalidErrors = <Map<String, Object?>>[
        {'code': 'SERVICE_UNAVAILABLE', 'message': 'Unsafe remote message.'},
        {
          'code': 'SERVICE_UNAVAILABLE',
          'message': 'Unsafe remote message.',
          'requestId': 42,
        },
      ];

      for (final error in invalidErrors) {
        final client = _client(
          (request) async => http.Response(jsonEncode({'error': error}), 503),
        );
        final result = await client.get('/v1/test');
        client.close();

        final failure = (result as Failure<JsonObject>).failure;
        expect(failure.kind, AppFailureKind.serviceUnavailable);
        expect(failure.message, 'The service is unavailable. Try again.');
        expect(failure.requestId, isNull);
      }
    });

    test(
      'rejects an unknown error code without exposing its message',
      () async {
        final client = _client(
          (request) async => http.Response(
            jsonEncode({
              'error': {
                'code': 'UNKNOWN_REMOTE_CODE',
                'message': 'Unsafe remote message.',
                'requestId': 'req_test',
              },
            }),
            500,
          ),
        );

        final result = await client.get('/v1/test');
        client.close();

        final failure = (result as Failure<JsonObject>).failure;
        expect(failure.kind, AppFailureKind.serviceUnavailable);
        expect(failure.message, 'The service is unavailable. Try again.');
        expect(failure.requestId, isNull);
      },
    );

    test('maps an invalid idempotency key as its own stable failure', () async {
      final client = _client(
        (request) async => http.Response(
          jsonEncode({
            'error': {
              'code': 'IDEMPOTENCY_KEY_INVALID',
              'message': 'Provide a valid request key and try again.',
              'requestId': 'req_idempotency_key',
            },
          }),
          400,
        ),
      );

      final result = await client.post(
        '/v1/check-ins',
        body: {'note': 'First Check-in'},
        idempotencyKey: 'abcdefghijklmnopqrstuv',
      );
      client.close();

      final failure = (result as Failure<JsonObject>).failure;
      expect(failure.kind, AppFailureKind.idempotencyKeyInvalid);
      expect(failure.message, 'Provide a valid request key and try again.');
      expect(failure.requestId, 'req_idempotency_key');
    });
  });

  group('BackendAccountRepository', () {
    test(
      'sends the approved Accept payload and parses the safe account',
      () async {
        late http.Request captured;
        final client = _client((request) async {
          captured = request;
          return http.Response(
            jsonEncode({
              'account': {
                'username': 'miku_01',
                'optionalProcessingConsent': 'accepted',
                'checkInVisibility': 'public',
                'onboardingCompletedAt': '2026-09-03T03:15:00Z',
              },
            }),
            201,
          );
        });
        final repository = BackendAccountRepository(client);

        final result = await repository.completeOnboarding(
          username: 'miku_01',
          initialChoice: InitialChoice.accept,
          idempotencyKey: 'abcdefghijklmnopqrstuv',
        );

        expect(captured.method, 'PUT');
        expect(captured.url.path, '/v1/me/onboarding');
        expect(captured.headers['authorization'], 'Bearer test-token');
        expect(captured.headers['idempotency-key'], 'abcdefghijklmnopqrstuv');
        expect(jsonDecode(captured.body), {
          'username': 'miku_01',
          'initialChoice': 'accept',
        });
        final account = (result as Success<ProductAccount>).value;
        expect(account.username, 'miku_01');
        expect(
          account.optionalProcessingConsent,
          OptionalProcessingConsent.accepted,
        );
        expect(account.checkInVisibility, CheckInVisibility.public);
      },
    );

    test('keeps incomplete onboarding distinct from completion', () async {
      final client = _client(
        (request) async =>
            http.Response(jsonEncode({'status': 'required'}), 200),
      );
      final repository = BackendAccountRepository(client);

      final result = await repository.readOnboardingStatus();

      expect(
        (result as Success<OnboardingStatus>).value,
        isA<OnboardingRequired>(),
      );
    });

    test('maps the Reject branch to rejected and private', () async {
      late http.Request captured;
      final client = _client((request) async {
        captured = request;
        return http.Response(
          jsonEncode({
            'account': {
              'username': 'miku_01',
              'optionalProcessingConsent': 'rejected',
              'checkInVisibility': 'private',
              'onboardingCompletedAt': '2026-09-03T03:15:00Z',
            },
          }),
          201,
        );
      });
      final repository = BackendAccountRepository(client);

      final result = await repository.completeOnboarding(
        username: 'miku_01',
        initialChoice: InitialChoice.reject,
        idempotencyKey: 'abcdefghijklmnopqrstuv',
      );

      expect(jsonDecode(captured.body), {
        'username': 'miku_01',
        'initialChoice': 'reject',
      });
      final account = (result as Success<ProductAccount>).value;
      expect(
        account.optionalProcessingConsent,
        OptionalProcessingConsent.rejected,
      );
      expect(account.checkInVisibility, CheckInVisibility.private);
    });

    test('rejects account timestamps that are not explicit UTC', () async {
      for (final timestamp in [
        '2026-09-03T03:15:00',
        '2026-09-03T11:15:00+08:00',
        'not-a-time',
      ]) {
        final client = _client(
          (request) async => http.Response(
            jsonEncode({
              'account': {
                'username': 'miku_01',
                'optionalProcessingConsent': 'accepted',
                'checkInVisibility': 'public',
                'onboardingCompletedAt': timestamp,
              },
            }),
            201,
          ),
        );
        final repository = BackendAccountRepository(client);

        final result = await repository.completeOnboarding(
          username: 'miku_01',
          initialChoice: InitialChoice.accept,
          idempotencyKey: 'abcdefghijklmnopqrstuv',
        );
        client.close();

        final failure = (result as Failure<ProductAccount>).failure;
        expect(failure.kind, AppFailureKind.unexpected);
      }
    });
  });

  group('BackendCheckInRepository', () {
    test('creates only the declared Note field', () async {
      late http.Request captured;
      final client = _client((request) async {
        captured = request;
        return http.Response(jsonEncode(_checkInEnvelope), 201);
      });
      final repository = BackendCheckInRepository(client);

      final result = await repository.create(
        note: 'A controlled test note.',
        idempotencyKey: 'abcdefghijklmnopqrstuv',
      );

      expect(captured.method, 'POST');
      expect(captured.url.path, '/v1/check-ins');
      expect(jsonDecode(captured.body), {'note': 'A controlled test note.'});
      expect((result as Success<CheckIn>).value.checkInId, 'chk_test');
    });

    test('performs a separate owner read with an encoded opaque id', () async {
      late http.Request captured;
      final client = _client((request) async {
        captured = request;
        return http.Response(jsonEncode(_checkInEnvelope), 200);
      });
      final repository = BackendCheckInRepository(client);

      final result = await repository.readOwned(checkInId: 'chk/id');

      expect(captured.method, 'GET');
      expect(captured.url.path, '/v1/check-ins/chk%2Fid');
      expect(
        (result as Success<CheckIn>).value.note,
        'A controlled test note.',
      );
    });

    test('maps the stable privacy-safe unavailable failure', () async {
      final client = _client(
        (request) async => http.Response(
          jsonEncode({
            'error': {
              'code': 'CHECKIN_UNAVAILABLE',
              'message': 'Check-in is unavailable.',
              'requestId': 'req_test',
            },
          }),
          404,
        ),
      );
      final repository = BackendCheckInRepository(client);

      final result = await repository.readOwned(checkInId: 'missing');

      final failure = (result as Failure<CheckIn>).failure;
      expect(failure.kind, AppFailureKind.checkInUnavailable);
      expect(failure.requestId, 'req_test');
    });

    test('rejects Check-in timestamps that are not explicit UTC', () async {
      for (final timestamp in [
        '2026-09-03T03:20:00',
        '2026-09-03T11:20:00+08:00',
        'not-a-time',
      ]) {
        final client = _client(
          (request) async => http.Response(
            jsonEncode({
              'checkIn': {
                'checkInId': 'chk_test',
                'note': 'A controlled test note.',
                'createdAt': timestamp,
              },
            }),
            201,
          ),
        );
        final repository = BackendCheckInRepository(client);

        final result = await repository.create(
          note: 'A controlled test note.',
          idempotencyKey: 'abcdefghijklmnopqrstuv',
        );
        client.close();

        final failure = (result as Failure<CheckIn>).failure;
        expect(failure.kind, AppFailureKind.unexpected);
      }
    });
  });
}

final class _HangingBodyClient extends http.BaseClient {
  _HangingBodyClient(this._body);

  final Stream<List<int>> _body;

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    return http.StreamedResponse(_body, 200);
  }
}

BackendApiClient _client(MockClientHandler handler) {
  return BackendApiClient(
    Uri.parse('https://example.invalid'),
    () async => const Success('test-token'),
    httpClient: MockClient(handler),
  );
}

const _checkInEnvelope = {
  'checkIn': {
    'checkInId': 'chk_test',
    'note': 'A controlled test note.',
    'createdAt': '2026-09-03T03:20:00Z',
  },
};
