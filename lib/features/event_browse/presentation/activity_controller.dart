import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../../auth/domain/auth_repository.dart';
import '../domain/activity_repository.dart';
import '../event_browse_providers.dart';

final activityControllerProvider = NotifierProvider.autoDispose
    .family<ActivityController, AsyncValue<ActivityRead?>, String>(
      ActivityController.new,
    );

final class ActivityController extends Notifier<AsyncValue<ActivityRead?>> {
  ActivityController(this.browseId);
  final String browseId;
  late ActivityRepository _repository;
  late ActivitySourceActions _actions;
  Timer? _expiry;
  int _generation = 0;
  bool _authenticated = false, _busy = false;
  @override
  AsyncValue<ActivityRead?> build() {
    // Watch the whole observation, not only UID: replacement sessions discard old reads.
    _authenticated =
        ref.watch(authSessionProvider).value is AuthSessionAuthenticated;
    _repository = ref.watch(activityRepositoryProvider);
    _actions = ref.watch(activitySourceActionsProvider);
    _generation++;
    _expiry?.cancel();
    _busy = false;
    ref.onDispose(() {
      _generation++;
      _expiry?.cancel();
    });
    return const AsyncData(null);
  }

  void clear() {
    _generation++;
    _expiry?.cancel();
    _expiry = null;
    _busy = false;
    state = const AsyncData(null);
  }

  bool _current(int generation) =>
      ref.mounted &&
      generation == _generation &&
      _authenticated &&
      (_expiry?.isActive ?? false);
  Future<void> load() async {
    clear();
    final generation = _generation;
    if (!_authenticated) {
      state = AsyncError(
        const AppFailure(
          kind: AppFailureKind.authRequired,
          message: 'Sign in to browse activities.',
        ),
        StackTrace.current,
      );
      return;
    }
    state = const AsyncLoading();
    _expiry = Timer(const Duration(minutes: 5), () {
      if (ref.mounted && generation == _generation) clear();
    });
    Result<ActivityRead> result;
    try {
      result = await _repository.read(browseId.isEmpty ? null : browseId);
    } catch (_) {
      result = const Failure(
        AppFailure(
          kind: AppFailureKind.serviceUnavailable,
          message: 'Activities are unavailable. Try again.',
        ),
      );
    }
    if (!_current(generation)) return;
    state = switch (result) {
      Success<ActivityRead>(:final value) => AsyncData(value),
      Failure<ActivityRead>(:final failure) => AsyncError(
        failure,
        StackTrace.current,
      ),
    };
  }

  Future<String?> sourceAction({required bool open}) async {
    final generation = _generation;
    if (_busy || !_current(generation)) return null;
    final value = state.value;
    if (value is! ActivityDetail) return null;
    _busy = true;
    final url = value.sourceUrl;
    Result<void> result;
    try {
      result = await (open
          ? _actions.open(url, () => _current(generation))
          : _actions.copy(url, () => _current(generation)));
    } catch (_) {
      result = const Failure(
        AppFailure(
          kind: AppFailureKind.serviceUnavailable,
          message: 'Source action failed. Try again or copy the link.',
        ),
      );
    }
    if (!_current(generation)) return null;
    _busy = false;
    return switch (result) {
      Success<void>() => open ? null : 'Link copied.',
      Failure<void>(:final failure) => failure.message,
    };
  }
}
