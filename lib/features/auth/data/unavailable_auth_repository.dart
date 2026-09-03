import '../../../core/result/result.dart';
import '../domain/auth_repository.dart';

final class UnavailableAuthRepository implements AuthRepository {
  const UnavailableAuthRepository();

  static const _failure = AppFailure(
    kind: AppFailureKind.configurationUnavailable,
    message: 'Authentication is not configured.',
  );

  @override
  Future<Result<String>> getIdToken() async => const Failure(_failure);

  @override
  Future<Result<void>> register({
    required String email,
    required String password,
  }) async => const Failure(_failure);

  @override
  Stream<AuthSession> watchSession() => Stream<AuthSession>.error(_failure);
}
