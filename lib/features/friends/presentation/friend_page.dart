import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../domain/friend_repository.dart';
import 'friend_controller.dart';
import '../../auth/auth_providers.dart';

final class FriendPage extends ConsumerStatefulWidget {
  const FriendPage({
    super.key,
    this.onOpenMyFriends,
    this.onOpenProfile,
    this.initialUsername,
  });
  final VoidCallback? onOpenMyFriends;
  final Future<void> Function(String)? onOpenProfile;
  final String? initialUsername;
  @override
  ConsumerState<FriendPage> createState() => _FriendPageState();
}

final class _FriendPageState extends ConsumerState<FriendPage>
    with WidgetsBindingObserver {
  final _username = TextEditingController();
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _username.text = widget.initialUsername ?? '';
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted) return;
      final session = ref.read(authSessionProvider).asData?.value;
      final controller = ref.read(friendControllerProvider.notifier);
      if (widget.initialUsername != null) {
        await controller.lookup(widget.initialUsername!);
      }
      if (mounted &&
          identical(session, ref.read(authSessionProvider).asData?.value)) {
        await controller.loadInbox();
      }
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _username.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!mounted) return;
    ref.invalidate(friendControllerProvider);
    if (state == AppLifecycleState.resumed) {
      ref.read(friendControllerProvider.notifier).loadInbox();
    }
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
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          padding: const EdgeInsets.all(16),
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
              autocorrect: false,
              enableSuggestions: false,
              textInputAction: TextInputAction.search,
              onSubmitted: (_) {
                FocusScope.of(context).unfocus();
                controller.lookup(_username.text);
              },
              decoration: const InputDecoration(
                labelText: 'Username',
                helperText:
                    'Enter their full username to find the right person.',
                helperMaxLines: 2,
                prefixIcon: Icon(Icons.alternate_email),
              ),
            ),
            const SizedBox(height: 12),
            FilledButton(
              key: const Key('friend-lookup'),
              onPressed: state.busy
                  ? null
                  : () {
                      FocusScope.of(context).unfocus();
                      controller.lookup(_username.text);
                    },
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
              Text(
                target.displayName,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              Text('@${target.username}'),
              if (widget.onOpenProfile != null)
                TextButton(
                  onPressed: state.busy
                      ? null
                      : () => _openProfile(target.username),
                  child: const Text('View Profile'),
                ),
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
                      Text(
                        request.displayName,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      Text('@${request.username}'),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          if (widget.onOpenProfile != null)
                            TextButton(
                              onPressed: state.busy
                                  ? null
                                  : () => _openProfile(request.username),
                              child: const Text('View Profile'),
                            ),
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

  Future<void> _openProfile(String username) async {
    final session = ref.read(authSessionProvider).asData?.value;
    ref.invalidate(friendControllerProvider);
    await widget.onOpenProfile?.call(username);
    if (mounted &&
        identical(session, ref.read(authSessionProvider).asData?.value)) {
      await ref.read(friendControllerProvider.notifier).loadInbox();
    }
  }
}
