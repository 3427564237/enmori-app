import 'package:flutter/widgets.dart';
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
final homeWeatherNowProvider = Provider<DateTime Function()>(
  (ref) => DateTime.now,
);
final homeWeatherControllerProvider =
    NotifierProvider<HomeWeatherController, HomeWeatherState>(
      HomeWeatherController.new,
    );

final class HomeWeatherState {
  const HomeWeatherState({
    this.weather,
    this.failure,
    this.busy = false,
    this.automatic = false,
  });
  final WeatherSnapshot? weather;
  final AppFailure? failure;
  final bool busy, automatic;
}

final class HomeWeatherController extends Notifier<HomeWeatherState> {
  static const refreshInterval = Duration(minutes: 15);
  int _epoch = 0;
  DateTime? _lastAttempt;
  int get epoch => _epoch;

  @override
  HomeWeatherState build() {
    ref.watch(authSessionProvider);
    _epoch++;
    _lastAttempt = null;
    final lifecycle = _WeatherLifecycleObserver(suspend);
    WidgetsBinding.instance.addObserver(lifecycle);
    ref.onDispose(() {
      _epoch++;
      WidgetsBinding.instance.removeObserver(lifecycle);
    });
    ref.listen(accountSettingsSnapshotProvider, (previous, next) {
      if (next == null) return;
      if (previous?.homeWeatherAuto == true && !next.homeWeatherAuto) {
        // A confirmed revocation also fences any in-flight location/result.
        _epoch++;
        _lastAttempt = null;
        state = const HomeWeatherState();
      } else {
        state = HomeWeatherState(
          weather: state.weather,
          failure: state.failure,
          busy: state.busy,
          automatic: next.homeWeatherAuto,
        );
      }
    });
    return const HomeWeatherState();
  }

  void clear() {
    _epoch++;
    state = HomeWeatherState(automatic: state.automatic);
  }

  void suspend() {
    _epoch++;
    state = HomeWeatherState(
      weather: state.weather,
      automatic: state.automatic,
    );
  }

  bool get _foreground {
    final lifecycle = WidgetsBinding.instance.lifecycleState;
    return lifecycle == null ||
        lifecycle == AppLifecycleState.resumed ||
        lifecycle == AppLifecycleState.inactive;
  }

  bool _current(int epoch) => ref.mounted && epoch == _epoch && _foreground;

  Future<void> openHome() => _load(automatic: true);
  Future<void> load({required int expectedEpoch, bool remember = false}) async {
    if (expectedEpoch != _epoch) return;
    await _load(remember: remember);
  }

  Future<void> _load({bool automatic = false, bool remember = false}) async {
    if (state.busy ||
        !_foreground ||
        ref.read(authSessionProvider).asData?.value
            is! AuthSessionAuthenticated) {
      return;
    }
    final epoch = ++_epoch;
    final preferences = ref.read(accountPreferencesRepositoryProvider);
    final previousWeather = state.weather;
    state = HomeWeatherState(
      weather: previousWeather,
      busy: true,
      automatic: state.automatic,
    );
    void fail(AppFailure failure) {
      state = HomeWeatherState(
        weather: previousWeather,
        failure: failure,
        automatic: state.automatic,
      );
    }

    final result = await preferences.readSettings();
    if (!_current(epoch)) return;
    if (result case Failure<OwnSettings>(:final failure)) {
      fail(failure);
      return;
    }
    var settings = (result as Success<OwnSettings>).value;
    final observed = ref.read(accountSettingsSnapshotProvider);
    if (observed != null && observed.revision > settings.revision) {
      fail(
        const AppFailure(
          kind: AppFailureKind.settingsRevisionPreconditionFailed,
          message: 'Your settings changed. Please try again.',
        ),
      );
      return;
    }
    ref.read(accountSettingsSnapshotProvider.notifier).observe(settings);
    if (!_current(epoch)) return;
    if (remember && !settings.homeWeatherAuto) {
      final saved = await preferences.saveSettings(
        visibility: settings.checkInVisibility,
        consent: settings.consent,
        expectedRevision: settings.revision,
        homeWeatherAuto: true,
      );
      if (!_current(epoch)) return;
      if (saved case Failure<OwnSettings>(:final failure)) {
        fail(failure); // Never assume an uncertain preference write succeeded.
        return;
      }
      settings = (saved as Success<OwnSettings>).value;
      ref.read(accountSettingsSnapshotProvider.notifier).observe(settings);
      if (!_current(epoch)) return;
    }
    final now = ref.read(homeWeatherNowProvider)();
    if (automatic &&
        (!settings.homeWeatherAuto ||
            (_lastAttempt != null &&
                now.difference(_lastAttempt!) < refreshInterval))) {
      state = HomeWeatherState(
        weather: previousWeather,
        automatic: settings.homeWeatherAuto,
      );
      return;
    }
    _lastAttempt = now;
    final point = await ref
        .read(foregroundLocationProvider)
        .capture(precise: false);
    if (!_current(epoch)) return;
    if (point case Failure<GeoPoint>(:final failure)) {
      fail(failure);
      return;
    }
    final weather = await ref
        .read(homeWeatherRepositoryProvider)
        .current(
          (point as Success<GeoPoint>).value.weatherGrid,
          settingsRevision: settings.revision,
        );
    if (!_current(epoch)) return;
    state = switch (weather) {
      Success<WeatherSnapshot>(:final value) => HomeWeatherState(
        weather: value,
        automatic: settings.homeWeatherAuto,
      ),
      Failure<WeatherSnapshot>(:final failure) => HomeWeatherState(
        weather: previousWeather,
        failure: failure,
        automatic: settings.homeWeatherAuto,
      ),
    };
  }
}

final class _WeatherLifecycleObserver extends WidgetsBindingObserver {
  _WeatherLifecycleObserver(this.suspend);
  final VoidCallback suspend;
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.hidden ||
        state == AppLifecycleState.detached) {
      suspend();
    }
  }
}
