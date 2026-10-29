import '../domain/region_geometry.dart';
import '../../../core/network/backend_api_client.dart';
import '../../../core/result/result.dart';
import '../domain/recommendation_profile.dart';

final class BackendRecommendationProfileRepository
    implements RecommendationProfileRepository {
  const BackendRecommendationProfileRepository(this.client);
  final BackendApiClient client;
  @override
  Future<Result<RecommendationProfile>> read() async =>
      _parse(await client.get('/v1/me/recommendation-profile'));
  @override
  Future<Result<RecommendationProfile>> save(RecommendationProfile p) async =>
      _parse(
        await client.put(
          '/v1/me/recommendation-profile',
          body: {
            'birthDate': p.birthDate,
            'homeAreaCode': p.homeAreaCode,
            'autoActivityLocation': p.autoActivityLocation,
            'discoverable': p.discoverable,
            'matchInterests': p.matchInterests,
            'matchRegion': p.matchRegion,
            'matchAffiliation': p.matchAffiliation,
            'matchAge': p.matchAge,
            'onboardingPromptSeen': p.onboardingPromptSeen,
            'expectedRevision': p.revision,
          },
        ),
      );
  Result<RecommendationProfile> _parse(Result<JsonObject> r) {
    if (r case Failure<JsonObject>(:final failure)) return Failure(failure);
    try {
      final e = (r as Success<JsonObject>).value;
      final p = e['profile'];
      if (e.length != 1 ||
          p is! Map<String, dynamic> ||
          p.length != 10 ||
          !p.keys.every(
            const {
              'birthDate',
              'homeAreaCode',
              'autoActivityLocation',
              'discoverable',
              'matchInterests',
              'matchRegion',
              'matchAffiliation',
              'matchAge',
              'onboardingPromptSeen',
              'revision',
            }.contains,
          ) ||
          p['revision'] is! int ||
          (p['revision'] as int) < 0 ||
          [
            'autoActivityLocation',
            'discoverable',
            'matchInterests',
            'matchRegion',
            'matchAffiliation',
            'matchAge',
            'onboardingPromptSeen',
          ].any((k) => p[k] is! bool) ||
          (p['birthDate'] != null &&
              (p['birthDate'] is! String ||
                  !RegExp(r'^\d{4}-\d{2}-\d{2}$')
                      .hasMatch(p['birthDate'] as String))) ||
          (p['birthDate'] is String &&
              DateTime.tryParse('${p['birthDate']}T00:00:00Z')
                      ?.toIso8601String()
                      .substring(0, 10) !=
                  p['birthDate']) ||
          (p['homeAreaCode'] != null &&
              !planningAreaCodes.contains(p['homeAreaCode']))) {
        throw const FormatException();
      }
      return Success(
        RecommendationProfile(
          birthDate: p['birthDate'] as String?,
          homeAreaCode: p['homeAreaCode'] as String?,
          autoActivityLocation: p['autoActivityLocation'] as bool,
          discoverable: p['discoverable'] as bool,
          matchInterests: p['matchInterests'] as bool,
          matchRegion: p['matchRegion'] as bool,
          matchAffiliation: p['matchAffiliation'] as bool,
          matchAge: p['matchAge'] as bool,
          onboardingPromptSeen: p['onboardingPromptSeen'] as bool,
          revision: p['revision'] as int,
        ),
      );
    } catch (_) {
      return const Failure(
        AppFailure(
          kind: AppFailureKind.serviceUnavailable,
          message: 'Recommendation profile is unavailable.',
        ),
      );
    }
  }
}
