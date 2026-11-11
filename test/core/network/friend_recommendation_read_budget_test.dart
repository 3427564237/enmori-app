import 'dart:convert';

import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/friends/data/backend_friend_discovery_repository.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  for (final home in [true, false]) {
    testWidgets(
      'friend recommendations wait for the source without resending ($home)',
      (tester) async {
        final requests = <http.Request>[];
        final client = BackendApiClient(
          Uri.https('example.test', '/'),
          () async => const Success('synthetic'),
          httpClient: MockClient((request) async {
            requests.add(request);
            await Future<void>.delayed(const Duration(seconds: 100));
            return http.Response(
              jsonEncode({'suggestions': [], 'ownState': 'no_matches'}),
              200,
            );
          }),
        );
        addTearDown(client.close);
        Object? result;
        BackendFriendDiscoveryRepository(client)
            .suggestions(home: home)
            .then((value) => result = value);
        await tester.pump();
        await tester.pump(const Duration(seconds: 46));
        expect(result, isNull);
        await tester.pump(const Duration(seconds: 55));
        expect(result, isA<Success>());
        expect(requests, hasLength(1));
        expect(
          requests.single.url.queryParameters['view'],
          home ? 'home' : 'all',
        );
        expect(
          requests.single.headers['X-ENMORI-Contract-Version'] ??
              requests.single.headers['x-enmori-contract-version'],
          '3',
        );
      },
    );
  }

  test('friend recommendation allowance does not extend pending-count reads or writes', () async {
    final client = BackendApiClient(
      Uri.https('example.test', '/'),
      () async => const Success('synthetic'),
      operationTimeout: const Duration(milliseconds: 5),
      httpClient: MockClient((request) async {
        await Future<void>.delayed(const Duration(milliseconds: 40));
        return http.Response(
          jsonEncode({'suggestions': [], 'ownState': 'no_matches'}),
          200,
        );
      }),
    );
    addTearDown(client.close);
    final repo = BackendFriendDiscoveryRepository(client);
    expect(await repo.suggestions(home: true), isA<Success>());
    expect(await repo.pendingCount(), isA<Failure>());
    expect(await client.put('/v1/me/profile', body: {}), isA<Failure>());
  });
}
