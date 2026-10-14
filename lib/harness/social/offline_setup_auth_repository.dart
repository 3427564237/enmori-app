import 'dart:async';

import '../../core/result/result.dart';
import '../../features/auth/domain/auth_repository.dart';

/// Form/session exercise only. Inputs are discarded, with no identity service,
/// credential storage or usable bearer token. Never composed by Bootstrap.
final class OfflineSetupAuthRepository implements AuthRepository {
  OfflineSetupAuthRepository({this.automaticallyObserve = true});

  final bool automaticallyObserve;
  final _changes = StreamController<AuthSession>.broadcast(sync: true);
  AuthSession _session = const AuthSessionUnauthenticated();
  bool _closed = false;
  int _operation = 0;

  @override
  Stream<AuthSession> watchSession() async* {
    yield _session;
    yield* _changes.stream;
  }

  /// Each observation replaces the session even though this one sample UID is
  /// unchanged. A successful command alone never controls routing.
  void observeSampleSession() {
    if (_closed) return;
    _session = AuthSessionAuthenticated(subject: 'offline-setup-sample');
    _changes.add(_session);
  }

  Future<Result<void>> _requestSampleSession() async {
    if (_closed) return const Failure(_unavailable);
    final operation = ++_operation;
    if (automaticallyObserve) {
      scheduleMicrotask(() {
        if (!_closed && operation == _operation) observeSampleSession();
      });
    }
    return const Success(null);
  }

  @override
  Future<Result<void>> register({
    required String email,
    required String password,
  }) => _requestSampleSession();

  @override
  Future<Result<void>> signIn({
    required String email,
    required String password,
  }) => _requestSampleSession();

  @override
  Future<Result<void>> signOut() async {
    _operation++;
    if (!_closed) {
      _session = const AuthSessionUnauthenticated();
      _changes.add(_session);
    }
    return const Success(null);
  }

  @override
  Future<Result<String>> getIdToken() async => const Failure(_unavailable);

  Future<void> dispose() async {
    _operation++;
    _closed = true;
    await _changes.close();
  }
}

const _unavailable = AppFailure(
  kind: AppFailureKind.configurationUnavailable,
  message: 'This offline sample cannot authenticate with a service.',
);
