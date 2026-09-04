import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/result/result.dart';
import 'domain/account_repository.dart';

final accountRepositoryProvider = Provider<AccountRepository>(
  (ref) => const _UnavailableAccountRepository(),
);

final onboardingStatusProvider =
    FutureProvider.family<Result<OnboardingStatus>, String>((ref, subject) {
      return ref.watch(accountRepositoryProvider).readOnboardingStatus();
    });

final class _UnavailableAccountRepository implements AccountRepository {
  const _UnavailableAccountRepository();

  @override
  Future<Result<ProductAccount>> completeOnboarding({
    required String username,
    required InitialChoice initialChoice,
    required String idempotencyKey,
  }) async => const Failure(_configurationFailure);

  @override
  Future<Result<OnboardingStatus>> readOnboardingStatus() async =>
      const Failure(_configurationFailure);
}

const _configurationFailure = AppFailure(
  kind: AppFailureKind.configurationUnavailable,
  message: 'The service is not configured.',
);
