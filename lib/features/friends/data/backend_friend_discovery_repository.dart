import '../../../core/network/backend_api_client.dart';
import '../../../core/result/result.dart';
import '../domain/friend_discovery_repository.dart';

final class BackendFriendDiscoveryRepository
    implements FriendDiscoveryRepository {
  BackendFriendDiscoveryRepository(this.client);
  final BackendApiClient client;
  @override
  Future<Result<List<FriendSuggestion>>> suggestions({
    required bool home,
  }) async {
    final response = await client.get(
      '/v1/recommendations/friends?view=${home ? 'home' : 'all'}',
    );
    if (response case Failure<JsonObject>(:final failure)) {
      return Failure(failure);
    }
    try {
      final body = (response as Success<JsonObject>).value,
          rows = body['suggestions'];
      if (body.length != 1 || rows is! List || rows.length > (home ? 2 : 999)) {
        return _invalid();
      }
      final result = <FriendSuggestion>[], names = <String>{};
      for (final row in rows) {
        const keys = {
          'username',
          'displayName',
          'sharedInterests',
          'commonEventCount',
          'reason',
        };
        if (row is! Map ||
            row.length != 5 ||
            !row.keys.every(keys.contains) ||
            row['username'] is! String ||
            row['displayName'] != null && row['displayName'] is! String ||
            row['sharedInterests'] is! List ||
            row['commonEventCount'] is! int ||
            row['reason'] is! String) {
          return _invalid();
        }
        final name = row['username'] as String,
            tags = row['sharedInterests'] as List,
            count = row['commonEventCount'] as int;
        if (!RegExp(r'^[a-z0-9]+(?:_[a-z0-9]+)*$').hasMatch(name) ||
            name.length < 3 ||
            name.length > 30 ||
            !names.add(name) ||
            tags.length > 10 ||
            tags.any((tag) => tag is! String || tag.isEmpty) ||
            count < 0 ||
            count > 2000 ||
            tags.isEmpty && count == 0) {
          return _invalid();
        }
        result.add(
          FriendSuggestion(
            username: name,
            displayName: row['displayName'] as String?,
            sharedInterests: List.unmodifiable(tags.cast<String>()),
            commonEventCount: count,
            reason: row['reason'] as String,
          ),
        );
      }
      return Success(List.unmodifiable(result));
    } catch (_) {
      return _invalid();
    }
  }

  @override
  Future<Result<int>> pendingCount() async {
    final response = await client.get('/v1/me/friends/summary');
    if (response case Failure<JsonObject>(:final failure)) {
      return Failure(failure);
    }
    final body = (response as Success<JsonObject>).value,
        count = body['pendingRequestCount'];
    return body.length == 1 && count is int && count >= 0 && count < 1000
        ? Success(count)
        : _invalid();
  }
}

Failure<T> _invalid<T>() => const Failure(
  AppFailure(
    kind: AppFailureKind.unexpected,
    message: 'Friend information is unavailable. Reload to check again.',
  ),
);
