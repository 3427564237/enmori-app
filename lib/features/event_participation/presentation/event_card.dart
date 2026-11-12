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
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if ((event?.coverImageUrl ?? summary?.coverImageUrl)
                        case final cover?)
                      EventCover(key: ValueKey(cover), url: cover)
                    else
                      Row(
                        children: [
                          Icon(
                            Icons.image_not_supported_outlined,
                            size: 18,
                            color: Theme.of(context)
                                .colorScheme
                                .onSurfaceVariant,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              context.tr(
                                'No cover provided by source.',
                                '来源未提供封面。',
                              ),
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ),
                        ],
                      ),
                    const SizedBox(height: 12),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            title,
                            style: Theme.of(context).textTheme.titleLarge,
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
                          : singaporeEventTimeLabel(context, start),
                      style: Theme.of(context).textTheme.labelLarge,
                    ),
                    if (end != null)
                      Text(
                        context.tr(
                          'Until ${singaporeEventTimeLabel(context, end)}',
                          '结束于 ${singaporeEventTimeLabel(context, end)}',
                        ),
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    if (end == null)
                      Text(context.tr('End time not provided.', '未提供结束时间。')),
                    const SizedBox(height: 4),
                    Text(
                      location ??
                          locationHint ??
                          context.tr('Location not provided.', '未提供地点。'),
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    if (category != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        category,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                    if (content != null) ...[
                      const SizedBox(height: 8),
                      Text(content.sourceName),
                      if (content.priceLabel != null)
                        Text(eventPriceLabel(context, content.priceLabel)),
                      if (content.status != null &&
                          content.status != 'unknown' &&
                          content.status != 'available')
                        Text(eventStatusLabel(context, content.status)),
                      if (content.registrationDeadline != null)
                        Text(
                          context.tr(
                            'Closes: ${eventDeadlineLabel(context, content.registrationDeadline!)}',
                            '截止：${eventDeadlineLabel(context, content.registrationDeadline!)}',
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
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                child: actions!,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
