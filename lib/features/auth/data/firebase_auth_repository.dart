import 'package:firebase_auth/firebase_auth.dart';

import '../../../core/result/result.dart';
import '../domain/auth_repository.dart';

final class FirebaseAuthRepository implements AuthRepository {
  FirebaseAuthRepository(this._firebaseAuth);

  final FirebaseAuth _firebaseAuth;

  @override
  Stream<AuthSession> watchSession() async* {
    yield const AuthSessionInitializing();
    yield* _firebaseAuth.userChanges().map<AuthSession>((user) {
      if (user == null) {
        return const AuthSessionUnauthenticated();
      }
      return AuthSessionAuthenticated(subject: user.uid);
    });
  }

  @override
  Future<Result<void>> register({
    required String email,
    required String password,
  }) async {
    try {
      await _firebaseAuth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );
      return const Success(null);
    } on FirebaseAuthException catch (error) {
      return Failure(_mapFirebaseFailure(error));
    } on FirebaseException {
      return const Failure(
        AppFailure(
          kind: AppFailureKind.serviceUnavailable,
          message: 'Registration is unavailable. Try again.',
        ),
      );
    }
  }

  @override
  Future<Result<String>> getIdToken() async {
    final user = _firebaseAuth.currentUser;
    if (user == null) {
      return const Failure(
        AppFailure(
          kind: AppFailureKind.authRequired,
          message: 'Authentication is required.',
        ),
      );
    }

    try {
      final token = await user.getIdToken();
      if (token == null || token.isEmpty) {
        return const Failure(
          AppFailure(
            kind: AppFailureKind.authRequired,
            message: 'Authentication is required.',
          ),
        );
      }
      return Success(token);
    } on FirebaseAuthException catch (error) {
      return Failure(_mapFirebaseFailure(error));
    } on FirebaseException {
      return const Failure(
        AppFailure(
          kind: AppFailureKind.serviceUnavailable,
          message: 'Authentication is unavailable. Try again.',
        ),
      );
    }
  }

  AppFailure _mapFirebaseFailure(FirebaseAuthException error) {
    return switch (error.code) {
      'email-already-in-use' => const AppFailure(
        kind: AppFailureKind.accountAlreadyExists,
        message: 'An account already uses these details.',
      ),
      'invalid-email' || 'weak-password' => const AppFailure(
        kind: AppFailureKind.authenticationInvalid,
        message: 'Registration details are invalid.',
      ),
      'user-disabled' => const AppFailure(
        kind: AppFailureKind.authForbidden,
        message: 'This account cannot continue.',
      ),
      _ => const AppFailure(
        kind: AppFailureKind.serviceUnavailable,
        message: 'Authentication is unavailable. Try again.',
      ),
    };
  }
}
