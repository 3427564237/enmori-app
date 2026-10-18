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

final class CheckInHistoryPage extends ConsumerWidget {
  const CheckInHistoryPage({
    required this.onBack,
    required this.onOpenSavedCheckIn,
    super.key,
  });

  final VoidCallback onBack;
  final ValueChanged<String> onOpenSavedCheckIn;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(checkInHistoryControllerProvider);
    final controller = ref.read(checkInHistoryControllerProvider.notifier);
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          tooltip: 'Back',
          onPressed: onBack,
          icon: const Icon(Icons.arrow_back),
        ),
        title: const Text('Footprint'),
        actions: [
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
                  OutlinedButton.icon(
                    key: const Key('history-select-date'),
                    onPressed:
                        state.latestDate == null ||
                            state.phase == CheckInHistoryPhase.loading
                        ? null
                        : () => _selectDate(context, controller, state),
                    icon: const Icon(Icons.calendar_today_outlined),
                    label: Text(_dateLabel(state.selectedDate)),
                  ),
                  if (state.ianaZone case final zone?)
                    Text(
                      'Device time zone: $zone',
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
                onOpen: onOpenSavedCheckIn,
                onRetry: controller.reload,
              ),
            ),
            if (state.phase == CheckInHistoryPhase.ready &&
                state.nextCursor != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                child: FilledButton.tonalIcon(
                  key: const Key('history-next-page'),
                  onPressed: controller.loadNext,
                  icon: const Icon(Icons.navigate_next),
                  label: const Text('Next'),
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

  String _dateLabel(DateTime? date) {
    if (date == null) return 'Choose date';
    return '${date.year.toString().padLeft(4, '0')}-'
        '${date.month.toString().padLeft(2, '0')}-'
        '${date.day.toString().padLeft(2, '0')}';
  }
}

final class _HistoryBody extends StatelessWidget {
  const _HistoryBody({
    required this.state,
    required this.onOpen,
    required this.onRetry,
  });

  final CheckInHistoryState state;
  final ValueChanged<String> onOpen;
  final VoidCallback onRetry;

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
      CheckInHistoryPhase.ready => ListView.separated(
        key: const Key('history-list'),
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: state.entries.length,
        separatorBuilder: (_, _) => const Divider(height: 1, indent: 72),
        itemBuilder: (context, index) => _HistoryTile(
          entry: state.entries[index],
          onTap: () => onOpen(state.entries[index].checkIn.checkInId),
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
      leading: const Icon(Icons.edit_note_outlined),
      title: Text(
        entry.checkIn.note,
        maxLines: 3,
        overflow: TextOverflow.ellipsis,
      ),
      subtitle: Text(
        visibility == null
            ? entry.localTime
            : '${entry.localTime} · $visibility',
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
      padding: const EdgeInsets.all(24),
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
