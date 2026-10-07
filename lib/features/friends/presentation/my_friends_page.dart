import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'my_friends_controller.dart';

final class MyFriendsListPage extends ConsumerStatefulWidget {
  const MyFriendsListPage({super.key});

  @override
  ConsumerState<MyFriendsListPage> createState() => _MyFriendsListPageState();
}

final class _MyFriendsListPageState extends ConsumerState<MyFriendsListPage>
    with WidgetsBindingObserver {
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
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(myFriendsControllerProvider);
    final controller = ref.read(myFriendsControllerProvider.notifier);
    return Scaffold(
      appBar: AppBar(title: const Text('My Friends')),
      body: SafeArea(
        child: ListView(
          key: const Key('route-my-friends'),
          padding: const EdgeInsets.all(24),
          children: [
            OutlinedButton(
              key: const Key('my-friends-reload'),
              onPressed: state.busy ? null : () => controller.load(),
              child: const Text('Reload'),
            ),
            if (state.busy)
              Semantics(liveRegion: true, child: const Text('Working…')),
            if (state.failure case final failure?)
              Semantics(liveRegion: true, child: Text(failure.message)),
            if (state.loaded && state.friends.isEmpty)
              const Text('No friends available on this page.'),
            for (final friend in state.friends)
              Card(
                child: Padding(
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
