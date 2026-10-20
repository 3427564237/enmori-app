import 'package:flutter/material.dart';

import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'my_friends_controller.dart';
import '../../auth/auth_providers.dart';

final class MyFriendsListPage extends ConsumerStatefulWidget {
  const MyFriendsListPage({this.onOpenFriend, super.key});
  final FutureOr<void> Function(String)? onOpenFriend;

  @override
  ConsumerState<MyFriendsListPage> createState() => _MyFriendsListPageState();
}

final class _MyFriendsListPageState extends ConsumerState<MyFriendsListPage>
    with WidgetsBindingObserver {
  final _query = TextEditingController();
  final _queryFocus = FocusNode();
  bool _specialCareOnly = false;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) ref.read(myFriendsControllerProvider.notifier).load();
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!mounted) return;
    final controller = ref.read(myFriendsControllerProvider.notifier);
    if (state == AppLifecycleState.resumed) {
      controller.load();
    } else {
      controller.clear();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _query.dispose();
    _queryFocus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(myFriendsControllerProvider, (previous, next) {
      if (_query.text != next.query) _query.text = next.query;
      if (next.queryError != null) _queryFocus.requestFocus();
    });
    final state = ref.watch(myFriendsControllerProvider);
    final controller = ref.read(myFriendsControllerProvider.notifier);
    return Scaffold(
      appBar: AppBar(title: const Text('My Friends')),
      body: SafeArea(
        child: ListView(
          key: const Key('route-my-friends'),
          padding: const EdgeInsets.all(24),
          children: [
            TextField(
              key: const Key('my-friends-search-query'),
              controller: _query,
              focusNode: _queryFocus,
              decoration: InputDecoration(
                labelText: 'Search by display name',
                errorText: state.queryError,
              ),
              textInputAction: TextInputAction.search,
              onChanged: controller.editQuery,
              onSubmitted: (_) => controller.search(),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 12,
              runSpacing: 8,
              children: [
                FilledButton(
                  key: const Key('my-friends-search'),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(64, 48),
                  ),
                  onPressed: () {
                    _queryFocus.unfocus();
                    controller.search();
                  },
                  child: const Text('Search'),
                ),
                OutlinedButton(
                  key: const Key('my-friends-clear-search'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(64, 48),
                  ),
                  onPressed: () {
                    _queryFocus.unfocus();
                    controller.clearSearch();
                  },
                  child: const Text('Clear'),
                ),
              ],
            ),
            OutlinedButton(
              key: const Key('my-friends-reload'),
              style: OutlinedButton.styleFrom(minimumSize: const Size(64, 48)),
              onPressed: state.busy ? null : () => controller.load(),
              child: const Text('Reload'),
            ),
            if (state.busy)
              Semantics(liveRegion: true, child: const Text('Working…')),
            if (state.failure case final failure?)
              Semantics(liveRegion: true, child: Text(failure.message)),
            if (state.loaded && state.friends.isEmpty)
              Text(
                state.searching
                    ? 'No matching friends on this page.'
                    : 'No friends available on this page.',
              ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Special Care only'),
              subtitle: const Text(
                'Filter the current page. Use Next page to continue.',
              ),
              value: _specialCareOnly,
              onChanged: (value) => setState(() => _specialCareOnly = value),
            ),
            if (state.loaded &&
                _specialCareOnly &&
                !state.friends.any((friend) => friend.specialCare))
              const Text('No Special Care friends on this page.'),
            for (final friend in state.friends.where(
              (friend) => !_specialCareOnly || friend.specialCare,
            ))
              Card(
                child: widget.onOpenFriend != null
                    ? ListTile(
                        key: Key('my-friend-profile-${friend.username}'),
                        title: Text(friend.displayName),
                        leading: friend.specialCare
                            ? const Icon(
                                Icons.star,
                                semanticLabel: 'Special Care',
                              )
                            : null,
                        subtitle: Text('Username: ${friend.username}'),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () async {
                          final session = ref
                              .read(authSessionProvider)
                              .asData
                              ?.value;
                          controller.clear();
                          await widget.onOpenFriend?.call(friend.username);
                          if (mounted &&
                              identical(
                                session,
                                ref.read(authSessionProvider).asData?.value,
                              )) {
                            await controller.load();
                          }
                        },
                      )
                    : Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(friend.displayName),
                            Text('Username: ${friend.username}'),
                          ],
                        ),
                      ),
              ),
            if (state.nextCursor != null)
              OutlinedButton(
                key: const Key('my-friends-next'),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(64, 48),
                ),
                onPressed: state.busy
                    ? null
                    : () => controller.load(next: true),
                child: const Text('Next page'),
              ),
          ],
        ),
      ),
    );
  }
}
