import 'package:flutter/material.dart';

import '../../../core/presentation/enmori_motion.dart';

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
    this.actions,
    super.key,
  }) : summary = null;
  const EventCard.summary({
    required ActivitySummary this.summary,
    required this.onSelect,
    this.authorizedReason,
    this.visibleParticipantCount,
    this.actions,
    super.key,
  }) : event = null;

  final EventDetail? event;
  final ActivitySummary? summary;
  final ValueChanged<String>? onSelect;
  final String? authorizedReason;
  final int? visibleParticipantCount;
  final Widget? actions;

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
    return MotionReveal(
      trigger: id ?? summary?.browseId,
      child: Card(
        key: ValueKey('event-card-${id ?? summary?.browseId}'),
        clipBehavior: Clip.antiAlias,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                height: 56,
                width: double.infinity,
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.event_outlined,
                      size: 26,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        category ?? 'Event',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                    ),
                    const Icon(Icons.arrow_outward),
                  ],
                ),
              ),
              Text(title, style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 8),
              Text(start, style: Theme.of(context).textTheme.labelLarge),
              if (end != null) Text('Until $end'),
              Text(location ?? 'Location not provided.'),

              if (event?.shortDescription case final description?)
                Text(description),
              if (authorizedReason case final reason?) Text(reason),
              if (visibleParticipantCount case final count? when count >= 0)
                Text('$count visible participants'),
              const SizedBox(height: 8),
              if (onSelect != null && id != null)
                TextButton.icon(
                  onPressed: () => onSelect!(id),
                  icon: const Icon(Icons.event),
                  label: const Text('Event details'),
                ),
              if (actions != null) ...[const SizedBox(height: 8), actions!],
            ],
          ),
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
