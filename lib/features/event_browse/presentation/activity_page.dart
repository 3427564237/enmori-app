import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../domain/activity_repository.dart';
import 'activity_controller.dart';

const _listDisclosure =
    'Source: Ticketmaster. Activity requests pass through ENMORI to Ticketmaster. '
    'Your ENMORI sign-in token, profile, Check-ins, Personas and AI messages are '
    'not shared with Ticketmaster. Ticketmaster receives the activity request '
    'and server connection information.';
const _sourceActionDisclosure =
    '“View on Ticketmaster” opens the source page in your browser. Your browser '
    'connects directly to Ticketmaster; its privacy and cookie policies apply. '
    'Opening or copying a link does not register you or mark you as Going. '
    "A copied link can remain on your device's clipboard.";
const _lifetimeDisclosure =
    "This activity view stays in ENMORI's memory for at most five minutes and "
    'clears when the app goes into the background or you sign out. Reload to '
    'request current information.';

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
                            '${item.startAt}\n${item.endAt ?? 'End time not provided.'}',
                          ),
                          onTap: widget.onSelect == null
                              ? null
                              : () {
                                  if (controller.isCurrentSnapshot(state)) {
                                    widget.onSelect!(item.browseId);
                                  }
                                },
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
                          ? 'End time not provided.'
                          : 'Ends: ${summary.endAt}',
                    ),
                    Text(locationLabel ?? 'Location unavailable.'),
                    Text(categoryLabel ?? 'Category unavailable.'),
                    const Text('Description unavailable.'),
                    const SizedBox(height: 16),
                    const Text(_sourceActionDisclosure),
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
            const SizedBox(height: 16),
            if (widget.browseId.isEmpty) ...[
              const Text(_listDisclosure),
              const SizedBox(height: 12),
            ],
            const Text(_lifetimeDisclosure),
          ],
        ),
      ),
    );
  }
}
