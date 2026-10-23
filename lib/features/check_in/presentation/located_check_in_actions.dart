import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../../../core/presentation/enmori_motion.dart';
import '../../account/domain/account_repository.dart';
import '../../auth/auth_providers.dart';
import '../domain/check_in_repository.dart';
import 'check_in_copy.dart';
import 'check_in_place_controller.dart';
import 'check_in_place_controls.dart';
import 'check_in_record_view.dart';
import 'located_check_in_controller.dart';

/// Insert into the existing composer in place of its save actions. The host
/// supplies its draft fields; this module does not create another editor/router.
final class LocatedCheckInActions extends ConsumerWidget {
  const LocatedCheckInActions({
    required this.draftKey,
    required this.note,
    required this.visibility,
    required this.openAttribution,
    this.mood,
    this.activity,
    this.locationLabel,
    this.showPlaceControls = true,
    this.onOpenSaved,
    this.onOpenHistory,
    this.onReturnHome,
    this.manageOnly = false,
    super.key,
  });
  final Object draftKey;
  final bool manageOnly;
  final ValueChanged<String>? onOpenSaved;
  final VoidCallback? onOpenHistory, onReturnHome;
  final String note;
  final String? mood, activity, locationLabel;
  final bool showPlaceControls;
  final CheckInVisibility visibility;
  final Future<bool> Function(Uri) openAttribution;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(authSessionProvider);
    final state = ref.watch(locatedCheckInControllerProvider(draftKey)),
        controller = ref.read(
          locatedCheckInControllerProvider(draftKey).notifier,
        );
    final place = ref.watch(checkInPlaceControllerProvider(draftKey));
    final placeController = ref.read(
      checkInPlaceControllerProvider(draftKey).notifier,
    );
    final placeEpoch = placeController.epoch;
    final renderedEpoch = controller.epoch;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (state.savedId == null && !manageOnly) ...[
          if (showPlaceControls)
            CheckInPlaceControls(
              draftKey: draftKey,
              saving: state.busy || state.uncertain,
            ),
          FilledButton(
            onPressed: state.busy || place.busy
                ? null
                : () => controller.save(
                    expectedEpoch: renderedEpoch,
                    note: note,
                    mood: mood,
                    activity: activity,
                    locationLabel: locationLabel,
                    visibility: visibility,
                  ),
            child: MotionReveal(
              trigger: (state.busy, state.uncertain, place.busy),
              distance: 0,
              child: Text(
                key: ValueKey((state.busy, state.uncertain, place.busy)),
                place.busy
                    ? context.tr('Preparing location…', '正在准备位置…')
                    : state.busy
                    ? context.tr('Saving…', '正在保存…')
                    : state.uncertain
                    ? context.tr('Retry same save', '核对并重试原保存')
                    : context.tr('Save Check-in', '保存签到'),
              ),
            ),
          ),
        ],
        if (place.busy &&
            !state.busy &&
            !state.uncertain &&
            !manageOnly &&
            state.savedId == null)
          Semantics(
            liveRegion: true,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  context.tr(
                    'Wait for location, or cancel to save without it.',
                    '等待位置，或取消定位后保存。',
                  ),
                ),
                TextButton(
                  onPressed: () {
                    if (placeController.epoch == placeEpoch) {
                      placeController.clear();
                    }
                  },
                  child: Text(context.tr('Cancel location', '取消定位')),
                ),
              ],
            ),
          ),
        if (place.failure != null &&
            !showPlaceControls &&
            !manageOnly &&
            state.savedId == null)
          Semantics(
            liveRegion: true,
            child: Text(
              context.tr(
                'Location unavailable. Save without it, or try again in Permissions.',
                '位置暂不可用。可直接保存，或在权限设置中重试。',
              ),
            ),
          ),
        if (state.busy)
          LinearProgressIndicator(
            semanticsLabel: context.tr(
              'Saving or reading Check-in',
              '正在保存或读取签到',
            ),
          ),
        if (state.uncertain && !state.busy)
          Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: Text(
              context.tr(
                'Save not confirmed. Your original draft is kept. Retry the same save safely, or check History before starting another Check-in.',
                '保存尚未确认，原始草稿已保留。请核对并重试同一保存，或先查看历史记录，再创建另一条签到。',
              ),
            ),
          ),
        if (state.uncertain && onOpenHistory != null)
          TextButton(
            onPressed: onOpenHistory,
            child: Text(context.tr('Check History', '查看历史')),
          ),
        if (state.failure case final failure?)
          Semantics(
            liveRegion: true,
            child: Text(checkInFailureText(context, failure)),
          ),
        if (state.notice case final notice?)
          Semantics(
            liveRegion: true,
            child: Text(
              notice == 'Check-in saved without weather.'
                  ? context.tr(
                      'Check-in saved without weather.',
                      '签到已保存，本次未附加天气。',
                    )
                  : notice,
            ),
          ),
        if (!manageOnly && state.savedId != null) ...[
          MotionReveal(
            child: Semantics(
              liveRegion: true,
              child: Row(
                children: [
                  Icon(
                    Icons.check_circle_outline,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      context.tr('Check-in saved.', '签到已保存。'),
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          if (state.value case final value?)
            CheckInRecordView(record: value, openAttribution: openAttribution),
          const SizedBox(height: 20),
          if (onOpenSaved != null)
            FilledButton.icon(
              onPressed: () => onOpenSaved!(state.savedId!),
              icon: const Icon(Icons.article_outlined),
              label: Text(context.tr('View saved Check-in', '查看已保存的签到')),
            ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 12,
            runSpacing: 4,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              if (onReturnHome != null)
                OutlinedButton.icon(
                  onPressed: onReturnHome,
                  icon: const Icon(Icons.home_outlined),
                  label: Text(context.tr('Return Home', '返回首页')),
                ),
              if (onOpenHistory != null)
                TextButton(
                  onPressed: onOpenHistory,
                  child: Text(context.tr('Check-in History', '签到历史')),
                ),
            ],
          ),
        ],
        if (state.savedId != null)
          ExpansionTile(
            expansionAnimationStyle: EnmoriMotion.surface(context),
            tilePadding: EdgeInsets.zero,
            leading: const Icon(Icons.tune),
            title: Text(context.tr('Saved location and recovery', '位置管理与保存核对')),
            children: [
              OutlinedButton(
                onPressed: state.busy
                    ? null
                    : () => controller.read(state.savedId!),
                child: Text(context.tr('Read saved Check-in', '重新读取签到')),
              ),
              if (state.value case final value?) ...[
                OutlinedButton(
                  onPressed: state.busy
                      ? null
                      : () async {
                          final epoch = renderedEpoch;
                          final confirmed = await showDialog<bool>(
                            context: context,
                            builder: (context) => AlertDialog(
                              title: Text(
                                context.tr(
                                  'Replace the Check-in point?',
                                  '替换签到位置？',
                                ),
                              ),
                              content: Text(
                                context.tr(
                                  'Use your current precise location once in the foreground. This replaces the saved point and clears its weather, without a new weather lookup.',
                                  '将在前台获取一次当前精确位置，替换已保存的位置并清除对应天气，不会重新查询天气。',
                                ),
                              ),
                              actions: [
                                TextButton(
                                  onPressed: () =>
                                      Navigator.pop(context, false),
                                  child: Text(context.tr('Keep', '保留')),
                                ),
                                FilledButton(
                                  onPressed: () => Navigator.pop(context, true),
                                  child: Text(context.tr('Use once', '使用一次')),
                                ),
                              ],
                            ),
                          );
                          if (confirmed == true && context.mounted) {
                            await controller.replaceLocation(
                              expectedEpoch: epoch,
                            );
                          }
                        },
                  child: Text(context.tr('Replace saved location', '替换已保存的位置')),
                ),

                if (value.location != null || value.weather != null)
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      if (value.location != null)
                        OutlinedButton(
                          onPressed: state.busy
                              ? null
                              : () => _remove(
                                  context,
                                  controller,
                                  true,
                                  renderedEpoch,
                                ),
                          child: Text(
                            context.tr('Remove saved location', '移除已保存的位置'),
                          ),
                        ),
                      if (value.weather != null)
                        OutlinedButton(
                          onPressed: state.busy
                              ? null
                              : () => _remove(
                                  context,
                                  controller,
                                  false,
                                  renderedEpoch,
                                ),
                          child: Text(
                            context.tr('Remove saved weather', '移除已保存的天气'),
                          ),
                        ),
                    ],
                  ),
              ],
            ],
          ),
      ],
    );
  }

  Future<void> _remove(
    BuildContext context,
    LocatedCheckInController controller,
    bool location,
    int epoch,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          location
              ? context.tr('Remove saved location?', '移除已保存的位置？')
              : context.tr('Remove saved weather?', '移除已保存的天气？'),
        ),
        content: Text(
          location
              ? context.tr(
                  'This also removes its saved weather. Your Note and Mood stay unchanged.',
                  '同时移除对应的天气快照，笔记和心情保持不变。',
                )
              : context.tr(
                  'This deletes the weather snapshot. It will not be fetched again for this Check-in.',
                  '将删除天气快照，不会为这条历史签到重新获取天气。',
                ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(context.tr('Keep', '保留')),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(context.tr('Remove', '移除')),
          ),
        ],
      ),
    );
    if (confirmed == true && context.mounted) {
      await controller.remove(location: location, expectedEpoch: epoch);
    }
  }
}

/// Reuses the same guarded location mutations for an existing owned record.
final class SavedCheckInPlaceActions extends ConsumerStatefulWidget {
  const SavedCheckInPlaceActions({
    required this.record,
    required this.onChanged,
    required this.openAttribution,
    super.key,
  });
  final CheckIn record;
  final VoidCallback onChanged;
  final Future<bool> Function(Uri) openAttribution;
  @override
  ConsumerState<SavedCheckInPlaceActions> createState() =>
      _SavedCheckInPlaceActionsState();
}

class _SavedCheckInPlaceActionsState
    extends ConsumerState<SavedCheckInPlaceActions> {
  final _draft = Object();
  late int _revision;
  @override
  void initState() {
    super.initState();
    _revision = widget.record.revision;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final controller = ref.read(
        locatedCheckInControllerProvider(_draft).notifier,
      );
      controller.useSavedRecord(widget.record, expectedEpoch: controller.epoch);
    });
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(locatedCheckInControllerProvider(_draft), (_, next) {
      final value = next.value;
      if (value != null && value.revision != _revision) {
        _revision = value.revision;
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) widget.onChanged();
        });
      }
    });
    return LocatedCheckInActions(
      draftKey: _draft,
      note: '',
      visibility: widget.record.checkInVisibility ?? CheckInVisibility.private,
      manageOnly: true,
      openAttribution: widget.openAttribution,
    );
  }
}
