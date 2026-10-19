import '../../../core/result/result.dart';

/// Firebase-hosted email actions, separate from the observed session lifecycle.
abstract interface class AuthEmailRepository {
  Future<Result<bool>> readEmailVerified();
  Future<Result<void>> sendVerificationEmail();
  Future<Result<void>> sendPasswordResetEmail(String email);
}
