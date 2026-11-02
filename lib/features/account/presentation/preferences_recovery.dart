import '../domain/account_preferences_repository.dart';
import '../domain/profile_details.dart';

/// A transient editor review, never a mutation or a persistence/sync queue.
final class PreferenceReview<T> {
  const PreferenceReview(this.value, this.conflicts);
  final T value;
  final List<String> conflicts;
}

PreferenceReview<OwnProfile> reviewProfileDraft({
  required OwnProfile base,
  required OwnProfile draft,
  required OwnProfile latest,
}) {
  final merge = _ReviewFields();
  // Type and name form one semantic field; never mix two affiliations.
  final affiliation = merge.choose(
    'School / company',
    (base.details.affiliationType, base.details.affiliationName),
    (draft.details.affiliationType, draft.details.affiliationName),
    (latest.details.affiliationType, latest.details.affiliationName),
  );
  final value = OwnProfile(
    username: latest.username,
    revision: latest.revision,
    displayName: merge.choose(
      'Display name',
      base.displayName,
      draft.displayName,
      latest.displayName,
    ),
    visibility: merge.choose(
      'Profile visibility',
      base.visibility,
      draft.visibility,
      latest.visibility,
    ),
    details: ProfileDetails(
      bio: merge.choose(
        'BIO',
        base.details.bio,
        draft.details.bio,
        latest.details.bio,
      ),
      affiliationType: affiliation.$1,
      affiliationName: affiliation.$2,
      region: merge.choose(
        'Region',
        base.details.region,
        draft.details.region,
        latest.details.region,
      ),
    ),
  );
  return PreferenceReview(value, List.unmodifiable(merge.conflicts));
}

PreferenceReview<OwnSettings> reviewSettingsDraft({
  required OwnSettings base,
  required OwnSettings draft,
  required OwnSettings latest,
}) {
  final merge = _ReviewFields();
  final value = OwnSettings(
    cloudAiConsent: merge.choose(
      'Cloud AI processing',
      base.cloudAiConsent,
      draft.cloudAiConsent,
      latest.cloudAiConsent,
    ),
    revision: latest.revision,
    checkInVisibility: merge.choose(
      'Check-in default visibility',
      base.checkInVisibility,
      draft.checkInVisibility,
      latest.checkInVisibility,
    ),
    consent: merge.choose(
      'Optional data use',
      base.consent,
      draft.consent,
      latest.consent,
    ),
    defaultCheckInLocation: merge.choose(
      'Check-in location',
      base.defaultCheckInLocation,
      draft.defaultCheckInLocation,
      latest.defaultCheckInLocation,
    ),
    defaultCheckInWeather: merge.choose(
      'Check-in weather',
      base.defaultCheckInWeather,
      draft.defaultCheckInWeather,
      latest.defaultCheckInWeather,
    ),
    homeWeatherAuto: merge.choose(
      'Home weather',
      base.homeWeatherAuto,
      draft.homeWeatherAuto,
      latest.homeWeatherAuto,
    ),
    fieldPrivacy: FieldPrivacy(
      interests: merge.choose(
        'Interests visibility',
        base.fieldPrivacy.interests,
        draft.fieldPrivacy.interests,
        latest.fieldPrivacy.interests,
      ),
      location: merge.choose(
        'Location visibility',
        base.fieldPrivacy.location,
        draft.fieldPrivacy.location,
        latest.fieldPrivacy.location,
      ),
      participation: merge.choose(
        'Activity participation visibility',
        base.fieldPrivacy.participation,
        draft.fieldPrivacy.participation,
        latest.fieldPrivacy.participation,
      ),
      mapSharedWithFriends: merge.choose(
        'Map sharing',
        base.fieldPrivacy.mapSharedWithFriends,
        draft.fieldPrivacy.mapSharedWithFriends,
        latest.fieldPrivacy.mapSharedWithFriends,
      ),
    ),
  );
  return PreferenceReview(value, List.unmodifiable(merge.conflicts));
}

final class _ReviewFields {
  final conflicts = <String>[];
  T choose<T>(String label, T base, T draft, T latest) {
    if (draft == base) return latest;
    if (latest != base && latest != draft) conflicts.add(label);
    return draft;
  }
}
