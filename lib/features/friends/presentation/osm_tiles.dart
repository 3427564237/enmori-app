import 'package:flutter/widgets.dart';
import 'package:flutter_map/flutter_map.dart';

/// Uses flutter_map's native HTTP-aware disk cache without overriding freshness.
/// No offline region, prefetch or additional provider is configured.
const enmoriMapUserAgent =
    'ENMORI/1.0 (+https://github.com/3427564237/enmori-app)';

final class EnmoriOsmTiles extends StatefulWidget {
  const EnmoriOsmTiles({required this.onError, super.key});
  final VoidCallback onError;
  @override
  State<EnmoriOsmTiles> createState() => _EnmoriOsmTilesState();
}

final class _EnmoriOsmTilesState extends State<EnmoriOsmTiles> {
  // TileLayer owns/disposes this provider. Ordinary parent rebuilds reuse it.
  late final _provider = NetworkTileProvider(
    headers: {'User-Agent': enmoriMapUserAgent},
  );
  @override
  Widget build(BuildContext context) => TileLayer(
    urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    tileProvider: _provider,
    panBuffer: 0,
    keepBuffer: 0,
    maxNativeZoom: 19,
    errorTileCallback: (_, _, _) => widget.onError(),
  );
}
