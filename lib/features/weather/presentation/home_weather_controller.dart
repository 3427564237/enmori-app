import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/providers.dart';
import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../../auth/domain/auth_repository.dart';
import '../../account/account_preferences_providers.dart';
import '../../account/domain/account_preferences_repository.dart';
import '../domain/home_weather_repository.dart';
import '../domain/weather.dart';
import '../data/backend_home_weather_repository.dart';
import '../weather_providers.dart';

final homeWeatherRepositoryProvider = Provider<HomeWeatherRepository>(
  (ref) => BackendHomeWeatherRepository(ref.watch(backendApiClientProvider)),
);
final homeWeatherControllerProvider =
    NotifierProvider.autoDispose<HomeWeatherController, HomeWeatherState>(
      HomeWeatherController.new,
    );

final class HomeWeatherState {
  const HomeWeatherState({this.weather, this.failure, this.busy = false});
  final WeatherSnapshot? weather;
  final AppFailure? failure;
  final bool busy;
}

final class HomeWeatherController extends Notifier<HomeWeatherState> {
  int _epoch = 0;
  int get epoch => _epoch;
  @override
  HomeWeatherState build() {
    ref.watch(
      authSessionProvider.select(
        (v) => v.asData?.value is AuthSessionAuthenticated
            ? v.asData?.value
            : null,
      ),
    );
    _epoch++;
    ref.onDispose(() => _epoch++);
    return const HomeWeatherState();
  }

  void clear() {
    _epoch++;
    state = const HomeWeatherState();
  }

  bool _current(int epoch) => ref.mounted && epoch == _epoch;
  Future<void> load({required int expectedEpoch}) async {
    if (state.busy || expectedEpoch != _epoch) return;
    final epoch = ++_epoch,
        location = ref.read(foregroundLocationProvider),
        preferences = ref.read(accountPreferencesRepositoryProvider),
        repository = ref.read(homeWeatherRepositoryProvider);
    state = const HomeWeatherState(busy: true);
    final settings = await preferences.readSettings();
    if (!_current(epoch)) return;
    if (settings case Failure<OwnSettings>(:final failure)) {
      state = HomeWeatherState(failure: failure);
      return;
    }
    final point = await location.capture(precise: false);
    if (!_current(epoch)) return;
    if (point case Failure<GeoPoint>(:final failure)) {
      state = HomeWeatherState(failure: failure);
      return;
    }
    final weather = await repository.current(
      (point as Success<GeoPoint>).value.weatherGrid,
      settingsRevision: (settings as Success<OwnSettings>).value.revision,
    );
    if (!_current(epoch)) return;
    state = switch (weather) {
      Success<WeatherSnapshot>(:final value) => HomeWeatherState(
        weather: value,
      ),
      Failure<WeatherSnapshot>(:final failure) => HomeWeatherState(
        failure: failure,
      ),
    };
  }
}
