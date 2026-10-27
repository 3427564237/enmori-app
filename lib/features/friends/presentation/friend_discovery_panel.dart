import '../../../core/presentation/enmori_localizations.dart';

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
  Object? _suggestionSnapshot;
  int _groupStart = 0;
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
    if (!identical(_suggestionSnapshot, state.suggestions)) {
      _suggestionSnapshot = state.suggestions;
      _groupStart = 0;
    }
    final preference = ref.watch(friendIgnoreControllerProvider);
    final preferences = ref.read(friendIgnoreControllerProvider.notifier);
    final renderedEpoch = preferences.epoch;
    final locked = preference.busy || preference.unresolvedUsername != null;
    final renderedGroupStart = _groupStart;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeading(
          title: context.tr('People you may know', '可能认识的人'),
          actions: [
            if (widget.home &&
                widget.onSeeAll != null &&
                state.suggestions.isNotEmpty)
              TextButton(
                onPressed: () => _open(widget.onSeeAll!),
                child: Text(context.tr('See all', '查看全部')),
              ),
            IconButton(
              tooltip: context.tr('Reload recommendations', '刷新推荐'),
              onPressed: state.busy || locked ? null : controller.load,
              icon: const Icon(Icons.refresh),
            ),
            PopupMenuButton<String>(
              tooltip: context.tr('Recommendation options', '推荐选项'),
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
                PopupMenuItem(
                  value: 'ignored',
                  child: Text(context.tr('Ignored people', '已忽略的用户')),
                ),
                PopupMenuItem(
                  value: 'requests',
                  child: Text(
                    state.pendingCount == null
                        ? context.tr('Friend requests', '好友请求')
                        : context.tr(
                            'Friend requests (${state.pendingCount})',
                            '好友请求（${state.pendingCount}）',
                          ),
                  ),
                ),
                if (state.countFailure != null)
                  PopupMenuItem(
                    enabled: false,
                    child: Text(
                      context.tr(
                        'Request count is unavailable. Open requests to check.',
                        '暂时无法获取请求数量，请打开请求列表查看。',
                      ),
                    ),
                  ),
              ],
            ),
          ],
        ),
        if (state.busy)
          LinearProgressIndicator(
            semanticsLabel: context.tr('Loading friends', '正在加载好友'),
          ),
        if (state.failure case final failure?)
          Semantics(
            liveRegion: true,
            child: Text(localizedFailure(context, failure)),
          ),
        if (preference.busy)
          Semantics(
            liveRegion: true,
            child: Text(
              context.tr('Saving or checking preferences…', '正在保存或核对偏好…'),
            ),
          ),
        if (preference.failure case final failure?)
          Semantics(
            liveRegion: true,
            child: Text(localizedFailure(context, failure)),
          ),
        if (preference.unresolvedUsername != null) ...[
          Text(
            context.tr(
              'The last preference change is unconfirmed. Read the current state before another change.',
              '上次偏好修改尚未确认，请先核对当前状态再修改。',
            ),
          ),
          OutlinedButton(
            onPressed: preference.busy ? null : preferences.checkCurrent,
            child: Text(context.tr('Read current state', '核对当前状态')),
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
                      Text(
                        context.tr(
                          'No friend recommendations right now',
                          '暂时没有好友推荐',
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        context.tr(
                          'Find someone you know to get started.',
                          '先查找一位你认识的人。',
                        ),
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      TextButton(
                        onPressed: () => _open(widget.onOpenRequests),
                        child: Text(context.tr('Find people', '查找用户')),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        if (!widget.home && state.loaded && state.suggestions.isNotEmpty)
          Wrap(
            spacing: 12,
            children: [
              if (_groupStart > 0)
                TextButton(
                  onPressed: locked
                      ? null
                      : () {
                          if (mounted &&
                              _groupStart == renderedGroupStart &&
                              renderedGroupStart >= 2 &&
                              identical(
                                state,
                                ref.read(
                                  friendDiscoveryControllerProvider(
                                    widget.home,
                                  ),
                                ),
                              )) {
                            setState(
                              () => _groupStart = renderedGroupStart - 2,
                            );
                          }
                        },
                  child: Text(context.tr('Previous group', '上一组')),
                ),
              if (_groupStart + 2 < state.suggestions.length)
                TextButton(
                  key: const Key('friend-recommendations-next-group'),
                  onPressed: locked
                      ? null
                      : () {
                          if (mounted &&
                              _groupStart == renderedGroupStart &&
                              renderedGroupStart + 2 <
                                  state.suggestions.length &&
                              identical(
                                state,
                                ref.read(
                                  friendDiscoveryControllerProvider(
                                    widget.home,
                                  ),
                                ),
                              )) {
                            setState(
                              () => _groupStart = renderedGroupStart + 2,
                            );
                          }
                        },
                  child: Text(context.tr('Next group', '下一组')),
                )
              else
                Text(
                  context.tr(
                    'You have reached the end of this list.',
                    '已浏览到本次推荐列表的末尾。',
                  ),
                ),
            ],
          ),
        for (final person
            in widget.home
                ? state.suggestions
                : state.suggestions.skip(_groupStart).take(2))
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
                  tooltip: context.tr(
                    'Ignore @${person.username}',
                    '忽略 @${person.username}',
                  ),
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
                                  content: Text(
                                    context.tr(
                                      'Recommendation ignored',
                                      '已忽略此推荐',
                                    ),
                                  ),
                                  action: SnackBarAction(
                                    label: context.tr('Undo', '撤销'),
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
