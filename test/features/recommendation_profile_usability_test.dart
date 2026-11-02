import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/recommendation_profile/domain/recommendation_profile.dart';
import 'package:enmori/features/recommendation_profile/presentation/activity_area_bar.dart';
import 'package:enmori/features/recommendation_profile/presentation/recommendation_profile_page.dart';
import 'package:enmori/features/recommendation_profile/recommendation_profile_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

const _tampines = PlanningArea(
  code: 'TM',
  name: 'Tampines',
  regionCode: 'ER',
  regionName: 'East Region',
);

class _Profiles implements RecommendationProfileRepository {
  int saves = 0;

  @override
  Future<Result<RecommendationProfile>> read() async => const Success(
    RecommendationProfile(homeAreaCode: 'TM', onboardingPromptSeen: true),
  );

  @override
  Future<Result<RecommendationProfile>> save(RecommendationProfile p) async {
    saves++;
    return Success(p);
  }
}

class _RetryingRegions implements RegionRepository {
  int reads = 0;

  @override
  Future<List<PlanningArea>> catalogue() async {
    if (++reads == 1) throw StateError('Synthetic catalogue failure');
    return const [_tampines];
  }

  @override
  Future<Result<PlanningArea>> locate() async => const Success(_tampines);
}

class _PendingRegions implements RegionRepository {
  final result = Completer<List<PlanningArea>>();
  int reads = 0;

  @override
  Future<List<PlanningArea>> catalogue() {
    reads++;
    return result.future;
  }

  @override
  Future<Result<PlanningArea>> locate() async => const Success(_tampines);
}

class _ExistingActivityArea extends ActivityAreaController {
  @override
  ActivityArea build() => const ActivityArea(
    code: 'PR',
    name: 'Pasir Ris',
    source: 'Selected area',
  );

  @override
  Future<void> refresh() async {}
}

void main() {
  testWidgets('activity area prevents repeated opens while loading areas', (
    tester,
  ) async {
    final regions = _PendingRegions();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          recommendationProfileRepositoryProvider.overrideWithValue(
            _Profiles(),
          ),
          regionRepositoryProvider.overrideWithValue(regions),
          currentAuthSubjectProvider.overrideWithValue('synthetic-owner'),
          authSessionProvider.overrideWith(
            (ref) => const Stream<AuthSession>.empty(),
          ),
          activityAreaProvider.overrideWith(_ExistingActivityArea.new),
        ],
        child: const MaterialApp(home: Scaffold(body: ActivityAreaBar())),
      ),
    );
    await tester.pumpAndSettle();
    final open = tester
        .widget<TextButton>(find.widgetWithText(TextButton, 'Pasir Ris'))
        .onPressed!;
    open();
    open();
    await tester.pump();
    expect(regions.reads, 1);
    expect(
      tester
          .widget<TextButton>(find.widgetWithText(TextButton, 'Pasir Ris'))
          .onPressed,
      isNull,
    );
    regions.result.complete(const [_tampines]);
    await tester.pumpAndSettle();
    expect(find.text('Search Singapore areas'), findsOneWidget);
    expect(find.byType(LinearProgressIndicator), findsNothing);
    Navigator.of(tester.element(find.text('Tampines'))).pop();
    await tester.pumpAndSettle();
    expect(find.text('Pasir Ris'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  for (final retryWithArea in [false, true]) {
    testWidgets(
      'activity area failure retries via ${retryWithArea ? 'area button' : 'retry button'} without changing area',
      (tester) async {
        final regions = _RetryingRegions();
        await tester.pumpWidget(
          ProviderScope(
            retry: (_, _) => null,
            overrides: [
              recommendationProfileRepositoryProvider.overrideWithValue(
                _Profiles(),
              ),
              regionRepositoryProvider.overrideWithValue(regions),
              currentAuthSubjectProvider.overrideWithValue('synthetic-owner'),
              authSessionProvider.overrideWith(
                (ref) => const Stream<AuthSession>.empty(),
              ),
              activityAreaProvider.overrideWith(_ExistingActivityArea.new),
            ],
            child: const MaterialApp(home: Scaffold(body: ActivityAreaBar())),
          ),
        );
        await tester.pumpAndSettle();
        await tester.tap(find.text('Pasir Ris'));
        await tester.pumpAndSettle();

        expect(tester.takeException(), isNull);
        expect(find.text('Areas couldn’t be loaded.'), findsOneWidget);
        expect(find.text('Pasir Ris'), findsOneWidget);
        expect(find.text('Selected area'), findsOneWidget);
        await tester.pump(const Duration(seconds: 10));
        expect(regions.reads, 1);
        await tester.tap(
          find.text(retryWithArea ? 'Pasir Ris' : 'Retry areas'),
        );
        await tester.pumpAndSettle();

        expect(find.text('Search Singapore areas'), findsOneWidget);
        expect(find.text('Tampines'), findsOneWidget);
        expect(regions.reads, 2);
        Navigator.of(tester.element(find.text('Tampines'))).pop();
        await tester.pumpAndSettle();
        expect(find.text('Pasir Ris'), findsOneWidget);
        expect(find.text('Selected area'), findsOneWidget);
      },
    );
  }

  testWidgets(
    'area catalogue failure preserves saved area and offers a read-only retry',
    (tester) async {
      final profiles = _Profiles();
      final regions = _RetryingRegions();
      await tester.pumpWidget(
        ProviderScope(
          retry: (_, _) => null,
          overrides: [
            recommendationProfileRepositoryProvider.overrideWithValue(profiles),
            regionRepositoryProvider.overrideWithValue(regions),
            currentAuthSubjectProvider.overrideWithValue('synthetic-owner'),
            authSessionProvider.overrideWith(
              (ref) => const Stream<AuthSession>.empty(),
            ),
          ],
          child: const MaterialApp(home: RecommendationProfilePage()),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('TM'), findsOneWidget);
      expect(find.text('Not set'), findsNothing);
      expect(find.text('Areas couldn’t be loaded.'), findsOneWidget);
      expect(
        tester
            .widget<ListTile>(find.byKey(const Key('recommendation-home-area')))
            .onTap,
        isNull,
      );
      await tester.tap(find.text('Retry areas'));
      await tester.pumpAndSettle();

      expect(find.text('Tampines'), findsOneWidget);
      expect(find.text('Areas couldn’t be loaded.'), findsNothing);
      expect(regions.reads, 2);
      expect(profiles.saves, 0);
      expect(find.text('Discard unsaved changes?'), findsNothing);
    },
  );

  for (final (size, scale, keyboard) in [
    (const Size(375, 667), 1.0, 300.0),
    (const Size(320, 640), 2.0, 260.0),
    (const Size(667, 375), 2.0, 150.0),
  ]) {
    testWidgets('area result stays above keyboard at $size / ${scale}x', (
      tester,
    ) async {
      tester.view.physicalSize = size;
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetViewInsets);
      PlanningArea? chosen;
      await tester.pumpWidget(
        MaterialApp(
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context).copyWith(
              textScaler: TextScaler.linear(scale),
              disableAnimations: true,
            ),
            child: child!,
          ),
          home: Scaffold(
            body: Builder(
              builder: (context) => TextButton(
                onPressed: () async {
                  chosen = await choosePlanningArea(context, [
                    for (var index = 0; index < 10; index++)
                      PlanningArea(
                        code: 'A$index',
                        name: 'Area $index',
                        regionCode: 'R',
                        regionName: 'Synthetic region',
                      ),
                  ]);
                },
                child: const Text('Choose area'),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Choose area'));
      await tester.pumpAndSettle();
      tester.view.viewInsets = FakeViewPadding(bottom: keyboard);
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), 'No such area');
      await tester.pumpAndSettle();
      expect(
        find.text('No matching areas. Try another search.'),
        findsOneWidget,
      );
      await tester.enterText(find.byType(TextField), '');
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.text('Area 9'),
        200,
        scrollable: find.descendant(
          of: find.byType(ListView),
          matching: find.byType(Scrollable),
        ),
      );
      await tester.pumpAndSettle();

      expect(
        tester.getBottomRight(find.text('Area 9')).dy,
        lessThanOrEqualTo(size.height - keyboard),
      );
      expect(tester.takeException(), isNull);
      await tester.tap(find.text('Area 9'));
      await tester.pumpAndSettle();
      expect(chosen?.code, 'A9');
    });
  }
}
