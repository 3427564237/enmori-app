import '../../../core/result/result.dart';
import '../../account/domain/profile_details.dart';
import '../../check_in/domain/check_in_repository.dart';
import '../../weather/domain/weather.dart';

enum SocialRelationship { self, friend, other }

final class SharedInterest {
  const SharedInterest(this.id, this.name);
  final String id, name;
}

final class SocialProfile {
  const SocialProfile({
    required this.username,
    required this.displayName,
    required this.details,
    required this.relationship,
    required this.specialCare,
    required this.friendshipRevision,
    required this.interests,
    required this.mapAvailable,
    required this.participationAvailable,
  });
  final String username;
  final String? displayName;
  final ProfileDetails details;
  final SocialRelationship relationship;
  final bool specialCare, mapAvailable, participationAvailable;
  final int friendshipRevision;
  final List<SharedInterest> interests;
}

final class CheckInMapPoint {
  const CheckInMapPoint({
    required this.checkInId,
    required this.createdAt,
    required this.location,
  });
  final String checkInId;
  final DateTime createdAt;
  final GeoPoint location;
}

final class SocialMonth {
  const SocialMonth({
    required this.month,
    required this.timeZone,
    required this.counts,
    required this.points,
  });
  final String month, timeZone;
  final Map<String, int> counts;
  final List<CheckInMapPoint> points;
}

final class FriendCare {
  const FriendCare(this.specialCare, this.revision);
  final bool specialCare;
  final int revision;
}

abstract interface class SocialRepository {
  Future<Result<SocialProfile>> profile(String username);
  Future<Result<CheckIn>> record(String username, String checkInId);
  Future<Result<CheckInHistoryPage>> records(
    String username, {
    required String date,
    required String timeZone,
    String? cursor,
  });
  Future<Result<SocialMonth>> month(
    String username, {
    required String month,
    required String timeZone,
  });
  Future<Result<FriendCare>> care(
    String username, {
    required bool specialCare,
    required int expectedRevision,
  });
  Future<Result<void>> remove(String username, {required int expectedRevision});
}
