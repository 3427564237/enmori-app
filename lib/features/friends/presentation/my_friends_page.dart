import 'package:flutter/material.dart';

import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'my_friends_controller.dart';
import '../../../core/presentation/status_panel.dart';
import '../../auth/auth_providers.dart';

final class MyFriendsListPage extends ConsumerStatefulWidget {
  const MyFriendsListPage({
    this.onOpenFriend,
    this.embedded = false,
    this.onFindPeople,
    super.key,
  });
  final FutureOr<void> Function(String)? onOpenFriend;
  final bool embedded;
  final VoidCallback? onFindPeople;

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
    final list = ListView(
      key: const PageStorageKey('route-my-friends'),
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      padding: const EdgeInsets.all(16),
      children: [
        TextField(
          key: const Key('my-friends-search-query'),
          controller: _query,
          focusNode: _queryFocus,
          decoration: InputDecoration(
            labelText: 'Search by display name',
            prefixIcon: const Icon(Icons.search),
            errorText: state.queryError,
            suffixIcon: IconButton(
              key: const Key('my-friends-search'),
              tooltip: 'Search friends',
              onPressed: state.busy
                  ? null
                  : () {
                      _queryFocus.unfocus();
                      controller.search();
                    },
              icon: const Icon(Icons.arrow_forward),
            ),
          ),
          textInputAction: TextInputAction.search,
          onChanged: controller.editQuery,
          onSubmitted: (_) {
            _queryFocus.unfocus();
            controller.search();
          },
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            if (state.friends.isNotEmpty || _specialCareOnly)
              FilterChip(
                label: const Text('Special Care'),
                selected: _specialCareOnly,
                onSelected: (value) => setState(() => _specialCareOnly = value),
              ),
            if (state.searching || state.query.isNotEmpty)
              TextButton(
                key: const Key('my-friends-clear-search'),
                onPressed: state.busy
                    ? null
                    : () {
                        _queryFocus.unfocus();
                        controller.clearSearch();
                      },
                child: const Text('Clear search'),
              ),
            IconButton(
              key: const Key('my-friends-reload'),
              tooltip: 'Refresh friends',
              onPressed: state.busy ? null : () => controller.load(),
              icon: const Icon(Icons.refresh),
            ),
          ],
        ),
        if (state.busy)
          const LinearProgressIndicator(semanticsLabel: 'Loading friends'),
        if (state.failure case final failure?)
          StatusPanel(
            title: 'Friends couldn’t be loaded',
            body: failure.message,
            icon: Icons.cloud_off_outlined,
            isError: true,
            action: TextButton(
              onPressed: state.busy ? null : () => controller.load(),
              child: const Text('Try again'),
            ),
          ),
        if (state.loaded && state.friends.isEmpty)
          StatusPanel(
            title: state.searching
                ? 'No matching friends on this page.'
                : 'Make room for familiar faces',
            body: state.searching
                ? 'Try another display name, or clear your search.'
                : 'Find people from Friends to start connecting.',
            icon: Icons.people_outline,
            action: !state.searching && widget.onFindPeople != null
                ? TextButton(
                    onPressed: widget.onFindPeople,
                    child: const Text('Find people'),
                  )
                : null,
          ),
        if (state.searching &&
            !state.loaded &&
            !state.busy &&
            state.failure == null &&
            state.queryError == null)
          const Text('Tap Search to look for this display name.'),
        if (state.loaded &&
            state.friends.isNotEmpty &&
            _specialCareOnly &&
            !state.friends.any((friend) => friend.specialCare))
          const Text('No Special Care friends on this page.'),
        for (final friend in state.friends.where(
          (friend) => !_specialCareOnly || friend.specialCare,
        ))
          widget.onOpenFriend != null
              ? ListTile(
                  key: Key('my-friend-profile-${friend.username}'),
                  title: Text(friend.displayName),
                  leading: CircleAvatar(
                    child: Icon(
                      friend.specialCare ? Icons.star : Icons.person_outline,
                      semanticLabel: friend.specialCare ? 'Special Care' : null,
                    ),
                  ),
                  subtitle: Text('@${friend.username}'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () async {
                    final session = ref.read(authSessionProvider).asData?.value;
                    controller.clear(preserveQuery: true);
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
                      Text('@${friend.username}'),
                    ],
                  ),
                ),
        if (state.nextCursor != null)
          OutlinedButton(
            key: const Key('my-friends-next'),
            style: OutlinedButton.styleFrom(minimumSize: const Size(64, 48)),
            onPressed: state.busy ? null : () => controller.load(next: true),
            child: const Text('Next page'),
          ),
      ],
    );
    if (widget.embedded) return list;
    return Scaffold(
      appBar: AppBar(title: const Text('My Friends')),
      body: SafeArea(child: list),
    );
  }
}
