import '../../../core/result/result.dart';

enum InitialChoice { accept, reject }

enum OptionalProcessingConsent { accepted, rejected }

enum CheckInVisibility { public, private }

final class ProductAccount {
  const ProductAccount({
    required this.username,
    required this.optionalProcessingConsent,
    required this.checkInVisibility,
    required this.onboardingCompletedAt,
  });

  final String username;
  final OptionalProcessingConsent optionalProcessingConsent;
  final CheckInVisibility checkInVisibility;
  final DateTime onboardingCompletedAt;
}

sealed class OnboardingStatus {
  const OnboardingStatus();
}

final class OnboardingRequired extends OnboardingStatus {
  const OnboardingRequired();
}

final class OnboardingCompleted extends OnboardingStatus {
  const OnboardingCompleted(this.account);

  final ProductAccount account;
}

abstract interface class AccountRepository {
  Future<Result<OnboardingStatus>> readOnboardingStatus();

  Future<Result<ProductAccount>> completeOnboarding({
    required String username,
    required InitialChoice initialChoice,
    required String idempotencyKey,
  });
}
