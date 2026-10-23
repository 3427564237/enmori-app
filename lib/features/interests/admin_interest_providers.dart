import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/result/result.dart';
import '../auth/auth_providers.dart';
import '../auth/domain/auth_repository.dart';
import 'domain/admin_interest_repository.dart';
import 'domain/interest_repository.dart';

final adminInterestRepositoryProvider = Provider<AdminInterestRepository>(
  (ref) => const _UnavailableAdminInterestRepository(),
);

/// Navigation hint only. Every write is independently authorized by Backend.
final adminInterestCapabilityProvider =
    NotifierProvider<AdminInterestCapabilityController, AsyncValue<bool>>(
      AdminInterestCapabilityController.new,
    );

final class AdminInterestCapabilityController
    extends Notifier<AsyncValue<bool>> {
  late AdminInterestRepository _repository;
  AuthSessionAuthenticated? _session;
  int _operation = 0;

  @override
  AsyncValue<bool> build() {
    _repository = ref.watch(adminInterestRepositoryProvider);
    _session = switch (ref.watch(authSessionProvider).asData?.value) {
      final AuthSessionAuthenticated value => value,
      _ => null,
    };
    final session = _session;
    final operation = ++_operation;
    ref.onDispose(() => _operation++);
    if (session == null) return const AsyncData(false);
    scheduleMicrotask(() {
      if (_current(session, operation)) {
        unawaited(_read(session, operation));
      }
    });
    return const AsyncLoading();
  }

  bool confirmedFor(AuthSessionAuthenticated? session) =>
      ref.mounted &&
      session != null &&
      identical(session, _session) &&
      identical(ref.read(authSessionProvider).asData?.value, session) &&
      state.asData?.value == true;

  Future<bool> refresh() async {
    final session = _session;
    if (session == null || !ref.mounted) return false;
    final operation = ++_operation;
    state = const AsyncLoading();
    return _read(session, operation);
  }

  Future<bool> _read(AuthSessionAuthenticated session, int operation) async {
    final result = await _repository.readCapability(
      current: () => _current(session, operation),
    );
    if (!_current(session, operation)) return false;
    switch (result) {
      case Success<bool>(:final value):
        state = AsyncData(value);
        return value;
      case Failure<bool>(:final failure):
        state = AsyncError(failure, StackTrace.current);
        return false;
    }
  }

  void revoke() {
    if (!ref.mounted) return;
    _operation++;
    state = const AsyncData(false);
  }

  bool _current(AuthSessionAuthenticated session, int operation) =>
      ref.mounted &&
      operation == _operation &&
      identical(_session, session) &&
      identical(ref.read(authSessionProvider).asData?.value, session);
}

final class _UnavailableAdminInterestRepository
    implements AdminInterestRepository {
  const _UnavailableAdminInterestRepository();
  @override
  Future<Result<bool>> readCapability({
    required bool Function() current,
  }) async => const Failure(_notConfigured);
  @override
  Future<Result<List<InterestTagOption>>> readCatalogue({
    required bool Function() current,
  }) async => const Failure(_notConfigured);
  @override
  Future<Result<CreatedInterestTag>> create({
    required String displayName,
    required bool Function() current,
  }) async => const Failure(_notConfigured);
}

const _notConfigured = AppFailure(
  kind: AppFailureKind.configurationUnavailable,
  message: 'The service is not configured.',
);
