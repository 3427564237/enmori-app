import '../../../core/presentation/enmori_localizations.dart';

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
                            context.tr(
                              'Starts: ${localTimeLabel(context, value.startAt)}',
                              '开始：${localTimeLabel(context, value.startAt)}',
                            ),
                          ),
                          Text(
                            value.endAt == null
                                ? context.tr(
                                    'End time not provided.',
                                    '未提供结束时间。',
                                  )
                                : context.tr(
                                    'Ends: ${localTimeLabel(context, value.endAt!)}',
                                    '结束：${localTimeLabel(context, value.endAt!)}',
                                  ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    context.tr(
                      'Location: ${value.locationLabel ?? 'Not provided'}',
                      '地点：${value.locationLabel ?? '未提供'}',
                    ),
                  ),
                  Text(
                    context.tr(
                      'Category: ${value.categoryLabel ?? 'Not provided'}',
                      '分类：${value.categoryLabel ?? '未提供'}',
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    value.shortDescription ?? context.tr('Not provided', '未提供'),
                  ),
                  const SizedBox(height: 16),
                  SelectableText(value.externalSourceUrl),
                  const SizedBox(height: 8),
                  if (!widget.syntheticPreview) ...[
                    Text(
                      context.tr(
                        'Ticketmaster source. Opens the organiser website; this does not register you for the event.',
                        '来源为 Ticketmaster。打开主办方网站不代表你已报名。',
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
                        context.tr('View on Ticketmaster', '在 Ticketmaster 查看'),
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
  }
}
