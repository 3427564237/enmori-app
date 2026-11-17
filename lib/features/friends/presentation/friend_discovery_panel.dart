import 'discovery_card_page.dart';
import '../../recommendation_profile/presentation/recommendation_profile_page.dart';
import '../../recommendation_profile/recommendation_profile_providers.dart';
import '../../recommendation_profile/domain/recommendation_profile.dart';
import '../../../core/result/result.dart';
import '../../../core/presentation/identity_avatar.dart';
import '../../../core/presentation/enmori_localizations.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/section_heading.dart';
import 'friend_discovery_controller.dart';
import '../domain/friend_discovery_repository.dart';
import '../../auth/auth_providers.dart';
import '../../auth/domain/auth_repository.dart';
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
  int? _profileRevision;
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

  Future<void> _openDiscovery(String username, Object? session) async {
    if (!mounted ||
        session is! AuthSessionAuthenticated ||
        !identical(session, ref.read(authSessionProvider).asData?.value)) {
      return;
    }
    await _open(() async {
      final action = await Navigator.of(context).push<DiscoveryCardAction>(
        MaterialPageRoute(
          builder: (_) => DiscoveryCardPage(username: username),
        ),
      );
      // Return to the owning route first: its navigation guard correctly
      // rejects callbacks while a separate discovery card covers that route.
      if (mounted &&
          action == DiscoveryCardAction.viewProfile &&
          identical(session, ref.read(authSessionProvider).asData?.value)) {
        await widget.onOpenProfile(username);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(authSessionProvider).asData?.value;
    ref.listen(authSessionProvider, (previous, next) {
      if (!identical(previous?.asData?.value, next.asData?.value)) {
        _closeSnack();
        _profileRevision = null;
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
    final own = ref.watch(recommendationProfileProvider).asData?.value;
    final ownProfile = own is Success<RecommendationProfile> ? own.value : null;
    ref.listen(recommendationProfileProvider, (_, next) {
      final value = next.asData?.value;
      if (value is! Success<RecommendationProfile>) return;
      final changed =
          _profileRevision != null && _profileRevision != value.value.revision;
      _profileRevision = value.value.revision;
      if (changed) {
        controller.clear();
        final session = ref.read(authSessionProvider).asData?.value;
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted &&
              identical(session, ref.read(authSessionProvider).asData?.value)) {
            controller.load();
          }
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
        TextButton.icon(
          onPressed: () => _open(
            () => Navigator.of(context).push<void>(
              MaterialPageRoute(
                builder: (_) => const RecommendationProfilePage(),
              ),
            ),
          ),
          icon: const Icon(Icons.tune),
          label: Text(context.tr('Discovery settings', '好友发现设置')),
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
                          state.ownState == 'disabled' ||
                                  ownProfile?.discoverable == false
                              ? 'Discovery is off'
                              : state.ownState == 'incomplete' ||
                                    ownProfile != null &&
                                        !ownProfile.matchInterests &&
                                        !ownProfile.matchRegion &&
                                        !ownProfile.matchAffiliation
                              ? 'Add matching preferences'
                              : 'No matches right now',
                          state.ownState == 'disabled' ||
                                  ownProfile?.discoverable == false
                              ? '好友发现尚未开启'
                              : state.ownState == 'incomplete' ||
                                    ownProfile != null &&
                                        !ownProfile.matchInterests &&
                                        !ownProfile.matchRegion &&
                                        !ownProfile.matchAffiliation
                              ? '请补充用于匹配的资料'
                              : '当前暂无匹配',
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
          _DiscoverySuggestionCard(
            person: person,
            onOpen: () => _openDiscovery(person.username, session),
            onIgnore: locked
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
                    final snack = ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        // Keep the normal SnackBar duration, while
                        // accessible navigation retains the action.
                        persist: MediaQuery.accessibleNavigationOf(context),
                        content: Text(
                          context.tr('Recommendation ignored', '已忽略此推荐'),
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
    );
  }
}

final class _DiscoverySuggestionCard extends StatelessWidget {
  const _DiscoverySuggestionCard({
    required this.person,
    required this.onOpen,
    required this.onIgnore,
  });
  final FriendSuggestion person;
  final VoidCallback onOpen;
  final VoidCallback? onIgnore;

  @override
  Widget build(BuildContext context) => Card(
    key: ValueKey('friend-suggestion-${person.username}'),
    margin: const EdgeInsets.only(top: 8, bottom: 4),
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: IdentityAvatar(username: person.username, size: 48),
                  title: Text(
                    person.displayName ?? person.username,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  subtitle: Text(
                    '@${person.username}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  onTap: onOpen,
                ),
              ),
              IconButton(
                tooltip: context.tr(
                  'Ignore @${person.username}',
                  '忽略 @${person.username}',
                ),
                icon: const Icon(Icons.person_remove_outlined),
                onPressed: onIgnore,
              ),
            ],
          ),
          const SizedBox(height: 8),
          DecoratedBox(
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.primaryContainer
                  .withValues(alpha: .4),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    person.reason,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  if (person.sharedInterests.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      person.sharedInterests.join(' · '),
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 4),
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: TextButton.icon(
              onPressed: onOpen,
              icon: const Icon(Icons.person_outline, size: 18),
              label: Text(context.tr('View discovery card', '查看发现名片')),
            ),
          ),
        ],
      ),
    ),
  );
}
