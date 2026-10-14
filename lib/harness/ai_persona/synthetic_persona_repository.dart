import '../../core/result/result.dart';
import '../../features/personas/domain/persona.dart';
import '../../features/personas/domain/persona_repository.dart';

/// Memory-only Persona fixture for the explicitly synthetic client journey.
/// It cannot establish real persistence, identity or AI presentation snapshots.
final class SyntheticPersonaRepository implements PersonaRepository {
  final _items = <Persona>[];
  final _createKeys = <String>{};
  String? _active;
  int _revision = 0;
  int _identifier = 0;
  int reads = 0;
  int activations = 0;

  PersonaCollection get collection => PersonaCollection(
    items: _items,
    stateRevision: _revision,
    activePersonaId: _active,
  );

  bool _eligible(bool Function()? isEligible) => isEligible?.call() ?? true;

  DateTime get _time =>
      DateTime.utc(2026, 10, 14).add(Duration(milliseconds: _revision));

  @override
  Future<Result<PersonaCollection>> readAll({
    bool Function()? isEligible,
  }) async {
    if (!_eligible(isEligible)) return const Failure(_unavailable);
    reads++;
    return Success(collection);
  }

  @override
  Future<Result<PersonaMutation>> readOne(
    String personaId, {
    bool Function()? isEligible,
  }) async {
    final persona = _find(personaId);
    if (!_eligible(isEligible) || persona == null) {
      return const Failure(_unavailable);
    }
    return Success(PersonaMutation(persona: persona, stateRevision: _revision));
  }

  @override
  PersonaCreateAttempt create(
    PersonaCreateCommand command, {
    required bool Function() isEligible,
  }) {
    Result<PersonaMutation> value;
    if (!isEligible()) {
      value = const Failure(_unavailable);
    } else if (command.expectedStateRevision != _revision ||
        _createKeys.contains(command.idempotencyKey)) {
      value = const Failure(_conflict);
    } else if (_items.length >= 5) {
      value = const Failure(_capacity);
    } else if (PersonaFields.nameValidationMessage(
          command.fields.displayName,
        ) !=
        null) {
      value = const Failure(_invalid);
    } else {
      _createKeys.add(command.idempotencyKey);
      _revision++;
      final persona = Persona(
        personaId: (++_identifier).toRadixString(16).padLeft(64, '0'),
        fields: command.fields.normalized,
        createdAt: _time,
        updatedAt: _time,
        revision: 1,
      );
      _items.add(persona);
      value = Success(
        PersonaMutation(persona: persona, stateRevision: _revision),
      );
    }
    final result = Future<Result<PersonaMutation>>.value(value);
    return PersonaCreateAttempt(
      foreground: result,
      completion: result,
      wasDispatched: () => false,
    );
  }

  Persona? _find(String id) =>
      _items.where((p) => p.personaId == id).firstOrNull;

  bool _current(Persona? persona, int revision, int stateRevision) =>
      persona != null &&
      persona.revision == revision &&
      _revision == stateRevision;

  @override
  Future<Result<PersonaMutation>> edit(
    String personaId, {
    required PersonaFields fields,
    required int expectedRevision,
    required int expectedStateRevision,
    bool Function()? isEligible,
  }) async {
    if (!_eligible(isEligible)) return const Failure(_unavailable);
    final old = _find(personaId);
    if (old == null) return const Failure(_unavailable);
    if (!_current(old, expectedRevision, expectedStateRevision)) {
      return const Failure(_conflict);
    }
    if (PersonaFields.nameValidationMessage(fields.displayName) != null) {
      return const Failure(_invalid);
    }
    if (old.fields == fields.normalized) {
      return Success(PersonaMutation(persona: old, stateRevision: _revision));
    }
    _revision++;
    final updated = Persona(
      personaId: personaId,
      fields: fields.normalized,
      createdAt: old.createdAt,
      updatedAt: _time,
      revision: old.revision + 1,
    );
    _items[_items.indexOf(old)] = updated;
    return Success(PersonaMutation(persona: updated, stateRevision: _revision));
  }

  @override
  Future<Result<PersonaCollection>> activate(
    String personaId, {
    required int expectedRevision,
    required int expectedStateRevision,
    bool Function()? isEligible,
  }) async {
    if (!_eligible(isEligible)) return const Failure(_unavailable);
    if (!_current(_find(personaId), expectedRevision, expectedStateRevision)) {
      return const Failure(_conflict);
    }
    activations++;
    if (_active != personaId) {
      _active = personaId;
      _revision++;
    }
    return Success(collection);
  }

  @override
  Future<Result<void>> delete(
    String personaId, {
    required int expectedRevision,
    required int expectedStateRevision,
    bool Function()? isEligible,
  }) async {
    if (!_eligible(isEligible)) return const Failure(_unavailable);
    final persona = _find(personaId);
    if (persona == null) return const Success(null);
    if (!_current(persona, expectedRevision, expectedStateRevision)) {
      return const Failure(_conflict);
    }
    _items.remove(persona);
    if (_active == personaId) _active = null;
    _revision++;
    return const Success(null);
  }
}

const _unavailable = AppFailure(
  kind: AppFailureKind.personaUnavailable,
  message: 'This synthetic Persona is unavailable.',
);
const _conflict = AppFailure(
  kind: AppFailureKind.personaRevisionPreconditionFailed,
  message: 'The synthetic Personas changed. Reload them.',
);
const _capacity = AppFailure(
  kind: AppFailureKind.personaLimitReached,
  message: 'This synthetic fixture has five Personas.',
);
const _invalid = AppFailure(
  kind: AppFailureKind.personaInvalid,
  message: 'Check the Persona name and style options.',
);
