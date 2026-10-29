import '../../../core/result/result.dart';

final class RecommendationProfile {
  const RecommendationProfile({
    this.birthDate,
    this.homeAreaCode,
    this.autoActivityLocation = false,
    this.discoverable = false,
    this.matchInterests = false,
    this.matchRegion = false,
    this.matchAffiliation = false,
    this.matchAge = false,
    this.onboardingPromptSeen = false,
    this.revision = 0,
  });
  final String? birthDate, homeAreaCode;
  final bool autoActivityLocation,
      discoverable,
      matchInterests,
      matchRegion,
      matchAffiliation,
      matchAge,
      onboardingPromptSeen;
  final int revision;
}

abstract interface class RecommendationProfileRepository {
  Future<Result<RecommendationProfile>> read();
  Future<Result<RecommendationProfile>> save(RecommendationProfile profile);
}

final class PlanningArea {
  const PlanningArea({
    required this.code,
    required this.name,
    required this.regionCode,
    required this.regionName,
  });
  final String code, name, regionCode, regionName;
}

abstract interface class RegionRepository {
  Future<List<PlanningArea>> catalogue();
  Future<Result<PlanningArea>> locate();
}
