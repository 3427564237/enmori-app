import 'authorized_event_title.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../../auth/domain/auth_repository.dart';
import '../domain/participation_repository.dart';
import '../participation_providers.dart';

typedef PublicParticipationSelection = ({String username, String? cursor});
final userParticipationPageProvider = FutureProvider.autoDispose
    .family<Result<PublicParticipationPage>, PublicParticipationSelection>((
      ref,
      key,
    ) async {
      final session = participationSession(ref.watch(authSessionProvider)),
          repository = ref.watch(participationRepositoryProvider);
      bool current() =>
          ref.mounted &&
          session is AuthSessionAuthenticated &&
          identical(
            participationSession(ref.read(authSessionProvider)),
            session,
          );
      if (!current()) return const Failure(participationUnavailable);
      try {
        return await repository.forUsername(key.username, key.cursor, current);
      } catch (_) {
        return const Failure(participationUnavailable);
      }
    });

/// JIN's profile surface injects only immutable Username and an Event-ID callback.
/// Participation visibility grants no permission to other fields of that profile.
final class UserParticipationSection extends ConsumerStatefulWidget {
  const UserParticipationSection({
    required this.username,
    required this.onSelect,
    super.key,
  });
  final String username;
  final ValueChanged<String> onSelect;
  @override
  ConsumerState<UserParticipationSection> createState() =>
      _UserParticipationSectionState();
}

final class _UserParticipationSectionState
    extends ConsumerState<UserParticipationSection> {
  String? _cursor;
  Object? _session;
  @override
  void didUpdateWidget(UserParticipationSection old) {
    super.didUpdateWidget(old);
    if (old.username != widget.username) _cursor = null;
  }

  @override
  Widget build(BuildContext context) {
    final observed = participationSession(ref.watch(authSessionProvider));
    if (!identical(observed, _session)) {
      _session = observed;
      _cursor = null;
    }
    final key = (username: widget.username, cursor: _cursor),
        result = ref.watch(
          userParticipationPageProvider((
            username: widget.username,
            cursor: _cursor,
          )),
        );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Visible Event participation',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        switch (result) {
          AsyncData<Result<PublicParticipationPage>>(
            value: Success<PublicParticipationPage>(:final value),
          ) =>
            Column(
              children: [
                if (value.items.isEmpty)
                  Text(
                    value.nextCursor == null
                        ? 'No visible participation records.'
                        : 'No visible records on this page; more pages are available.',
                  ),
                for (final row in value.items)
                  ListTile(
                    title: AuthorizedEventTitle(row.eventId),
                    subtitle: Text(row.status.name),
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
                    child: const Text('Next visible participation page'),
                  ),
              ],
            ),
          AsyncData<Result<PublicParticipationPage>>(
            value: Failure<PublicParticipationPage>(:final failure),
          ) =>
            Text(failure.message),
          AsyncError<Result<PublicParticipationPage>>() => const Text(
            'Visible participation unavailable.',
          ),
          _ => const Text('Loading visible participation…'),
        },
        TextButton(
          onPressed: () => ref.invalidate(userParticipationPageProvider(key)),
          child: const Text('Read visible participation'),
        ),
      ],
    );
  }
}
