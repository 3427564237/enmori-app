import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/presentation/enmori_localizations.dart';
import '../core/presentation/status_panel.dart';
import '../features/account/content_access.dart';
import '../features/auth/auth_providers.dart';
import '../features/auth/domain/auth_repository.dart';
import 'home_today_provider.dart';

/// Navigation is supplied by the guarded composition root. This section only
/// reads the owner's day; editing and new drafts remain Journal-owned flows.
final class HomeTodaySection extends ConsumerStatefulWidget {
  const HomeTodaySection({
    required this.onOpenCheckIn,
    required this.onOpenHistory,
    super.key,
  });
  final Future<void> Function(String) onOpenCheckIn;
  final Future<void> Function() onOpenHistory;

  @override
  ConsumerState<HomeTodaySection> createState() => _HomeTodaySectionState();
}

final class _HomeTodaySectionState extends ConsumerState<HomeTodaySection> {
  bool _opening = false;

  Future<void> _open(
    HomeTodaySnapshot snapshot,
    Future<void> Function() action,
  ) async {
    final session = ref.read(authSessionProvider).asData?.value;
    final state = ref.read(homeTodayProvider);
    if (_opening ||
        session is! AuthSessionAuthenticated ||
        !ref.read(contentAccessProvider).foreground ||
        state.isLoading ||
        !identical(state.asData?.value, snapshot)) {
      return;
    }
    setState(() => _opening = true);
    try {
      await action();
    } finally {
      if (mounted) {
        setState(() => _opening = false);
        if (identical(session, ref.read(authSessionProvider).asData?.value) &&
            ref.read(contentAccessProvider).foreground) {
          ref.invalidate(homeTodayProvider);
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(authSessionProvider).asData?.value;
    final access = ref.watch(contentAccessProvider);
    final state = ref.watch(homeTodayProvider);
    if (session is! AuthSessionAuthenticated || !access.foreground) {
      return const SizedBox.shrink();
    }
    // Loading may carry a previous AsyncData value. Never render it as today's
    // facts during an authority/day/content refresh, including failed rereads.
    if (state.isLoading) {
      return Padding(
        padding: const EdgeInsets.only(top: 16),
        child: Semantics(
          liveRegion: true,
          child: Text(context.tr('Reading today’s Check-ins…', '正在读取今天的签到…')),
        ),
      );
    }
    final snapshot = state.asData?.value;
    if (state.hasError || snapshot?.failure != null) {
      return Padding(
        padding: const EdgeInsets.only(top: 16),
        child: StatusPanel(
          key: const Key('home-today-failure'),
          title: context.tr('Today’s Check-ins unavailable', '暂时无法读取今天的签到'),
          body: snapshot?.failure == null
              ? context.tr('Please try again.', '请重试。')
              : localizedFailure(context, snapshot!.failure!),
          icon: Icons.history_outlined,
          isError: true,
          action: TextButton(
            key: const Key('home-today-retry'),
            onPressed: () => ref.invalidate(homeTodayProvider),
            child: Text(context.tr('Try again', '重试')),
          ),
        ),
      );
    }
    if (snapshot == null || snapshot.date == null) {
      return const SizedBox.shrink();
    }
    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: Card(
        key: const Key('home-today-summary'),
        margin: EdgeInsets.zero,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Wrap(
                alignment: WrapAlignment.spaceBetween,
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: 8,
                children: [
                  Tooltip(
                    message:
                        '${MaterialLocalizations.of(context).formatFullDate(snapshot.date!)} · ${snapshot.timeZone}',
                    child: Semantics(
                      header: true,
                      child: Text(
                        context.tr('Your day so far', '今天的记录'),
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                    ),
                  ),
                  Wrap(
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      TextButton(
                        key: const Key('home-today-history'),
                        onPressed: _opening
                            ? null
                            : () => _open(snapshot, widget.onOpenHistory),
                        child: Text(context.tr('History', '历史记录')),
                      ),
                      IconButton(
                        key: const Key('home-today-refresh'),
                        tooltip: context.tr(
                          'Refresh today’s Check-ins',
                          '刷新今天的签到',
                        ),
                        onPressed: _opening
                            ? null
                            : () => ref.invalidate(homeTodayProvider),
                        icon: const Icon(Icons.refresh),
                      ),
                    ],
                  ),
                ],
              ),
              if (snapshot.entries.isEmpty)
                Text(
                  snapshot.hasMore
                      ? context.tr(
                          'No entries on this page. Open history for more.',
                          '当前页没有记录，可在历史记录中继续查看。',
                        )
                      : context.tr(
                          'No saved Check-ins today. Record a moment above.',
                          '今天还没有签到，在上方记下此刻吧。',
                        ),
                ),
              for (final entry in snapshot.entries)
                ListTile(
                  key: ValueKey('home-today-${entry.checkIn.checkInId}'),
                  contentPadding: EdgeInsets.zero,
                  minVerticalPadding: 4,
                  visualDensity: VisualDensity.compact,
                  title: Text(
                    entry.checkIn.note.isNotEmpty
                        ? entry.checkIn.note
                        : context.tr('Mood Check-in', '心情签到'),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  subtitle: Text(
                    [
                      entry.localTime,
                      if (entry.checkIn.mood?.isNotEmpty == true)
                        entry.checkIn.mood!,
                    ].join(' · '),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: _opening
                      ? null
                      : () => _open(
                          snapshot,
                          () => widget.onOpenCheckIn(entry.checkIn.checkInId),
                        ),
                ),
              if (snapshot.hasMore && snapshot.entries.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  context.tr(
                    'Showing up to 3. Open history for more.',
                    '这里最多显示 3 条，其余可在历史记录中查看。',
                  ),
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
