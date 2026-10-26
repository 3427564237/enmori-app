import '../../../core/result/result.dart';
import 'proactive.dart';

/// Only owner HTTP operations; tokens and request lifetimes are caller-owned.
abstract interface class ProactiveRepository {
  Future<Result<ProactiveSettings>> readSettings({
    required String token,
    required ProactiveAbortSignal abort,
  });
  Future<Result<ProactiveSettings>> saveSettings({
    required String token,
    required ProactiveAbortSignal abort,
    required ProactiveSettings settings,
    required int expectedRevision,
  });
  Future<Result<List<FollowUpIntent>>> readActiveIntents({
    required String token,
    required ProactiveAbortSignal abort,
  });
  Future<Result<FollowUpIntent>> createIntent({
    required String token,
    required ProactiveAbortSignal abort,
    required CreateFollowUp command,
  });
  Future<Result<FollowUpIntent>> readIntent({
    required String token,
    required ProactiveAbortSignal abort,
    required String intentId,
  });
  Future<Result<FollowUpIntent>> cancelIntent({
    required String token,
    required ProactiveAbortSignal abort,
    required String intentId,
    required int expectedRevision,
  });
}

abstract interface class ProactiveIntentIdPort {
  String nextId();
}

/// Resolve local civil fields in the explicitly named IANA zone. Empty/failed
/// resolution cannot be replaced with DateTime.local or a guessed UTC offset.
/// DST ambiguity returns candidates for explicit selection before confirmation.
abstract interface class FollowUpTimePort {
  Future<Result<String>> currentIanaZone();
  Future<Result<List<FollowUpTime>>> resolveCivil({
    required FollowUpCivilTime civil,
    required String timeZone,
  });
}
