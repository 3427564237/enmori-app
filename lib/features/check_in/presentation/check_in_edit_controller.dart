import '../../auth/domain/auth_repository.dart';
import '../../account/content_access.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../../account/domain/account_repository.dart';
import '../check_in_providers.dart';
import '../domain/check_in_repository.dart';
import '../domain/check_in_mutations.dart';

final class CheckInEditState {
  const CheckInEditState({
    this.pending = false,
    this.saved,
    this.deleted = false,
    this.failure,
  });
  final bool pending;
  final CheckIn? saved;
  final bool deleted;
  final AppFailure? failure;
}

final checkInEditControllerProvider =
    NotifierProvider.autoDispose<CheckInEditController, CheckInEditState>(
      CheckInEditController.new,
    );

final class CheckInEditController extends Notifier<CheckInEditState> {
  int _generation = 0;
  int get epoch => _generation;
  bool _valid(int epoch) =>
      ref.mounted &&
      epoch == _generation &&
      ref.read(contentAccessProvider).foreground;
  late CheckInRepository _repository;
  @override
  CheckInEditState build() {
    ref.watch(
      authSessionProvider.select(
        (value) => value.asData?.value is AuthSessionAuthenticated
            ? value.asData?.value
            : null,
      ),
    );
    ref.onDispose(() => _generation++);
    _repository = ref.watch(checkInRepositoryProvider);
    _generation++;
    return const CheckInEditState();
  }

  Future<void> save(
    CheckIn current,
    String note,
    CheckInVisibility visibility, {
    int? expectedEpoch,
    String? mood,
    String? activity,
    String? locationLabel,
  }) async {
    if (state.pending || (expectedEpoch != null && !_valid(expectedEpoch))) {
      return;
    }
    final normalized = normalizeCheckInNote(note, mood: mood);
    if (normalized case Failure<String>(:final failure)) {
      state = CheckInEditState(failure: failure);
      return;
    }
    final repository = _repository;
    if (repository is! CheckInMutations) return;
    final generation = ++_generation;
    state = const CheckInEditState(pending: true);
    final result = await afterContentMutation(
      ref,
      () => (repository as CheckInMutations).update(
        checkInId: current.checkInId,
        note: (normalized as Success<String>).value,
        visibility: visibility,
        mood: mood,
        activity: activity,
        locationLabel: locationLabel,
        expectedRevision: current.revision,
        isEligible: () => _valid(generation),
      ),
    );
    if (!ref.mounted || generation != _generation) return;
    state = switch (result) {
      Success<CheckIn>(:final value) => CheckInEditState(saved: value),
      Failure<CheckIn>(:final failure) => CheckInEditState(failure: failure),
    };
  }

  Future<void> remove(CheckIn current, {int? expectedEpoch}) async {
    if (state.pending || (expectedEpoch != null && !_valid(expectedEpoch))) {
      return;
    }
    final repository = _repository;
    if (repository is! CheckInMutations) return;
    final generation = ++_generation;
    state = const CheckInEditState(pending: true);
    final result = await afterContentMutation(
      ref,
      () => (repository as CheckInMutations).remove(
        checkInId: current.checkInId,
        expectedRevision: current.revision,
        isEligible: () => _valid(generation),
      ),
    );
    if (!ref.mounted || generation != _generation) return;
    state = switch (result) {
      Success<void>() => const CheckInEditState(deleted: true),
      Failure<void>(:final failure) => CheckInEditState(failure: failure),
    };
  }

  Future<CheckIn?> reload(String id) async {
    if (state.pending) return null;
    final generation = ++_generation;
    state = const CheckInEditState(pending: true);
    final result = await _repository.readOwned(checkInId: id);
    if (!ref.mounted || generation != _generation) return null;
    switch (result) {
      case Success<CheckIn>(:final value):
        state = const CheckInEditState();
        return value;
      case Failure<CheckIn>(:final failure):
        state = CheckInEditState(failure: failure);
        return null;
    }
  }
}
