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
            labelText: context.tr('Search by display name', '按显示名称搜索'),
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
            if (state.friends.isNotEmpty || _specialCareOnly)
              FilterChip(
                label: Text(context.tr('Special Care', '特别关心')),
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
        if (state.loaded && state.friends.isEmpty)
          StatusPanel(
            title: state.searching
                ? context.tr('No matching friends on this page.', '本页没有匹配的好友。')
                : context.tr('Make room for familiar faces', '从认识的人开始'),
            body: state.searching
                ? context.tr(
                    'Try another display name, or clear your search.',
                    '尝试其他显示名称，或清除搜索。',
                  )
                : context.tr(
                    'Find people from Friends to start connecting.',
                    '查找你认识的人，建立好友联系。',
                  ),
            icon: Icons.people_outline,
            action: !state.searching && widget.onFindPeople != null
                ? TextButton(
                    onPressed: widget.onFindPeople,
                    child: Text(context.tr('Find people', '查找用户')),
                  )
                : null,
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
        if (state.loaded &&
            state.friends.isNotEmpty &&
            _specialCareOnly &&
            !state.friends.any((friend) => friend.specialCare))
          Text(
            context.tr('No Special Care friends on this page.', '本页没有特别关心的好友。'),
          ),
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
                      semanticLabel: friend.specialCare
                          ? context.tr('Special Care', '特别关心')
                          : null,
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
            child: Text(context.tr('Next page', '下一页')),
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
