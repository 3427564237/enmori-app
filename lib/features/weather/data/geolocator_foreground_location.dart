import 'package:flutter/widgets.dart';
import 'package:geolocator/geolocator.dart';

import '../../../core/result/result.dart';
import '../domain/foreground_location.dart';
import '../domain/weather.dart';

final class GeolocatorForegroundLocation implements ForegroundLocation {
  const GeolocatorForegroundLocation();
  bool get _foreground =>
      WidgetsBinding.instance.lifecycleState == AppLifecycleState.resumed;
  @override
  Future<Result<GeoPoint>> capture({required bool precise}) async {
    try {
      if (!_foreground) {
        return _failure('Return to the app before using location.');
      }
      if (!await Geolocator.isLocationServiceEnabled()) {
        return _failure(
          'Location services are off. You can continue without location.',
        );
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (!_foreground) {
        return _failure('Location was not kept after leaving the app.');
      }
      if (permission != LocationPermission.whileInUse &&
          permission != LocationPermission.always) {
        return _failure(
          'Location permission was not granted. You can continue without location.',
        );
      }
      if (precise &&
          await Geolocator.getLocationAccuracy() !=
              LocationAccuracyStatus.precise) {
        return _failure(
          'Enable precise location for a Check-in point, or continue without it.',
        );
      }
      final point = await Geolocator.getCurrentPosition(
        locationSettings: LocationSettings(
          accuracy: precise ? LocationAccuracy.high : LocationAccuracy.low,
          timeLimit: const Duration(seconds: 15),
        ),
      );
      if (!_foreground) {
        return _failure('Location was not kept after leaving the app.');
      }
      final current = await Geolocator.checkPermission();
      if (current != LocationPermission.whileInUse &&
          current != LocationPermission.always) {
        return _failure(
          'Location permission changed. You can continue without location.',
        );
      }
      if (precise &&
          await Geolocator.getLocationAccuracy() !=
              LocationAccuracyStatus.precise) {
        return _failure(
          'Precise location permission changed. You can continue without location.',
        );
      }
      final value = GeoPoint(point.latitude, point.longitude);
      return value.valid
          ? Success(precise ? value : value.weatherGrid)
          : _failure('Current location is unavailable.');
    } catch (_) {
      return _failure(
        'Current location is unavailable. You can try again or continue without it.',
      );
    }
  }
}

Failure<GeoPoint> _failure(String message) => Failure(
  AppFailure(kind: AppFailureKind.serviceUnavailable, message: message),
);
