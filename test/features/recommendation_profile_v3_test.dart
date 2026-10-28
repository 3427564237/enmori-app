import 'dart:async';
import 'dart:convert';

import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/event_detail/domain/event_content.dart';
import 'package:enmori/features/event_detail/presentation/event_information.dart';
import 'package:enmori/features/event_browse/data/backend_activity_repository.dart';
import 'package:enmori/features/recommendation_profile/data/backend_recommendation_profile_repository.dart';
import 'package:enmori/features/recommendation_profile/domain/recommendation_profile.dart';
import 'package:enmori/features/recommendation_profile/presentation/recommendation_profile_page.dart';
import 'package:enmori/features/recommendation_profile/recommendation_profile_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

class Profiles implements RecommendationProfileRepository {
  RecommendationProfile value = const RecommendationProfile(
    homeAreaCode: 'TM',
    birthDate: '2000-02-29',
    autoActivityLocation: true,
  );
  RecommendationProfile? attempted;
  @override
  Future<Result<RecommendationProfile>> read() async => Success(value);
  @override
  Future<Result<RecommendationProfile>> save(RecommendationProfile p) async {
    attempted = p;
    return const Failure(
      AppFailure(
        kind: AppFailureKind.serviceUnavailable,
        message: 'Unknown result',
      ),
    );
  }
}

class Regions implements RegionRepository {
  @override
  Future<List<PlanningArea>> catalogue() async => const [
    PlanningArea(
      code: 'TM',
      name: 'Tampines',
      regionCode: 'ER',
      regionName: 'East Region',
    ),
    PlanningArea(
      code: 'PR',
      name: 'Pasir Ris',
      regionCode: 'ER',
      regionName: 'East Region',
    ),
  ];
  @override
  Future<Result<PlanningArea>> locate() async => const Failure(
    AppFailure(kind: AppFailureKind.serviceUnavailable, message: 'Denied'),
  );
}

void main() {
  testWidgets(
    'registration deadline uses Singapore civil day and readable local time',
    (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) =>
                Text(eventDeadlineLabel(context, '2026-10-28T17:00:00.000Z')),
          ),
        ),
      );
      expect(find.textContaining('Oct 29'), findsOneWidget);
      expect(find.textContaining('1:00 AM SGT'), findsOneWidget);
      expect(find.textContaining('T17:00'), findsNothing);
    },
  );
  test(
    'new event reads explicitly negotiate v3 without changing auth identity',
    () async {
      String? capability;
      final client = BackendApiClient(
        Uri.parse('https://example.com'),
        () async => const Success('synthetic'),
        httpClient: MockClient((r) async {
          capability =
              r.headers['X-ENMORI-Contract-Version'] ??
              r.headers['x-enmori-contract-version'];
          expect(
            r.headers['Authorization'] ?? r.headers['authorization'],
            'Bearer synthetic',
          );
          return http.Response(
            '{"asOf":"2026-10-28T00:00:00Z","scope":"singapore_events_v2","items":[]}',
            200,
          );
        }),
      );
      await BackendActivityRepository(client).read(null);
      expect(capability, '3');
      client.close();
    },
  );
  test('profile save uses revision, no raw coordinates and preserves false/null rather than dropping fields', () async {
    late Map<String, dynamic> sent;
    final client = BackendApiClient(
      Uri.parse('https://example.com'),
      () async => const Success('synthetic'),
      httpClient: MockClient((r) async {
        sent = jsonDecode(r.body) as Map<String, dynamic>;
        return http.Response(
          jsonEncode({
            'profile': {
              ...Map<String, dynamic>.from(sent)..remove('expectedRevision'),
              'revision': 8,
            },
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      }),
    );
    final result = await BackendRecommendationProfileRepository(client)
        .save(const RecommendationProfile(revision: 7));
    expect(result, isA<Success<RecommendationProfile>>());
    expect(sent['birthDate'], null);
    expect(sent['discoverable'], false);
    expect(sent.containsKey('latitude'), false);
    client.close();
  });
  test(
    'full event content accepts onePA and refuses credentials or another host',
    () {
      final value = {
        'provider': 'onepa',
        'timeZone': 'Asia/Singapore',
        'detailUrl': 'https://www.onepa.gov.sg/events/sample',
        'fullDescription': 'First paragraph.\n\nSecond paragraph.',
        'sections': [
          {'heading': 'Admission', 'text': 'Age 60 and above.'},
        ],
      };
      expect(
        EventContent.parse(value)!.sections.single.text,
        'Age 60 and above.',
      );
      for (final url in [
        'https://other.example/events/a',
        'https://user:pass@www.onepa.gov.sg/events/a',
        'https://www.onepa.gov.sg/events/a?token=secret',
      ]) {
        expect(
          () => EventContent.parse({...value, 'detailUrl': url}),
          throwsFormatException,
        );
      }
    },
  );
  testWidgets(
    'region is selectable and failed birthday deletion retains draft with explicit readback',
    (tester) async {
      final repo = Profiles();
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            recommendationProfileRepositoryProvider.overrideWithValue(repo),
            regionRepositoryProvider.overrideWithValue(Regions()),
            currentAuthSubjectProvider.overrideWithValue('owner'),
            authSessionProvider.overrideWith(
              (ref) => const Stream<AuthSession>.empty(),
            ),
          ],
          child: const MaterialApp(home: RecommendationProfilePage()),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Tampines'), findsOneWidget);
      expect(find.text('2000-02-29'), findsOneWidget);
      await tester.tap(find.byTooltip('Delete birthday'));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(find.text('Save'), 300);
      await tester.tap(find.text('Save'));
      await tester.pumpAndSettle();
      expect(repo.attempted!.birthDate, null);
      expect(repo.value.birthDate, '2000-02-29');
      expect(find.textContaining('Your draft is kept'), findsOneWidget);
      await tester.ensureVisible(find.text('Read saved version'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Read saved version'));
      await tester.pumpAndSettle();
      expect(find.text('Review saved version'), findsOneWidget);
      expect(find.textContaining('2000-02-29'), findsOneWidget);
      await tester.tap(find.text('Keep draft'));
      await tester.pumpAndSettle();
      await tester.pumpWidget(const SizedBox());
    },
  );
  test('foreground region denial falls back to home and manual override survives refresh', () async {
    final container = ProviderContainer(
      overrides: [
        recommendationProfileRepositoryProvider.overrideWithValue(Profiles()),
        regionRepositoryProvider.overrideWithValue(Regions()),
        currentAuthSubjectProvider.overrideWithValue('owner'),
        authSessionProvider.overrideWith(
          (ref) => const Stream<AuthSession>.empty(),
        ),
      ],
    );
    addTearDown(container.dispose);
    final c = container.read(activityAreaProvider.notifier);
    await c.refresh();
    expect(container.read(activityAreaProvider).code, 'TM');
    expect(container.read(activityAreaProvider).failed, true);
    c.manual(
      const PlanningArea(
        code: 'PR',
        name: 'Pasir Ris',
        regionCode: 'ER',
        regionName: 'East Region',
      ),
    );
    await c.refresh();
    expect(container.read(activityAreaProvider).code, 'PR');
    c.manual(null);
    await c.refresh();
    expect(container.read(activityAreaProvider).code, 'TM');
  });
}
