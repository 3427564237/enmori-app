import 'package:geolocator/geolocator.dart';

import '../../../core/result/result.dart';
import '../domain/profile_location_repository.dart';

final class GeolocatorProfileLocationRepository
    implements ProfileLocationRepository {
  const GeolocatorProfileLocationRepository();
  @override
  Future<Result<String>> currentRegionCoordinates() async {
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        return _failure(
          'Turn on location services or enter your region manually.',
        );
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission != LocationPermission.whileInUse &&
          permission != LocationPermission.always) {
        return _failure(
          'Location permission was not granted. You can enter your region manually.',
        );
      }
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.low,
          timeLimit: Duration(seconds: 15),
        ),
      );
      return Success(
        '${position.latitude.toStringAsFixed(1)}°, ${position.longitude.toStringAsFixed(1)}°',
      );
    } catch (_) {
      return _failure(
        'Current location is unavailable. Try again or enter your region manually.',
      );
    }
  }

  Failure<String> _failure(String message) => Failure(
    AppFailure(kind: AppFailureKind.serviceUnavailable, message: message),
  );
}
