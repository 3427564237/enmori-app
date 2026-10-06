import '../../../core/result/result.dart';
import 'account_repository.dart';

enum ProfileVisibility { private, friendsOnly, public }

final class OwnProfile {
  const OwnProfile({
    required this.username,
    required this.displayName,
    required this.visibility,
    required this.revision,
  });
  final String username;
  final String? displayName;
  final ProfileVisibility visibility;
  final int revision;
}

final class OwnSettings {
  const OwnSettings({
    required this.checkInVisibility,
    required this.consent,
    required this.revision,
  });
  final CheckInVisibility checkInVisibility;
  final OptionalProcessingConsent consent;
  final int revision;
}

abstract interface class AccountPreferencesRepository {
  Future<Result<OwnProfile>> readProfile();
  Future<Result<OwnSettings>> readSettings();
  Future<Result<OwnProfile>> saveProfile({
    required String? displayName,
    required ProfileVisibility visibility,
    required int expectedRevision,
  });
  Future<Result<OwnSettings>> saveSettings({
    required CheckInVisibility visibility,
    required OptionalProcessingConsent consent,
    required int expectedRevision,
  });
}
