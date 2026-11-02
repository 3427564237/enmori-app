import 'content_access.dart';
import 'domain/profile_location_repository.dart';
import 'data/geolocator_profile_location_repository.dart';

import 'package:enmori/features/account/domain/profile_details.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/result/result.dart';
import '../auth/auth_providers.dart';
import 'domain/account_preferences_repository.dart';
import 'domain/account_repository.dart';

// The selected composition passes this same value to its Conversation mapper.
// It never converts a stored grant for another processor.
final aiClientProcessingProvider = Provider<AiClientProcessing>(
  (ref) => AiClientProcessing.local,
);

final accountPreferencesRepositoryProvider =
    Provider<AccountPreferencesRepository>(
      (ref) => const _UnavailablePreferences(),
    );

final ownProfileDetailsProvider = FutureProvider.autoDispose
    .family<Result<OwnProfile>, String>((ref, subject) {
      final access = ref.watch(contentAccessProvider);
      final current = ref.watch(currentAuthSubjectProvider);
      if (!access.foreground) {
        return const Failure(
          AppFailure(
            kind: AppFailureKind.serviceUnavailable,
            message: 'Return to reload current access.',
          ),
        );
      }
      if (current != subject) {
        return const Failure(
          AppFailure(
            kind: AppFailureKind.authRequired,
            message: 'Sign in again.',
          ),
        );
      }
      return ref.watch(accountPreferencesRepositoryProvider).readProfile();
    });

final class _UnavailablePreferences implements AccountPreferencesRepository {
  const _UnavailablePreferences();
  static const _failure = AppFailure(
    kind: AppFailureKind.configurationUnavailable,
    message: 'The service is not configured.',
  );
  @override
  Future<Result<OwnProfile>> readProfile() async => const Failure(_failure);
  @override
  Future<Result<OwnSettings>> readSettings() async => const Failure(_failure);
  @override
  Future<Result<OwnProfile>> saveProfile({
    ProfileDetails? details,
    required String? displayName,
    required ProfileVisibility visibility,
    required int expectedRevision,
  }) async => const Failure(_failure);
  @override
  Future<Result<OwnSettings>> saveSettings({
    CloudAiConsent? cloudAiConsent,
    bool? defaultCheckInLocation,
    bool? defaultCheckInWeather,
    bool? homeWeatherAuto,
    FieldPrivacy? fieldPrivacy,
    required CheckInVisibility visibility,
    required OptionalProcessingConsent consent,
    required int expectedRevision,
  }) async => const Failure(_failure);
}

final profileLocationRepositoryProvider = Provider<ProfileLocationRepository>(
  (ref) => const GeolocatorProfileLocationRepository(),
);

// Confirmed Settings observations, scoped to the observed login session. A
// revision fence prevents late reads from undoing a newer privacy decision.
final accountSettingsSnapshotProvider =
    NotifierProvider<AccountSettingsSnapshot, OwnSettings?>(
      AccountSettingsSnapshot.new,
    );

class AccountSettingsSnapshot extends Notifier<OwnSettings?> {
  @override
  OwnSettings? build() {
    ref.watch(authSessionProvider);
    return null;
  }

  void observe(OwnSettings settings) {
    if (state == null || settings.revision >= state!.revision) state = settings;
  }
}
