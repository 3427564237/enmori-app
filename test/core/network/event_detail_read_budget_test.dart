import 'dart:convert';

import 'package:enmori/features/event_browse/data/backend_activity_repository.dart';
import 'package:enmori/features/event_recommendations/data/backend_event_recommendation_repository.dart';
import 'package:enmori/features/event_recommendations/domain/event_recommendation_repository.dart';
import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  for (final recommendations in [false, true]) {
    test(
      'approved Event ${recommendations ? 'recommendation' : 'list'} read tolerates a slow source without extending writes',
      () async {
        final client = BackendApiClient(
          Uri.https('example.test', '/'),
          () async => const Success('synthetic'),
          operationTimeout: const Duration(milliseconds: 5),
          httpClient: MockClient((request) async {
            await Future<void>.delayed(const Duration(milliseconds: 40));
            return http.Response(
              jsonEncode({
                'asOf': '2026-11-05T00:00:00Z',
                'items': [],
                if (recommendations)
                  'formulaVersion': 'event_recommendation_v3'
                else
                  'scope': 'singapore_events_v2',
              }),
              200,
            );
          }),
        );
        addTearDown(client.close);
        final result = recommendations
            ? await BackendEventRecommendationRepository(client)
                  .read(view: EventRecommendationView.home)
            : await BackendActivityRepository(client).read(null);
        expect(result, isA<Success>());
        expect(await client.get('/v1/me/profile'), isA<Failure<JsonObject>>());
        expect(
          await client.put('/v1/me/profile', body: {}),
          isA<Failure<JsonObject>>(),
        );
      },
    );
  }
  for (final recommendations in [false, true]) {
    testWidgets('demo Event read waits beyond 30 seconds without resending', (
      tester,
    ) async {
      var requests = 0;
      final client = BackendApiClient(
        Uri.https('example.test', '/'),
        () async => const Success('synthetic'),
        httpClient: MockClient((request) async {
          requests++;
          await Future<void>.delayed(const Duration(seconds: 45));
          return http.Response(
            jsonEncode({
              'asOf': '2026-11-11T00:00:00Z',
              'items': [],
              if (recommendations)
                'formulaVersion': 'event_recommendation_v3'
              else
                'scope': 'singapore_events_v2',
            }),
            200,
          );
        }),
      );
      addTearDown(client.close);
      Object? result;
      final work = recommendations
          ? BackendEventRecommendationRepository(client)
                .read(view: EventRecommendationView.home)
          : BackendActivityRepository(client).read(null);
      work.then((value) => result = value);
      await tester.pump();
      await tester.pump(const Duration(seconds: 31));
      expect(result, isNull);
      await tester.pump(const Duration(seconds: 15));
      expect(result, isA<Success>());
      expect(requests, 1);
    });
  }
  test(
    'a rendered-detail read budget does not extend other reads or writes',
    () async {
      final requests = <http.Request>[];
      final client = BackendApiClient(
        Uri.https('example.test', '/'),
        () async => const Success('synthetic'),
        operationTimeout: const Duration(milliseconds: 5),
        httpClient: MockClient((request) async {
          requests.add(request);
          await Future<void>.delayed(const Duration(milliseconds: 40));
          return http.Response('{}', 200);
        }),
      );
      addTearDown(client.close);
      expect(
        await client.get(
          '/v1/events/synthetic',
          contractVersion: 3,
          readTimeout: const Duration(seconds: 1),
        ),
        isA<Success<JsonObject>>(),
      );
      expect(requests.single.headers['X-ENMORI-Contract-Version'], '3');
      expect(await client.get('/v1/me/profile'), isA<Failure<JsonObject>>());
      expect(
        await client.put('/v1/me/profile', body: {}),
        isA<Failure<JsonObject>>(),
      );
    },
  );
}
