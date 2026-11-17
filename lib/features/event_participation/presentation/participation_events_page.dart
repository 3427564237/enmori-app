import '../../../core/presentation/refresh_on_return.dart';
import '../../../core/presentation/event_source_coverage_notice.dart';

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

enum EventsDestination { forYou, browse }

/// Explicit next source batches, with display-only categories and stable dedupe.
final class ParticipationEventsPage extends ConsumerStatefulWidget {
  const ParticipationEventsPage({
    required this.onSelect,
    this.onOpenPlans,
    this.onOpenRecent,
    this.recommendationsBuilder,
    this.initialDestination = EventsDestination.forYou,
    super.key,
  });
  final ValueChanged<String> onSelect;
  final VoidCallback? onOpenPlans;
  final VoidCallback? onOpenRecent;
  final Widget Function(BuildContext, VoidCallback)? recommendationsBuilder;
  final EventsDestination initialDestination;
  @override
  ConsumerState<ParticipationEventsPage> createState() =>
      _ParticipationEventsPageState();
}

final class _ParticipationEventsPageState
    extends ConsumerState<ParticipationEventsPage>
    with WidgetsBindingObserver, SingleTickerProviderStateMixin {
  late final TabController _tabs;
  String? _category;
  EventTimeFilter _timeFilter = EventTimeFilter.all;
  int _timeSort = 0;
  final _sortKey = GlobalKey<FormFieldState<int>>();
  final _search = TextEditingController();
  String _query = '';
  bool _searching = false;
  bool _filtersExpanded = false;
  int _searchGeneration = 0;
  Completer<void>? _refreshWait;
  bool _showRecommendations = false;
  @override
  void initState() {
    super.initState();
    _showRecommendations =
        widget.recommendationsBuilder != null &&
        widget.initialDestination == EventsDestination.forYou;
    _tabs = TabController(
      length: 2,
      vsync: this,
      initialIndex: _showRecommendations ? 0 : 1,
    );
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && !_showRecommendations) {
        unawaited(ref.read(eventBatchesProvider.notifier).load());
      }
    });
  }

  @override
  void didUpdateWidget(ParticipationEventsPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initialDestination != oldWidget.initialDestination ||
        (widget.recommendationsBuilder == null) !=
            (oldWidget.recommendationsBuilder == null)) {
      _showRecommendations =
          widget.recommendationsBuilder != null &&
          widget.initialDestination == EventsDestination.forYou;
      _tabs.index = _showRecommendations ? 0 : 1;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted &&
            !_showRecommendations &&
            !ref.read(eventBatchesProvider.notifier).hasFreshBatch) {
          unawaited(_reload());
        }
      });
    }
  }

  void _selectDestination(bool recommendations) {
    FocusManager.instance.primaryFocus?.unfocus();
    if (recommendations && _searching) _stopSearch();
    setState(() => _showRecommendations = recommendations);
    _tabs.animateTo(recommendations ? 0 : 1);
    final controller = ref.read(eventBatchesProvider.notifier);
    if (!recommendations && !controller.hasFreshBatch) {
      unawaited(controller.load());
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    ref
        .read(eventBatchesProvider.notifier)
        .setForeground(state == AppLifecycleState.resumed);
    if (state != AppLifecycleState.resumed && mounted) {
      _searchGeneration++;
      _searching = false;
      _finishRefreshWait();
    }
  }

  @override
  void dispose() {
    _searchGeneration++;
    _finishRefreshWait();
    _search.dispose();
    _tabs.dispose();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(authSessionProvider, (before, after) {
      if (!identical(before?.asData?.value, after.asData?.value)) {
        _searchGeneration++;
        _finishRefreshWait();
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
        bottom: widget.recommendationsBuilder == null
            ? null
            : TabBar(
                controller: _tabs,
                onTap: (index) => _selectDestination(index == 0),
                tabs: [
                  Tab(text: context.tr('For you', '为你推荐')),
                  Tab(text: context.tr('Browse', '浏览活动')),
                ],
              ),
        actions: [
          if (widget.onOpenPlans != null)
            IconButton(
              key: const Key('events-my-plans'),
              tooltip: context.tr('My plans', '我的活动计划'),
              onPressed: widget.onOpenPlans,
              icon: const Icon(Icons.event_note_outlined),
            ),
          if (widget.onOpenRecent != null)
            IconButton(
              key: const Key('events-recent'),
              tooltip: context.tr('Recently viewed', '最近浏览'),
              onPressed: widget.onOpenRecent,
              icon: const Icon(Icons.history),
            ),
          if (!_showRecommendations)
            IconButton(
              tooltip: context.tr('Refresh events', '刷新活动'),
              onPressed: state.busy ? null : () => unawaited(_reload()),
              icon: const Icon(Icons.refresh),
            ),
        ],
      ),
      body: _showRecommendations && widget.recommendationsBuilder != null
          ? Builder(
              builder: (context) => widget.recommendationsBuilder!(context, () {
                _selectDestination(false);
              }),
            )
          : SafeArea(
              child: RefreshIndicator(
                onRefresh: _reload,
                child: ListView(
                  key: const PageStorageKey("events-browse"),
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(16),
                  children: [
                    TextField(
                      key: const Key('events-search'),
                      controller: _search,
                      maxLength: 100,
                      textInputAction: TextInputAction.search,
                      decoration: InputDecoration(
                        labelText: context.tr('Search events', '搜索活动'),
                        hintText: context.tr(
                          'Name, place or category',
                          '活动名称、地点或分类',
                        ),
                        counterText: '',
                        prefixIcon: const Icon(Icons.search),
                        suffixIcon: IconButton(
                          tooltip: context.tr(
                            'Search available events',
                            '搜索全部可用活动',
                          ),
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
                    Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: Text(
                        context.tr('Events across Singapore', '新加坡活动'),
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ),
                    Wrap(
                      spacing: 8,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        TextButton.icon(
                          key: const Key('events-filters-toggle'),
                          onPressed: () => setState(
                            () => _filtersExpanded = !_filtersExpanded,
                          ),
                          icon: Icon(
                            _filtersExpanded ? Icons.expand_less : Icons.tune,
                          ),
                          label: Text(context.tr('Filters and sort', '筛选与排序')),
                        ),
                      ],
                    ),
                    Text(
                      '${_timeLabel(context, _timeFilter)} · ${_category ?? context.tr('All categories', '全部分类')} · ${_sortLabel(context, _timeSort)}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    if (_filtersExpanded) ...[
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 4,
                        children: [
                          for (final filter in EventTimeFilter.values)
                            ChoiceChip(
                              key: Key('events-time-${filter.name}'),
                              label: Text(_timeLabel(context, filter)),
                              selected: _timeFilter == filter,
                              onSelected: state.busy && !_searching
                                  ? null
                                  : (_) {
                                      if (_searching) _stopSearch();
                                      setState(() => _timeFilter = filter);
                                      if (filter != EventTimeFilter.all) {
                                        unawaited(_searchAvailable());
                                      }
                                    },
                            ),
                        ],
                      ),
                      const SizedBox(height: 12),
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
                          for (final sort in [0, 1, -1])
                            DropdownMenuItem(
                              value: sort,
                              child: Text(_sortLabel(context, sort)),
                            ),
                        ],
                        onChanged: (value) =>
                            setState(() => _timeSort = value ?? 0),
                      ),
                      if (categories.isNotEmpty || _category != null)
                        Wrap(
                          spacing: 8,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            PopupMenuButton<String>(
                              tooltip: context.tr(
                                'Filter event category',
                                '筛选活动分类',
                              ),
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
                                padding: const EdgeInsets.symmetric(
                                  vertical: 12,
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(
                                      Icons.category_outlined,
                                      size: 20,
                                    ),
                                    const SizedBox(width: 8),
                                    Flexible(
                                      child: Text(
                                        _category ??
                                            context.tr(
                                              'All categories',
                                              '全部分类',
                                            ),
                                      ),
                                    ),
                                    const Icon(Icons.expand_more),
                                  ],
                                ),
                              ),
                            ),
                            if (_category != null)
                              TextButton(
                                onPressed: () =>
                                    setState(() => _category = null),
                                child: Text(context.tr('Clear filter', '清除筛选')),
                              ),
                          ],
                        ),
                    ],
                    const SizedBox(height: 12),
                    if (_query.isNotEmpty ||
                        _category != null ||
                        _timeFilter != EventTimeFilter.all)
                      Align(
                        alignment: Alignment.centerLeft,
                        child: TextButton.icon(
                          key: const Key('events-clear-filters'),
                          onPressed: _clearFilters,
                          icon: const Icon(Icons.filter_alt_off_outlined),
                          label: Text(
                            context.tr('Clear search and filters', '清除搜索与筛选'),
                          ),
                        ),
                      ),
                    if ((state.busy || _searching) &&
                        (!state.loadingMore || _searching))
                      _EventLoadingStatus(
                        loadingMore: state.loadingMore,
                        searching: _searching,
                        loadedCount: items.length,
                        onStop: _stopSearch,
                      ),
                    if (state.stopped && value != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Text(
                          context.tr(
                            'Stopped waiting. Your current events are still shown.',
                            '已停止等待，仍显示当前活动。',
                          ),
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
                      if ((_category != null ||
                              query.isNotEmpty ||
                              _timeFilter != EventTimeFilter.all) &&
                          matching.isEmpty &&
                          !state.busy &&
                          !_searching &&
                          !state.stopped &&
                          state.failure == null)
                        Padding(
                          padding: EdgeInsets.symmetric(vertical: 16),
                          child: Text(
                            context.tr(
                              value.nextCursor == null
                                  ? 'No matching events in the available selection. Try clearing search or filters.'
                                  : 'No matches in the loaded events yet. Continue searching the available events.',
                              value.nextCursor == null
                                  ? '当前可用活动范围内没有匹配结果，可以清除搜索或筛选。'
                                  : '已加载活动中暂未找到匹配结果，可以继续搜索可用活动。',
                            ),
                          ),
                        ),
                      if (items.isEmpty &&
                          !state.busy &&
                          !_searching &&
                          !state.stopped &&
                          state.failure == null &&
                          value.nextCursor == null)
                        Text(
                          context.tr(
                            'No events in this available selection. Check again later.',
                            '当前可用范围内没有活动，请稍后查看。',
                          ),
                        ),
                      if (value.sourceStatus.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Wrap(
                            spacing: 12,
                            children: [
                              for (final source in value.sourceStatus.entries)
                                Text(
                                  '${switch (source.key) {
                                    'onepa' => 'onePA',
                                    'ticketmaster' => 'Ticketmaster',
                                    _ => source.key,
                                  }}: ${source.value ? context.tr('available', '可用') : context.tr('unavailable', '暂不可用')}',
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                            ],
                          ),
                        ),
                      EventSourceCoverageNotice(
                        sourceStatus: value.sourceStatus,
                        sourceCoverage: value.sourceCoverage,
                      ),
                      for (final item in matching) ...[
                        EventCard.summary(
                          key: ValueKey(item.eventId ?? item.browseId),
                          summary: item,
                          onSelect: state.busy && !state.loadingMore
                              ? null
                              : (id) {
                                  if (controller.isCurrentSnapshot(state)) {
                                    widget.onSelect(id);
                                  }
                                },
                        ),
                      ],
                      if (state.loadingMore && !_searching)
                        _EventLoadingStatus(
                          loadingMore: true,
                          searching: false,
                          loadedCount: items.length,
                          onStop: _stopSearch,
                        ),
                      if (value.nextCursor != null)
                        TextButton(
                          key: const Key('events-continue-search'),
                          onPressed: state.busy || _searching
                              ? null
                              : (_query.trim().isNotEmpty ||
                                    _category != null ||
                                    _timeFilter != EventTimeFilter.all)
                              ? _searchAvailable
                              : controller.next,
                          child: Text(
                            (_query.trim().isNotEmpty ||
                                    _category != null ||
                                    _timeFilter != EventTimeFilter.all)
                                ? context.tr(
                                    'Continue searching available events',
                                    '继续搜索可用活动',
                                  )
                                : state.failure == null
                                ? context.tr('Load more events', '加载更多活动')
                                : context.tr(
                                    'Try loading more again',
                                    '重试加载更多',
                                  ),
                          ),
                        )
                      else if (!state.busy &&
                          !_searching &&
                          !state.stopped &&
                          state.failure == null)
                        Text(
                          context.tr(
                            'You’ve reached the end of the available events.',
                            '已到达可用活动的末尾。',
                          ),
                        ),
                    ] else if (!state.busy && state.failure == null)
                      StatusPanel(
                        title: state.stopped
                            ? context.tr(
                                'Stopped waiting for events',
                                '已停止等待活动',
                              )
                            : context.tr('Refresh your events', '刷新活动列表'),
                        body: state.stopped
                            ? context.tr(
                                'The request may still finish, but this page will ignore its response. Reload when you are ready.',
                                '请求仍可能完成，但本页会忽略它的结果；可以稍后重新加载。',
                              )
                            : context.tr(
                                'This view has expired or was cleared. Reload to see current events.',
                                '此页面的数据已过期或被清除，请重新加载当前活动。',
                              ),
                        icon: Icons.event_outlined,
                      ),
                    if (value == null)
                      TextButton(
                        onPressed: state.busy ? null : _reload,
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
        if (!_showRecommendations && !controller.hasFreshBatch) {
          unawaited(_reload());
        }
      },
      child: page,
    );
  }

  void _clearFilters() {
    if (_searching) _stopSearch();
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() {
      _search.clear();
      _query = '';
      _category = null;
      _timeFilter = EventTimeFilter.all;
    });
  }

  void _stopSearch() {
    _searchGeneration++;
    _finishRefreshWait();
    ref.read(eventBatchesProvider.notifier).stopSearch();
    setState(() => _searching = false);
  }

  void _finishRefreshWait() {
    final wait = _refreshWait;
    _refreshWait = null;
    if (wait != null && !wait.isCompleted) wait.complete();
  }

  Future<void> _searchAvailable() async {
    if (!mounted ||
        _searching ||
        (ModalRoute.of(context)?.isCurrent == false)) {
      return;
    }
    FocusManager.instance.primaryFocus?.unfocus();
    final generation = ++_searchGeneration;
    setState(() => _searching = true);
    await ref
        .read(eventBatchesProvider.notifier)
        .loadAvailablePages(
          shouldContinue: () =>
              mounted &&
              !_showRecommendations &&
              ModalRoute.of(context)?.isCurrent != false,
        );
    if (mounted && generation == _searchGeneration) {
      setState(() => _searching = false);
    }
  }

  Future<void> _reload() async {
    _finishRefreshWait();
    final wait = Completer<void>();
    _refreshWait = wait;
    final generation = ++_searchGeneration;
    final session = ref.read(authSessionProvider);
    Future<void> read() async {
      await ref.read(eventBatchesProvider.notifier).load();
      if (!mounted ||
          generation != _searchGeneration ||
          !identical(session, ref.read(authSessionProvider))) {
        return;
      }
      if (_query.trim().isNotEmpty ||
          _category != null ||
          _timeFilter != EventTimeFilter.all) {
        await _searchAvailable();
      }
    }

    try {
      // End the local RefreshIndicator wait without claiming to cancel HTTP.
      // The generation/session checks still retire any later read or paging.
      await Future.any([read(), wait.future]);
    } finally {
      if (identical(_refreshWait, wait)) _refreshWait = null;
    }
  }
}

String _timeLabel(BuildContext context, EventTimeFilter filter) =>
    switch (filter) {
      EventTimeFilter.all => context.tr('Any time', '不限时间'),
      EventTimeFilter.today => context.tr('Today', '今天'),
      EventTimeFilter.weekend => context.tr('This weekend', '本周末'),
      EventTimeFilter.sevenDays => context.tr('Next 7 days', '未来七天'),
    };

String _sortLabel(BuildContext context, int sort) => switch (sort) {
  1 => context.tr('Earliest first', '最早优先'),
  -1 => context.tr('Latest first', '最晚优先'),
  _ => context.tr('Source order', '来源顺序'),
};

/// Elapsed waiting is feedback only; it does not imply provider progress or
/// cancellation. The controller retires the response when the user stops.
class _EventLoadingStatus extends StatefulWidget {
  const _EventLoadingStatus({
    required this.loadingMore,
    required this.searching,
    required this.loadedCount,
    required this.onStop,
  });
  final bool loadingMore, searching;
  final int loadedCount;
  final VoidCallback onStop;

  @override
  State<_EventLoadingStatus> createState() => _EventLoadingStatusState();
}

class _EventLoadingStatusState extends State<_EventLoadingStatus> {
  Timer? _timer;
  bool _longWait = false;

  @override
  void initState() {
    super.initState();
    _timer = Timer(const Duration(seconds: 10), () {
      if (mounted) setState(() => _longWait = true);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        LinearProgressIndicator(
          semanticsLabel: context.tr('Loading events', '正在加载活动'),
        ),
        const SizedBox(height: 8),
        Text(
          _longWait
              ? context.tr('Still waiting for event sources…', '仍在等待活动来源…')
              : widget.searching
              ? context.tr('Searching available events…', '正在搜索可用活动…')
              : widget.loadingMore
              ? context.tr('Reading more events…', '正在读取更多活动…')
              : context.tr('Reading event sources…', '正在读取活动来源…'),
          style: Theme.of(context).textTheme.titleSmall,
        ),
        Text(
          context.tr(
            'Some sources can take a few minutes. You can leave this page. Stopping ignores the pending response here.',
            '部分来源可能需要几分钟。你可以离开本页；停止等待后，本页将忽略尚未返回的结果。',
          ),
          style: Theme.of(context).textTheme.bodySmall,
        ),
        if (widget.loadedCount > 0)
          Text(
            context.tr(
              '${widget.loadedCount} events loaded',
              '已加载 ${widget.loadedCount} 个活动',
            ),
          ),
        TextButton(
          key: Key(
            widget.searching ? 'events-stop-search' : 'events-stop-waiting',
          ),
          onPressed: widget.onStop,
          child: Text(context.tr('Stop waiting', '停止等待')),
        ),
      ],
    ),
  );
}
