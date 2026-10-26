import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;

import '../../../core/network/backend_api_client.dart';
import '../../../core/result/result.dart';
import '../domain/proactive.dart';
import '../domain/proactive_repository.dart';

/// Explicit composition only. One caller-owned client, one HTTP attempt per
/// command, strict complete response, no redirects, retry or token retention.
final class HttpProactiveRepository implements ProactiveRepository {
  HttpProactiveRepository({required Uri baseUri, required http.Client client})
    : this._(baseUri, client);

  HttpProactiveRepository._(this._base, this._client) {
    if (!isApprovedBackendBaseUri(_base) ||
        !const {'', '/'}.contains(_base.path) ||
        _base.hasQuery ||
        _base.hasFragment) {
      throw ArgumentError('The proactive Backend address is not permitted.');
    }
  }

  final Uri _base;
  final http.Client _client;

  @override
  Future<Result<ProactiveSettings>> readSettings({
    required String token,
    required ProactiveAbortSignal abort,
  }) => _call(token, abort, 'GET', '/v1/me/proactive-settings', _settings);

  @override
  Future<Result<ProactiveSettings>> saveSettings({
    required String token,
    required ProactiveAbortSignal abort,
    required ProactiveSettings settings,
    required int expectedRevision,
  }) {
    if (!_revision(expectedRevision) || !_settingsInput(settings)) {
      return _invalid();
    }
    return _call(
      token,
      abort,
      'PUT',
      '/v1/me/proactive-settings',
      _settings,
      body: {
        'expectedRevision': expectedRevision,
        'mode': settings.mode.name,
        'categories': settings.categories,
        'timeZone': settings.timeZone,
        'quiet': switch (settings.quiet) {
          ProactiveQuietWindow(:final startMinute, :final endMinute) => {
            'kind': 'window',
            'startMinute': startMinute,
            'endMinute': endMinute,
          },
          ProactiveQuietDisabled() => {'kind': 'disabled'},
        },
        'maximumInRolling24h': 1,
        'cooldownMinutes': 480,
        'pushEnabled': settings.pushEnabled,
        'preview': settings.preview.name,
        if (settings.pausedUntil != null)
          'pausedUntil': settings.pausedUntil!.toUtc().toIso8601String(),
      },
    );
  }

  @override
  Future<Result<List<FollowUpIntent>>> readActiveIntents({
    required String token,
    required ProactiveAbortSignal abort,
  }) => _call(token, abort, 'GET', '/v1/me/proactive-intents', (raw) {
    final dto = _object(raw, {'intents'});
    final rows = dto['intents'];
    _require(rows is List && rows.length <= 3);
    final values = (rows as List).map(_intent).toList();
    _require(values.map((v) => v.intentId).toSet().length == values.length);
    return List.unmodifiable(values);
  });

  @override
  Future<Result<FollowUpIntent>> createIntent({
    required String token,
    required ProactiveAbortSignal abort,
    required CreateFollowUp command,
  }) {
    if (!_uuid(command.intentId) ||
        !_uuid(command.conversationId) ||
        !_uuid(command.sourceMessageId) ||
        !_revision(command.expectedSettingsRevision) ||
        !_zone(command.time.timeZone) ||
        !command.time.dueAt.isUtc ||
        command.time.dueAt.microsecond != 0) {
      return _invalid();
    }
    return _call(
      token,
      abort,
      'POST',
      '/v1/me/proactive-intents',
      (raw) {
        final value = _intent(raw);
        _require(
          value.intentId == command.intentId &&
              value.conversationId == command.conversationId &&
              value.dueAt == command.time.dueAt,
        );
        return value;
      },
      body: {
        'conversationId': command.conversationId,
        'sourceMessageId': command.sourceMessageId,
        'category': 'explicit_follow_up',
        'dueAt': command.time.dueAt.toIso8601String(),
        'timeZone': command.time.timeZone,
        'processing': 'local',
        'expectedSettingsRevision': command.expectedSettingsRevision,
      },
      idempotencyKey: command.intentId,
    );
  }

  @override
  Future<Result<FollowUpIntent>> readIntent({
    required String token,
    required ProactiveAbortSignal abort,
    required String intentId,
  }) {
    if (!_uuid(intentId)) return _invalid();
    return _call(token, abort, 'GET', '/v1/me/proactive-intents/$intentId', (
      raw,
    ) {
      final value = _intent(raw);
      _require(value.intentId == intentId);
      return value;
    });
  }

  @override
  Future<Result<FollowUpIntent>> cancelIntent({
    required String token,
    required ProactiveAbortSignal abort,
    required String intentId,
    required int expectedRevision,
  }) {
    if (!_uuid(intentId) || !_revision(expectedRevision)) return _invalid();
    return _call(token, abort, 'DELETE', '/v1/me/proactive-intents/$intentId', (
      raw,
    ) {
      final value = _intent(raw);
      _require(value.intentId == intentId);
      return value;
    }, body: {'expectedRevision': expectedRevision});
  }

  Future<Result<T>> _call<T>(
    String token,
    ProactiveAbortSignal abort,
    String method,
    String path,
    T Function(Object?) parse, {
    Map<String, Object?>? body,
    String? idempotencyKey,
  }) async {
    final mutation = method != 'GET';
    if (abort.isAborted) return const Failure(_unresolved);
    if (token.isEmpty || RegExp(r'[\s\x00-\x1f\x7f]').hasMatch(token)) {
      return const Failure(_auth);
    }
    final request =
        http.AbortableRequest(
            method,
            _base.resolve(path),
            abortTrigger: abort.whenAborted,
          )
          ..followRedirects = false
          ..headers.addAll({
            'Authorization': 'Bearer $token',
            'Accept': 'application/json',
            'Cache-Control': 'no-store',
            if (body != null) 'Content-Type': 'application/json',
            'Idempotency-Key': ?idempotencyKey,
          });
    if (body != null) request.bodyBytes = utf8.encode(jsonEncode(body));
    try {
      final result = await Future.any<({int status, String body})?>([
        _dispatch(request, abort),
        abort.whenAborted.then((_) => null),
      ]);
      if (result == null || abort.isAborted) return const Failure(_unresolved);
      if (result.status == (method == 'POST' ? 201 : 200)) {
        return Success(parse(jsonDecode(result.body)));
      }
      return Failure(_error(result.status, result.body));
    } on FormatException {
      return Failure(mutation ? _unresolved : _invalidResponse);
    } catch (_) {
      return Failure(mutation ? _unresolved : _unavailable);
    }
  }

  Future<({int status, String body})> _dispatch(
    http.AbortableRequest request,
    ProactiveAbortSignal abort,
  ) async {
    final response = await _client.send(request);
    if (abort.isAborted) {
      await response.stream.listen(null).cancel();
      throw const FormatException();
    }
    final bytes = BytesBuilder(copy: false);
    final done = Completer<({int status, String body})>();
    late StreamSubscription<List<int>> subscription;
    subscription = response.stream.listen(
      (chunk) {
        if (abort.isAborted || done.isCompleted) return;
        if (bytes.length + chunk.length > 64 * 1024) {
          done.completeError(const FormatException());
          bytes.clear();
          unawaited(subscription.cancel());
          return;
        }
        bytes.add(chunk);
      },
      onDone: () {
        if (done.isCompleted) return;
        if (abort.isAborted) {
          done.completeError(const FormatException());
          return;
        }
        try {
          done.complete((
            status: response.statusCode,
            body: utf8.decode(bytes.takeBytes()),
          ));
        } catch (error, stack) {
          done.completeError(error, stack);
        }
      },
      onError: (Object error, StackTrace stack) {
        if (!done.isCompleted) done.completeError(error, stack);
      },
      cancelOnError: true,
    );
    unawaited(
      abort.whenAborted.then((_) {
        if (done.isCompleted) return;
        done.completeError(const FormatException());
        bytes.clear();
        unawaited(subscription.cancel());
      }),
    );
    return done.future;
  }
}

const _maxInteger = 9007199254740991;
bool _revision(Object? value) =>
    value is int && value >= 0 && value <= _maxInteger;
bool _uuid(Object? value) =>
    value is String &&
    RegExp(
      r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
    ).hasMatch(value);
bool _zone(Object? value) =>
    value is String &&
    value.isNotEmpty &&
    value.length <= 128 &&
    !RegExp(r'[\s\x00-\x1f\x7f]').hasMatch(value);
void _require(bool value) {
  if (!value) throw const FormatException();
}

Map<String, dynamic> _object(
  Object? value,
  Set<String> required, [
  Set<String> optional = const {},
]) {
  _require(value is Map<String, dynamic>);
  final map = value as Map<String, dynamic>;
  _require(
    required.every(map.containsKey) &&
        map.keys.every((k) => required.contains(k) || optional.contains(k)),
  );
  return map;
}

DateTime _utc(Object? value) {
  _require(
    value is String &&
        RegExp(r'^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$').hasMatch(value),
  );
  final parsed = DateTime.tryParse(value as String);
  _require(parsed != null && parsed.isUtc);
  final canonical = parsed!.toIso8601String();
  _require(canonical == value);
  return parsed;
}

ProactiveSettings _settings(Object? raw) {
  final d = _object(
    raw,
    {
      'revision',
      'mode',
      'categories',
      'timeZone',
      'quiet',
      'maximumInRolling24h',
      'cooldownMinutes',
      'pushEnabled',
      'preview',
    },
    {'pausedUntil'},
  );
  _require(_revision(d['revision']));
  final mode = ProactiveMode.values.where((v) => v.name == d['mode']).single;
  _require(
    d['categories'] is List &&
        (d['categories'] as List).every((v) => v == 'explicit_follow_up'),
  );
  final categories = (d['categories'] as List).cast<String>();
  _require(categories.toSet().length == categories.length);
  _require(
    d['maximumInRolling24h'] == 1 &&
        d['cooldownMinutes'] == 480 &&
        d['pushEnabled'] is bool,
  );
  _require(
    (mode == ProactiveMode.off &&
            d['revision'] == 0 &&
            categories.isEmpty &&
            d['pushEnabled'] == false &&
            d['timeZone'] == '') ||
        _zone(d['timeZone']),
  );
  final quietDto = _object(d['quiet'], {'kind'}, {'startMinute', 'endMinute'});
  final ProactiveQuiet quiet;
  if (quietDto['kind'] == 'disabled') {
    _require(quietDto.length == 1);
    quiet = const ProactiveQuietDisabled();
  } else {
    _require(quietDto['kind'] == 'window' && quietDto.length == 3);
    final a = quietDto['startMinute'], b = quietDto['endMinute'];
    _require(
      a is int &&
          b is int &&
          a >= 0 &&
          a < 1440 &&
          b >= 0 &&
          b < 1440 &&
          a != b,
    );
    quiet = ProactiveQuietWindow(a as int, b as int);
  }
  _require(!d.containsKey('pausedUntil') || mode == ProactiveMode.paused);
  return ProactiveSettings(
    revision: d['revision'] as int,
    mode: mode,
    categories: categories,
    timeZone: d['timeZone'] as String,
    quiet: quiet,
    maximumInRolling24h: 1,
    cooldownMinutes: 480,
    pushEnabled: d['pushEnabled'] as bool,
    preview: ProactivePreview.values
        .where((v) => v.name == d['preview'])
        .single,
    pausedUntil: d.containsKey('pausedUntil') ? _utc(d['pausedUntil']) : null,
  );
}

bool _settingsInput(ProactiveSettings s) =>
    _revision(s.revision) &&
    _zone(s.timeZone) &&
    s.maximumInRolling24h == 1 &&
    s.cooldownMinutes == 480 &&
    s.categories.toSet().length == s.categories.length &&
    s.categories.every((v) => v == 'explicit_follow_up') &&
    (s.pausedUntil == null || s.mode == ProactiveMode.paused) &&
    switch (s.quiet) {
      ProactiveQuietDisabled() => true,
      ProactiveQuietWindow(:final startMinute, :final endMinute) =>
        startMinute >= 0 &&
            startMinute < 1440 &&
            endMinute >= 0 &&
            endMinute < 1440 &&
            startMinute != endMinute,
    };
FollowUpIntent _intent(Object? raw) {
  final d = _object(
    raw,
    {
      'intentId',
      'revision',
      'state',
      'conversationId',
      'category',
      'dueAt',
      'expiresAt',
    },
    {'recallPossible'},
  );
  _require(
    _uuid(d['intentId']) &&
        _uuid(d['conversationId']) &&
        _revision(d['revision']) &&
        d['category'] == 'explicit_follow_up',
  );
  final state = FollowUpIntentState.values
      .where((v) => v.name == d['state'])
      .single;
  final due = _utc(d['dueAt']), expires = _utc(d['expiresAt']);
  _require(
    expires.isAfter(due) && !expires.isAfter(due.add(const Duration(hours: 2))),
  );
  _require(!d.containsKey('recallPossible') || d['recallPossible'] == false);
  return FollowUpIntent(
    intentId: d['intentId'] as String,
    revision: d['revision'] as int,
    state: state,
    conversationId: d['conversationId'] as String,
    dueAt: due,
    expiresAt: expires,
    recallPossible: d['recallPossible'] as bool?,
  );
}

AppFailure _error(int status, String body) {
  try {
    final d = _object(jsonDecode(body), {'error', 'requestId'});
    final e = _object(d['error'], {'code', 'message'});
    _require(
      e['message'] is String &&
          d['requestId'] is String &&
          (d['requestId'] as String).isNotEmpty,
    );
    final kind = switch ((status, e['code'])) {
      (401, 'AUTH_REQUIRED') => AppFailureKind.authRequired,
      (403, 'AUTH_FORBIDDEN') => AppFailureKind.authForbidden,
      (404, 'AI_SOURCE_UNAVAILABLE') => AppFailureKind.aiSourceUnavailable,
      (409, 'AI_AUTHORITY_CHANGED') => AppFailureKind.aiAuthorityChanged,
      (409, 'AI_CONTEXT_SELECTION_CONFLICT') =>
        AppFailureKind.aiContextSelectionConflict,
      (409, 'IDEMPOTENCY_CONFLICT') => AppFailureKind.idempotencyConflict,
      (409, 'AI_OPERATION_CONFLICT') => AppFailureKind.aiOperationConflict,
      (429, 'AI_BUSY') => AppFailureKind.aiBusy,
      (400, 'IDEMPOTENCY_KEY_INVALID') => AppFailureKind.idempotencyKeyInvalid,
      (413, 'REQUEST_TOO_LARGE') => AppFailureKind.requestTooLarge,
      (412, 'PROACTIVE_REVISION_PRECONDITION_FAILED') =>
        AppFailureKind.proactiveRevisionPreconditionFailed,
      (400, 'REQUEST_INVALID') => AppFailureKind.requestInvalid,
      (422, 'PROACTIVE_INPUT_INVALID') => AppFailureKind.proactiveInputInvalid,
      (503, 'AI_OUTCOME_UNRESOLVED') => AppFailureKind.aiOutcomeUnresolved,
      (503, 'AI_UNAVAILABLE') ||
      (503, 'SERVICE_UNAVAILABLE') => AppFailureKind.serviceUnavailable,
      _ => AppFailureKind.aiOutcomeUnresolved,
    };
    return AppFailure(
      kind: kind,
      message: 'The follow-up could not be confirmed.',
      requestId: d['requestId'] as String,
    );
  } catch (_) {
    return _unresolved;
  }
}

Future<Result<T>> _invalid<T>() async => const Failure(_invalidInput);
const _invalidInput = AppFailure(
  kind: AppFailureKind.requestInvalid,
  message: 'Review the follow-up details.',
);
const _auth = AppFailure(
  kind: AppFailureKind.authRequired,
  message: 'Sign in again.',
);
const _unresolved = AppFailure(
  kind: AppFailureKind.aiOutcomeUnresolved,
  message: 'The result is not confirmed. Check the original request.',
);
const _unavailable = AppFailure(
  kind: AppFailureKind.serviceUnavailable,
  message: 'The follow-up could not be checked.',
);
const _invalidResponse = AppFailure(
  kind: AppFailureKind.unexpected,
  message: 'The follow-up response could not be verified.',
);
