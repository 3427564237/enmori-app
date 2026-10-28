import '../../recommendation_profile/presentation/activity_area_bar.dart';
import '../../../core/presentation/refresh_on_return.dart';

import 'dart:async';

import '../../../core/presentation/enmori_localizations.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/status_panel.dart';
import '../../auth/auth_providers.dart';

import '../../event_browse/domain/activity_repository.dart';
import 'event_batches_controller.dart';
import '../domain/event_time_filter.dart';
import 'event_card.dart';

/// Explicit next source batches, with display-only categories and stable dedupe.
final class ParticipationEventsPage extends ConsumerStatefulWidget {
  const ParticipationEventsPage({
    required this.onSelect,
    this.onOpenPlans,
    this.onOpenRecent,
    super.key,
  });
  final ValueChanged<String> onSelect;
  final VoidCallback? onOpenPlans;
  final VoidCallback? onOpenRecent;
  @override
  ConsumerState<ParticipationEventsPage> createState() =>
      _ParticipationEventsPageState();
}

final class _ParticipationEventsPageState
    extends ConsumerState<ParticipationEventsPage>
    with WidgetsBindingObserver {
  String? _category;
  EventTimeFilter _timeFilter = EventTimeFilter.all;
  int _timeSort = 0;
  final _sortKey = GlobalKey<FormFieldState<int>>();
  final _search = TextEditingController();
  String _query = '';
  bool _searching = false;
  int _searchGeneration = 0;
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
    ref
        .read(eventBatchesProvider.notifier)
        .setForeground(state == AppLifecycleState.resumed);
    if (state != AppLifecycleState.resumed && mounted) {
      _searchGeneration++;
      _searching = false;
    }
  }

  @override
  void dispose() {
    _searchGeneration++;
    _search.dispose();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(authSessionProvider, (before, after) {
      if (!identical(before?.asData?.value, after.asData?.value)) {
        _searchGeneration++;
        _search.clear();
        setState(() {
          _query = '';
          _category = null;
          _timeFilter = EventTimeFilter.all;
          _timeSort = 0;
          _sortKey.currentState?.didChange(0);
          _searching = false;
        });
      }
    });
    final state = ref.watch(eventBatchesProvider),
        controller = ref.read(eventBatchesProvider.notifier);
    final value = state.batch;
    final items = value?.items ?? const <ActivitySummary>[];
    final categories =
        items.map((s) => s.categoryLabel).whereType<String>().toSet().toList()
          ..sort();
    final query = _query.trim().toLowerCase();
    final matching = items
        .where(
          (item) =>
              matchesEventTime(item.startAt, _timeFilter, DateTime.now()) &&
              (_category == null || item.categoryLabel == _category) &&
              (query.isEmpty ||
                  [
                    item.title,
                    item.categoryLabel ?? '',
                    item.locationLabel ?? '',
                  ].any((text) => text.toLowerCase().contains(query))),
        )
        .toList();

    if (_timeSort != 0) {
      matching.sort((a, b) {
        final left = DateTime.tryParse(a.startAt);
        final right = DateTime.tryParse(b.startAt);
        if (left == null) return right == null ? 0 : 1;
        if (right == null) return -1;
        final order = left.compareTo(right) * _timeSort;
        return order != 0 ? order : a.browseId.compareTo(b.browseId);
      });
    }
    final page = Scaffold(
      appBar: AppBar(
        title: Text(context.tr('Events', '活动')),
        actions: [
          if (widget.onOpenRecent != null)
            IconButton(
              key: const Key('events-recent'),
              tooltip: context.tr('Recently viewed', '最近浏览'),
              onPressed: widget.onOpenRecent,
              icon: const Icon(Icons.history),
            ),
          IconButton(
            tooltip: context.tr('Refresh events', '刷新活动'),
            onPressed: state.busy ? null : () => unawaited(_reload()),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _reload,
          child: ListView(
            key: const PageStorageKey("events-browse"),
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            children: [
              const ActivityAreaBar(),
              TextField(
                key: const Key('events-search'),
                controller: _search,
                maxLength: 100,
                textInputAction: TextInputAction.search,
                decoration: InputDecoration(
                  labelText: context.tr('Search events', '搜索活动'),
                  hintText: context.tr('Name, place or category', '活动名称、地点或分类'),
                  counterText: '',
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: IconButton(
                    tooltip: context.tr('Search available events', '搜索全部可用活动'),
                    onPressed: state.busy || _searching
                        ? null
                        : () => unawaited(_searchAvailable()),
                    icon: const Icon(Icons.arrow_forward),
                  ),
                ),
                onChanged: (value) {
                  if (_searching) _stopSearch();
                  setState(() => _query = value);
                },
                onSubmitted: (_) => unawaited(_searchAvailable()),
              ),
              if (_query.isNotEmpty)
                Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton(
                    onPressed: () => setState(() {
                      _search.clear();
                      _query = '';
                    }),
                    child: Text(context.tr('Clear search', '清除搜索')),
                  ),
                ),
              const SizedBox(height: 12),
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
                  'Sources: Ticketmaster / onePA · bounded available selection',
                  '来源：Ticketmaster／onePA · 当前可用活动范围',
                ),
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 4,
                children: [
                  for (final filter in EventTimeFilter.values)
                    ChoiceChip(
                      key: Key('events-time-${filter.name}'),
                      label: Text(switch (filter) {
                        EventTimeFilter.all => context.tr('Any time', '不限时间'),
                        EventTimeFilter.today => context.tr('Today', '今天'),
                        EventTimeFilter.weekend => context.tr(
                          'This weekend',
                          '本周末',
                        ),
                        EventTimeFilter.sevenDays => context.tr(
                          'Next 7 days',
                          '未来七天',
                        ),
                      }),
                      selected: _timeFilter == filter,
                      onSelected: (_) => setState(() => _timeFilter = filter),
                    ),
                ],
              ),
              DropdownButtonFormField<int>(
                isExpanded: true,
                key: _sortKey,
                initialValue: _timeSort,
                decoration: InputDecoration(
                  labelText: context.tr('Time order', '时间排序'),
                  helperText: context.tr('Device local time', '设备本地时间'),
                  helperMaxLines: 2,
                ),
                items: [
                  DropdownMenuItem(
                    value: 0,
                    child: Text(context.tr('Source order', '来源顺序')),
                  ),
                  DropdownMenuItem(
                    value: 1,
                    child: Text(context.tr('Earliest first', '最早优先')),
                  ),
                  DropdownMenuItem(
                    value: -1,
                    child: Text(context.tr('Latest first', '最晚优先')),
                  ),
                ],
                onChanged: (value) => setState(() => _timeSort = value ?? 0),
              ),
              const SizedBox(height: 16),
              if (state.busy || _searching)
                Padding(
                  padding: EdgeInsets.symmetric(vertical: 12),
                  child: LinearProgressIndicator(
                    semanticsLabel: context.tr('Loading events', '正在加载活动'),
                  ),
                ),
              if (_searching)
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        context.tr(
                          'Searching… ${items.length} events loaded',
                          '正在搜索，已加载 ${items.length} 个活动',
                        ),
                      ),
                    ),
                    TextButton(
                      key: const Key('events-stop-search'),
                      onPressed: _stopSearch,
                      child: Text(context.tr('Stop', '停止')),
                    ),
                  ],
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
                        onSelected: (category) {
                          setState(() => _category = category);
                          unawaited(_searchAvailable());
                        },
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
                if ((_category != null ||
                        query.isNotEmpty ||
                        _timeFilter != EventTimeFilter.all) &&
                    matching.isEmpty &&
                    !state.busy &&
                    !_searching)
                  Padding(
                    padding: EdgeInsets.symmetric(vertical: 16),
                    child: Text(
                      context.tr(
                        'No matching events in the loaded selection. Clear search/filter, or search the remaining available events.',
                        '当前已加载范围内没有匹配活动，可清除搜索／筛选，或搜索剩余可用活动。',
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
                for (final source in value.sourceStatus.entries)
                  Text(
                    '${source.key}: ${source.value ? context.tr('available', '可用') : context.tr('unavailable; other source remains available', '暂不可用，仍可浏览其他来源')}',
                  ),
                for (final item in matching) ...[
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
                        'Ticketmaster and onePA supply this bounded selection; it is not their full catalogues. ENMORI sends the activity request and server connection information, not your sign-in token, profile or private content. Category labels are source labels, not new interest mappings. Views expire after five minutes. Opening the source website does not register or pay for an event.',
                        '这里展示 Ticketmaster 和 onePA 提供的有限活动，并非完整目录。ENMORI 发送活动请求和服务器连接信息，不发送你的登录令牌、资料或私人内容。分类来自活动来源，不会创建新的兴趣映射。页面数据五分钟后过期。打开来源网站不代表报名或付款。',
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
    return RefreshOnReturn(
      onRefresh: () {
        final controller = ref.read(eventBatchesProvider.notifier);
        if (!controller.hasFreshBatch) unawaited(_reload());
      },
      child: page,
    );
  }

  void _stopSearch() {
    _searchGeneration++;
    ref.read(eventBatchesProvider.notifier).stopSearch();
    setState(() => _searching = false);
  }

  Future<void> _searchAvailable() async {
    if (!mounted ||
        _searching ||
        (ModalRoute.of(context)?.isCurrent == false)) {
      return;
    }
    final generation = ++_searchGeneration;
    setState(() => _searching = true);
    await ref
        .read(eventBatchesProvider.notifier)
        .loadAvailablePages(
          shouldContinue: () =>
              mounted && ModalRoute.of(context)?.isCurrent != false,
        );
    if (mounted && generation == _searchGeneration) {
      setState(() => _searching = false);
    }
  }

  Future<void> _reload() async {
    final generation = ++_searchGeneration;
    final session = ref.read(authSessionProvider);
    await ref.read(eventBatchesProvider.notifier).load();
    if (!mounted ||
        generation != _searchGeneration ||
        !identical(session, ref.read(authSessionProvider))) {
      return;
    }
    if (_query.trim().isNotEmpty || _category != null) {
      await _searchAvailable();
    }
  }
}
