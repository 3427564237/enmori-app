import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../domain/social_repository.dart';

final class CheckInPointsMap extends StatefulWidget {
  const CheckInPointsMap({
    required this.points,
    required this.onSelect,
    required this.openAttribution,
    this.tileLayerBuilder,
    super.key,
  });
  final List<CheckInMapPoint> points;
  final ValueChanged<CheckInMapPoint> onSelect;
  final Future<bool> Function(Uri) openAttribution;

  /// Test/host composition only. Production defaults to OSM with built-in caching.
  final Widget Function()? tileLayerBuilder;
  @override
  State<CheckInPointsMap> createState() => _CheckInPointsMapState();
}

final class _CheckInPointsMapState extends State<CheckInPointsMap> {
  bool _tileError = false, _linkError = false;
  @override
  void didUpdateWidget(covariant CheckInPointsMap old) {
    super.didUpdateWidget(old);
    if (!identical(old.points, widget.points)) _tileError = false;
  }

  Future<void> _selectPoint(
    CheckInMapPoint point,
    List<CheckInMapPoint> ordered,
  ) async {
    const distance = Distance();
    final nearby = ordered
        .where(
          (p) =>
              distance(
                LatLng(point.location.latitude, point.location.longitude),
                LatLng(p.location.latitude, p.location.longitude),
              ) <=
              100,
        )
        .toList();
    if (nearby.length == 1) {
      widget.onSelect(point);
      return;
    }
    final selected = await showModalBottomSheet<CheckInMapPoint>(
      context: context,
      sheetAnimationStyle: MediaQuery.disableAnimationsOf(context)
          ? AnimationStyle.noAnimation
          : null,
      builder: (context) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          children: [
            Text(
              'Check-ins near this point',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const Text(
              'Within 100 m. Each record keeps its original GPS point.',
            ),
            for (final p in nearby)
              ListTile(
                leading: CircleAvatar(child: Text('${ordered.indexOf(p) + 1}')),
                title: Text(
                  MaterialLocalizations.of(context)
                      .formatMediumDate(p.createdAt.toLocal()),
                ),
                subtitle: Text(
                  MaterialLocalizations.of(context).formatTimeOfDay(
                    TimeOfDay.fromDateTime(p.createdAt.toLocal()),
                  ),
                ),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => Navigator.pop(context, p),
              ),
          ],
        ),
      ),
    );
    if (mounted && selected != null && widget.points.contains(selected)) {
      widget.onSelect(selected);
    }
  }

  @override
  Widget build(BuildContext context) {
    final ordered = [...widget.points]
      ..sort((a, b) {
        final time = a.createdAt.compareTo(b.createdAt);
        return time != 0 ? time : a.checkInId.compareTo(b.checkInId);
      });
    final points = ordered
        .where((p) => p.location.latitude.abs() <= 85.05112878)
        .toList();
    final coordinates = points
        .map((p) => LatLng(p.location.latitude, p.location.longitude))
        .toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Footprint', style: Theme.of(context).textTheme.titleLarge),
        const Text(
          'Lines connect visible Check-ins in time order. They do not show a continuous route.',
        ),
        const Text(
          'Map tiles for the visible area are loaded from OpenStreetMap.',
        ),
        if (widget.points.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Text('No shared Check-in locations for this month.'),
          ),
        if (coordinates.isNotEmpty) ...[
          const SizedBox(height: 12),
          SizedBox(
            height: 340,
            child: FlutterMap(
              key: ObjectKey(widget.points),
              options: MapOptions(
                initialCenter: coordinates.first,
                initialZoom: 12,
                minZoom: 1,
                maxZoom: 19,
                initialCameraFit: coordinates.length < 2
                    ? null
                    : CameraFit.bounds(
                        bounds: LatLngBounds.fromPoints(coordinates),
                        padding: const EdgeInsets.all(32),
                        maxZoom: 16,
                      ),
              ),
              children: [
                widget.tileLayerBuilder?.call() ??
                    TileLayer(
                      urlTemplate:
                          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: 'com.enmori.app',
                      panBuffer: 0,
                      keepBuffer: 0,
                      maxNativeZoom: 19,
                      errorTileCallback: (_, _, _) {
                        if (mounted && !_tileError) {
                          WidgetsBinding.instance.addPostFrameCallback((_) {
                            if (mounted) setState(() => _tileError = true);
                          });
                        }
                      },
                    ),
                if (coordinates.length > 1)
                  PolylineLayer(
                    polylines: [
                      Polyline(
                        points: coordinates,
                        color: Theme.of(context).colorScheme.primary,
                        strokeWidth: 3,
                      ),
                    ],
                  ),
                MarkerLayer(
                  markers: [
                    for (var i = 0; i < points.length; i++)
                      Marker(
                        point: coordinates[i],
                        width: 48,
                        height: 48,
                        child: IconButton(
                          tooltip:
                              'Open Check-in ${ordered.indexOf(points[i]) + 1}',
                          onPressed: () => _selectPoint(points[i], ordered),
                          icon: Text(
                            '${ordered.indexOf(points[i]) + 1}',
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                          style: IconButton.styleFrom(
                            backgroundColor: Theme.of(context)
                                .colorScheme
                                .surfaceContainerHighest,
                          ),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
          if (_tileError)
            const Text(
              'Map tiles are unavailable. The visible Check-ins are listed below.',
            ),
          TextButton(
            onPressed: () async {
              try {
                final ok = await widget.openAttribution(
                  Uri.parse('https://www.openstreetmap.org/copyright'),
                );
                if (mounted) setState(() => _linkError = !ok);
              } catch (_) {
                if (mounted) setState(() => _linkError = true);
              }
            },
            child: const Text('© OpenStreetMap contributors'),
          ),
          if (_linkError)
            const Text('The attribution link could not be opened.'),
        ],
        if (points.length != widget.points.length)
          const Text(
            'Some Check-ins are outside this map projection. Use the list to open them.',
          ),
        for (var i = 0; i < ordered.length; i++)
          ListTile(
            leading: Text('${i + 1}'),
            title: Text(ordered[i].createdAt.toLocal().toString()),
            subtitle: const Text('Open this Check-in'),
            onTap: () => widget.onSelect(ordered[i]),
          ),
      ],
    );
  }
}
