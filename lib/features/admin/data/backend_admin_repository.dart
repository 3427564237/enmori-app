import '../../../core/network/backend_api_client.dart';
import '../../../core/result/result.dart';
import '../domain/admin_repository.dart';

const _invalid = AppFailure(
  kind: AppFailureKind.unexpected,
  message: 'The service returned an invalid response.',
);
Map<String, Object?> _object(
  Object? value,
  List<String> required, [
  List<String> optional = const [],
]) {
  if (value is! Map<String, Object?> ||
      required.any((k) => !value.containsKey(k)) ||
      value.keys.any((k) => !required.contains(k) && !optional.contains(k))) {
    throw const FormatException();
  }
  return value;
}

String _text(Object? v, [int max = 256]) {
  if (v is! String ||
      v.trim().isEmpty ||
      v.runes.length > max ||
      RegExp(r'[\x00-\x1f\x7f]').hasMatch(v)) {
    throw const FormatException();
  }
  return v;
}

int _revision(Object? v, [int min = 1]) {
  if (v is! int || v < min || v > 9007199254740991) {
    throw const FormatException();
  }
  return v;
}

DateTime _date(Object? v) {
  final s = _text(v, 40), date = DateTime.tryParse(s);
  if (date == null || !s.endsWith('Z')) throw const FormatException();
  return date;
}

AdminCategory _category(Object? value) {
  final v = _object(value, [
    'eventCategoryId',
    'displayName',
    'lifecycleState',
    'revision',
  ]);
  final managed = parseManagedEventCategory({
    for (final k in ['eventCategoryId', 'displayName', 'lifecycleState'])
      k: v[k],
  })!;
  return AdminCategory(
    managed.id,
    managed.name,
    managed.active,
    _revision(v['revision']),
  );
}

AdminClassification _classification(Object? value) {
  final v = _object(
    value,
    ['eventId', 'revision'],
    ['eventCategoryId', 'displayName', 'lifecycleState'],
  );
  final fields = ['eventCategoryId', 'displayName', 'lifecycleState'];
  final present = fields.where(v.containsKey).length;
  if (present != 0 && present != 3) throw const FormatException();
  return AdminClassification(
    _text(v['eventId']),
    _revision(v['revision'], 0),
    present == 0
        ? null
        : parseManagedEventCategory({for (final k in fields) k: v[k]}),
  );
}

final class BackendAdminRepository implements AdminRepository {
  BackendAdminRepository(this.client);
  final BackendApiClient client;
  Future<Result<T>> _read<T>(
    Future<Result<JsonObject>> future,
    T Function(JsonObject) parse,
  ) async {
    final result = await future;
    if (result case Failure<JsonObject>(:final failure)) {
      return Failure(failure);
    }
    try {
      return Success(parse((result as Success<JsonObject>).value));
    } on Object {
      return const Failure(_invalid);
    }
  }

  @override
  Future<Result<AdminStatus>> status(
    bool Function() current,
  ) => _read(client.getGuarded('/v1/admin/operations-status', current), (body) {
    final v = _object(body, ['observedAt', 'services']), rows = v['services'];
    if (rows is! List || rows.length != 5) throw const FormatException();
    final ids = <String>{};
    final services = rows
        .map((row) {
          final r = _object(
            row,
            ['service', 'configured', 'state'],
            ['lastObservedAt', 'lastSucceededAt', 'reason'],
          );
          final id = _text(r['service']), state = _text(r['state']);
          if (![
                'backend',
                'firebase',
                'ai',
                'ticketmaster',
                'onepa',
              ].contains(id) ||
              !ids.add(id) ||
              r['configured'] is! bool ||
              ![
                'ready',
                'unavailable',
                'unknown',
                'disabled',
              ].contains(state)) {
            throw const FormatException();
          }
          final reason = r['reason'];
          if (reason != null &&
              ![
                'not_configured',
                'not_observed',
                'stale_observation',
                'dependency_unavailable',
                'maintenance_unavailable',
              ].contains(reason)) {
            throw const FormatException();
          }
          return AdminServiceStatus(
            id,
            r['configured']! as bool,
            state,
            r.containsKey('lastObservedAt') ? _date(r['lastObservedAt']) : null,
            r.containsKey('lastSucceededAt')
                ? _date(r['lastSucceededAt'])
                : null,
            reason as String?,
          );
        })
        .toList(growable: false);
    return AdminStatus(_date(v['observedAt']), List.unmodifiable(services));
  });
  @override
  Future<Result<List<AdminCategory>>> categories(bool Function() current) =>
      _read(client.getGuarded('/v1/admin/event-categories', current), (body) {
        final rows = _object(body, ['eventCategories'])['eventCategories'];
        if (rows is! List) throw const FormatException();
        final values = rows.map(_category).toList(growable: false),
            ids = <String>{};
        String? prior;
        for (final v in values) {
          if (!ids.add(v.id) || (prior != null && prior.compareTo(v.id) >= 0)) {
            throw const FormatException();
          }
          prior = v.id;
        }
        return List.unmodifiable(values);
      });
  @override
  Future<Result<AdminCategory>> create(String name, bool Function() current) =>
      _read(
        client.post(
          '/v1/admin/event-categories',
          body: {'displayName': name},
          isEligible: current,
        ),
        (v) {
          final c = _category(_object(v, ['eventCategory'])['eventCategory']);
          if (c.revision != 1 || !c.active) throw const FormatException();
          return c;
        },
      );
  Future<Result<AdminCategory>> _change(
    AdminCategory expected,
    JsonObject body,
    bool Function() current,
  ) => _read(
    client.patchGuarded(
      '/v1/admin/event-categories/${Uri.encodeComponent(expected.id)}',
      body,
      current,
    ),
    (v) {
      final c = _category(_object(v, ['eventCategory'])['eventCategory']);
      final changed = c.name != expected.name || c.active != expected.active;
      if (c.id != expected.id ||
          c.revision != expected.revision + (changed ? 1 : 0) ||
          body.containsKey('displayName') && c.active != expected.active ||
          body.containsKey('lifecycleState') &&
              (c.name != expected.name ||
                  c.active != (body['lifecycleState'] == 'active'))) {
        throw const FormatException();
      }
      return c;
    },
  );
  @override
  Future<Result<AdminCategory>> rename(
    AdminCategory expected,
    String name,
    bool Function() current,
  ) => _change(expected, {
    'expectedRevision': expected.revision,
    'displayName': name,
  }, current);
  @override
  Future<Result<AdminCategory>> lifecycle(
    AdminCategory expected,
    bool active,
    bool Function() current,
  ) => _change(expected, {
    'expectedRevision': expected.revision,
    'lifecycleState': active ? 'active' : 'inactive',
  }, current);
  @override
  Future<Result<AdminRecordPage>> records(
    String? cursor,
    bool Function() current,
  ) => _read(
    client.getGuarded(
      '/v1/admin/operation-records${cursor == null ? '' : '?cursor=${Uri.encodeQueryComponent(cursor)}'}',
      current,
    ),
    (body) {
      final v = _object(body, ['records'], ['nextCursor']), rows = v['records'];
      if (rows is! List || rows.length > 50) throw const FormatException();
      final ids = <String>{};
      final records = rows
          .map((row) {
            final r = _object(
              row,
              [
                'recordId',
                'occurredAt',
                'expiresAt',
                'actorAdminUid',
                'targetType',
                'targetId',
                'operation',
                'afterRevision',
                'result',
              ],
              ['beforeRevision'],
            );
            final id = _text(r['recordId']),
                type = _text(r['targetType']),
                operation = _text(r['operation']);
            final occurred = _date(r['occurredAt']),
                expires = _date(r['expiresAt']);
            if (!ids.add(id) ||
                r['result'] != 'committed' ||
                expires.difference(occurred) != const Duration(days: 30) ||
                ![
                  'interest_tag',
                  'event_category',
                  'event_category_assignment',
                ].contains(type) ||
                ![
                  'create',
                  'rename',
                  'deactivate',
                  'restore',
                  'assign',
                  'clear',
                ].contains(operation)) {
              throw const FormatException();
            }
            return AdminOperationRecord(
              id,
              occurred,
              expires,
              _text(r['actorAdminUid'], 128),
              type,
              _text(r['targetId']),
              operation,
              r.containsKey('beforeRevision')
                  ? _revision(r['beforeRevision'], 0)
                  : null,
              _revision(r['afterRevision']),
            );
          })
          .toList(growable: false);
      return AdminRecordPage(
        List.unmodifiable(records),
        v.containsKey('nextCursor') ? _text(v['nextCursor']) : null,
      );
    },
  );
  @override
  Future<Result<AdminClassification>> classification(
    String eventId,
    bool Function() current,
  ) => _read(
    client.get(
      '/v1/admin/events/${Uri.encodeComponent(eventId)}/category',
      isEligible: current,
      readTimeout: const Duration(seconds: 120),
    ),
    (v) {
      final c = _classification(v);
      if (c.eventId != eventId) throw const FormatException();
      return c;
    },
  );
  @override
  Future<Result<AdminClassification>> assign(
    AdminClassification expected,
    String? categoryId,
    bool Function() current,
  ) => _read(
    client.putGuarded(
      '/v1/admin/events/${Uri.encodeComponent(expected.eventId)}/category',
      {'expectedRevision': expected.revision, 'eventCategoryId': ?categoryId},
      current,
    ),
    (v) {
      final c = _classification(v),
          changed = expected.category?.id != categoryId;
      if (c.eventId != expected.eventId ||
          c.category?.id != categoryId ||
          c.revision != expected.revision + (changed ? 1 : 0)) {
        throw const FormatException();
      }
      return c;
    },
  );
}
