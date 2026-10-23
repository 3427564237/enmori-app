import '../../../core/result/result.dart';
import 'weather.dart';

/// A single foreground observation after explicit per-purpose UI permission.
/// Never reads a cached/last-known point or subscribes to a position stream.
abstract interface class ForegroundLocation {
  Future<Result<GeoPoint>> capture({required bool precise});
}
