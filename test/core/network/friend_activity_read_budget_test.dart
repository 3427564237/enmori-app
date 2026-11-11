import 'dart:convert';

import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/friends/data/backend_friend_activity_repository.dart';
import 'package:enmori/features/friends/domain/friend_activity_repository.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  for (final category in [
    null,
    FriendActivityType.interested,
    FriendActivityType.going,
  ]) {
    testWidgets(
      'Event Activity read allows source preparation without resending ($category)',
      (tester) async {
        final requests = <http.Request>[];
        final client = BackendApiClient(
          Uri.https('example.test', '/'),
          () async => const Success('synthetic'),
          httpClient: MockClient((request) async {
            requests.add(request);
            await Future<void>.delayed(const Duration(seconds: 200));
            return http.Response(jsonEncode({'activities': []}), 200);
          }),
        );
        addTearDown(client.close);
        Object? result;
        BackendFriendActivityRepository(client)
            .read(home: false, category: category)
            .then((value) => result = value);
        await tester.pump();
        await tester.pump(const Duration(seconds: 121));
        expect(result, isNull);
        await tester.pump(const Duration(seconds: 80));
        expect(result, isA<Success>());
        expect(requests, hasLength(1));
        expect(
          requests.single.url.queryParameters['category'],
          category?.wire ?? 'all',
        );
      },
    );
  }

  test(
    'Check-in Activity and writes retain the ordinary read/write deadline',
    () async {
      final client = BackendApiClient(
        Uri.https('example.test', '/'),
        () async => const Success('synthetic'),
        operationTimeout: const Duration(milliseconds: 5),
        httpClient: MockClient((request) async {
          await Future<void>.delayed(const Duration(milliseconds: 40));
          return http.Response(jsonEncode({'activities': []}), 200);
        }),
      );
      addTearDown(client.close);
      final repo = BackendFriendActivityRepository(client);
      expect(await repo.read(home: true), isA<Success>());
      expect(
        await repo.read(home: true, category: FriendActivityType.checkIn),
        isA<Failure>(),
      );
      expect(await client.put('/v1/me/profile', body: {}), isA<Failure>());
    },
  );
}
