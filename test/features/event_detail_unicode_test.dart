import 'dart:convert';

import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/event_detail/data/backend_event_detail_repository.dart';
import 'package:enmori/features/event_detail/domain/event_detail_repository.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

Future<Result<EventDetail>> readEvent(Map<String, Object> changes) {
  final client = BackendApiClient(
    Uri.parse('https://example.invalid'),
    () async => const Success('synthetic'),
    httpClient: MockClient(
      (_) async => http.Response(
        jsonEncode({
          'event': {
            'eventId': 'ev',
            'title': 'Synthetic event',
            'startAt': '2026-10-06T00:00:00Z',
            'externalSourceUrl': 'https://example.invalid/synthetic-event',
            ...changes,
          },
        }),
        200,
        headers: {'content-type': 'application/json'},
      ),
    ),
  );
  return BackendEventDetailRepository(client).read('ev');
}

void main() {
  const fields = [
    'title',
    'locationLabel',
    'categoryLabel',
    'shortDescription',
  ];
  for (final field in fields) {
    for (final surrogate in [0xd800, 0xdc00]) {
      test('$field rejects unpaired surrogate $surrogate', () async {
        expect(
          await readEvent({field: String.fromCharCode(surrogate)}),
          isA<Failure<EventDetail>>(),
        );
      });
    }
  }
  test(
    'all text fields preserve valid supplementary Unicode scalars',
    () async {
      final text = String.fromCharCode(0x1f600);
      final result = await readEvent({for (final field in fields) field: text});
      expect(result, isA<Success<EventDetail>>());
      final event = (result as Success<EventDetail>).value;
      expect([
        event.title,
        event.locationLabel,
        event.categoryLabel,
        event.shortDescription,
      ], everyElement(text));
    },
  );
}
