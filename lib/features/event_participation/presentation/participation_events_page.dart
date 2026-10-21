import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_motion.dart';
import '../../../core/presentation/status_panel.dart';

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
            if (state.busy)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 12),
                child: LinearProgressIndicator(
                  semanticsLabel: 'Loading events',
                ),
              ),
            if (state.failure case final failure?)
              StatusPanel(
                title: value == null
                    ? 'Events unavailable'
                    : 'More events couldn’t be loaded',
                body: value == null
                    ? failure.message
                    : '${failure.message} Your current events are still shown.',
                icon: Icons.cloud_off_outlined,
                isError: true,
              ),
            if (value != null) ...[
              if (categories.isNotEmpty)
                Wrap(
                  spacing: 8,
                  children: [
                    ChoiceChip(
                      chipAnimationStyle: EnmoriMotion.chips(context),
                      label: const Text('All categories'),
                      selected: _category == null,
                      onSelected: (_) => setState(() => _category = null),
                    ),
                    for (final c in categories)
                      ChoiceChip(
                        chipAnimationStyle: EnmoriMotion.chips(context),
                        label: Text(c),
                        selected: _category == c,
                        onSelected: (_) => setState(() => _category = c),
                      ),
                  ],
                ),
              if (items.isEmpty)
                const Text(
                  'No events in this available selection. Check again later.',
                ),
              for (final item in items.where(
                (s) => _category == null || s.categoryLabel == _category,
              )) ...[
                EventCard.summary(
                  key: ValueKey(item.eventId ?? item.browseId),
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
                        ? 'Load more events'
                        : 'Try loading more again',
                  ),
                )
              else
                const Text('You’ve reached the end of the available events.'),
            ] else if (!state.busy && state.failure == null)
              const StatusPanel(
                title: 'Refresh your events',
                body: 'This view has expired or was cleared. Reload to see current events.',
                icon: Icons.event_outlined,
              ),
            if (value == null)
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
