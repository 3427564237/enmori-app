import 'check_in_projection_parser.dart';
import '../domain/check_in_calendar_repository.dart';

import '../../../core/network/backend_api_client.dart';
import '../../../core/result/result.dart';
import '../../account/domain/account_repository.dart';
import '../domain/check_in_repository.dart';
import '../domain/check_in_mutations.dart';

final class BackendCheckInRepository
    implements CheckInRepository, CheckInMutations, CheckInCalendarRepository {
  BackendCheckInRepository(this._client);

  final BackendApiClient _client;
  @override
  Future<Result<CheckInMonth>> readMonth({
    required String month,
    required String timeZone,
  }) async {
    final response = await _client.get(
      Uri(
        path: '/v1/me/check-ins/calendar',
        queryParameters: {'month': month, 'timeZone': timeZone},
      ).toString(),
    );
    if (response case Failure<JsonObject>(:final failure)) {
      return Failure(failure);
    }
    final json = (response as Success<JsonObject>).value;
    const invalid = Failure<CheckInMonth>(
      AppFailure(
        kind: AppFailureKind.unexpected,
        message: 'The service returned an invalid calendar.',
      ),
    );
    if (json['month'] != month ||
        json['timeZone'] != timeZone ||
        json.length != 3 ||
        json['days'] is! List) {
      return invalid;
    }
    final first = DateTime.tryParse('$month-01T00:00:00Z');
    if (first == null) return invalid;
    final expectedDays = DateTime.utc(first.year, first.month + 1, 0).day;
    final raw = json['days'] as List;
    if (raw.length != expectedDays) return invalid;
    final counts = <String, int>{};
    for (var i = 0; i < expectedDays; i++) {
      final row = raw[i], date = '$month-${(i + 1).toString().padLeft(2, '0')}';
      if (row is! Map ||
          row.length != 2 ||
          row['date'] != date ||
          row['count'] is! int ||
          row['count'] < 0) {
        return invalid;
      }
      counts[date] = row['count'] as int;
    }
    return Success(
      CheckInMonth(
        month: month,
        timeZone: timeZone,
        counts: Map.unmodifiable(counts),
      ),
    );
  }

  @override
  Future<Result<CheckIn>> update({
    bool Function()? isEligible,
    String? locationLabel,
    required String checkInId,
    String? mood,
    String? activity,
    required String note,
    required CheckInVisibility visibility,
    required int expectedRevision,
  }) async {
    final response = await _client.put(
      '/v1/check-ins/${Uri.encodeComponent(checkInId)}',
      isEligible: isEligible,
      body: {
        'note': note,
        'mood': mood,
        'activity': activity,
        'locationLabel': locationLabel,
        'checkInVisibility': switch (visibility) {
          CheckInVisibility.private => 'private',
          CheckInVisibility.friendsOnly => 'friends_only',
          CheckInVisibility.public => 'public',
        },
        'expectedRevision': expectedRevision,
      },
    );
    return switch (response) {
      Failure<JsonObject>(:final failure) => Failure(failure),
      Success<JsonObject>(:final value) => _parseCheckIn(value),
    };
  }

  @override
  Future<Result<void>> remove({
    bool Function()? isEligible,
    required String checkInId,
    required int expectedRevision,
  }) async {
    final response = await _client.deleteJson(
      '/v1/check-ins/${Uri.encodeComponent(checkInId)}',
      isEligible: isEligible,
      body: {'expectedRevision': expectedRevision},
    );
    return switch (response) {
      Failure<JsonObject>(:final failure) => Failure(failure),
      Success<JsonObject>(:final value)
          when value.length == 1 && value['deleted'] == true =>
        const Success(null),
      _ => const Failure(
        AppFailure(
          kind: AppFailureKind.unexpected,
          message: 'Deletion could not be confirmed. Reload the record.',
        ),
      ),
    };
  }

  @override
  Future<Result<CheckIn>> create({
    String? locationLabel,
    String? mood,
    String? activity,
    CheckInVisibility? visibility,
    required String note,
    required String idempotencyKey,
  }) async {
    final response = await _client.post(
      '/v1/check-ins',
      body: {
        'note': note,
        'mood': ?mood,
        'activity': ?activity,
        'locationLabel': ?locationLabel,
        if (visibility != null)
          'checkInVisibility': switch (visibility) {
            CheckInVisibility.private => 'private',
            CheckInVisibility.friendsOnly => 'friends_only',
            CheckInVisibility.public => 'public',
          },
      },
      idempotencyKey: idempotencyKey,
    );
    return switch (response) {
      Failure<JsonObject>(:final failure) => Failure(failure),
      Success<JsonObject>(:final value) => _parseCheckIn(value),
    };
  }

  @override
  Future<Result<CheckIn>> readOwned({required String checkInId}) async {
    final encodedId = Uri.encodeComponent(checkInId);
    final response = await _client.get('/v1/check-ins/$encodedId');
    return switch (response) {
      Failure<JsonObject>(:final failure) => Failure(failure),
      Success<JsonObject>(:final value) => _parseCheckIn(value),
    };
  }

  @override
  Future<Result<CheckInHistoryPage>> readOwnForDate({
    required String date,
    required String timeZone,
    String? cursor,
  }) async {
    final query = <String, String>{'date': date, 'timeZone': timeZone};
    if (cursor != null) query['cursor'] = cursor;
    final path = Uri(
      path: '/v1/me/check-ins',
      queryParameters: query,
    ).toString();
    final response = await _client.get(path);
    return switch (response) {
      Failure<JsonObject>(:final failure) => Failure(failure),
      Success<JsonObject>(:final value) => _parseHistory(value),
    };
  }

  Result<CheckInHistoryPage> _parseHistory(JsonObject value) {
    if (!_hasOnlyKeys(value, {'checkIns', 'nextCursor'}) ||
        !value.keys.toSet().containsAll({'checkIns', 'nextCursor'})) {
      return _invalidHistory();
    }
    final rawItems = value['checkIns'];
    final nextCursor = value['nextCursor'];
    if (rawItems is! List<Object?> ||
        rawItems.length > 20 ||
        (nextCursor != null && (nextCursor is! String || nextCursor.isEmpty))) {
      return _invalidHistory();
    }
    final checkIns = <CheckIn>[];
    for (final raw in rawItems) {
      final checkIn = parseCheckInProjection(raw);
      if (checkIn == null) return _invalidHistory();
      checkIns.add(checkIn);
    }
    return Success(
      CheckInHistoryPage(checkIns: checkIns, nextCursor: nextCursor as String?),
    );
  }

  bool _hasOnlyKeys(Map<String, Object?> value, Set<String> allowed) =>
      value.keys.every(allowed.contains);

  Failure<CheckInHistoryPage> _invalidHistory() => const Failure(
    AppFailure(
      kind: AppFailureKind.unexpected,
      message: 'The service returned invalid Check-in history.',
    ),
  );

  Result<CheckIn> _parseCheckIn(JsonObject value) {
    if (!value.keys.every({'checkIn', 'notice'}.contains) ||
        (value.containsKey('notice') &&
            value['notice'] != 'Check-in saved without weather.')) {
      return _invalidCheckIn();
    }
    // The existing single-record contract accepts UTC seconds/+00:00 too;
    // history pagination keeps its canonical timestamp requirement.
    final checkIn = parseCheckInProjection(
      value['checkIn'],
      canonicalTime: false,
    );
    return checkIn == null ? _invalidCheckIn() : Success(checkIn);
  }

  Failure<CheckIn> _invalidCheckIn() => const Failure(
    AppFailure(
      kind: AppFailureKind.unexpected,
      message: 'The service returned an invalid Check-in.',
    ),
  );
}
