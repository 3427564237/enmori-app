import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/router/app_router.dart';
import 'offline_social_store.dart';

const _accent = Color(0xff4f46e5);
const _muted = Color(0xff696963);

final class OfflineEntry extends StatelessWidget {
  const OfflineEntry({required this.onEnter, super.key});
  final VoidCallback onEnter;
  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.spa_outlined, size: 56),
              const SizedBox(height: 20),
              const Text(
                'ENMORI offline preview',
                style: TextStyle(fontSize: 25, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 12),
              const Text(
                'A synthetic sample account. No email, password or Firebase connection is used.',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              FilledButton(
                key: const Key('offline-enter'),
                onPressed: onEnter,
                child: const Text('Continue offline demo'),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

final class OfflineSocialHub extends StatelessWidget {
  const OfflineSocialHub({required this.store, required this.tab, super.key});
  final OfflineSocialStore store;
  final int tab;
  void _open(BuildContext context, String path) => context.push<void>(path);
  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: store,
    builder: (context, _) => Scaffold(
      appBar: AppBar(
        title: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.fiber_manual_record, color: _accent, size: 11),
            SizedBox(width: 8),
            Text(
              'enmori',
              style: TextStyle(
                fontSize: 26,
                fontWeight: FontWeight.w800,
                letterSpacing: -1,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            key: const Key('social-settings'),
            tooltip: 'Settings & privacy',
            onPressed: () => _open(context, AppRoutes.settings),
            icon: const Icon(Icons.settings_outlined),
          ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 660),
            child: ListView(
              key: Key('social-tab-$tab'),
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
              children: switch (tab) {
                1 => _friends(context),
                4 => _profile(context),
                _ => _home(context),
              },
            ),
          ),
        ),
      ),
      bottomNavigationBar: OfflineSocialNavigation(
        selectedIndex: tab,
        onSelected: (index) => selectSocialTab(context, index),
      ),
    ),
  );

  List<Widget> _home(BuildContext context) => [
    const _Eyebrow('YOUR WORLD, A LITTLE CLOSER'),
    const Text(
      'Find your people.\nMake a little room.',
      style: TextStyle(
        fontSize: 30,
        height: 1.16,
        fontWeight: FontWeight.w700,
        letterSpacing: -1,
      ),
    ),
    const SizedBox(height: 12),
    const Text(
      'Explore sample activities, meet your circle, and keep a moment for yourself.',
      style: TextStyle(color: _muted, height: 1.6),
    ),
    _Heading(
      title: 'Discover activities',
      action: 'See all',
      onTap: () => _open(context, AppRoutes.eventRecommendations),
    ),
    for (final event in store.events.take(2))
      Padding(
        padding: const EdgeInsets.only(bottom: 14),
        child: Card(
          margin: EdgeInsets.zero,
          clipBehavior: Clip.antiAlias,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                height: 155,
                child: _EventArtwork(
                  label: event.categoryLabel ?? 'Event',
                  alternate: event.eventId == 'offline_creative',
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(17),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'EXAMPLE ACTIVITY · ${event.categoryLabel}',
                      style: const TextStyle(
                        color: _muted,
                        fontSize: 11,
                        letterSpacing: .5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      event.title,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      event.locationLabel ?? '',
                      style: const TextStyle(color: _muted),
                    ),
                    const SizedBox(height: 15),
                    Align(
                      alignment: Alignment.centerRight,
                      child: FilledButton(
                        key: Key('social-event-${event.eventId}'),
                        onPressed: () =>
                            _open(context, '/events/${event.eventId}'),
                        child: const Text('View event'),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    Card(
      color: const Color(0xffeeedff),
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(17),
        child: Row(
          children: [
            const Icon(Icons.auto_awesome, color: _accent, size: 28),
            const SizedBox(width: 14),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'A moment for yourself',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                  ),
                  SizedBox(height: 5),
                  Text(
                    'Try a scripted AI conversation.',
                    style: TextStyle(color: _muted, height: 1.4),
                  ),
                ],
              ),
            ),
            IconButton(
              key: const Key('social-ai-card'),
              tooltip: 'Open AI conversation',
              onPressed: () => context.go(AppRoutes.aiAssistant),
              icon: const Icon(Icons.chevron_right, color: _accent),
            ),
          ],
        ),
      ),
    ),
    _Heading(
      title: 'Around your circle',
      action: 'Friends',
      onTap: () => context.go('/friends'),
    ),
    for (final friend in store.friends.take(2))
      Card(
        margin: const EdgeInsets.only(bottom: 10),
        child: ListTile(
          key: Key('social-friend-${friend.username}'),
          onTap: () =>
              _open(context, offlineFriendProfilePath(friend.username)),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 17,
            vertical: 9,
          ),
          leading: _Avatar(friend.displayName),
          title: Text(
            friend.displayName,
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
          subtitle: Text('@${friend.username}'),
          trailing: const Icon(Icons.chevron_right, color: _muted),
        ),
      ),
    _Heading(
      title: 'Your own moments',
      action: 'History',
      onTap: () => _open(context, AppRoutes.checkInHistory),
    ),
    if (store.notes.isNotEmpty)
      Card(
        margin: EdgeInsets.zero,
        child: ListTile(
          contentPadding: const EdgeInsets.all(17),
          leading: const Icon(Icons.lock_outline, color: _accent),
          title: Text(
            store.notes.first.note,
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
          ),
          subtitle: const Text('Your own sample record'),
          onTap: () => _open(
            context,
            AppRoutes.savedCheckIn(store.notes.first.checkInId),
          ),
        ),
      ),
  ];

  List<Widget> _friends(BuildContext context) => [
    const _Eyebrow('YOUR CIRCLE'),
    const Text(
      'Your people,\nin one place.',
      style: TextStyle(
        fontSize: 29,
        fontWeight: FontWeight.w700,
        letterSpacing: -.8,
      ),
    ),
    const SizedBox(height: 10),
    const Text(
      'All people here are synthetic examples. Try searching sam_sample, or accept Riley’s sample request.',
      style: TextStyle(color: _muted, height: 1.6),
    ),
    const SizedBox(height: 20),
    FilledButton(
      key: const Key('social-manage-friends'),
      onPressed: () => _open(context, '/friends/requests'),
      child: Text(
        'Find people & requests (${store.requests.length})',
        textAlign: TextAlign.center,
      ),
    ),
    const SizedBox(height: 10),
    OutlinedButton.icon(
      key: const Key('social-friends-list'),
      onPressed: () => _open(context, '/friends/list'),
      icon: const Icon(Icons.search),
      label: const Text('Search friends'),
    ),
    _Heading(title: 'My friends · ${store.friends.length}'),
    for (final friend in store.friends)
      Card(
        margin: const EdgeInsets.only(bottom: 12),
        child: ListTile(
          key: Key('social-friend-${friend.username}'),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 17,
            vertical: 10,
          ),
          leading: _Avatar(friend.displayName),
          title: Text(
            friend.displayName,
            style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
          ),
          subtitle: Text(
            '@${friend.username}',
            style: const TextStyle(color: _muted),
          ),
          trailing: const Icon(Icons.chevron_right, color: _muted),
          onTap: () =>
              _open(context, offlineFriendProfilePath(friend.username)),
        ),
      ),
    const SizedBox(height: 10),
    const Text(
      'Sample profiles show names and usernames only. More profile information is not available in this preview.',
      style: TextStyle(color: _muted, fontSize: 12, height: 1.6),
    ),
  ];

  List<Widget> _profile(BuildContext context) => [
    ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: const SizedBox(
        height: 102,
        child: _EventArtwork(label: '', alternate: true, cover: true),
      ),
    ),
    const SizedBox(height: 14),
    Wrap(
      alignment: WrapAlignment.spaceBetween,
      crossAxisAlignment: WrapCrossAlignment.center,
      spacing: 16,
      runSpacing: 12,
      children: [
        _Avatar(store.profile.displayName ?? 'Me', radius: 33),
        OutlinedButton(
          key: const Key('social-edit-profile'),
          onPressed: () => _open(context, AppRoutes.profileEdit),
          child: const Text('Edit profile'),
        ),
      ],
    ),
    const SizedBox(height: 17),
    Text(
      store.profile.displayName ?? 'Offline member',
      style: const TextStyle(
        fontSize: 30,
        fontWeight: FontWeight.w700,
        letterSpacing: -.9,
      ),
    ),
    const SizedBox(height: 5),
    Text('@${store.profile.username}', style: const TextStyle(color: _muted)),
    const SizedBox(height: 18),
    Wrap(
      spacing: 7,
      runSpacing: 5,
      children: [
        for (final tag in OfflineSocialStore.tags)
          if (store.interestIds.contains(tag.interestTagId))
            Chip(
              label: Text(tag.displayName),
              backgroundColor: const Color(0xfff0f0e9),
              side: BorderSide.none,
            ),
      ],
    ),
    const SizedBox(height: 16),
    _entry(
      context,
      keyName: 'social-edit-interests',
      icon: Icons.interests_outlined,
      text: 'Edit interests',
      path: AppRoutes.interests,
    ),
    _entry(
      context,
      keyName: 'social-history',
      icon: Icons.calendar_month_outlined,
      text: 'My footprints & dates',
      path: AppRoutes.checkInHistory,
    ),
    _entry(
      context,
      keyName: 'social-personas',
      icon: Icons.auto_awesome_outlined,
      text: 'Personas',
      path: AppRoutes.personas,
    ),
    _entry(
      context,
      keyName: 'social-profile-settings',
      icon: Icons.tune,
      text: 'Settings & privacy',
      path: AppRoutes.settings,
    ),
    _Heading(title: 'A recent moment'),
    if (store.notes.isNotEmpty)
      Card(
        margin: EdgeInsets.zero,
        child: Padding(
          padding: const EdgeInsets.all(19),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                offlineDate(
                  store.notes.first.createdAt.add(const Duration(hours: 8)),
                ),
                style: const TextStyle(color: _muted, fontSize: 11),
              ),
              const SizedBox(height: 10),
              Text(store.notes.first.note, style: const TextStyle(height: 1.6)),
              const SizedBox(height: 12),
              const Row(
                children: [
                  Icon(Icons.lock_outline, size: 14),
                  SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'Your own record, not a public post',
                      style: TextStyle(color: _muted, fontSize: 11),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
  ];
  Widget _entry(
    BuildContext context, {
    required String keyName,
    required IconData icon,
    required String text,
    required String path,
  }) => ListTile(
    key: Key(keyName),
    contentPadding: EdgeInsets.zero,
    leading: Icon(icon, color: _muted),
    title: Text(text),
    trailing: const Icon(Icons.chevron_right),
    onTap: () => _open(context, path),
  );
}

String offlineFriendProfilePath(String username) =>
    '/friends/${Uri.encodeComponent(username)}/profile';

void selectSocialTab(BuildContext context, int index) {
  switch (index) {
    case 0:
      context.go(AppRoutes.home);
    case 1:
      context.go('/friends');
    case 2:
      context.push<void>(AppRoutes.checkIn);
    case 3:
      context.go(AppRoutes.aiAssistant);
    case 4:
      context.go(AppRoutes.profile);
  }
}

/// AI supplies its existing guarded navigation callback to the same bar.
final class OfflineSocialNavigation extends StatelessWidget {
  const OfflineSocialNavigation({
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

/// Existing minimum identity projection only, never a real full Profile API.
final class OfflineFriendProfilePage extends StatelessWidget {
  const OfflineFriendProfilePage({
    required this.store,
    required this.username,
    super.key,
  });
  final OfflineSocialStore store;
  final String username;
  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: store,
    builder: (context, _) {
      final friend = store.friends
          .where((f) => f.username == username)
          .firstOrNull;
      return Scaffold(
        appBar: AppBar(title: const Text('Sample profile')),
        body: SafeArea(
          child: Align(
            alignment: Alignment.topCenter,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 660),
              child: ListView(
                key: const Key('route-offline-friend-profile'),
                padding: const EdgeInsets.all(24),
                children: [
                  if (friend == null)
                    const Text(
                      'This profile is unavailable.',
                      key: Key('offline-friend-unavailable'),
                    )
                  else ...[
                    ClipRRect(
                      borderRadius: BorderRadius.circular(24),
                      child: const SizedBox(
                        height: 110,
                        child: _EventArtwork(
                          label: '',
                          alternate: true,
                          cover: true,
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: _Avatar(friend.displayName, radius: 36),
                    ),
                    const SizedBox(height: 18),
                    Text(
                      friend.displayName,
                      style: Theme.of(context).textTheme.headlineMedium
                          ?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '@${friend.username}',
                      style: const TextStyle(color: _muted),
                    ),
                    const SizedBox(height: 24),
                    const Chip(
                      avatar: Icon(Icons.people_outline, size: 18),
                      label: Text('Your friend · sample'),
                    ),
                    const SizedBox(height: 18),
                    const Text(
                      'This is a synthetic profile. Only the name and username are available.',
                      style: TextStyle(color: _muted, height: 1.6),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      );
    },
  );
}

final class _Heading extends StatelessWidget {
  const _Heading({required this.title, this.action, this.onTap});
  final String title;
  final String? action;
  final VoidCallback? onTap;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 23, bottom: 13),
    child: Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              letterSpacing: -.3,
            ),
          ),
        ),
        if (action != null) TextButton(onPressed: onTap, child: Text(action!)),
      ],
    ),
  );
}

final class _Eyebrow extends StatelessWidget {
  const _Eyebrow(this.text);
  final String text;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: Text(
      text,
      style: const TextStyle(
        fontSize: 10,
        letterSpacing: 1.2,
        color: _muted,
        fontWeight: FontWeight.w600,
      ),
    ),
  );
}

final class _Avatar extends StatelessWidget {
  const _Avatar(this.name, {this.radius = 23});
  final String name;
  final double radius;
  @override
  Widget build(BuildContext context) => CircleAvatar(
    radius: radius,
    backgroundColor: const Color(0xffe4e0fa),
    foregroundColor: const Color(0xff5545a2),
    child: Text(
      name.isEmpty ? 'M' : name.characters.first.toUpperCase(),
      style: TextStyle(fontSize: radius * .7, fontWeight: FontWeight.w700),
    ),
  );
}

final class _EventArtwork extends StatelessWidget {
  const _EventArtwork({
    required this.label,
    this.alternate = false,
    this.cover = false,
  });
  final String label;
  final bool alternate, cover;
  @override
  Widget build(BuildContext context) => ClipRect(
    child: CustomPaint(
      painter: _ArtworkPainter(alternate: alternate, cover: cover),
      child: SizedBox(
        width: double.infinity,
        child: Padding(
          padding: const EdgeInsets.all(19),
          child: cover
              ? const SizedBox()
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'EXAMPLE / ${label.toUpperCase()}',
                      style: const TextStyle(
                        color: Color(0xfff7f5dc),
                        fontSize: 10,
                        letterSpacing: 1,
                      ),
                    ),
                    Expanded(
                      child: Align(
                        alignment: Alignment.bottomLeft,
                        child: ExcludeSemantics(
                          child: FittedBox(
                            alignment: Alignment.bottomLeft,
                            fit: BoxFit.scaleDown,
                            child: Text(
                              alternate
                                  ? 'Make something.\nMeet someone.'
                                  : 'A slower\nSaturday.',
                              style: const TextStyle(
                                color: Color(0xfff7f5dc),
                                fontSize: 29,
                                height: .98,
                                fontWeight: FontWeight.w700,
                                letterSpacing: -.8,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
        ),
      ),
    ),
  );
}

final class _ArtworkPainter extends CustomPainter {
  _ArtworkPainter({required this.alternate, required this.cover});
  final bool alternate, cover;
  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(
      Offset.zero & size,
      Paint()
        ..color = cover
            ? const Color(0xffd2d9cf)
            : alternate
            ? const Color(0xff49446d)
            : const Color(0xff253a2d),
    );
    final center = Offset(size.width * .77, size.height * .28);
    for (final r in [65.0, 92.0, 118.0]) {
      canvas.drawCircle(
        center,
        r,
        Paint()
          ..color = cover ? Colors.white54 : const Color(0xff819477)
          ..style = PaintingStyle.stroke,
      );
    }
    if (!cover) {
      canvas.drawCircle(
        Offset(size.width * .82, size.height * .46),
        29,
        Paint()..color = const Color(0xffddd9ae),
      );
    }
  }

  @override
  bool shouldRepaint(_ArtworkPainter old) =>
      old.alternate != alternate || old.cover != cover;
}
