import 'dart:math' as math;
import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:geolocator/geolocator.dart';

import '../../../core/result/result.dart';
import '../domain/recommendation_profile.dart';
import '../domain/region_geometry.dart';

final class DeviceRegionRepository implements RegionRepository {
  List<Map<String, dynamic>>? _rows;
  Future<List<Map<String, dynamic>>> _load() async => _rows ??=
      ((jsonDecode(
                await rootBundle.loadString(
                  'assets/regions/sg-planning-areas-2025.json',
                ),
              ) as Map<String, dynamic>)['areas']
              as List)
          .cast<Map<String, dynamic>>();
  PlanningArea _area(Map<String, dynamic> r) => PlanningArea(
    code: r['code'] as String,
    name: r['name'] as String,
    regionCode: r['regionCode'] as String,
    regionName: r['regionName'] as String,
  );
  @override
  Future<List<PlanningArea>> catalogue() async =>
      (await _load()).map(_area).toList()
        ..sort((a, b) => a.name.compareTo(b.name));
  @override
  Future<Result<PlanningArea>> locate() async {
    try {
      if (!await Geolocator.isLocationServiceEnabled()) return _fail();
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission != LocationPermission.whileInUse &&
          permission != LocationPermission.always) {
        return _fail();
      }
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.medium,
          timeLimit: Duration(seconds: 15),
        ),
      );
      if (!position.accuracy.isFinite ||
          position.accuracy < 0 ||
          position.accuracy > 250 ||
          !position.latitude.isFinite ||
          !position.longitude.isFinite) {
        return _fail();
      }
      final points = [
        (position.longitude, position.latitude),
        for (var i = 0; i < 8; i++)
          (
            position.longitude +
                position.accuracy *
                    math.cos(i * math.pi / 4) /
                    (111320 * math.cos(position.latitude * math.pi / 180)),
            position.latitude +
                position.accuracy * math.sin(i * math.pi / 4) / 111320,
          ),
      ];
      final matches = <PlanningArea>[];
      for (final row in await _load()) {
        final geometry = row['geometry'] as Map<String, dynamic>;
        final polygons = geometry['type'] == 'Polygon'
            ? [geometry['coordinates']]
            : geometry['coordinates'] as List;
        for (final polygon in polygons) {
          final rings = (polygon as List)
              .map(
                (ring) => (ring as List)
                    .map(
                      (p) => (p as List)
                          .map((v) => (v as num).toDouble())
                          .toList(),
                    )
                    .toList(),
              )
              .toList();
          if (rings.isNotEmpty &&
              points.every(
                (point) =>
                    insideRing(point.$1, point.$2, rings.first) &&
                    !rings
                        .skip(1)
                        .any((r) => insideRing(point.$1, point.$2, r)),
              )) {
            matches.add(_area(row));
            break;
          }
        }
      }
      return matches.length == 1 ? Success(matches.single) : _fail();
    } catch (_) {
      return _fail();
    }
  }

  Failure<PlanningArea> _fail() => const Failure(
    AppFailure(
      kind: AppFailureKind.serviceUnavailable,
      message: 'Location unavailable. Using your home area, or all Singapore.',
    ),
  );
}
