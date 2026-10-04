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
    required String? displayName,
    required ProfileVisibility visibility,
    required int expectedRevision,
  }) async => _profile(
    await _client.put(
      '/v1/me/profile',
      body: {
        'displayName': displayName,
        'profileVisibility': _profileVisibility(visibility),
        'expectedRevision': expectedRevision,
      },
    ),
  );
  @override
  Future<Result<OwnSettings>> saveSettings({
    required CheckInVisibility visibility,
    required OptionalProcessingConsent consent,
    required int expectedRevision,
  }) async => _settings(
    await _client.put(
      '/v1/me/settings',
      body: {
        'checkInVisibility': _checkInVisibility(visibility),
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
          'username',
          'displayName',
          'profileVisibility',
          'revision',
        ])) {
      return _invalid();
    }
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
          'checkInVisibility',
          'optionalProcessingConsent',
          'revision',
        ])) {
      return _invalid();
    }
    final visibility = switch (p['checkInVisibility']) {
      'private' => CheckInVisibility.private,
      'friends_only' => CheckInVisibility.friendsOnly,
      'public' => CheckInVisibility.public,
      _ => null,
    };
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
        checkInVisibility: visibility,
        consent: consent,
        revision: p['revision'] as int,
      ),
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
