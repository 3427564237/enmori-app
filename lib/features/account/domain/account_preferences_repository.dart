import 'profile_details.dart';
import '../../../core/result/result.dart';
import 'account_repository.dart';

import 'cloud_ai_consent.dart';
export 'cloud_ai_consent.dart';

enum ProfileVisibility { private, friendsOnly, public }

final class OwnProfile {
  const OwnProfile({
    this.details = const ProfileDetails(),
    required this.username,
    required this.displayName,
    required this.visibility,
    required this.revision,
  });
  final ProfileDetails details;
  final String username;
  final String? displayName;
  final ProfileVisibility visibility;
  final int revision;
}

final class OwnSettings {
  const OwnSettings({
    this.cloudAiConsent,
    this.defaultCheckInLocation = false,
    this.defaultCheckInWeather = false,
    this.homeWeatherAuto = false,
    this.fieldPrivacy = const FieldPrivacy(),
    required this.checkInVisibility,
    required this.consent,
    required this.revision,
  });
  final CloudAiConsent? cloudAiConsent;
  final bool defaultCheckInLocation, defaultCheckInWeather, homeWeatherAuto;
  final FieldPrivacy fieldPrivacy;
  final CheckInVisibility checkInVisibility;
  final OptionalProcessingConsent consent;
  final int revision;
}

abstract interface class AccountPreferencesRepository {
  Future<Result<OwnProfile>> readProfile();
  Future<Result<OwnSettings>> readSettings();
  Future<Result<OwnProfile>> saveProfile({
    ProfileDetails? details,
    bool preserveRegion = false,
    required String? displayName,
    required ProfileVisibility visibility,
    required int expectedRevision,
  });
  Future<Result<OwnSettings>> saveSettings({
    CloudAiConsent? cloudAiConsent,
    bool? defaultCheckInLocation,
    bool? defaultCheckInWeather,
    bool? homeWeatherAuto,
    FieldPrivacy? fieldPrivacy,
    required CheckInVisibility visibility,
    required OptionalProcessingConsent consent,
    required int expectedRevision,
  });
}
