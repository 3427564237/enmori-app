import '../../../core/network/backend_api_client.dart';
import '../../../core/network/utc_timestamp_parser.dart';
import '../../../core/result/result.dart';
import '../domain/account_repository.dart';

final class BackendAccountRepository implements AccountRepository {
  BackendAccountRepository(this._client);

  final BackendApiClient _client;

  @override
  Future<Result<OnboardingStatus>> readOnboardingStatus() async {
    final response = await _client.get('/v1/me/onboarding');
    return switch (response) {
      Failure<JsonObject>(:final failure) => Failure(failure),
      Success<JsonObject>(:final value) => _parseStatus(value),
    };
  }

  @override
  Future<Result<ProductAccount>> completeOnboarding({
    required String username,
    required InitialChoice initialChoice,
    required String idempotencyKey,
  }) async {
    final response = await _client.put(
      '/v1/me/onboarding',
      body: {'username': username, 'initialChoice': initialChoice.name},
      idempotencyKey: idempotencyKey,
    );
    return switch (response) {
      Failure<JsonObject>(:final failure) => Failure(failure),
      Success<JsonObject>(:final value) => _parseAccountEnvelope(value),
    };
  }

  Result<OnboardingStatus> _parseStatus(JsonObject value) {
    return switch (value['status']) {
      'required' => const Success(OnboardingRequired()),
      'completed' => switch (_parseAccountEnvelope(value)) {
        Success<ProductAccount>(:final value) => Success(
          OnboardingCompleted(value),
        ),
        Failure<ProductAccount>(:final failure) => Failure(failure),
      },
      _ => const Failure(
        AppFailure(
          kind: AppFailureKind.unexpected,
          message: 'The service returned an invalid onboarding status.',
        ),
      ),
    };
  }

  Result<ProductAccount> _parseAccountEnvelope(JsonObject value) {
    final account = value['account'];
    if (account is! Map<String, dynamic>) return _invalidAccount();

    final username = account['username'];
    final consent = account['optionalProcessingConsent'];
    final visibility = account['checkInVisibility'];
    final completedAt = account['onboardingCompletedAt'];
    if (username is! String || completedAt is! String) {
      return _invalidAccount();
    }

    final parsedConsent = switch (consent) {
      'accepted' => OptionalProcessingConsent.accepted,
      'rejected' => OptionalProcessingConsent.rejected,
      _ => null,
    };
    final parsedVisibility = switch (visibility) {
      'public' => CheckInVisibility.public,
      'private' => CheckInVisibility.private,
      'friends_only' => CheckInVisibility.friendsOnly,
      _ => null,
    };
    final parsedTime = tryParseUtcTimestamp(completedAt);
    if (parsedConsent == null ||
        parsedVisibility == null ||
        parsedTime == null) {
      return _invalidAccount();
    }

    return Success(
      ProductAccount(
        username: username,
        optionalProcessingConsent: parsedConsent,
        checkInVisibility: parsedVisibility,
        onboardingCompletedAt: parsedTime,
      ),
    );
  }

  Failure<ProductAccount> _invalidAccount() => const Failure(
    AppFailure(
      kind: AppFailureKind.unexpected,
      message: 'The service returned an invalid account.',
    ),
  );
}
