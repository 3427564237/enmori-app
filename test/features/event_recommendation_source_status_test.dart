import 'dart:convert';

import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/event_recommendations/data/backend_event_recommendation_repository.dart';
import 'package:enmori/features/event_recommendations/domain/event_recommendation_repository.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

Future<Result<EventRecommendationResponse>> read(
  Map<String, Object?> extra,
) async {
  final client = BackendApiClient(
    Uri.parse('https://example.invalid'),
    () async => const Success('synthetic-token'),
    httpClient: MockClient(
      (request) async => http.Response(
        jsonEncode({
          'asOf': '2026-11-17T00:00:00Z',
          'formulaVersion': 'event_recommendation_v3',
          'items': <Object>[],
          ...extra,
        }),
        200,
      ),
    ),
  );
  try {
    return await BackendEventRecommendationRepository(client)
        .read(view: EventRecommendationView.all);
  } finally {
    client.close();
  }
}

void main() {
  test(
    'v3 source status is immutable and missing providers remain unknown',
    () async {
      final result = await read({
        'sourceStatus': [
          {'provider': 'ticketmaster', 'available': true},
          {'provider': 'onepa', 'available': false},
        ],
      });
      final value = (result as Success<EventRecommendationResponse>).value;
      expect(value.sourceStatus, {'ticketmaster': true, 'onepa': false});
      expect(() => value.sourceStatus['onepa'] = true, throwsUnsupportedError);
      for (final extra in <Map<String, Object?>>[
        {},
        {'sourceStatus': []},
      ]) {
        final unknown =
            (await read(extra) as Success<EventRecommendationResponse>).value;
        expect(unknown.sourceStatus['onepa'], isNull);
        expect(unknown.items, isEmpty);
      }
      final single = (await read({
        'sourceStatus': [
          {'provider': 'onepa', 'available': true},
        ],
      }) as Success<EventRecommendationResponse>).value;
      expect(single.sourceStatus['ticketmaster'], isNull);
    },
  );

  test(
    'malformed present status is invalid, never an unknown or empty success',
    () async {
      for (final value in <Object?>[
        null,
        {},
        true,
        [
          {'provider': 'other', 'available': true},
        ],
        [
          {'provider': 'onepa', 'available': 1},
        ],
        [
          {'provider': 'onepa', 'available': 'true'},
        ],
        [
          {'provider': 'onepa'},
        ],
        [
          {'provider': 'onepa', 'available': true, 'reason': 'private'},
        ],
        [
          {'provider': 'onepa', 'available': true},
          {'provider': 'onepa', 'available': false},
        ],
      ]) {
        expect(
          await read({'sourceStatus': value}),
          isA<Failure<EventRecommendationResponse>>(),
          reason: '$value',
        );
      }
    },
  );

  test('legacy response without status stays compatible and rejects an unexpected status field', () async {
    for (final version in [
      'event_recommendation_v1',
      'event_recommendation_v2',
    ]) {
      expect(
        await read({'formulaVersion': version}),
        isA<Success<EventRecommendationResponse>>(),
      );
      expect(
        await read({'formulaVersion': version, 'sourceStatus': []}),
        isA<Failure<EventRecommendationResponse>>(),
      );
    }
  });
}
