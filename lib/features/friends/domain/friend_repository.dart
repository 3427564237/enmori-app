import '../../../core/result/result.dart';

enum RelationshipState {
  self,
  alreadyFriends,
  outgoingRequestPending,
  incomingRequestPending,
  canSendRequest,
}

final class FriendTarget {
  const FriendTarget({
    required this.username,
    required this.displayName,
    required this.relationship,
  });
  final String username, displayName;
  final RelationshipState relationship;
}

final class FriendRequest {
  const FriendRequest({
    required this.username,
    required this.displayName,
    required this.requestRef,
  });
  final String username, displayName, requestRef;
}

final class FriendInbox {
  const FriendInbox({required this.requests, this.nextCursor});
  final List<FriendRequest> requests;
  final String? nextCursor;
}

abstract interface class FriendRepository {
  Future<Result<FriendTarget>> lookup(String username, {bool send = false});
  Future<Result<FriendInbox>> inbox({String? cursor});
  Future<Result<String>> act(String requestRef, {required bool accept});
}
