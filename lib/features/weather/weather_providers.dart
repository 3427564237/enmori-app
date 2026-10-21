import 'domain/weather.dart';

import 'package:flutter/widgets.dart';

import 'presentation/weather_card.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../weather/data/geolocator_foreground_location.dart';
import 'domain/foreground_location.dart';

final foregroundLocationProvider = Provider<ForegroundLocation>(
  (ref) => const GeolocatorForegroundLocation(),
);

// Public presentation slot; consumers do not import Weather's private widgets.
final weatherCardBuilderProvider =
    Provider<Widget Function(WeatherSnapshot, Future<bool> Function(Uri))>(
      (ref) =>
          (snapshot, opener) =>
              WeatherCard(snapshot: snapshot, openAttribution: opener),
    );
