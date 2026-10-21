import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_motion.dart';

import '../../account/domain/account_repository.dart';
import '../../auth/auth_providers.dart';
import 'check_in_record_view.dart';
import 'check_in_place_controller.dart';
import '../domain/check_in_repository.dart';
import 'check_in_place_controls.dart';
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
                    ? 'Preparing location…'
                    : state.busy
                    ? 'Saving…'
                    : state.uncertain
                    ? 'Retry same save'
                    : 'Save Check-in',
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
                const Text('Wait for location, or cancel to save without it.'),
                TextButton(
                  onPressed: () {
                    if (placeController.epoch == placeEpoch) {
                      placeController.clear();
                    }
                  },
                  child: const Text('Cancel location'),
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
            child: const Text(
              'Location unavailable. Save without it, or try again in Permissions.',
            ),
          ),
        if (state.busy)
          const LinearProgressIndicator(
            semanticsLabel: 'Saving or reading Check-in',
          ),
        if (state.uncertain && !state.busy)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: Text(
              'Save not confirmed. Your original draft is kept. Retry the same save safely, or check History before starting another Check-in.',
            ),
          ),
        if (state.uncertain && onOpenHistory != null)
          TextButton(
            onPressed: onOpenHistory,
            child: const Text('Check History'),
          ),
        if (state.failure case final failure?)
          Semantics(liveRegion: true, child: Text(failure.message)),
        if (state.notice case final notice?)
          Semantics(liveRegion: true, child: Text(notice)),
        if (!manageOnly && state.savedId != null) ...[
          MotionReveal(
            child: Semantics(
              liveRegion: true,
              child: Text(
                'Check-in saved.',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
              ),
            ),
          ),
          const SizedBox(height: 16),
          if (state.value case final value?)
            CheckInRecordView(record: value, openAttribution: openAttribution),
          if (onOpenSaved != null)
            FilledButton.icon(
              onPressed: () => onOpenSaved!(state.savedId!),
              icon: const Icon(Icons.article_outlined),
              label: const Text('View saved Check-in'),
            ),
          if (onOpenHistory != null)
            OutlinedButton.icon(
              onPressed: onOpenHistory,
              icon: const Icon(Icons.history),
              label: const Text('Check-in History'),
            ),
          if (onReturnHome != null)
            TextButton(
              onPressed: onReturnHome,
              child: const Text('Return Home'),
            ),
        ],
        if (state.savedId != null)
          ExpansionTile(
            title: const Text('Saved location and recovery'),
            children: [
              OutlinedButton(
                onPressed: state.busy
                    ? null
                    : () => controller.read(state.savedId!),
                child: const Text('Read saved Check-in'),
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
                              title: const Text('Replace the Check-in point?'),
                              content: const Text(
                                'Use your current precise location once in the foreground. This replaces the saved point and clears its weather, without a new weather lookup.',
                              ),
                              actions: [
                                TextButton(
                                  onPressed: () =>
                                      Navigator.pop(context, false),
                                  child: const Text('Keep'),
                                ),
                                FilledButton(
                                  onPressed: () => Navigator.pop(context, true),
                                  child: const Text('Use once'),
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
                  child: const Text('Replace saved location'),
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
                          child: const Text('Remove saved location'),
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
                          child: const Text('Remove saved weather'),
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
          location ? 'Remove saved location?' : 'Remove saved weather?',
        ),
        content: Text(
          location
              ? 'This also removes its saved weather. Your Note and Mood stay unchanged.'
              : 'This deletes the weather snapshot. It will not be fetched again for this Check-in.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Keep'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Remove'),
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
