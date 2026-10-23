import 'dart:async';
import 'dart:convert';

import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/interests/data/backend_admin_interest_repository.dart';
import 'package:enmori/features/interests/data/backend_interest_repository.dart';
import 'package:enmori/features/interests/domain/admin_interest_repository.dart';
import 'package:enmori/features/interests/domain/interest_repository.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  BackendAdminInterestRepository repository(
    Future<http.Response> Function(http.Request) handler, {
    Future<Result<String>> Function()? token,
    Duration timeout = const Duration(seconds: 15),
  }) {
    final client = BackendApiClient(
      Uri.parse('https://example.test'),
      token ?? () async => const Success('synthetic-token'),
      httpClient: MockClient(handler),
      operationTimeout: timeout,
    );
    addTearDown(client.close);
    return BackendAdminInterestRepository(client);
  }

  test('real adapter create -> independent catalogue -> ordinary selection shares stable identity', () async {
    final tags = <Map<String, Object?>>[
      {'interestTagId': 'original', 'displayName': 'Art'},
    ];
    final calls = <String>[];
    final client = BackendApiClient(
      Uri.parse('https://example.test'),
      () async => const Success('synthetic-token'),
      httpClient: MockClient((request) async {
        calls.add('${request.method} ${request.url.path}');
        expect(request.headers['Authorization'], 'Bearer synthetic-token');
        if (request.method == 'POST') {
          expect(jsonDecode(request.body), {'displayName': 'Photography'});
          tags.add({
            'interestTagId': 'server-id',
            'displayName': 'Photography',
          });
          return _response(201, {
            'interestTag': {
              ...tags.last,
              'lifecycleState': 'active',
              'revision': 1,
            },
          });
        }
        return _response(200, {'interestTags': tags});
      }),
    );
    addTearDown(client.close);
    final admin = BackendAdminInterestRepository(client);
    final created = await admin.create(
      displayName: 'Photography',
      current: () => true,
    ) as Success<CreatedInterestTag>;
    final reread = await admin.readCatalogue(
      current: () => true,
    ) as Success<List<InterestTagOption>>;
    final ordinary =
        await BackendInterestRepository(client).readSelectableTags()
            as Success<List<InterestTagOption>>;
    expect(created.value.interestTagId, 'server-id');
    expect(reread.value.last.interestTagId, created.value.interestTagId);
    expect(ordinary.value.last.interestTagId, 'server-id');
    expect(ordinary.value.first.interestTagId, 'original');
    expect(calls, [
      'POST /v1/admin/interest-tags',
      'GET /v1/interest-tags',
      'GET /v1/interest-tags',
    ]);
  });

  for (final allowed in [true, false]) {
    test('capability exact boolean $allowed', () async {
      final repo = repository((request) async {
        expect(request.method, 'GET');
        expect(request.url.path, '/v1/me/interest-tag-admin-capability');
        expect(request.body, isEmpty);
        return _response(200, {'canCreateInterestTags': allowed});
      });
      expect(
        (await repo.readCapability(current: () => true) as Success<bool>).value,
        allowed,
      );
    });
  }

  for (final body in [
    <String, Object?>{},
    {'canCreateInterestTags': 'true'},
    {'canCreateInterestTags': true, 'role': 'admin'},
  ]) {
    test('malformed capability fails closed: $body', () async {
      final repo = repository((_) async => _response(200, body));
      expect(
        await repo.readCapability(current: () => true),
        isA<Failure<bool>>(),
      );
    });
  }

  for (final item in [
    {
      'interestTagId': 'id',
      'displayName': 'Art',
      'lifecycleState': 'active',
      'revision': 1,
    },
    {'interestTagId': '', 'displayName': 'Art'},
    {'interestTagId': 'id', 'displayName': ''},
    {'interestTagId': 'id', 'displayName': 'Art\u202e'},
  ]) {
    test('catalogue rejects undeclared or invalid row: $item', () async {
      final repo = repository(
        (_) async => _response(200, {
          'interestTags': [item],
        }),
      );
      expect(
        await repo.readCatalogue(current: () => true),
        isA<Failure<List<InterestTagOption>>>(),
      );
    });
  }

  test('catalogue rejects duplicate IDs without merging names', () async {
    final repo = repository(
      (_) async => _response(200, {
        'interestTags': [
          {'interestTagId': 'id', 'displayName': 'Art'},
          {'interestTagId': 'id', 'displayName': 'Music'},
        ],
      }),
    );
    expect(
      await repo.readCatalogue(current: () => true),
      isA<Failure<List<InterestTagOption>>>(),
    );
  });

  for (final tag in [
    {
      'interestTagId': 'id',
      'displayName': 'Art',
      'lifecycleState': 'inactive',
      'revision': 1,
    },
    {
      'interestTagId': 'id',
      'displayName': 'Art',
      'lifecycleState': 'active',
      'revision': 2,
    },
    {
      'interestTagId': 'id',
      'displayName': 'Art',
      'lifecycleState': 'active',
      'revision': 1.0,
    },
    {
      'interestTagId': 'id',
      'displayName': 'Art',
      'lifecycleState': 'active',
      'revision': 1,
      'owner': 'x',
    },
    {'interestTagId': 'id', 'displayName': 'Art', 'revision': 1},
  ]) {
    test('malformed 201 is not save proof: $tag', () async {
      final repo = repository(
        (_) async => _response(201, {'interestTag': tag}),
      );
      expect(
        await repo.create(displayName: 'Art', current: () => true),
        isA<Failure<CreatedInterestTag>>(),
      );
    });
  }

  test('wrong successful POST200 cannot prove create', () async {
    final repo = repository((_) async => _response(200, _created));
    expect(
      await repo.create(displayName: 'Art', current: () => true),
      isA<Failure<CreatedInterestTag>>(),
    );
  });
  test(
    'wrong successful GET201 cannot prove capability or catalogue',
    () async {
      final repo = repository(
        (request) async => _response(
          201,
          request.url.path.endsWith('capability')
              ? {'canCreateInterestTags': true}
              : {'interestTags': []},
        ),
      );
      expect(
        await repo.readCapability(current: () => true),
        isA<Failure<bool>>(),
      );
      expect(
        await repo.readCatalogue(current: () => true),
        isA<Failure<List<InterestTagOption>>>(),
      );
    },
  );

  for (final pair in [
    (409, 'CATALOGUE_NAME_CONFLICT', AppFailureKind.catalogueNameConflict),
    (422, 'CATALOGUE_INVALID', AppFailureKind.catalogueInvalid),
    (403, 'AUTH_FORBIDDEN', AppFailureKind.authForbidden),
  ]) {
    test('exact error ${pair.$1}/${pair.$2} remains distinguishable', () async {
      final repo = repository((_) async => _error(pair.$1, pair.$2));
      final result = await repo.create(
        displayName: 'Art',
        current: () => true,
      ) as Failure<CreatedInterestTag>;
      expect(result.failure.kind, pair.$3);
      expect(result.failure.message, isNot('remote untrusted copy'));
    });
  }

  for (final pair in [
    (409, 'CATALOGUE_INVALID'),
    (422, 'CATALOGUE_NAME_CONFLICT'),
    (409, 'SERVICE_UNAVAILABLE'),
    (409, 'UNKNOWN_CODE'),
  ]) {
    test(
      'wrong status/error pair ${pair.$1}/${pair.$2} remains unknown',
      () async {
        final repo = repository((_) async => _error(pair.$1, pair.$2));
        final result = await repo.create(
          displayName: 'Art',
          current: () => true,
        ) as Failure<CreatedInterestTag>;
        expect(result.failure.kind, AppFailureKind.unexpected);
      },
    );
  }

  test(
    'session invalidation during token lookup prevents create dispatch',
    () async {
      final token = Completer<Result<String>>();
      var sent = 0;
      var current = true;
      final repo = repository((_) async {
        sent++;
        return _response(201, _created);
      }, token: () => token.future);
      final creating = repo.create(displayName: 'Art', current: () => current);
      current = false;
      token.complete(const Success('old-token'));
      expect(await creating, isA<Failure<CreatedInterestTag>>());
      expect(sent, 0);
    },
  );

  test(
    'session invalidation during response prevents old create delivery',
    () async {
      final response = Completer<http.Response>();
      final dispatched = Completer<void>();
      var current = true;
      final repo = repository((_) {
        dispatched.complete();
        return response.future;
      });
      final creating = repo.create(displayName: 'Art', current: () => current);
      await dispatched.future;
      current = false;
      response.complete(_response(201, _created));
      expect(await creating, isA<Failure<CreatedInterestTag>>());
    },
  );

  test('network failure stays inside Result without retry', () async {
    var sent = 0;
    final repo = repository((_) async {
      sent++;
      throw http.ClientException('private detail');
    });
    final result = await repo.create(
      displayName: 'Art',
      current: () => true,
    ) as Failure<CreatedInterestTag>;
    expect(result.failure.kind, AppFailureKind.serviceUnavailable);
    expect(result.failure.message, isNot(contains('private')));
    expect(sent, 1);
  });
}

const _created = {
  'interestTag': {
    'interestTagId': 'id',
    'displayName': 'Art',
    'lifecycleState': 'active',
    'revision': 1,
  },
};
http.Response _response(int status, Object body) => http.Response(
  jsonEncode(body),
  status,
  headers: {'content-type': 'application/json; charset=utf-8'},
);
http.Response _error(int status, String code) => _response(status, {
  'error': {
    'code': code,
    'message': 'remote untrusted copy',
    'requestId': 'synthetic-request',
  },
});
