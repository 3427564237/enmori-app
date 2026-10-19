import '../../../core/result/result.dart';
import '../../event_browse/domain/activity_repository.dart';

enum RegistrationPhase {
  idle,
  opening,
  outside,
  confirmation,
  saving,
  saved,
  unresolved,
  failed,
}

/// Local return coordination, not a third-party registration receipt.
/// The injected writer must apply the approved Backend precondition contract.
/// No HTTP, persistence, or default fake writer is selected by this component.
final class ExternalRegistrationFlow {
  ExternalRegistrationFlow({
    required this.eventId,
    required this.sourceUrl,
    required this.opener,
    required this.current,
    required this.confirmGoing,
    required this.readGoing,
  });

  final String eventId;
  final Uri sourceUrl;
  final ExternalActivityOpener opener;
  final bool Function() current;
  final Future<Result<void>> Function(String eventId) confirmGoing;
  final Future<Result<bool>> Function(String eventId) readGoing;
  RegistrationPhase _phase = RegistrationPhase.idle;
  RegistrationPhase get phase => _phase;
  int _generation = 0;
  bool _left = false, _returned = false, _disposed = false;
  bool get _live => !_disposed && current();

  Future<void> open() async {
    if (!_live ||
        (_phase != RegistrationPhase.idle &&
            _phase != RegistrationPhase.failed &&
            _phase != RegistrationPhase.saved)) {
      return;
    }
    final generation = ++_generation;
    _left = false;
    _returned = false;
    _phase = RegistrationPhase.opening;
    bool opened;
    try {
      opened = await opener.open(
        sourceUrl,
        current: () => _live && generation == _generation,
      );
    } catch (_) {
      opened = false;
    }
    if (!_live || generation != _generation) return;
    _phase = !opened
        ? RegistrationPhase.failed
        : _returned
        ? RegistrationPhase.confirmation
        : RegistrationPhase.outside;
  }

  /// Inactive alone can be a permission/system overlay, not browser departure.
  void background() {
    if (_live &&
        (_phase == RegistrationPhase.opening ||
            _phase == RegistrationPhase.outside)) {
      _left = true;
    }
  }

  void resume() {
    if (!_live || !_left) return;
    if (_phase == RegistrationPhase.opening) _returned = true;
    if (_phase == RegistrationPhase.outside) {
      _phase = RegistrationPhase.confirmation;
    }
  }

  Future<void> answer(bool completed) async {
    if (!_live || _phase != RegistrationPhase.confirmation) return;
    if (!completed) {
      _phase = RegistrationPhase.idle;
      return;
    }
    final generation = _generation;
    _phase = RegistrationPhase.saving; // synchronous duplicate-click fence
    Result<void> result;
    try {
      result = await confirmGoing(eventId);
    } catch (_) {
      result = const Failure(
        AppFailure(
          kind: AppFailureKind.serviceUnavailable,
          message: 'Read your participation before trying another change.',
        ),
      );
    }
    if (!_live || generation != _generation) return;
    _phase = result is Success<void>
        ? RegistrationPhase.saved
        : RegistrationPhase.unresolved;
  }

  /// A failed/ambiguous write is never retried automatically or blindly.
  Future<void> reconcile() async {
    if (!_live || _phase != RegistrationPhase.unresolved) return;
    final generation = _generation;
    _phase = RegistrationPhase.saving;
    Result<bool> result;
    try {
      result = await readGoing(eventId);
    } catch (_) {
      result = const Failure(
        AppFailure(
          kind: AppFailureKind.serviceUnavailable,
          message: 'Participation is unavailable. Read again later.',
        ),
      );
    }
    if (!_live || generation != _generation) return;
    _phase = switch (result) {
      Success<bool>(value: true) => RegistrationPhase.saved,
      Success<bool>(value: false) => RegistrationPhase.idle,
      Failure<bool>() => RegistrationPhase.unresolved,
    };
  }

  void dispose() {
    _disposed = true;
    _generation++;
    _phase = RegistrationPhase.idle;
  }
}
