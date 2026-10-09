import 'dart:async';
import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/result/result.dart';
import '../auth/auth_providers.dart';
import '../auth/domain/auth_repository.dart';
import 'domain/persona.dart';
import 'domain/persona_repository.dart';
import 'domain/persona_session.dart';

export 'domain/persona_session.dart';

// Concrete Backend wiring is supplied only by the isolated app/test composition.
final personaRepositoryProvider = Provider<PersonaRepository>(
  (ref) => const _UnavailablePersonaRepository(),
);

final personaCreateKeyProvider = Provider<String Function()>((ref) {
  final random = Random.secure();
  return () {
    final bytes = List.generate(16, (_) => random.nextInt(256));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    final hex = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
    return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-'
        '${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}';
  };
});

final personaSessionSourceProvider = Provider<PersonaSession?>((ref) {
  final auth = switch (ref.watch(authSessionProvider)) {
    AsyncData<AuthSession>(:final value) => value,
    _ => null,
  };
  if (auth is! AuthSessionAuthenticated) return null;
  final session = PersonaSession(
    ref.watch(personaRepositoryProvider),
    newKey: ref.watch(personaCreateKeyProvider),
  );
  ref.onDispose(session.dispose);
  return session;
});

final personaSessionControllerProvider =
    NotifierProvider<PersonaSessionController, PersonaSessionState>(
      PersonaSessionController.new,
    );

final class PersonaSessionController extends Notifier<PersonaSessionState> {
  PersonaSession? _source;

  @override
  PersonaSessionState build() {
    final source = ref.watch(personaSessionSourceProvider);
    _source = source;
    if (source == null) {
      return PersonaSessionState(
        sessionKey: Object(),
        failure: _unavailable,
        message: 'Personas could not be loaded. Try again.',
      );
    }
    final subscription = source.changes.listen((value) {
      if (ref.mounted && identical(_source, source)) state = value;
    });
    ref.onDispose(() => unawaited(subscription.cancel()));
    return source.state;
  }

  Future<void> load() async => _source?.load();
  Future<bool> create(PersonaFields fields) async =>
      await _source?.create(fields) ?? false;
  Future<void> retryCreate() async => _source?.retryCreate();
  bool endUnresolvedCreate() => _source?.endUnresolvedCreate() ?? false;
  Future<bool> edit(Persona target, PersonaFields fields) async =>
      await _source?.edit(target, fields) ?? false;
  Future<void> activate(Persona target) async => _source?.activate(target);
  Future<void> delete(Persona target) async => _source?.delete(target);
  Future<Result<PersonaMutation>> readPersona(String id) async =>
      await _source?.readPersona(id) ?? const Failure(_unavailable);
}

const _unavailable = AppFailure(
  kind: AppFailureKind.configurationUnavailable,
  message: 'The service is not configured.',
);

final class _UnavailablePersonaRepository implements PersonaRepository {
  const _UnavailablePersonaRepository();
  @override
  Future<Result<PersonaCollection>> readAll({
    bool Function()? isEligible,
  }) async => const Failure(_unavailable);
  @override
  Future<Result<PersonaMutation>> readOne(
    String personaId, {
    bool Function()? isEligible,
  }) async => const Failure(_unavailable);
  @override
  PersonaCreateAttempt create(
    PersonaCreateCommand command, {
    required bool Function() isEligible,
  }) {
    final result = Future<Result<PersonaMutation>>.value(
      const Failure(_unavailable),
    );
    return PersonaCreateAttempt(
      foreground: result,
      completion: result,
      wasDispatched: () => false,
    );
  }

  @override
  Future<Result<PersonaMutation>> edit(
    String personaId, {
    required PersonaFields fields,
    required int expectedRevision,
    required int expectedStateRevision,
    bool Function()? isEligible,
  }) async => const Failure(_unavailable);
  @override
  Future<Result<PersonaCollection>> activate(
    String personaId, {
    required int expectedRevision,
    required int expectedStateRevision,
    bool Function()? isEligible,
  }) async => const Failure(_unavailable);
  @override
  Future<Result<void>> delete(
    String personaId, {
    required int expectedRevision,
    required int expectedStateRevision,
    bool Function()? isEligible,
  }) async => const Failure(_unavailable);
}
