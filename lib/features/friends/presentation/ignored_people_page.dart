import '../../../core/presentation/identity_avatar.dart';
import '../../../core/presentation/enmori_localizations.dart';

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
    final renderedEpoch = controller.epoch;
    return Scaffold(
      appBar: AppBar(title: Text(context.tr('Ignored people', '已忽略的用户'))),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            context.tr(
              'Restore allows a person to be recommended again when currently eligible. It does not guarantee they will appear.',
              '恢复后，符合条件的用户可以再次出现在推荐中，但不保证一定出现。',
            ),
          ),
          if (state.busy)
            Semantics(
              liveRegion: true,
              child: Text(context.tr('Checking preferences…', '正在核对偏好…')),
            ),
          if (state.failure case final failure?)
            Semantics(
              liveRegion: true,
              child: Text(localizedFailure(context, failure)),
            ),
          if (state.unresolvedUsername != null) ...[
            Text(
              context.tr(
                'The last change is unconfirmed. Read the current state before changing it again.',
                '上次修改尚未确认，请先核对当前状态再修改。',
              ),
            ),
            OutlinedButton(
              onPressed: state.busy
                  ? null
                  : () async {
                      await controller.checkCurrent();
                      if (mounted) await controller.loadPeople();
                    },
              child: Text(context.tr('Read current state', '核对当前状态')),
            ),
          ] else ...[
            if (state.loaded && state.people.isEmpty)
              Text(
                context.tr(
                  'No currently available ignored people.',
                  '当前没有可显示的已忽略用户。',
                ),
              ),
            for (final person in state.people)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      IdentityAvatar(username: person.username),
                      Text(person.displayName ?? person.username),
                      Text('@${person.username}'),
                      TextButton(
                        onPressed: state.busy
                            ? null
                            : () async {
                                await controller.restore(
                                  person,
                                  expectedEpoch: renderedEpoch,
                                );
                                if (mounted) await controller.loadPeople();
                              },
                        child: Text(context.tr('Restore', '恢复')),
                      ),
                    ],
                  ),
                ),
              ),
            OutlinedButton(
              onPressed: state.busy ? null : controller.loadPeople,
              child: Text(context.tr('Reload', '重新加载')),
            ),
          ],
        ],
      ),
    );
  }
}
