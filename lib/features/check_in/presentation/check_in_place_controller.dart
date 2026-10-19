import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/providers.dart';
import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../../auth/domain/auth_repository.dart';
import '../../account/account_preferences_providers.dart';
import '../../account/domain/account_preferences_repository.dart';
import '../../weather/domain/weather.dart';
import '../../weather/weather_providers.dart';
import '../data/backend_check_in_place_repository.dart';
import '../domain/check_in_place_repository.dart';

final checkInPlaceRepositoryProvider = Provider<CheckInPlaceRepository>(
  (ref) => BackendCheckInPlaceRepository(ref.watch(backendApiClientProvider)),
);
final checkInPlaceControllerProvider = NotifierProvider.autoDispose
    .family<CheckInPlaceController, CheckInPlaceState, Object>(
      CheckInPlaceController.new,
    );

final class CheckInPlaceState {
  const CheckInPlaceState({this.place, this.busy = false, this.failure});
  final CheckInPlace? place;
  final bool busy;
  final AppFailure? failure;
}

final class CheckInPlaceController extends Notifier<CheckInPlaceState> {
  CheckInPlaceController(this.draftKey);
  final Object draftKey;
  int _epoch = 0;
  int get epoch => _epoch;
  @override
  CheckInPlaceState build() {
    ref.watch(
      authSessionProvider.select(
        (v) => v.asData?.value is AuthSessionAuthenticated
            ? v.asData?.value
            : null,
      ),
    );
    _epoch++;
    ref.onDispose(() => _epoch++);
    return const CheckInPlaceState();
  }

  void clear() {
    _epoch++;
    state = const CheckInPlaceState();
  }

  Future<void> capture({required int expectedEpoch}) async {
    if (state.busy || expectedEpoch != _epoch) return;
    final epoch = ++_epoch, location = ref.read(foregroundLocationProvider);
    state = const CheckInPlaceState(busy: true);
    final result = await location.capture(precise: true);
    if (!ref.mounted || epoch != _epoch) return;
    state = switch (result) {
      Success<GeoPoint>(:final value) => CheckInPlaceState(
        place: CheckInPlace(location: value),
      ),
      Failure<GeoPoint>(:final failure) => CheckInPlaceState(failure: failure),
    };
  }

  Future<void> allowWeather(bool allowed, {required int expectedEpoch}) async {
    final place = state.place;
    if (state.busy || expectedEpoch != _epoch || place == null) return;
    final epoch = ++_epoch;
    if (!allowed) {
      state = CheckInPlaceState(place: CheckInPlace(location: place.location));
      return;
    }
    final preferences = ref.read(accountPreferencesRepositoryProvider);
    state = CheckInPlaceState(
      place: CheckInPlace(location: place.location),
      busy: true,
    );
    final result = await preferences.readSettings();
    if (!ref.mounted || epoch != _epoch) return;
    state = switch (result) {
      Success<OwnSettings>(:final value) => CheckInPlaceState(
        place: CheckInPlace(
          location: place.location,
          includeWeather: true,
          settingsRevision: value.revision,
        ),
      ),
      Failure<OwnSettings>(:final failure) => CheckInPlaceState(
        place: CheckInPlace(location: place.location),
        failure: failure,
      ),
    };
  }
}
