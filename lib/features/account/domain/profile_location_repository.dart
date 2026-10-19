import '../../../core/result/result.dart';

/// One explicit foreground location request; returns only coarse coordinates.
abstract interface class ProfileLocationRepository {
  Future<Result<String>> currentRegionCoordinates();
}
