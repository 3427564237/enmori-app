import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../event_browse/domain/activity_repository.dart';
import 'event_batches_controller.dart';
import 'event_card.dart';

/// Explicit next source batches, with display-only categories and stable dedupe.
final class ParticipationEventsPage extends ConsumerStatefulWidget {
  const ParticipationEventsPage({required this.onSelect, super.key});
  final ValueChanged<String> onSelect;
  @override
  ConsumerState<ParticipationEventsPage> createState() =>
      _ParticipationEventsPageState();
}

final class _ParticipationEventsPageState
    extends ConsumerState<ParticipationEventsPage>
    with WidgetsBindingObserver {
  String? _category;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) ref.read(eventBatchesProvider.notifier).load();
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed && mounted) {
      ref.read(eventBatchesProvider.notifier).clear();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(eventBatchesProvider),
        controller = ref.read(eventBatchesProvider.notifier);
    final value = state.batch;
    final items = value?.items ?? const <ActivitySummary>[];
    final categories =
        items.map((s) => s.categoryLabel).whereType<String>().toSet().toList()
          ..sort();
    if (_category != null && !categories.contains(_category)) _category = null;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Events'),
        actions: [
          IconButton(
            tooltip: 'Refresh events',
            onPressed: state.busy ? null : controller.load,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text('Browse current events from Ticketmaster.'),
            const SizedBox(height: 16),
            if (state.busy) const Text('Loading activities…'),
            if (state.failure case final failure?) Text(failure.message),
            if (value != null) ...[
              if (categories.isNotEmpty)
                Wrap(
                  spacing: 8,
                  children: [
                    ChoiceChip(
                      label: const Text('All categories'),
                      selected: _category == null,
                      onSelected: (_) => setState(() => _category = null),
                    ),
                    for (final c in categories)
                      ChoiceChip(
                        label: Text(c),
                        selected: _category == c,
                        onSelected: (_) => setState(() => _category = c),
                      ),
                  ],
                ),
              if (items.isEmpty)
                const Text(
                  'No eligible activities were found in this source batch.',
                ),
              for (final item in items.where(
                (s) => _category == null || s.categoryLabel == _category,
              )) ...[
                EventCard.summary(
                  summary: item,
                  onSelect: (id) {
                    if (controller.isCurrentSnapshot(state)) {
                      widget.onSelect(id);
                    }
                  },
                ),
              ],
              if (value.nextCursor != null)
                TextButton(
                  onPressed: state.busy ? null : controller.next,
                  child: Text(
                    state.failure == null
                        ? 'Get next batch'
                        : 'Retry next batch',
                  ),
                )
              else
                const Text(
                  'No more activities in this available source window.',
                ),
            ] else if (!state.busy && state.failure == null)
              const Text('Reload to request current activities.'),
            TextButton(
              onPressed: state.busy ? null : controller.load,
              child: Text(
                value == null && state.failure != null ? 'Retry' : 'Reload',
              ),
            ),
            const ExpansionTile(
              title: Text('About these events'),
              children: [
                Padding(
                  padding: EdgeInsets.fromLTRB(16, 0, 16, 16),
                  child: Text(
                    'Ticketmaster supplies this available selection, not its full catalogue. ENMORI sends the activity request and server connection information, not your sign-in token, profile or private content. Category labels are source labels, not new interest mappings. Views expire after five minutes. Opening the source website does not register or pay for an event.',
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
