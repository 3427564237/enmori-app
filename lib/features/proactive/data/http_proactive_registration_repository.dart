import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;

import '../../../core/network/backend_api_client.dart';
import '../../../core/result/result.dart';
import '../domain/proactive.dart';
import '../domain/proactive_messaging.dart';

/// One request per command, no redirect/retry/refresh. The client is caller-owned.
final class HttpProactiveRegistrationRepository
    implements ProactiveRegistrationRepository {
  HttpProactiveRegistrationRepository({
    required Uri baseUri,
    required http.Client client,
  }) : this._(baseUri, client);
  HttpProactiveRegistrationRepository._(this._base, this._client) {
    if (!isApprovedBackendBaseUri(_base) ||
        !const {'', '/'}.contains(_base.path) ||
        _base.hasQuery ||
        _base.hasFragment) {
      throw ArgumentError('The notification Backend address is not permitted.');
    }
  }
  final Uri _base;
  final http.Client _client;
  @override
  Future<Result<ProactiveRegistration>> read({
    required String token,
    required ProactiveAbortSignal abort,
  }) => _call(token, abort, 'GET');
  @override
  Future<Result<ProactiveRegistration>> replace({
    required String token,
    required ProactiveAbortSignal abort,
    required int expectedRevision,
    required String installationRef,
    required String registrationValue,
  }) {
    if (!_revision(expectedRevision) ||
        expectedRevision == _max ||
        !isProactiveUuid(installationRef) ||
        !isProactiveWellFormed(registrationValue) ||
        registrationValue.trim().isEmpty ||
        utf8.encode(registrationValue).length > 4096 ||
        RegExp(r'[\x00-\x1f\x7f]').hasMatch(registrationValue)) {
      return _invalid();
    }
    return _call(
      token,
      abort,
      'PUT',
      body: {
        'expectedRevision': expectedRevision,
        'installationRef': installationRef,
        'registrationKind': 'fcm_token',
        'registrationValue': registrationValue,
        'enabled': true,
      },
      verify: (v) =>
          v.enabled &&
          v.installationRef == installationRef &&
          v.revision == expectedRevision + 1,
    );
  }

  @override
  Future<Result<ProactiveRegistration>> delete({
    required String token,
    required ProactiveAbortSignal abort,
    required int expectedRevision,
    required String installationRef,
  }) {
    if (!_revision(expectedRevision) || !isProactiveUuid(installationRef)) {
      return _invalid();
    }
    return _call(
      token,
      abort,
      'DELETE',
      body: {
        'expectedRevision': expectedRevision,
        'installationRef': installationRef,
      },
      verify: (v) =>
          !v.enabled &&
          v.availability == ProactiveRegistrationAvailability.unregistered &&
          (v.revision == expectedRevision ||
              v.revision == expectedRevision + 1),
    );
  }

  Future<Result<ProactiveRegistration>> _call(
    String token,
    ProactiveAbortSignal abort,
    String method, {
    Map<String, Object?>? body,
    bool Function(ProactiveRegistration)? verify,
  }) async {
    final mutation = method != 'GET';
    if (abort.isAborted) return const Failure(_unavailable);
    if (token.isEmpty ||
        !isProactiveWellFormed(token) ||
        RegExp(r'[\s\x00-\x1f\x7f]').hasMatch(token)) {
      return const Failure(_auth);
    }
    final request =
        http.AbortableRequest(
            method,
            _base.resolve('/v1/me/proactive-registration'),
            abortTrigger: abort.whenAborted,
          )
          ..followRedirects = false
          ..headers.addAll({
            'Authorization': 'Bearer $token',
            'Accept': 'application/json',
            'Cache-Control': 'no-store',
            if (body != null) 'Content-Type': 'application/json',
          });
    if (body != null) request.bodyBytes = utf8.encode(jsonEncode(body));
    try {
      final response = await Future.any<({int status, String body})?>([
        _receive(request, abort),
        abort.whenAborted.then((_) => null),
      ]);
      if (response == null || abort.isAborted) {
        return Failure(mutation ? _unknown : _unavailable);
      }
      if (response.status != 200) {
        return Failure(_error(response.status, response.body));
      }
      final value = _registration(jsonDecode(response.body));
      if (verify != null && !verify(value)) throw const FormatException();
      return Success(value);
    } catch (_) {
      return Failure(mutation ? _unknown : _unavailable);
    }
  }

  Future<({int status, String body})> _receive(
    http.BaseRequest request,
    ProactiveAbortSignal abort,
  ) async {
    final response = await _client.send(request);
    if (abort.isAborted) {
      await response.stream.listen(null).cancel();
      throw const FormatException();
    }
    final bytes = BytesBuilder(copy: false),
        result = Completer<({int status, String body})>();
    late StreamSubscription<List<int>> subscription;
    subscription = response.stream.listen(
      (chunk) {
        if (result.isCompleted || abort.isAborted) return;
        if (bytes.length + chunk.length > 8192) {
          result.completeError(const FormatException());
          bytes.clear();
          unawaited(subscription.cancel());
        } else {
          bytes.add(chunk);
        }
      },
      onDone: () {
        if (result.isCompleted) return;
        try {
          if (abort.isAborted) throw const FormatException();
          result.complete((
            status: response.statusCode,
            body: utf8.decode(bytes.takeBytes()),
          ));
        } catch (_) {
          result.completeError(const FormatException());
        }
      },
      onError: (Object _, StackTrace _) {
        if (!result.isCompleted) result.completeError(const FormatException());
      },
      cancelOnError: true,
    );
    unawaited(
      abort.whenAborted.then((_) {
        if (result.isCompleted) return;
        result.completeError(const FormatException());
        bytes.clear();
        unawaited(subscription.cancel());
      }),
    );
    return result.future;
  }
}

const _max = 9007199254740991;
bool _revision(Object? value) => value is int && value >= 0 && value <= _max;
Future<Result<ProactiveRegistration>> _invalid() async => const Failure(
  AppFailure(
    kind: AppFailureKind.proactiveInputInvalid,
    message: 'Check notification registration options.',
  ),
);
Map<String, dynamic> _object(
  Object? value,
  Set<String> required, [
  Set<String> optional = const {},
]) {
  if (value is! Map<String, dynamic> ||
      !required.every(value.containsKey) ||
      value.keys.any(
        (key) => !required.contains(key) && !optional.contains(key),
      )) {
    throw const FormatException();
  }
  return value;
}

ProactiveRegistration _registration(Object? raw) {
  final value = _object(
    raw,
    {'revision', 'enabled', 'availability'},
    {'installationRef', 'expiresAt'},
  );
  if (!_revision(value['revision']) || value['enabled'] is! bool) {
    throw const FormatException();
  }
  final availability = ProactiveRegistrationAvailability.values
      .where((v) => v.name == value['availability'])
      .single;
  final installation = value['installationRef'];
  final instant = value['expiresAt'];
  DateTime? expiry;
  if (instant != null) {
    if (instant is! String ||
        !RegExp(r'^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$')
            .hasMatch(instant)) {
      throw const FormatException();
    }
    expiry = DateTime.tryParse(instant);
    if (expiry == null || expiry.toUtc().toIso8601String() != instant) {
      throw const FormatException();
    }
  }
  if (availability == ProactiveRegistrationAvailability.unregistered) {
    if (value['enabled'] != false || installation != null || expiry != null) {
      throw const FormatException();
    }
  } else if (installation is! String ||
      !isProactiveUuid(installation) ||
      expiry == null ||
      value['revision'] == 0 ||
      value['enabled'] !=
          (availability == ProactiveRegistrationAvailability.registered)) {
    throw const FormatException();
  }
  return ProactiveRegistration(
    revision: value['revision'] as int,
    enabled: value['enabled'] as bool,
    availability: availability,
    installationRef: installation as String?,
    expiresAt: expiry,
  );
}

AppFailure _error(int status, String raw) {
  try {
    final envelope = _object(jsonDecode(raw), {'error', 'requestId'}),
        error = _object(envelope['error'], {'code', 'message'});
    if (envelope['requestId'] is! String ||
        (envelope['requestId'] as String).isEmpty ||
        error['message'] is! String) {
      return _unavailable;
    }
    final kind = switch ((status, error['code'])) {
      (401, 'AUTH_REQUIRED') => AppFailureKind.authRequired,
      (403, 'AUTH_FORBIDDEN') => AppFailureKind.authForbidden,
      (409, 'AI_AUTHORITY_CHANGED') => AppFailureKind.aiAuthorityChanged,
      (409, 'AI_OPERATION_CONFLICT') => AppFailureKind.aiOperationConflict,
      (404, 'AI_SOURCE_UNAVAILABLE') => AppFailureKind.aiSourceUnavailable,
      (412, 'PROACTIVE_REVISION_PRECONDITION_FAILED') =>
        AppFailureKind.proactiveRevisionPreconditionFailed,
      (422, 'PROACTIVE_INPUT_INVALID') => AppFailureKind.proactiveInputInvalid,
      (400, 'REQUEST_INVALID') => AppFailureKind.requestInvalid,
      (413, 'REQUEST_TOO_LARGE') => AppFailureKind.requestTooLarge,
      (503, 'AI_OUTCOME_UNRESOLVED') => AppFailureKind.aiOutcomeUnresolved,
      _ => AppFailureKind.serviceUnavailable,
    };
    return AppFailure(
      kind: kind,
      message:
          'Notification state could not be confirmed. Read its current status.',
      requestId: envelope['requestId'] as String,
    );
  } catch (_) {
    return _unavailable;
  }
}

const _auth = AppFailure(
  kind: AppFailureKind.authRequired,
  message: 'Sign in again.',
);
const _unavailable = AppFailure(
  kind: AppFailureKind.serviceUnavailable,
  message: 'Notification state could not be verified. Check again.',
);
const _unknown = AppFailure(
  kind: AppFailureKind.aiOutcomeUnresolved,
  message: 'The notification change is unconfirmed. Check its current status before continuing.',
);
