import 'package:enmori/features/account/domain/profile_details.dart';

import '../../../core/network/backend_api_client.dart';
import '../../../core/result/result.dart';
import '../domain/account_repository.dart';
import '../domain/account_preferences_repository.dart';

final class BackendAccountPreferencesRepository
    implements AccountPreferencesRepository {
  BackendAccountPreferencesRepository(this._client);
  final BackendApiClient _client;
  static final _unsafeName = RegExp(
    r'[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]',
    unicode: true,
  );

  @override
  Future<Result<OwnProfile>> readProfile() async =>
      _profile(await _client.get('/v1/me/profile'));
  @override
  Future<Result<OwnSettings>> readSettings() async =>
      _settings(await _client.get('/v1/me/settings'));
  @override
  Future<Result<OwnProfile>> saveProfile({
    ProfileDetails? details,
    required String? displayName,
    required ProfileVisibility visibility,
    required int expectedRevision,
  }) async => _profile(
    await _client.put(
      '/v1/me/profile',
      body: {
        if (details != null)
          'details': {
            'bio': details.bio,
            'affiliationType': details.affiliationType?.name,
            'affiliationName': details.affiliationName,
            'region': details.region,
          },
        'displayName': displayName,
        'profileVisibility': _profileVisibility(visibility),
        'expectedRevision': expectedRevision,
      },
    ),
  );
  @override
  Future<Result<OwnSettings>> saveSettings({
    CloudAiConsent? cloudAiConsent,
    bool? defaultCheckInLocation,
    bool? defaultCheckInWeather,
    bool? homeWeatherAuto,
    FieldPrivacy? fieldPrivacy,
    required CheckInVisibility visibility,
    required OptionalProcessingConsent consent,
    required int expectedRevision,
  }) async => _settings(
    await _client.put(
      '/v1/me/settings',
      body: {
        if (fieldPrivacy != null)
          'fieldPrivacy': {
            'interests': _profileVisibility(fieldPrivacy.interests),
            'location': _profileVisibility(fieldPrivacy.location),
            'participation': _profileVisibility(fieldPrivacy.participation),
            'mapSharedWithFriends': fieldPrivacy.mapSharedWithFriends,
          },
        'defaultCheckInLocation': ?defaultCheckInLocation,
        'defaultCheckInWeather': ?defaultCheckInWeather,
        'homeWeatherAuto': ?homeWeatherAuto,
        'checkInVisibility': _checkInVisibility(visibility),
        if (cloudAiConsent != null)
          'cloudAiConsent': {
            'state': cloudAiConsent.name,
            'disclosureVersion': 'groq_cloud_v1',
          },
        'optionalProcessingConsent': consent.name,
        'expectedRevision': expectedRevision,
      },
    ),
  );

  Result<OwnProfile> _profile(Result<JsonObject> result) {
    if (result case Failure<JsonObject>(:final failure)) {
      return Failure(failure);
    }
    final envelope = (result as Success<JsonObject>).value;
    final p = envelope['profile'];
    if (envelope.length != 1 ||
        p is! Map<String, dynamic> ||
        !_keys(p, [
          if (p.containsKey('details')) 'details',
          'username',
          'displayName',
          'profileVisibility',
          'revision',
        ])) {
      return _invalid();
    }
    final details = p.containsKey('details')
        ? _details(p['details'])
        : const ProfileDetails();
    if (details == null) return _invalid();
    final username = p['username'];
    final name = p['displayName'];
    final revision = p['revision'];
    final visibility = switch (p['profileVisibility']) {
      'private' => ProfileVisibility.private,
      'friends_only' => ProfileVisibility.friendsOnly,
      'public' => ProfileVisibility.public,
      _ => null,
    };
    if (username is! String ||
        username.isEmpty ||
        visibility == null ||
        !_revision(revision) ||
        (name != null &&
            (name is! String ||
                name.trim() != name ||
                name.isEmpty ||
                name.runes.length > 50 ||
                name.runes.any((rune) => rune >= 0xd800 && rune <= 0xdfff) ||
                _unsafeName.hasMatch(name)))) {
      return _invalid();
    }
    return Success(
      OwnProfile(
        details: details,
        username: username,
        displayName: name as String?,
        visibility: visibility,
        revision: revision as int,
      ),
    );
  }

  Result<OwnSettings> _settings(Result<JsonObject> result) {
    if (result case Failure<JsonObject>(:final failure)) {
      return Failure(failure);
    }
    final envelope = (result as Success<JsonObject>).value;
    final p = envelope['settings'];
    if (envelope.length != 1 ||
        p is! Map<String, dynamic> ||
        !_keys(p, [
          if (p.containsKey('defaultCheckInLocation')) 'defaultCheckInLocation',
          if (p.containsKey('defaultCheckInWeather')) 'defaultCheckInWeather',
          if (p.containsKey('homeWeatherAuto')) 'homeWeatherAuto',
          if (p.containsKey('fieldPrivacy')) 'fieldPrivacy',
          if (p.containsKey('cloudAiConsent')) 'cloudAiConsent',
          'checkInVisibility',
          'optionalProcessingConsent',
          'revision',
        ])) {
      return _invalid();
    }
    for (final key in [
      'defaultCheckInLocation',
      'defaultCheckInWeather',
      'homeWeatherAuto',
    ]) {
      if (p.containsKey(key) && p[key] is! bool) return _invalid();
    }
    CloudAiConsent? cloudAiConsent;
    if (p.containsKey('cloudAiConsent')) {
      final grant = p['cloudAiConsent'];
      if (grant is! Map<String, dynamic> ||
          !_keys(grant, ['state', 'disclosureVersion']) ||
          grant['disclosureVersion'] != 'groq_cloud_v1') {
        return _invalid();
      }
      cloudAiConsent = switch (grant['state']) {
        'accepted' => CloudAiConsent.accepted,
        'declined' => CloudAiConsent.declined,
        _ => null,
      };
      if (cloudAiConsent == null) return _invalid();
    }
    final visibility = switch (p['checkInVisibility']) {
      'private' => CheckInVisibility.private,
      'friends_only' => CheckInVisibility.friendsOnly,
      'public' => CheckInVisibility.public,
      _ => null,
    };
    final privacy = p.containsKey('fieldPrivacy')
        ? _privacy(p['fieldPrivacy'])
        : const FieldPrivacy();
    if (privacy == null) return _invalid();
    final consent = switch (p['optionalProcessingConsent']) {
      'accepted' => OptionalProcessingConsent.accepted,
      'rejected' => OptionalProcessingConsent.rejected,
      _ => null,
    };
    if (visibility == null || consent == null || !_revision(p['revision'])) {
      return _invalid();
    }
    return Success(
      OwnSettings(
        cloudAiConsent: cloudAiConsent,
        defaultCheckInLocation: p['defaultCheckInLocation'] as bool? ?? false,
        defaultCheckInWeather: p['defaultCheckInWeather'] as bool? ?? false,
        homeWeatherAuto: p['homeWeatherAuto'] as bool? ?? false,
        fieldPrivacy: privacy,
        checkInVisibility: visibility,
        consent: consent,
        revision: p['revision'] as int,
      ),
    );
  }

  ProfileDetails? _details(Object? value) {
    if (value is! Map<String, dynamic> ||
        !_keys(value, [
          'bio',
          'affiliationType',
          'affiliationName',
          'region',
        ])) {
      return null;
    }
    for (final key in ['bio', 'affiliationName', 'region']) {
      final field = value[key];
      if (field != null &&
          (field is! String ||
              field.runes.length > (key == 'bio' ? 500 : 120) ||
              _unsafeName.hasMatch(field))) {
        return null;
      }
    }
    final kind = value['affiliationType'];
    if (kind != null && kind != 'school' && kind != 'company') return null;
    if (kind == null && value['affiliationName'] != null) return null;
    return ProfileDetails(
      bio: value['bio'] as String?,
      region: value['region'] as String?,
      affiliationName: value['affiliationName'] as String?,
      affiliationType: kind == null
          ? null
          : AffiliationType.values.byName(kind as String),
    );
  }

  FieldPrivacy? _privacy(Object? value) {
    if (value is! Map<String, dynamic> ||
        !_keys(value, [
          'interests',
          'location',
          'participation',
          'mapSharedWithFriends',
        ]) ||
        value['mapSharedWithFriends'] is! bool) {
      return null;
    }
    ProfileVisibility? visibility(Object? v) => switch (v) {
      'private' => ProfileVisibility.private,
      'friends_only' => ProfileVisibility.friendsOnly,
      'public' => ProfileVisibility.public,
      _ => null,
    };
    final interests = visibility(value['interests']),
        location = visibility(value['location']),
        participation = visibility(value['participation']);
    if (interests == null || location == null || participation == null) {
      return null;
    }
    return FieldPrivacy(
      interests: interests,
      location: location,
      participation: participation,
      mapSharedWithFriends: value['mapSharedWithFriends'] as bool,
    );
  }

  bool _keys(Map<String, dynamic> p, List<String> keys) =>
      p.length == keys.length && keys.every(p.containsKey);
  bool _revision(Object? value) =>
      value is int && value >= 0 && value <= 9007199254740991;
  Failure<T> _invalid<T>() => const Failure(
    AppFailure(
      kind: AppFailureKind.unexpected,
      message: 'The service returned invalid profile or settings details.',
    ),
  );
  String _profileVisibility(ProfileVisibility v) =>
      v == ProfileVisibility.friendsOnly ? 'friends_only' : v.name;
  String _checkInVisibility(CheckInVisibility v) =>
      v == CheckInVisibility.friendsOnly ? 'friends_only' : v.name;
}
