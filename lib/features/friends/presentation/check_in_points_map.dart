import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../../../core/presentation/enmori_motion.dart';
import '../domain/social_repository.dart';
import 'osm_tiles.dart';

final class CheckInPointsMap extends StatefulWidget {
  const CheckInPointsMap({
    required this.points,
    required this.onSelect,
    required this.openAttribution,
    this.tileLayerBuilder,
    this.recordPreviewBuilder,
    super.key,
  });
  final List<CheckInMapPoint> points;
  final Widget Function(BuildContext, CheckInMapPoint)? recordPreviewBuilder;
  final ValueChanged<CheckInMapPoint> onSelect;
  final Future<bool> Function(Uri) openAttribution;

  /// Test/host composition only. Production defaults to OSM with built-in caching.
  final Widget Function()? tileLayerBuilder;
  @override
  State<CheckInPointsMap> createState() => _CheckInPointsMapState();
}

final class _CheckInPointsMapState extends State<CheckInPointsMap> {
  bool _tileError = false, _linkError = false;
  String? _selectedPointId;
  final _previewAnchor = GlobalKey();

  void _select(String id) {
    setState(() => _selectedPointId = id);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final target = _previewAnchor.currentContext;
      if (mounted && target != null) {
        Scrollable.ensureVisible(
          target,
          alignment: .5,
          duration: EnmoriMotion.duration(context, EnmoriMotion.feedback),
        );
      }
    });
  }

  @override
  void didUpdateWidget(covariant CheckInPointsMap old) {
    super.didUpdateWidget(old);
    if (!identical(old.points, widget.points)) {
      _tileError = false;
      if (!widget.points.any((p) => p.checkInId == _selectedPointId)) {
        _selectedPointId = null;
      }
    }
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
      _select(point.checkInId);
      return;
    }
    final selected = await showModalBottomSheet<CheckInMapPoint>(
      context: context,
      sheetAnimationStyle: EnmoriMotion.surface(context),
      builder: (context) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          children: [
            Text(
              context.tr('Check-ins near this point', '附近的签到'),
              style: Theme.of(context).textTheme.titleLarge,
            ),
            Text(
              context.tr(
                'Within 100 m. Each record keeps its original GPS point.',
                '100 米以内，每条记录保留原始 GPS 位置。',
              ),
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
      _select(selected.checkInId);
    }
  }

  String _time(BuildContext context, CheckInMapPoint point) {
    final local = point.createdAt.toLocal();
    final labels = MaterialLocalizations.of(context);
    return '${labels.formatMediumDate(local)} · '
        '${labels.formatTimeOfDay(TimeOfDay.fromDateTime(local))}';
  }

  String _gap(CheckInMapPoint previous, CheckInMapPoint current) {
    final gap = current.createdAt.difference(previous.createdAt);
    if (gap.inDays > 0) {
      return context.tr(
        '${gap.inDays}d after previous Check-in',
        '距上一条签到 ${gap.inDays} 天',
      );
    }
    if (gap.inHours > 0) {
      return context.tr(
        '${gap.inHours}h after previous Check-in',
        '距上一条签到 ${gap.inHours} 小时',
      );
    }
    if (gap.inMinutes > 0) {
      return context.tr(
        '${gap.inMinutes}m after previous Check-in',
        '距上一条签到 ${gap.inMinutes} 分钟',
      );
    }
    return context.tr('Within a minute of previous Check-in', '与上一条签到相隔不到一分钟');
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
    final selected = ordered
        .where((p) => p.checkInId == _selectedPointId)
        .firstOrNull;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          context.tr('Footprint', '足迹'),
          style: Theme.of(context).textTheme.titleLarge,
        ),
        Text(
          context.tr(
            'Lines connect visible Check-ins in time order. They do not show a continuous route.',
            '连线按时间顺序连接有权查看的签到点，不代表实际行走路线。',
          ),
        ),
        Text(
          context.tr(
            'Map tiles for the visible area are loaded from OpenStreetMap.',
            '当前区域底图由 OpenStreetMap 提供。',
          ),
        ),
        if (widget.points.isEmpty)
          Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Text(
              context.tr(
                'No visible Check-in locations for this month.',
                '本月没有可查看的签到位置。',
              ),
            ),
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
                        padding: EdgeInsets.fromLTRB(
                          32,
                          32,
                          32,
                          48 + MediaQuery.textScalerOf(context).scale(32),
                        ),
                        maxZoom: 16,
                      ),
              ),
              children: [
                widget.tileLayerBuilder?.call() ??
                    EnmoriOsmTiles(
                      onError: () {
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
                        child: AnimatedScale(
                          key: ValueKey(points[i].checkInId),
                          scale: _selectedPointId == points[i].checkInId
                              ? 1.08
                              : 1,
                          duration: EnmoriMotion.duration(
                            context,
                            EnmoriMotion.feedback,
                          ),
                          curve: EnmoriMotion.settle,
                          child: IconButton(
                            isSelected: _selectedPointId == points[i].checkInId,
                            tooltip: context.tr(
                              'Select Check-in ${ordered.indexOf(points[i]) + 1}',
                              '选择第 ${ordered.indexOf(points[i]) + 1} 条签到',
                            ),
                            onPressed: () => _selectPoint(points[i], ordered),
                            icon: Text(
                              '${ordered.indexOf(points[i]) + 1}',
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            style: IconButton.styleFrom(
                              backgroundColor:
                                  _selectedPointId == points[i].checkInId
                                  ? Theme.of(context)
                                        .colorScheme
                                        .primaryContainer
                                  : Theme.of(context)
                                        .colorScheme
                                        .surfaceContainerHighest,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
                Align(
                  alignment: Alignment.bottomRight,
                  child: Material(
                    color: Theme.of(context).colorScheme.surface,
                    child: TextButton(
                      onPressed: () async {
                        try {
                          final ok = await widget.openAttribution(
                            Uri.parse(
                              'https://www.openstreetmap.org/copyright',
                            ),
                          );
                          if (mounted) setState(() => _linkError = !ok);
                        } catch (_) {
                          if (mounted) setState(() => _linkError = true);
                        }
                      },
                      child: Text('© OpenStreetMap contributors'),
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (_tileError)
            Text(
              context.tr(
                'Map tiles are unavailable. The visible Check-ins are listed below.',
                '底图暂时不可用，仍可使用下方签到列表。',
              ),
            ),
          if (_linkError)
            Text(
              context.tr(
                'The attribution link could not be opened.',
                '无法打开地图署名链接。',
              ),
            ),
        ],
        if (selected != null) ...[
          const SizedBox(height: 12),
          Card(
            key: _previewAnchor,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    context.tr(
                      'Check-in ${ordered.indexOf(selected) + 1} of ${ordered.length}',
                      '第 ${ordered.indexOf(selected) + 1} 条签到，共 ${ordered.length} 条',
                    ),
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  Text(
                    context.tr(
                      '${_time(context, selected)} · local time',
                      '${_time(context, selected)} · 本地时间',
                    ),
                  ),
                  if (ordered.indexOf(selected) > 0)
                    Text(
                      _gap(ordered[ordered.indexOf(selected) - 1], selected),
                    ),
                  Wrap(
                    spacing: 8,
                    runSpacing: 4,
                    children: [
                      TextButton.icon(
                        key: const Key('map-previous-record'),
                        onPressed: ordered.first == selected
                            ? null
                            : () => _select(
                                ordered[ordered.indexOf(selected) - 1]
                                    .checkInId,
                              ),
                        icon: const Icon(Icons.chevron_left),
                        label: Text(context.tr('Previous', '上一条')),
                      ),
                      TextButton.icon(
                        key: const Key('map-next-record'),
                        onPressed: ordered.last == selected
                            ? null
                            : () => _select(
                                ordered[ordered.indexOf(selected) + 1]
                                    .checkInId,
                              ),
                        icon: const Icon(Icons.chevron_right),
                        label: Text(context.tr('Next', '下一条')),
                      ),
                    ],
                  ),
                  if (widget.recordPreviewBuilder case final builder?)
                    builder(context, selected)
                  else
                    FilledButton.tonal(
                      onPressed: () => widget.onSelect(selected),
                      child: Text(context.tr('Open Check-in', '打开签到')),
                    ),
                ],
              ),
            ),
          ),
        ] else if (ordered.isNotEmpty)
          Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: Text(
              context.tr(
                'Select a point or a row to revisit that moment.',
                '选择地图点或列表记录，回顾那一刻。',
              ),
            ),
          ),
        if (points.length != widget.points.length)
          Text(
            context.tr(
              'Some Check-ins are outside this map projection. Use the list to open them.',
              '部分签到超出此地图投影范围，请从列表打开。',
            ),
          ),
        for (var i = 0; i < ordered.length; i++)
          ListTile(
            leading: Text('${i + 1}'),
            key: ValueKey('map-record-${ordered[i].checkInId}'),
            selected: ordered[i].checkInId == _selectedPointId,
            title: Text(_time(context, ordered[i])),
            subtitle: Text(
              i == 0
                  ? context.tr('First visible Check-in', '第一条可查看的签到')
                  : _gap(ordered[i - 1], ordered[i]),
            ),
            trailing: const Icon(Icons.chevron_right),
            onTap: () =>
                setState(() => _selectedPointId = ordered[i].checkInId),
          ),
      ],
    );
  }
}
