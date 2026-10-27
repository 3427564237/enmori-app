import '../../../core/presentation/identity_avatar.dart';
import '../../../core/presentation/enmori_localizations.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'participation_controller.dart';
import '../domain/participation_repository.dart';
import '../../../core/presentation/enmori_motion.dart';

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
  late ParticipantSelection _selection = widget.selection;
  void _select(ParticipationStatus status, ParticipantGroup group) {
    if (_selection.status == status && _selection.group == group) return;
    setState(() {
      _selection = (
        eventId: widget.selection.eventId,
        status: status,
        group: group,
      );
      _retryNext = false;
    });
    final selected = _selection;
    // Observe the new auto-disposed family in build before starting its read.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && _selection == selected) {
        ref.read(participantsControllerProvider(selected).notifier).load();
      }
    });
  }

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
    if (state != AppLifecycleState.resumed && mounted) {
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
    final state = ref.watch(participantsControllerProvider(selection));
    final controller = ref.read(
      participantsControllerProvider(_selection).notifier,
    );
    final page = state.page;
    return Scaffold(
      appBar: AppBar(title: Text(context.tr('Participants', '参与者'))),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Wrap(
              spacing: 8,
              runSpacing: 4,
              children: [
                for (final status in [
                  ParticipationStatus.going,
                  ParticipationStatus.interested,
                ])
                  ChoiceChip(
                    chipAnimationStyle: EnmoriMotion.chips(context),
                    label: Text(
                      status == ParticipationStatus.going
                          ? context.tr('Going', '将参加')
                          : context.tr('Interested', '感兴趣'),
                    ),
                    selected: selection.status == status,
                    onSelected: (_) => _select(status, selection.group),
                  ),
              ],
            ),
            Wrap(
              spacing: 8,
              runSpacing: 4,
              children: [
                for (final group in ParticipantGroup.values)
                  ChoiceChip(
                    chipAnimationStyle: EnmoriMotion.chips(context),
                    label: Text(
                      group == ParticipantGroup.friends
                          ? context.tr('Friends', '好友')
                          : context.tr('Others', '其他用户'),
                    ),
                    selected: selection.group == group,
                    onSelected: (_) => _select(selection.status, group),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              context.tr(
                'Only people visible to you are shown.',
                '仅显示你有权查看的用户。',
              ),
              style: Theme.of(context).textTheme.bodySmall,
            ),
            if (state.busy)
              Text(context.tr('Loading participants…', '正在加载参与者…')),
            if (state.failure case final failure?)
              Text(localizedFailure(context, failure)),
            if (page != null && state.failure == null && !state.busy) ...[
              Text(
                page.visibleCount == null
                    ? context.tr(
                        'Visible participant count unavailable.',
                        '暂时无法获取可见参与人数。',
                      )
                    : context.tr(
                        '${page.visibleCount} visible participants',
                        '${page.visibleCount} 位可见参与者',
                      ),
              ),
              if (page.items.isEmpty)
                Text(
                  page.nextCursor == null
                      ? context.tr(
                          'No visible participants on this page.',
                          '本页没有可见的参与者。',
                        )
                      : context.tr(
                          'No visible participants on this page. More pages are available.',
                          '本页没有可见的参与者，还可以查看下一页。',
                        ),
                ),
              for (final item in page.items)
                ListTile(
                  leading: IdentityAvatar(username: item.username),
                  trailing: const Icon(Icons.chevron_right),
                  title: Text(item.displayName ?? item.username),
                  subtitle: item.displayName == null
                      ? null
                      : Text('@${item.username}'),
                  onTap: state.busy
                      ? null
                      : () {
                          // A queued tap must still belong to this exact freshly authorized page.
                          final current = ref.read(
                            participantsControllerProvider(selection),
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
                  child: Text(context.tr('Next page', '下一页')),
                ),
            ],
            if (state.failure != null)
              FilledButton(
                onPressed: state.busy
                    ? null
                    : () => controller.load(more: _retryNext),
                child: Text(context.tr('Retry same page', '重试当前页')),
              ),
            TextButton(
              onPressed: state.busy
                  ? null
                  : () {
                      _retryNext = false;
                      controller.load();
                    },
              child: Text(context.tr('Reload participants', '刷新参与者')),
            ),
          ],
        ),
      ),
    );
  }
}
