import 'dart:convert';

import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/event_browse/data/backend_activity_repository.dart';
import 'package:enmori/features/event_browse/domain/activity_repository.dart';
import 'package:enmori/features/event_browse/event_browse_providers.dart';
import 'package:enmori/features/event_participation/presentation/event_batches_controller.dart';
import 'package:enmori/features/event_recommendations/domain/event_recommendation_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'event_batches_test.dart' as browse;
import 'event_recommendation_source_status_test.dart' as recommendations;

Future<Result<ActivityRead>> _browse(Map<String, Object?> extra) async {
  final client = BackendApiClient(
    Uri.parse('https://example.invalid'),
    () async => const Success('synthetic-token'),
    httpClient: MockClient(
      (_) async => http.Response(
        jsonEncode({
          'asOf': '2026-11-17T00:00:00Z',
          'scope': 'singapore_events_v2',
          'items': <Object>[],
          ...extra,
        }),
        200,
      ),
    ),
  );
  try {
    return await BackendActivityRepository(client).read(null);
  } finally {
    client.close();
  }
}

Map<String, Object?> _recommendationCoverage(
  Object? coverage, {
  Object? available = true,
}) => {
  'sourceStatus': [
    {'provider': 'onepa', 'available': available},
  ],
  'sourceCoverage': coverage,
};

void main() {
  test(
    'recommendation coverage is explicit, immutable, and absent means unknown',
    () async {
      for (final complete in [false, true]) {
        final result = await recommendations.read(
          _recommendationCoverage([
            {'provider': 'onepa', 'complete': complete},
          ]),
        );
        final value = (result as Success<EventRecommendationResponse>).value;
        expect(value.sourceCoverage, {'onepa': complete});
        expect(value.sourceStatus, {'onepa': true});
        expect(
          () => value.sourceCoverage['onepa'] = !complete,
          throwsUnsupportedError,
        );
      }
      for (final extra in <Map<String, Object?>>[
        {},
        {
          'sourceStatus': [
            {'provider': 'onepa', 'available': true},
          ],
        },
        {'sourceCoverage': []},
      ]) {
        final result = await recommendations.read(extra);
        expect(
          (result as Success<EventRecommendationResponse>).value.sourceCoverage,
          isEmpty,
        );
      }
    },
  );

  test(
    'recommendation rejects malformed, duplicate and contradictory coverage',
    () async {
      for (final coverage in <Object?>[
        null,
        {},
        true,
        [null],
        [
          {'provider': 'onepa'},
        ],
        [
          {'provider': 'onepa', 'complete': null},
        ],
        [
          {'provider': 'onepa', 'complete': 1},
        ],
        [
          {'provider': 'onepa', 'complete': 'false'},
        ],
        [
          {'provider': 'ticketmaster', 'complete': false},
        ],
        [
          {'provider': 'other', 'complete': false},
        ],
        [
          {'provider': 'onepa', 'complete': false, 'reason': 'private'},
        ],
        [
          {'provider': 'onepa', 'complete': false},
          {'provider': 'onepa', 'complete': true},
        ],
      ]) {
        expect(
          await recommendations.read(_recommendationCoverage(coverage)),
          isA<Failure<EventRecommendationResponse>>(),
          reason: '$coverage',
        );
      }
      for (final extra in <Map<String, Object?>>[
        _recommendationCoverage([
          {'provider': 'onepa', 'complete': false},
        ], available: false),
        {
          'sourceCoverage': [
            {'provider': 'onepa', 'complete': true},
          ],
        },
        {
          'sourceStatus': [],
          'sourceCoverage': [
            {'provider': 'onepa', 'complete': false},
          ],
        },
        {
          'sourceStatus': [
            {'provider': 'onepa', 'available': true, 'coverageComplete': false},
          ],
        },
      ]) {
        expect(
          await recommendations.read(extra),
          isA<Failure<EventRecommendationResponse>>(),
        );
      }
    },
  );

  test('legacy recommendations omit coverage while v3 retains top-level compatibility', () async {
    for (final version in [
      'event_recommendation_v1',
      'event_recommendation_v2',
    ]) {
      expect(
        await recommendations.read({'formulaVersion': version}),
        isA<Success<EventRecommendationResponse>>(),
      );
      expect(
        await recommendations.read({
          'formulaVersion': version,
          'sourceCoverage': [],
        }),
        isA<Failure<EventRecommendationResponse>>(),
      );
    }
  });

  test('Browse reads available onePA row coverage without changing top-level shape', () async {
    for (final complete in [false, true]) {
      final result = await _browse({
        'sourceStatus': [
          {'provider': 'ticketmaster', 'available': false},
          {
            'provider': 'onepa',
            'available': true,
            'coverageComplete': complete,
          },
        ],
      });
      final batch = (result as Success<ActivityRead>).value as ActivityBatch;
      expect(batch.sourceStatus, {'ticketmaster': false, 'onepa': true});
      expect(batch.sourceCoverage, {'onepa': complete});
      expect(
        () => batch.sourceCoverage['onepa'] = !complete,
        throwsUnsupportedError,
      );
    }
    for (final extra in <Map<String, Object?>>[
      {},
      {'sourceStatus': []},
      {
        'sourceStatus': [
          {'provider': 'onepa', 'available': true},
        ],
      },
    ]) {
      final result = await _browse(extra);
      expect(
        ((result as Success<ActivityRead>).value as ActivityBatch)
            .sourceCoverage,
        isEmpty,
      );
    }
  });

  test(
    'Browse rejects malformed, duplicate, contradictory and top-level coverage',
    () async {
      for (final sources in <Object?>[
        null,
        {},
        true,
        [null],
        [
          {'provider': 'onepa', 'available': true, 'coverageComplete': null},
        ],
        [
          {'provider': 'onepa', 'available': true, 'coverageComplete': 1},
        ],
        [
          {'provider': 'onepa', 'available': true, 'coverageComplete': 'false'},
        ],
        [
          {'provider': 'onepa', 'available': false, 'coverageComplete': false},
        ],
        [
          {'provider': 'onepa', 'coverageComplete': false},
        ],
        [
          {
            'provider': 'ticketmaster',
            'available': true,
            'coverageComplete': false,
          },
        ],
        [
          {'provider': 'other', 'available': true},
        ],
        [
          {'provider': 'onepa', 'available': true, 'coverageComplete': false},
          {'provider': 'onepa', 'available': true},
        ],
      ]) {
        expect(
          await _browse({'sourceStatus': sources}),
          isA<Failure<ActivityRead>>(),
          reason: '$sources',
        );
      }
      expect(
        await _browse({'sourceCoverage': []}),
        isA<Failure<ActivityRead>>(),
      );
    },
  );

  test('domain snapshots copy and freeze availability and coverage', () {
    final status = {'onepa': true}, coverage = {'onepa': false};
    final batch = ActivityBatch(
      asOf: browse.instant,
      items: [],
      sourceStatus: status,
      sourceCoverage: coverage,
    );
    final response = EventRecommendationResponse(
      asOf: DateTime.utc(2026),
      formulaVersion: 'event_recommendation_v3',
      items: [],
      sourceStatus: status,
      sourceCoverage: coverage,
    );
    status['onepa'] = false;
    coverage['onepa'] = true;
    for (final value in [batch.sourceStatus, response.sourceStatus]) {
      expect(value, {'onepa': true});
      expect(() => value.clear(), throwsUnsupportedError);
    }
    for (final value in [batch.sourceCoverage, response.sourceCoverage]) {
      expect(value, {'onepa': false});
      expect(() => value.clear(), throwsUnsupportedError);
    }
  });

  test('Browse pagination preserves coverage, rejects drift and fresh complete replaces it', () async {
    final repo = browse.Repo()
      ..result = Success(
        ActivityBatch(
          asOf: browse.instant,
          items: [browse.item('first')],
          nextCursor: 'page1',
          sourceStatus: {'onepa': true},
          sourceCoverage: {'onepa': false},
        ),
      );
    final container = ProviderContainer(
      overrides: [
        activityRepositoryProvider.overrideWithValue(repo),
        authSessionProvider.overrideWithValue(
          const AsyncData(AuthSessionAuthenticated(subject: 'fixture')),
        ),
      ],
    );
    addTearDown(container.dispose);
    final subscription = container.listen(eventBatchesProvider, (_, _) {});
    addTearDown(subscription.close);
    final controller = container.read(eventBatchesProvider.notifier);
    await controller.load();
    repo.nextResults['page1'] = Success(
      ActivityBatch(
        asOf: browse.instant,
        items: [browse.item('second')],
        sourceStatus: {'onepa': true},
        sourceCoverage: {'onepa': true},
      ),
    );
    await controller.next();
    expect(container.read(eventBatchesProvider).failure, isNotNull);
    expect(container.read(eventBatchesProvider).batch!.sourceCoverage, {
      'onepa': false,
    });
    expect(container.read(eventBatchesProvider).batch!.items, hasLength(1));
    repo.nextResults['page1'] = Success(
      ActivityBatch(
        asOf: browse.instant,
        items: [browse.item('second')],
        sourceStatus: {'onepa': true},
        sourceCoverage: {'onepa': false},
      ),
    );
    await controller.next();
    expect(container.read(eventBatchesProvider).failure, isNull);
    expect(container.read(eventBatchesProvider).batch!.sourceCoverage, {
      'onepa': false,
    });
    expect(container.read(eventBatchesProvider).batch!.items, hasLength(2));
    repo.result = Success(
      ActivityBatch(
        asOf: browse.instant,
        items: [],
        sourceStatus: {'onepa': true},
        sourceCoverage: {'onepa': true},
      ),
    );
    await controller.load();
    expect(container.read(eventBatchesProvider).batch!.sourceCoverage, {
      'onepa': true,
    });
  });
}
