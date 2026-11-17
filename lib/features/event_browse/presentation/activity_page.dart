import '../../event_participation/presentation/event_card.dart';
import '../../../core/presentation/refresh_on_return.dart';

import 'dart:async';

import '../../../core/presentation/enmori_localizations.dart';

import '../../../core/presentation/event_source_coverage_notice.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/status_panel.dart';
import '../../../core/presentation/local_time.dart';
import '../../../core/result/result.dart';
import '../domain/activity_repository.dart';
import 'activity_controller.dart';

const _listDisclosure =
    'Sources: Ticketmaster / onePA. Activity requests pass through ENMORI to these public sources. '
    'Your ENMORI sign-in token, profile, Check-ins, Personas and AI messages are '
    'not shared with Ticketmaster. Ticketmaster receives the activity request '
    'and server connection information.';
const _sourceActionDisclosure =
    '“Official registration / tickets” opens the event’s ticket link in your browser. '
    'Ticketmaster controls the destination, including booking or seat selection. Your browser '
    'connects directly to Ticketmaster; its privacy and cookie policies apply. '
    'Opening or copying a link does not register you or mark you as Going. '
    "A copied link can remain on your device's clipboard.";
const _lifetimeDisclosure =
    "This activity view stays in ENMORI's memory for at most five minutes and "
    'clears when it expires or you sign out. Reload to '
    'request current information.';

/// LI supplies route/session guards and list navigation. Never remaps /events.
final class ActivityPage extends ConsumerStatefulWidget {
  const ActivityPage({
    this.browseId = '',
    this.onSelect,
    this.detailBuilder,
    this.adminCategoryBuilder,
    super.key,
  });
  final String browseId;
  final ValueChanged<String>? onSelect;
  final Widget Function(BuildContext, ActivityDetail)? detailBuilder;
  final Widget Function(ActivityDetail, VoidCallback)? adminCategoryBuilder;
  @override
  ConsumerState<ActivityPage> createState() => _ActivityPageState();
}

final class _ActivityPageState extends ConsumerState<ActivityPage>
    with WidgetsBindingObserver {
  int _scheduledLoad = 0;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _scheduleLoad();
  }

  @override
  void didUpdateWidget(ActivityPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.browseId != widget.browseId) _scheduleLoad();
  }

  void _scheduleLoad() {
    final scheduled = ++_scheduledLoad, browseId = widget.browseId;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted &&
          scheduled == _scheduledLoad &&
          widget.browseId == browseId) {
        ref.read(activityControllerProvider(browseId).notifier).load();
      }
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    ref
        .read(activityControllerProvider(widget.browseId).notifier)
        .setForeground(state == AppLifecycleState.resumed);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  Future<void> _action(bool open) async {
    final notice = await ref
        .read(activityControllerProvider(widget.browseId).notifier)
        .sourceAction(open: open);
    if (mounted && notice != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            context.tr(notice, switch (notice) {
              'Link copied.' => '链接已复制。',
              _ => '无法打开或复制来源链接，请重试。',
            }),
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(activityControllerProvider(widget.browseId));
    final controller = ref.read(
      activityControllerProvider(widget.browseId).notifier,
    );
    final page = Scaffold(
      appBar: AppBar(
        title: Text(
          widget.browseId.isEmpty
              ? context.tr('Browse activities', '浏览活动')
              : context.tr('Activity details', '活动详情'),
        ),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (widget.browseId.isEmpty)
              Text(
                context.tr(
                  'Explore a selection of events near and far. This is a bounded selection from the sources.',
                  '探索这里提供的活动，当前列表为来源提供的有界活动范围。',
                ),
              ),
            Text(
              context.tr(
                'Sources: Ticketmaster / onePA',
                '来源：Ticketmaster／onePA',
              ),
            ),
            const SizedBox(height: 16),
            switch (state) {
              AsyncLoading<ActivityRead?>() => StatusPanel(
                title: context.tr('Loading activities…', '正在加载活动…'),
                body: context.tr(
                  'Requesting current source information.',
                  '正在向活动来源请求最新信息。',
                ),
                icon: Icons.event_outlined,
                loading: true,
              ),
              AsyncError<ActivityRead?>(:final error) => StatusPanel(
                title: context.tr('Activities unavailable', '活动暂不可用'),
                body: error is AppFailure
                    ? localizedFailure(context, error)
                    : context.tr(
                        'Activities are unavailable. Try again.',
                        '活动暂不可用，请重试。',
                      ),
                icon: Icons.cloud_off_outlined,
                isError: true,
              ),
              AsyncData<ActivityRead?>(
                value: ActivityBatch(
                  :final items,
                  :final sourceStatus,
                  :final sourceCoverage,
                ),
              ) =>
                Column(
                  children: [
                    for (final source in sourceStatus.entries)
                      Text(
                        '${source.key}: ${source.value ? context.tr('available', '可用') : context.tr('unavailable', '暂不可用')}',
                      ),
                    EventSourceCoverageNotice(
                      sourceStatus: sourceStatus,
                      sourceCoverage: sourceCoverage,
                    ),
                    if (items.isEmpty)
                      StatusPanel(
                        title: context.tr('No activities to show', '暂无活动'),
                        body: context.tr(
                          'This available selection is empty. You can check again later.',
                          '当前可用范围内没有活动，可以稍后再查看。',
                        ),
                        icon: Icons.event_busy_outlined,
                      ),
                    for (final item in items)
                      EventCard.summary(
                        summary: item,
                        onSelect: widget.onSelect == null
                            ? null
                            : (_) {
                                if (controller.isCurrentSnapshot(state)) {
                                  widget.onSelect!(item.browseId);
                                }
                              },
                      ),
                  ],
                ),
              AsyncData<ActivityRead?>(value: final ActivityDetail detail) =>
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (widget.detailBuilder != null)
                      widget.detailBuilder!(context, detail)
                    else ...[
                      Text(
                        detail.summary.title,
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      Text(
                        context.tr(
                          'Starts: ${_time(context, detail.summary.startAt)}',
                          '开始：${_time(context, detail.summary.startAt)}',
                        ),
                      ),
                      Text(
                        detail.summary.endAt == null
                            ? context.tr('End time not provided.', '未提供结束时间。')
                            : context.tr(
                                'Ends: ${_time(context, detail.summary.endAt!)}',
                                '结束：${_time(context, detail.summary.endAt!)}',
                              ),
                      ),
                      Text(
                        detail.locationLabel ??
                            context.tr('Location unavailable.', '暂无地点信息。'),
                      ),
                      Text(
                        detail.categoryLabel ??
                            context.tr('Category unavailable.', '暂无分类信息。'),
                      ),
                      Text(
                        detail.shortDescription ??
                            context.tr(
                              'Event description unavailable.',
                              '暂无可用活动简介。',
                            ),
                      ),
                    ],
                    if (widget.adminCategoryBuilder != null)
                      widget.adminCategoryBuilder!(
                        detail,
                        () => unawaited(controller.load()),
                      ),
                    const SizedBox(height: 16),
                    Text(
                      context.tr(
                        _sourceActionDisclosure,
                        '购票／预订会通过浏览器打开 Ticketmaster 的购票链接，具体预订或选座页面由 Ticketmaster 决定。浏览器将直接连接 Ticketmaster，其隐私与 Cookie 政策适用。打开或复制链接不代表报名，也不会标记为将参加。复制的链接可能保留在设备剪贴板中。',
                      ),
                    ),
                    FilledButton(
                      onPressed: () => _action(true),
                      child: Text(
                        context.tr(
                          'Official registration / tickets',
                          '官网报名／购票',
                        ),
                      ),
                    ),
                    TextButton(
                      onPressed: () => _action(false),
                      child: Text(context.tr('Copy source link', '复制来源链接')),
                    ),
                  ],
                ),
              _ => StatusPanel(
                title: context.tr('Activity view cleared', '活动数据已清除'),
                body: context.tr(
                  'Reload activities to continue.',
                  '请重新加载活动后继续。',
                ),
                icon: Icons.refresh,
              ),
            },
            const SizedBox(height: 16),
            if (!state.isLoading)
              OutlinedButton(
                onPressed: controller.load,
                child: Text(
                  state.hasError
                      ? context.tr('Retry', '重试')
                      : context.tr('Reload', '重新加载'),
                ),
              ),
            const SizedBox(height: 16),
            if (widget.browseId.isEmpty) ...[
              Text(
                context.tr(
                  _listDisclosure,
                  '活动来源为 Ticketmaster，活动请求通过 ENMORI 发送。你的登录令牌、资料、签到、人设与 AI 消息不会发送给 Ticketmaster。Ticketmaster 会收到活动请求和服务器连接信息。',
                ),
              ),
              const SizedBox(height: 12),
            ],
            Text(
              context.tr(
                _lifetimeDisclosure,
                '活动数据最多在 ENMORI 内存中保留五分钟，到期或退出登录时会清除。重新加载可获取最新信息。',
              ),
            ),
          ],
        ),
      ),
    );
    return RefreshOnReturn(
      onRefresh: () {
        final controller = ref.read(
          activityControllerProvider(widget.browseId).notifier,
        );
        if (!controller.hasFreshData) unawaited(controller.load());
      },
      child: page,
    );
  }
}

String _time(BuildContext context, String value) {
  final date = DateTime.tryParse(value);
  return date == null
      ? context.tr('Time unavailable', '暂无时间信息')
      : localTimeLabel(context, date);
}
