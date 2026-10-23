import '../../../core/result/result.dart';

final class FriendIgnoreState {
  const FriendIgnoreState({
    required this.username,
    required this.displayName,
    required this.ignored,
    required this.version,
  });
  final String username, version;
  final String? displayName;
  final bool ignored;
}

abstract interface class FriendIgnoreRepository {
  Future<Result<List<FriendIgnoreState>>> list({
    required bool Function() isEligible,
  });
  Future<Result<FriendIgnoreState>> read(
    String username, {
    required bool Function() isEligible,
  });
  Future<Result<FriendIgnoreState>> set(
    String username, {
    required bool ignored,
    required String expectedVersion,
    required bool Function() isEligible,
  });
}
