import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/auth_providers.dart';

/// Only IDs, never stale detail snapshots or persistent browsing history.
final recentEventsProvider =
    NotifierProvider<RecentEventsController, List<String>>(
      RecentEventsController.new,
    );

final class RecentEventsController extends Notifier<List<String>> {
  @override
  List<String> build() {
    ref.watch(authSessionProvider);
    return const [];
  }

  void viewed(String eventId) {
    if (ref.read(currentAuthSubjectProvider) == null) return;
    state = List.unmodifiable(
      [eventId, ...state.where((id) => id != eventId)].take(20),
    );
  }

  void clear() => state = const [];
}
