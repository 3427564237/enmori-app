import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../result/result.dart';

typedef AuthTokenProvider = Future<Result<String>> Function();
typedef JsonObject = Map<String, Object?>;

const defaultBackendOperationTimeout = Duration(seconds: 15);

/// Reserved for the approved Persona-create late-completion path.
final class BackendPersonaCreateAttempt {
  BackendPersonaCreateAttempt._();

  final _foreground = Completer<Result<JsonObject>>();
  final _completion = Completer<Result<JsonObject>>();
  bool _dispatched = false;

  Future<Result<JsonObject>> get foreground => _foreground.future;
  Future<Result<JsonObject>> get completion => _completion.future;
  bool get dispatched => _dispatched;
}

Uri? parseApprovedBackendBaseUri(String configured) {
  if (configured.isEmpty) return null;
  final parsed = Uri.tryParse(configured);
  return isApprovedBackendBaseUri(parsed) ? parsed : null;
}

bool isApprovedBackendBaseUri(Uri? uri) {
  return uri != null &&
      uri.scheme.toLowerCase() == 'https' &&
      uri.host.isNotEmpty &&
      uri.userInfo.isEmpty;
}

final class BackendApiClient {
  BackendApiClient(
    this._baseUri,
    this._authTokenProvider, {
    http.Client? httpClient,
    Duration operationTimeout = defaultBackendOperationTimeout,
  }) : assert(operationTimeout > Duration.zero),
       _httpClient = httpClient ?? http.Client(),
       _operationTimeout = operationTimeout;

  final Uri? _baseUri;
  final AuthTokenProvider _authTokenProvider;
  final http.Client _httpClient;
  final Duration _operationTimeout;

  Future<Result<JsonObject>> deleteJson(
    String path, {
    required JsonObject body,
  }) => _send('DELETE', path, body: body);

  Future<Result<JsonObject>> get(String path, {bool Function()? isEligible}) =>
      _send('GET', path, isEligible: isEligible);

  Future<Result<JsonObject>> put(
    String path, {
    required JsonObject body,
    String? idempotencyKey,
    bool Function()? isEligible,
  }) => _send(
    'PUT',
    path,
    body: body,
    idempotencyKey: idempotencyKey,
    isEligible: isEligible,
  );

  Future<Result<JsonObject>> post(
    String path, {
    JsonObject? body,
    String? idempotencyKey,
  }) => _send('POST', path, body: body, idempotencyKey: idempotencyKey);

  Future<Result<JsonObject>> getPersona(
    String path, {
    bool Function()? isEligible,
  }) => _sendPersona('GET', path, isEligible: isEligible);

  Future<Result<JsonObject>> putPersona(
    String path, {
    required JsonObject body,
    bool Function()? isEligible,
  }) => _sendPersona('PUT', path, body: body, isEligible: isEligible);

  /// JSON-body DELETE, with an empty body accepted only at status 204.
  Future<Result<void>> deletePersona(
    String path, {
    required JsonObject body,
    bool Function()? isEligible,
  }) async {
    final result = await _sendPersona(
      'DELETE',
      path,
      body: body,
      isEligible: isEligible,
    );
    return switch (result) {
      Success<JsonObject>() => const Success<void>(null),
      Failure<JsonObject>(:final failure) => Failure<void>(failure),
    };
  }

  BackendPersonaCreateAttempt postPersonaCreate({
    required JsonObject body,
    required String idempotencyKey,
    required bool Function() isEligible,
  }) {
    final attempt = BackendPersonaCreateAttempt._();
    final elapsed = Stopwatch()..start();
    final timer = Timer(_operationTimeout, () {
      if (!attempt._foreground.isCompleted) {
        attempt._foreground.complete(const Failure(_unavailable));
      }
    });
    // This worker consumes all transport failures even if the caller/session
    // no longer observes the result. It never retries or closes the client.
    unawaited(() async {
      final result = await _completePersonaCreate(
        attempt,
        elapsed,
        body: body,
        idempotencyKey: idempotencyKey,
        isEligible: isEligible,
      );
      timer.cancel();
      if (!attempt._foreground.isCompleted) {
        attempt._foreground.complete(
          elapsed.elapsed >= _operationTimeout
              ? const Failure(_unavailable)
              : result,
        );
      }
      attempt._completion.complete(result);
      elapsed.stop();
    }());
    return attempt;
  }

  Future<Result<JsonObject>> _completePersonaCreate(
    BackendPersonaCreateAttempt attempt,
    Stopwatch elapsed, {
    required JsonObject body,
    required String idempotencyKey,
    required bool Function() isEligible,
  }) async {
    final baseUri = _baseUri;
    if (!isApprovedBackendBaseUri(baseUri)) {
      return const Failure(_configurationUnavailable);
    }
    try {
      if (!isEligible()) return const Failure(_unavailable);
      final tokenResult = await _withinBudget(_authTokenProvider(), elapsed);
      if (tokenResult case Failure<String>(:final failure)) {
        return Failure(failure);
      }
      final request = _personaRequest(
        'POST',
        baseUri!.resolve('/v1/me/personas'),
        (tokenResult as Success<String>).value,
        body: body,
        idempotencyKey: idempotencyKey,
      );
      if (elapsed.elapsed >= _operationTimeout || !isEligible()) {
        return const Failure(_unavailable);
      }
      // Mark before invoking send: a synchronous failure may be ambiguous.
      attempt._dispatched = true;
      final headers = await _httpClient.send(request);
      final response = await http.Response.fromStream(headers);
      return _decodePersonaResponse(response, 'POST');
    } on FormatException {
      return const Failure(_invalidResponse);
    } on Object {
      return const Failure(_unavailable);
    }
  }

  Future<Result<JsonObject>> _sendPersona(
    String method,
    String path, {
    JsonObject? body,
    bool Function()? isEligible,
  }) async {
    final baseUri = _baseUri;
    if (!isApprovedBackendBaseUri(baseUri)) {
      return const Failure(_configurationUnavailable);
    }
    final elapsed = Stopwatch()..start();
    try {
      if (isEligible != null && !isEligible()) {
        return const Failure(_unavailable);
      }
      final tokenResult = await _withinBudget(_authTokenProvider(), elapsed);
      if (tokenResult case Failure<String>(:final failure)) {
        return Failure(failure);
      }
      final request = _personaRequest(
        method,
        baseUri!.resolve(path),
        (tokenResult as Success<String>).value,
        body: body,
      );
      if (elapsed.elapsed >= _operationTimeout ||
          (isEligible != null && !isEligible())) {
        return const Failure(_unavailable);
      }
      final headers = await _withinBudget(_httpClient.send(request), elapsed);
      final response = await _withinBudget(
        http.Response.fromStream(headers),
        elapsed,
      );
      return _decodePersonaResponse(response, method);
    } on FormatException {
      return const Failure(_invalidResponse);
    } on Object {
      return const Failure(_unavailable);
    } finally {
      elapsed.stop();
    }
  }

  http.Request _personaRequest(
    String method,
    Uri uri,
    String token, {
    JsonObject? body,
    String? idempotencyKey,
  }) {
    final request = http.Request(method, uri)
      ..headers.addAll({
        'Authorization': 'Bearer $token',
        'Accept': 'application/json',
        if (body != null) 'Content-Type': 'application/json',
        'Idempotency-Key': ?idempotencyKey,
      });
    if (body != null) request.body = jsonEncode(body);
    return request;
  }

  Result<JsonObject> _decodePersonaResponse(
    http.Response response,
    String method,
  ) {
    final status = response.statusCode;
    // Decode strict UTF-8: replacement of malformed bytes cannot prove success.
    final body = utf8.decode(response.bodyBytes);
    if (status >= 200 && status < 300) {
      if (method == 'DELETE') {
        return status == 204 && body.isEmpty
            ? const Success(<String, Object?>{})
            : const Failure(_invalidResponse);
      }
      if (status != 200 && !(method == 'POST' && status == 201)) {
        return const Failure(_invalidResponse);
      }
      final decoded = _decodeObject(body);
      return decoded == null
          ? const Failure(_invalidResponse)
          : Success(decoded);
    }
    final decoded = _decodeObject(body);
    final error = decoded?['error'];
    if (decoded == null ||
        decoded.length != 1 ||
        error is! Map<String, dynamic> ||
        error.length != 3 ||
        error['code'] is! String ||
        error['message'] is! String ||
        error['requestId'] is! String ||
        (error['requestId'] as String).isEmpty) {
      return const Failure(_unavailable);
    }
    final code = error['code'] as String;
    final expectedStatus = switch (code) {
      'REQUEST_INVALID' || 'IDEMPOTENCY_KEY_INVALID' => 400,
      'AUTH_REQUIRED' => 401,
      'AUTH_FORBIDDEN' => 403,
      'PERSONA_UNAVAILABLE' => 404,
      'ONBOARDING_REQUIRED' ||
      'PERSONA_LIMIT_REACHED' ||
      'PERSONA_COMMAND_CONFLICT' => 409,
      'PERSONA_REVISION_PRECONDITION_FAILED' => 412,
      'PERSONA_INVALID' => 422,
      'SERVICE_UNAVAILABLE' => 503,
      _ => null,
    };
    if (expectedStatus != status) return const Failure(_unavailable);
    final failure = _decodeFailure(decoded);
    // Public Persona copy is fixed, never arbitrary remote content.
    final message = switch (failure.kind) {
      AppFailureKind.personaInvalid => 'Use a name of 1–50 characters, valid style options and valid versions.',
      AppFailureKind.personaUnavailable => 'This Persona is unavailable.',
      AppFailureKind.personaLimitReached =>
        'You can save up to 5 Personas. Delete one before creating another.',
      AppFailureKind.personaCommandConflict => 'This create request conflicts with an earlier operation. Reload before continuing.',
      AppFailureKind.personaRevisionPreconditionFailed =>
        'Your Personas changed. Reload them before trying again.',
      AppFailureKind.requestInvalid => 'Request parameters are invalid.',
      AppFailureKind.idempotencyKeyInvalid =>
        'Provide a valid request key and try again.',
      AppFailureKind.authRequired => 'Your session has expired. Sign in again.',
      AppFailureKind.authForbidden => 'This account cannot continue.',
      AppFailureKind.onboardingRequired =>
        'Finish setting up your ENMORI account.',
      AppFailureKind.serviceUnavailable =>
        'This service is temporarily unavailable. Try again.',
      _ => _unavailable.message,
    };
    return Failure(
      AppFailure(
        kind: failure.kind,
        message: message,
        requestId: failure.requestId,
      ),
    );
  }

  void close() => _httpClient.close();

  Future<Result<JsonObject>> _send(
    String method,
    String path, {
    JsonObject? body,
    String? idempotencyKey,
    bool Function()? isEligible,
  }) async {
    final baseUri = _baseUri;
    if (baseUri == null || !isApprovedBackendBaseUri(baseUri)) {
      return const Failure(
        AppFailure(
          kind: AppFailureKind.configurationUnavailable,
          message: 'The service is not configured.',
        ),
      );
    }

    final elapsed = Stopwatch()..start();
    try {
      if (isEligible != null && !isEligible()) {
        return const Failure(_unavailable);
      }
      final tokenResult = await _withinBudget(_authTokenProvider(), elapsed);
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

      final request = http.Request(method, baseUri.resolve(path))
        ..headers.addAll(headers);
      if (body != null) {
        request.body = jsonEncode(body);
      }
      if (isEligible != null && !isEligible()) {
        return const Failure(_unavailable);
      }
      if (elapsed.elapsed >= _operationTimeout) {
        throw TimeoutException('Backend operation timed out');
      }
      final streamedResponse = await _withinBudget(
        _httpClient.send(request),
        elapsed,
      );
      final response = await _withinBudget(
        http.Response.fromStream(streamedResponse),
        elapsed,
      );
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
    } on TimeoutException {
      return const Failure(
        AppFailure(
          kind: AppFailureKind.serviceUnavailable,
          message: 'The service is unavailable. Try again.',
        ),
      );
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
    } on Object {
      // Native TLS, token-channel and response-stream failures need not be
      // ClientException. Keep them inside the Result boundary so consumers
      // can leave their pending state without publishing transport details.
      return const Failure(_unavailable);
    }
  }

  Future<T> _withinBudget<T>(Future<T> work, Stopwatch elapsed) {
    final remaining = _operationTimeout - elapsed.elapsed;
    if (remaining <= Duration.zero) {
      return Future<T>.error(TimeoutException('Backend operation timed out'));
    }
    return work.timeout(remaining);
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
      'REQUEST_INVALID' => AppFailureKind.requestInvalid,
      'PERSONA_INVALID' => AppFailureKind.personaInvalid,
      'PERSONA_UNAVAILABLE' => AppFailureKind.personaUnavailable,
      'PERSONA_LIMIT_REACHED' => AppFailureKind.personaLimitReached,
      'PERSONA_COMMAND_CONFLICT' => AppFailureKind.personaCommandConflict,
      'PERSONA_REVISION_PRECONDITION_FAILED' =>
        AppFailureKind.personaRevisionPreconditionFailed,
      'ADD_FRIEND_TARGET_UNAVAILABLE' =>
        AppFailureKind.addFriendTargetUnavailable,
      'FRIEND_REQUEST_UNAVAILABLE' => AppFailureKind.friendRequestUnavailable,
      'FRIEND_REVISION_PRECONDITION_FAILED' =>
        AppFailureKind.friendRevisionPreconditionFailed,
      'FRIEND_IGNORE_PRECONDITION_FAILED' =>
        AppFailureKind.friendIgnorePreconditionFailed,
      'EVENT_UNAVAILABLE' => AppFailureKind.eventUnavailable,
      'PROFILE_INVALID' => AppFailureKind.profileInvalid,
      'PROFILE_REVISION_PRECONDITION_FAILED' =>
        AppFailureKind.profileRevisionPreconditionFailed,
      'SETTINGS_INVALID' => AppFailureKind.settingsInvalid,
      'SETTINGS_REVISION_PRECONDITION_FAILED' =>
        AppFailureKind.settingsRevisionPreconditionFailed,
      'AUTH_REQUIRED' => AppFailureKind.authRequired,
      'AUTH_FORBIDDEN' => AppFailureKind.authForbidden,
      'USERNAME_INVALID' => AppFailureKind.usernameInvalid,
      'USERNAME_UNAVAILABLE' => AppFailureKind.usernameUnavailable,
      'ONBOARDING_REQUIRED' => AppFailureKind.onboardingRequired,
      'ONBOARDING_CONFLICT' => AppFailureKind.onboardingConflict,
      'CHECKIN_REVISION_PRECONDITION_FAILED' =>
        AppFailureKind.checkInRevisionPreconditionFailed,
      'CHECKIN_INVALID' => AppFailureKind.checkInInvalid,
      'CHECKIN_UNAVAILABLE' => AppFailureKind.checkInUnavailable,
      'INTEREST_SELECTION_INVALID' => AppFailureKind.interestSelectionInvalid,
      'INTEREST_REVISION_PRECONDITION_FAILED' =>
        AppFailureKind.interestRevisionPreconditionFailed,
      'IDEMPOTENCY_KEY_INVALID' => AppFailureKind.idempotencyKeyInvalid,
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

const _unavailable = AppFailure(
  kind: AppFailureKind.serviceUnavailable,
  message: 'The service is unavailable. Try again.',
);
const _invalidResponse = AppFailure(
  kind: AppFailureKind.unexpected,
  message: 'The service returned an invalid response.',
);
const _configurationUnavailable = AppFailure(
  kind: AppFailureKind.configurationUnavailable,
  message: 'The service is not configured.',
);
