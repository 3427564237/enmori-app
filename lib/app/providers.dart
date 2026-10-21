import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/network/backend_api_client.dart';
import '../core/result/result.dart';
import '../features/account/account_providers.dart';
import '../features/account/domain/account_repository.dart';
import '../features/auth/auth_providers.dart';
import '../features/auth/domain/auth_repository.dart';

final backendBaseUriProvider = Provider<Uri?>((ref) {
  const configured = String.fromEnvironment('ENMORI_API_BASE_URL');
  return parseApprovedBackendBaseUri(configured);
});

final backendApiClientProvider = Provider<BackendApiClient>((ref) {
  final client = BackendApiClient(
    ref.watch(backendBaseUriProvider),
    ref.watch(authRepositoryProvider).getIdToken,
  );
  ref.onDispose(client.close);
  return client;
});

// Navigation intent only. AuthRepository's observed session still controls the gate.
final signOutEntryProvider = NotifierProvider<SignOutEntry, bool>(
  SignOutEntry.new,
);

final class SignOutEntry extends Notifier<bool> {
  @override
  bool build() => false;
  void requested(bool value) => state = value;
}

enum RouterGateState {
  resolving,
  unauthenticated,
  signInRequired,
  onboardingRequired,
  authenticated,
  unavailable,
  configurationUnavailable,
  forbidden,
}

final routerGateProvider = Provider<RouterGateState>((ref) {
  final session = ref.watch(authSessionProvider);
  return switch (session) {
    AsyncLoading<AuthSession>() => RouterGateState.resolving,
    AsyncError<AuthSession>(:final error) =>
      error is AppFailure &&
              error.kind == AppFailureKind.configurationUnavailable
          ? RouterGateState.configurationUnavailable
          : RouterGateState.unavailable,
    AsyncData<AuthSession>(value: AuthSessionInitializing()) =>
      RouterGateState.resolving,
    AsyncData<AuthSession>(value: AuthSessionUnauthenticated()) =>
      RouterGateState.unauthenticated,
    AsyncData<AuthSession>(value: AuthSessionAuthenticated(:final subject)) =>
      _foldOnboarding(ref.watch(onboardingStatusProvider(subject))),
  };
});

RouterGateState _foldOnboarding(AsyncValue<Result<OnboardingStatus>> status) {
  return switch (status) {
    AsyncLoading<Result<OnboardingStatus>>() => RouterGateState.resolving,
    AsyncError<Result<OnboardingStatus>>() => RouterGateState.unavailable,
    AsyncData<Result<OnboardingStatus>>(
      value: Success<OnboardingStatus>(value: OnboardingRequired()),
    ) =>
      RouterGateState.onboardingRequired,
    AsyncData<Result<OnboardingStatus>>(
      value: Success<OnboardingStatus>(value: OnboardingCompleted()),
    ) =>
      RouterGateState.authenticated,
    AsyncData<Result<OnboardingStatus>>(
      value: Failure<OnboardingStatus>(:final failure),
    ) =>
      switch (failure.kind) {
        AppFailureKind.authRequired => RouterGateState.signInRequired,
        AppFailureKind.authForbidden => RouterGateState.forbidden,
        AppFailureKind.configurationUnavailable =>
          RouterGateState.configurationUnavailable,
        _ => RouterGateState.unavailable,
      },
  };
}

// Disabled in normal builds; isolated integration tests explicitly override it.
final isolatedSlicesEnabledProvider = Provider<bool>((ref) => false);

final remoteGroupFeaturesEnabledProvider = Provider<bool>((ref) => false);
