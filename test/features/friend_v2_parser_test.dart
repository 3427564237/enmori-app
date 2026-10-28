// Regression from ZHOU PR190 exact-head independent review, 26 October 2026.
import 'dart:convert';
import 'dart:io';

import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/friends/data/backend_friend_discovery_repository.dart';
import 'package:enmori/features/friends/domain/friend_discovery_repository.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  // Backend tests bind these bodies to the real producer and Fastify response.
  final wire = jsonDecode(
    File('test/fixtures/friend-v2-wire.json').readAsStringSync(),
  ) as Map<String, dynamic>;
  for (final entry in wire.entries) {
    for (final home in [false, true]) {
      test(
        'producer HTTP fixture ${entry.key} reaches the ${home ? 'Home' : 'all'} consumer',
        () async {
          final client = BackendApiClient(
            Uri.parse('https://example.invalid'),
            () async => const Success('synthetic-token'),
            httpClient: MockClient((request) async {
              expect(
                request.url.queryParameters['view'],
                home ? 'home' : 'all',
              );
              return http.Response(jsonEncode(entry.value), 200);
            }),
          );
          addTearDown(client.close);
          final result = await BackendFriendDiscoveryRepository(client)
              .suggestions(home: home);
          expect(result, isA<Success<List<FriendSuggestion>>>());
          final rows =
              (entry.value as Map<String, dynamic>)['suggestions'] as List;
          final actual = (result as Success<List<FriendSuggestion>>).value;
          expect(actual.map((p) => p.reason), rows.map((p) => p['reason']));
          expect(actual.map((p) => p.username), rows.map((p) => p['username']));
          expect(
            actual.map((p) => p.sharedInterests),
            rows.map((p) => p['sharedInterests']),
          );
        },
      );
    }
  }

  for (final invalid in [
    'empty reason',
    'invented reason',
    'misleading interest reason',
    'extra profile field',
    'missing version',
    'bad version',
    'negative count',
    'oversize count',
    'noninteger count',
    'invalid tag',
    'duplicate name',
    'oversize home',
  ]) {
    test('profile eligibility still rejects $invalid', () async {
      final body =
          jsonDecode(jsonEncode(wire['region'])) as Map<String, dynamic>;
      final rows = body['suggestions'] as List;
      final row = rows.single as Map<String, dynamic>;
      switch (invalid) {
        case 'empty reason':
          row['reason'] = '';
        case 'invented reason':
          row['reason'] = 'Same shared region · inferred mood';
        case 'misleading interest reason':
          row['reason'] = '1 shared interest';
        case 'extra profile field':
          row['region'] = 'must-not-be-public';
        case 'missing version':
          row.remove('ignoreVersion');
        case 'bad version':
          row['ignoreVersion'] = 'invalid';
        case 'negative count':
          row['commonEventCount'] = -1;
        case 'oversize count':
          row['commonEventCount'] = 2001;
        case 'noninteger count':
          row['commonEventCount'] = true;
        case 'invalid tag':
          row['sharedInterests'] = [1];
        case 'duplicate name':
          rows.add(Map<String, dynamic>.from(row));
        case 'oversize home':
          rows.add({...row, 'username': 'second_person'});
          rows.add({...row, 'username': 'third_person'});
      }
      final client = BackendApiClient(
        Uri.parse('https://example.invalid'),
        () async => const Success('synthetic-token'),
        httpClient: MockClient(
          (_) async => http.Response(jsonEncode(body), 200),
        ),
      );
      addTearDown(client.close);
      expect(
        await BackendFriendDiscoveryRepository(client).suggestions(home: true),
        isA<Failure<List<FriendSuggestion>>>(),
      );
    });
  }

  test('existing interest-only Friend response still decodes', () async {
    final client = BackendApiClient(
      Uri.parse('https://example.invalid'),
      () async => const Success('synthetic-token'),
      httpClient: MockClient(
        (request) async => http.Response(
          jsonEncode({
            'suggestions': [
              {
                'username': 'interest_person',
                'displayName': 'Public interest person',
                'sharedInterests': ['Art'],
                'commonEventCount': 0,
                'reason': '1 shared interest',
                'ignoreVersion': 'a' * 64,
              },
            ],
          }),
          200,
        ),
      ),
    );
    addTearDown(client.close);
    final result = await BackendFriendDiscoveryRepository(client)
        .suggestions(home: false);
    expect(result, isA<Success<List<FriendSuggestion>>>());
    final person = (result as Success<List<FriendSuggestion>>).value.single;
    expect(person.sharedInterests, ['Art']);
    expect(person.commonEventCount, 0);
  });

  for (final reason in [
    'Same shared region',
    'Same shared school or organization',
  ]) {
    for (final home in [false, true]) {
      test(
        'actual Friend v2 $reason decodes for ${home ? 'home' : 'all'}',
        () async {
          final client = BackendApiClient(
            Uri.parse('https://example.invalid'),
            () async => const Success('synthetic-token'),
            httpClient: MockClient(
              (request) async => http.Response(
                jsonEncode({
                  'suggestions': [
                    {
                      'username': 'region_person',
                      'displayName': 'Public test person',
                      'sharedInterests': [],
                      'commonEventCount': 0,
                      'reason': reason,
                      'ignoreVersion': 'a' * 64,
                    },
                  ],
                }),
                200,
              ),
            ),
          );
          addTearDown(client.close);
          final result = await BackendFriendDiscoveryRepository(client)
              .suggestions(home: home);
          expect(result, isA<Success<List<FriendSuggestion>>>());
          final person =
              (result as Success<List<FriendSuggestion>>).value.single;
          expect(person.sharedInterests, isEmpty);
          expect(person.commonEventCount, 0);
          expect(person.reason, reason);
        },
      );
    }
  }
}
