import '../../../core/presentation/enmori_localizations.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/status_panel.dart';

import '../../event_browse/domain/activity_repository.dart';
import 'event_batches_controller.dart';
import 'event_card.dart';

/// Explicit next source batches, with display-only categories and stable dedupe.
final class ParticipationEventsPage extends ConsumerStatefulWidget {
  const ParticipationEventsPage({
    required this.onSelect,
    this.onOpenPlans,
    super.key,
  });
  final ValueChanged<String> onSelect;
  final VoidCallback? onOpenPlans;
  @override
  ConsumerState<ParticipationEventsPage> createState() =>
      _ParticipationEventsPageState();
}

final class _ParticipationEventsPageState
    extends ConsumerState<ParticipationEventsPage>
    with WidgetsBindingObserver {
  String? _category;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) ref.read(eventBatchesProvider.notifier).load();
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed && mounted) {
      ref.read(eventBatchesProvider.notifier).clear();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(eventBatchesProvider),
        controller = ref.read(eventBatchesProvider.notifier);
    final value = state.batch;
    final items = value?.items ?? const <ActivitySummary>[];
    final categories =
        items.map((s) => s.categoryLabel).whereType<String>().toSet().toList()
          ..sort();

    return Scaffold(
      appBar: AppBar(
        title: Text(context.tr('Events', '活动')),
        actions: [
          IconButton(
            tooltip: context.tr('Refresh events', '刷新活动'),
            onPressed: state.busy ? null : controller.load,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: controller.load,
          child: ListView(
            key: const PageStorageKey("events-browse"),
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            children: [
              if (widget.onOpenPlans != null) ...[
                OutlinedButton.icon(
                  onPressed: widget.onOpenPlans,
                  icon: const Icon(Icons.event_note_outlined),
                  label: Text(context.tr('My plans', '我的活动计划')),
                ),
                const SizedBox(height: 12),
              ],
              Text(
                context.tr(
                  'Source: Ticketmaster · filters apply to loaded events',
                  '来源：Ticketmaster · 仅筛选已加载的活动',
                ),
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 16),
              if (state.busy)
                Padding(
                  padding: EdgeInsets.symmetric(vertical: 12),
                  child: LinearProgressIndicator(
                    semanticsLabel: context.tr('Loading events', '正在加载活动'),
                  ),
                ),
              if (state.failure case final failure?)
                StatusPanel(
                  title: value == null
                      ? context.tr('Events unavailable', '活动暂不可用')
                      : context.tr(
                          'More events couldn’t be loaded',
                          '无法加载更多活动',
                        ),
                  body: value == null
                      ? localizedFailure(context, failure)
                      : context.tr(
                          '${failure.message} Your current events are still shown.',
                          '${localizedFailure(context, failure)} 仍显示当前活动。',
                        ),
                  icon: Icons.cloud_off_outlined,
                  isError: true,
                ),
              if (value != null) ...[
                if (categories.isNotEmpty || _category != null)
                  Wrap(
                    spacing: 8,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      PopupMenuButton<String>(
                        tooltip: context.tr('Filter event category', '筛选活动分类'),
                        initialValue: _category,
                        onSelected: (category) =>
                            setState(() => _category = category),
                        itemBuilder: (_) => [
                          for (final c in categories)
                            PopupMenuItem(value: c, child: Text(c)),
                        ],
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.tune, size: 20),
                              const SizedBox(width: 8),
                              Flexible(
                                child: Text(
                                  _category ??
                                      context.tr('All categories', '全部分类'),
                                ),
                              ),
                              const Icon(Icons.expand_more),
                            ],
                          ),
                        ),
                      ),
                      if (_category != null)
                        TextButton(
                          onPressed: () => setState(() => _category = null),
                          child: Text(context.tr('Clear filter', '清除筛选')),
                        ),
                    ],
                  ),
                if (_category != null &&
                    !items.any((item) => item.categoryLabel == _category))
                  Padding(
                    padding: EdgeInsets.symmetric(vertical: 16),
                    child: Text(
                      context.tr(
                        'No matching events loaded. Clear the filter or load more events.',
                        '已加载的活动中没有匹配项，请清除筛选或加载更多活动。',
                      ),
                    ),
                  ),
                if (items.isEmpty)
                  Text(
                    context.tr(
                      'No events in this available selection. Check again later.',
                      '当前可用范围内没有活动，请稍后查看。',
                    ),
                  ),
                for (final item in items.where(
                  (s) => _category == null || s.categoryLabel == _category,
                )) ...[
                  EventCard.summary(
                    key: ValueKey(item.eventId ?? item.browseId),
                    summary: item,
                    onSelect: state.busy
                        ? null
                        : (id) {
                            if (controller.isCurrentSnapshot(state)) {
                              widget.onSelect(id);
                            }
                          },
                  ),
                ],
                if (value.nextCursor != null)
                  TextButton(
                    onPressed: state.busy ? null : controller.next,
                    child: Text(
                      state.failure == null
                          ? context.tr('Load more events', '加载更多活动')
                          : context.tr('Try loading more again', '重试加载更多'),
                    ),
                  )
                else
                  Text(
                    context.tr(
                      'You’ve reached the end of the available events.',
                      '已到达可用活动的末尾。',
                    ),
                  ),
              ] else if (!state.busy && state.failure == null)
                StatusPanel(
                  title: context.tr('Refresh your events', '刷新活动列表'),
                  body: context.tr(
                    'This view has expired or was cleared. Reload to see current events.',
                    '此页面的数据已过期或被清除，请重新加载当前活动。',
                  ),
                  icon: Icons.event_outlined,
                ),
              if (value == null)
                TextButton(
                  onPressed: state.busy ? null : controller.load,
                  child: Text(
                    value == null && state.failure != null
                        ? context.tr('Retry', '重试')
                        : context.tr('Reload', '重新加载'),
                  ),
                ),
              ExpansionTile(
                key: PageStorageKey('events-source-disclosure'),
                title: Text(context.tr('About these events', '关于这些活动')),
                children: [
                  Padding(
                    padding: EdgeInsets.fromLTRB(16, 0, 16, 16),
                    child: Text(
                      context.tr(
                        'Ticketmaster supplies this available selection, not its full catalogue. ENMORI sends the activity request and server connection information, not your sign-in token, profile or private content. Category labels are source labels, not new interest mappings. Views expire after five minutes. Opening the source website does not register or pay for an event.',
                        '这里展示 Ticketmaster 提供的可用活动，并非其完整目录。ENMORI 发送活动请求和服务器连接信息，不发送你的登录令牌、资料或私人内容。分类来自活动来源，不会创建新的兴趣映射。页面数据五分钟后过期。打开来源网站不代表报名或付款。',
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
