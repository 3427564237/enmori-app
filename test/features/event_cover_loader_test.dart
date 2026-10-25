import 'dart:async';
import 'dart:io';

import 'package:enmori/features/event_detail/data/ticketmaster_event_cover_loader.dart';
import 'package:flutter_test/flutter_test.dart';

final class _Headers implements HttpHeaders {
  _Headers([String mime = 'image/png']) : contentType = ContentType.parse(mime);
  final values = <String, Object>{};
  @override
  ContentType? contentType;
  @override
  void set(String name, Object value, {bool preserveHeaderCase = false}) =>
      values[name] = value;
  @override
  String? value(String name) => values[name]?.toString();
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

final class _Response extends Stream<List<int>> implements HttpClientResponse {
  _Response(
    this.chunks, {
    this.statusCode = 200,
    this.contentLength = -1,
    String mime = 'image/png',
  }) : headers = _Headers(mime);
  final List<List<int>> chunks;
  @override
  final int statusCode, contentLength;
  @override
  final _Headers headers;
  @override
  StreamSubscription<List<int>> listen(
    void Function(List<int>)? onData, {
    Function? onError,
    void Function()? onDone,
    bool? cancelOnError,
  }) => Stream<List<int>>.fromIterable(chunks).listen(
    onData,
    onError: onError,
    onDone: onDone,
    cancelOnError: cancelOnError,
  );
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

final class _Request implements HttpClientRequest {
  _Request(this.response);
  final Future<HttpClientResponse> response;
  @override
  final _Headers headers = _Headers();
  @override
  bool followRedirects = true;
  @override
  Future<HttpClientResponse> close() => response;
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

final class _Client implements HttpClient {
  _Client(this.request);
  final _Request request;
  Uri? received;
  bool closed = false;
  @override
  Future<HttpClientRequest> getUrl(Uri url) async {
    received = url;
    return request;
  }

  @override
  void close({bool force = false}) {
    closed = true;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  const url = 'https://s1.ticketm.net/dam/a/synthetic.png';
  test('cover request has no owner credentials, disables redirects and closes its own client', () async {
    final request = _Request(
      Future.value(
        _Response([
          [1, 2, 3],
        ]),
      ),
    );
    final client = _Client(request);
    final load = TicketmasterEventCoverLoader(createClient: () => client)
        .start(url);
    expect(await load.bytes, [1, 2, 3]);
    expect(client.received.toString(), url);
    expect(request.followRedirects, isFalse);
    expect(request.headers.values, {
      'cache-control': 'no-store',
      'accept-encoding': 'identity',
    });
    expect(client.closed, isTrue);
  });

  test('unapproved URLs never construct a client; redirect, wrong MIME and oversized bytes are absent media', () async {
    var constructed = 0;
    final loader = TicketmasterEventCoverLoader(
      createClient: () {
        constructed++;
        throw StateError('No I/O expected');
      },
    );
    for (final bad in [
      'http://s1.ticketm.net/a.png',
      'https://s1.ticketm.net.evil/a.png',
      'https://s1.ticketm.net/a.png?token=x',
      'https://s1.ticketm.net/a.png#',
      'https://user@s1.ticketm.net/a.png',
      'https://s1.ticketm.net:444/a.png',
    ]) {
      expect(await loader.start(bad).bytes, isNull);
    }
    expect(constructed, 0);
    for (final response in [
      _Response([
        [1],
      ], statusCode: 302),
      _Response([
        [1],
      ], mime: 'image/svg+xml'),
      _Response([
        [1],
      ], contentLength: 2 * 1024 * 1024 + 1),
      _Response([
        List.filled(2 * 1024 * 1024, 0),
        [1],
      ]),
    ]) {
      final client = _Client(_Request(Future.value(response)));
      expect(
        await TicketmasterEventCoverLoader(createClient: () => client)
            .start(url)
            .bytes,
        isNull,
      );
      expect(client.closed, isTrue);
    }
  });

  test('background/disposal cancellation closes in-flight I/O and rejects late response bytes', () async {
    final response = Completer<HttpClientResponse>();
    final client = _Client(_Request(response.future));
    final load = TicketmasterEventCoverLoader(createClient: () => client)
        .start(url);
    await Future<void>.delayed(Duration.zero);
    load.cancel();
    expect(client.closed, isTrue);
    response.complete(
      _Response([
        [1, 2, 3],
      ]),
    );
    expect(await load.bytes, isNull);
  });
}
