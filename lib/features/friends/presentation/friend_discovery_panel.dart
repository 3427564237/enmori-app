import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/section_heading.dart';
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
      if (mounted &&
          !ref.read(friendDiscoveryControllerProvider(widget.home)).loaded) {
        controller.load();
      }
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
        SectionHeading(
          title: 'People to know',
          actions: [
            if (widget.home &&
                widget.onSeeAll != null &&
                state.suggestions.isNotEmpty)
              TextButton(
                onPressed: () => _open(widget.onSeeAll!),
                child: const Text('See all'),
              ),
            IconButton(
              tooltip: 'Reload recommendations',
              onPressed: state.busy || locked ? null : controller.load,
              icon: const Icon(Icons.refresh),
            ),
            PopupMenuButton<String>(
              tooltip: 'Recommendation options',
              onSelected: (action) => _open(
                action == 'requests'
                    ? widget.onOpenRequests
                    : () => Navigator.of(context).push<void>(
                        MaterialPageRoute(
                          builder: (_) => const IgnoredPeoplePage(),
                        ),
                      ),
              ),
              itemBuilder: (_) => [
                const PopupMenuItem(
                  value: 'ignored',
                  child: Text('Ignored people'),
                ),
                PopupMenuItem(
                  value: 'requests',
                  child: Text(
                    state.pendingCount == null
                        ? 'Friend requests'
                        : 'Friend requests (${state.pendingCount})',
                  ),
                ),
                if (state.countFailure != null)
                  const PopupMenuItem(
                    enabled: false,
                    child: Text(
                      'Request count is unavailable. Open requests to check.',
                    ),
                  ),
              ],
            ),
          ],
        ),
        if (state.busy)
          const LinearProgressIndicator(semanticsLabel: 'Loading friends'),
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
        if (state.loaded && state.suggestions.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  Icons.people_outline,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('No friend recommendations right now'),
                      const SizedBox(height: 4),
                      Text(
                        'Find someone you know to get started.',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      TextButton(
                        onPressed: () => _open(widget.onOpenRequests),
                        child: const Text('Find people'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        for (final person in state.suggestions)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const CircleAvatar(
                      child: Icon(Icons.person_outline),
                    ),
                    title: Text(person.displayName ?? person.username),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '@${person.username}',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                        const SizedBox(height: 4),
                        Text(person.reason),
                        if (person.sharedInterests.isNotEmpty)
                          Text(
                            person.sharedInterests.join(' · '),
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                      ],
                    ),
                    onTap: () =>
                        _open(() => widget.onOpenProfile(person.username)),
                  ),
                ),
                IconButton(
                  tooltip: 'Ignore @${person.username}',
                  icon: const Icon(Icons.person_remove_outlined),
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
                                  persist: MediaQuery.accessibleNavigationOf(
                                    context,
                                  ),
                                  content: const Text('Recommendation ignored'),
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
                ),
              ],
            ),
          ),
      ],
    );
  }
}
