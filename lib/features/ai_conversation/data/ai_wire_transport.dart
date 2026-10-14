import '../domain/ai_conversation.dart';

final class AiWireRequest {
  AiWireRequest({
    required this.method,
    required this.path,
    required Map<String, String> headers,
    required this.abort,
    this.body,
  }) : headers = Map.unmodifiable(headers);

  final String method;
  final String path;
  final Map<String, String> headers;
  final String? body;
  final AiAbortSignal abort;
}

final class AiWireResponse {
  const AiWireResponse({required this.statusCode, required this.body});

  final int statusCode;
  final String body;
}

/// A response settles only after its complete body has arrived.
/// Implementations must observe [AiWireRequest.abort] throughout dispatch/body
/// reception, cancel that request only, and never close a shared client.
/// Explicit network composition is owned by the selected isolated app boundary.
abstract interface class AiWireTransport {
  Future<AiWireResponse> send(AiWireRequest request);
}
