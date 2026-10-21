import 'package:flutter/material.dart';

import '../../event_detail/domain/event_detail_repository.dart';
import '../../event_browse/domain/activity_repository.dart';

/// One card for Home and Events. All optional social values must already be
/// authorized by Backend; missing values never become invented zero totals.
final class EventCard extends StatelessWidget {
  const EventCard({
    required EventDetail this.event,
    required this.onSelect,
    this.authorizedReason,
    this.visibleParticipantCount,
    super.key,
  }) : summary = null;
  const EventCard.summary({
    required ActivitySummary this.summary,
    required this.onSelect,
    this.authorizedReason,
    this.visibleParticipantCount,
    super.key,
  }) : event = null;

  final EventDetail? event;
  final ActivitySummary? summary;
  final ValueChanged<String>? onSelect;
  final String? authorizedReason;
  final int? visibleParticipantCount;

  @override
  Widget build(BuildContext context) {
    final id = event?.eventId ?? summary?.eventId,
        title = event?.title ?? summary!.title;
    final start = _localTime(
      event?.startAt.toIso8601String() ?? summary!.startAt,
    );
    final endValue = event?.endAt?.toIso8601String() ?? summary?.endAt;
    final end = endValue == null ? null : _localTime(endValue);
    final location = event?.locationLabel ?? summary?.locationLabel,
        category = event?.categoryLabel ?? summary?.categoryLabel;
    return Card(
      key: ValueKey('event-card-${id ?? summary?.browseId}'),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            Text('Starts: $start'),
            Text(end == null ? 'End time not provided.' : 'Ends: $end'),
            Text(location ?? 'Location not provided.'),
            if (category != null) Text(category),
            if (event?.shortDescription case final description?)
              Text(description),
            if (authorizedReason case final reason?) Text(reason),
            if (visibleParticipantCount case final count? when count >= 0)
              Text('$count visible participants'),
            const SizedBox(height: 8),
            if (onSelect != null && id != null)
              OutlinedButton.icon(
                onPressed: () => onSelect!(id),
                icon: const Icon(Icons.event),
                label: const Text('Event details'),
              ),
          ],
        ),
      ),
    );
  }
}

String _localTime(String value) {
  final date = DateTime.tryParse(value)?.toLocal();
  if (date == null) return 'Time unavailable';
  String two(int number) => number.toString().padLeft(2, '0');
  return '${date.year}-${two(date.month)}-${two(date.day)} ${two(date.hour)}:${two(date.minute)} (local time)';
}
