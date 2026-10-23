import '../../../core/network/backend_api_client.dart';
import '../../../core/result/result.dart';
import '../domain/friend_ignore_repository.dart';

final class BackendFriendIgnoreRepository implements FriendIgnoreRepository {
  BackendFriendIgnoreRepository(this.client);
  final BackendApiClient client;
  static const path = '/v1/me/friend-recommendation-ignores';
  static bool _username(String value) =>
      value.length >= 3 &&
      value.length <= 30 &&
      RegExp(r'^[a-z0-9]+(?:_[a-z0-9]+)*$').hasMatch(value);
  static FriendIgnoreState _parse(Object? value) {
    const keys = {'username', 'displayName', 'ignored', 'version'};
    if (value is! Map ||
        value.length != 4 ||
        !value.keys.every(keys.contains) ||
        value['username'] is! String ||
        !_username(value['username'] as String) ||
        value['displayName'] != null &&
            (value['displayName'] is! String ||
                (value['displayName'] as String).trim().isEmpty ||
                (value['displayName'] as String).runes.length > 50) ||
        value['ignored'] is! bool ||
        value['version'] is! String ||
        !RegExp(r'^[a-f0-9]{64}$').hasMatch(value['version'] as String)) {
      throw const FormatException();
    }
    return FriendIgnoreState(
      username: value['username'] as String,
      displayName: value['displayName'] as String?,
      ignored: value['ignored'] as bool,
      version: value['version'] as String,
    );
  }

  @override
  Future<Result<List<FriendIgnoreState>>> list({
    required bool Function() isEligible,
  }) async {
    final result = await client.get(path, isEligible: isEligible);
    if (result case Failure<JsonObject>(:final failure)) {
      return Failure(failure);
    }
    try {
      final body = (result as Success<JsonObject>).value, rows = body['people'];
      if (body.length != 1 || rows is! List || rows.length > 999) {
        return _invalid();
      }
      final values = rows.map(_parse).toList();
      if (values.any((v) => !v.ignored) ||
          values.map((v) => v.username).toSet().length != values.length) {
        return _invalid();
      }
      return Success(List.unmodifiable(values));
    } on Object {
      return _invalid();
    }
  }

  Result<FriendIgnoreState> _single(
    Result<JsonObject> result,
    String username, [
    bool? ignored,
  ]) {
    if (result case Failure<JsonObject>(:final failure)) {
      return Failure(failure);
    }
    try {
      final value = _parse((result as Success<JsonObject>).value);
      return value.username == username &&
              (ignored == null || value.ignored == ignored)
          ? Success(value)
          : _invalid();
    } on Object {
      return _invalid();
    }
  }

  @override
  Future<Result<FriendIgnoreState>> read(
    String username, {
    required bool Function() isEligible,
  }) async {
    if (!_username(username)) return _invalid();
    return _single(
      await client.get(
        '$path/${Uri.encodeComponent(username)}',
        isEligible: isEligible,
      ),
      username,
    );
  }

  @override
  Future<Result<FriendIgnoreState>> set(
    String username, {
    required bool ignored,
    required String expectedVersion,
    required bool Function() isEligible,
  }) async {
    if (!_username(username) ||
        !RegExp(r'^[a-f0-9]{64}$').hasMatch(expectedVersion)) {
      return _invalid();
    }
    return _single(
      await client.put(
        '$path/${Uri.encodeComponent(username)}',
        body: {'ignored': ignored, 'expectedVersion': expectedVersion},
        isEligible: isEligible,
      ),
      username,
      ignored,
    );
  }
}

Failure<T> _invalid<T>() => const Failure(
  AppFailure(
    kind: AppFailureKind.unexpected,
    message:
        'The preference result could not be confirmed. Read its current state.',
  ),
);
