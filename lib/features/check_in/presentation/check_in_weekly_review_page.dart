import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../../account/content_access.dart';
import '../../auth/auth_providers.dart';
import 'check_in_search_controller.dart';
import 'check_in_record_insights.dart';

// A separate scan instance keeps Search and Review independent while sharing
// the same cursor, revocation and late-response rules.
final checkInWeeklyReviewProvider =
    NotifierProvider.autoDispose<CheckInSearchController, CheckInSearchState>(
      CheckInSearchController.new,
    );

final class CheckInWeeklyReviewPage extends ConsumerStatefulWidget {
  const CheckInWeeklyReviewPage({
    required this.lastDate,
    required this.timeZone,
    required this.onOpen,
    super.key,
  });
  final DateTime lastDate;
  final String timeZone;
  final ValueChanged<String> onOpen;

  @override
  ConsumerState<CheckInWeeklyReviewPage> createState() => _ReviewState();
}

final class _ReviewState extends ConsumerState<CheckInWeeklyReviewPage> {
  int _dayCount = 7;
  String? _selectedDate;
  DateTime get lastDate => widget.lastDate;
  String get timeZone => widget.timeZone;

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(checkInWeeklyReviewProvider);
    final scan = ref.read(checkInWeeklyReviewProvider.notifier);
    final first = DateTime(
      lastDate.year,
      lastDate.month,
      lastDate.day - (_dayCount - 1),
    );
    final busy = state.phase == CheckInSearchPhase.searching;
    final allowed =
        ref.watch(currentAuthSubjectProvider) != null &&
        ref.watch(contentAccessProvider).foreground;
    final local = MaterialLocalizations.of(context);
    final days = state.matches.map((e) => e.civilDate).toSet().length;
    return Scaffold(
      appBar: AppBar(title: Text(context.tr('My records in charts', '我的记录图表'))),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(
              '${local.formatCompactDate(first)} – ${local.formatCompactDate(lastDate)}',
            ),
            Text(context.tr('Local dates · $timeZone', '本地日期 · $timeZone')),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final count in [7, 28])
                  ChoiceChip(
                    key: ValueKey('review-range-$count'),
                    label: Text(context.tr('$count days', '$count 天')),
                    selected: _dayCount == count,
                    onSelected: allowed
                        ? (_) {
                            if (_dayCount == count) return;
                            scan.clear();
                            setState(() {
                              _dayCount = count;
                              _selectedDate = null;
                            });
                          }
                        : null,
                  ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              context.tr(
                'Counts use only your saved records and the labels you entered.',
                '仅统计本人保存的记录及自己填写的标签。',
              ),
            ),
            FilledButton.icon(
              key: const Key('weekly-review-load'),
              onPressed: !allowed || busy
                  ? null
                  : () => scan.start(
                      '',
                      first,
                      lastDate,
                      allRecords: true,
                      capturedZone: timeZone,
                    ),
              icon: const Icon(Icons.refresh),
              label: Text(
                _dayCount == 7
                    ? context.tr('Read this week', '读取这一周')
                    : context.tr('Read these 28 days', '读取这 28 天'),
              ),
            ),
            if (busy) ...[
              const LinearProgressIndicator(),
              TextButton(
                onPressed: scan.stop,
                child: Text(context.tr('Stop', '停止')),
              ),
            ],
            if (state.phase != CheckInSearchPhase.idle) ...[
              Semantics(
                liveRegion: true,
                child: Text(
                  state.phase == CheckInSearchPhase.complete
                      ? context.tr(
                          'All $_dayCount dates checked',
                          '已查完全部 $_dayCount 天',
                        )
                      : context.tr(
                          'Incomplete · ${state.daysRead}/$_dayCount dates checked',
                          '结果不完整 · 已查 ${state.daysRead}/$_dayCount 天',
                        ),
                ),
              ),
              if (state.phase == CheckInSearchPhase.failed)
                Text(
                  context.tr(
                    'Could not finish reading. Retry or continue.',
                    '读取未完成，请重试或继续。',
                  ),
                ),
              if (state.failure case final failure?)
                Text(localizedFailure(context, failure)),
              if (!busy && scan.canResume)
                TextButton(
                  onPressed: scan.resume,
                  child: Text(context.tr('Continue', '继续')),
                ),
              Text(
                context.tr(
                  '$days ${days == 1 ? 'day' : 'days'} with records · ${state.matches.length} ${state.matches.length == 1 ? 'record' : 'records'}',
                  '有记录 $days 天 · ${state.matches.length} 条记录',
                ),
                key: const Key('weekly-review-counts'),
                style: Theme.of(context).textTheme.titleLarge,
              ),
              if (state.phase == CheckInSearchPhase.complete &&
                  state.matches.isEmpty)
                Text(
                  context.tr(
                    'No saved records in this range.',
                    '这段日期内没有保存的记录。',
                  ),
                ),
              CheckInRecordInsights(
                state: state,
                lastDate: lastDate,
                dayCount: _dayCount,
                selectedDate: _selectedDate,
                onSelectDate: (value) => setState(() => _selectedDate = value),
              ),
              if (_selectedDate != null)
                Text(
                  context.tr('Records on $_selectedDate', '$_selectedDate 的记录'),
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              if (_selectedDate != null &&
                  !state.matches.any((m) => m.civilDate == _selectedDate))
                Text(
                  state.phase == CheckInSearchPhase.complete
                      ? context.tr('No records on this date.', '当天没有记录。')
                      : context.tr(
                          'No records loaded for this date yet.',
                          '尚未读到当天的记录。',
                        ),
                ),
              for (final entry in state.matches.where(
                (m) => _selectedDate == null || m.civilDate == _selectedDate,
              ))
                ListTile(
                  key: Key('weekly-record-${entry.record.checkInId}'),
                  title: Text(
                    entry.record.note.isEmpty
                        ? context.tr('Check-in', '签到')
                        : entry.record.note,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  subtitle: Text(entry.localTime),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: !allowed
                      ? null
                      : () {
                          scan.clear();
                          widget.onOpen(entry.record.checkInId);
                        },
                ),
            ],
          ],
        ),
      ),
    );
  }
}
