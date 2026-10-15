import 'package:flutter/material.dart';

import '../features/event_recommendations/presentation/event_recommendations_page.dart';

final class HomeShellPage extends StatelessWidget {
  const HomeShellPage({
    required this.onStartCheckIn,
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
                label: const Text('Check-in history'),
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
}
