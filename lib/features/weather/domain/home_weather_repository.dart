import '../../../core/result/result.dart';
import 'weather.dart';

abstract interface class HomeWeatherRepository {
  Future<Result<WeatherSnapshot>> current(
    GeoPoint grid, {
    required int settingsRevision,
  });
}
