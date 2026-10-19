import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'enmori_theme.dart';

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
    selectedIndex: selectedIndex,
    onDestinationSelected: (index) {
      if (index != selectedIndex) onSelected(index);
    },
    destinations: [
      const NavigationDestination(
        key: Key('social-nav-home'),
        icon: Icon(Icons.home_outlined),
        selectedIcon: Icon(Icons.home),
        label: 'Home',
      ),
      const NavigationDestination(
        key: Key('social-nav-friends'),
        icon: Icon(Icons.people_outline),
        selectedIcon: Icon(Icons.people),
        label: 'Friends',
      ),
      if (legacyCheckInTab)
        const NavigationDestination(
          key: Key('social-nav-check-in'),
          icon: Icon(Icons.add_box_outlined),
          label: 'Check-in',
        )
      else
        const NavigationDestination(
          key: Key('social-nav-events'),
          icon: Icon(Icons.event_outlined),
          label: 'Events',
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
        label: legacyCheckInTab ? 'Me' : 'Profile',
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
