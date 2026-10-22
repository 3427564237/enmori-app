import '../../../core/network/backend_api_client.dart';
import '../../../core/result/result.dart';
import '../../account/domain/profile_details.dart';
import '../../check_in/domain/check_in_projection_decoder.dart';
import '../../check_in/domain/check_in_repository.dart';
import '../../weather/domain/weather.dart';
import '../domain/social_repository.dart';

final class BackendSocialRepository implements SocialRepository {
  BackendSocialRepository(this.client, this.decoder);
  final CheckInProjectionDecoder decoder;
  final BackendApiClient client;
  String _person(String username) =>
      '/v1/people/${Uri.encodeComponent(username)}';
  String _friend(String username) =>
      '/v1/me/friends/${Uri.encodeComponent(username)}';
  Future<Result<T>> _read<T>(
    Future<Result<JsonObject>> request,
    T Function(JsonObject) parse,
  ) async {
    try {
      final result = await request;
      if (result case Failure<JsonObject>(:final failure)) {
        return Failure(failure);
      }
      return Success(parse((result as Success<JsonObject>).value));
    } catch (_) {
      return const Failure(
        AppFailure(
          kind: AppFailureKind.unexpected,
          message:
              'This view could not be read. Reload to check current access.',
        ),
      );
    }
  }

  @override
  Future<Result<SocialProfile>> profile(String username) =>
      _read(client.get(_person(username)), (json) {
        _keys(json, {
          'username',
          'displayName',
          'details',
          'relationship',
          'specialCare',
          'friendshipRevision',
          'interests',
          'mapAvailable',
          'participationAvailable',
        });
        if (json['username'] != username) throw const FormatException();
        final details = _map(json['details']);
        _keys(details, {'bio', 'affiliationType', 'affiliationName', 'region'});
        final type = details['affiliationType'];
        if (type != null && type != 'school' && type != 'company') {
          throw const FormatException();
        }
        final interests = _list(json['interests'], 10).map((value) {
          final tag = _map(value);
          _keys(tag, {'interestTagId', 'displayName'});
          return SharedInterest(
            _text(tag['interestTagId']),
            _text(tag['displayName']),
          );
        }).toList();
        if (interests.map((i) => i.id).toSet().length != interests.length) {
          throw const FormatException();
        }
        return SocialProfile(
          username: username,
          displayName: _nullable(json['displayName']),
          details: ProfileDetails(
            bio: _nullable(details['bio']),
            region: _nullable(details['region']),
            affiliationType: type == null
                ? null
                : type == 'school'
                ? AffiliationType.school
                : AffiliationType.company,
            affiliationName: _nullable(details['affiliationName']),
          ),
          relationship: SocialRelationship.values.singleWhere(
            (r) => r.name == json['relationship'],
          ),
          specialCare: _boolean(json['specialCare']),
          friendshipRevision: _revision(json['friendshipRevision']),
          interests: List.unmodifiable(interests),
          mapAvailable: _boolean(json['mapAvailable']),
          participationAvailable: _boolean(json['participationAvailable']),
        );
      });
  @override
  Future<Result<CheckIn>> record(String username, String checkInId) => _read(
    client.get(
      '${_person(username)}/check-ins/${Uri.encodeComponent(checkInId)}',
    ),
    (json) {
      _keys(json, {'checkIn'});
      final value = decoder.decode(json['checkIn']);
      if (value == null || value.checkInId != checkInId) {
        throw const FormatException();
      }
      return value;
    },
  );
  @override
  Future<Result<CheckInHistoryPage>> records(
    String username, {
    required String date,
    required String timeZone,
    String? cursor,
  }) => _read(
    client.get(
      Uri(
        path: '${_person(username)}/check-ins',
        queryParameters: {
          'date': date,
          'timeZone': timeZone,
          'cursor': ?cursor,
        },
      ).toString(),
    ),
    (json) {
      _keys(json, {'checkIns', 'nextCursor'});
      final values = _list(json['checkIns'], 20)
          .map((raw) => decoder.decode(raw) ?? (throw const FormatException()))
          .toList();
      if (values.map((v) => v.checkInId).toSet().length != values.length) {
        throw const FormatException();
      }
      return CheckInHistoryPage(
        checkIns: List.unmodifiable(values),
        nextCursor: _nullable(json['nextCursor']),
      );
    },
  );
  @override
  Future<Result<SocialMonth>> month(
    String username, {
    required String month,
    required String timeZone,
  }) => _read(
    client.get(
      Uri(
        path: '${_person(username)}/calendar-map',
        queryParameters: {'month': month, 'timeZone': timeZone},
      ).toString(),
    ),
    (json) {
      _keys(json, {'month', 'timeZone', 'days', 'points'});
      if (json['month'] != month || json['timeZone'] != timeZone) {
        throw const FormatException();
      }
      final first = DateTime.tryParse('$month-01T00:00:00Z');
      if (first == null || first.toIso8601String().substring(0, 7) != month) {
        throw const FormatException();
      }
      final expected = DateTime.utc(first.year, first.month + 1, 0).day;
      final days = _list(json['days'], 31), counts = <String, int>{};
      if (days.length != expected) throw const FormatException();
      for (var i = 0; i < days.length; i++) {
        final row = _map(days[i]),
            date = '$month-${(i + 1).toString().padLeft(2, '0')}';
        _keys(row, {'date', 'count'});
        if (row['date'] != date) throw const FormatException();
        counts[date] = _revision(row['count']);
      }
      final points = _list(json['points'], 2000).map((raw) {
        final row = _map(raw);
        _keys(row, {'checkInId', 'createdAt', 'location'});
        final date = DateTime.tryParse(_text(row['createdAt'])),
            location = GeoPoint.parse(row['location']);
        if (date == null ||
            !date.isUtc ||
            date.toIso8601String() != row['createdAt'] ||
            location == null) {
          throw const FormatException();
        }
        return CheckInMapPoint(
          checkInId: _text(row['checkInId']),
          createdAt: date,
          location: location,
        );
      }).toList();
      if (points.map((p) => p.checkInId).toSet().length != points.length) {
        throw const FormatException();
      }
      for (var i = 1; i < points.length; i++) {
        if (points[i].createdAt.isBefore(points[i - 1].createdAt)) {
          throw const FormatException();
        }
      }
      return SocialMonth(
        month: month,
        timeZone: timeZone,
        counts: Map.unmodifiable(counts),
        points: List.unmodifiable(points),
      );
    },
  );
  @override
  Future<Result<FriendCare>> care(
    String username, {
    required bool specialCare,
    required int expectedRevision,
    bool Function()? isEligible,
  }) => _read(
    client.put(
      '${_friend(username)}/special-care',
      isEligible: isEligible,
      body: {'specialCare': specialCare, 'expectedRevision': expectedRevision},
    ),
    (json) {
      _keys(json, {'specialCare', 'friendshipRevision'});
      if (json['specialCare'] != specialCare ||
          json['friendshipRevision'] != expectedRevision + 1) {
        throw const FormatException();
      }
      return FriendCare(specialCare, _revision(json['friendshipRevision']));
    },
  );
  @override
  Future<Result<void>> remove(
    String username, {
    required int expectedRevision,
    bool Function()? isEligible,
  }) => _read(
    client.deleteJson(
      _friend(username),
      isEligible: isEligible,
      body: {'expectedRevision': expectedRevision},
    ),
    (json) {
      _keys(json, {'removed'});
      if (json['removed'] != true) throw const FormatException();
    },
  );
}

Map<String, Object?> _map(Object? value) =>
    value is Map<String, Object?> ? value : throw const FormatException();
void _keys(Map<String, Object?> value, Set<String> keys) {
  if (value.length != keys.length || !value.keys.every(keys.contains)) {
    throw const FormatException();
  }
}

String _text(Object? value) =>
    value is String && value.isNotEmpty ? value : throw const FormatException();
String? _nullable(Object? value) => value == null ? null : _text(value);
bool _boolean(Object? value) =>
    value is bool ? value : throw const FormatException();
int _revision(Object? value) =>
    value is int && value >= 0 && value < 9007199254740991
    ? value
    : throw const FormatException();
List<Object?> _list(Object? value, int limit) =>
    value is List<Object?> && value.length <= limit
    ? value
    : throw const FormatException();
