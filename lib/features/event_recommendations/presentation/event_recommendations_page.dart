import '../../../core/presentation/refresh_on_return.dart';
import 'recommendation_reason.dart';
import '../../../core/presentation/enmori_localizations.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_motion.dart';

import '../../../core/presentation/status_panel.dart';
import '../../../core/presentation/section_heading.dart';
import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../domain/event_recommendation_repository.dart';
import 'event_recommendations_controller.dart';

typedef RecommendationCardBuilder = Widget Function(
  BuildContext context,
  EventRecommendation event,
  ValueChanged<String>? onOpen,
);

const eventEmptyTitle = 'No event recommendations right now';
const eventEmptyBody = 'Update your interests or check again later.';

final class EventRecommendationsSection extends ConsumerStatefulWidget {
  const EventRecommendationsSection({
    required this.onSeeAll,
    this.heading,
    this.onBrowseAll,
    this.onContinueDiscovery,
    this.onOpenEvent,
    this.recommendationCardBuilder,
    this.syntheticPreview = false,
    super.key,
  });

  final VoidCallback? onSeeAll;
  final String? heading;
  final VoidCallback? onBrowseAll;
  final VoidCallback? onContinueDiscovery;
  final void Function(String)? onOpenEvent;
  final RecommendationCardBuilder? recommendationCardBuilder;
  final bool syntheticPreview;

  @override
  ConsumerState<EventRecommendationsSection> createState() =>
      _EventRecommendationsSectionState();
}

final class _EventRecommendationsSectionState
    extends ConsumerState<EventRecommendationsSection>
    with WidgetsBindingObserver {
  late final EventRecommendationsController _controller;
  int? _operation;
  Set<String>? _refreshIds;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _controller = ref.read(eventRecommendationsControllerProvider.notifier);
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    final operation = _operation;
    if (operation != null) _controller.abandon(operation);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed && mounted) {
      _refreshIds = null;
      _controller.clear();
    }
  }

  void _load({bool userInitiated = false}) {
    if (!mounted) return;
    _refreshIds = userInitiated
        ? ref
              .read(eventRecommendationsControllerProvider)
              .asData
              ?.value
              .items
              .map((e) => e.eventId)
              .toSet()
        : null;
    _operation = _controller.load(view: EventRecommendationView.home);
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(authSessionProvider, (previous, next) {
      if (!identical(previous?.asData?.value, next.asData?.value)) {
        _refreshIds = null;
      }
    });
    ref.listen(eventRecommendationsControllerProvider, (previous, next) {
      final before = _refreshIds;
      if (next.isLoading || before == null) return;
      _refreshIds = null;
      final items = next.asData?.value.items;
      if (items != null &&
          items.length == before.length &&
          items.every((item) => before.contains(item.eventId))) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              items.isEmpty
                  ? context.tr(
                      'No recommendations available yet. Try Browse all activities.',
                      '暂时没有推荐，请尝试浏览所有活动。',
                    )
                  : context.tr(
                      'Latest details loaded for the same events.',
                      '已刷新这些活动的最新详情。',
                    ),
            ),
          ),
        );
      }
    });
    final state = ref.watch(eventRecommendationsControllerProvider);
    return RefreshOnReturn(
      onRefresh: _load,
      child: _RecommendationContent(
        state: state,
        onRetry: () => _load(userInitiated: true),
        onSeeAll: widget.onSeeAll,
        home: true,
        heading: widget.heading,
        onBrowseAll: widget.onBrowseAll,
        onContinueDiscovery: widget.onContinueDiscovery,
        onOpenEvent: widget.onOpenEvent,
        recommendationCardBuilder: widget.recommendationCardBuilder,
        syntheticPreview: widget.syntheticPreview,
      ),
    );
  }
}

final class EventRecommendationsPage extends ConsumerStatefulWidget {
  const EventRecommendationsPage({
    this.onOpenEvent,
    this.recommendationCardBuilder,
    this.syntheticPreview = false,
    this.initialEventIndex = 0,
    this.embedded = false,
    this.onBrowseAll,
    super.key,
  }) : assert(initialEventIndex >= 0);
  final void Function(String)? onOpenEvent;
  final RecommendationCardBuilder? recommendationCardBuilder;
  final bool syntheticPreview;
  final int initialEventIndex;
  final bool embedded;
  final VoidCallback? onBrowseAll;

  @override
  ConsumerState<EventRecommendationsPage> createState() =>
      _EventRecommendationsPageState();
}

final class _EventRecommendationsPageState
    extends ConsumerState<EventRecommendationsPage>
    with WidgetsBindingObserver {
  late final EventRecommendationsController _controller;
  int? _operation;
  final _eventKeys = <String, GlobalKey>{};
  EventRecommendationResponse? _snapshot;
  String? _currentEventId;
  bool _positioned = false;
  bool _moving = false;
  int _positionGeneration = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _controller = ref.read(eventRecommendationsControllerProvider.notifier);
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    final operation = _operation;
    if (operation != null) _controller.abandon(operation);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed && mounted) {
      _resetPosition();
      _controller.clear();
    }
  }

  void _resetPosition() {
    _positionGeneration++;
    _snapshot = null;
    _currentEventId = null;
    _positioned = false;
    _moving = false;
    _eventKeys.clear();
  }

  void _preparePosition(EventRecommendationResponse? response) {
    if (identical(_snapshot, response)) return;
    _positionGeneration++;
    _snapshot = response;
    _moving = false;
    final ids =
        response?.items.map((event) => event.eventId).toSet() ?? <String>{};
    _eventKeys.removeWhere((id, _) => !ids.contains(id));
    for (final id in ids) {
      _eventKeys.putIfAbsent(id, GlobalKey.new);
    }
    if (response == null || response.items.isEmpty) return;
    final previous = response.items.indexWhere(
      (event) => event.eventId == _currentEventId,
    );
    var index = previous >= 0 ? previous : 0;
    if (previous < 0 && !_positioned) {
      index = widget.initialEventIndex < response.items.length
          ? widget.initialEventIndex
          : response.items.length - 1;
    }
    final generation = _positionGeneration;
    _moving = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && generation == _positionGeneration) {
        _reveal(response, response.items[index].eventId, generation);
      }
    });
  }

  Future<void> _reveal(
    EventRecommendationResponse response,
    String id,
    int generation,
  ) async {
    final target = _eventKeys[id]?.currentContext;
    if (target == null ||
        ModalRoute.of(context)?.isCurrent == false ||
        !identical(
          ref.read(eventRecommendationsControllerProvider).asData?.value,
          response,
        )) {
      if (mounted && generation == _positionGeneration) {
        setState(() => _moving = false);
      }
      return;
    }
    // All cards stay in Backend order; moving the viewport never fetches a batch.
    await Scrollable.ensureVisible(target, duration: Duration.zero);
    if (!mounted || generation != _positionGeneration) return;
    setState(() {
      _moving = false;
      if (identical(
        ref.read(eventRecommendationsControllerProvider).asData?.value,
        response,
      )) {
        _currentEventId = id;
        _positioned = true;
      }
    });
  }

  void _nextGroup(EventRecommendationResponse response) {
    if (_moving || !identical(_snapshot, response)) return;
    final current = response.items.indexWhere(
      (event) => event.eventId == _currentEventId,
    );
    final next = (current < 0 ? 0 : current) + 2;
    if (next >= response.items.length) return;
    setState(() => _moving = true);
    _reveal(response, response.items[next].eventId, _positionGeneration);
  }

  void _load() {
    if (!mounted) return;
    _operation = _controller.load(view: EventRecommendationView.all);
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(authSessionProvider, (previous, next) {
      if (!identical(previous?.asData?.value, next.asData?.value)) {
        setState(_resetPosition);
      }
    });
    final state = ref.watch(eventRecommendationsControllerProvider);
    final response = state.asData?.value;
    _preparePosition(response);
    final currentIndex =
        response?.items.indexWhere(
          (event) => event.eventId == _currentEventId,
        ) ??
        -1;
    final hasNext =
        response != null &&
        (currentIndex < 0 ? 0 : currentIndex) + 2 < response.items.length;
    final page = Scaffold(
      appBar: widget.embedded
          ? null
          : AppBar(title: Text(context.tr('Event recommendations', '活动推荐'))),
      body: SafeArea(
        child: ListView(
          key: const Key('route-event-recommendations'),
          padding: const EdgeInsets.all(24),
          children: [
            if (!widget.embedded)
              Text(
                context.tr('Event recommendations', '活动推荐'),
                style: Theme.of(context).textTheme.headlineMedium,
              ),
            if (!widget.embedded) const SizedBox(height: 16),
            _RecommendationContent(
              state: state,
              onRetry: _load,
              onOpenEvent: widget.onOpenEvent,
              recommendationCardBuilder: widget.recommendationCardBuilder,
              syntheticPreview: widget.syntheticPreview,
              eventKeys: _eventKeys,
              onBrowseAll: widget.onBrowseAll,
            ),
          ],
        ),
      ),
      bottomNavigationBar: response == null || response.items.isEmpty
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: _moving || hasNext
                    ? OutlinedButton.icon(
                        key: const Key('event-recommendations-next-group'),
                        onPressed: _moving ? null : () => _nextGroup(response),
                        icon: const Icon(Icons.arrow_downward),
                        label: Text(context.tr('Next group', '下一组')),
                      )
                    : Semantics(
                        liveRegion: true,
                        child: Text(
                          context.tr(
                            'You have reached the end of this list.',
                            '已浏览到本次推荐列表的末尾。',
                          ),
                        ),
                      ),
              ),
            ),
    );
    return RefreshOnReturn(onRefresh: _load, child: page);
  }
}

final class _RecommendationContent extends StatelessWidget {
  const _RecommendationContent({
    required this.state,
    required this.onRetry,
    this.onSeeAll,
    this.home = false,
    this.heading,
    this.onBrowseAll,
    this.onContinueDiscovery,
    this.onOpenEvent,
    this.recommendationCardBuilder,
    this.syntheticPreview = false,
    this.eventKeys = const {},
  });

  final AsyncValue<EventRecommendationResponse> state;
  final VoidCallback onRetry;
  final VoidCallback? onSeeAll;
  final bool home;
  final String? heading;
  final VoidCallback? onBrowseAll;
  final VoidCallback? onContinueDiscovery;
  final Map<String, GlobalKey> eventKeys;
  final bool syntheticPreview;
  final void Function(String)? onOpenEvent;
  final RecommendationCardBuilder? recommendationCardBuilder;

  @override
  Widget build(BuildContext context) {
    final inlineHeader = home && heading != null;
    final continueDiscovery =
        home &&
        onContinueDiscovery != null &&
        state is AsyncData<EventRecommendationResponse> &&
        state.requireValue.items.isNotEmpty;
    Widget status({
      required Key key,
      required String title,
      String? body,
      required IconData icon,
      bool loading = false,
      bool isError = false,
      Widget? action,
    }) {
      if (!home) {
        return StatusPanel(
          key: key,
          title: title,
          body: body ?? '',
          icon: icon,
          loading: loading,
          isError: isError,
          action: action,
        );
      }
      return Padding(
        key: key,
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              icon,
              size: 24,
              color: isError
                  ? Theme.of(context).colorScheme.error
                  : Theme.of(context).colorScheme.onSurfaceVariant,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Semantics(liveRegion: true, child: Text(title)),
                  if (body != null) ...[
                    const SizedBox(height: 4),
                    Text(body, style: Theme.of(context).textTheme.bodySmall),
                  ],
                  if (loading)
                    const Padding(
                      padding: EdgeInsets.only(top: 8),
                      child: LinearProgressIndicator(),
                    ),
                  if (!inlineHeader && action != null) action,
                ],
              ),
            ),
          ],
        ),
      );
    }

    final content = switch (state) {
      AsyncLoading<EventRecommendationResponse>() => status(
        key: const Key('event-recommendations-loading'),
        title: context.tr('Loading event recommendations', '正在加载活动推荐'),
        loading: true,
        body: context.tr(
          'Checking for upcoming events that match your interests.',
          '正在查找符合你兴趣的近期活动。',
        ),
        icon: Icons.hourglass_top,
      ),
      AsyncError<EventRecommendationResponse>(
        error: EventRecommendationsRefreshRequired(),
      ) =>
        status(
          key: const Key('event-recommendations-refresh-required'),
          title: context.tr('Refresh event recommendations', '刷新活动推荐'),
          body: context.tr(
            'Refresh to check for current matches for your interests.',
            '刷新以查看当前符合你兴趣的活动。',
          ),
          icon: Icons.refresh,
          action: OutlinedButton.icon(
            key: const Key('event-recommendations-refresh'),
            onPressed: onRetry,
            icon: const Icon(Icons.refresh),
            label: Text(context.tr('Refresh', '刷新')),
          ),
        ),
      AsyncError<EventRecommendationResponse>(:final error) => status(
        key: const Key('event-recommendations-error'),
        title: context.tr('Event recommendations unavailable', '活动推荐暂不可用'),
        isError: true,
        body: _errorCopy(context, error),
        icon: Icons.error_outline,
        action: FilledButton.icon(
          key: const Key('event-recommendations-retry'),
          onPressed: onRetry,
          icon: const Icon(Icons.refresh),
          label: Text(context.tr('Retry', '重试')),
        ),
      ),
      AsyncData<EventRecommendationResponse>(:final value) =>
        value.items.isEmpty
            ? status(
                key: const Key('event-recommendations-empty'),
                title: context.tr(eventEmptyTitle, '暂时没有活动推荐'),
                body: context.tr(eventEmptyBody, '可以更新兴趣或稍后再查看。'),
                icon: Icons.event_busy_outlined,
                action: onBrowseAll != null
                    ? OutlinedButton.icon(
                        key: const Key('event-recommendations-browse-empty'),
                        onPressed: onBrowseAll,
                        icon: const Icon(Icons.explore_outlined),
                        label: Text(context.tr('Browse activities', '浏览活动')),
                      )
                    : onSeeAll == null
                    ? null
                    : OutlinedButton(
                        key: const Key('event-recommendations-see-all-empty'),
                        onPressed: onSeeAll,
                        child: Text(
                          context.tr('All recommendations', '查看全部推荐'),
                        ),
                      ),
              )
            : _RecommendationList(
                items: home ? value.items.take(2).toList() : value.items,
                onSeeAll: onSeeAll,
                onOpenEvent: onOpenEvent,
                recommendationCardBuilder: recommendationCardBuilder,
                eventKeys: eventKeys,
              ),
    };
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (inlineHeader)
          SectionHeading(
            title: heading!,
            actions: [
              if (onBrowseAll != null)
                TextButton(
                  key: const Key('home-browse-activities'),
                  onPressed: onBrowseAll,
                  child: Text(context.tr('Browse all activities', '浏览所有活动')),
                ),
              if (continueDiscovery)
                TextButton.icon(
                  key: const Key('event-recommendations-continue'),
                  onPressed: onContinueDiscovery,
                  icon: const Icon(Icons.arrow_forward),
                  label: Text(context.tr('Next group', '下一组')),
                )
              else
                IconButton(
                  key: Key(
                    state.hasError &&
                            state.error is! EventRecommendationsRefreshRequired
                        ? 'event-recommendations-retry'
                        : 'event-recommendations-refresh',
                  ),
                  tooltip: state.hasError
                      ? context.tr('Retry event recommendations', '重试活动推荐')
                      : context.tr('Refresh event recommendations', '刷新活动推荐'),
                  onPressed: state.isLoading ? null : onRetry,
                  icon: const Icon(Icons.refresh),
                ),
            ],
          ),
        if (syntheticPreview) ...[
          Card(
            key: Key('event-synthetic-notice'),
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                context.tr(
                  'Synthetic Event preview — examples only. '
                      'No real registration or participation.',
                  '合成活动预览，仅为示例，不代表真实报名或参与。',
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
        ],
        MotionReveal(
          trigger: state.runtimeType,
          enabled:
              recommendationCardBuilder == null &&
              state is AsyncData<EventRecommendationResponse>,
          child: content,
        ),
        if (state is AsyncData<EventRecommendationResponse> &&
            !inlineHeader) ...[
          const SizedBox(height: 12),
          TextButton.icon(
            key: Key(
              continueDiscovery
                  ? 'event-recommendations-continue'
                  : 'event-recommendations-refresh',
            ),
            onPressed: continueDiscovery ? onContinueDiscovery : onRetry,
            icon: Icon(continueDiscovery ? Icons.arrow_forward : Icons.refresh),
            label: Text(
              continueDiscovery
                  ? context.tr('Next group', '下一组')
                  : context.tr('Refresh', '刷新'),
            ),
          ),
        ],
      ],
    );
  }

  String _errorCopy(BuildContext context, Object error) {
    if (error case AppFailure(kind: AppFailureKind.authRequired)) {
      return context.tr(
        'Your session has expired. Sign in again.',
        '登录状态已过期，请重新登录。',
      );
    }
    if (error case AppFailure(kind: AppFailureKind.authForbidden)) {
      return context.tr('This account cannot continue.', '此账号暂时无法继续。');
    }
    return context.tr(
      'This service is temporarily unavailable. Try again.',
      '服务暂不可用，请重试。',
    );
  }
}

final class _RecommendationList extends StatelessWidget {
  const _RecommendationList({
    required this.items,
    this.onSeeAll,
    this.onOpenEvent,
    this.recommendationCardBuilder,
    this.eventKeys = const {},
  });

  final List<EventRecommendation> items;
  final void Function(String)? onOpenEvent;
  final RecommendationCardBuilder? recommendationCardBuilder;
  final VoidCallback? onSeeAll;
  final Map<String, GlobalKey> eventKeys;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ...items.map(
          (item) => Padding(
            key: eventKeys[item.eventId],
            padding: const EdgeInsets.only(bottom: 12),
            child:
                recommendationCardBuilder?.call(context, item, onOpenEvent) ??
                Card(
                  child: ListTile(
                    key: Key('event-recommendation-${item.eventId}'),
                    onTap: onOpenEvent == null
                        ? null
                        : () => onOpenEvent!(item.eventId),
                    title: Text(item.title),
                    leading: Icon(
                      Icons.event_outlined,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                    trailing: onOpenEvent == null
                        ? null
                        : const Icon(Icons.chevron_right),
                    contentPadding: const EdgeInsets.all(16),
                    subtitle: Text(
                      context.tr(
                        '${_formatTime(item.startAt)}\n${item.endAt == null ? '' : 'Ends: ${_formatTime(item.endAt!)}\n'}${recommendationReason(context, item)}',
                        '${_formatTime(item.startAt)}\n${item.endAt == null ? '' : '结束：${_formatTime(item.endAt!)}\n'}${recommendationReason(context, item)}',
                      ),
                    ),
                  ),
                ),
          ),
        ),
        if (onSeeAll != null)
          OutlinedButton(
            key: const Key('event-recommendations-see-all'),
            onPressed: onSeeAll,
            child: Text(context.tr('All recommendations', '查看全部推荐')),
          ),
      ],
    );
  }

  String _formatTime(DateTime value) =>
      value.toLocal().toString().substring(0, 16);
}
