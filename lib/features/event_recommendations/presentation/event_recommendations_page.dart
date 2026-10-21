import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/status_panel.dart';
import '../../../core/result/result.dart';
import '../domain/event_recommendation_repository.dart';
import 'event_recommendations_controller.dart';

typedef RecommendationCardBuilder = Widget Function(
  BuildContext context,
  EventRecommendation event,
  ValueChanged<String>? onOpen,
);

const eventEmptyTitle = 'No event recommendations right now';
const eventEmptyBody = 'Update your interests or check again later.';

final class EventRecommendationsSection extends ConsumerStatefulWidget {
  const EventRecommendationsSection({
    required this.onSeeAll,
    this.onOpenEvent,
    this.recommendationCardBuilder,
    this.syntheticPreview = false,
    super.key,
  });

  final VoidCallback onSeeAll;
  final void Function(String)? onOpenEvent;
  final RecommendationCardBuilder? recommendationCardBuilder;
  final bool syntheticPreview;

  @override
  ConsumerState<EventRecommendationsSection> createState() =>
      _EventRecommendationsSectionState();
}

final class _EventRecommendationsSectionState
    extends ConsumerState<EventRecommendationsSection>
    with WidgetsBindingObserver {
  late final EventRecommendationsController _controller;
  int? _operation;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _controller = ref.read(eventRecommendationsControllerProvider.notifier);
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    final operation = _operation;
    if (operation != null) _controller.abandon(operation);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed && mounted) _controller.clear();
  }

  void _load() {
    _operation = _controller.load(view: EventRecommendationView.home);
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(eventRecommendationsControllerProvider);
    return _RecommendationContent(
      state: state,
      onRetry: _load,
      onSeeAll: widget.onSeeAll,
      home: true,
      onOpenEvent: widget.onOpenEvent,
      recommendationCardBuilder: widget.recommendationCardBuilder,
      syntheticPreview: widget.syntheticPreview,
    );
  }
}

final class EventRecommendationsPage extends ConsumerStatefulWidget {
  const EventRecommendationsPage({
    this.onOpenEvent,
    this.recommendationCardBuilder,
    this.syntheticPreview = false,
    super.key,
  });
  final void Function(String)? onOpenEvent;
  final RecommendationCardBuilder? recommendationCardBuilder;
  final bool syntheticPreview;

  @override
  ConsumerState<EventRecommendationsPage> createState() =>
      _EventRecommendationsPageState();
}

final class _EventRecommendationsPageState
    extends ConsumerState<EventRecommendationsPage>
    with WidgetsBindingObserver {
  late final EventRecommendationsController _controller;
  int? _operation;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _controller = ref.read(eventRecommendationsControllerProvider.notifier);
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    final operation = _operation;
    if (operation != null) _controller.abandon(operation);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed && mounted) _controller.clear();
  }

  void _load() {
    _operation = _controller.load(view: EventRecommendationView.all);
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
            _RecommendationContent(
              state: state,
              onRetry: _load,
              onOpenEvent: widget.onOpenEvent,
              recommendationCardBuilder: widget.recommendationCardBuilder,
              syntheticPreview: widget.syntheticPreview,
            ),
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
    this.onOpenEvent,
    this.recommendationCardBuilder,
    this.syntheticPreview = false,
  });

  final AsyncValue<EventRecommendationResponse> state;
  final VoidCallback onRetry;
  final VoidCallback? onSeeAll;
  final bool home;
  final bool syntheticPreview;
  final void Function(String)? onOpenEvent;
  final RecommendationCardBuilder? recommendationCardBuilder;

  @override
  Widget build(BuildContext context) {
    final content = switch (state) {
      AsyncLoading<EventRecommendationResponse>() => const StatusPanel(
        key: Key('event-recommendations-loading'),
        title: 'Loading event recommendations',
        loading: true,
        body: 'Checking for upcoming events that match your interests.',
        icon: Icons.hourglass_top,
      ),
      AsyncError<EventRecommendationResponse>(
        error: EventRecommendationsRefreshRequired(),
      ) =>
        StatusPanel(
          key: const Key('event-recommendations-refresh-required'),
          title: 'Refresh event recommendations',
          body: 'Refresh to check for current matches for your interests.',
          icon: Icons.refresh,
          action: OutlinedButton.icon(
            key: const Key('event-recommendations-refresh'),
            onPressed: onRetry,
            icon: const Icon(Icons.refresh),
            label: const Text('Refresh'),
          ),
        ),
      AsyncError<EventRecommendationResponse>(:final error) => StatusPanel(
        key: const Key('event-recommendations-error'),
        title: 'Event recommendations unavailable',
        isError: true,
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
            ? StatusPanel(
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
                onOpenEvent: onOpenEvent,
                recommendationCardBuilder: recommendationCardBuilder,
              ),
    };
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (syntheticPreview) ...[
          const Card(
            key: Key('event-synthetic-notice'),
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Synthetic Event preview — examples only. '
                'No real registration or participation.',
              ),
            ),
          ),
          const SizedBox(height: 12),
        ],
        content,
        if (state is AsyncData<EventRecommendationResponse>) ...[
          const SizedBox(height: 12),
          OutlinedButton.icon(
            key: const Key('event-recommendations-refresh'),
            onPressed: onRetry,
            icon: const Icon(Icons.refresh),
            label: const Text('Refresh'),
          ),
        ],
      ],
    );
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
  const _RecommendationList({
    required this.items,
    this.onSeeAll,
    this.onOpenEvent,
    this.recommendationCardBuilder,
  });

  final List<EventRecommendation> items;
  final void Function(String)? onOpenEvent;
  final RecommendationCardBuilder? recommendationCardBuilder;
  final VoidCallback? onSeeAll;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ...items.map(
          (item) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child:
                recommendationCardBuilder?.call(context, item, onOpenEvent) ??
                Card(
                  child: ListTile(
                    key: Key('event-recommendation-${item.eventId}'),
                    onTap: onOpenEvent == null
                        ? null
                        : () => onOpenEvent!(item.eventId),
                    title: Text(item.title),
                    leading: Icon(
                      Icons.event_outlined,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                    trailing: onOpenEvent == null
                        ? null
                        : const Icon(Icons.chevron_right),
                    contentPadding: const EdgeInsets.all(16),
                    subtitle: Text(
                      '${_formatTime(item.startAt)}\n'
                      '${item.endAt == null ? 'End time not provided.' : 'Ends: ${_formatTime(item.endAt!)}'}\n'
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
