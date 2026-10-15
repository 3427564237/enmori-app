import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../domain/activity_repository.dart';
import 'activity_controller.dart';

/// LI supplies route/session guards and list navigation. Never remaps /events.
final class ActivityPage extends ConsumerStatefulWidget {
  const ActivityPage({this.browseId = '', this.onSelect, super.key});
  final String browseId;
  final ValueChanged<String>? onSelect;
  @override
  ConsumerState<ActivityPage> createState() => _ActivityPageState();
}

final class _ActivityPageState extends ConsumerState<ActivityPage>
    with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        ref.read(activityControllerProvider(widget.browseId).notifier).load();
      }
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed) {
      ref.read(activityControllerProvider(widget.browseId).notifier).clear();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  Future<void> _action(bool open) async {
    final notice = await ref
        .read(activityControllerProvider(widget.browseId).notifier)
        .sourceAction(open: open);
    if (mounted && notice != null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(notice)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(activityControllerProvider(widget.browseId));
    final controller = ref.read(
      activityControllerProvider(widget.browseId).notifier,
    );
    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.browseId.isEmpty ? 'Browse activities' : 'Activity details',
        ),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            if (widget.browseId.isEmpty)
              const Text(
                'Showing eligible activities from the first source batch; this is not the full catalogue.',
              ),
            const Text('Source: Ticketmaster'),
            const SizedBox(height: 16),
            switch (state) {
              AsyncLoading<ActivityRead?>() => Semantics(
                liveRegion: true,
                child: const Text('Loading activities…'),
              ),
              AsyncError<ActivityRead?>(:final error) => Text(
                error is AppFailure
                    ? error.message
                    : 'Activities are unavailable. Try again.',
              ),
              AsyncData<ActivityRead?>(value: ActivityBatch(:final items)) =>
                Column(
                  children: [
                    if (items.isEmpty)
                      const Text(
                        'No eligible activities were found in this source batch.',
                      ),
                    for (final item in items)
                      Card(
                        child: ListTile(
                          title: Text(item.title),
                          subtitle: Text(
                            '${item.startAt}\n${item.endAt ?? 'End time unavailable.'}',
                          ),
                          onTap: widget.onSelect == null
                              ? null
                              : () => widget.onSelect!(item.browseId),
                        ),
                      ),
                  ],
                ),
              AsyncData<ActivityRead?>(
                value: ActivityDetail(
                  :final summary,
                  :final locationLabel,
                  :final categoryLabel,
                ),
              ) =>
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      summary.title,
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    Text('Starts: ${summary.startAt}'),
                    Text(
                      summary.endAt == null
                          ? 'End time unavailable.'
                          : 'Ends: ${summary.endAt}',
                    ),
                    Text(locationLabel ?? 'Location unavailable.'),
                    Text(categoryLabel ?? 'Category unavailable.'),
                    const Text('Description unavailable.'),
                    FilledButton(
                      onPressed: () => _action(true),
                      child: const Text('View on Ticketmaster'),
                    ),
                    TextButton(
                      onPressed: () => _action(false),
                      child: const Text('Copy source link'),
                    ),
                  ],
                ),
              _ => const Text('Reload activities to continue.'),
            },
            const SizedBox(height: 16),
            if (!state.isLoading)
              OutlinedButton(
                onPressed: controller.load,
                child: Text(state.hasError ? 'Retry' : 'Reload'),
              ),
          ],
        ),
      ),
    );
  }
}
