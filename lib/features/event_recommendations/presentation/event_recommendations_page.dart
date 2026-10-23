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
    this.onOpenEvent,
    this.recommendationCardBuilder,
    this.syntheticPreview = false,
    super.key,
  });

  final VoidCallback? onSeeAll;
  final String? heading;
  final VoidCallback? onBrowseAll;
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
                      'No recommendations available yet. Try Browse all.',
                      '暂时没有推荐，请尝试浏览活动。',
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
    return _RecommendationContent(
      state: state,
      onRetry: () => _load(userInitiated: true),
      onSeeAll: widget.onSeeAll,
      home: true,
      heading: widget.heading,
      onBrowseAll: widget.onBrowseAll,
      onOpenEvent: widget.onOpenEvent,
      recommendationCardBuilder: widget.recommendationCardBuilder,
      syntheticPreview: widget.syntheticPreview,
    );
  }
}

final class EventRecommendationsPage extends ConsumerStatefulWidget {
  const EventRecommendationsPage({
    this.onOpenEvent,
    this.recommendationCardBuilder,
    this.syntheticPreview = false,
    super.key,
  });
  final void Function(String)? onOpenEvent;
  final RecommendationCardBuilder? recommendationCardBuilder;
  final bool syntheticPreview;

  @override
  ConsumerState<EventRecommendationsPage> createState() =>
      _EventRecommendationsPageState();
}

final class _EventRecommendationsPageState
    extends ConsumerState<EventRecommendationsPage>
    with WidgetsBindingObserver {
  late final EventRecommendationsController _controller;
  int? _operation;

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
    if (state != AppLifecycleState.resumed && mounted) _controller.clear();
  }

  void _load() {
    _operation = _controller.load(view: EventRecommendationView.all);
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(eventRecommendationsControllerProvider);
    return Scaffold(
      appBar: AppBar(title: Text(context.tr('Event recommendations', '活动推荐'))),
      body: SafeArea(
        child: ListView(
          key: const Key('route-event-recommendations'),
          padding: const EdgeInsets.all(24),
          children: [
            Text(
              context.tr('Event recommendations', '活动推荐'),
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 16),
            _RecommendationContent(
              state: state,
              onRetry: _load,
              onOpenEvent: widget.onOpenEvent,
              recommendationCardBuilder: widget.recommendationCardBuilder,
              syntheticPreview: widget.syntheticPreview,
            ),
          ],
        ),
      ),
    );
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
    this.onOpenEvent,
    this.recommendationCardBuilder,
    this.syntheticPreview = false,
  });

  final AsyncValue<EventRecommendationResponse> state;
  final VoidCallback onRetry;
  final VoidCallback? onSeeAll;
  final bool home;
  final String? heading;
  final VoidCallback? onBrowseAll;
  final bool syntheticPreview;
  final void Function(String)? onOpenEvent;
  final RecommendationCardBuilder? recommendationCardBuilder;

  @override
  Widget build(BuildContext context) {
    final inlineHeader = home && heading != null;
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
                action: onSeeAll == null
                    ? null
                    : OutlinedButton(
                        key: const Key('event-recommendations-see-all-empty'),
                        onPressed: onSeeAll,
                        child: Text(context.tr('See all', '查看全部')),
                      ),
              )
            : _RecommendationList(
                items: home ? value.items.take(2).toList() : value.items,
                onSeeAll: onSeeAll,
                onOpenEvent: onOpenEvent,
                recommendationCardBuilder: recommendationCardBuilder,
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
                  child: Text(context.tr('Browse all', '浏览活动')),
                ),
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
            key: const Key('event-recommendations-refresh'),
            onPressed: onRetry,
            icon: const Icon(Icons.refresh),
            label: Text(context.tr('Refresh', '刷新')),
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
  });

  final List<EventRecommendation> items;
  final void Function(String)? onOpenEvent;
  final RecommendationCardBuilder? recommendationCardBuilder;
  final VoidCallback? onSeeAll;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ...items.map(
          (item) => Padding(
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
                        '${_formatTime(item.startAt)}\n${item.endAt == null ? '' : 'Ends: ${_formatTime(item.endAt!)}\n'}Matches: ${item.matchedInterests.map((interest) => interest.displayName).join(', ')}',
                        '${_formatTime(item.startAt)}\n${item.endAt == null ? '' : '结束：${_formatTime(item.endAt!)}\n'}匹配兴趣：${item.matchedInterests.map((interest) => interest.displayName).join('、')}',
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
            child: Text(context.tr('See all', '查看全部')),
          ),
      ],
    );
  }

  String _formatTime(DateTime value) =>
      value.toLocal().toString().substring(0, 16);
}
