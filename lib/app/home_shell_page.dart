import 'package:flutter/material.dart';

import '../features/event_recommendations/presentation/event_recommendations_page.dart';
import 'social_demo_presentation.dart';

final class HomeShellPage extends StatelessWidget {
  const HomeShellPage({
    required this.onStartCheckIn,
    this.socialStyle = false,
    this.socialSection,
    this.weatherSection,
    this.onSelectTab,
    this.onOpenSettings,
    this.onEditInterests,
    this.onOpenProfile,
    this.onOpenFriends,
    this.onManagePersonas,
    this.onOpenHistory,
    this.onOpenFootprint,
    this.onOpenAi,
    this.onOpenEvent,
    this.recommendationCardBuilder,
    this.onBrowseActivities,
    required this.onSeeAllEvents,
    super.key,
  });

  final bool socialStyle;
  final Widget? socialSection;
  final Widget? weatherSection;
  final ValueChanged<int>? onSelectTab;
  final VoidCallback? onOpenSettings;
  final VoidCallback onStartCheckIn;
  final VoidCallback? onEditInterests;
  final VoidCallback? onOpenProfile;
  final VoidCallback? onOpenFriends;
  final VoidCallback? onManagePersonas;
  final VoidCallback? onOpenHistory;
  final VoidCallback? onOpenFootprint;
  final VoidCallback? onOpenAi;
  final void Function(String)? onOpenEvent;
  final RecommendationCardBuilder? recommendationCardBuilder;
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
                label: const Text('Check-in History'),
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
              recommendationCardBuilder: recommendationCardBuilder,
            ),
          ],
        ),
      ),
    );
  }

  Widget _socialHome(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.fiber_manual_record,
            size: 11,
            color: Theme.of(context).colorScheme.primary,
          ),
          SizedBox(width: 8),
          Text(
            'enmori',
            style: TextStyle(
              fontSize: 26,
              fontFamily: 'Playfair Display',
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
      actions: [
        IconButton(
          key: const Key('social-settings'),
          tooltip: onOpenSettings == null
              ? 'Settings & privacy unavailable in this version'
              : 'Settings & privacy',
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
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
            children: [
              Semantics(
                header: true,
                child: Text(
                  'Today',
                  style: Theme.of(context).textTheme.headlineLarge,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'A moment to make your own.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 12),
              FilledButton.icon(
                key: const Key('r6-new-check-in-button'),
                onPressed: onStartCheckIn,
                icon: const Icon(Icons.edit_note),
                label: const Text('New Check-in'),
              ),
              if (weatherSection != null) ...[
                const SizedBox(height: 16),
                weatherSection!,
              ],
              const SizedBox(height: 24),
              if (onOpenEvent != null)
                EventRecommendationsSection(
                  heading: 'Events for you',
                  onBrowseAll: onBrowseActivities,
                  onSeeAll: null,
                  onOpenEvent: onOpenEvent,
                  recommendationCardBuilder: recommendationCardBuilder,
                ),
              ?socialSection,
              const Divider(height: 32),
              Semantics(
                header: true,
                child: Text(
                  'Your space',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
              const SizedBox(height: 4),
              _HomeShortcut(
                key: const Key('social-ai-card'),
                icon: Icons.auto_awesome_outlined,
                title: 'AI conversation',
                description: 'Talk with your active Persona.',
                onTap: onOpenAi,
              ),
              const SizedBox(height: 4),
              _HomeShortcut(
                key: const Key('home-check-in-history'),
                icon: Icons.history,
                title: 'Check-in History',
                description: 'Open your saved Check-ins.',
                onTap: onOpenHistory,
              ),
              if (onOpenFootprint != null) ...[
                const SizedBox(height: 4),
                _HomeShortcut(
                  key: const Key('home-footprint'),
                  icon: Icons.map_outlined,
                  title: 'Footprint',
                  description: 'See your Check-in points on the map.',
                  onTap: onOpenFootprint,
                ),
              ],
              const Divider(height: 24),
              Wrap(
                spacing: 12,
                children: [
                  _HomeSecondaryAction(
                    actionKey: const Key('home-manage-personas'),
                    onPressed: onManagePersonas,
                    icon: Icons.manage_accounts_outlined,
                    label: 'Manage Personas',
                  ),
                  _HomeSecondaryAction(
                    actionKey: const Key('edit-interests-button'),
                    onPressed: onEditInterests,
                    icon: Icons.interests_outlined,
                    label: 'Edit interests',
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

/// Availability follows the existing route callback, never a simulated result.
final class _HomeShortcut extends StatelessWidget {
  const _HomeShortcut({
    required this.icon,
    required this.title,
    required this.description,
    required this.onTap,
    super.key,
  });

  final IconData icon;
  final String title;
  final String description;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => ListTile(
    contentPadding: const EdgeInsets.symmetric(vertical: 4),
    leading: Icon(icon, color: Theme.of(context).colorScheme.primary),
    title: Text(title),
    subtitle: Text(
      onTap == null ? 'Unavailable in this version.' : description,
      style: Theme.of(context).textTheme.bodyMedium
          ?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant),
    ),
    trailing: onTap == null ? null : const Icon(Icons.chevron_right),
    enabled: onTap != null,
    onTap: onTap,
  );
}

final class _HomeSecondaryAction extends StatelessWidget {
  const _HomeSecondaryAction({
    required this.actionKey,
    required this.onPressed,
    required this.icon,
    required this.label,
  });

  final Key actionKey;
  final VoidCallback? onPressed;
  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) => Column(
    mainAxisSize: MainAxisSize.min,
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      TextButton.icon(
        key: actionKey,
        onPressed: onPressed,
        icon: Icon(icon),
        label: Text(label),
      ),
      if (onPressed == null) ...[
        const SizedBox(height: 8),
        Text(
          '$label is unavailable in this version.',
          style: Theme.of(context).textTheme.bodyMedium
              ?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant),
        ),
      ],
    ],
  );
}
