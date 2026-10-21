import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/auth_providers.dart';
import '../participation_providers.dart';
import '../domain/participation_repository.dart';
import 'participation_controller.dart';

final class ParticipationControls extends ConsumerStatefulWidget {
  const ParticipationControls({required this.eventId, super.key});
  final String eventId;
  @override
  ConsumerState<ParticipationControls> createState() =>
      _ParticipationControlsState();
}

final class _ParticipationControlsState
    extends ConsumerState<ParticipationControls> {
  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() => WidgetsBinding.instance.addPostFrameCallback((_) {
    if (mounted) {
      ref.read(participationControllerProvider.notifier).load(widget.eventId);
    }
  });
  @override
  void didUpdateWidget(ParticipationControls old) {
    super.didUpdateWidget(old);
    if (old.eventId != widget.eventId) _load();
  }

  @override
  Widget build(BuildContext context) {
    final entry = ref.watch(participationControllerProvider)[widget.eventId],
        value = entry?.value;
    final controller = ref.read(participationControllerProvider.notifier);
    final renderedSession = participationSession(
      ref.watch(authSessionProvider),
    );
    final enabled =
        value != null && entry?.busy != true && entry?.uncertain != true;
    void change(ParticipationStatus status, bool ignored) {
      if (value == null) return;
      controller.changeRendered(
        widget.eventId,
        status,
        ignored,
        renderedSession: renderedSession,
        expected: value,
      );
    }

    final busy = entry?.busy == true;
    final needsRead =
        value == null || entry?.uncertain == true || entry?.failure != null;
    Widget planButton(ParticipationStatus status, String label, IconData icon) {
      final selected = value?.status == status;
      final action = enabled ? () => change(status, false) : null;
      return Semantics(
        selected: selected,
        child: selected
            ? FilledButton.tonalIcon(
                onPressed: action,
                icon: Icon(Icons.check, size: 18),
                label: Text(label),
              )
            : OutlinedButton.icon(
                onPressed: action,
                icon: Icon(icon, size: 18),
                label: Text(label),
              ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            planButton(
              ParticipationStatus.interested,
              'Interested',
              Icons.star_outline,
            ),
            planButton(
              ParticipationStatus.going,
              'Going',
              Icons.event_available_outlined,
            ),
            PopupMenuButton<VoidCallback>(
              tooltip: 'More event options',
              enabled: !busy && entry?.uncertain != true && value != null,
              // Execute the closure captured when this menu was rendered, not
              // a fresh session/revision observed while the menu was open.
              onSelected: (action) => action(),
              itemBuilder: (_) => [
                if (value != null && value.status != ParticipationStatus.none)
                  PopupMenuItem(
                    value: () =>
                        change(ParticipationStatus.none, value.ignored),
                    child: const Text('Cancel participation'),
                  ),
                if (value != null)
                  PopupMenuItem(
                    value: () => change(value.status, !value.ignored),
                    child: Text(
                      value.ignored
                          ? 'Restore recommendation'
                          : 'Ignore recommendation',
                    ),
                  ),
                PopupMenuItem(
                  value: () => controller.load(widget.eventId),
                  child: const Text('Refresh plans'),
                ),
              ],
            ),
          ],
        ),
        if (value?.ignored == true)
          const Padding(
            padding: EdgeInsets.only(top: 4),
            child: Text('Hidden from recommendations'),
          ),
        if (busy)
          Semantics(
            liveRegion: true,
            child: const Text('Checking your plans…'),
          ),
        if (entry?.failure case final failure?)
          Semantics(liveRegion: true, child: Text(failure.message)),
        if (entry?.uncertain == true)
          const Padding(
            padding: EdgeInsets.only(top: 4),
            child: Text(
              'Change not confirmed. Check your plans before making another change.',
            ),
          ),
        if (needsRead && !busy)
          TextButton.icon(
            onPressed: () => controller.load(widget.eventId),
            icon: const Icon(Icons.refresh, size: 18),
            label: Text(
              entry?.uncertain == true
                  ? 'Check current plans'
                  : 'Load your plans',
            ),
          ),
      ],
    );
  }
}
