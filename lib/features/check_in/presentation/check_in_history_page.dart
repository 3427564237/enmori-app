import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../../../core/presentation/enmori_motion.dart';
import '../../../core/result/result.dart';
import '../../account/domain/account_repository.dart';
import '../../auth/auth_providers.dart';
import '../check_in_providers.dart';
import '../domain/check_in_calendar_repository.dart';
import 'check_in_calendar_page.dart';
import 'check_in_history_controller.dart';
import 'check_in_search_page.dart';
import 'check_in_weekly_review_page.dart';

Widget buildCheckInHistoryPage({
  required BuildContext context,
  required VoidCallback onBack,
  required ValueChanged<String> onOpenSavedCheckIn,
}) =>
    CheckInHistoryPage(onBack: onBack, onOpenSavedCheckIn: onOpenSavedCheckIn);

final class CheckInHistoryPage extends ConsumerStatefulWidget {
  const CheckInHistoryPage({
    required this.onBack,
    required this.onOpenSavedCheckIn,
    super.key,
  });

  final VoidCallback onBack;
  final ValueChanged<String> onOpenSavedCheckIn;

  @override
  ConsumerState<CheckInHistoryPage> createState() => _CheckInHistoryPageState();
}

class _CheckInHistoryPageState extends ConsumerState<CheckInHistoryPage> {
  String? _highlight;
  final _anchor = GlobalKey();
  Timer? _highlightTimer;
  @override
  void dispose() {
    _highlightTimer?.cancel();
    super.dispose();
  }

  Future<void> _openCalendar(
    CheckInHistoryState current,
    CheckInHistoryController controller,
  ) async {
    final openedSession = ref.read(authSessionProvider).asData?.value;
    final selection = await Navigator.of(context).push<CalendarSelection>(
      MaterialPageRoute(
        builder: (_) => CheckInCalendarPage(
          initialDate: current.selectedDate!,
          latestDate: current.latestDate!,
          timeZone: current.ianaZone!,
        ),
      ),
    );
    if (!mounted ||
        selection == null ||
        !identical(
          openedSession,
          ref.read(authSessionProvider).asData?.value,
        )) {
      return;
    }
    if (current.selectedDate == selection.date) {
      await controller.reload();
    } else {
      await controller.selectDate(selection.date);
    }
    if (!mounted || selection.checkInId == null) return;
    var state = ref.read(checkInHistoryControllerProvider);
    final seen = <String>{};
    while (state.phase == CheckInHistoryPhase.ready &&
        !state.entries.any(
          (entry) => entry.checkIn.checkInId == selection.checkInId,
        ) &&
        state.nextCursor != null &&
        seen.add(state.nextCursor!)) {
      await controller.loadNext();
      if (!mounted) return;
      state = ref.read(checkInHistoryControllerProvider);
      if (state.nextPageFailure != null) break;
    }
    if (!state.entries.any(
      (entry) => entry.checkIn.checkInId == selection.checkInId,
    )) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            context.tr(
              'This record could not be located. Reload the date.',
              '暂时无法定位这条记录，请重新加载当天记录。',
            ),
          ),
        ),
      );
      return;
    }
    setState(() => _highlight = selection.checkInId);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final target = _anchor.currentContext;
      if (mounted && target != null) {
        Scrollable.ensureVisible(
          target,
          duration: EnmoriMotion.duration(context, EnmoriMotion.feedback),
          alignment: .25,
        );
      }
    });
    _highlightTimer?.cancel();
    _highlightTimer = Timer(const Duration(seconds: 3), () {
      if (mounted) setState(() => _highlight = null);
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(checkInHistoryControllerProvider);
    final controller = ref.read(checkInHistoryControllerProvider.notifier);
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          tooltip: context.tr('Back', '返回'),
          onPressed: widget.onBack,
          icon: const Icon(Icons.arrow_back),
        ),
        title: Text(context.tr('Check-in History', '签到历史')),
        actions: [
          IconButton(
            key: const Key('history-search'),
            tooltip: context.tr('Search my Check-ins', '搜索我的签到'),
            onPressed: () => Navigator.of(context).push<void>(
              MaterialPageRoute(
                builder: (_) =>
                    CheckInSearchPage(onOpen: widget.onOpenSavedCheckIn),
              ),
            ),
            icon: const Icon(Icons.search),
          ),
          if (ref.watch(checkInRepositoryProvider) is CheckInCalendarRepository)
            IconButton(
              key: const Key('history-month-calendar'),
              tooltip: context.tr('Month calendar', '月历'),
              onPressed:
                  state.selectedDate == null ||
                      state.latestDate == null ||
                      state.ianaZone == null
                  ? null
                  : () => _openCalendar(state, controller),
              icon: const Icon(Icons.calendar_month),
            ),
          IconButton(
            key: const Key('history-reload'),
            tooltip: context.tr('Reload', '重新加载'),
            onPressed: state.phase == CheckInHistoryPhase.loading
                ? null
                : controller.reload,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton.icon(
                key: const Key('history-weekly-review'),
                onPressed: state.selectedDate == null || state.ianaZone == null
                    ? null
                    : () => Navigator.of(context).push<void>(
                        MaterialPageRoute(
                          builder: (_) => CheckInWeeklyReviewPage(
                            lastDate: state.selectedDate!,
                            timeZone: state.ianaZone!,
                            onOpen: widget.onOpenSavedCheckIn,
                          ),
                        ),
                      ),
                icon: const Icon(Icons.insights_outlined),
                label: Text(
                  context.tr(
                    'Review 7 days ending on this date',
                    '回顾截至所选日期的七天',
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: Wrap(
                alignment: WrapAlignment.spaceBetween,
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: 12,
                runSpacing: 8,
                children: [
                  TextButton.icon(
                    key: const Key('history-select-date'),
                    onPressed:
                        state.latestDate == null ||
                            state.phase == CheckInHistoryPhase.loading
                        ? null
                        : () => _selectDate(context, controller, state),
                    icon: const Icon(Icons.calendar_today_outlined),
                    label: Text(
                      state.selectedDate == null
                          ? context.tr('Choose date', '选择日期')
                          : MaterialLocalizations.of(context)
                                .formatFullDate(state.selectedDate!),
                    ),
                  ),
                  if (state.ianaZone case final zone?)
                    Text(
                      context.tr('Local time · $zone', '本地时间 · $zone'),
                      key: const Key('history-device-zone'),
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                ],
              ),
            ),
            if (state.phase != CheckInHistoryPhase.failed &&
                state.phase != CheckInHistoryPhase.signedOut &&
                state.selectedDate != null &&
                state.ianaZone != null &&
                ref.watch(checkInRepositoryProvider)
                    is CheckInCalendarRepository)
              _RecordedDayNavigation(
                state: state,
                onSelect: controller.selectDate,
              ),
            const Divider(height: 1),
            Expanded(
              child: _HistoryBody(
                state: state,
                onOpen: widget.onOpenSavedCheckIn,
                highlight: _highlight,
                anchor: _anchor,
                onRetry: controller.reload,
              ),
            ),
            if (state.phase == CheckInHistoryPhase.ready &&
                state.nextCursor != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (state.nextPageFailure != null) ...[
                      Text(
                        context.tr(
                          'The next page is unavailable. Your current records are still shown.',
                          '下一页暂时不可用，当前记录仍会保留。',
                        ),
                        key: Key('history-next-page-error'),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 8),
                    ],
                    FilledButton.tonalIcon(
                      key: const Key('history-next-page'),
                      onPressed: state.isLoadingNext
                          ? null
                          : controller.loadNext,
                      icon: state.isLoadingNext
                          ? const SizedBox.square(
                              dimension: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Icon(
                              state.nextPageFailure == null
                                  ? Icons.navigate_next
                                  : Icons.refresh,
                            ),
                      label: Text(
                        state.isLoadingNext
                            ? context.tr('Loading…', '正在加载…')
                            : state.nextPageFailure == null
                            ? context.tr('Load more', '加载更多')
                            : context.tr('Retry next page', '重试下一页'),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _selectDate(
    BuildContext context,
    CheckInHistoryController controller,
    CheckInHistoryState state,
  ) async {
    final today = state.latestDate;
    if (today == null) return;
    final selected = await showDatePicker(
      context: context,
      initialDate: state.selectedDate ?? today,
      firstDate: DateTime.utc(1),
      lastDate: today,
      helpText: context.tr('Choose a Check-in date', '选择签到日期'),
    );
    if (selected != null) await controller.selectDate(selected);
  }
}

final class _HistoryBody extends StatelessWidget {
  const _HistoryBody({
    required this.state,
    required this.onOpen,
    required this.onRetry,
    this.highlight,
    this.anchor,
  });

  final CheckInHistoryState state;
  final ValueChanged<String> onOpen;
  final VoidCallback onRetry;
  final String? highlight;
  final GlobalKey? anchor;

  @override
  Widget build(BuildContext context) {
    return switch (state.phase) {
      CheckInHistoryPhase.signedOut => _Message(
        key: Key('history-session-required'),
        icon: Icons.lock_outline,
        title: context.tr('Sign in to view your Check-ins', '登录后查看签到'),
        action: null,
      ),
      CheckInHistoryPhase.loading => Center(
        key: Key('history-loading'),
        child: CircularProgressIndicator(),
      ),
      CheckInHistoryPhase.failed => _Message(
        key: const Key('history-error'),
        icon: Icons.sync_problem,
        title: switch (state.failure?.kind) {
          AppFailureKind.authRequired => context.tr(
            'Sign in again to view your Check-ins.',
            '请重新登录以查看签到。',
          ),
          AppFailureKind.authForbidden => context.tr(
            'This account cannot view these Check-ins.',
            '此账号无法查看这些签到。',
          ),
          _ => context.tr('History is unavailable.', '历史记录暂时不可用。'),
        },
        action: FilledButton.icon(
          key: const Key('history-retry'),
          onPressed: onRetry,
          icon: const Icon(Icons.refresh),
          label: Text(context.tr('Retry', '重试')),
        ),
      ),
      CheckInHistoryPhase.ready when state.entries.isEmpty => _Message(
        key: Key('history-empty'),
        icon: Icons.event_busy_outlined,
        title: context.tr('No Check-ins for this date.', '当天没有签到。'),
        action: null,
      ),
      CheckInHistoryPhase.ready => SingleChildScrollView(
        key: const Key('history-list'),
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Column(
          children: [
            for (final entry in state.entries) ...[
              Material(
                key: entry.checkIn.checkInId == highlight ? anchor : null,
                color: entry.checkIn.checkInId == highlight
                    ? Theme.of(context).colorScheme.primaryContainer
                    : Colors.transparent,
                child: _HistoryTile(
                  entry: entry,
                  onTap: () => onOpen(entry.checkIn.checkInId),
                ),
              ),
              const Divider(height: 1, indent: 20, endIndent: 20),
            ],
          ],
        ),
      ),
    };
  }
}

final class _HistoryTile extends StatelessWidget {
  const _HistoryTile({required this.entry, required this.onTap});

  final CheckInHistoryEntry entry;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final visibility = switch (entry.checkIn.checkInVisibility) {
      CheckInVisibility.private => context.tr('Private', '仅自己'),
      CheckInVisibility.friendsOnly => context.tr('Friends-only', '仅好友'),
      CheckInVisibility.public => context.tr('Public', '公开'),
      null => null,
    };
    return ListTile(
      key: Key('history-entry-${entry.checkIn.checkInId}'),
      onTap: onTap,
      title: Text(
        entry.checkIn.note.isEmpty
            ? (entry.checkIn.mood ?? '')
            : entry.checkIn.note,
        style: Theme.of(context).textTheme.bodyLarge?.copyWith(height: 1.4),
        maxLines: 3,
        overflow: TextOverflow.ellipsis,
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      subtitle: Padding(
        padding: const EdgeInsets.only(top: 6),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              [entry.localTime, ?visibility].join(' · '),
              style: Theme.of(context).textTheme.labelMedium,
            ),
            const SizedBox(height: 4),
            Wrap(
              spacing: 10,
              runSpacing: 4,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                if (entry.checkIn.note.isNotEmpty && entry.checkIn.mood != null)
                  Text(entry.checkIn.mood!),
                if (entry.checkIn.activity case final activity?) Text(activity),
                if (entry.checkIn.weather != null)
                  Tooltip(
                    message: context.tr('Weather saved', '已保存天气'),
                    child: Icon(Icons.cloud_outlined, size: 16),
                  ),
                if (entry.checkIn.location != null)
                  Tooltip(
                    message: context.tr('Location saved', '已保存位置'),
                    child: Icon(Icons.location_on_outlined, size: 16),
                  ),
              ],
            ),
          ],
        ),
      ),
      trailing: const Icon(Icons.chevron_right),
    );
  }
}

final class _Message extends StatelessWidget {
  const _Message({
    super.key,
    required this.icon,
    required this.title,
    this.action,
  });

  final IconData icon;
  final String title;
  final Widget? action;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 32),
          const SizedBox(height: 12),
          Text(title, textAlign: TextAlign.center),
          if (action != null) ...[const SizedBox(height: 16), action!],
        ],
      ),
    ),
  );
}

/// Counts come from the complete month query, never from loaded History pages.
final class _RecordedDayNavigation extends ConsumerWidget {
  const _RecordedDayNavigation({required this.state, required this.onSelect});
  final CheckInHistoryState state;
  final ValueChanged<DateTime> onSelect;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selected = state.selectedDate!;
    final date =
        '${selected.year.toString().padLeft(4, '0')}-'
        '${selected.month.toString().padLeft(2, '0')}-'
        '${selected.day.toString().padLeft(2, '0')}';
    final query = (month: date.substring(0, 7), zone: state.ianaZone!);
    final result = ref.watch(checkInMonthProvider(query));
    if (result.isLoading) return LinearProgressIndicator();
    if (result.value case Success<CheckInMonth>(:final value)) {
      final days =
          value.counts.entries
              .where(
                (entry) => entry.value > 0 && entry.key.startsWith(query.month),
              )
              .map((entry) => entry.key)
              .toList()
            ..sort();
      final earlier = days.where((day) => day.compareTo(date) < 0).lastOrNull;
      final later = days.where((day) => day.compareTo(date) > 0).firstOrNull;
      final enabled = state.phase != CheckInHistoryPhase.loading;
      return Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              context.tr(
                'Recorded days · ${query.month}',
                '${query.month} · 有记录的日期',
              ),
              style: Theme.of(context).textTheme.labelMedium,
            ),
            Wrap(
              spacing: 8,
              runSpacing: 4,
              children: [
                TextButton.icon(
                  key: const Key('history-previous-recorded-day'),
                  onPressed: enabled && earlier != null
                      ? () => onSelect(DateTime.parse(earlier))
                      : null,
                  icon: const Icon(Icons.chevron_left),
                  label: Text(context.tr('Earlier day', '前一个记录日')),
                ),
                TextButton.icon(
                  key: const Key('history-next-recorded-day'),
                  onPressed: enabled && later != null
                      ? () => onSelect(DateTime.parse(later))
                      : null,
                  icon: const Icon(Icons.chevron_right),
                  label: Text(context.tr('Later day', '后一个记录日')),
                ),
              ],
            ),
            if (days.isEmpty)
              Text(context.tr('No recorded days in this month.', '本月没有签到记录。')),
          ],
        ),
      );
    }
    return TextButton.icon(
      onPressed: () => ref.invalidate(checkInMonthProvider(query)),
      icon: const Icon(Icons.refresh),
      label: Text(context.tr('Reload recorded days', '重新加载记录日期')),
    );
  }
}
