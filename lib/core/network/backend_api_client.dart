import 'dart:convert';

import 'package:http/http.dart' as http;

import '../result/result.dart';

typedef AuthTokenProvider = Future<Result<String>> Function();
typedef JsonObject = Map<String, Object?>;

final class BackendApiClient {
  BackendApiClient(
    this._baseUri,
    this._authTokenProvider, {
    http.Client? httpClient,
  }) : _httpClient = httpClient ?? http.Client();

  final Uri? _baseUri;
  final AuthTokenProvider _authTokenProvider;
  final http.Client _httpClient;

  Future<Result<JsonObject>> get(String path) => _send('GET', path);

  Future<Result<JsonObject>> put(
    String path, {
    required JsonObject body,
    required String idempotencyKey,
  }) => _send('PUT', path, body: body, idempotencyKey: idempotencyKey);

  Future<Result<JsonObject>> post(
    String path, {
    required JsonObject body,
    required String idempotencyKey,
  }) => _send('POST', path, body: body, idempotencyKey: idempotencyKey);

  void close() => _httpClient.close();

  Future<Result<JsonObject>> _send(
    String method,
    String path, {
    JsonObject? body,
    String? idempotencyKey,
  }) async {
    final baseUri = _baseUri;
    if (baseUri == null) {
      return const Failure(
        AppFailure(
          kind: AppFailureKind.configurationUnavailable,
          message: 'The service is not configured.',
        ),
      );
    }

    final tokenResult = await _authTokenProvider();
    if (tokenResult case Failure<String>(:final failure)) {
      return Failure(failure);
    }
    final token = (tokenResult as Success<String>).value;

    final headers = <String, String>{
      'Authorization': 'Bearer $token',
      'Accept': 'application/json',
    };
    if (idempotencyKey != null) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    if (body != null) headers['Content-Type'] = 'application/json';

    try {
      final request = http.Request(method, baseUri.resolve(path))
        ..headers.addAll(headers);
      if (body != null) {
        request.body = jsonEncode(body);
      }
      final streamedResponse = await _httpClient.send(request);
      final response = await http.Response.fromStream(streamedResponse);
      final decoded = _decodeObject(response.body);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        if (decoded == null) {
          return const Failure(
            AppFailure(
              kind: AppFailureKind.unexpected,
              message: 'The service returned an invalid response.',
            ),
          );
        }
        return Success(decoded);
      }
      return Failure(_decodeFailure(decoded));
    } on http.ClientException {
      return const Failure(
        AppFailure(
          kind: AppFailureKind.serviceUnavailable,
          message: 'The service is unavailable. Try again.',
        ),
      );
    } on FormatException {
      return const Failure(
        AppFailure(
          kind: AppFailureKind.unexpected,
          message: 'The service returned an invalid response.',
        ),
      );
    }
  }

  JsonObject? _decodeObject(String body) {
    if (body.isEmpty) return null;
    final decoded = jsonDecode(body);
    if (decoded is! Map<String, dynamic>) return null;
    return decoded;
  }

  AppFailure _decodeFailure(JsonObject? body) {
    final error = body?['error'];
    if (error is! Map<String, dynamic>) {
      return const AppFailure(
        kind: AppFailureKind.serviceUnavailable,
        message: 'The service is unavailable. Try again.',
      );
    }

    final code = error['code'];
    final message = error['message'];
    final requestId = error['requestId'];
    if (code is! String || message is! String || requestId is! String) {
      return const AppFailure(
        kind: AppFailureKind.serviceUnavailable,
        message: 'The service is unavailable. Try again.',
      );
    }

    final kind = switch (code) {
      'AUTH_REQUIRED' => AppFailureKind.authRequired,
      'AUTH_FORBIDDEN' => AppFailureKind.authForbidden,
      'USERNAME_INVALID' => AppFailureKind.usernameInvalid,
      'USERNAME_UNAVAILABLE' => AppFailureKind.usernameUnavailable,
      'ONBOARDING_REQUIRED' => AppFailureKind.onboardingRequired,
      'ONBOARDING_CONFLICT' => AppFailureKind.onboardingConflict,
      'CHECKIN_INVALID' => AppFailureKind.checkInInvalid,
      'CHECKIN_UNAVAILABLE' => AppFailureKind.checkInUnavailable,
      'IDEMPOTENCY_CONFLICT' => AppFailureKind.idempotencyConflict,
      'SERVICE_UNAVAILABLE' => AppFailureKind.serviceUnavailable,
      _ => null,
    };
    if (kind == null) {
      return const AppFailure(
        kind: AppFailureKind.serviceUnavailable,
        message: 'The service is unavailable. Try again.',
      );
    }

    return AppFailure(kind: kind, message: message, requestId: requestId);
  }
}
