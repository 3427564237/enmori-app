import 'package:flutter/material.dart';

import '../../../core/presentation/enmori_motion.dart';
import '../../../core/presentation/local_time.dart';

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
    final start = DateTime.tryParse(
      event?.startAt.toIso8601String() ?? summary!.startAt,
    );
    final end = event?.endAt ?? DateTime.tryParse(summary?.endAt ?? '');
    final open = onSelect != null && id != null ? () => onSelect!(id) : null;
    final location = event?.locationLabel ?? summary?.locationLabel,
        category = event?.categoryLabel ?? summary?.categoryLabel;
    return MotionReveal(
      trigger: id ?? summary?.browseId,
      child: Card(
        key: ValueKey('event-card-${id ?? summary?.browseId}'),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            InkWell(
              key: ValueKey('event-open-${id ?? summary?.browseId}'),
              onTap: open,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          backgroundColor: Theme.of(context)
                              .colorScheme
                              .primaryContainer,
                          child: const Icon(Icons.event_outlined),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            category ?? 'Event',
                            style: Theme.of(context).textTheme.labelLarge,
                          ),
                        ),
                        if (open != null) const Icon(Icons.chevron_right),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(title, style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: 8),
                    Text(
                      start == null
                          ? 'Time unavailable'
                          : localTimeLabel(context, start),
                      style: Theme.of(context).textTheme.labelLarge,
                    ),
                    if (end != null)
                      Text('Until ${localTimeLabel(context, end)}'),
                    const SizedBox(height: 4),
                    Text(location ?? 'Location not provided.'),
                    if (event?.shortDescription case final description?) ...[
                      const SizedBox(height: 8),
                      Text(description),
                    ],
                    if (authorizedReason case final reason?) ...[
                      const SizedBox(height: 8),
                      Text(
                        reason,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                    if (visibleParticipantCount case final count?
                        when count >= 0)
                      Text('$count visible participants'),
                    if (open != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        'Event details',
                        style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          color: Theme.of(context).colorScheme.primary,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            if (actions != null) ...[
              const Divider(height: 1),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                child: actions!,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
