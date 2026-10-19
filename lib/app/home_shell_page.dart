import 'package:flutter/material.dart';

import '../features/event_recommendations/presentation/event_recommendations_page.dart';
import 'social_demo_presentation.dart';

final class HomeShellPage extends StatelessWidget {
  const HomeShellPage({
    required this.onStartCheckIn,
    this.socialStyle = false,
    this.onSelectTab,
    this.onOpenSettings,
    this.onEditInterests,
    this.onOpenProfile,
    this.onOpenFriends,
    this.onManagePersonas,
    this.onOpenHistory,
    this.onOpenAi,
    this.onOpenEvent,
    this.onBrowseActivities,
    required this.onSeeAllEvents,
    super.key,
  });

  final bool socialStyle;
  final ValueChanged<int>? onSelectTab;
  final VoidCallback? onOpenSettings;
  final VoidCallback onStartCheckIn;
  final VoidCallback? onEditInterests;
  final VoidCallback? onOpenProfile;
  final VoidCallback? onOpenFriends;
  final VoidCallback? onManagePersonas;
  final VoidCallback? onOpenHistory;
  final VoidCallback? onOpenAi;
  final void Function(String)? onOpenEvent;
  final VoidCallback onSeeAllEvents;
  final VoidCallback? onBrowseActivities;

  @override
  Widget build(BuildContext context) {
    if (socialStyle) return _socialHome(context);
    return Scaffold(
      appBar: AppBar(title: const Text('ENMORI')),
      body: SafeArea(
        child: ListView(
          key: const Key('route-home'),
          padding: const EdgeInsets.all(24),
          children: [
            Text('Home', style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 12),
            const Text('Your Check-in and upcoming event recommendations.'),
            const SizedBox(height: 24),
            FilledButton.icon(
              key: const Key('r6-new-check-in-button'),
              onPressed: onStartCheckIn,
              icon: const Icon(Icons.edit_note),
              label: const Text('New Check-in'),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              key: const Key('edit-interests-button'),
              onPressed: onEditInterests,
              icon: const Icon(Icons.interests_outlined),
              label: const Text('Edit interests'),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              key: const Key('my-profile-button'),
              onPressed: onOpenProfile,
              icon: const Icon(Icons.person_outline),
              label: const Text('My profile'),
            ),
            if (onOpenFriends != null)
              OutlinedButton.icon(
                key: const Key('home-friends'),
                onPressed: onOpenFriends,
                icon: const Icon(Icons.people_outline),
                label: const Text('Friends'),
              ),
            if (onManagePersonas != null)
              OutlinedButton.icon(
                key: const Key('home-manage-personas'),
                onPressed: onManagePersonas,
                icon: const Icon(Icons.manage_accounts_outlined),
                label: const Text('Manage Personas'),
              ),
            if (onOpenHistory != null)
              OutlinedButton.icon(
                key: const Key('home-check-in-history'),
                onPressed: onOpenHistory,
                icon: const Icon(Icons.history),
                label: const Text('Footprint'),
              ),
            if (onOpenAi != null)
              OutlinedButton.icon(
                key: const Key('home-ai-conversation'),
                onPressed: onOpenAi,
                icon: const Icon(Icons.chat_outlined),
                label: const Text('AI conversation'),
              ),
            if (onBrowseActivities != null)
              OutlinedButton.icon(
                key: const Key('home-browse-activities'),
                onPressed: onBrowseActivities,
                icon: const Icon(Icons.explore_outlined),
                label: const Text('Browse activities'),
              ),
            const SizedBox(height: 32),
            Text(
              'Events for you',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 12),
            EventRecommendationsSection(
              onSeeAll: onSeeAllEvents,
              onOpenEvent: onOpenEvent,
            ),
          ],
        ),
      ),
    );
  }

  Widget _socialHome(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.fiber_manual_record, size: 11, color: Color(0xff4f46e5)),
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
          onPressed: onOpenSettings,
          icon: const Icon(Icons.settings_outlined),
        ),
      ],
    ),
    bottomNavigationBar: onSelectTab == null
        ? null
        : SocialDemoNavigation(selectedIndex: 0, onSelected: onSelectTab!),
    body: SafeArea(
      top: false,
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 660),
          child: ListView(
            key: const Key('route-home'),
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
            children: [
              const Text(
                'YOUR WORLD, A LITTLE CLOSER',
                style: TextStyle(
                  color: Color(0xff696963),
                  fontSize: 11,
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(height: 12),
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
                'Discover activities and keep a moment for yourself.',
                style: TextStyle(color: Color(0xff696963), height: 1.6),
              ),
              const SizedBox(height: 22),
              Card(
                color: const Color(0xffeeedff),
                child: Padding(
                  padding: const EdgeInsets.all(22),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(
                        Icons.explore_outlined,
                        size: 36,
                        color: Color(0xff4f46e5),
                      ),
                      const SizedBox(height: 14),
                      Text(
                        'Discover activities',
                        style: Theme.of(context).textTheme.headlineSmall
                            ?.copyWith(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 10),
                      const Text(
                        'Browse current source-backed events, then view the original event page.',
                        style: TextStyle(height: 1.5),
                      ),
                      const SizedBox(height: 16),
                      FilledButton.icon(
                        key: const Key('home-browse-activities'),
                        onPressed: onBrowseActivities,
                        icon: const Icon(Icons.arrow_forward),
                        label: const Text('Browse activities'),
                      ),
                      const SizedBox(height: 8),
                      OutlinedButton.icon(
                        key: const Key('home-recommended-activities'),
                        onPressed: onSeeAllEvents,
                        icon: const Icon(Icons.event_outlined),
                        label: const Text('Recommended activities'),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 14),
              Card(
                child: ListTile(
                  key: const Key('social-ai-card'),
                  contentPadding: const EdgeInsets.all(17),
                  leading: const Icon(
                    Icons.auto_awesome_outlined,
                    color: Color(0xff4f46e5),
                  ),
                  title: const Text('A moment for yourself'),
                  subtitle: const Text(
                    'Talk with your active Persona and saved Notes.',
                  ),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: onOpenAi,
                ),
              ),
              const SizedBox(height: 14),
              Card(
                child: ListTile(
                  key: const Key('home-check-in-history'),
                  contentPadding: const EdgeInsets.all(17),
                  leading: const Icon(Icons.history),
                  title: const Text('Your own moments'),
                  subtitle: const Text(
                    'Open your saved Check-ins in Footprint.',
                  ),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: onOpenHistory,
                ),
              ),
              const SizedBox(height: 14),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  OutlinedButton.icon(
                    key: const Key('r6-new-check-in-button'),
                    onPressed: onStartCheckIn,
                    icon: const Icon(Icons.edit_note),
                    label: const Text('New Check-in'),
                  ),
                  OutlinedButton.icon(
                    key: const Key('home-manage-personas'),
                    onPressed: onManagePersonas,
                    icon: const Icon(Icons.manage_accounts_outlined),
                    label: const Text('Manage Personas'),
                  ),
                  OutlinedButton.icon(
                    key: const Key('edit-interests-button'),
                    onPressed: onEditInterests,
                    icon: const Icon(Icons.interests_outlined),
                    label: const Text('Edit interests'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    ),
  );
}
