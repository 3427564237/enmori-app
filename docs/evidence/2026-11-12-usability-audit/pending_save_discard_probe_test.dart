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

const area = PlanningArea(code: 'TM', name: 'Tampines', regionCode: 'ER', regionName: 'East Region');
class PendingProfiles implements RecommendationProfileRepository {
  final result = Completer<Result<RecommendationProfile>>();
  RecommendationProfile? attempted;
  RecommendationProfile stored = const RecommendationProfile(homeAreaCode: 'TM', onboardingPromptSeen: true);
  @override
  Future<Result<RecommendationProfile>> read() async => Success(stored);
  @override
  Future<Result<RecommendationProfile>> save(RecommendationProfile value) async {
    attempted = value;
    final outcome = await result.future;
    if (outcome case Success<RecommendationProfile>(:final value)) stored = value;
    return outcome;
  }
}
class Regions implements RegionRepository {
  @override
  Future<List<PlanningArea>> catalogue() async => const [area];
  @override
  Future<Result<PlanningArea>> locate() async => const Success(area);
}
void main() {
  testWidgets('audit reproduction: pending save can be labelled discarded before it commits', (tester) async {
    final profiles = PendingProfiles();
    await tester.pumpWidget(ProviderScope(
      retry: (_, _) => null,
      overrides: [
        recommendationProfileRepositoryProvider.overrideWithValue(profiles),
        regionRepositoryProvider.overrideWithValue(Regions()),
        currentAuthSubjectProvider.overrideWithValue('synthetic-owner'),
        authSessionProvider.overrideWith((ref) => const Stream<AuthSession>.empty()),
      ],
      child: MaterialApp(home: Builder(builder: (context) => Scaffold(body: TextButton(
        onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => const RecommendationProfilePage())),
        child: const Text('Open profile'),
      )))),
    ));
    await tester.tap(find.text('Open profile'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Clear'));
    await tester.pumpAndSettle();
    final save = find.widgetWithText(FilledButton, 'Save');
    await tester.scrollUntilVisible(save, 400, scrollable: find.byType(Scrollable).first);
    await tester.tap(save);
    await tester.pump();
    expect(profiles.attempted, isNotNull);
    expect(profiles.attempted!.homeAreaCode, isNull);
    expect(find.text('Saving…'), findsOneWidget);
    expect(profiles.stored.homeAreaCode, 'TM');
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(find.text('Discard unsaved changes?'), findsOneWidget);
    await tester.tap(find.text('Discard'));
    await tester.pumpAndSettle();
    expect(find.byType(RecommendationProfilePage), findsNothing);
    expect(profiles.stored.homeAreaCode, 'TM');
    profiles.result.complete(Success(profiles.attempted!));
    await tester.pumpAndSettle();
    expect(profiles.stored.homeAreaCode, isNull);
    expect(find.byType(RecommendationProfilePage), findsNothing);
    expect(tester.takeException(), isNull);
  });
}
