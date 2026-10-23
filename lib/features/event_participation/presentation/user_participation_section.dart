import '../../../core/presentation/enmori_localizations.dart';

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
    this.onComparePlans,
    super.key,
  });
  final String username;
  final ValueChanged<String> onSelect;
  final VoidCallback? onComparePlans;
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
          context.tr('Visible Event participation', '可见的活动参与'),
          style: Theme.of(context).textTheme.titleLarge,
        ),
        if (widget.onComparePlans != null)
          OutlinedButton.icon(
            onPressed: () {
              if (observed != null &&
                  identical(
                    participationSession(ref.read(authSessionProvider)),
                    observed,
                  )) {
                widget.onComparePlans!();
              }
            },
            icon: const Icon(Icons.compare_arrows),
            label: Text(context.tr('Compare with my plans', '与我的计划对照')),
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
                        ? context.tr(
                            'No visible participation records.',
                            '没有可见的参与记录。',
                          )
                        : context.tr(
                            'No visible records on this page; more pages are available.',
                            '本页没有可见记录，还可以查看下一页。',
                          ),
                  ),
                for (final row in value.items)
                  ListTile(
                    title: AuthorizedEventTitle(row.eventId),
                    subtitle: Text(
                      context.tr(
                        row.status.name,
                        row.status == ParticipationStatus.going ? '将参加' : '感兴趣',
                      ),
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
                    child: Text(
                      context.tr(
                        'Next visible participation page',
                        '下一页可见参与记录',
                      ),
                    ),
                  ),
              ],
            ),
          AsyncData<Result<PublicParticipationPage>>(
            value: Failure<PublicParticipationPage>(:final failure),
          ) =>
            Text(localizedFailure(context, failure)),
          AsyncError<Result<PublicParticipationPage>>() => Text(
            context.tr('Visible participation unavailable.', '暂时无法获取可见参与信息。'),
          ),
          _ => Text(
            context.tr('Loading visible participation…', '正在加载可见参与信息…'),
          ),
        },
        TextButton(
          onPressed: () => ref.invalidate(userParticipationPageProvider(key)),
          child: Text(context.tr('Read visible participation', '刷新可见参与信息')),
        ),
      ],
    );
  }
}
