import '../../../core/network/backend_api_client.dart';
import '../../../core/network/utc_timestamp_parser.dart';
import '../../../core/result/result.dart';
import '../domain/participation_repository.dart';

bool validParticipationEventId(Object? value) =>
    value is String &&
    RegExp(r'^[A-Za-z0-9_-]{1,128}$').hasMatch(value) &&
    !RegExp(r'[^A-Za-z0-9_-]').hasMatch(value) &&
    (!value.startsWith('tm_') ||
        RegExp(r'^tm_event_[0-9a-f]{64}$').hasMatch(value));
bool _keys(
  Map<String, Object?> m,
  List<String> required,
  List<String> optional,
) =>
    required.every(m.containsKey) &&
    m.keys.every((k) => required.contains(k) || optional.contains(k));
bool _revision(Object? v) => v is int && v >= 0 && v <= 9007199254740991;
bool _username(Object? value) {
  if (value is! String) return false;
  final match = RegExp(r'^[a-z0-9](?!.*__)[a-z0-9_]{1,28}[a-z0-9]$')
      .firstMatch(value);
  return match != null &&
      match.end == value.length &&
      !value.startsWith('enmori_') &&
      !const {
        'admin',
        'administrator',
        'support',
        'system',
        'moderator',
        'root',
        'enmori',
      }.contains(value);
}

String? _cursor(Object? v) =>
    v is String &&
        v.isNotEmpty &&
        v.length <= 512 &&
        !RegExp(r'[^A-Za-z0-9_-]').hasMatch(v) &&
        RegExp(r'^[A-Za-z0-9_-]+$').hasMatch(v)
    ? v
    : null;
const _invalid = AppFailure(
  kind: AppFailureKind.unexpected,
  message: 'The service returned invalid participation data.',
);
EventParticipation? parseParticipation(Object? raw) {
  if (raw is! Map<String, Object?> ||
      !_keys(
        raw,
        ['eventId', 'status', 'ignored', 'revision'],
        ['updatedAt'],
      ) ||
      !validParticipationEventId(raw['eventId']) ||
      raw['ignored'] is! bool ||
      !_revision(raw['revision'])) {
    return null;
  }
  final status = ParticipationStatus.values
      .where((s) => s.name == raw['status'])
      .firstOrNull;
  if (status == null) return null;
  DateTime? time;
  if (raw.containsKey('updatedAt')) {
    time = tryParseUtcTimestamp(raw['updatedAt']);
    final original = raw['updatedAt'];
    if (time == null ||
        original is! String ||
        !RegExp(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$')
            .hasMatch(original) ||
        time.toUtc().toIso8601String().substring(0, 19) !=
            original.substring(0, 19)) {
      return null;
    }
  }
  if ((raw['revision'] == 0 &&
          (time != null ||
              status != ParticipationStatus.none ||
              raw['ignored'] != false)) ||
      (raw['revision'] != 0 && time == null)) {
    return null;
  }
  return EventParticipation(
    eventId: raw['eventId'] as String,
    status: status,
    ignored: raw['ignored'] as bool,
    revision: raw['revision'] as int,
    updatedAt: time,
  );
}

final class BackendParticipationRepository implements ParticipationRepository {
  const BackendParticipationRepository(this.client);
  final BackendApiClient client;
  @override
  Future<Result<PublicParticipationPage>> forUsername(
    String username,
    String? cursor,
    bool Function() current,
  ) async {
    if (!_username(username) || cursor != null && _cursor(cursor) == null) {
      return const Failure(_invalid);
    }
    final path =
        '/v1/users/${Uri.encodeComponent(username)}/event-participations${cursor == null ? '' : '?cursor=${Uri.encodeQueryComponent(cursor)}'}';
    final result = await client.getGuarded(path, current);
    if (result case Failure<JsonObject>(:final failure)) {
      return Failure(failure);
    }
    final body = (result as Success<JsonObject>).value;
    if (!_keys(body, ['items'], ['nextCursor']) ||
        body['items'] is! List ||
        (body['items'] as List).length > 20 ||
        body.containsKey('nextCursor') && _cursor(body['nextCursor']) == null) {
      return const Failure(_invalid);
    }
    final rows = <PublicParticipation>[];
    final seen = <String>{};
    for (final row in body['items'] as List) {
      if (row is! Map<String, Object?> ||
          !_keys(row, ['eventId', 'status'], []) ||
          !validParticipationEventId(row['eventId']) ||
          !seen.add(row['eventId'] as String)) {
        return const Failure(_invalid);
      }
      final status = ParticipationStatus.values
          .where(
            (s) => s != ParticipationStatus.none && s.name == row['status'],
          )
          .firstOrNull;
      if (status == null) return const Failure(_invalid);
      rows.add(PublicParticipation(row['eventId'] as String, status));
    }
    return Success(
      PublicParticipationPage(rows, body['nextCursor'] as String?),
    );
  }

  String _path(String id) =>
      '/v1/events/${Uri.encodeComponent(id)}/participation';
  Result<EventParticipation> _own(Result<JsonObject> result, String id) {
    if (result case Failure<JsonObject>(:final failure)) {
      return Failure(failure);
    }
    final body = (result as Success<JsonObject>).value;
    final value = body.length == 1
        ? parseParticipation(body['participation'])
        : null;
    return value != null && value.eventId == id
        ? Success(value)
        : const Failure(_invalid);
  }

  @override
  Future<Result<EventParticipation>> read(
    String id,
    bool Function() current,
  ) async => validParticipationEventId(id)
      ? _own(await client.getGuarded(_path(id), current), id)
      : const Failure(_invalid);
  @override
  Future<Result<EventParticipation>> save(
    EventParticipation previous,
    ParticipationStatus status,
    bool ignored,
    bool Function() current,
  ) async => validParticipationEventId(previous.eventId)
      ? _own(
          await client.putGuarded(_path(previous.eventId), {
            'status': status.name,
            'ignored': ignored,
            'expectedRevision': previous.revision,
          }, current),
          previous.eventId,
        )
      : const Failure(_invalid);
  @override
  Future<Result<EventParticipantPage>> participants(
    String id,
    ParticipationStatus status,
    ParticipantGroup group,
    String? cursor,
    bool Function() current,
  ) async {
    if (!validParticipationEventId(id) ||
        status == ParticipationStatus.none ||
        cursor != null && _cursor(cursor) == null) {
      return const Failure(_invalid);
    }
    final query = Uri(
      queryParameters: {
        'status': status.name,
        'group': group.name,
        'cursor': ?cursor,
      },
    ).query;
    final result = await client.getGuarded(
      '/v1/events/${Uri.encodeComponent(id)}/participants?$query',
      current,
    );
    if (result case Failure<JsonObject>(:final failure)) {
      return Failure(failure);
    }
    final body = (result as Success<JsonObject>).value;
    if (!_keys(body, ['items', 'countState'], ['visibleCount', 'nextCursor']) ||
        body['items'] is! List ||
        (body['items'] as List).length > 20 ||
        body.containsKey('nextCursor') && _cursor(body['nextCursor']) == null) {
      return const Failure(_invalid);
    }
    final exact = body['countState'] == 'exact';
    if ((!exact && body['countState'] != 'unavailable') ||
        (exact
            ? !_revision(body['visibleCount']) ||
                  (body['visibleCount'] as int) > 200
            : body.containsKey('visibleCount'))) {
      return const Failure(_invalid);
    }
    final items = <EventParticipant>[];
    final seen = <String>{};
    for (final row in body['items'] as List) {
      if (row is! Map<String, Object?> ||
          !_keys(row, ['username'], ['displayName']) ||
          !_username(row['username']) ||
          !seen.add(row['username'] as String)) {
        return const Failure(_invalid);
      }
      final name = row['displayName'];
      if (row.containsKey('displayName') &&
          (name is! String ||
              name.isEmpty ||
              name.trim() != name ||
              name.runes.length > 50 ||
              name.runes.any((r) => r >= 0xd800 && r <= 0xdfff) ||
              RegExp(
                r'[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]',
                unicode: true,
              ).hasMatch(name))) {
        return const Failure(_invalid);
      }
      items.add(EventParticipant(row['username'] as String, name as String?));
    }
    if (exact && (body['visibleCount'] as int) < items.length) {
      return const Failure(_invalid);
    }
    return Success(
      EventParticipantPage(
        items: items,
        nextCursor: body['nextCursor'] as String?,
        visibleCount: exact ? body['visibleCount'] as int : null,
      ),
    );
  }

  @override
  Future<Result<EventParticipationPage>> own(
    String? cursor,
    bool Function() current,
  ) async {
    if (cursor != null && _cursor(cursor) == null) {
      return const Failure(_invalid);
    }
    final result = await client.getGuarded(
      '/v1/me/event-participations${cursor == null ? '' : '?cursor=${Uri.encodeQueryComponent(cursor)}'}',
      current,
    );
    if (result case Failure<JsonObject>(:final failure)) {
      return Failure(failure);
    }
    final body = (result as Success<JsonObject>).value;
    if (!_keys(body, ['items'], ['nextCursor']) ||
        body['items'] is! List ||
        (body['items'] as List).length > 20 ||
        body.containsKey('nextCursor') && _cursor(body['nextCursor']) == null) {
      return const Failure(_invalid);
    }
    final rows = <EventParticipation>[];
    final seen = <String>{};
    for (final row in body['items'] as List) {
      final p = parseParticipation(row);
      if (p == null || !seen.add(p.eventId)) return const Failure(_invalid);
      rows.add(p);
    }
    return Success(EventParticipationPage(rows, body['nextCursor'] as String?));
  }
}
