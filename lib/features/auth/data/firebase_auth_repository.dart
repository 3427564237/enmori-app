import 'package:firebase_auth/firebase_auth.dart';

import '../../../core/result/result.dart';
import '../domain/auth_repository.dart';
import '../domain/auth_email_repository.dart';

final class FirebaseAuthRepository
    implements AuthRepository, AuthEmailRepository {
  FirebaseAuthRepository(this._firebaseAuth);

  final FirebaseAuth _firebaseAuth;

  @override
  Future<Result<void>> signOut() async {
    try {
      await _firebaseAuth.signOut();
      return const Success(null);
    } on FirebaseException {
      return const Failure(
        AppFailure(
          kind: AppFailureKind.serviceUnavailable,
          message: 'Could not sign out. Try again.',
        ),
      );
    } catch (_) {
      return const Failure(
        AppFailure(
          kind: AppFailureKind.serviceUnavailable,
          message: 'Could not sign out. Try again.',
        ),
      );
    }
  }

  @override
  Stream<AuthSession> watchSession() async* {
    yield const AuthSessionInitializing();
    // Token/profile refresh does not begin a new authenticated session. Observe
    // authentication changes so a refresh cannot discard in-flight feature
    // commands; observed signout and subsequent same-UID login still emit a
    // distinct AuthSessionAuthenticated instance.
    yield* _firebaseAuth.authStateChanges().map<AuthSession>((user) {
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
    } catch (_) {
      return const Failure(
        AppFailure(
          kind: AppFailureKind.serviceUnavailable,
          message: 'Registration is unavailable. Try again.',
        ),
      );
    }
  }

  @override
  Future<Result<void>> signIn({
    required String email,
    required String password,
  }) async {
    try {
      await _firebaseAuth.signInWithEmailAndPassword(
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
          message: 'Authentication is unavailable. Try again.',
        ),
      );
    } catch (_) {
      return const Failure(
        AppFailure(
          kind: AppFailureKind.serviceUnavailable,
          message: 'Authentication is unavailable. Try again.',
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
    } catch (_) {
      return const Failure(
        AppFailure(
          kind: AppFailureKind.serviceUnavailable,
          message: 'Authentication is unavailable. Try again.',
        ),
      );
    }
  }

  @override
  Future<Result<bool>> readEmailVerified() async {
    try {
      final user = _firebaseAuth.currentUser;
      if (user == null) {
        return const Failure(
          AppFailure(
            kind: AppFailureKind.authRequired,
            message: 'Sign in again.',
          ),
        );
      }
      await user.reload();
      if (_firebaseAuth.currentUser?.uid != user.uid) {
        return const Failure(
          AppFailure(
            kind: AppFailureKind.authRequired,
            message: 'Sign in again.',
          ),
        );
      }
      return Success(_firebaseAuth.currentUser?.emailVerified == true);
    } catch (_) {
      return const Failure(
        AppFailure(
          kind: AppFailureKind.serviceUnavailable,
          message: 'Verification could not be checked. Try again.',
        ),
      );
    }
  }

  @override
  Future<Result<void>> sendVerificationEmail() async {
    try {
      final user = _firebaseAuth.currentUser;
      if (user == null) {
        return const Failure(
          AppFailure(
            kind: AppFailureKind.authRequired,
            message: 'Sign in again.',
          ),
        );
      }
      await user.sendEmailVerification();
      return const Success(null);
    } catch (_) {
      return const Failure(
        AppFailure(
          kind: AppFailureKind.serviceUnavailable,
          message: 'The email could not be sent. Wait a moment and try again.',
        ),
      );
    }
  }

  @override
  Future<Result<void>> sendPasswordResetEmail(String email) async {
    try {
      await _firebaseAuth.sendPasswordResetEmail(email: email.trim());
      return const Success(null);
    } on FirebaseAuthException catch (error) {
      // Do not reveal account existence through password recovery.
      if (error.code == 'user-not-found') return const Success(null);
      return Failure(_mapFirebaseFailure(error));
    } catch (_) {
      return const Failure(
        AppFailure(
          kind: AppFailureKind.serviceUnavailable,
          message: 'The email could not be sent. Wait a moment and try again.',
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
      'invalid-credential' ||
      'user-not-found' ||
      'wrong-password' => const AppFailure(
        kind: AppFailureKind.authenticationInvalid,
        message: 'Authentication details are invalid.',
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
