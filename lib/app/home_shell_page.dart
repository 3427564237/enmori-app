import 'package:flutter/material.dart';

import '../features/event_recommendations/presentation/event_recommendations_page.dart';

final class HomeShellPage extends StatelessWidget {
  const HomeShellPage({
    required this.onStartCheckIn,
    this.onEditInterests,
    this.onOpenProfile,
    this.onOpenFriends,
    this.onOpenEvent,
    required this.onSeeAllEvents,
    super.key,
  });

  final VoidCallback onStartCheckIn;
  final VoidCallback? onEditInterests;
  final VoidCallback? onOpenProfile;
  final VoidCallback? onOpenFriends;
  final void Function(String)? onOpenEvent;
  final VoidCallback onSeeAllEvents;

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
