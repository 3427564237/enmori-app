import '../../../core/result/result.dart';
import 'persona.dart';

/// One HTTP attempt; the session command (not the page) owns its settlement.
final class PersonaCreateAttempt {
  const PersonaCreateAttempt({
    required this.foreground,
    required this.completion,
    required this.wasDispatched,
  });

  final Future<Result<PersonaMutation>> foreground;
  final Future<Result<PersonaMutation>> completion;
  final bool Function() wasDispatched;

  bool get dispatched => wasDispatched();
}

abstract interface class PersonaRepository {
  Future<Result<PersonaCollection>> readAll({bool Function()? isEligible});

  Future<Result<PersonaMutation>> readOne(
    String personaId, {
    bool Function()? isEligible,
  });

  PersonaCreateAttempt create(
    PersonaCreateCommand command, {
    required bool Function() isEligible,
  });

  Future<Result<PersonaMutation>> edit(
    String personaId, {
    required PersonaFields fields,
    required int expectedRevision,
    required int expectedStateRevision,
    bool Function()? isEligible,
  });

  Future<Result<PersonaCollection>> activate(
    String personaId, {
    required int expectedRevision,
    required int expectedStateRevision,
    bool Function()? isEligible,
  });

  Future<Result<void>> delete(
    String personaId, {
    required int expectedRevision,
    required int expectedStateRevision,
    bool Function()? isEligible,
  });
}
