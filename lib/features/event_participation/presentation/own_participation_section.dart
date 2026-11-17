import '../../../core/presentation/enmori_localizations.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_motion.dart';
import '../../../core/presentation/local_time.dart';
import '../../../core/presentation/status_panel.dart';
import '../../auth/auth_providers.dart';
import '../domain/participation_repository.dart';
import '../participation_providers.dart';
import 'authorized_event_title.dart';
import 'own_participation_controller.dart';
import 'participation_controller.dart';
import 'plan_status_insights.dart';

enum _PlanFilter {
  all('All records'),
  interested('Interested'),
  going('Going'),
  hidden('Hidden'),
  none('No current participation');

  const _PlanFilter(this.label);
  final String label;
  String localized(BuildContext context) => context.tr(label, switch (this) {
    _PlanFilter.all => '全部记录',
    _PlanFilter.interested => '感兴趣',
    _PlanFilter.going => '将参加',
    _PlanFilter.hidden => '已隐藏',
    _PlanFilter.none => '当前未参与',
  });
  bool includes(EventParticipation row) => switch (this) {
    _PlanFilter.all => true,
    _PlanFilter.interested => row.status == ParticipationStatus.interested,
    _PlanFilter.going => row.status == ParticipationStatus.going,
    _PlanFilter.hidden => row.ignored,
    _PlanFilter.none => row.status == ParticipationStatus.none,
  };
}

/// Shared by Profile and My plans. Only page membership is collected here;
/// confirmed mutations and uncertain writes come from the existing controller.
final class OwnParticipationSection extends ConsumerStatefulWidget {
  const OwnParticipationSection({
    required this.onSelect,
    this.showHeading = true,
    this.showInsights = false,
    super.key,
  });
  final ValueChanged<String> onSelect;
  final bool showHeading;
  final bool showInsights;
  @override
  ConsumerState<OwnParticipationSection> createState() =>
      _OwnParticipationSectionState();
}

final class _OwnParticipationSectionState
    extends ConsumerState<OwnParticipationSection>
    with WidgetsBindingObserver {
  _PlanFilter _filter = _PlanFilter.all;
  bool _active = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _ensureLoaded();
  }

  void _ensureLoaded() => WidgetsBinding.instance.addPostFrameCallback((_) {
    if (mounted && _active) {
      ref.read(ownParticipationControllerProvider.notifier).ensureLoaded();
    }
  });

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _active = state == AppLifecycleState.resumed;
    if (_active) {
      ref.read(ownParticipationControllerProvider.notifier).ensureLoaded();
    } else {
      ref.read(ownParticipationControllerProvider.notifier).clear();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(authSessionProvider, (before, after) {
      if (!identical(before?.asData?.value, after.asData?.value)) {
        setState(() => _filter = _PlanFilter.all);
        _ensureLoaded();
      }
    });
    final session = participationSession(ref.watch(authSessionProvider));
    final state = ref.watch(ownParticipationControllerProvider);
    final rows = ref.watch(ownParticipationRecordsProvider);
    final entries = ref.watch(participationControllerProvider);
    final controller = ref.read(ownParticipationControllerProvider.notifier);
    final visible = rows.where(_filter.includes).toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (widget.showHeading) ...[
          Text(
            context.tr('My plans', '我的活动计划'),
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
        ],
        if (widget.showInsights && state.loaded && _active)
          PlanStatusInsights(
            rows: rows,
            complete: state.nextCursor == null && state.failure == null,
            refreshing: state.busy,
            failed: state.failure != null,
            unconfirmed: rows.any(
              (row) =>
                  entries[row.eventId]?.uncertain == true ||
                  entries[row.eventId]?.busy == true,
            ),
            onSelectStatus: (status) => setState(
              () => _filter = switch (status) {
                ParticipationStatus.interested => _PlanFilter.interested,
                ParticipationStatus.going => _PlanFilter.going,
                ParticipationStatus.none => _PlanFilter.none,
              },
            ),
          ),
        Text(
          context.tr(
            'Your saved choices in ENMORI. Interested and Going do not book a place.',
            '你在 ENMORI 保存的选择。“感兴趣”和“将参加”不代表已预约名额。',
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 4,
          children: [
            for (final filter in _PlanFilter.values)
              ChoiceChip(
                key: ValueKey('plans-filter-${filter.name}'),
                chipAnimationStyle: EnmoriMotion.chips(context),
                label: Text(filter.localized(context)),
                selected: _filter == filter,
                onSelected: (_) => setState(() => _filter = filter),
              ),
          ],
        ),
        Text(
          context.tr(
            'Filters apply to loaded records. Load more to find other choices.',
            '仅筛选已加载的记录，加载更多可查找其他选择。',
          ),
          style: Theme.of(context).textTheme.bodySmall,
        ),
        if (_filter == _PlanFilter.hidden)
          Text(
            context.tr(
              'Hidden from recommendations; your participation is kept.',
              '已从推荐中隐藏，参与状态仍然保留。',
            ),
            style: Theme.of(context).textTheme.bodySmall,
          ),
        Align(
          alignment: AlignmentDirectional.centerStart,
          child: TextButton.icon(
            onPressed: state.busy
                ? null
                : () {
                    if (!_active ||
                        session == null ||
                        !identical(
                          participationSession(ref.read(authSessionProvider)),
                          session,
                        )) {
                      return;
                    }
                    for (final id
                        in visible.map((row) => row.eventId).toSet()) {
                      ref.invalidate(authorizedEventDetailsProvider(id));
                    }
                    controller.load();
                  },
            icon: const Icon(Icons.refresh, size: 18),
            label: Text(context.tr('Refresh plans', '刷新计划')),
          ),
        ),
        if (state.busy)
          LinearProgressIndicator(
            semanticsLabel: context.tr('Loading your plans', '正在加载你的计划'),
          ),
        if (state.failure case final failure?)
          StatusPanel(
            title: state.loadingMore
                ? context.tr('More plans couldn’t be loaded', '无法加载更多计划')
                : context.tr('Plans couldn’t be refreshed', '无法刷新计划'),
            body: state.loaded
                ? context.tr(
                    '${failure.message} Last loaded records are still shown.',
                    '${localizedFailure(context, failure)} 仍显示上次加载的记录。',
                  )
                : localizedFailure(context, failure),
            icon: Icons.cloud_off_outlined,
            isError: true,
          ),
        if (state.loaded &&
            !state.busy &&
            state.failure == null &&
            visible.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Text(
              rows.isEmpty && state.nextCursor == null
                  ? context.tr(
                      'No saved plans yet. Open an event and choose Interested or Going.',
                      '还没有保存的计划。打开活动后，可选择“感兴趣”或“将参加”。',
                    )
                  : context.tr(
                      _filter == _PlanFilter.none
                          ? 'No records without current participation in this loaded selection. Try another filter${state.nextCursor != null ? ' or load more' : ''}.'
                          : 'No ${_filter == _PlanFilter.all ? '' : '${_filter.label.toLowerCase()} '}records in this loaded selection. Try another filter${state.nextCursor != null ? ' or load more' : ''}.',
                      '已加载的记录中没有匹配项，请尝试其他筛选${state.nextCursor != null ? '或加载更多' : ''}。',
                    ),
            ),
          ),
        for (final row in visible)
          Card(
            key: ValueKey('plan-${row.eventId}'),
            child: ListTile(
              contentPadding: const EdgeInsets.all(16),
              title: AuthorizedEventTitle(row.eventId),
              subtitle: Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    AuthorizedEventSchedule(row.eventId),
                    Text(switch (row.status) {
                      ParticipationStatus.interested => context.tr(
                        'Interested',
                        '感兴趣',
                      ),
                      ParticipationStatus.going => context.tr('Going', '将参加'),
                      ParticipationStatus.none => context.tr(
                        'No current participation',
                        '当前未参与',
                      ),
                    }),
                    if (row.ignored)
                      Text(
                        context.tr('Hidden from recommendations', '已从推荐中隐藏'),
                      ),
                    if (entries[row.eventId]?.uncertain == true)
                      Text(
                        context.tr(
                          'Change not confirmed. Open to check your plans.',
                          '修改尚未确认，请打开活动核对计划。',
                        ),
                      )
                    else if (entries[row.eventId]?.busy == true)
                      Text(
                        context.tr('Checking your participation…', '正在核对参与状态…'),
                      ),
                    if (row.updatedAt case final updated?)
                      Text(
                        context.tr(
                          'Plan updated ${localTimeLabel(context, updated)}',
                          '计划更新于 ${localTimeLabel(context, updated)}',
                        ),
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    const SizedBox(height: 4),
                    Text(context.tr('View or manage plan', '查看或管理计划')),
                  ],
                ),
              ),
              trailing: const Icon(Icons.chevron_right),
              onTap: state.busy
                  ? null
                  : () {
                      if (_active &&
                          controller.isCurrentSnapshot(state) &&
                          session != null &&
                          identical(
                            participationSession(ref.read(authSessionProvider)),
                            session,
                          )) {
                        FocusManager.instance.primaryFocus?.unfocus();
                        widget.onSelect(row.eventId);
                      }
                    },
            ),
          ),
        if (state.nextCursor != null)
          OutlinedButton(
            onPressed: state.busy ? null : () => controller.load(more: true),
            child: Text(
              state.failure != null && state.loadingMore
                  ? context.tr('Retry loading more plans', '重试加载更多计划')
                  : context.tr('Load more plans', '加载更多计划'),
            ),
          )
        else if (state.loaded &&
            !state.busy &&
            state.failure == null &&
            rows.isNotEmpty)
          Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: Text(
              context.tr(
                'All available participation records loaded.',
                '已加载所有可用的参与记录。',
              ),
            ),
          ),
      ],
    );
  }
}
