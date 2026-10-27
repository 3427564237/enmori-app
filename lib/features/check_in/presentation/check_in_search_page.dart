import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../../account/content_access.dart';
import '../../auth/auth_providers.dart';
import 'check_in_search_controller.dart';

final class CheckInSearchPage extends ConsumerStatefulWidget {
  const CheckInSearchPage({required this.onOpen, super.key});
  final ValueChanged<String> onOpen;
  @override
  ConsumerState<CheckInSearchPage> createState() => _CheckInSearchPageState();
}

final class _CheckInSearchPageState extends ConsumerState<CheckInSearchPage> {
  final _query = TextEditingController();
  late DateTimeRange _range;
  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    _range = DateTimeRange(
      start: DateTime(today.year, today.month, today.day - 6),
      end: today,
    );
  }

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  Future<void> _chooseDates() async {
    final session = ref.read(authSessionProvider).asData?.value;
    final dates = await showDateRangePicker(
      context: context,
      initialDateRange: _range,
      firstDate: DateTime(1),
      lastDate: DateTime.now(),
    );
    if (!mounted ||
        dates == null ||
        !identical(session, ref.read(authSessionProvider).asData?.value)) {
      return;
    }
    ref.read(checkInSearchProvider.notifier).clear();
    setState(() => _range = dates);
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(authSessionProvider, (before, after) {
      if (!identical(before?.asData?.value, after.asData?.value)) {
        _query.clear();
        setState(() {});
      }
    });
    final state = ref.watch(checkInSearchProvider);
    final controller = ref.read(checkInSearchProvider.notifier);
    final busy = state.phase == CheckInSearchPhase.searching;
    final allowed =
        ref.watch(currentAuthSubjectProvider) != null &&
        ref.watch(contentAccessProvider).foreground;
    final local = MaterialLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(context.tr('Search my Check-ins', '搜索我的签到'))),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextField(
              key: const Key('check-in-search-query'),
              controller: _query,
              maxLength: 100,
              textInputAction: TextInputAction.search,
              decoration: InputDecoration(
                labelText: context.tr('Keyword', '关键词'),
                helperText: context.tr(
                  'Search your Note, Activity and place names.',
                  '搜索本人的笔记、活动标签和地点名称。',
                ),
              ),
              onChanged: (_) {
                controller.clear();
                setState(() {});
              },
              onSubmitted: (_) {
                if (allowed && _query.text.trim().isNotEmpty) {
                  controller.start(_query.text, _range.start, _range.end);
                }
              },
            ),
            TextButton.icon(
              key: const Key('check-in-search-dates'),
              onPressed: busy ? null : _chooseDates,
              icon: const Icon(Icons.date_range),
              label: Text(
                '${local.formatCompactDate(_range.start)} – ${local.formatCompactDate(_range.end)}',
              ),
            ),
            FilledButton.icon(
              key: const Key('check-in-search-start'),
              onPressed: !allowed || busy || _query.text.trim().isEmpty
                  ? null
                  : () =>
                        controller.start(_query.text, _range.start, _range.end),
              icon: const Icon(Icons.search),
              label: Text(context.tr('Search', '搜索')),
            ),
            if (busy) ...[
              const LinearProgressIndicator(),
              TextButton(
                key: const Key('check-in-search-stop'),
                onPressed: controller.stop,
                child: Text(context.tr('Stop search', '停止搜索')),
              ),
            ],
            if (state.phase != CheckInSearchPhase.idle) ...[
              const SizedBox(height: 12),
              Text(
                context.tr(
                  '${state.daysRead}/${state.totalDays} days checked · ${state.recordsRead} records read',
                  '已查 ${state.daysRead}/${state.totalDays} 天 · 已读 ${state.recordsRead} 条记录',
                ),
              ),
              if (state.failure case final failure?)
                Text(localizedFailure(context, failure)),
              if (state.zone != null)
                Text(
                  context.tr(
                    'Local time · ${state.zone}',
                    '本地时间 · ${state.zone}',
                  ),
                ),
              Semantics(
                liveRegion: true,
                child: Text(switch (state.phase) {
                  CheckInSearchPhase.complete => context.tr(
                    'Selected range searched · ${state.matches.length} matches',
                    '所选日期范围已查完 · ${state.matches.length} 条匹配',
                  ),
                  CheckInSearchPhase.failed => context.tr(
                    'Search could not finish. Results shown are incomplete.',
                    '搜索未能完成，当前结果不完整。',
                  ),
                  CheckInSearchPhase.stopped => context.tr(
                    'Search stopped. Results shown are incomplete.',
                    '搜索已停止，当前结果不完整。',
                  ),
                  _ => context.tr(
                    'Searching… Results are still incomplete.',
                    '正在搜索，当前结果尚不完整。',
                  ),
                }),
              ),
              if (!busy && controller.canResume)
                TextButton(
                  key: const Key('check-in-search-resume'),
                  onPressed: controller.resume,
                  child: Text(context.tr('Continue search', '继续搜索')),
                ),
              if (state.phase == CheckInSearchPhase.complete &&
                  state.matches.isEmpty)
                Text(
                  context.tr(
                    'No matches. Try another keyword or date range.',
                    '没有匹配记录，可更换关键词或日期范围。',
                  ),
                ),
              for (final entry in state.matches)
                ListTile(
                  key: Key('check-in-search-result-${entry.record.checkInId}'),
                  title: Text(
                    entry.record.note.isNotEmpty
                        ? entry.record.note
                        : entry.record.activity ??
                              entry.record.locationLabel ??
                              context.tr('Check-in', '签到'),
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                  ),
                  subtitle: Text(
                    [
                      entry.localTime,
                      ?entry.record.activity,
                      ?entry.record.locationLabel,
                    ].join(' · '),
                  ),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: !allowed
                      ? null
                      : () {
                          controller.clear();
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
