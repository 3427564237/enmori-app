import '../../../core/network/backend_api_client.dart';
import '../../../core/result/result.dart';
import '../../account/domain/account_repository.dart';
import '../domain/check_in_place_repository.dart';
import '../domain/check_in_repository.dart';
import '../../weather/domain/weather.dart';
import 'check_in_projection_parser.dart';

final class BackendCheckInPlaceRepository implements CheckInPlaceRepository {
  BackendCheckInPlaceRepository(this.client);
  final BackendApiClient client;
  @override
  Future<Result<CheckInSaveReceipt>> create({
    String? locationLabel,
    required String note,
    String? mood,
    String? activity,
    required CheckInVisibility visibility,
    CheckInPlace? place,
    required String idempotencyKey,
    bool Function()? isEligible,
  }) async {
    final normalized = normalizeCheckInNote(note, mood: mood);
    if (normalized case Failure<String>(:final failure)) {
      return Failure(failure);
    }
    if (place != null &&
        (!place.location.valid ||
            (place.includeWeather && place.settingsRevision == null))) {
      return const Failure(
        AppFailure(
          kind: AppFailureKind.requestInvalid,
          message: 'Confirm location and weather permission for this Check-in.',
        ),
      );
    }
    final response = await client.post(
      '/v1/check-ins',
      isEligible: isEligible,
      idempotencyKey: idempotencyKey,
      body: {
        'note': (normalized as Success<String>).value,
        'mood': ?mood,
        'activity': ?activity,
        'locationLabel': ?locationLabel,
        'checkInVisibility': _visibility(visibility),
        ...?place?.toJson(),
      },
    );
    if (response case Failure<JsonObject>(:final failure)) {
      return Failure(failure);
    }
    final value = (response as Success<JsonObject>).value,
        checkIn = parseCheckInProjection(
          value['checkIn'],
          canonicalTime: false,
        );
    if (checkIn == null ||
        !value.keys.every({'checkIn', 'notice'}.contains) ||
        (value.containsKey('notice') &&
            value['notice'] != 'Check-in saved without weather.')) {
      return _invalid();
    }
    return Success(
      CheckInSaveReceipt(checkIn, notice: value['notice'] as String?),
    );
  }

  Future<Result<CheckIn>> _update(
    CheckIn value,
    Map<String, Object?> changes,
    bool Function()? isEligible,
  ) async {
    final visibility = value.checkInVisibility;
    if (visibility == null) {
      return const Failure(
        AppFailure(
          kind: AppFailureKind.requestInvalid,
          message:
              'Choose a visibility in Edit before changing this legacy record.',
        ),
      );
    }
    final response = await client.put(
      '/v1/check-ins/${Uri.encodeComponent(value.checkInId)}',
      isEligible: isEligible,
      body: {
        'note': value.note,
        'mood': value.mood,
        'activity': value.activity,
        'checkInVisibility': _visibility(visibility),
        'expectedRevision': value.revision,
        ...changes,
      },
    );
    if (response case Failure<JsonObject>(:final failure)) {
      return Failure(failure);
    }
    final body = (response as Success<JsonObject>).value,
        result = parseCheckInProjection(body['checkIn'], canonicalTime: false);
    return body.length == 1 && result != null ? Success(result) : _invalid();
  }

  @override
  Future<Result<CheckIn>> removeLocation({
    required CheckIn checkIn,
    bool Function()? isEligible,
  }) => _update(checkIn, {'location': null}, isEligible);
  @override
  Future<Result<CheckIn>> removeWeatherPermission({
    required CheckIn checkIn,
    bool Function()? isEligible,
  }) => _update(checkIn, {'removeWeather': true}, isEligible);
  @override
  Future<Result<CheckIn>> replaceLocation({
    required CheckIn checkIn,
    required GeoPoint location,
    bool Function()? isEligible,
  }) async => location.valid
      ? _update(checkIn, {'location': location.toJson()}, isEligible)
      : _invalid();
}

String _visibility(CheckInVisibility value) => switch (value) {
  CheckInVisibility.private => 'private',
  CheckInVisibility.friendsOnly => 'friends_only',
  CheckInVisibility.public => 'public',
};
Failure<T> _invalid<T>() => const Failure(
  AppFailure(
    kind: AppFailureKind.unexpected,
    message:
        'Save could not be confirmed. Read the record before trying again.',
  ),
);
