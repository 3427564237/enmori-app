import 'dart:convert';

import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/interests/data/backend_admin_interest_repository.dart';
import 'package:enmori/features/interests/domain/admin_interest_repository.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

const original = ManagedInterestTag(
  interestTagId: 'tag-a',
  displayName: 'Art',
  lifecycleState: InterestLifecycleState.active,
  revision: 2,
);
Map<String, Object?> item({
  String name = 'Art',
  String lifecycle = 'active',
  int revision = 2,
}) => {
  'interestTagId': 'tag-a',
  'displayName': name,
  'lifecycleState': lifecycle,
  'revision': revision,
};
http.Response response(int status, Object body) => http.Response(
  jsonEncode(body),
  status,
  headers: {'content-type': 'application/json'},
);
void main() {
  BackendAdminInterestRepository repository(
    Future<http.Response> Function(http.Request) handler,
  ) {
    final client = BackendApiClient(
      Uri.parse('https://synthetic.invalid'),
      () async => const Success('test-token'),
      httpClient: MockClient(handler),
    );
    addTearDown(client.close);
    return BackendAdminInterestRepository(client);
  }

  test('management GET uses protected route and decodes inactive state and revision', () async {
    final repo = repository((request) async {
      expect(request.method, 'GET');
      expect(request.url.path, '/v1/admin/interest-tags');
      expect(request.body, isEmpty);
      return response(200, {
        'interestTags': [item(lifecycle: 'inactive', revision: 7)],
      });
    });
    final tags = (await repo.readManagementCatalogue(
      current: () => true,
    ) as Success<List<ManagedInterestTag>>).value;
    expect(tags.single.lifecycleState, InterestLifecycleState.inactive);
    expect(tags.single.revision, 7);
  });
  test('rename and lifecycle use PATCH with exactly one change and expected revision', () async {
    var calls = 0;
    final repo = repository((request) async {
      expect(request.method, 'PATCH');
      expect(request.url.path, '/v1/admin/interest-tags/tag-a');
      expect(request.headers['Authorization'], 'Bearer test-token');
      expect(
        jsonDecode(request.body),
        calls++ == 0
            ? {'expectedRevision': 2, 'displayName': 'Drawing'}
            : {'expectedRevision': 2, 'lifecycleState': 'inactive'},
      );
      return response(200, {
        'interestTag': calls == 1
            ? item(name: 'Drawing', revision: 3)
            : item(lifecycle: 'inactive', revision: 3),
      });
    });
    expect(
      await repo.rename(
        expected: original,
        displayName: 'Drawing',
        current: () => true,
      ),
      isA<Success<ManagedInterestTag>>(),
    );
    expect(
      await repo.changeLifecycle(
        expected: original,
        lifecycleState: InterestLifecycleState.inactive,
        current: () => true,
      ),
      isA<Success<ManagedInterestTag>>(),
    );
    expect(calls, 2);
  });
  for (final malformed in [
    <String, Object?>{...item(), 'revision': 0},
    {...item(), 'revision': 2.0},
    {...item(), 'lifecycleState': 'deleted'},
    {...item(), 'privateCount': 2},
  ]) {
    test('malformed management record fails closed: $malformed', () async {
      final repo = repository(
        (_) async => response(200, {
          'interestTags': [malformed],
        }),
      );
      expect(
        await repo.readManagementCatalogue(current: () => true),
        isA<Failure<List<ManagedInterestTag>>>(),
      );
    });
  }
  test('management list rejects duplicate identities', () async {
    final repo = repository(
      (_) async => response(200, {
        'interestTags': [item(), item()],
      }),
    );
    expect(
      await repo.readManagementCatalogue(current: () => true),
      isA<Failure<List<ManagedInterestTag>>>(),
    );
  });
  for (final failure in [
    (
      412,
      'CATALOGUE_REVISION_PRECONDITION_FAILED',
      AppFailureKind.catalogueRevisionPreconditionFailed,
    ),
    (404, 'CATALOGUE_NOT_FOUND', AppFailureKind.catalogueNotFound),
    (409, 'CATALOGUE_STATE_CONFLICT', AppFailureKind.catalogueStateConflict),
    (409, 'CATALOGUE_NAME_CONFLICT', AppFailureKind.catalogueNameConflict),
  ]) {
    test(
      'mutation maps exact status and semantic error ${failure.$2}',
      () async {
        final repo = repository(
          (_) async => response(failure.$1, {
            'error': {
              'code': failure.$2,
              'message': 'private server detail',
              'requestId': 'req-safe',
            },
          }),
        );
        final result = await repo.rename(
          expected: original,
          displayName: 'Drawing',
          current: () => true,
        ) as Failure<ManagedInterestTag>;
        expect(result.failure.kind, failure.$3);
        expect(result.failure.message, isNot(contains('private')));
      },
    );
  }
  test('malformed ack changing untouched field is not accepted', () async {
    final repo = repository(
      (_) async => response(200, {
        'interestTag': item(
          name: 'Drawing',
          lifecycle: 'inactive',
          revision: 3,
        ),
      }),
    );
    expect(
      await repo.rename(
        expected: original,
        displayName: 'Drawing',
        current: () => true,
      ),
      isA<Failure<ManagedInterestTag>>(),
    );
  });
  for (final invalid in [
    item(name: 'Drawing', revision: 2),
    item(revision: 3),
  ]) {
    test(
      'mutation acknowledgement must apply exactly one revision for an effective change: $invalid',
      () async {
        final repo = repository(
          (_) async => response(200, {'interestTag': invalid}),
        );
        expect(
          await repo.rename(
            expected: original,
            displayName: 'Drawing',
            current: () => true,
          ),
          isA<Failure<ManagedInterestTag>>(),
        );
      },
    );
  }
  test(
    'lost eligibility and unavailable deletion dispatch no mutation',
    () async {
      var calls = 0;
      final repo = repository((_) async {
        calls++;
        return response(200, {});
      });
      expect(
        await repo.rename(
          expected: original,
          displayName: 'Drawing',
          current: () => false,
        ),
        isA<Failure<ManagedInterestTag>>(),
      );
      expect(repo.permanentDeletionAvailable, isFalse);
      expect(
        await repo.delete(expected: original, current: () => true),
        isA<Failure<void>>(),
      );
      expect(calls, 0);
    },
  );
}
