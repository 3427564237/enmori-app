import 'domain/profile_location_repository.dart';
import 'data/geolocator_profile_location_repository.dart';

import 'package:enmori/features/account/domain/profile_details.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/result/result.dart';
import '../auth/auth_providers.dart';
import 'domain/account_preferences_repository.dart';
import 'domain/account_repository.dart';

final accountPreferencesRepositoryProvider =
    Provider<AccountPreferencesRepository>(
      (ref) => const _UnavailablePreferences(),
    );

final ownProfileDetailsProvider = FutureProvider.autoDispose
    .family<Result<OwnProfile>, String>((ref, subject) {
      final current = ref.watch(currentAuthSubjectProvider);
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
    FieldPrivacy? fieldPrivacy,
    required CheckInVisibility visibility,
    required OptionalProcessingConsent consent,
    required int expectedRevision,
  }) async => const Failure(_failure);
}

final profileLocationRepositoryProvider = Provider<ProfileLocationRepository>(
  (ref) => const GeolocatorProfileLocationRepository(),
);
