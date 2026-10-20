import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../account/domain/account_repository.dart';
import '../../auth/auth_providers.dart';
import '../../weather/weather_providers.dart';
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
    super.key,
  });
  final Object draftKey;
  final String note;
  final String? mood, activity;
  final CheckInVisibility visibility;
  final Future<bool> Function(Uri) openAttribution;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(authSessionProvider);
    final state = ref.watch(locatedCheckInControllerProvider(draftKey)),
        controller = ref.read(
          locatedCheckInControllerProvider(draftKey).notifier,
        );
    final renderedEpoch = controller.epoch;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (state.savedId == null) ...[
          CheckInPlaceControls(
            draftKey: draftKey,
            saving: state.busy || state.uncertain,
          ),
          FilledButton(
            onPressed: state.busy
                ? null
                : () => controller.save(
                    expectedEpoch: renderedEpoch,
                    note: note,
                    mood: mood,
                    activity: activity,
                    visibility: visibility,
                  ),
            child: Text(state.uncertain ? 'Retry same save' : 'Save Check-in'),
          ),
        ],
        if (state.busy)
          const LinearProgressIndicator(
            semanticsLabel: 'Saving or reading Check-in',
          ),
        if (state.failure case final failure?)
          Semantics(liveRegion: true, child: Text(failure.message)),
        if (state.notice case final notice?)
          Semantics(liveRegion: true, child: Text(notice)),
        if (state.savedId case final id?)
          OutlinedButton(
            onPressed: state.busy ? null : () => controller.read(id),
            child: const Text('Read saved Check-in'),
          ),
        if (state.value case final value?) ...[
          Text(value.note),
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
                            onPressed: () => Navigator.pop(context, false),
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
                      await controller.replaceLocation(expectedEpoch: epoch);
                    }
                  },
            child: const Text('Replace saved location'),
          ),
          if (value.weather case final weather?)
            ref.watch(weatherCardBuilderProvider)(weather, openAttribution),
          if (value.location != null || value.weather != null)
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (value.location != null)
                  OutlinedButton(
                    onPressed: state.busy
                        ? null
                        : () =>
                              _remove(context, controller, true, renderedEpoch),
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
