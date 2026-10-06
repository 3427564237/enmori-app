import '../../../core/result/result.dart';

sealed class AuthSession {
  const AuthSession();
}

final class AuthSessionInitializing extends AuthSession {
  const AuthSessionInitializing();
}

final class AuthSessionUnauthenticated extends AuthSession {
  const AuthSessionUnauthenticated();
}

final class AuthSessionAuthenticated extends AuthSession {
  const AuthSessionAuthenticated({required this.subject});

  final String subject;
}

abstract interface class AuthRepository {
  Stream<AuthSession> watchSession();

  Future<Result<void>> register({
    required String email,
    required String password,
  });

  Future<Result<void>> signIn({
    required String email,
    required String password,
  });

  Future<Result<String>> getIdToken();
  Future<Result<void>> signOut();
}
