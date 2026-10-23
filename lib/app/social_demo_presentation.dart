import 'package:flutter/material.dart';

import '../core/presentation/enmori_localizations.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'enmori_theme.dart';
import '../core/presentation/enmori_motion.dart';

/// Presentation opt-in only; never selects repositories or grants a session.
final socialDemoPresentationProvider = Provider<bool>((ref) => false);

/// Keep preview and connected app on the same approved visual baseline.
ThemeData socialDemoTheme() => enmoriTheme();

final class SocialDemoNavigation extends StatelessWidget {
  const SocialDemoNavigation({
    required this.selectedIndex,
    required this.onSelected,
    this.legacyCheckInTab = false,
    super.key,
  });
  final bool legacyCheckInTab;
  final int selectedIndex;
  final ValueChanged<int> onSelected;
  @override
  Widget build(BuildContext context) => NavigationBar(
    key: const Key('social-bottom-navigation'),
    animationDuration: EnmoriMotion.duration(context, EnmoriMotion.content),
    selectedIndex: selectedIndex,
    onDestinationSelected: (index) {
      if (index != selectedIndex) onSelected(index);
    },
    destinations: [
      NavigationDestination(
        key: const Key('social-nav-home'),
        icon: const Icon(Icons.home_outlined),
        selectedIcon: const Icon(Icons.home),
        label: context.tr('Home', '首页'),
      ),
      NavigationDestination(
        key: const Key('social-nav-friends'),
        icon: const Icon(Icons.people_outline),
        selectedIcon: const Icon(Icons.people),
        label: context.tr('Friends', '好友'),
      ),
      if (legacyCheckInTab)
        NavigationDestination(
          key: const Key('social-nav-check-in'),
          icon: const Icon(Icons.add_box_outlined),
          label: context.tr('Check-in', '签到'),
        )
      else
        NavigationDestination(
          key: const Key('social-nav-events'),
          icon: const Icon(Icons.event_outlined),
          label: context.tr('Events', '活动'),
        ),
      const NavigationDestination(
        key: Key('social-nav-ai'),
        icon: Icon(Icons.auto_awesome_outlined),
        selectedIcon: Icon(Icons.auto_awesome),
        label: 'AI',
      ),
      NavigationDestination(
        key: const Key('social-nav-me'),
        icon: Icon(Icons.person_outline),
        selectedIcon: Icon(Icons.person),
        label: legacyCheckInTab
            ? context.tr('Me', '我')
            : context.tr('Profile', '我的'),
      ),
    ],
  );
}

/// Keeps feature state and data inside the supplied page.
final class SocialDemoTab extends StatelessWidget {
  const SocialDemoTab({
    required this.child,
    required this.selectedIndex,
    required this.onSelected,
    super.key,
  });
  final Widget child;
  final int selectedIndex;
  final ValueChanged<int> onSelected;
  @override
  Widget build(BuildContext context) => Scaffold(
    body: child,
    bottomNavigationBar: SocialDemoNavigation(
      selectedIndex: selectedIndex,
      onSelected: onSelected,
    ),
  );
}
