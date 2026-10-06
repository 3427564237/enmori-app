import '../../../core/network/backend_api_client.dart';
import '../../../core/result/result.dart';
import '../domain/friend_repository.dart';

final class BackendFriendRepository implements FriendRepository {
  BackendFriendRepository(this.client);
  final BackendApiClient client;
  Failure<T> invalid<T>() => Failure<T>(
    const AppFailure(
      kind: AppFailureKind.unexpected,
      message: 'The service returned an invalid friend result.',
    ),
  );
  @override
  Future<Result<FriendTarget>> lookup(
    String username, {
    bool send = false,
  }) async {
    final result = await client.post(
      send ? '/v1/friend-requests' : '/v1/friends/lookup',
      body: {'username': username},
    );
    if (result case Failure<JsonObject>(:final failure)) {
      return Failure(failure);
    }
    final data = (result as Success<JsonObject>).value['target'];
    if (data is! Map<String, dynamic> ||
        data.keys.any(
          (key) =>
              !['username', 'displayName', 'relationshipState'].contains(key),
        ) ||
        data['username'] is! String ||
        data['displayName'] is! String ||
        (data['displayName'] as String).isEmpty) {
      return invalid();
    }
    final state = switch (data['relationshipState']) {
      'self' => RelationshipState.self,
      'already_friends' => RelationshipState.alreadyFriends,
      'outgoing_request_pending' => RelationshipState.outgoingRequestPending,
      'incoming_request_pending' => RelationshipState.incomingRequestPending,
      'can_send_request' => RelationshipState.canSendRequest,
      _ => null,
    };
    return state == null
        ? invalid()
        : Success(
            FriendTarget(
              username: data['username'] as String,
              displayName: data['displayName'] as String,
              relationship: state,
            ),
          );
  }

  @override
  Future<Result<FriendInbox>> inbox({String? cursor}) async {
    final result = await client.get(
      '/v1/me/friend-requests${cursor == null ? '' : '?cursor=${Uri.encodeQueryComponent(cursor)}'}',
    );
    if (result case Failure<JsonObject>(:final failure)) {
      return Failure(failure);
    }
    final data = (result as Success<JsonObject>).value;
    final rows = data['requests'], next = data['nextCursor'];
    if (rows is! List ||
        rows.length > 20 ||
        !data.containsKey('nextCursor') ||
        next != null && next is! String) {
      return invalid();
    }
    final requests = <FriendRequest>[];
    for (final row in rows) {
      if (row is! Map<String, dynamic> ||
          row.keys.any(
            (key) => !['username', 'displayName', 'requestRef'].contains(key),
          ) ||
          row['username'] is! String ||
          row['displayName'] is! String ||
          row['requestRef'] is! String) {
        return invalid();
      }
      requests.add(
        FriendRequest(
          username: row['username'] as String,
          displayName: row['displayName'] as String,
          requestRef: row['requestRef'] as String,
        ),
      );
    }
    return Success(
      FriendInbox(
        requests: List.unmodifiable(requests),
        nextCursor: next as String?,
      ),
    );
  }

  @override
  Future<Result<String>> act(String requestRef, {required bool accept}) async {
    final result = await client.post(
      '/v1/friend-requests/${Uri.encodeComponent(requestRef)}/${accept ? 'accept' : 'decline'}',
    );
    if (result case Failure<JsonObject>(:final failure)) {
      return Failure(failure);
    }
    final value = (result as Success<JsonObject>).value['result'];
    return value == (accept ? 'accepted' : 'declined')
        ? Success(value as String)
        : invalid();
  }
}
