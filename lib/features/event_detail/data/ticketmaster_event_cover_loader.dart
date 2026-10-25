import 'dart:async';
import 'dart:io';
import 'dart:typed_data';

import '../domain/event_cover.dart';

/// A detail-owned request: no shared client, credentials, redirects or cache.
final class TicketmasterEventCoverLoader implements EventCoverLoader {
  const TicketmasterEventCoverLoader({this.createClient = _client});
  final HttpClient Function() createClient;
  static HttpClient _client() => HttpClient()..autoUncompress = false;
  @override
  EventCoverLoad start(String sourceUrl) => _CoverLoad(sourceUrl, createClient);
}

final class _CoverLoad implements EventCoverLoad {
  _CoverLoad(String url, HttpClient Function() createClient) {
    bytes = _read(url, createClient);
  }
  static const maxBytes = 2 * 1024 * 1024;
  HttpClient? _http;
  bool _cancelled = false;
  @override
  late final Future<Uint8List?> bytes;

  Future<Uint8List?> _read(
    String url,
    HttpClient Function() createClient,
  ) async {
    if (!validEventCoverUrl(url)) return null;
    final timer = Timer(const Duration(seconds: 10), cancel);
    try {
      final http = _http = createClient();
      final request = await http.getUrl(Uri.parse(url));
      if (_cancelled) return null;
      request.followRedirects = false;
      request.headers.set(HttpHeaders.cacheControlHeader, 'no-store');
      request.headers.set(HttpHeaders.acceptEncodingHeader, 'identity');
      final response = await request.close();
      if (_cancelled ||
          response.statusCode != HttpStatus.ok ||
          response.contentLength > maxBytes ||
          !const [
            'image/jpeg',
            'image/png',
            'image/webp',
          ].contains(response.headers.contentType?.mimeType) ||
          (response.headers.value(HttpHeaders.contentEncodingHeader) ??
                  'identity') !=
              'identity') {
        return null;
      }
      final bytes = BytesBuilder(copy: false);
      await for (final chunk in response) {
        if (_cancelled || bytes.length + chunk.length > maxBytes) return null;
        bytes.add(chunk);
      }
      return _cancelled || bytes.length == 0 ? null : bytes.takeBytes();
    } catch (_) {
      return null;
    } finally {
      timer.cancel();
      _http?.close(force: true);
      _http = null;
    }
  }

  @override
  void cancel() {
    _cancelled = true;
    _http?.close(force: true);
  }
}
