import '../../../core/result/result.dart';

final class FriendSuggestion {
  const FriendSuggestion({
    required this.username,
    required this.displayName,
    required this.sharedInterests,
    required this.commonEventCount,
    required this.reason,
  });
  final String username, reason;
  final String? displayName;
  final List<String> sharedInterests;
  final int commonEventCount;
}

abstract interface class FriendDiscoveryRepository {
  Future<Result<List<FriendSuggestion>>> suggestions({required bool home});
  Future<Result<int>> pendingCount();
}
