import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../../account/content_access.dart';
import '../../auth/auth_providers.dart';
import 'check_in_search_controller.dart';

// A separate scan instance keeps Search and Review independent while sharing
// the same cursor, revocation and late-response rules.
final checkInWeeklyReviewProvider =
    NotifierProvider.autoDispose<CheckInSearchController, CheckInSearchState>(
      CheckInSearchController.new,
    );

final class CheckInWeeklyReviewPage extends ConsumerWidget {
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
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(checkInWeeklyReviewProvider);
    final scan = ref.read(checkInWeeklyReviewProvider.notifier);
    final first = DateTime(lastDate.year, lastDate.month, lastDate.day - 6);
    final busy = state.phase == CheckInSearchPhase.searching;
    final allowed =
        ref.watch(currentAuthSubjectProvider) != null &&
        ref.watch(contentAccessProvider).foreground;
    final local = MaterialLocalizations.of(context);
    final days = state.matches.map((e) => e.civilDate).toSet().length;
    Map<String, int> counts(String? Function(CheckInSearchMatch) label) {
      final result = <String, int>{};
      for (final entry in state.matches) {
        final value = label(entry);
        if (value != null && value.trim().isNotEmpty) {
          result.update(value, (count) => count + 1, ifAbsent: () => 1);
        }
      }
      return result;
    }

    final moods = counts((e) => e.record.mood);
    final activities = counts((e) => e.record.activity);
    Widget distribution(String title, Map<String, int> values) {
      final entries = values.entries.toList()
        ..sort((a, b) {
          final order = b.value.compareTo(a.value);
          return order == 0 ? a.key.compareTo(b.key) : order;
        });
      final missing =
          state.matches.length - values.values.fold(0, (a, b) => a + b);
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(title, style: Theme.of(context).textTheme.titleMedium),
              for (final entry in entries)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text('${entry.key} · ${entry.value}'),
                ),
              const SizedBox(height: 8),
              Text(context.tr('Not filled in · $missing', '未填写 · $missing')),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: Text(context.tr('My week in records', '我的一周回顾'))),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(
              '${local.formatCompactDate(first)} – ${local.formatCompactDate(lastDate)}',
            ),
            Text(context.tr('Local dates · $timeZone', '本地日期 · $timeZone')),
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
              label: Text(context.tr('Read this week', '读取这一周')),
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
                      ? context.tr('All 7 dates checked', '已查完全部 7 天')
                      : context.tr(
                          'Incomplete · ${state.daysRead}/7 dates checked',
                          '结果不完整 · 已查 ${state.daysRead}/7 天',
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
                  context.tr('No saved records in this week.', '这一周没有保存的记录。'),
                ),
              distribution(context.tr('Mood labels', '心情标签'), moods),
              distribution(context.tr('Activity labels', '活动标签'), activities),
              for (final entry in state.matches)
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
                          onOpen(entry.record.checkInId);
                        },
                ),
            ],
          ],
        ),
      ),
    );
  }
}
