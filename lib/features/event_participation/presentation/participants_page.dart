import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'participation_controller.dart';

final class EventParticipantsPage extends ConsumerStatefulWidget {
  const EventParticipantsPage({
    required this.selection,
    required this.onProfile,
    super.key,
  });
  final ParticipantSelection selection;
  final ValueChanged<String>
  onProfile; // canonical Username, never UID/accountId
  @override
  ConsumerState<EventParticipantsPage> createState() =>
      _EventParticipantsPageState();
}

final class _EventParticipantsPageState
    extends ConsumerState<EventParticipantsPage>
    with WidgetsBindingObserver {
  bool _retryNext = false;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        ref
            .read(participantsControllerProvider(widget.selection).notifier)
            .load();
      }
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed && mounted) {
      ref
          .read(participantsControllerProvider(widget.selection).notifier)
          .clear();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(participantsControllerProvider(widget.selection));
    final controller = ref.read(
      participantsControllerProvider(widget.selection).notifier,
    );
    final page = state.page;
    return Scaffold(
      appBar: AppBar(
        title: Text(
          '${widget.selection.status.name} · ${widget.selection.group.name}',
        ),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            if (state.busy) const Text('Loading authorized participants…'),
            if (state.failure case final failure?) Text(failure.message),
            if (page != null && state.failure == null && !state.busy) ...[
              Text(
                page.visibleCount == null
                    ? 'Visible participant count unavailable.'
                    : '${page.visibleCount} visible participants',
              ),
              if (page.items.isEmpty)
                Text(
                  page.nextCursor == null
                      ? 'No visible participants on this page.'
                      : 'No visible participants on this page. More pages are available.',
                ),
              for (final item in page.items)
                ListTile(
                  title: Text(item.displayName ?? item.username),
                  subtitle: item.displayName == null
                      ? null
                      : Text('@${item.username}'),
                  onTap: state.busy
                      ? null
                      : () {
                          // A queued tap must still belong to this exact freshly authorized page.
                          final current = ref.read(
                            participantsControllerProvider(widget.selection),
                          );
                          if (!current.busy &&
                              current.failure == null &&
                              identical(current.page, page)) {
                            widget.onProfile(item.username);
                          }
                        },
                ),
              if (page.nextCursor != null)
                OutlinedButton(
                  onPressed: state.busy
                      ? null
                      : () {
                          _retryNext = true;
                          controller.load(more: true);
                        },
                  child: const Text('Next page'),
                ),
            ],
            if (state.failure != null)
              FilledButton(
                onPressed: state.busy
                    ? null
                    : () => controller.load(more: _retryNext),
                child: const Text('Retry same page'),
              ),
            TextButton(
              onPressed: state.busy
                  ? null
                  : () {
                      _retryNext = false;
                      controller.load();
                    },
              child: const Text('Reload participants'),
            ),
          ],
        ),
      ),
    );
  }
}
