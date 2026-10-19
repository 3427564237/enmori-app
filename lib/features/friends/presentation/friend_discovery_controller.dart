import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/providers.dart';
import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../../auth/domain/auth_repository.dart';
import '../data/backend_friend_discovery_repository.dart';
import '../domain/friend_discovery_repository.dart';

final friendDiscoveryRepositoryProvider = Provider<FriendDiscoveryRepository>(
  (ref) =>
      BackendFriendDiscoveryRepository(ref.watch(backendApiClientProvider)),
);
final friendDiscoveryControllerProvider = NotifierProvider.autoDispose
    .family<FriendDiscoveryController, FriendDiscoveryState, bool>(
      FriendDiscoveryController.new,
    );

final class FriendDiscoveryState {
  const FriendDiscoveryState({
    this.suggestions = const [],
    this.pendingCount,
    this.busy = false,
    this.loaded = false,
    this.failure,
    this.countFailure,
  });
  final List<FriendSuggestion> suggestions;
  final int? pendingCount;
  final bool busy, loaded;
  final AppFailure? failure, countFailure;
}

final class FriendDiscoveryController extends Notifier<FriendDiscoveryState> {
  FriendDiscoveryController(this.home);
  final bool home;
  int _epoch = 0;
  @override
  FriendDiscoveryState build() {
    ref.watch(
      authSessionProvider.select(
        (v) => v.asData?.value is AuthSessionAuthenticated
            ? v.asData?.value
            : null,
      ),
    );
    _epoch++;
    ref.onDispose(() => _epoch++);
    return const FriendDiscoveryState();
  }

  void clear() {
    _epoch++;
    state = const FriendDiscoveryState();
  }

  Future<void> load() async {
    if (state.busy) return;
    final epoch = ++_epoch,
        repository = ref.read(friendDiscoveryRepositoryProvider);
    state = const FriendDiscoveryState(busy: true);
    // Independent responses keep count availability separate from suggestions.
    final results = await Future.wait<Object>([
      repository.suggestions(home: home),
      repository.pendingCount(),
    ]);
    if (!ref.mounted || epoch != _epoch) return;
    final suggestions = results[0] as Result<List<FriendSuggestion>>,
        count = results[1] as Result<int>;
    state = FriendDiscoveryState(
      suggestions: suggestions is Success<List<FriendSuggestion>>
          ? suggestions.value
          : const [],
      pendingCount: count is Success<int> ? count.value : null,
      loaded: suggestions is Success<List<FriendSuggestion>>,
      failure: suggestions is Failure<List<FriendSuggestion>>
          ? suggestions.failure
          : null,
      countFailure: count is Failure<int> ? count.failure : null,
    );
  }
}
