import 'package:characters/characters.dart';

import '../../../core/network/backend_api_client.dart';
import '../../../core/network/utc_timestamp_parser.dart';
import '../../../core/result/result.dart';
import '../../account/domain/account_repository.dart';
import '../domain/check_in_repository.dart';

final class BackendCheckInRepository implements CheckInRepository {
  BackendCheckInRepository(this._client);

  final BackendApiClient _client;

  @override
  Future<Result<CheckIn>> create({
    required String note,
    required String idempotencyKey,
  }) async {
    final response = await _client.post(
      '/v1/check-ins',
      body: {'note': note},
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
      if (raw is! Map<String, dynamic> ||
          !_hasOnlyKeys(raw, {
            'checkInId',
            'note',
            'createdAt',
            'checkInVisibility',
          }) ||
          !raw.keys.toSet().containsAll({'checkInId', 'note', 'createdAt'})) {
        return _invalidHistory();
      }
      final checkInId = raw['checkInId'];
      final note = raw['note'];
      final createdAt = raw['createdAt'];
      final canonical =
          createdAt is String &&
          RegExp(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$')
              .hasMatch(createdAt);
      final parsedTime = canonical ? tryParseUtcTimestamp(createdAt) : null;
      if (checkInId is! String ||
          checkInId.isEmpty ||
          note is! String ||
          note.trim() != note ||
          note.characters.isEmpty ||
          note.characters.length > 500 ||
          parsedTime == null ||
          parsedTime.toIso8601String() != createdAt) {
        return _invalidHistory();
      }
      final visibility = switch (raw['checkInVisibility']) {
        'private' => CheckInVisibility.private,
        'friends_only' => CheckInVisibility.friendsOnly,
        'public' => CheckInVisibility.public,
        _ => null,
      };
      if (raw.containsKey('checkInVisibility') && visibility == null) {
        return _invalidHistory();
      }
      checkIns.add(
        CheckIn(
          checkInId: checkInId,
          note: note,
          createdAt: parsedTime,
          checkInVisibility: visibility,
        ),
      );
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
    final checkIn = value['checkIn'];
    if (checkIn is! Map<String, dynamic>) return _invalidCheckIn();

    final checkInId = checkIn['checkInId'];
    final note = checkIn['note'];
    final createdAt = checkIn['createdAt'];
    final parsedTime = tryParseUtcTimestamp(createdAt);
    if (checkInId is! String || note is! String || parsedTime == null) {
      return _invalidCheckIn();
    }

    final visibility = switch (checkIn['checkInVisibility']) {
      'private' => CheckInVisibility.private,
      'friends_only' => CheckInVisibility.friendsOnly,
      'public' => CheckInVisibility.public,
      _ => null,
    };
    if (checkIn.containsKey('checkInVisibility') && visibility == null) {
      return _invalidCheckIn();
    }
    return Success(
      CheckIn(
        checkInId: checkInId,
        note: note,
        createdAt: parsedTime,
        checkInVisibility: visibility,
      ),
    );
  }

  Failure<CheckIn> _invalidCheckIn() => const Failure(
    AppFailure(
      kind: AppFailureKind.unexpected,
      message: 'The service returned an invalid Check-in.',
    ),
  );
}

