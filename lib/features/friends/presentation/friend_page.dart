import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../domain/friend_repository.dart';
import 'friend_controller.dart';

final class FriendPage extends ConsumerStatefulWidget {
  const FriendPage({super.key, this.onOpenMyFriends});
  final VoidCallback? onOpenMyFriends;
  @override
  ConsumerState<FriendPage> createState() => _FriendPageState();
}

final class _FriendPageState extends ConsumerState<FriendPage> {
  final _username = TextEditingController();
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) ref.read(friendControllerProvider.notifier).loadInbox();
    });
  }

  @override
  void dispose() {
    _username.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(friendControllerProvider),
        controller = ref.read(friendControllerProvider.notifier),
        target = state.target;
    return Scaffold(
      appBar: AppBar(title: const Text('Friends')),
      body: SafeArea(
        child: ListView(
          key: const Key('route-friends'),
          padding: const EdgeInsets.all(24),
          children: [
            if (widget.onOpenMyFriends != null)
              OutlinedButton(
                key: const Key('open-my-friends'),
                onPressed: widget.onOpenMyFriends,
                child: const Text('My Friends'),
              ),
            TextField(
              key: const Key('friend-username'),
              controller: _username,
              enabled: !state.busy,
              decoration: const InputDecoration(labelText: 'Exact Username'),
            ),
            const SizedBox(height: 12),
            FilledButton(
              key: const Key('friend-lookup'),
              onPressed: state.busy
                  ? null
                  : () => controller.lookup(_username.text),
              child: const Text('Find person'),
            ),
            if (state.busy)
              Semantics(liveRegion: true, child: Text('Working…')),
            if (state.failure case final failure?)
              Semantics(liveRegion: true, child: Text(failure.message)),
            if (state.message case final message?)
              Semantics(liveRegion: true, child: Text(message)),
            if (target != null) ...[
              const SizedBox(height: 16),
              Text(target.displayName),
              Text('Username: ${target.username}'),
              Text(switch (target.relationship) {
                RelationshipState.self => 'Your account',
                RelationshipState.alreadyFriends => 'Already friends',
                RelationshipState.outgoingRequestPending => 'Request sent',
                RelationshipState.incomingRequestPending =>
                  'Incoming request pending',
                RelationshipState.canSendRequest =>
                  'You can send a friend request',
              }),
              if (target.relationship == RelationshipState.canSendRequest)
                FilledButton(
                  key: const Key('friend-send'),
                  onPressed: state.busy
                      ? null
                      : () => controller.lookup(target.username, send: true),
                  child: const Text('Send request'),
                ),
            ],
            const SizedBox(height: 24),
            Text(
              'Current requests',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            OutlinedButton(
              key: const Key('friend-reload'),
              onPressed: state.busy ? null : () => controller.loadInbox(),
              child: const Text('Reload requests'),
            ),
            if (!state.busy && state.failure == null && state.requests.isEmpty)
              Text(
                state.nextCursor == null
                    ? 'No current friend requests.'
                    : 'No current requests on this page.',
              ),
            ...state.requests.map(
              (request) => Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(request.displayName),
                      Text('Username: ${request.username}'),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          FilledButton(
                            key: Key('friend-accept-${request.requestRef}'),
                            onPressed: state.busy
                                ? null
                                : () => controller.act(request, accept: true),
                            child: const Text('Accept'),
                          ),
                          OutlinedButton(
                            key: Key('friend-decline-${request.requestRef}'),
                            onPressed: state.busy
                                ? null
                                : () => controller.act(request, accept: false),
                            child: const Text('Decline'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
            if (state.nextCursor != null)
              OutlinedButton(
                key: const Key('friend-more'),
                onPressed: state.busy
                    ? null
                    : () => controller.loadInbox(more: true),
                child: const Text('Load more'),
              ),
          ],
        ),
      ),
    );
  }
}
