import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/idempotency_key_provider.dart';
import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../../account/domain/account_repository.dart';
import '../check_in_providers.dart';
import '../domain/check_in_repository.dart';
import 'check_in_place_controller.dart';
import '../../weather/weather_providers.dart';
import '../../weather/domain/weather.dart';

final locatedCheckInControllerProvider = NotifierProvider.autoDispose
    .family<LocatedCheckInController, LocatedCheckInState, Object>(
      LocatedCheckInController.new,
    );

final class LocatedCheckInState {
  const LocatedCheckInState({
    this.value,
    this.notice,
    this.failure,
    this.busy = false,
    this.savedId,
    this.uncertain = false,
  });
  final CheckIn? value;
  final String? notice;
  final AppFailure? failure;
  final bool busy;
  final String? savedId;
  final bool uncertain;
}

/// Module-owned actions for DU's existing composer/detail slots. A draftKey must
/// live until the composer closes; retries retain the exact payload/key.
final class LocatedCheckInController extends Notifier<LocatedCheckInState> {
  LocatedCheckInController(this.draftKey);
  final Object draftKey;
  int _epoch = 0;
  String? _fingerprint, _key;
  int get epoch => _epoch;
  Future<void> replaceLocation({required int expectedEpoch}) async {
    final current = state.value;
    if (state.busy || current == null || expectedEpoch != _epoch) return;
    final epoch = ++_epoch,
        location = ref.read(foregroundLocationProvider),
        repository = ref.read(checkInPlaceRepositoryProvider);
    state = LocatedCheckInState(busy: true, savedId: current.checkInId);
    try {
      final point = await location.capture(precise: true);
      if (!ref.mounted || epoch != _epoch) return;
      if (point case Failure<GeoPoint>(:final failure)) {
        state = LocatedCheckInState(
          failure: failure,
          savedId: current.checkInId,
        );
        return;
      }
      final result = await repository.replaceLocation(
        checkIn: current,
        location: (point as Success<GeoPoint>).value,
      );
      if (!ref.mounted || epoch != _epoch) return;
      state = switch (result) {
        Success<CheckIn>(:final value) => LocatedCheckInState(
          value: value,
          savedId: value.checkInId,
        ),
        Failure<CheckIn>(:final failure) => LocatedCheckInState(
          failure: failure,
          savedId: current.checkInId,
        ),
      };
    } catch (_) {
      if (ref.mounted && epoch == _epoch) {
        state = LocatedCheckInState(
          failure: _unconfirmed,
          savedId: current.checkInId,
        );
      }
    }
  }

  @override
  LocatedCheckInState build() {
    ref.watch(authSessionProvider.select((v) => v.asData?.value));
    _epoch++;
    _fingerprint = null;
    _key = null;
    ref.onDispose(() => _epoch++);
    return const LocatedCheckInState();
  }

  Future<void> save({
    required String note,
    String? mood,
    String? activity,
    required CheckInVisibility visibility,
  }) async {
    if (state.busy || state.savedId != null) return;
    final placeState = ref.read(checkInPlaceControllerProvider(draftKey));
    if (placeState.busy) return;
    final normalized = normalizeCheckInNote(note, mood: mood);
    if (normalized case Failure<String>(:final failure)) {
      state = LocatedCheckInState(failure: failure, uncertain: state.uncertain);
      return;
    }
    final value = (normalized as Success<String>).value,
        place = placeState.place;
    final fingerprint = jsonEncode([
      value,
      mood,
      activity,
      visibility.name,
      place?.toJson(),
    ]);
    if (_fingerprint != null && _fingerprint != fingerprint) {
      state = const LocatedCheckInState(
        uncertain: true,
        failure: AppFailure(
          kind: AppFailureKind.requestInvalid,
          message: 'The previous save was not confirmed. Keep its original details for retry, or check your records before starting another Check-in.',
        ),
      );
      return;
    }
    _fingerprint = fingerprint;
    _key ??= ref.read(idempotencyKeyGeneratorProvider).generate();
    final epoch = ++_epoch,
        repository = ref.read(checkInPlaceRepositoryProvider);
    state = const LocatedCheckInState(busy: true, uncertain: true);
    try {
      final result = await repository.create(
        note: value,
        mood: mood,
        activity: activity,
        visibility: visibility,
        place: place,
        idempotencyKey: _key!,
      );
      if (!ref.mounted || epoch != _epoch) return;
      switch (result) {
        case Success(:final value):
          state = LocatedCheckInState(
            value: value.checkIn,
            notice: value.notice,
            savedId: value.checkIn.checkInId,
          );
          ref.read(checkInPlaceControllerProvider(draftKey).notifier).clear();
        case Failure(:final failure):
          state = LocatedCheckInState(failure: failure, uncertain: true);
      }
    } catch (_) {
      if (ref.mounted && epoch == _epoch) {
        state = const LocatedCheckInState(
          failure: _unconfirmed,
          uncertain: true,
        );
      }
    }
  }

  Future<void> read(String id) async {
    if (state.busy) return;
    final epoch = ++_epoch, repository = ref.read(checkInRepositoryProvider);
    state = LocatedCheckInState(busy: true, savedId: id);
    try {
      final result = await repository.readOwned(checkInId: id);
      if (!ref.mounted || epoch != _epoch) return;
      state = switch (result) {
        Success<CheckIn>(:final value) => LocatedCheckInState(
          value: value,
          savedId: id,
        ),
        Failure<CheckIn>(:final failure) => LocatedCheckInState(
          failure: failure,
          savedId: id,
        ),
      };
    } catch (_) {
      if (ref.mounted && epoch == _epoch) {
        state = LocatedCheckInState(failure: _unconfirmed, savedId: id);
      }
    }
  }

  Future<void> remove({
    required bool location,
    required int expectedEpoch,
  }) async {
    final current = state.value;
    if (state.busy || current == null || expectedEpoch != _epoch) return;
    final epoch = ++_epoch,
        repository = ref.read(checkInPlaceRepositoryProvider);
    state = LocatedCheckInState(busy: true, savedId: current.checkInId);
    try {
      final result = await (location
          ? repository.removeLocation(checkIn: current)
          : repository.removeWeatherPermission(checkIn: current));
      if (!ref.mounted || epoch != _epoch) return;
      state = switch (result) {
        Success<CheckIn>(:final value) => LocatedCheckInState(
          value: value,
          savedId: value.checkInId,
        ),
        Failure<CheckIn>(:final failure) => LocatedCheckInState(
          failure: failure,
          savedId: current.checkInId,
        ),
      };
    } catch (_) {
      if (ref.mounted && epoch == _epoch) {
        state = LocatedCheckInState(
          failure: _unconfirmed,
          savedId: current.checkInId,
        );
      }
    }
  }
}

const _unconfirmed = AppFailure(
  kind: AppFailureKind.serviceUnavailable,
  message: 'This operation could not be confirmed. Read your saved record before making another change.',
);
