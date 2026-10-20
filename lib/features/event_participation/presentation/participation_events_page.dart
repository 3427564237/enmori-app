import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../event_browse/domain/activity_repository.dart';
import 'event_batches_controller.dart';
import 'event_card.dart';
import 'participation_controls.dart';

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
      appBar: AppBar(title: const Text('Events')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            const Text(
              'Source: Ticketmaster · current eligible batches, not the full catalogue. ENMORI sends the activity request and server connection information, not your sign-in token, profile or private content. Category labels are source labels, not new interest mappings.',
            ),
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
                if (item.eventId case final id?)
                  ParticipationControls(key: ValueKey('list-$id'), eventId: id)
                else
                  const Text(
                    'Participation unavailable: this source view has no stable Event ID.',
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
            const Text(
              'Source views expire after five minutes and clear in the background. Opening the source website is not registration or payment.',
            ),
          ],
        ),
      ),
    );
  }
}
