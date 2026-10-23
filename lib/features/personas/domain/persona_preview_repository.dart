import '../../../core/result/result.dart';
import 'persona.dart';

/// A stateless expression preview. It never creates a Persona, selection,
/// conversation, message, operation record or automatic retry.
abstract interface class PersonaPreviewRepository {
  Future<Result<String>> preview({
    required PersonaFields draft,
    required String text,
    required bool Function() isEligible,
  });
}
