import 'dart:async';

import '../check_in_providers.dart';
import '../domain/check_in_calendar_repository.dart';
import 'check_in_calendar_page.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../../account/domain/account_repository.dart';
import 'check_in_history_controller.dart';

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
    final selection = await Navigator.of(context).push<CalendarSelection>(
      MaterialPageRoute(
        builder: (_) => CheckInCalendarPage(
          initialDate: current.selectedDate!,
          latestDate: current.latestDate!,
          timeZone: current.ianaZone!,
        ),
      ),
    );
    if (!mounted || selection == null) return;
    await controller.selectDate(selection.date);
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
        const SnackBar(
          content: Text('This record could not be located. Reload the date.'),
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
          duration: const Duration(milliseconds: 200),
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
          tooltip: 'Back',
          onPressed: widget.onBack,
          icon: const Icon(Icons.arrow_back),
        ),
        title: const Text('Check-in History'),
        actions: [
          if (ref.watch(checkInRepositoryProvider) is CheckInCalendarRepository)
            IconButton(
              key: const Key('history-month-calendar'),
              tooltip: 'Month calendar',
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
            tooltip: 'Reload',
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
                          ? 'Choose date'
                          : MaterialLocalizations.of(context)
                                .formatFullDate(state.selectedDate!),
                    ),
                  ),
                  if (state.ianaZone case final zone?)
                    Text(
                      'Local time · $zone',
                      key: const Key('history-device-zone'),
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                ],
              ),
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
                      const Text(
                        'The next page is unavailable. Your current records '
                        'are still shown.',
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
                            ? 'Loading…'
                            : state.nextPageFailure == null
                            ? 'Next'
                            : 'Retry next page',
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
      helpText: 'Choose a Check-in date',
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
      CheckInHistoryPhase.signedOut => const _Message(
        key: Key('history-session-required'),
        icon: Icons.lock_outline,
        title: 'Sign in to view your Check-ins',
        action: null,
      ),
      CheckInHistoryPhase.loading => const Center(
        key: Key('history-loading'),
        child: CircularProgressIndicator(),
      ),
      CheckInHistoryPhase.failed => _Message(
        key: const Key('history-error'),
        icon: Icons.sync_problem,
        title: switch (state.failure?.kind) {
          AppFailureKind.authRequired =>
            'Sign in again to view your Check-ins.',
          AppFailureKind.authForbidden =>
            'This account cannot view these Check-ins.',
          _ => 'History is unavailable.',
        },
        action: FilledButton.icon(
          key: const Key('history-retry'),
          onPressed: onRetry,
          icon: const Icon(Icons.refresh),
          label: const Text('Retry'),
        ),
      ),
      CheckInHistoryPhase.ready when state.entries.isEmpty => const _Message(
        key: Key('history-empty'),
        icon: Icons.event_busy_outlined,
        title: 'No Check-ins for this date.',
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
      CheckInVisibility.private => 'Private',
      CheckInVisibility.friendsOnly => 'Friends-only',
      CheckInVisibility.public => 'Public',
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
                  const Tooltip(
                    message: 'Weather saved',
                    child: Icon(Icons.cloud_outlined, size: 16),
                  ),
                if (entry.checkIn.location != null)
                  const Tooltip(
                    message: 'Location saved',
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
