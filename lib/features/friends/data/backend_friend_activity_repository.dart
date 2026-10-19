import '../../../core/network/backend_api_client.dart';
import '../../../core/result/result.dart';
import '../domain/friend_activity_repository.dart';

final class BackendFriendActivityRepository
    implements FriendActivityRepository {
  BackendFriendActivityRepository(this.client);
  final BackendApiClient client;
  @override
  Future<Result<List<FriendActivityItem>>> read({
    required bool home,
    FriendActivityType? category,
  }) async {
    final response = await client.get(
      '/v1/me/friends/activity?view=${home ? 'home' : 'all'}&category=${category?.wire ?? 'all'}',
    );
    if (response case Failure<JsonObject>(:final failure)) {
      return Failure(failure);
    }
    final body = (response as Success<JsonObject>).value;
    try {
      if (body.length != 1 || body['activities'] is! List) {
        throw const FormatException();
      }
      final rows = <FriendActivityItem>[], seen = <String>{};
      for (final raw in body['activities'] as List) {
        if (raw is! Map ||
            raw.length != 5 ||
            !raw.keys.toSet().containsAll({
              'type',
              'sourceRecordId',
              'occurredAt',
              'username',
              'displayName',
            }) ||
            raw['sourceRecordId'] is! String ||
            raw['username'] is! String ||
            raw['occurredAt'] is! String ||
            (raw['displayName'] != null && raw['displayName'] is! String)) {
          throw const FormatException();
        }
        final type = FriendActivityType.values.singleWhere(
          (t) => t.wire == raw['type'],
        );
        if (category != null && type != category) throw const FormatException();
        if (!seen.add('${type.wire}/${raw['sourceRecordId']}')) {
          throw const FormatException();
        }
        rows.add(
          FriendActivityItem(
            type: type,
            sourceRecordId: raw['sourceRecordId'] as String,
            occurredAt: DateTime.parse(raw['occurredAt'] as String),
            username: raw['username'] as String,
            displayName: raw['displayName'] as String?,
          ),
        );
      }
      if (home && rows.length > 2) throw const FormatException();
      return Success(List.unmodifiable(rows));
    } catch (_) {
      return const Failure(
        AppFailure(
          kind: AppFailureKind.unexpected,
          message: 'Friends Activity is unavailable. Reload to try again.',
        ),
      );
    }
  }
}
