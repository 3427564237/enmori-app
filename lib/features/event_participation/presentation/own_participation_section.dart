import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../../auth/domain/auth_repository.dart';
import '../domain/participation_repository.dart';
import '../participation_providers.dart';
import 'participation_controller.dart';

final ownParticipationPageProvider = FutureProvider.autoDispose
    .family<Result<EventParticipationPage>, String?>((ref, cursor) async {
      final session = participationSession(ref.watch(authSessionProvider));
      // Only a changed committed revision invalidates the owner's profile list.
      ref.watch(
        participationControllerProvider.select(
          (rows) => rows.entries
              .map((e) => '${e.key}:${e.value.value?.revision}')
              .join('|'),
        ),
      );
      final repository = ref.watch(participationRepositoryProvider);
      bool current() =>
          ref.mounted &&
          session is AuthSessionAuthenticated &&
          identical(
            participationSession(ref.read(authSessionProvider)),
            session,
          );
      if (!current()) return const Failure(participationUnavailable);
      try {
        return await repository.own(cursor, current);
      } catch (_) {
        return const Failure(participationUnavailable);
      }
    });

/// LI places the same section in Profile; no supplier content is archived here.
final class OwnParticipationSection extends ConsumerStatefulWidget {
  const OwnParticipationSection({required this.onSelect, super.key});
  final ValueChanged<String> onSelect;
  @override
  ConsumerState<OwnParticipationSection> createState() =>
      _OwnParticipationSectionState();
}

final class _OwnParticipationSectionState
    extends ConsumerState<OwnParticipationSection> {
  String? _cursor;
  Object? _session;
  @override
  Widget build(BuildContext context) {
    final observed = participationSession(ref.watch(authSessionProvider));
    if (!identical(observed, _session)) {
      _session = observed;
      _cursor = null;
    }
    final result = ref.watch(ownParticipationPageProvider(_cursor));
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Your Event participation',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        switch (result) {
          AsyncData<Result<EventParticipationPage>>(
            value: Success<EventParticipationPage>(:final value),
          ) =>
            Column(
              children: [
                if (value.items.isEmpty)
                  Text(
                    value.nextCursor == null
                        ? 'No participation records.'
                        : 'No records on this page; more pages are available.',
                  ),
                for (final row in value.items)
                  ListTile(
                    title: Text(row.eventId),
                    subtitle: Text(
                      '${row.status.name}${row.ignored ? ' · recommendation ignored' : ''}',
                    ),
                    onTap: () {
                      if (identical(
                        participationSession(ref.read(authSessionProvider)),
                        observed,
                      )) {
                        widget.onSelect(row.eventId);
                      }
                    },
                  ),
                if (value.nextCursor != null)
                  OutlinedButton(
                    onPressed: () => setState(() => _cursor = value.nextCursor),
                    child: const Text('Next participation page'),
                  ),
              ],
            ),
          AsyncData<Result<EventParticipationPage>>(
            value: Failure<EventParticipationPage>(:final failure),
          ) =>
            Text(failure.message),
          AsyncError<Result<EventParticipationPage>>() => const Text(
            'Participation is unavailable.',
          ),
          _ => const Text('Loading participation records…'),
        },
        TextButton(
          onPressed: () {
            if (_cursor != null) {
              setState(() => _cursor = null);
            } else {
              ref.invalidate(ownParticipationPageProvider(null));
            }
          },
          child: const Text('Reload participation records'),
        ),
      ],
    );
  }
}
