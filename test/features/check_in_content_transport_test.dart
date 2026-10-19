import 'dart:convert';

import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/check_in/data/backend_check_in_repository.dart';
import 'package:enmori/features/check_in/domain/check_in_repository.dart';
import 'package:enmori/features/check_in/domain/check_in_calendar_repository.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  test('Mood-only payload and history preserve real fields and calendar rejects malformed counts', () async {
    final requests = <http.Request>[];
    final record = {
      'checkInId': 'moment',
      'note': '',
      'mood': 'Calm',
      'activity': 'Study',
      'createdAt': '2026-10-19T01:00:00.000Z',
      'checkInVisibility': 'private',
      'revision': 2,
    };
    final repo = BackendCheckInRepository(
      BackendApiClient(
        Uri.parse('https://test.invalid'),
        () async => const Success('synthetic'),
        httpClient: MockClient((request) async {
          requests.add(request);
          final data = request.url.path.endsWith('/calendar')
              ? {
                  'month': '2026-10',
                  'timeZone': 'UTC',
                  'days': [
                    {'date': '2026-10-01', 'count': -1},
                  ],
                }
              : request.url.path == '/v1/me/check-ins'
              ? {
                  'checkIns': [record],
                  'nextCursor': null,
                }
              : {'checkIn': record};
          return http.Response(jsonEncode(data), 200);
        }),
      ),
    );
    final saved = await repo.create(
      note: '',
      mood: 'Calm',
      activity: 'Study',
      idempotencyKey: 'synthetic',
    );
    expect(saved, isA<Success<CheckIn>>());
    expect(jsonDecode(requests.single.body), {
      'note': '',
      'mood': 'Calm',
      'activity': 'Study',
    });
    final history = await repo.readOwnForDate(
      date: '2026-10-19',
      timeZone: 'UTC',
    );
    expect(
      (history as Success<CheckInHistoryPage>).value.checkIns.single.mood,
      'Calm',
    );
    expect(history.value.checkIns.single.revision, 2);
    expect(
      await repo.readMonth(month: '2026-10', timeZone: 'UTC'),
      isA<Failure<CheckInMonth>>(),
    );
  });
}
