import 'package:flutter/material.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../../../core/presentation/record_charts.dart';
import 'check_in_search_controller.dart';

/// Summarizes the current permitted scan only; never keeps an aggregate cache.
final class CheckInRecordInsights extends StatelessWidget {
  const CheckInRecordInsights({
    required this.state,
    required this.lastDate,
    required this.dayCount,
    required this.selectedDate,
    required this.onSelectDate,
    super.key,
  });
  final CheckInSearchState state;
  final DateTime lastDate;
  final int dayCount;
  final String? selectedDate;
  final ValueChanged<String?> onSelectDate;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final complete = state.phase == CheckInSearchPhase.complete;
    final days = <String, int>{};
    for (final match in state.matches) {
      if (match.civilDate case final date?) {
        days.update(date, (value) => value + 1, ifAbsent: () => 1);
      }
    }
    final dates = [
      for (var i = dayCount - 1; i >= 0; i--)
        DateTime.utc(lastDate.year, lastDate.month, lastDate.day - i),
    ];
    final maxCount = days.values.fold(1, (a, b) => a > b ? a : b);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        RecordChartPanel(
          key: const Key('check-in-coverage-chart'),
          title: context.tr('Your rhythm', '记录的节奏'),
          icon: Icons.donut_large,
          children: [
            Center(
              child: RecordRing(
                segments: [
                  (fraction: days.length / dayCount, color: scheme.primary),
                ],
                value: '${days.length}/$dayCount',
                label: context.tr('Days with records', '有记录的天数'),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              context.tr('Days with records', '有记录的天数'),
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            Text(
              context.tr(
                '${state.matches.length} saved records',
                '${state.matches.length} 条已保存记录',
              ),
              textAlign: TextAlign.center,
            ),
            if (!complete) ...[
              const SizedBox(height: 8),
              Text(
                context.tr(
                  'Reading is incomplete. Counts may increase.',
                  '读取尚未完成，统计数量可能增加。',
                ),
              ),
            ],
          ],
        ),
        RecordChartPanel(
          key: const Key('check-in-daily-chart'),
          title: context.tr('Day by day', '每天的记录'),
          icon: dayCount == 7
              ? Icons.bar_chart_rounded
              : Icons.calendar_view_month,
          children: [
            Text(
              context.tr(
                'Tap a date to see its records below.',
                '点击日期，在下方查看当天的记录。',
              ),
            ),
            const SizedBox(height: 12),
            LayoutBuilder(
              builder: (context, constraints) {
                final columns = (constraints.maxWidth / 54).floor().clamp(1, 7);
                final cellWidth =
                    (constraints.maxWidth - (columns - 1) * 6) / columns;
                return Wrap(
                  spacing: 6,
                  runSpacing: 8,
                  children: [
                    for (var index = 0; index < dates.length; index++)
                      _DayCell(
                        date: dates[index],
                        count:
                            days[dates[index].toIso8601String().substring(
                              0,
                              10,
                            )] ??
                            0,
                        complete:
                            complete || index >= dayCount - state.daysRead,
                        maximum: maxCount,
                        width: cellWidth,
                        bars: dayCount == 7,
                        selected:
                            selectedDate ==
                            dates[index].toIso8601String().substring(0, 10),
                        onTap: () {
                          final key = dates[index].toIso8601String().substring(
                            0,
                            10,
                          );
                          onSelectDate(selectedDate == key ? null : key);
                        },
                      ),
                  ],
                );
              },
            ),
            const SizedBox(height: 12),
            Text(
              context.tr(
                'Numbers are record counts. ? means the date is not fully read; ≥ is a partial count.',
                '数字为记录条数。? 表示当天尚未读完；≥ 表示目前已读取的数量。',
              ),
              style: Theme.of(context).textTheme.bodySmall,
            ),
            if (selectedDate != null)
              TextButton.icon(
                key: const Key('insights-clear-date'),
                onPressed: () => onSelectDate(null),
                icon: const Icon(Icons.clear),
                label: Text(context.tr('Show all dates', '显示全部日期')),
              ),
          ],
        ),
        for (final (title, icon, label, color) in [
          (
            context.tr('Mood labels', '心情标签'),
            Icons.mood,
            (CheckInSearchMatch e) => e.record.mood,
            scheme.tertiary,
          ),
          (
            context.tr('Activity labels', '活动标签'),
            Icons.directions_walk,
            (CheckInSearchMatch e) => e.record.activity,
            scheme.primary,
          ),
        ])
          _distribution(context, title, icon, label, color),
      ],
    );
  }

  Widget _distribution(
    BuildContext context,
    String title,
    IconData icon,
    String? Function(CheckInSearchMatch) label,
    Color color,
  ) {
    final counts = <String, int>{};
    for (final match in state.matches) {
      final value = label(match);
      if (value != null && value.trim().isNotEmpty) {
        counts.update(value, (count) => count + 1, ifAbsent: () => 1);
      }
    }
    final entries = counts.entries.toList()
      ..sort((a, b) {
        final order = b.value.compareTo(a.value);
        return order == 0 ? a.key.compareTo(b.key) : order;
      });
    final missing =
        state.matches.length - counts.values.fold(0, (a, b) => a + b);
    return RecordChartPanel(
      title: title,
      icon: icon,
      children: [
        for (final entry in entries)
          RecordCountBar(
            label: entry.key,
            count: entry.value,
            total: state.matches.length,
            color: color,
          ),
        Text(context.tr('Not filled in · $missing', '未填写 · $missing')),
      ],
    );
  }
}

final class _DayCell extends StatelessWidget {
  const _DayCell({
    required this.date,
    required this.count,
    required this.complete,
    required this.maximum,
    required this.width,
    required this.bars,
    required this.selected,
    required this.onTap,
  });
  final DateTime date;
  final int count, maximum;
  final double width;
  final bool complete, bars, selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final dateKey = date.toIso8601String().substring(0, 10);
    final value = complete
        ? '$count'
        : count > 0
        ? '≥$count'
        : '?';
    return SizedBox(
      width: width,
      child: Semantics(
        label: '$dateKey: $value ${context.tr('records', '条记录')}',
        button: true,
        selected: selected,
        child: ExcludeSemantics(
          child: Material(
            color: selected
                ? scheme.primaryContainer
                : scheme.surfaceContainerLow,
            borderRadius: BorderRadius.circular(12),
            child: InkWell(
              key: ValueKey('insights-day-$dateKey'),
              borderRadius: BorderRadius.circular(12),
              onTap: onTap,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 4,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: selected ? scheme.primary : Colors.transparent,
                    width: 2,
                  ),
                ),
                child: Column(
                  children: [
                    if (bars)
                      SizedBox(
                        height: 64,
                        child: Align(
                          alignment: Alignment.bottomCenter,
                          child: Container(
                            width: 14,
                            height: count == 0 ? 3 : 64 * count / maximum,
                            decoration: BoxDecoration(
                              color: count == 0
                                  ? scheme.outlineVariant
                                  : scheme.primary,
                              borderRadius: BorderRadius.circular(7),
                            ),
                          ),
                        ),
                      ),
                    if (!bars)
                      Container(
                        width: 14,
                        height: 14,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: !complete && count == 0
                              ? scheme.outlineVariant
                              : scheme.primary.withValues(
                                  alpha: count == 0
                                      ? .08
                                      : .2 + .8 * count / maximum,
                                ),
                        ),
                      ),
                    const SizedBox(height: 6),
                    Text(
                      value,
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.labelLarge,
                    ),
                    Text(
                      '${date.day}/${date.month}',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.labelSmall,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
