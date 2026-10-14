import 'package:flutter/services.dart';

import '../../../core/result/result.dart';
import '../domain/activity_repository.dart';
import 'backend_activity_repository.dart';

final class ClipboardActivityActions implements ActivitySourceActions {
  const ClipboardActivityActions(this.opener);
  final ExternalActivityOpener? opener;
  Failure<void> _failure(bool opening) => Failure(
    AppFailure(
      kind: AppFailureKind.serviceUnavailable,
      message: opening
          ? 'Could not open the source page. You can copy the link.'
          : 'Could not copy the link. Try again.',
    ),
  );
  bool _allowed(Uri url, bool Function() current) {
    try {
      return validActivitySourceUrl(url) && current();
    } catch (_) {
      return false;
    }
  }

  @override
  Future<Result<void>> open(Uri url, bool Function() current) async {
    try {
      if (!_allowed(url, current) || opener == null) return _failure(true);
      final opened = await opener!.open(
        url,
        current: () => _allowed(url, current),
      );
      return opened && _allowed(url, current)
          ? const Success(null)
          : _failure(true);
    } catch (_) {
      return _failure(true);
    }
  }

  @override
  Future<Result<void>> copy(Uri url, bool Function() current) async {
    try {
      if (!_allowed(url, current)) return _failure(false);
      await Clipboard.setData(ClipboardData(text: url.toString()));
      return _allowed(url, current) ? const Success(null) : _failure(false);
    } catch (_) {
      return _failure(false);
    }
  }
}
