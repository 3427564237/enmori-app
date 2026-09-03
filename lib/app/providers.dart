import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/network/backend_api_client.dart';
import '../core/network/idempotency_key_generator.dart';
import '../core/result/result.dart';
import '../features/account/data/backend_account_repository.dart';
import '../features/account/domain/account_repository.dart';
import '../features/auth/data/firebase_auth_repository.dart';
import '../features/auth/data/unavailable_auth_repository.dart';
import '../features/auth/domain/auth_repository.dart';
import '../features/check_in/data/backend_check_in_repository.dart';
import '../features/check_in/domain/check_in_repository.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  if (Firebase.apps.isEmpty) return const UnavailableAuthRepository();
  return FirebaseAuthRepository(FirebaseAuth.instance);
});

final backendBaseUriProvider = Provider<Uri?>((ref) {
  const configured = String.fromEnvironment('ENMORI_API_BASE_URL');
  if (configured.isEmpty) return null;
  final parsed = Uri.tryParse(configured);
  if (parsed == null || !parsed.hasScheme || !parsed.hasAuthority) return null;
  return parsed;
});

final idempotencyKeyGeneratorProvider = Provider<IdempotencyKeyGenerator>(
  (ref) => SecureIdempotencyKeyGenerator(),
);

final backendApiClientProvider = Provider<BackendApiClient>((ref) {
  final client = BackendApiClient(
    ref.watch(backendBaseUriProvider),
    ref.watch(authRepositoryProvider).getIdToken,
  );
  ref.onDispose(client.close);
  return client;
});

final accountRepositoryProvider = Provider<AccountRepository>((ref) {
  return BackendAccountRepository(ref.watch(backendApiClientProvider));
});

final checkInRepositoryProvider = Provider<CheckInRepository>((ref) {
  return BackendCheckInRepository(ref.watch(backendApiClientProvider));
});

final authSessionProvider = StreamProvider<AuthSession>((ref) {
  return ref.watch(authRepositoryProvider).watchSession();
});

final onboardingStatusProvider =
    FutureProvider.family<Result<OnboardingStatus>, String>((ref, subject) {
      return ref.watch(accountRepositoryProvider).readOnboardingStatus();
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
