import 'package:enmori/app/enmori_theme.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/recommendation_profile/domain/recommendation_profile.dart';
import 'package:enmori/features/recommendation_profile/presentation/recommendation_profile_page.dart';
import 'package:enmori/features/recommendation_profile/recommendation_profile_providers.dart';
import 'package:enmori/harness/social/offline_social_app.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Standalone manual fixture. It never boots Firebase, HTTP, or device location.
void main() {
  runApp(const _Preview());
}

class _Preview extends StatefulWidget {
  const _Preview();
  @override
  State<_Preview> createState() => _PreviewState();
}

class _PreviewState extends State<_Preview> {
  bool _chinese = false;
  bool _largeText = false;
  bool _keyboard = false;

  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'Offline recommendation profile review',
    theme: enmoriTheme(),
    locale: Locale(_chinese ? 'zh' : 'en'),
    supportedLocales: const [Locale('en'), Locale('zh')],
    localizationsDelegates: GlobalMaterialLocalizations.delegates,
    builder: (context, child) => Stack(
      children: [
        MediaQuery(
          data: MediaQuery.of(context).copyWith(
            textScaler: TextScaler.linear(_largeText ? 2 : 1),
            viewInsets: _keyboard
                ? const EdgeInsets.only(bottom: 280)
                : MediaQuery.viewInsetsOf(context),
            disableAnimations: true,
          ),
          child: child!,
        ),
        if (_keyboard)
          const Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            height: 280,
            child: ColoredBox(
              color: Color(0xffd7ded5),
              child: Center(
                child: Text(
                  'Simulated keyboard · 280 dp',
                  style: TextStyle(
                    color: Color(0xff203b32),
                    fontSize: 16,
                    decoration: TextDecoration.none,
                  ),
                ),
              ),
            ),
          ),
      ],
    ),
    home: Builder(
      builder: (context) => Scaffold(
        appBar: AppBar(title: const Text('Offline usability fixture')),
        body: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const Text(
              'Synthetic records only. The first area catalogue read fails; '
              'Retry areas loads a local list. Save is disabled at the fake '
              'repository boundary. No account, location, or server is used.',
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () => Navigator.of(context).push<void>(
                MaterialPageRoute(builder: (_) => const _AreaProfilePreview()),
              ),
              child: const Text('Open production recommendation profile'),
            ),
            OutlinedButton(
              onPressed: () => Navigator.of(context).push<void>(
                MaterialPageRoute(
                  builder: (_) => const OfflineSocialApp(accountSetup: true),
                ),
              ),
              child: const Text('Open offline registration'),
            ),
            const Text(
              'Registration uses synthetic account setup without a server.',
            ),
            SwitchListTile(
              title: const Text('Chinese interface'),
              value: _chinese,
              onChanged: (value) => setState(() => _chinese = value),
            ),
            SwitchListTile(
              title: const Text('2× text'),
              value: _largeText,
              onChanged: (value) => setState(() => _largeText = value),
            ),
            SwitchListTile(
              title: const Text('Simulate a 280 dp keyboard'),
              value: _keyboard,
              onChanged: (value) => setState(() => _keyboard = value),
            ),
          ],
        ),
      ),
    ),
  );
}

class _AreaProfilePreview extends StatelessWidget {
  const _AreaProfilePreview();

  @override
  Widget build(BuildContext context) => ProviderScope(
    retry: (_, _) => null,
    overrides: [
      recommendationProfileRepositoryProvider.overrideWithValue(_Profiles()),
      regionRepositoryProvider.overrideWithValue(_Regions()),
      currentAuthSubjectProvider.overrideWithValue('synthetic-preview'),
      authSessionProvider.overrideWith(
        (ref) => const Stream<AuthSession>.empty(),
      ),
    ],
    child: const RecommendationProfilePage(),
  );
}

class _Profiles implements RecommendationProfileRepository {
  @override
  Future<Result<RecommendationProfile>> read() async => const Success(
    RecommendationProfile(homeAreaCode: 'TM', onboardingPromptSeen: true),
  );

  @override
  Future<Result<RecommendationProfile>> save(RecommendationProfile p) async =>
      const Failure(
        AppFailure(
          kind: AppFailureKind.configurationUnavailable,
          message: 'This offline fixture does not save.',
        ),
      );
}

class _Regions implements RegionRepository {
  int _reads = 0;

  @override
  Future<List<PlanningArea>> catalogue() async {
    await Future<void>.delayed(const Duration(milliseconds: 500));
    if (++_reads == 1) throw StateError('Synthetic area catalogue failure');
    return [
      for (var index = 0; index < 9; index++)
        PlanningArea(
          code: 'S$index',
          name: 'Synthetic area $index',
          regionCode: 'SR',
          regionName: 'Synthetic region',
        ),
      const PlanningArea(
        code: 'TM',
        name: 'Tampines',
        regionCode: 'ER',
        regionName: 'East Region',
      ),
    ];
  }

  @override
  Future<Result<PlanningArea>> locate() async => const Failure(
    AppFailure(
      kind: AppFailureKind.configurationUnavailable,
      message: 'This offline fixture does not access location.',
    ),
  );
}
