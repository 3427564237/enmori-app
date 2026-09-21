import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../domain/event_recommendation_repository.dart';
import 'event_recommendations_controller.dart';

const eventEmptyTitle = 'No event recommendations right now';
const eventEmptyBody = 'Update your interests or check again later.';

final class EventRecommendationsSection extends ConsumerStatefulWidget {
  const EventRecommendationsSection({required this.onSeeAll, super.key});

  final VoidCallback onSeeAll;

  @override
  ConsumerState<EventRecommendationsSection> createState() =>
      _EventRecommendationsSectionState();
}

final class _EventRecommendationsSectionState
    extends ConsumerState<EventRecommendationsSection> {
  late final EventRecommendationsController _controller;

  @override
  void initState() {
    super.initState();
    _controller = ref.read(eventRecommendationsControllerProvider.notifier);
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _controller.abandon();
    super.dispose();
  }

  void _load() {
    _controller.load(view: EventRecommendationView.home);
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(eventRecommendationsControllerProvider);
    return _RecommendationContent(
      state: state,
      onRetry: _load,
      onSeeAll: widget.onSeeAll,
      home: true,
    );
  }
}

final class EventRecommendationsPage extends ConsumerStatefulWidget {
  const EventRecommendationsPage({super.key});

  @override
  ConsumerState<EventRecommendationsPage> createState() =>
      _EventRecommendationsPageState();
}

final class _EventRecommendationsPageState
    extends ConsumerState<EventRecommendationsPage> {
  late final EventRecommendationsController _controller;

  @override
  void initState() {
    super.initState();
    _controller = ref.read(eventRecommendationsControllerProvider.notifier);
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _controller.abandon();
    super.dispose();
  }

  void _load() {
    _controller.load(view: EventRecommendationView.all);
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(eventRecommendationsControllerProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Event recommendations')),
      body: SafeArea(
        child: ListView(
          key: const Key('route-event-recommendations'),
          padding: const EdgeInsets.all(24),
          children: [
            Text(
              'Event recommendations',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 16),
            _RecommendationContent(state: state, onRetry: _load),
          ],
        ),
      ),
    );
  }
}

final class _RecommendationContent extends StatelessWidget {
  const _RecommendationContent({
    required this.state,
    required this.onRetry,
    this.onSeeAll,
    this.home = false,
  });

  final AsyncValue<EventRecommendationResponse> state;
  final VoidCallback onRetry;
  final VoidCallback? onSeeAll;
  final bool home;

  @override
  Widget build(BuildContext context) {
    return switch (state) {
      AsyncLoading<EventRecommendationResponse>() => const _StatusPanel(
        key: Key('event-recommendations-loading'),
        title: 'Loading event recommendations',
        body: 'Checking for upcoming events that match your interests.',
        icon: Icons.hourglass_top,
      ),
      AsyncError<EventRecommendationResponse>(:final error) => _StatusPanel(
        key: const Key('event-recommendations-error'),
        title: 'Event recommendations unavailable',
        body: _errorCopy(error),
        icon: Icons.error_outline,
        action: FilledButton.icon(
          key: const Key('event-recommendations-retry'),
          onPressed: onRetry,
          icon: const Icon(Icons.refresh),
          label: const Text('Retry'),
        ),
      ),
      AsyncData<EventRecommendationResponse>(:final value) =>
        value.items.isEmpty
            ? _StatusPanel(
                key: const Key('event-recommendations-empty'),
                title: eventEmptyTitle,
                body: eventEmptyBody,
                icon: Icons.event_busy_outlined,
                action: onSeeAll == null
                    ? null
                    : OutlinedButton(
                        key: const Key('event-recommendations-see-all-empty'),
                        onPressed: onSeeAll,
                        child: const Text('See all'),
                      ),
              )
            : _RecommendationList(
                items: home ? value.items.take(2).toList() : value.items,
                onSeeAll: onSeeAll,
              ),
    };
  }

  String _errorCopy(Object error) {
    if (error case AppFailure(kind: AppFailureKind.authRequired)) {
      return 'Your session has expired. Sign in again.';
    }
    if (error case AppFailure(kind: AppFailureKind.authForbidden)) {
      return 'This account cannot continue.';
    }
    return 'This service is temporarily unavailable. Try again.';
  }
}

final class _RecommendationList extends StatelessWidget {
  const _RecommendationList({required this.items, this.onSeeAll});

  final List<EventRecommendation> items;
  final VoidCallback? onSeeAll;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ...items.map(
          (item) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Card(
              child: ListTile(
                key: Key('event-recommendation-${item.eventId}'),
                title: Text(item.title),
                subtitle: Text(
                  '${_formatTime(item.startAt)} to ${_formatTime(item.endAt)}\n'
                  'Matches: ${item.matchedInterests.map((interest) => interest.displayName).join(', ')}',
                ),
              ),
            ),
          ),
        ),
        if (onSeeAll != null)
          OutlinedButton(
            key: const Key('event-recommendations-see-all'),
            onPressed: onSeeAll,
            child: const Text('See all'),
          ),
      ],
    );
  }

  String _formatTime(DateTime value) =>
      value.toLocal().toString().substring(0, 16);
}

final class _StatusPanel extends StatelessWidget {
  const _StatusPanel({
    required this.title,
    required this.body,
    required this.icon,
    this.action,
    super.key,
  });

  final String title;
  final String body;
  final IconData icon;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon),
            const SizedBox(height: 12),
            Semantics(
              header: true,
              child: Text(
                title,
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ),
            const SizedBox(height: 8),
            Text(body),
            if (action != null) ...[const SizedBox(height: 12), action!],
          ],
        ),
      ),
    );
  }
}
