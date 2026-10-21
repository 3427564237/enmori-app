import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'friend_discovery_controller.dart';
import '../../auth/auth_providers.dart';
import 'friend_ignore_controller.dart';
import 'ignored_people_page.dart';

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
  ScaffoldFeatureController<SnackBar, SnackBarClosedReason>? _snack;
  void _closeSnack() {
    final snack = _snack;
    _snack = null;
    snack?.close();
  }

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
    // Do not mutate the ancestor Messenger while the tree is unmounting.
    // Navigation/session/lifecycle paths close the live hint beforehand.
    _snack = null;
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!mounted) return;
    if (state == AppLifecycleState.resumed) {
      controller.load();
    } else {
      _closeSnack();
      ref.read(friendIgnoreControllerProvider.notifier).clearPrivateViews();
      controller.clear();
    }
  }

  Future<void> _open(Future<void> Function() action) async {
    _closeSnack();
    controller.clear();
    await action();
    if (mounted) controller.load();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(authSessionProvider, (previous, next) {
      if (!identical(previous?.asData?.value, next.asData?.value)) {
        _closeSnack();
      }
    });
    ref.listen(friendIgnoreControllerProvider, (previous, next) {
      if ((previous?.generation != next.generation || previous?.busy == true) &&
          !next.busy &&
          next.unresolvedUsername == null) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) controller.load();
        });
      }
    });
    final state = ref.watch(friendDiscoveryControllerProvider(widget.home));
    final preference = ref.watch(friendIgnoreControllerProvider);
    final preferences = ref.read(friendIgnoreControllerProvider.notifier);
    final renderedEpoch = preferences.epoch;
    final locked = preference.busy || preference.unresolvedUsername != null;
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
        if (preference.busy)
          Semantics(
            liveRegion: true,
            child: const Text('Saving or checking preferences…'),
          ),
        if (preference.failure case final failure?)
          Semantics(liveRegion: true, child: Text(failure.message)),
        if (preference.unresolvedUsername != null) ...[
          const Text(
            'The last preference change is unconfirmed. Read the current state before another change.',
          ),
          OutlinedButton(
            onPressed: preference.busy ? null : preferences.checkCurrent,
            child: const Text('Read current state'),
          ),
        ],
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
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 4,
                    children: [
                      TextButton(
                        onPressed: () =>
                            _open(() => widget.onOpenProfile(person.username)),
                        child: const Text('View Profile'),
                      ),
                      TextButton(
                        onPressed: locked
                            ? null
                            : () async {
                                final undo = await preferences.ignore(
                                  person.username,
                                  person.ignoreVersion,
                                  expectedEpoch: renderedEpoch,
                                );
                                if (!mounted ||
                                    !context.mounted ||
                                    undo == null ||
                                    !preferences.canUndo(undo)) {
                                  return;
                                }
                                _closeSnack();
                                final snack = ScaffoldMessenger.of(context)
                                    .showSnackBar(
                                      SnackBar(
                                        // Keep the normal SnackBar duration, while
                                        // accessible navigation retains the action.
                                        persist:
                                            MediaQuery.accessibleNavigationOf(
                                              context,
                                            ),
                                        content: const Text(
                                          'Recommendation ignored',
                                        ),
                                        action: SnackBarAction(
                                          label: 'Undo',
                                          onPressed: () {
                                            if (mounted) preferences.undo(undo);
                                          },
                                        ),
                                      ),
                                    );
                                _snack = snack;
                                snack.closed.then((_) {
                                  if (identical(_snack, snack)) _snack = null;
                                });
                              },
                        child: Text('Ignore @${person.username}'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        Wrap(
          spacing: 8,
          children: [
            OutlinedButton(
              onPressed: state.busy || locked ? null : controller.load,
              child: const Text('Reload'),
            ),
            if (widget.home && widget.onSeeAll != null)
              TextButton(
                onPressed: () => _open(widget.onSeeAll!),
                child: const Text('See all'),
              ),
            TextButton(
              onPressed: () => _open(
                () => Navigator.of(context).push<void>(
                  MaterialPageRoute(builder: (_) => const IgnoredPeoplePage()),
                ),
              ),
              child: const Text('Ignored people'),
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
