import 'package:flutter_test/flutter_test.dart';
import 'package:enmori/features/account/domain/account_preferences_repository.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/account/domain/profile_details.dart';
import 'package:enmori/features/account/presentation/preferences_recovery.dart';

void main() {
  test('affiliation stays atomic while unrelated remote fields survive', () {
    const base = OwnProfile(
      username: 'member',
      displayName: null,
      visibility: ProfileVisibility.private,
      revision: 1,
      details: ProfileDetails(
        affiliationType: AffiliationType.school,
        affiliationName: 'School A',
      ),
    );
    const draft = OwnProfile(
      username: 'member',
      displayName: 'My name',
      visibility: ProfileVisibility.private,
      revision: 1,
      details: ProfileDetails(
        affiliationType: AffiliationType.school,
        affiliationName: 'School B',
      ),
    );
    const latest = OwnProfile(
      username: 'member',
      displayName: null,
      visibility: ProfileVisibility.friendsOnly,
      revision: 7,
      details: ProfileDetails(
        affiliationType: AffiliationType.company,
        affiliationName: 'Company C',
        region: 'New region',
      ),
    );
    final review = reviewProfileDraft(base: base, draft: draft, latest: latest);
    expect(review.value.revision, 7);
    expect(review.value.displayName, 'My name');
    expect(review.value.visibility, ProfileVisibility.friendsOnly);
    expect(review.value.details.region, 'New region');
    expect(review.value.details.affiliationType, AffiliationType.school);
    expect(review.value.details.affiliationName, 'School B');
    expect(review.conflicts, ['School / company']);
  });

  test('recovering a weather edit never restores revoked remote sharing or consent', () {
    const base = OwnSettings(
      checkInVisibility: CheckInVisibility.public,
      consent: OptionalProcessingConsent.accepted,
      revision: 1,
      fieldPrivacy: FieldPrivacy(mapSharedWithFriends: true),
    );
    const draft = OwnSettings(
      checkInVisibility: CheckInVisibility.public,
      consent: OptionalProcessingConsent.accepted,
      revision: 1,
      homeWeatherAuto: true,
      fieldPrivacy: FieldPrivacy(mapSharedWithFriends: true),
    );
    const latest = OwnSettings(
      checkInVisibility: CheckInVisibility.private,
      consent: OptionalProcessingConsent.rejected,
      revision: 9,
      defaultCheckInLocation: true,
    );
    final review = reviewSettingsDraft(
      base: base,
      draft: draft,
      latest: latest,
    );
    expect(review.value.homeWeatherAuto, isTrue);
    expect(review.value.defaultCheckInLocation, isTrue);
    expect(review.value.defaultCheckInWeather, isFalse);
    expect(review.value.consent, OptionalProcessingConsent.rejected);
    expect(review.value.checkInVisibility, CheckInVisibility.private);
    expect(review.value.fieldPrivacy.mapSharedWithFriends, isFalse);
    expect(review.value.revision, 9);
    expect(review.conflicts, isEmpty);
  });

  test('an already committed draft produces no artificial conflict', () {
    const base = OwnSettings(
      checkInVisibility: CheckInVisibility.private,
      consent: OptionalProcessingConsent.rejected,
      revision: 1,
    );
    const draft = OwnSettings(
      checkInVisibility: CheckInVisibility.friendsOnly,
      consent: OptionalProcessingConsent.rejected,
      revision: 1,
    );
    const latest = OwnSettings(
      checkInVisibility: CheckInVisibility.friendsOnly,
      consent: OptionalProcessingConsent.rejected,
      revision: 2,
    );
    final review = reviewSettingsDraft(
      base: base,
      draft: draft,
      latest: latest,
    );
    expect(review.value.checkInVisibility, latest.checkInVisibility);
    expect(review.conflicts, isEmpty);
  });
}
