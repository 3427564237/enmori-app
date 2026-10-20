import 'package:characters/characters.dart';

import '../../../core/network/utc_timestamp_parser.dart';
import '../../account/domain/account_repository.dart';
import '../../weather/domain/weather.dart';
import '../domain/check_in_repository.dart';
import '../domain/check_in_projection_decoder.dart';

final class BackendCheckInProjectionDecoder
    implements CheckInProjectionDecoder {
  const BackendCheckInProjectionDecoder();
  @override
  CheckIn? decode(Object? value) => parseCheckInProjection(value);
}

/// Same allowlisted projection for own and server-authorized other-user reads.
CheckIn? parseCheckInProjection(Object? raw, {bool canonicalTime = true}) {
  const keys = {
    'checkInId',
    'note',
    'createdAt',
    'checkInVisibility',
    'revision',
    'mood',
    'activity',
    'location',
    'weather',
  };
  if (raw is! Map<String, dynamic> ||
      !raw.keys.every(keys.contains) ||
      !raw.keys.toSet().containsAll({'checkInId', 'note', 'createdAt'})) {
    return null;
  }
  final id = raw['checkInId'],
      note = raw['note'],
      revision = raw['revision'] ?? 1;
  final time = tryParseUtcTimestamp(raw['createdAt']);
  if (id is! String ||
      id.isEmpty ||
      note is! String ||
      note.trim() != note ||
      (note.isEmpty && raw['mood'] == null) ||
      note.characters.length > 500 ||
      revision is! int ||
      revision < 1 ||
      time == null ||
      (canonicalTime && time.toIso8601String() != raw['createdAt'])) {
    return null;
  }
  for (final key in ['mood', 'activity']) {
    final value = raw[key];
    if (value != null &&
        (value is! String ||
            value.trim() != value ||
            value.isEmpty ||
            value.runes.length > 50)) {
      return null;
    }
  }
  final visibility = switch (raw['checkInVisibility']) {
    'private' => CheckInVisibility.private,
    'friends_only' => CheckInVisibility.friendsOnly,
    'public' => CheckInVisibility.public,
    _ => null,
  };
  if (raw.containsKey('checkInVisibility') && visibility == null) return null;
  final point = GeoPoint.parse(raw['location']),
      weather = WeatherSnapshot.parse(raw['weather']);
  if ((raw.containsKey('location') && point == null) ||
      (raw.containsKey('weather') && weather == null)) {
    return null;
  }
  return CheckIn(
    checkInId: id,
    note: note,
    createdAt: time,
    revision: revision,
    checkInVisibility: visibility,
    mood: raw['mood'] as String?,
    activity: raw['activity'] as String?,
    location: point,
    weather: weather,
  );
}
