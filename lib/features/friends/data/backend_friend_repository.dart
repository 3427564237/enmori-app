import 'dart:convert';

import '../../../core/network/backend_api_client.dart';
import '../../../core/result/result.dart';
import '../domain/friend_repository.dart';

final class BackendFriendRepository implements FriendRepository {
  BackendFriendRepository(this.client);
  final BackendApiClient client;
  static final _usernamePattern = RegExp(
    r'^[a-z0-9](?!.*__)[a-z0-9_]{1,28}[a-z0-9]$',
  );
  static const _reservedUsernames = {
    'admin',
    'administrator',
    'support',
    'system',
    'moderator',
    'root',
    'enmori',
  };
  static final _unsafeName = RegExp(
    r'[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]',
    unicode: true,
  );
  static final _cursorPattern = RegExp(r'^[A-Za-z0-9_-]{48}$');
  static final _entryReferencePattern = RegExp(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
  );

  // Response values must already be canonical; do not normalize server data.
  static bool _validUsername(String value) {
    final match = _usernamePattern.firstMatch(value);
    return match != null &&
        match.end == value.length &&
        !_reservedUsernames.contains(value) &&
        !value.startsWith('enmori_');
  }

  static bool _validDisplayName(String value) =>
      value.isNotEmpty &&
      value.trim() == value &&
      value.runes.length <= 50 &&
      !value.runes.any((rune) => rune >= 0xd800 && rune <= 0xdfff) &&
      !_unsafeName.hasMatch(value);

  static bool _validCursor(String value) {
    if (value.length != 48 || !_cursorPattern.hasMatch(value)) return false;
    try {
      final reference = utf8.decode(base64Url.decode(value));
      return reference.length == 36 &&
          _entryReferencePattern.hasMatch(reference) &&
          base64Url.encode(utf8.encode(reference)) == value;
    } on FormatException {
      return false;
    }
  }

  @override
  Future<Result<MyFriendsPage>> listFriends({String? cursor}) async {
    final result = await client.get(
      '/v1/me/friends${cursor == null ? '' : '?cursor=${Uri.encodeQueryComponent(cursor)}'}',
    );
    if (result case Failure<JsonObject>(:final failure)) {
      return Failure(failure);
    }
    final data = (result as Success<JsonObject>).value;
    final rows = data['friends'], next = data['nextCursor'];
    if (data.length != 2 ||
        !data.containsKey('nextCursor') ||
        rows is! List ||
        rows.length > 20 ||
        (next != null && (next is! String || !_validCursor(next)))) {
      return invalid();
    }
    final friends = <MyFriend>[];
    for (final row in rows) {
      if (row is! Map<String, dynamic> ||
          row.length != 2 ||
          row['username'] is! String ||
          row['displayName'] is! String ||
          !_validUsername(row['username'] as String) ||
          !_validDisplayName(row['displayName'] as String)) {
        return invalid();
      }
      friends.add(
        MyFriend(
          username: row['username'] as String,
          displayName: row['displayName'] as String,
        ),
      );
    }
    return Success(
      MyFriendsPage(
        friends: List.unmodifiable(friends),
        nextCursor: next as String?,
      ),
    );
  }

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
