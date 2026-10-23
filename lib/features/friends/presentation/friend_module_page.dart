import '../../../core/presentation/enmori_localizations.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../check_in/check_in_providers.dart';
import '../../auth/auth_providers.dart';
import '../../../core/presentation/enmori_motion.dart';
import 'friend_page.dart';
import 'my_friends_page.dart';
import 'my_friends_controller.dart';
import 'social_profile_page.dart';
import 'friend_discovery_panel.dart';
import 'friend_discovery_controller.dart';
import 'friend_activity_panel.dart';

/// Single JIN module builder; LI's existing authenticated router opens this page.
/// No alternative Auth client, runtime configuration or top-level router.
final class FriendModulePage extends ConsumerStatefulWidget {
  const FriendModulePage({
    required this.openAttribution,
    this.participationBuilder,
    this.onOpenEvent,
    super.key,
  });
  final Future<bool> Function(Uri) openAttribution;
  final ParticipationBuilder? participationBuilder;
  final Future<void> Function(String eventId)? onOpenEvent;
  @override
  ConsumerState<FriendModulePage> createState() => _FriendModulePageState();
}

final class _FriendModulePageState extends ConsumerState<FriendModulePage> {
  int _view = 0;
  final _visited = <int>{0};
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        ref.read(friendDiscoveryControllerProvider(false).notifier).load();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    Future<void> profile(String username) async {
      final session = ref.read(authSessionProvider).asData?.value;
      final device = ref.read(historyDevicePortProvider);
      try {
        final zone = await device.captureIanaZone(),
            today = await device.todayInZone(zone);
        if (!context.mounted ||
            !identical(session, ref.read(authSessionProvider).asData?.value)) {
          return;
        }
        final date =
            '${today.year.toString().padLeft(4, '0')}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';
        await Navigator.of(context).push<void>(
          MaterialPageRoute(
            builder: (context) => SocialProfilePage(
              username: username,
              initialDate: date,
              timeZone: zone,
              openAttribution: widget.openAttribution,
              participationBuilder: widget.participationBuilder,
              onOpenRequest: (name) => Navigator.of(context).push<void>(
                MaterialPageRoute(
                  builder: (_) =>
                      FriendPage(initialUsername: name, onOpenProfile: profile),
                ),
              ),
            ),
          ),
        );
      } catch (_) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                context.tr(
                  'Device date/time zone is unavailable. Try again.',
                  '无法获取设备日期或时区，请重试。',
                ),
              ),
            ),
          );
        }
      }
    }

    Future<void> requests() async {
      final session = ref.read(authSessionProvider).asData?.value;
      await Navigator.of(context).push<void>(
        MaterialPageRoute(
          builder: (context) => FriendPage(
            onOpenProfile: profile,
            onOpenMyFriends: () => Navigator.of(context).push<void>(
              MaterialPageRoute(
                builder: (_) => MyFriendsListPage(onOpenFriend: profile),
              ),
            ),
          ),
        ),
      );
      if (context.mounted &&
          identical(session, ref.read(authSessionProvider).asData?.value)) {
        await ref.read(myFriendsControllerProvider.notifier).load();
        if (context.mounted &&
            identical(session, ref.read(authSessionProvider).asData?.value)) {
          await ref
              .read(friendDiscoveryControllerProvider(false).notifier)
              .load();
        }
      }
    }

    Widget discovery(bool home) => FriendDiscoveryPanel(
      home: home,
      onOpenProfile: profile,
      onOpenRequests: requests,
      onSeeAll: () => Navigator.of(context).push<void>(
        MaterialPageRoute(
          builder: (_) => Scaffold(
            appBar: AppBar(
              title: Text(
                context.tr('People You May Want To Know', '你可能想认识的人'),
              ),
            ),
            body: SafeArea(
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  FriendDiscoveryPanel(
                    home: false,
                    onOpenProfile: profile,
                    onOpenRequests: requests,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
    final pending = ref
        .watch(friendDiscoveryControllerProvider(false))
        .pendingCount;
    final views = <Widget Function()>[
      () => MyFriendsListPage(
        embedded: true,
        onOpenFriend: profile,
        onFindPeople: requests,
      ),
      () => ListView(
        key: const PageStorageKey('friends-activity'),
        padding: const EdgeInsets.all(16),
        children: [
          FriendActivityPanel(
            home: false,
            onOpenEvent: widget.onOpenEvent,
            onOpenProfile: profile,
          ),
        ],
      ),
      () => ListView(
        key: const PageStorageKey('friends-discover'),
        padding: const EdgeInsets.all(16),
        children: [discovery(false)],
      ),
    ];
    return Scaffold(
      appBar: AppBar(
        title: Text(context.tr('Friends', '好友')),
        actions: [
          IconButton(
            tooltip: context.tr('Find people and requests', '查找用户与好友请求'),
            onPressed: requests,
            icon: Badge(
              isLabelVisible: pending != null && pending > 0,
              label: Text('$pending'),
              child: const Icon(Icons.person_add_alt),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Wrap(
                spacing: 8,
                runSpacing: 4,
                children: [
                  for (final (index, title) in [
                    context.tr('My Friends', '我的好友'),
                    context.tr('Activity', '动态'),
                    context.tr('Discover', '发现'),
                  ].indexed)
                    ChoiceChip(
                      chipAnimationStyle: EnmoriMotion.chips(context),
                      label: Text(title),
                      selected: _view == index,
                      onSelected: (_) {
                        FocusManager.instance.primaryFocus?.unfocus();
                        setState(() {
                          _view = index;
                          _visited.add(index);
                        });
                      },
                    ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: IndexedStack(
                index: _view,
                children: [
                  for (var i = 0; i < views.length; i++)
                    TickerMode(
                      enabled: _view == i,
                      child: ExcludeFocus(
                        excluding: _view != i,
                        child: _visited.contains(i)
                            ? views[i]()
                            : const SizedBox.shrink(),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
