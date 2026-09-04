import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/network/backend_api_client.dart';
import '../core/result/result.dart';
import '../features/account/account_providers.dart';
import '../features/account/domain/account_repository.dart';
import '../features/auth/auth_providers.dart';
import '../features/auth/domain/auth_repository.dart';

final backendBaseUriProvider = Provider<Uri?>((ref) {
  const configured = String.fromEnvironment('ENMORI_API_BASE_URL');
  if (configured.isEmpty) return null;
  final parsed = Uri.tryParse(configured);
  if (parsed == null || !parsed.hasScheme || !parsed.hasAuthority) return null;
  return parsed;
});

final backendApiClientProvider = Provider<BackendApiClient>((ref) {
  final client = BackendApiClient(
    ref.watch(backendBaseUriProvider),
    ref.watch(authRepositoryProvider).getIdToken,
  );
  ref.onDispose(client.close);
  return client;
});

enum RouterGateState {
  resolving,
  unauthenticated,
  onboardingRequired,
  authenticated,
  unavailable,
}

final routerGateProvider = Provider<RouterGateState>((ref) {
  final session = ref.watch(authSessionProvider);
  return switch (session) {
    AsyncLoading<AuthSession>() => RouterGateState.resolving,
    AsyncError<AuthSession>() => RouterGateState.unavailable,
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
    AsyncData<Result<OnboardingStatus>>(value: Failure<OnboardingStatus>()) =>
      RouterGateState.unavailable,
  };
}
