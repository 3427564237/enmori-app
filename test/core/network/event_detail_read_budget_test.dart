import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
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
