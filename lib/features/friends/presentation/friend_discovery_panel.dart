import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'friend_discovery_controller.dart';

final class FriendDiscoveryPanel extends ConsumerStatefulWidget {
  const FriendDiscoveryPanel({
    required this.onOpenProfile,
    required this.onOpenRequests,
    this.home = true,
    this.onSeeAll,
    super.key,
  });
  final Future<void> Function(String) onOpenProfile;
  final Future<void> Function() onOpenRequests;
  final Future<void> Function()? onSeeAll;
  final bool home;
  @override
  ConsumerState<FriendDiscoveryPanel> createState() =>
      _FriendDiscoveryPanelState();
}

final class _FriendDiscoveryPanelState
    extends ConsumerState<FriendDiscoveryPanel>
    with WidgetsBindingObserver {
  FriendDiscoveryController get controller =>
      ref.read(friendDiscoveryControllerProvider(widget.home).notifier);
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) controller.load();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!mounted) return;
    if (state == AppLifecycleState.resumed) {
      controller.load();
    } else {
      controller.clear();
    }
  }

  Future<void> _open(Future<void> Function() action) async {
    controller.clear();
    await action();
    if (mounted) controller.load();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(friendDiscoveryControllerProvider(widget.home));
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'People You May Want To Know',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        if (state.busy)
          Semantics(liveRegion: true, child: const Text('Loading friends…')),
        if (state.failure case final failure?)
          Semantics(liveRegion: true, child: Text(failure.message)),
        if (state.loaded && state.suggestions.isEmpty) ...[
          const Text('No friend recommendations right now'),
          const Text('Try searching for people or check again later.'),
        ],
        for (final person in state.suggestions)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    person.displayName ?? person.username,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  Text('@${person.username}'),
                  Text(person.reason),
                  if (person.sharedInterests.isNotEmpty)
                    Wrap(
                      spacing: 8,
                      children: [
                        for (final name in person.sharedInterests)
                          Chip(label: Text(name)),
                      ],
                    ),
                  TextButton(
                    onPressed: () =>
                        _open(() => widget.onOpenProfile(person.username)),
                    child: const Text('View Profile'),
                  ),
                ],
              ),
            ),
          ),
        Wrap(
          spacing: 8,
          children: [
            OutlinedButton(
              onPressed: state.busy ? null : controller.load,
              child: const Text('Reload'),
            ),
            if (widget.home && widget.onSeeAll != null)
              TextButton(
                onPressed: () => _open(widget.onSeeAll!),
                child: const Text('See all'),
              ),
          ],
        ),
        OutlinedButton.icon(
          icon: const Icon(Icons.person_add_alt),
          onPressed: () => _open(widget.onOpenRequests),
          label: Text(
            state.pendingCount == null
                ? 'Friend requests'
                : 'Friend requests (${state.pendingCount})',
          ),
        ),
        if (state.countFailure != null)
          const Text('Request count is unavailable. Open requests to check.'),
      ],
    );
  }
}
