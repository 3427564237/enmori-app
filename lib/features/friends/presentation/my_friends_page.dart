import '../../../core/presentation/identity_avatar.dart';
import '../../../core/presentation/enmori_localizations.dart';

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
          enabled: state.updatingUsername == null,
          key: const Key('my-friends-search-query'),
          controller: _query,
          focusNode: _queryFocus,
          decoration: InputDecoration(
            labelText: context.tr('Search friends', '搜索好友'),
            hintText: context.tr('Display name', '显示名称'),
            prefixIcon: const Icon(Icons.search),
            errorText: state.queryError == null
                ? null
                : context.tr(state.queryError!, '请输入好友的显示名称。'),
            suffixIcon: IconButton(
              key: const Key('my-friends-search'),
              tooltip: context.tr('Search friends', '搜索好友'),
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
            FilterChip(
              label: Text(context.tr('All', '全部')),
              selected: !state.specialCareOnly,
              onSelected: state.updatingUsername != null
                  ? null
                  : (_) => controller.filterStarred(false),
            ),
            FilterChip(
              label: Text(context.tr('Starred', '星标')),
              selected: state.specialCareOnly,
              onSelected: state.updatingUsername != null
                  ? null
                  : (_) => controller.filterStarred(true),
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
                child: Text(context.tr('Clear search', '清除搜索')),
              ),
            IconButton(
              key: const Key('my-friends-reload'),
              tooltip: context.tr('Refresh friends', '刷新好友'),
              onPressed: state.busy ? null : () => controller.load(),
              icon: const Icon(Icons.refresh),
            ),
          ],
        ),
        if (state.busy)
          LinearProgressIndicator(
            semanticsLabel: context.tr('Loading friends', '正在加载好友'),
          ),
        if (state.busy && state.filtered && state.updatingUsername == null)
          Row(
            children: [
              Expanded(
                child: Text(
                  context.tr(
                    'Searching all friends… Results are still loading.',
                    '正在查找全部好友…结果尚未加载完成。',
                  ),
                ),
              ),
              TextButton(
                onPressed: controller.pauseScan,
                child: Text(context.tr('Stop', '停止')),
              ),
            ],
          ),
        if (state.scanPaused)
          Text(
            context.tr(
              'Search paused. Continue to see all matches.',
              '查找已暂停，继续查找以查看全部匹配结果。',
            ),
          ),
        if (state.failure case final failure?)
          StatusPanel(
            title: context.tr('Friends couldn’t be loaded', '无法加载好友'),
            body: localizedFailure(context, failure),
            icon: Icons.cloud_off_outlined,
            isError: true,
            action: TextButton(
              onPressed: state.busy ? null : () => controller.load(),
              child: Text(context.tr('Try again', '重试')),
            ),
          ),
        if (state.loaded && state.friends.isEmpty && state.nextCursor == null)
          StatusPanel(
            title: state.filtered
                ? context.tr('No matching friends', '没有匹配的好友')
                : context.tr('Make room for familiar faces', '从认识的人开始'),
            body: state.specialCareOnly
                ? context.tr(
                    'Star friends using the star beside their name. Only you can see this choice.',
                    '点击好友姓名旁的星标即可添加，只有你能看到这个选择。',
                  )
                : state.searching
                ? context.tr(
                    'Try another display name, or clear your search.',
                    '尝试其他显示名称，或清除搜索。',
                  )
                : context.tr(
                    'Find people from Friends to start connecting.',
                    '查找你认识的人，建立好友联系。',
                  ),
            icon: Icons.people_outline,
            action: !state.filtered && widget.onFindPeople != null
                ? TextButton(
                    onPressed: widget.onFindPeople,
                    child: Text(context.tr('Find people', '查找用户')),
                  )
                : null,
          ),
        if (state.loaded && state.friends.isEmpty && state.nextCursor != null)
          Text(
            context.tr(
              'No visible friends on this page. Continue to the next page.',
              '本页没有可显示的好友，请继续查看下一页。',
            ),
          ),
        if (state.searching &&
            !state.loaded &&
            !state.busy &&
            state.failure == null &&
            state.queryError == null)
          Text(
            context.tr(
              'Tap Search to look for this display name.',
              '点击搜索，查找这个显示名称。',
            ),
          ),
        for (final friend in state.friends)
          widget.onOpenFriend != null
              ? ListTile(
                  key: Key('my-friend-profile-${friend.username}'),
                  title: Text(friend.displayName),
                  leading: IdentityAvatar(username: friend.username),
                  subtitle: Text('@${friend.username}'),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        key: Key('friend-star-${friend.username}'),
                        tooltip: friend.specialCare
                            ? context.tr('Unstar friend', '取消星标')
                            : context.tr(
                                'Star friend · only visible to you',
                                '星标好友 · 仅自己可见',
                              ),
                        onPressed: state.busy
                            ? null
                            : () async {
                                final session = ref
                                    .read(authSessionProvider)
                                    .asData
                                    ?.value;
                                final failure = await controller.setStarred(
                                  friend.username,
                                  !friend.specialCare,
                                );
                                if (!context.mounted ||
                                    failure == null ||
                                    !identical(
                                      session,
                                      ref
                                          .read(authSessionProvider)
                                          .asData
                                          ?.value,
                                    )) {
                                  return;
                                }
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(
                                      localizedFailure(context, failure),
                                    ),
                                  ),
                                );
                              },
                        icon: state.updatingUsername == friend.username
                            ? const SizedBox.square(
                                dimension: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : Icon(
                                friend.specialCare
                                    ? Icons.star_rounded
                                    : Icons.star_outline_rounded,
                                color: friend.specialCare
                                    ? Theme.of(context).colorScheme.primary
                                    : null,
                              ),
                      ),
                      const Icon(Icons.chevron_right),
                    ],
                  ),
                  onTap: state.busy
                      ? null
                      : () async {
                          final session = ref
                              .read(authSessionProvider)
                              .asData
                              ?.value;
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
        if (state.nextCursor != null || state.scanPaused)
          OutlinedButton(
            key: const Key('my-friends-next'),
            style: OutlinedButton.styleFrom(minimumSize: const Size(64, 48)),
            onPressed: state.busy
                ? null
                : () => controller.load(next: state.nextCursor != null),
            child: Text(
              state.filtered
                  ? context.tr('Continue search', '继续查找')
                  : context.tr('Next page', '下一页'),
            ),
          ),
      ],
    );
    if (widget.embedded) return list;
    return Scaffold(
      appBar: AppBar(title: Text(context.tr('My Friends', '我的好友'))),
      body: SafeArea(child: list),
    );
  }
}
