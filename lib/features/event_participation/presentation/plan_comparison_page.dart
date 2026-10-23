import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../../../core/presentation/status_panel.dart';
import '../../auth/auth_providers.dart';
import '../domain/participation_repository.dart';
import 'authorized_event_title.dart';
import 'participation_controller.dart';
import 'plan_comparison_controller.dart';

/// Composition supplies the existing Event detail route and awaits its return.
final class EventPlanComparisonPage extends ConsumerStatefulWidget {
  const EventPlanComparisonPage({
    required this.username,
    required this.onOpenEvent,
    super.key,
  });
  final String username;
  final Future<void> Function(String eventId) onOpenEvent;

  @override
  ConsumerState<EventPlanComparisonPage> createState() =>
      _EventPlanComparisonPageState();
}

final class _EventPlanComparisonPageState
    extends ConsumerState<EventPlanComparisonPage>
    with WidgetsBindingObserver {
  bool _active = true, _opening = false;

  PlanComparisonController get _controller =>
      ref.read(planComparisonControllerProvider(widget.username).notifier);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    final lifecycle = WidgetsBinding.instance.lifecycleState;
    _active = lifecycle == null || lifecycle == AppLifecycleState.resumed;
    _scheduleLoad();
  }

  void _scheduleLoad() => WidgetsBinding.instance.addPostFrameCallback((_) {
    if (mounted && _active && !_opening) _controller.load();
  });

  @override
  void didUpdateWidget(EventPlanComparisonPage old) {
    super.didUpdateWidget(old);
    if (old.username != widget.username) {
      ref
          .read(planComparisonControllerProvider(old.username).notifier)
          .retire();
      _opening = false;
      _scheduleLoad();
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _active = state == AppLifecycleState.resumed;
    if (_active) {
      if (!_opening) _scheduleLoad();
    } else {
      _controller.retire(resetCursor: true);
    }
  }

  Future<void> _open(PlanComparisonView rendered, String eventId) async {
    if (!_active || _opening) return;
    final username = widget.username;
    final session = ref.read(authSessionProvider).asData?.value;
    final controller = _controller;
    setState(() => _opening = true);
    final receipt = await controller.verifyForOpen(rendered, eventId);
    if (!mounted || widget.username != username) return;
    if (!_active || receipt == null || !controller.isCurrent(receipt)) {
      setState(() => _opening = false);
      return;
    }
    try {
      await widget.onOpenEvent(eventId);
    } finally {
      if (mounted && widget.username == username) {
        setState(() => _opening = false);
        if (_active &&
            identical(session, ref.read(authSessionProvider).asData?.value)) {
          await _controller.load();
        }
      }
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final view = ref.watch(planComparisonControllerProvider(widget.username));
    final own = ref.watch(participationControllerProvider);
    final controller = _controller;
    final rows = view.page?.items ?? const <PublicParticipation>[];
    final known = rows.where((row) => _known(own[row.eventId]));
    final shared = known.where(
      (row) => own[row.eventId]!.value!.status != ParticipationStatus.none,
    );
    final enabled = _active && !view.busy && !_opening;

    void load({bool next = false, bool first = false}) {
      if (enabled) controller.load(next: next, first: first);
    }

    return Scaffold(
      appBar: AppBar(title: Text(context.tr('Compare plans', '对照活动计划'))),
      body: SafeArea(
        child: Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 720),
            child: ListView(
              key: PageStorageKey('compare-plans-${widget.username}'),
              padding: const EdgeInsets.all(16),
              children: [
                Text(
                  context.tr(
                    'You and @${widget.username}',
                    '你与 @${widget.username}',
                  ),
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 8),
                Text(
                  context.tr(
                    'Compare their visible event choices with your saved plans. '
                        'Open an event to change your own choice.',
                    '对照对方当前可见的活动选择与你保存的计划。打开活动即可调整自己的选择。',
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  context.tr(
                    'Your choices stay under your existing privacy setting. '
                        'These records do not confirm an invitation or a booking.',
                    '你的选择仍遵循现有隐私设置。这些记录不代表已发出邀请或已预约。',
                  ),
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  children: [
                    TextButton.icon(
                      onPressed: enabled ? () => load() : null,
                      icon: const Icon(Icons.refresh),
                      label: Text(context.tr('Refresh comparison', '刷新对照')),
                    ),
                    TextButton(
                      onPressed: enabled ? () => load(first: true) : null,
                      child: Text(context.tr('First page', '返回第一页')),
                    ),
                  ],
                ),
                if (view.busy || _opening)
                  StatusPanel(
                    title: context.tr('Checking current choices', '正在核对当前选择'),
                    body: context.tr(
                      'Checking this visible page and your own participation.',
                      '正在核对本页可见记录和你自己的参与状态。',
                    ),
                    icon: Icons.sync,
                    loading: true,
                  ),
                if (view.failure case final failure?)
                  StatusPanel(
                    title: context.tr('Comparison unavailable', '暂时无法对照计划'),
                    body: localizedFailure(context, failure),
                    icon: Icons.cloud_off_outlined,
                    isError: true,
                    action: TextButton(
                      onPressed: enabled ? () => load() : null,
                      child: Text(context.tr('Try again', '重试')),
                    ),
                  ),
                if (view.selectionUnavailable)
                  StatusPanel(
                    title: context.tr(
                      'This choice is no longer visible',
                      '这条选择已不可见',
                    ),
                    body: context.tr(
                      'Refresh the comparison to see what is currently available.',
                      '请刷新对照，查看当前可见的记录。',
                    ),
                    icon: Icons.visibility_off_outlined,
                  ),
                if (view.page == null &&
                    !view.busy &&
                    !_opening &&
                    view.failure == null &&
                    !view.selectionUnavailable)
                  Text(
                    context.tr(
                      'Refresh to read the currently visible choices.',
                      '请刷新以读取当前可见的选择。',
                    ),
                  ),
                if (view.page != null && !view.busy && !_opening) ...[
                  if (rows.isEmpty)
                    StatusPanel(
                      title: context.tr(
                        'No visible choices on this page',
                        '本页没有可见的选择',
                      ),
                      body: view.page!.nextCursor == null
                          ? context.tr(
                              'Only participation visible to you can be compared. '
                                  'You can check again later.',
                              '这里只能对照当前允许你查看的参与记录，可稍后重新核对。',
                            )
                          : context.tr(
                              'More pages are available. Next page reads another '
                                  'page without assuming there are no plans.',
                              '还有更多页面，点击下一页继续查看。',
                            ),
                      icon: Icons.event_note_outlined,
                    )
                  else ...[
                    Semantics(
                      liveRegion: true,
                      child: Text(
                        context.tr(
                          '${shared.length} shared choices on this page · '
                              '${rows.length - known.length} of your choices unchecked',
                          '本页有 ${shared.length} 个双方都已选择的活动 · '
                              '你的 ${rows.length - known.length} 项状态尚未核实',
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    for (final row in rows)
                      Card(
                        key: ValueKey('comparison-${row.eventId}'),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              DefaultTextStyle.merge(
                                style: Theme.of(context).textTheme.titleMedium,
                                child: AuthorizedEventTitle(row.eventId),
                              ),
                              const SizedBox(height: 12),
                              Text(
                                '@${widget.username}: ${_status(context, row.status)}',
                              ),
                              const SizedBox(height: 4),
                              Text(
                                context.tr(
                                  'You: ${_ownStatus(context, own[row.eventId])}',
                                  '你：${_ownStatus(context, own[row.eventId])}',
                                ),
                              ),
                              if (_known(own[row.eventId]) &&
                                  own[row.eventId]!.value!.ignored)
                                Text(
                                  context.tr(
                                    'Hidden from your recommendations',
                                    '已从你的推荐中隐藏',
                                  ),
                                ),
                              if (!_known(own[row.eventId]))
                                Text(
                                  context.tr(
                                    'Your choice could not be confirmed. Open the '
                                        'event to check it; no change has been sent here.',
                                    '暂未确认你的选择，请打开活动核对；此页面没有提交任何修改。',
                                  ),
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                              const SizedBox(height: 8),
                              OutlinedButton.icon(
                                onPressed: enabled
                                    ? () => _open(view, row.eventId)
                                    : null,
                                icon: const Icon(Icons.event_outlined),
                                label: Text(
                                  context.tr(
                                    'View event and my plan',
                                    '查看活动与我的计划',
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                  const SizedBox(height: 12),
                  Text(
                    context.tr(
                      'This comparison covers only this visible page. '
                          'Your choices are never copied into another plan list.',
                      '当前仅对照本页可见记录，直接使用你已有的参与状态。',
                    ),
                  ),
                  if (view.page!.nextCursor != null)
                    OutlinedButton(
                      onPressed: enabled ? () => load(next: true) : null,
                      child: Text(context.tr('Next visible page', '下一页可见记录')),
                    ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

bool _known(ParticipationEntry? entry) =>
    entry?.value != null &&
    !entry!.busy &&
    !entry.uncertain &&
    entry.failure == null;

String _status(BuildContext context, ParticipationStatus status) =>
    switch (status) {
      ParticipationStatus.interested => context.tr('Interested', '感兴趣'),
      ParticipationStatus.going => context.tr('Going', '将参加'),
      ParticipationStatus.none => context.tr('Not chosen', '尚未选择'),
    };

String _ownStatus(BuildContext context, ParticipationEntry? entry) =>
    _known(entry)
    ? _status(context, entry!.value!.status)
    : context.tr('Not confirmed', '尚未核实');
