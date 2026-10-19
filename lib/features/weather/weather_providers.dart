import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../weather/data/geolocator_foreground_location.dart';
import 'domain/foreground_location.dart';

final foregroundLocationProvider = Provider<ForegroundLocation>(
  (ref) => const GeolocatorForegroundLocation(),
);
