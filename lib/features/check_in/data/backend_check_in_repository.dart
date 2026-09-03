import '../../../core/network/backend_api_client.dart';
import '../../../core/result/result.dart';
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

  Result<CheckIn> _parseCheckIn(JsonObject value) {
    final checkIn = value['checkIn'];
    if (checkIn is! Map<String, dynamic>) return _invalidCheckIn();

    final checkInId = checkIn['checkInId'];
    final note = checkIn['note'];
    final createdAt = checkIn['createdAt'];
    final parsedTime = createdAt is String
        ? DateTime.tryParse(createdAt)?.toUtc()
        : null;
    if (checkInId is! String || note is! String || parsedTime == null) {
      return _invalidCheckIn();
    }

    return Success(
      CheckIn(checkInId: checkInId, note: note, createdAt: parsedTime),
    );
  }

  Failure<CheckIn> _invalidCheckIn() => const Failure(
    AppFailure(
      kind: AppFailureKind.unexpected,
      message: 'The service returned an invalid Check-in.',
    ),
  );
}
