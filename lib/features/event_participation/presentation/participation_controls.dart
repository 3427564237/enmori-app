import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

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
    final enabled =
        value != null && entry?.busy != true && entry?.uncertain != true;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          value == null
              ? 'Participation not loaded.'
              : 'Your participation: ${value.status.name}${value.ignored ? ' · recommendation ignored' : ''}',
        ),
        if (entry?.busy == true) const Text('Loading participation…'),
        if (entry?.failure case final failure?) Text(failure.message),
        if (entry?.uncertain == true)
          const Text('Read current participation before another change.'),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            FilledButton(
              onPressed: enabled
                  ? () => controller.change(
                      widget.eventId,
                      ParticipationStatus.interested,
                      false,
                    )
                  : null,
              child: const Text('Interested'),
            ),
            FilledButton(
              onPressed: enabled
                  ? () => controller.change(
                      widget.eventId,
                      ParticipationStatus.going,
                      false,
                    )
                  : null,
              child: const Text('Going'),
            ),
            TextButton(
              onPressed: enabled && value.status != ParticipationStatus.none
                  ? () => controller.change(
                      widget.eventId,
                      ParticipationStatus.none,
                      value.ignored,
                    )
                  : null,
              child: const Text('Cancel participation'),
            ),
            OutlinedButton(
              onPressed: enabled
                  ? () => controller.change(
                      widget.eventId,
                      value.status,
                      !value.ignored,
                    )
                  : null,
              child: Text(
                value?.ignored == true
                    ? 'Restore recommendation'
                    : 'Ignore recommendation',
              ),
            ),
            TextButton(
              onPressed: entry?.busy == true
                  ? null
                  : () => controller.load(widget.eventId),
              child: const Text('Read participation'),
            ),
          ],
        ),
      ],
    );
  }
}
