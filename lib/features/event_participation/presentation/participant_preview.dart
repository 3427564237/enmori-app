import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../domain/participation_repository.dart';
import 'participation_controller.dart';

/// One authorized page, never a total or an inferred hidden participant count.
final class ParticipantPreview extends ConsumerStatefulWidget {
  const ParticipantPreview({
    required this.eventId,
    required this.onSeeAll,
    super.key,
  });
  final String eventId;
  final ValueChanged<ParticipantSelection> onSeeAll;
  @override
  ConsumerState<ParticipantPreview> createState() => _ParticipantPreviewState();
}

final class _ParticipantPreviewState extends ConsumerState<ParticipantPreview>
    with WidgetsBindingObserver {
  static const _previews = [
    (ParticipantGroup.friends, ParticipationStatus.going),
    (ParticipantGroup.friends, ParticipationStatus.interested),
    (ParticipantGroup.others, ParticipationStatus.going),
    (ParticipantGroup.others, ParticipationStatus.interested),
  ];
  int _preview = 0;
  ParticipantGroup get _group => _previews[_preview].$1;
  ParticipationStatus get _status => _previews[_preview].$2;
  ParticipantSelection get _selection =>
      (eventId: widget.eventId, status: _status, group: _group);
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        ref.read(participantsControllerProvider(_selection).notifier).load();
      }
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (mounted && state != AppLifecycleState.resumed) {
      ref.read(participantsControllerProvider(_selection).notifier).clear();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final selection = _selection;
    ref.listen(participantsControllerProvider(selection), (_, next) {
      // An empty scanned page with a cursor does not establish no friends.
      if (_preview < _previews.length - 1 &&
          !next.busy &&
          next.failure == null &&
          next.page?.items.isEmpty == true &&
          next.page?.nextCursor == null) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!mounted || _selection != selection) return;
          final current = ref.read(participantsControllerProvider(selection));
          if (!identical(current, next)) return;
          setState(() => _preview++);
          final selected = _selection;
          // Mount the new family subscription before dispatching the read.
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted && _selection == selected) {
              ref
                  .read(participantsControllerProvider(selected).notifier)
                  .load();
            }
          });
        });
      }
    });
    final state = ref.watch(participantsControllerProvider(selection));
    final rows = !state.busy && state.failure == null
        ? state.page?.items
        : null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (state.busy)
          const LinearProgressIndicator(
            semanticsLabel: 'Loading visible participants',
          ),
        if (rows != null && rows.isNotEmpty) ...[
          Text(
            '${_group == ParticipantGroup.friends ? 'Friends' : 'People'} ${_status.name}',
            style: Theme.of(context).textTheme.titleSmall,
          ),
          for (final person in rows.take(3))
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const CircleAvatar(child: Icon(Icons.person_outline)),
              title: Text(person.displayName ?? person.username),
              subtitle: person.displayName == null
                  ? null
                  : Text('@${person.username}'),
            ),
        ],
        ListTile(
          contentPadding: EdgeInsets.zero,
          leading: const Icon(Icons.people_outline),
          title: const Text('See all participants'),
          subtitle: Text(
            state.failure != null
                ? 'Preview unavailable. Open the list to retry.'
                : 'Explore Interested & Going · visible people only',
          ),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => widget.onSeeAll(selection),
        ),
      ],
    );
  }
}
