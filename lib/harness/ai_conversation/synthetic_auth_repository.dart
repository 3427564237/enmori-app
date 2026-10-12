import 'dart:async';

import '../../core/result/result.dart';
import '../../features/auth/domain/auth_repository.dart';

/// In-memory identity for the explicitly synthetic feature entry point only.
/// It neither contacts Firebase nor produces a real ID token.
final class SyntheticAiAuthRepository implements AuthRepository {
  final _changes = StreamController<AuthSession>.broadcast(sync: true);
  AuthSession _session = const AuthSessionAuthenticated(
    subject: 'synthetic-ai-owner',
  );
  int _generation = 1;
  bool _closed = false;

  int get generation => _generation;

  /// A fresh observation object deliberately replaces even the same UID.
  void replaceSession() {
    if (_closed) return;
    _generation += 1;
    // Do not canonicalize the new session: provider identity must change.
    _session = AuthSessionAuthenticated(subject: 'synthetic-ai-owner');
    _changes.add(_session);
  }

  @override
  Stream<AuthSession> watchSession() async* {
    yield _session;
    yield* _changes.stream;
  }

  @override
  Future<Result<String>> getIdToken() async {
    if (_closed || _session is! AuthSessionAuthenticated) {
      return const Failure(
        AppFailure(
          kind: AppFailureKind.authRequired,
          message: 'Sign in again.',
        ),
      );
    }
    return Success('synthetic-ai-token-$_generation');
  }

  @override
  Future<Result<void>> signOut() async {
    if (!_closed) {
      _session = const AuthSessionUnauthenticated();
      _changes.add(_session);
    }
    return const Success(null);
  }

  @override
  Future<Result<void>> register({
    required String email,
    required String password,
  }) async => const Failure(_unsupported);

  @override
  Future<Result<void>> signIn({
    required String email,
    required String password,
  }) async => const Failure(_unsupported);

  Future<void> dispose() async {
    _closed = true;
    await _changes.close();
  }
}

const _unsupported = AppFailure(
  kind: AppFailureKind.configurationUnavailable,
  message: 'Real authentication is unavailable in this synthetic harness.',
);
