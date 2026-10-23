import '../../../core/result/result.dart';
import '../../account/domain/account_repository.dart';
import '../../weather/domain/weather.dart';
import 'check_in_repository.dart';

final class CheckInPlace {
  const CheckInPlace({
    required this.location,
    this.includeWeather = false,
    this.settingsRevision,
  });
  final GeoPoint location;
  final bool includeWeather;
  final int? settingsRevision;
  Map<String, Object> toJson() => {
    'location': location.toJson(),
    if (includeWeather && settingsRevision != null)
      'weatherRequest': {
        'position': location.weatherGrid.toJson(),
        'expectedSettingsRevision': settingsRevision!,
      },
  };
}

final class CheckInSaveReceipt {
  const CheckInSaveReceipt(this.checkIn, {this.notice});
  final CheckIn checkIn;
  final String? notice;
}

abstract interface class CheckInPlaceRepository {
  Future<Result<CheckInSaveReceipt>> create({
    String? locationLabel,
    required String note,
    String? mood,
    String? activity,
    required CheckInVisibility visibility,
    CheckInPlace? place,
    required String idempotencyKey,
    bool Function()? isEligible,
  });
  Future<Result<CheckIn>> removeLocation({
    required CheckIn checkIn,
    bool Function()? isEligible,
  });
  Future<Result<CheckIn>> removeWeatherPermission({
    required CheckIn checkIn,
    bool Function()? isEligible,
  });
  Future<Result<CheckIn>> replaceLocation({
    required CheckIn checkIn,
    required GeoPoint location,
    bool Function()? isEligible,
  });
}
