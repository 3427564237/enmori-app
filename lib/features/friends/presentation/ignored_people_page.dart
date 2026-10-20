import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'friend_ignore_controller.dart';

/// Uses the same versioned restore as SnackBar Undo; no local identity cache.
final class IgnoredPeoplePage extends ConsumerStatefulWidget {
  const IgnoredPeoplePage({super.key});
  @override
  ConsumerState<IgnoredPeoplePage> createState() => _IgnoredPeoplePageState();
}

final class _IgnoredPeoplePageState extends ConsumerState<IgnoredPeoplePage>
    with WidgetsBindingObserver {
  FriendIgnoreController get controller =>
      ref.read(friendIgnoreControllerProvider.notifier);
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) controller.loadPeople();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      controller.loadPeople();
    } else {
      controller.clearPrivateViews();
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(friendIgnoreControllerProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('已忽略的人')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            'Restore allows a person to be recommended again when currently eligible. It does not guarantee they will appear.',
          ),
          if (state.busy)
            Semantics(
              liveRegion: true,
              child: const Text('Checking preferences…'),
            ),
          if (state.failure case final failure?)
            Semantics(liveRegion: true, child: Text(failure.message)),
          if (state.unresolvedUsername != null) ...[
            const Text(
              'The last change is unconfirmed. Read the current state before changing it again.',
            ),
            OutlinedButton(
              onPressed: state.busy
                  ? null
                  : () async {
                      await controller.checkCurrent();
                      if (mounted) await controller.loadPeople();
                    },
              child: const Text('Read current state'),
            ),
          ] else ...[
            if (state.loaded && state.people.isEmpty)
              const Text('No currently available ignored people.'),
            for (final person in state.people)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(person.displayName ?? person.username),
                      Text('@${person.username}'),
                      TextButton(
                        onPressed: state.busy
                            ? null
                            : () async {
                                await controller.restore(person);
                                if (mounted) await controller.loadPeople();
                              },
                        child: const Text('Restore'),
                      ),
                    ],
                  ),
                ),
              ),
            OutlinedButton(
              onPressed: state.busy ? null : controller.loadPeople,
              child: const Text('Reload'),
            ),
          ],
        ],
      ),
    );
  }
}
