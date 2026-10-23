import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../../../core/presentation/local_time.dart';
import '../../auth/auth_providers.dart';
import '../domain/event_detail_repository.dart';
import 'event_detail_controller.dart';

final class EventDetailPage extends ConsumerStatefulWidget {
  const EventDetailPage({
    required this.eventId,
    this.syntheticPreview = false,
    super.key,
  });
  final String eventId;
  final bool syntheticPreview;
  @override
  ConsumerState<EventDetailPage> createState() => _EventDetailPageState();
}

final class _EventDetailPageState extends ConsumerState<EventDetailPage>
    with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        ref.read(eventDetailControllerProvider(widget.eventId).notifier).load();
      }
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed && mounted) {
      ref.read(eventDetailControllerProvider(widget.eventId).notifier).clear();
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(eventDetailControllerProvider(widget.eventId));
    return Scaffold(
      appBar: AppBar(title: const Text('Event details')),
      body: SafeArea(
        child: ListView(
          key: const Key('route-event-detail'),
          padding: const EdgeInsets.all(16),
          children: [
            if (widget.syntheticPreview) ...[
              const Card(
                key: Key('event-detail-synthetic-notice'),
                child: Padding(
                  padding: EdgeInsets.all(16),
                  child: Text(
                    'Synthetic Event preview — examples only. '
                    'No real organiser, registration or participation.',
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],
            switch (state) {
              AsyncLoading<EventDetail>() => Semantics(
                liveRegion: true,
                child: Text('Loading event details…'),
              ),
              AsyncError<EventDetail>(:final error) => Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    error is AppFailure
                        ? error.message
                        : 'Event details unavailable.',
                  ),
                  FilledButton(
                    key: const Key('event-detail-retry'),
                    onPressed: () => ref
                        .read(
                          eventDetailControllerProvider(widget.eventId)
                              .notifier,
                        )
                        .load(),
                    child: const Text('Retry'),
                  ),
                ],
              ),
              AsyncData<EventDetail>(:final value) => Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    value.title,
                    key: const Key('event-detail-title'),
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 16),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.schedule),
                          const SizedBox(height: 8),
                          Text(
                            'Starts: ${localTimeLabel(context, value.startAt)}',
                          ),
                          Text(
                            value.endAt == null
                                ? 'End time not provided.'
                                : 'Ends: ${localTimeLabel(context, value.endAt!)}',
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text('Location: ${value.locationLabel ?? 'Not provided'}'),
                  Text('Category: ${value.categoryLabel ?? 'Not provided'}'),
                  const SizedBox(height: 16),
                  Text(value.shortDescription ?? 'Not provided'),
                  const SizedBox(height: 16),
                  SelectableText(value.externalSourceUrl),
                  const SizedBox(height: 8),
                  if (!widget.syntheticPreview) ...[
                    const Text(
                      'Ticketmaster source. Opens the organiser website; this does not register you for the event.',
                    ),
                    FilledButton.icon(
                      key: const Key('event-detail-open-source'),
                      onPressed: () async {
                        final result = await ref
                            .read(
                              eventDetailControllerProvider(widget.eventId)
                                  .notifier,
                            )
                            .openSource(value);
                        if (!context.mounted) return;
                        if (result case Failure<void>(:final failure)) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text(failure.message)),
                          );
                        }
                      },
                      icon: const Icon(Icons.open_in_new),
                      label: const Text('View on Ticketmaster'),
                    ),
                  ],
                  OutlinedButton.icon(
                    key: const Key('event-detail-copy-link'),
                    onPressed: () async {
                      final subject = ref.read(currentAuthSubjectProvider);
                      final result = await ref
                          .read(
                            eventDetailControllerProvider(widget.eventId)
                                .notifier,
                          )
                          .copyLink(value);
                      if (!context.mounted ||
                          ref.read(currentAuthSubjectProvider) != subject) {
                        return;
                      }
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            result is Success<void>
                                ? 'Link copied.'
                                : (result as Failure<void>).failure.message,
                          ),
                        ),
                      );
                    },
                    icon: const Icon(Icons.copy),
                    label: const Text('Copy link'),
                  ),
                ],
              ),
            },
          ],
        ),
      ),
    );
  }
}
