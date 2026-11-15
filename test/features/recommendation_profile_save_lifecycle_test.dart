import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/recommendation_profile/domain/recommendation_profile.dart';
import 'package:enmori/features/recommendation_profile/presentation/recommendation_profile_page.dart';
import 'package:enmori/features/recommendation_profile/recommendation_profile_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

const _area = PlanningArea(
  code: 'TM',
  name: 'Tampines',
  regionCode: 'ER',
  regionName: 'East Region',
);
const _unknown = Failure<RecommendationProfile>(
  AppFailure(
    kind: AppFailureKind.serviceUnavailable,
    message: 'Synthetic unknown result',
  ),
);

class _Profiles implements RecommendationProfileRepository {
  final result = Completer<Result<RecommendationProfile>>();
  RecommendationProfile? attempted;
  RecommendationProfile stored = const RecommendationProfile(
    homeAreaCode: 'TM',
    onboardingPromptSeen: true,
    discoverable: true,
    matchInterests: true,
    revision: 7,
  );

  @override
  Future<Result<RecommendationProfile>> read() async => Success(stored);

  @override
  Future<Result<RecommendationProfile>> save(
    RecommendationProfile value,
  ) async {
    attempted = value;
    final outcome = await result.future;
    if (outcome case Success<RecommendationProfile>(:final value)) {
      stored = value;
    }
    return outcome;
  }
}

class _Regions implements RegionRepository {
  @override
  Future<List<PlanningArea>> catalogue() async => const [_area];
  @override
  Future<Result<PlanningArea>> locate() async => const Success(_area);
}

Future<void> _open(
  WidgetTester tester,
  _Profiles profiles, {
  Stream<AuthSession>? sessions,
  bool onboarding = false,
  ActivityAreaController Function()? activity,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      retry: (_, _) => null,
      overrides: [
        if (activity != null) activityAreaProvider.overrideWith(activity),
        recommendationProfileRepositoryProvider.overrideWithValue(profiles),
        regionRepositoryProvider.overrideWithValue(_Regions()),
        currentAuthSubjectProvider.overrideWithValue('synthetic-owner'),
        authSessionProvider.overrideWith(
          (ref) => sessions ?? const Stream<AuthSession>.empty(),
        ),
      ],
      child: MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: TextButton(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) =>
                      RecommendationProfilePage(onboarding: onboarding),
                ),
              ),
              child: const Text('Open profile'),
            ),
          ),
        ),
      ),
    ),
  );
  await tester.tap(find.text('Open profile'));
  await tester.pumpAndSettle();
}

Future<void> _editAndSave(WidgetTester tester, {bool edit = true}) async {
  if (edit) {
    await tester.tap(find.byTooltip('Clear'));
    await tester.pumpAndSettle();
  }
  final save = find.widgetWithText(FilledButton, 'Save');
  await tester.scrollUntilVisible(
    save,
    350,
    scrollable: find.byType(Scrollable).first,
  );
  await tester.tap(save);
  await tester.pump();
}

class _PendingActivityArea extends ActivityAreaController {
  final refreshed = Completer<void>();
  @override
  ActivityArea build() => const ActivityArea();
  @override
  Future<void> refresh() => refreshed.future;
}

void main() {
  testWidgets('setup waits for the post-save refresh before advancing once', (
    tester,
  ) async {
    final profiles = _Profiles();
    final activity = _PendingActivityArea();
    await _open(tester, profiles, onboarding: true, activity: () => activity);
    final save = find.widgetWithText(FilledButton, 'Save and continue');
    await tester.scrollUntilVisible(
      save,
      350,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(save);
    await tester.pump();
    profiles.result.complete(Success(profiles.attempted!));
    await tester.pump();
    expect(
      tester.widget<FilledButton>(find.byType(FilledButton).last).onPressed,
      isNull,
    );
    await tester.pageBack();
    await tester.pump();
    expect(find.byType(RecommendationProfilePage), findsOneWidget);
    activity.refreshed.complete();
    await tester.pumpAndSettle();
    expect(find.byType(RecommendationProfilePage), findsNothing);
    expect(find.text('Open profile'), findsOneWidget);
  });

  testWidgets(
    'saved comparison hides private values when the login session changes',
    (tester) async {
      final sessions = StreamController<AuthSession>();
      addTearDown(sessions.close);
      final profiles = _Profiles();
      await _open(tester, profiles, sessions: sessions.stream);
      await _editAndSave(tester);
      profiles.result.complete(_unknown);
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(find.text('Read saved version'), 200);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Read saved version'));
      await tester.pumpAndSettle();
      expect(find.text('Review saved version'), findsOneWidget);
      sessions.add(const AuthSessionUnauthenticated());
      await tester.pumpAndSettle();
      expect(find.text('Review saved version'), findsNothing);
      expect(find.text('Tampines'), findsNothing);
      expect(find.text('Load saved'), findsNothing);
      expect(find.text('Session changed. Reopen this page.'), findsWidgets);
    },
  );

  testWidgets('saving an unchanged profile also blocks Back until the result', (
    tester,
  ) async {
    final profiles = _Profiles();
    await _open(tester, profiles);
    await _editAndSave(tester, edit: false);
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(find.byType(RecommendationProfilePage), findsOneWidget);
    expect(find.text('Discard unsaved changes?'), findsNothing);
    profiles.result.complete(Success(profiles.attempted!));
    await tester.pumpAndSettle();
    expect(
      find.textContaining('Wait for the result before leaving'),
      findsNothing,
    );
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(find.byType(RecommendationProfilePage), findsNothing);
  });

  testWidgets(
    'dismissing readback keeps uncertainty until an explicit choice',
    (tester) async {
      final profiles = _Profiles();
      await _open(tester, profiles);
      await _editAndSave(tester);
      profiles.result.complete(_unknown);
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(find.text('Read saved version'), 200);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Read saved version'));
      await tester.pumpAndSettle();
      Navigator.of(tester.element(find.byType(AlertDialog))).pop();
      await tester.pumpAndSettle();
      expect(find.text('Read saved version'), findsOneWidget);
      await tester.scrollUntilVisible(
        find.widgetWithText(FilledButton, 'Save'),
        100,
      );
      expect(
        tester
            .widget<FilledButton>(find.widgetWithText(FilledButton, 'Save'))
            .onPressed,
        isNull,
      );
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.text('Save result not confirmed'), findsOneWidget);
    },
  );

  testWidgets(
    'pending save blocks Back without offering to discard the sent write',
    (tester) async {
      final profiles = _Profiles();
      await _open(tester, profiles);
      await _editAndSave(tester);
      expect(profiles.attempted!.homeAreaCode, isNull);
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.text('Discard unsaved changes?'), findsNothing);
      expect(find.byType(RecommendationProfilePage), findsOneWidget);
      expect(
        find.textContaining('Wait for the result before leaving'),
        findsOneWidget,
      );
      profiles.result.complete(Success(profiles.attempted!));
      await tester.pumpAndSettle();
      expect(profiles.stored.homeAreaCode, isNull);
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.byType(RecommendationProfilePage), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('unknown save explains leaving cannot cancel a possible write', (
    tester,
  ) async {
    final profiles = _Profiles();
    await _open(tester, profiles);
    await _editAndSave(tester);
    profiles.result.complete(_unknown);
    await tester.pumpAndSettle();
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(find.text('Discard unsaved changes?'), findsNothing);
    expect(find.text('Save result not confirmed'), findsOneWidget);
    expect(find.textContaining('Leaving will not cancel it'), findsOneWidget);
    await tester.tap(find.text('Stay and check'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Read saved version'), 200);
    expect(find.text('Read saved version'), findsOneWidget);
    await tester.pageBack();
    await tester.pumpAndSettle();
    await tester.tap(find.text('Leave page'));
    await tester.pumpAndSettle();
    expect(find.byType(RecommendationProfilePage), findsNothing);
  });

  testWidgets(
    'untouched draft can still be discarded before any save is sent',
    (tester) async {
      final profiles = _Profiles();
      await _open(tester, profiles);
      await tester.tap(find.byTooltip('Clear'));
      await tester.pumpAndSettle();
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.text('Discard unsaved changes?'), findsOneWidget);
      await tester.tap(find.text('Discard'));
      await tester.pumpAndSettle();
      expect(find.byType(RecommendationProfilePage), findsNothing);
      expect(profiles.attempted, isNull);
      expect(profiles.stored.homeAreaCode, 'TM');
    },
  );

  for (final width in [320.0, 390.0]) {
    testWidgets(
      'saved-version comparison uses readable values at width $width',
      (tester) async {
        await tester.binding.setSurfaceSize(Size(width, 640));
        addTearDown(() => tester.binding.setSurfaceSize(null));
        final profiles = _Profiles();
        await _open(tester, profiles);
        await _editAndSave(tester);
        profiles.result.complete(_unknown);
        await tester.pumpAndSettle();
        await tester.scrollUntilVisible(find.text('Read saved version'), 200);
        await tester.tap(find.text('Read saved version'));
        await tester.pumpAndSettle();
        final dialog = find.byType(AlertDialog);
        expect(
          find.descendant(of: dialog, matching: find.text('Saved')),
          findsOneWidget,
        );
        expect(
          find.descendant(of: dialog, matching: find.text('Your draft')),
          findsOneWidget,
        );
        expect(
          find.descendant(of: dialog, matching: find.text('Tampines')),
          findsOneWidget,
        );
        expect(
          find.descendant(of: dialog, matching: find.text('Not set')),
          findsWidgets,
        );
        expect(
          find.descendant(of: dialog, matching: find.text('On')),
          findsWidgets,
        );
        expect(find.textContaining('true'), findsNothing);
        expect(find.textContaining('false'), findsNothing);
        expect(tester.takeException(), isNull);
        await tester.tap(find.text('Load saved'));
        await tester.pumpAndSettle();
        await tester.pageBack();
        await tester.pumpAndSettle();
        expect(find.byType(RecommendationProfilePage), findsNothing);
        expect(profiles.stored.homeAreaCode, 'TM');
      },
    );
  }
}
