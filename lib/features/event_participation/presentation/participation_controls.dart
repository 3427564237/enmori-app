import '../../../core/presentation/enmori_localizations.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_motion.dart';
import '../../../core/result/result.dart';
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
    Future<void> change(ParticipationStatus status, bool ignored) async {
      if (value == null) return;
      final id = widget.eventId;
      final hiding = ignored && !value.ignored;
      // The recommendation card can unmount as soon as the hide is confirmed.
      // The page messenger and session-bound controller own this short recovery.
      final messenger = ScaffoldMessenger.of(context);
      final container = ProviderScope.containerOf(context, listen: false);
      final route = ModalRoute.of(context);
      final hiddenLabel = context.tr('Hidden from recommendations', '已从推荐中隐藏');
      final undoLabel = context.tr('Undo', '撤销');
      final restoredLabel = context.tr('Recommendation restored.', '已恢复推荐。');
      final failedLabel = context.tr(
        'Restoration not confirmed. Open My plans → Hidden and check your participation status.',
        '恢复尚未确认。请到“我的计划 → 已隐藏”核对参与状态。',
      );
      final unconfirmedLabel = context.tr(
        'Change not confirmed. Check your plans before making another change.',
        '修改尚未确认，请先核对计划再继续修改。',
      );
      bool current() =>
          messenger.mounted &&
          route?.isCurrent != false &&
          identical(
            participationSession(container.read(authSessionProvider)),
            renderedSession,
          );
      final result = await controller.changeRendered(
        id,
        status,
        ignored,
        renderedSession: renderedSession,
        expected: value,
      );
      if (!hiding || !current()) return;
      if (result is! Success<void>) {
        // A menu-return refresh can remove the card before its write settles.
        messenger
          ..hideCurrentSnackBar()
          ..showSnackBar(SnackBar(content: Text(unconfirmedLabel)));
        return;
      }
      final confirmed = container
          .read(participationControllerProvider)[id]
          ?.value;
      if (confirmed == null || !confirmed.ignored) return;
      messenger.hideCurrentSnackBar();
      messenger.showSnackBar(
        SnackBar(
          content: Text(hiddenLabel),
          duration: const Duration(seconds: 8),
          action: SnackBarAction(
            label: undoLabel,
            onPressed: () async {
              if (!current()) return;
              final restored = await controller.changeRendered(
                id,
                confirmed.status,
                false,
                renderedSession: renderedSession,
                expected: confirmed,
              );
              if (!current()) return;
              messenger.showSnackBar(
                SnackBar(
                  content: Text(
                    restored is Success<void> ? restoredLabel : failedLabel,
                  ),
                ),
              );
            },
          ),
        ),
      );
    }

    final busy = entry?.busy == true;
    final needsRead =
        value == null || entry?.uncertain == true || entry?.failure != null;
    Widget planButton(ParticipationStatus status, String label, IconData icon) {
      final selected = value?.status == status;
      final action = enabled
          ? () => change(
              selected ? ParticipationStatus.none : status,
              selected ? value.ignored : false,
            )
          : null;
      return Semantics(
        selected: selected,
        child: OutlinedButton.icon(
          style: OutlinedButton.styleFrom(
            animationDuration: EnmoriMotion.duration(
              context,
              EnmoriMotion.feedback,
            ),
            backgroundColor: selected
                ? Theme.of(context).colorScheme.secondaryContainer
                : Colors.transparent,
            foregroundColor: selected
                ? Theme.of(context).colorScheme.onSecondaryContainer
                : Theme.of(context).colorScheme.primary,
            side: BorderSide(
              color: selected
                  ? Theme.of(context).colorScheme.primary
                  : Theme.of(context).colorScheme.outline,
            ),
          ),
          onPressed: action,
          icon: MotionReveal(
            trigger: selected,
            distance: 0,
            child: Icon(selected ? Icons.check : icon, size: 18),
          ),
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
              context.tr('Interested', '感兴趣'),
              Icons.star_outline,
            ),
            planButton(
              ParticipationStatus.going,
              context.tr('Going', '将参加'),
              Icons.event_available_outlined,
            ),
            PopupMenuButton<VoidCallback>(
              tooltip: context.tr('More event options', '更多活动选项'),
              enabled: !busy && entry?.uncertain != true && value != null,
              // Execute the closure captured when this menu was rendered, not
              // a fresh session/revision observed while the menu was open.
              onSelected: (action) => action(),
              itemBuilder: (_) => [
                if (value != null && value.status != ParticipationStatus.none)
                  PopupMenuItem(
                    value: () =>
                        change(ParticipationStatus.none, value.ignored),
                    child: Text(context.tr('Cancel participation', '取消参与')),
                  ),
                if (value != null)
                  PopupMenuItem(
                    value: () => change(value.status, !value.ignored),
                    child: Text(
                      value.ignored
                          ? context.tr('Restore recommendation', '恢复推荐')
                          : context.tr('Ignore recommendation', '忽略推荐'),
                    ),
                  ),
                PopupMenuItem(
                  value: () => controller.load(widget.eventId),
                  child: Text(
                    context.tr('Sync participation status', '同步参与状态'),
                  ),
                ),
              ],
            ),
          ],
        ),
        if (value?.ignored == true)
          Padding(
            padding: EdgeInsets.only(top: 4),
            child: Text(context.tr('Hidden from recommendations', '已从推荐中隐藏')),
          ),
        if (busy)
          Semantics(
            liveRegion: true,
            child: Text(
              context.tr('Checking your participation…', '正在核对参与状态…'),
            ),
          ),
        if (entry?.failure case final failure?)
          Semantics(
            liveRegion: true,
            child: Text(localizedFailure(context, failure)),
          ),
        if (entry?.uncertain == true)
          Padding(
            padding: EdgeInsets.only(top: 4),
            child: Text(
              context.tr(
                'Change not confirmed. Check your plans before making another change.',
                '修改尚未确认，请先核对计划再继续修改。',
              ),
            ),
          ),
        if (needsRead && !busy)
          TextButton.icon(
            onPressed: () => controller.load(widget.eventId),
            icon: const Icon(Icons.refresh, size: 18),
            label: Text(
              entry?.uncertain == true
                  ? context.tr('Check current plans', '核对当前计划')
                  : context.tr('Load your plans', '加载你的计划'),
            ),
          ),
      ],
    );
  }
}
