import 'package:flutter/material.dart';

import '../../event_detail/domain/event_detail_repository.dart';

/// One card for Home and Events. All optional social values must already be
/// authorized by Backend; missing values never become invented zero totals.
final class EventCard extends StatelessWidget {
  const EventCard({
    required this.event,
    required this.onSelect,
    this.authorizedReason,
    this.visibleParticipantCount,
    super.key,
  });

  final EventDetail event;
  final ValueChanged<String> onSelect;
  final String? authorizedReason;
  final int? visibleParticipantCount;

  @override
  Widget build(BuildContext context) => Card(
    key: ValueKey('event-card-${event.eventId}'),
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(event.title, style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          Text('Starts: ${event.startAt.toLocal()}'),
          Text(
            event.endAt == null
                ? 'End time not provided.'
                : 'Ends: ${event.endAt!.toLocal()}',
          ),
          Text(event.locationLabel ?? 'Location not provided.'),
          if (event.categoryLabel case final category?) Text(category),
          if (event.shortDescription case final description?) Text(description),
          if (authorizedReason case final reason?) Text(reason),
          if (visibleParticipantCount case final count? when count >= 0)
            Text('$count visible participants'),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: () => onSelect(event.eventId),
            icon: const Icon(Icons.event),
            label: const Text('Event details'),
          ),
        ],
      ),
    ),
  );
}
