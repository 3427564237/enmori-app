import '../../../core/presentation/identity_avatar.dart';
import '../../../core/presentation/enmori_localizations.dart';

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
      appBar: AppBar(title: Text(context.tr('Friends', '好友'))),
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
                child: Text(context.tr('My Friends', '我的好友')),
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
              decoration: InputDecoration(
                labelText: context.tr('Username', '用户名'),
                helperText: context.tr(
                  'Enter their full username to find the right person.',
                  '输入完整用户名，准确查找对方。',
                ),
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
              child: Text(context.tr('Find person', '查找用户')),
            ),
            if (state.busy)
              Semantics(
                liveRegion: true,
                child: Text(context.tr('Working…', '处理中…')),
              ),
            if (state.failure case final failure?)
              Semantics(
                liveRegion: true,
                child: Text(localizedFailure(context, failure)),
              ),
            if (state.message case final message?)
              Semantics(
                liveRegion: true,
                child: Text(_requestMessage(context, message)),
              ),
            if (target != null) ...[
              const SizedBox(height: 16),
              Text(
                target.displayName,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              Align(
                alignment: Alignment.centerLeft,
                child: IdentityAvatar(username: target.username),
              ),
              Text('@${target.username}'),
              if (widget.onOpenProfile != null)
                TextButton(
                  onPressed: state.busy
                      ? null
                      : () => _openProfile(target.username),
                  child: Text(context.tr('View Profile', '查看资料')),
                ),
              Text(switch (target.relationship) {
                RelationshipState.self => context.tr('Your account', '你的账号'),
                RelationshipState.alreadyFriends => context.tr(
                  'Already friends',
                  '已是好友',
                ),
                RelationshipState.outgoingRequestPending => context.tr(
                  'Request sent',
                  '请求已发送',
                ),
                RelationshipState.incomingRequestPending => context.tr(
                  'Incoming request pending',
                  '待处理的好友请求',
                ),
                RelationshipState.canSendRequest => context.tr(
                  'You can send a friend request',
                  '可以向对方发送好友请求',
                ),
              }),
              if (target.relationship == RelationshipState.canSendRequest)
                FilledButton(
                  key: const Key('friend-send'),
                  onPressed: state.busy
                      ? null
                      : () => controller.lookup(target.username, send: true),
                  child: Text(context.tr('Send request', '发送请求')),
                ),
            ],
            const SizedBox(height: 24),
            Text(
              context.tr('Current requests', '当前请求'),
              style: Theme.of(context).textTheme.titleLarge,
            ),
            OutlinedButton(
              key: const Key('friend-reload'),
              onPressed: state.busy ? null : () => controller.loadInbox(),
              child: Text(context.tr('Reload requests', '刷新请求')),
            ),
            if (!state.busy && state.failure == null && state.requests.isEmpty)
              Text(
                state.nextCursor == null
                    ? context.tr('No current friend requests.', '当前没有好友请求。')
                    : context.tr(
                        'No current requests on this page.',
                        '本页没有当前请求。',
                      ),
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
                      Align(
                        alignment: Alignment.centerLeft,
                        child: IdentityAvatar(username: request.username),
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
                              child: Text(context.tr('View Profile', '查看资料')),
                            ),
                          FilledButton(
                            key: Key('friend-accept-${request.requestRef}'),
                            onPressed: state.busy
                                ? null
                                : () => controller.act(request, accept: true),
                            child: Text(context.tr('Accept', '接受')),
                          ),
                          OutlinedButton(
                            key: Key('friend-decline-${request.requestRef}'),
                            onPressed: state.busy
                                ? null
                                : () => controller.act(request, accept: false),
                            child: Text(context.tr('Decline', '拒绝')),
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
                child: Text(context.tr('Load more', '加载更多')),
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

String _requestMessage(BuildContext context, String message) =>
    switch (message) {
      'Friend request accepted.' => context.tr(message, '已接受好友请求。'),
      'Friend request declined.' => context.tr(message, '已拒绝好友请求。'),
      'Friend request accepted. Reload requests.' => context.tr(
        message,
        '已接受好友请求，请刷新请求列表。',
      ),
      'Friend request declined. Reload requests.' => context.tr(
        message,
        '已拒绝好友请求，请刷新请求列表。',
      ),
      _ => message,
    };
