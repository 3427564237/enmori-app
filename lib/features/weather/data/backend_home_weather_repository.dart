import '../../../core/network/backend_api_client.dart';
import '../../../core/result/result.dart';
import '../domain/home_weather_repository.dart';
import '../domain/weather.dart';

final class BackendHomeWeatherRepository implements HomeWeatherRepository {
  BackendHomeWeatherRepository(this.client);
  final BackendApiClient client;
  @override
  Future<Result<WeatherSnapshot>> current(
    GeoPoint grid, {
    required int settingsRevision,
  }) async {
    if (!grid.valid) {
      return const Failure(
        AppFailure(
          kind: AppFailureKind.requestInvalid,
          message: 'Current location is unavailable.',
        ),
      );
    }
    final response = await client.post(
      '/v1/me/home-weather',
      body: {
        'position': grid.weatherGrid.toJson(),
        'expectedSettingsRevision': settingsRevision,
      },
    );
    if (response case Failure<JsonObject>(:final failure)) {
      return Failure(failure);
    }
    final value = (response as Success<JsonObject>).value,
        weather = WeatherSnapshot.parse(value['weather']);
    return value.length == 1 && weather != null
        ? Success(weather)
        : const Failure(
            AppFailure(
              kind: AppFailureKind.unexpected,
              message: 'Current weather is unavailable.',
            ),
          );
  }
}
