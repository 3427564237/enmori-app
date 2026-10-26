import '../../../core/presentation/refresh_on_return.dart';

import 'dart:async';

import '../../../core/presentation/enmori_localizations.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../domain/event_detail_repository.dart';
import 'event_detail_controller.dart';
import 'event_information.dart';

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
  int _scheduledLoad = 0;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _scheduleLoad();
  }

  @override
  void didUpdateWidget(EventDetailPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.eventId != widget.eventId) _scheduleLoad();
  }

  void _scheduleLoad() {
    final scheduled = ++_scheduledLoad, eventId = widget.eventId;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && scheduled == _scheduledLoad && widget.eventId == eventId) {
        ref.read(eventDetailControllerProvider(eventId).notifier).load();
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
    if (state == AppLifecycleState.resumed && mounted) {
      ref
          .read(eventDetailControllerProvider(widget.eventId).notifier)
          .setForeground(true);
    }
    if (state != AppLifecycleState.resumed && mounted) {
      ref
          .read(eventDetailControllerProvider(widget.eventId).notifier)
          .setForeground(false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(eventDetailControllerProvider(widget.eventId));
    final page = Scaffold(
      appBar: AppBar(title: Text(context.tr('Event details', '活动详情'))),
      body: SafeArea(
        child: ListView(
          key: const Key('route-event-detail'),
          padding: const EdgeInsets.all(16),
          children: [
            if (widget.syntheticPreview) ...[
              Card(
                key: Key('event-detail-synthetic-notice'),
                child: Padding(
                  padding: EdgeInsets.all(16),
                  child: Text(
                    context.tr(
                      'Synthetic Event preview — examples only. '
                          'No real organiser, registration or participation.',
                      '合成活动预览，仅为示例，没有真实主办方、报名或参与。',
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],
            switch (state) {
              AsyncLoading<EventDetail>() => Semantics(
                liveRegion: true,
                child: Text(context.tr('Loading event details…', '正在加载活动详情…')),
              ),
              AsyncError<EventDetail>(:final error) => Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    error is AppFailure
                        ? localizedFailure(context, error)
                        : context.tr('Event details unavailable.', '活动详情暂不可用。'),
                  ),
                  FilledButton(
                    key: const Key('event-detail-retry'),
                    onPressed: () => ref
                        .read(
                          eventDetailControllerProvider(widget.eventId)
                              .notifier,
                        )
                        .load(),
                    child: Text(context.tr('Retry', '重试')),
                  ),
                ],
              ),
              AsyncData<EventDetail>(:final value) => Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  EventInformation(
                    event: value,
                    syntheticPreview: widget.syntheticPreview,
                  ),
                  const SizedBox(height: 8),
                  if (!widget.syntheticPreview) ...[
                    Text(
                      context.tr(
                        'Ticketmaster handles tickets and booking. Its link may open booking or seat selection. Opening it does not register you for the event.',
                        'Ticketmaster 处理购票与预订，链接可能打开预订或选座页面。打开网页不代表你已报名。',
                      ),
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
                            SnackBar(
                              content: Text(localizedFailure(context, failure)),
                            ),
                          );
                        }
                      },
                      icon: const Icon(Icons.open_in_new),
                      label: Text(
                        context.tr(
                          'Tickets / booking on Ticketmaster',
                          '在 Ticketmaster 购票／预订',
                        ),
                      ),
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
                                ? context.tr('Link copied.', '链接已复制。')
                                : localizedFailure(
                                    context,
                                    (result as Failure<void>).failure,
                                  ),
                          ),
                        ),
                      );
                    },
                    icon: const Icon(Icons.copy),
                    label: Text(context.tr('Copy link', '复制链接')),
                  ),
                ],
              ),
            },
          ],
        ),
      ),
    );
    return RefreshOnReturn(
      onRefresh: () {
        final controller = ref.read(
          eventDetailControllerProvider(widget.eventId).notifier,
        );
        if (!controller.hasFreshData) unawaited(controller.load());
      },
      child: page,
    );
  }
}
