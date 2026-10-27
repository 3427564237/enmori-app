import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../../../core/result/result.dart';
import '../../account/content_access.dart';
import '../../auth/auth_providers.dart';
import '../domain/event_detail_repository.dart';
import '../recent_events_provider.dart';
import 'event_detail_controller.dart';

final class RecentEventsPage extends ConsumerWidget {
  const RecentEventsPage({required this.onSelect, super.key});
  final ValueChanged<String> onSelect;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ids = ref.watch(recentEventsProvider);
    final allowed =
        ref.watch(currentAuthSubjectProvider) != null &&
        ref.watch(contentAccessProvider).foreground;
    return Scaffold(
      appBar: AppBar(title: Text(context.tr('Recently viewed', '最近浏览'))),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(
              context.tr(
                'Up to 20 events from this sign-in session. Details are checked again.',
                '保留本次登录会话最近浏览的最多 20 个活动，重新核对详情。',
              ),
            ),
            TextButton(
              key: const Key('recent-events-clear'),
              onPressed: ids.isEmpty
                  ? null
                  : ref.read(recentEventsProvider.notifier).clear,
              child: Text(context.tr('Clear recent events', '清空最近浏览')),
            ),
            if (ids.isEmpty)
              Text(context.tr('No recently viewed events.', '暂无最近浏览的活动。')),
            if (allowed)
              for (final id in ids)
                _RecentEvent(key: ValueKey(id), id: id, onSelect: onSelect),
          ],
        ),
      ),
    );
  }
}

final class _RecentEvent extends ConsumerStatefulWidget {
  const _RecentEvent({required this.id, required this.onSelect, super.key});
  final String id;
  final ValueChanged<String> onSelect;
  @override
  ConsumerState<_RecentEvent> createState() => _RecentEventState();
}

final class _RecentEventState extends ConsumerState<_RecentEvent> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        ref.read(eventDetailControllerProvider(widget.id).notifier).load();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(eventDetailControllerProvider(widget.id));
    return switch (state) {
      AsyncData<EventDetail>(:final value) => ListTile(
        title: Text(value.title),
        subtitle: Text(
          value.locationLabel ?? context.tr('Place unavailable', '地点未提供'),
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => widget.onSelect(widget.id),
      ),
      AsyncError<EventDetail>(:final error) => ListTile(
        title: Text(context.tr('Event could not be read', '暂时无法读取活动')),
        subtitle: Text(
          error is AppFailure
              ? localizedFailure(context, error)
              : context.tr('Try again.', '请重试。'),
        ),
        trailing: IconButton(
          tooltip: context.tr('Retry', '重试'),
          onPressed: () => ref
              .read(eventDetailControllerProvider(widget.id).notifier)
              .load(),
          icon: const Icon(Icons.refresh),
        ),
      ),
      _ => ListTile(title: Text(context.tr('Checking event…', '正在核对活动…'))),
    };
  }
}
