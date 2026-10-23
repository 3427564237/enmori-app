import '../core/presentation/enmori_localizations.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/event_browse/domain/activity_repository.dart';
import '../features/event_participation/presentation/event_card.dart';
import '../features/event_participation/presentation/participation_controls.dart';
import '../features/event_participation/presentation/participation_controller.dart';
import '../features/event_recommendations/domain/event_recommendation_repository.dart';

/// Composition projects only fields actually authorized in the recommendation.
final class ConnectedRecommendationCard extends ConsumerWidget {
  const ConnectedRecommendationCard({
    required this.event,
    this.onOpen,
    super.key,
  });
  final EventRecommendation event;
  final ValueChanged<String>? onOpen;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ignored = ref.watch(
      participationControllerProvider.select(
        (rows) => rows[event.eventId]?.value?.ignored ?? false,
      ),
    );
    if (ignored) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        EventCard.summary(
          key: ValueKey('event-recommendation-${event.eventId}'),
          summary: ActivitySummary(
            browseId: event.eventId,
            eventId: event.eventId,
            title: event.title,
            startAt: event.startAt.toLocal().toString(),
            endAt: event.endAt?.toLocal().toString(),
          ),
          authorizedReason: context.tr(
            'Matches: ${event.matchedInterests.map((interest) => interest.displayName).join(', ')}',
            '匹配兴趣：${event.matchedInterests.map((interest) => interest.displayName).join('、')}',
          ),
          onSelect: onOpen,
          actions: ParticipationControls(eventId: event.eventId),
        ),
      ],
    );
  }
}
