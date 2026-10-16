import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Presentation opt-in only; never selects repositories or grants a session.
final socialDemoPresentationProvider = Provider<bool>((ref) => false);

/// The existing offline preview's warm-white/indigo presentation.
ThemeData socialDemoTheme() => ThemeData(
  useMaterial3: true,
  scaffoldBackgroundColor: const Color(0xfffafaf8),
  colorScheme: ColorScheme.fromSeed(
    seedColor: const Color(0xff4f46e5),
    surface: const Color(0xfffafaf8),
  ).copyWith(primary: const Color(0xff4f46e5), onPrimary: Colors.white),
  appBarTheme: const AppBarTheme(
    backgroundColor: Color(0xfffafaf8),
    surfaceTintColor: Colors.transparent,
  ),
  cardTheme: CardThemeData(
    color: Colors.white,
    elevation: 0,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(20),
      side: const BorderSide(color: Color(0xffe9e9e3)),
    ),
  ),
  inputDecorationTheme: InputDecorationTheme(
    filled: true,
    fillColor: Colors.white,
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
  ),
  filledButtonTheme: FilledButtonThemeData(
    style: FilledButton.styleFrom(
      minimumSize: const Size(48, 48),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(13)),
    ),
  ),
  navigationBarTheme: const NavigationBarThemeData(
    backgroundColor: Colors.white,
    indicatorColor: Color(0xffeeedff),
  ),
);

final class SocialDemoNavigation extends StatelessWidget {
  const SocialDemoNavigation({
    required this.selectedIndex,
    required this.onSelected,
    super.key,
  });
  final int selectedIndex;
  final ValueChanged<int> onSelected;
  @override
  Widget build(BuildContext context) => NavigationBar(
    key: const Key('social-bottom-navigation'),
    selectedIndex: selectedIndex,
    onDestinationSelected: (index) {
      if (index != selectedIndex) onSelected(index);
    },
    destinations: const [
      NavigationDestination(
        key: Key('social-nav-home'),
        icon: Icon(Icons.home_outlined),
        selectedIcon: Icon(Icons.home),
        label: 'Home',
      ),
      NavigationDestination(
        key: Key('social-nav-friends'),
        icon: Icon(Icons.people_outline),
        selectedIcon: Icon(Icons.people),
        label: 'Friends',
      ),
      NavigationDestination(
        key: Key('social-nav-check-in'),
        icon: Icon(Icons.add_box_outlined),
        label: 'Check-in',
      ),
      NavigationDestination(
        key: Key('social-nav-ai'),
        icon: Icon(Icons.auto_awesome_outlined),
        selectedIcon: Icon(Icons.auto_awesome),
        label: 'AI',
      ),
      NavigationDestination(
        key: Key('social-nav-me'),
        icon: Icon(Icons.person_outline),
        selectedIcon: Icon(Icons.person),
        label: 'Me',
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
