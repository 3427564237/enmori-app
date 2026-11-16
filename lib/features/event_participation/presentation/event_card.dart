import '../../event_detail/presentation/event_information.dart'
    show EventCover, eventStatusLabel, eventDeadlineLabel, eventPriceLabel;
import '../../../core/presentation/enmori_localizations.dart';

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
  }) : summary = null,
       locationHint = null;
  const EventCard.summary({
    required ActivitySummary this.summary,
    required this.onSelect,
    this.authorizedReason,
    this.visibleParticipantCount,
    this.actions,
    this.locationHint,
    super.key,
  }) : event = null;

  final EventDetail? event;
  final ActivitySummary? summary;
  final ValueChanged<String>? onSelect;
  final String? authorizedReason;
  final int? visibleParticipantCount;
  final Widget? actions;

  /// Summaries can omit a field that is still available in the detail source.
  final String? locationHint;

  @override
  Widget build(BuildContext context) {
    final id = event?.eventId ?? summary?.eventId ?? summary?.browseId,
        title = event?.title ?? summary!.title;
    final start = DateTime.tryParse(
      event?.startAt.toIso8601String() ?? summary!.startAt,
    );
    final end = event?.endAt ?? DateTime.tryParse(summary?.endAt ?? '');
    final open = onSelect != null && id != null ? () => onSelect!(id) : null;
    final location = event?.locationLabel ?? summary?.locationLabel,
        category = event?.categoryLabel ?? summary?.categoryLabel;
    final content = event?.content ?? summary?.content;
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
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if ((event?.coverImageUrl ?? summary?.coverImageUrl)
                        case final cover?) ...[
                      EventCover(key: ValueKey(cover), url: cover),
                      const SizedBox(height: 12),
                    ],
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            title,
                            style: Theme.of(context).textTheme.titleMedium
                                ?.copyWith(fontWeight: FontWeight.w700),
                          ),
                        ),
                        if (open != null) ...[
                          const SizedBox(width: 8),
                          const Icon(Icons.chevron_right),
                        ],
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      start == null
                          ? context.tr('Time unavailable', '暂无时间信息')
                          : end == null
                          ? singaporeEventTimeLabel(context, start)
                          : singaporeEventTimeRangeLabel(context, start, end),
                      style: Theme.of(context).textTheme.labelLarge,
                    ),
                    if (end != null && start == null)
                      Text(
                        context.tr(
                          'Until ${singaporeEventTimeLabel(context, end)}',
                          '结束于 ${singaporeEventTimeLabel(context, end)}',
                        ),
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    if (end == null)
                      Text(
                        context.tr('End time not provided.', '未提供结束时间。'),
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    const SizedBox(height: 4),
                    Text(
                      location ??
                          locationHint ??
                          context.tr('Location not provided.', '未提供地点。'),
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    if (content != null || category != null) ...[
                      const SizedBox(height: 8),
                      DefaultTextStyle(
                        style: Theme.of(context).textTheme.bodySmall!,
                        child: Wrap(
                          spacing: 12,
                          runSpacing: 4,
                          children: [
                            if (content != null) Text(content.sourceName),
                            if (content?.priceLabel != null)
                              Text(
                                eventPriceLabel(context, content!.priceLabel),
                              ),
                            if (category != null) Text(category),
                          ],
                        ),
                      ),
                    ],
                    if (content != null) ...[
                      if (content.status != null &&
                          content.status != 'unknown' &&
                          content.status != 'available')
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            eventStatusLabel(context, content.status),
                            style: Theme.of(context).textTheme.labelLarge
                                ?.copyWith(
                                  color: Theme.of(context).colorScheme.error,
                                ),
                          ),
                        ),
                      if (content.registrationDeadline != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            context.tr(
                              'Closes: ${eventDeadlineLabel(context, content.registrationDeadline!)}',
                              '截止：${eventDeadlineLabel(context, content.registrationDeadline!)}',
                            ),
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ),
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
                      Text(
                        context.tr(
                          '$count visible participants',
                          '$count 位可见参与者',
                        ),
                      ),
                  ],
                ),
              ),
            ),
            if (actions != null) ...[
              const Divider(height: 1),
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
                child: actions!,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
