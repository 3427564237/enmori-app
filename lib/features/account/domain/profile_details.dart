import 'account_preferences_repository.dart';

enum AffiliationType { school, company }

final class ProfileDetails {
  const ProfileDetails({
    this.bio,
    this.affiliationType,
    this.affiliationName,
    this.region,
  });
  final String? bio;
  final AffiliationType? affiliationType;
  final String? affiliationName;
  final String? region;
}

final class FieldPrivacy {
  const FieldPrivacy({
    this.interests = ProfileVisibility.private,
    this.location = ProfileVisibility.private,
    this.participation = ProfileVisibility.private,
    this.mapSharedWithFriends = false,
  });
  final ProfileVisibility interests;
  final ProfileVisibility location;
  final ProfileVisibility participation;
  final bool mapSharedWithFriends;
}
