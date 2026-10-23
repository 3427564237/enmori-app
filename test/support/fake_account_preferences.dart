import 'package:enmori/features/account/domain/profile_details.dart';

import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/domain/account_preferences_repository.dart';
import 'package:enmori/features/account/domain/account_repository.dart';

final class FakeAccountPreferences implements AccountPreferencesRepository {
  OwnProfile profile = const OwnProfile(
    username: 'member_a',
    displayName: null,
    visibility: ProfileVisibility.private,
    revision: 0,
  );
  OwnSettings settings = const OwnSettings(
    checkInVisibility: CheckInVisibility.private,
    consent: OptionalProcessingConsent.rejected,
    revision: 0,
  );
  final profileReads = <Future<Result<OwnProfile>>>[];
  final settingsReads = <Future<Result<OwnSettings>>>[];
  Completer<Result<OwnProfile>>? pendingSave;
  AppFailure? saveFailure;
  int profileReadCount = 0, settingsReadCount = 0;
  final profileNames = <String?>[];
  final profileRevisions = <int>[];
  int settingsSaveCount = 0;
  @override
  Future<Result<OwnProfile>> readProfile() async {
    profileReadCount++;
    return profileReads.isEmpty ? Success(profile) : profileReads.removeAt(0);
  }

  @override
  Future<Result<OwnSettings>> readSettings() async {
    settingsReadCount++;
    return settingsReads.isEmpty
        ? Success(settings)
        : settingsReads.removeAt(0);
  }

  @override
  Future<Result<OwnProfile>> saveProfile({
    ProfileDetails? details,
    required String? displayName,
    required ProfileVisibility visibility,
    required int expectedRevision,
  }) async {
    profileNames.add(displayName);
    profileRevisions.add(expectedRevision);
    if (saveFailure case final failure?) return Failure(failure);
    if (pendingSave case final pending?) return pending.future;
    profile = OwnProfile(
      details: details ?? profile.details,
      username: profile.username,
      displayName: displayName?.trim(),
      visibility: visibility,
      revision: expectedRevision + 1,
    );
    return Success(profile);
  }

  @override
  Future<Result<OwnSettings>> saveSettings({
    bool? defaultCheckInLocation,
    bool? defaultCheckInWeather,
    bool? homeWeatherAuto,
    FieldPrivacy? fieldPrivacy,
    required CheckInVisibility visibility,
    required OptionalProcessingConsent consent,
    required int expectedRevision,
  }) async {
    settingsSaveCount++;
    if (saveFailure case final failure?) return Failure(failure);
    settings = OwnSettings(
      defaultCheckInLocation:
          defaultCheckInLocation ?? settings.defaultCheckInLocation,
      defaultCheckInWeather:
          defaultCheckInWeather ?? settings.defaultCheckInWeather,
      homeWeatherAuto: homeWeatherAuto ?? settings.homeWeatherAuto,
      fieldPrivacy: fieldPrivacy ?? settings.fieldPrivacy,
      checkInVisibility: visibility,
      consent: consent,
      revision: expectedRevision + 1,
    );
    return Success(settings);
  }
}
