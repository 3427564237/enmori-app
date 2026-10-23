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
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Semantics(
                      header: true,
                      child: Text(
                        context.tr('Your day so far', '今天的记录'),
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                    ),
                  ),
                  IconButton(
                    key: const Key('home-today-refresh'),
                    tooltip: context.tr('Refresh today’s Check-ins', '刷新今天的签到'),
                    onPressed: _opening
                        ? null
                        : () => ref.invalidate(homeTodayProvider),
                    icon: const Icon(Icons.refresh),
                  ),
                ],
              ),
              Text(
                '${MaterialLocalizations.of(context).formatMediumDate(snapshot.date!)} · ${snapshot.timeZone}',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 8),
              if (snapshot.entries.isEmpty)
                Text(
                  snapshot.hasMore
                      ? context.tr(
                          'No entries on this page. Open history to continue reading.',
                          '当前页没有记录，可打开签到记录继续查看。',
                        )
                      : context.tr(
                          'No saved Check-ins for this day yet. Use New Check-in above to record a moment.',
                          '这一天还没有已保存的签到。点击上方“新建签到”，记下此刻。',
                        ),
                ),
              for (final entry in snapshot.entries)
                ListTile(
                  key: ValueKey('home-today-${entry.checkIn.checkInId}'),
                  contentPadding: EdgeInsets.zero,
                  title: Text(
                    entry.checkIn.note.isNotEmpty
                        ? entry.checkIn.note
                        : context.tr('Mood Check-in', '心情签到'),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  subtitle: Text(
                    [
                      entry.localTime,
                      if (entry.checkIn.mood?.isNotEmpty == true)
                        entry.checkIn.mood!,
                    ].join(' · '),
                  ),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: _opening
                      ? null
                      : () => _open(
                          snapshot,
                          () => widget.onOpenCheckIn(entry.checkIn.checkInId),
                        ),
                ),
              if (snapshot.hasMore) ...[
                const SizedBox(height: 8),
                Text(
                  context.tr(
                    'Showing up to 3 from this day. Open history for more.',
                    '这里只展示当天最多 3 条记录，可在签到记录中查看其余内容。',
                  ),
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
              Align(
                alignment: AlignmentDirectional.centerStart,
                child: TextButton(
                  key: const Key('home-today-history'),
                  onPressed: _opening
                      ? null
                      : () => _open(snapshot, widget.onOpenHistory),
                  child: Text(context.tr('Open Check-in history', '打开签到记录')),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
