import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;

import '../../../core/network/backend_api_client.dart';
import '../domain/ai_conversation.dart';
import 'ai_wire_transport.dart';

/// An explicitly composed transport; the caller owns the shared HTTP client.
/// Tokens/operation keys are supplied by the existing wire repository, never
/// stored or logged here. The feature's default repository remains unavailable.
final class HttpAiWireTransport implements AiWireTransport {
  HttpAiWireTransport({required Uri baseUri, required http.Client client})
    : this._(baseUri, client, isolatedLoopback: false);

  /// Only for an explicitly selected synthetic Backend on this host.
  /// No remote clear-text endpoint or Android host alias is inferred.
  HttpAiWireTransport.isolatedLoopback({
    required Uri baseUri,
    required http.Client client,
  }) : this._(baseUri, client, isolatedLoopback: true);

  HttpAiWireTransport._(
    this._baseUri,
    this._client, {
    required bool isolatedLoopback,
  }) {
    final loopback =
        isolatedLoopback &&
        _baseUri.scheme == 'http' &&
        const {'127.0.0.1', '::1'}.contains(_baseUri.host) &&
        _baseUri.userInfo.isEmpty;
    if ((!isApprovedBackendBaseUri(_baseUri) && !loopback) ||
        !const {'', '/'}.contains(_baseUri.path) ||
        _baseUri.hasQuery ||
        _baseUri.hasFragment) {
      throw ArgumentError('The AI Backend address is not permitted.');
    }
  }

  final Uri _baseUri;
  final http.Client _client;

  @override
  Future<AiWireResponse> send(AiWireRequest request) {
    if (request.abort.isAborted) {
      return Future.error(const _Aborted());
    }
    final relative = Uri.tryParse(request.path);
    if (relative == null ||
        !request.path.startsWith('/') ||
        relative.hasScheme ||
        relative.hasAuthority ||
        relative.hasFragment) {
      return Future.error(const FormatException('Invalid AI request path.'));
    }
    final url = _baseUri.resolveUri(relative);
    final outbound =
        http.AbortableRequest(
            request.method,
            url,
            abortTrigger: request.abort.whenAborted,
          )
          // Never forward credentials or operation keys through a redirect.
          ..followRedirects = false
          ..headers.addAll(request.headers);
    if (request.body case final body?) outbound.bodyBytes = utf8.encode(body);
    return Future.any([
      _dispatch(outbound, request.abort),
      request.abort.whenAborted.then<AiWireResponse>(
        (_) => throw const _Aborted(),
      ),
    ]);
  }

  Future<AiWireResponse> _dispatch(
    http.AbortableRequest request,
    AiAbortSignal abort,
  ) async {
    final response = await _client.send(request);
    // A late response from a client ignoring Abortable must still be detached.
    if (abort.isAborted) {
      await response.stream.listen(null).cancel();
      throw const _Aborted();
    }
    final completion = Completer<AiWireResponse>();
    final bytes = BytesBuilder(copy: false);
    late StreamSubscription<List<int>> subscription;
    subscription = response.stream.listen(
      (chunk) {
        if (!abort.isAborted) bytes.add(chunk);
      },
      onError: (Object error, StackTrace stack) {
        if (!completion.isCompleted) completion.completeError(error, stack);
      },
      onDone: () {
        if (completion.isCompleted) return;
        if (abort.isAborted) {
          completion.completeError(const _Aborted());
          return;
        }
        try {
          completion.complete(
            AiWireResponse(
              statusCode: response.statusCode,
              body: utf8.decode(bytes.takeBytes()),
            ),
          );
        } catch (error, stack) {
          completion.completeError(error, stack);
        }
      },
      cancelOnError: true,
    );
    unawaited(
      abort.whenAborted.then((_) {
        if (!completion.isCompleted) {
          completion.completeError(const _Aborted());
          bytes.clear();
          unawaited(subscription.cancel());
        }
      }),
    );
    return completion.future;
  }
}

final class _Aborted implements Exception {
  const _Aborted();
}
