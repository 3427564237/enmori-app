import 'package:flutter/material.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../../../core/presentation/record_charts.dart';
import '../domain/participation_repository.dart';

/// Current saved intent, never attendance or a history inferred from updatedAt.
final class PlanStatusInsights extends StatelessWidget {
  const PlanStatusInsights({
    required this.rows,
    required this.complete,
    required this.refreshing,
    required this.failed,
    required this.unconfirmed,
    required this.onSelectStatus,
    super.key,
  });
  final List<EventParticipation> rows;
  final bool complete, refreshing, failed, unconfirmed;
  final ValueChanged<ParticipationStatus> onSelectStatus;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final values = [
      (
        ParticipationStatus.interested,
        context.tr('Interested', '感兴趣'),
        scheme.tertiary,
      ),
      (ParticipationStatus.going, context.tr('Going', '将参加'), scheme.primary),
      (
        ParticipationStatus.none,
        context.tr('No current participation', '当前未参与'),
        scheme.outline,
      ),
    ];
    int count(ParticipationStatus status) =>
        rows.where((row) => row.status == status).length;
    return RecordChartPanel(
      key: const Key('plans-status-chart'),
      title: context.tr('Your plans at a glance', '活动计划概览'),
      icon: Icons.donut_small,
      children: [
        Center(
          child: RecordRing(
            segments: [
              for (final (status, _, color) in values)
                (
                  fraction: rows.isEmpty ? 0.0 : count(status) / rows.length,
                  color: color,
                ),
            ],
            value: '${rows.length}',
            label: context.tr('Loaded plan records', '已加载的计划记录'),
          ),
        ),
        const SizedBox(height: 12),
        Text(
          context.tr(
            '${rows.length} loaded plan records',
            '已加载 ${rows.length} 条计划记录',
          ),
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        Text(
          failed
              ? context.tr(
                  'Refresh failed. This chart shows the last loaded snapshot.',
                  '刷新失败，图表显示上次读取的状态。',
                )
              : refreshing
              ? context.tr(
                  'Refreshing. This chart shows the last loaded snapshot.',
                  '正在刷新，图表显示上次读取的状态。',
                )
              : complete
              ? context.tr('All available records loaded.', '已加载所有可用记录。')
              : context.tr(
                  'Partial view. Load more plans to complete the chart.',
                  '统计尚不完整，请加载更多计划。',
                ),
          key: const Key('plans-chart-completeness'),
        ),
        if (unconfirmed)
          Text(
            context.tr(
              'Some changes are unconfirmed. Counts use the last confirmed choices.',
              '部分修改尚未确认，统计沿用上次确认的选择。',
            ),
          ),
        for (final (status, label, color) in values)
          RecordCountBar(
            key: ValueKey('plans-chart-${status.name}'),
            label: label,
            count: count(status),
            total: rows.length,
            color: color,
            onTap: refreshing ? null : () => onSelectStatus(status),
          ),
        Text(
          context.tr(
            '${rows.where((r) => r.ignored).length} hidden from recommendations · included in the counts above',
            '${rows.where((r) => r.ignored).length} 条已从推荐中隐藏，仍计入以上状态',
          ),
          style: Theme.of(context).textTheme.bodySmall,
        ),
        const SizedBox(height: 8),
        Text(
          context.tr(
            'Tap a status to filter the list. These are saved choices, not attendance.',
            '点击状态筛选列表。这里统计保存的选择，不代表实际到场。',
          ),
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }
}
