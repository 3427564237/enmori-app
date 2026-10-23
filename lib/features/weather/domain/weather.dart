final class GeoPoint {
  const GeoPoint(this.latitude, this.longitude);
  final double latitude, longitude;
  bool get valid =>
      latitude.isFinite &&
      longitude.isFinite &&
      latitude.abs() <= 90 &&
      longitude.abs() <= 180;
  GeoPoint get weatherGrid =>
      GeoPoint((latitude * 10).round() / 10, (longitude * 10).round() / 10);
  Map<String, Object> toJson() => {
    'latitude': latitude,
    'longitude': longitude,
  };
  static GeoPoint? parse(Object? raw) {
    if (raw is! Map ||
        raw.length != 2 ||
        raw['latitude'] is! num ||
        raw['longitude'] is! num) {
      return null;
    }
    final point = GeoPoint(
      (raw['latitude'] as num).toDouble(),
      (raw['longitude'] as num).toDouble(),
    );
    return point.valid ? point : null;
  }
}

enum WeatherCondition {
  clear('clear', 'Clear'),
  partlyCloudy('partly_cloudy', 'Partly cloudy'),
  overcast('overcast', 'Overcast'),
  fog('fog', 'Fog'),
  drizzle('drizzle', 'Drizzle'),
  rain('rain', 'Rain'),
  snow('snow', 'Snow'),
  showers('showers', 'Showers'),
  thunderstorm('thunderstorm', 'Thunderstorm');

  const WeatherCondition(this.wire, this.label);
  final String wire, label;
}

final class WeatherSnapshot {
  const WeatherSnapshot({
    required this.observedAt,
    required this.temperatureCelsius,
    required this.condition,
  });
  final DateTime observedAt;
  final double temperatureCelsius;
  final WeatherCondition condition;
  String get label =>
      '${condition.label} · ${temperatureCelsius.toStringAsFixed(1)}°C';
  static WeatherSnapshot? parse(Object? raw) {
    if (raw is! Map ||
        raw.length != 5 ||
        raw['projectionVersion'] != 'weather_projection_v1' ||
        raw['source'] != 'open_meteo' ||
        raw['observedAt'] is! String ||
        raw['temperatureCelsius'] is! num) {
      return null;
    }
    final time = DateTime.tryParse(raw['observedAt'] as String);
    final temperature = (raw['temperatureCelsius'] as num).toDouble();
    final conditions = WeatherCondition.values.where(
      (c) => c.wire == raw['condition'],
    );
    if (time == null ||
        !time.isUtc ||
        time.toIso8601String() != raw['observedAt'] ||
        conditions.length != 1 ||
        !temperature.isFinite ||
        temperature < -100 ||
        temperature > 70 ||
        (temperature * 10 - (temperature * 10).round()).abs() > 1e-8) {
      return null;
    }
    return WeatherSnapshot(
      observedAt: time,
      temperatureCelsius: temperature,
      condition: conditions.single,
    );
  }
}
