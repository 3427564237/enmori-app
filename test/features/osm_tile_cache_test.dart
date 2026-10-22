import 'dart:async';
import 'dart:ui' as ui;
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:enmori/features/friends/presentation/osm_tiles.dart';
import 'package:enmori/features/friends/presentation/check_in_points_map.dart';
import 'package:enmori/features/friends/domain/social_repository.dart';
import 'package:enmori/features/weather/domain/weather.dart';

Future<void> decodeTile(NetworkTileProvider provider, TileLayer layer) async {
  final image = provider.getImageWithCancelLoadingSupport(
    const TileCoordinates(0, 0, 0),
    layer,
    Completer<void>().future,
  );
  await image.evict(); // A memory hit must not masquerade as a disk-cache hit.
  final done = Completer<void>();
  final stream = image.resolve(ImageConfiguration.empty);
  late ImageStreamListener listener;
  listener = ImageStreamListener(
    (image, _) {
      image.dispose();
      done.complete();
    },
    onError: (Object error, StackTrace? stack) =>
        done.completeError(error, stack),
  );
  stream.addListener(listener);
  try {
    await done.future.timeout(const Duration(seconds: 10));
  } finally {
    stream.removeListener(listener);
    await image.evict();
  }
}

void main() {
  test('installed metadata honors max-age/Age, Expires and seven-day fallback without a freshness override', () {
    final now = DateTime.timestamp();
    final value = CachedMapTileMetadata.fromHttpHeaders({
      'cache-control': 'public, max-age=3600',
      'age': '60',
      'etag': 'fixture',
    });
    expect(
      value.staleAt.difference(now).inSeconds,
      inInclusiveRange(3539, 3541),
    );
    expect(value.etag, 'fixture');
    final expires = HttpDate.format(now.add(const Duration(hours: 2)));
    final explicit = CachedMapTileMetadata.fromHttpHeaders({
      'cache-control': 'public',
      'expires': expires,
    });
    expect(explicit.staleAt, HttpDate.parse(expires));
    final fallback = CachedMapTileMetadata.fromHttpHeaders({});
    expect(
      fallback.staleAt.difference(now).inSeconds,
      inInclusiveRange(604799, 604801),
    );
  });
  testWidgets(
    'native disk cache survives provider recreation; stale bytes revalidate with ETag/Last-Modified and 304',
    (tester) async {
      await tester.runAsync(() async {
        final directory = await Directory.systemTemp.createTemp(
          'enmori-owned-tile-cache-',
        );
        final recorder = ui.PictureRecorder();
        ui.Canvas(recorder).drawColor(const Color(0xffeeeeee), BlendMode.src);
        final picture = recorder.endRecording();
        final pixel = await picture.toImage(1, 1);
        final png = (await pixel.toByteData(format: ui.ImageByteFormat.png))!
            .buffer
            .asUint8List();
        pixel.dispose();
        picture.dispose();
        var requests = 0;
        final modified = DateTime.utc(2026, 10, 1);
        final client = MockClient((request) async {
          requests++;
          expect(request.headers['User-Agent'], enmoriMapUserAgent);
          expect(request.headers.containsKey('cache-control'), isFalse);
          if (requests == 2) {
            expect(request.headers['if-none-match'], 'fixture-etag');
            expect(
              request.headers['if-modified-since'],
              HttpDate.format(modified),
            );
            return http.Response(
              '',
              304,
              headers: {
                'cache-control': 'max-age=3600',
                'age': '0',
                'etag': 'fixture-etag',
              },
            );
          }
          return http.Response.bytes(
            png,
            200,
            headers: {
              'cache-control': 'max-age=3600',
              'age': '0',
              'etag': 'fixture-etag',
              'last-modified': HttpDate.format(modified),
            },
          );
        });
        var cache = BuiltInMapCachingProvider.getOrCreateInstance(
          cacheDirectory: directory.path,
        );
        NetworkTileProvider provider() => NetworkTileProvider(
          httpClient: client,
          headers: {'User-Agent': enmoriMapUserAgent},
          cachingProvider: cache,
        );
        const url = 'https://tiles.fixture.invalid/0/0/0.png';
        final layer = TileLayer(
          urlTemplate: 'https://tiles.fixture.invalid/{z}/{x}/{y}.png',
        );
        final first = provider();
        try {
          await decodeTile(first, layer);
          // putTile is deliberately asynchronous in the installed image provider.
          CachedMapTile? stored;
          for (var i = 0; i < 100 && stored == null; i++) {
            stored = await cache.getTile(url);
            if (stored == null) {
              await Future<void>.delayed(const Duration(milliseconds: 10));
            }
          }
          expect(stored, isNotNull);
          expect(requests, 1);
          await first.dispose();
          await cache.destroy();
          cache = BuiltInMapCachingProvider.getOrCreateInstance(
            cacheDirectory: directory.path,
          );
          final second = provider();
          try {
            await decodeTile(second, layer);
            expect(requests, 1);
            await cache.putTile(
              url: url,
              metadata: CachedMapTileMetadata(
                staleAt: DateTime.utc(2000),
                etag: 'fixture-etag',
                lastModified: modified,
              ),
            );
            await decodeTile(second, layer);
            expect(requests, 2);
          } finally {
            await second.dispose();
          }
        } finally {
          client.close();
          await first.dispose();
          layer.tileProvider.dispose();
          await cache.destroy();
          final root = await Directory.systemTemp.resolveSymbolicLinks();
          final target = await directory.resolveSymbolicLinks();
          expect(
            target.startsWith(
              '$root${Platform.pathSeparator}enmori-owned-tile-cache-',
            ),
            isTrue,
          );
          await directory.delete(recursive: true);
          expect(await directory.exists(), isFalse);
        }
      });
    },
  );
  testWidgets(
    'copyright remains inside the visible map; attribution can open and fail accessibly',
    (tester) async {
      Uri? opened;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: CheckInPointsMap(
                points: [
                  CheckInMapPoint(
                    checkInId: 'fixture',
                    createdAt: DateTime.utc(2026),
                    location: const GeoPoint(1, 2),
                  ),
                ],
                onSelect: (_) {},
                openAttribution: (uri) async {
                  opened = uri;
                  return false;
                },
                tileLayerBuilder: () => const SizedBox.shrink(),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      final label = find.text('© OpenStreetMap contributors');
      expect(
        tester
            .getRect(find.byType(FlutterMap))
            .contains(tester.getCenter(label)),
        isTrue,
      );
      await tester.tap(label);
      await tester.pumpAndSettle();
      expect(opened.toString(), 'https://www.openstreetmap.org/copyright');
      expect(
        find.text('The attribution link could not be opened.'),
        findsOneWidget,
      );
    },
  );
}
