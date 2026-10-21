import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'check_in_place_controller.dart';

/// Feature slot for the existing Check-in editor. A fresh draftKey is allocated
/// per composer. The host passes state.place to the located save command.
final class CheckInPlaceControls extends ConsumerStatefulWidget {
  const CheckInPlaceControls({
    required this.draftKey,
    this.saving = false,
    this.defaultLocationAuthorized = false,
    this.defaultWeatherAuthorized = false,
    super.key,
  });
  final Object draftKey;
  final bool saving;
  final bool defaultLocationAuthorized, defaultWeatherAuthorized;
  @override
  ConsumerState<CheckInPlaceControls> createState() =>
      _CheckInPlaceControlsState();
}

final class _CheckInPlaceControlsState
    extends ConsumerState<CheckInPlaceControls>
    with WidgetsBindingObserver {
  CheckInPlaceController get controller =>
      ref.read(checkInPlaceControllerProvider(widget.draftKey).notifier);
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Native permission sheets may be inactive while remaining foreground.
    // Real background transitions invalidate the pending single observation.
    if (mounted &&
        (state == AppLifecycleState.paused ||
            state == AppLifecycleState.hidden ||
            state == AppLifecycleState.detached) &&
        !widget.saving) {
      controller.clear();
    }
  }

  Future<bool> _confirm(String title, String text, String action) async =>
      await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(title),
          content: SingleChildScrollView(child: Text(text)),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Not now'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: Text(action),
            ),
          ],
        ),
      ) ==
      true;
  @override
  Widget build(BuildContext context) {
    final state = ref.watch(checkInPlaceControllerProvider(widget.draftKey)),
        disabled = state.busy || widget.saving;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Location for this Check-in',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const Text(
              'Optional. One foreground location only; no background tracking. Map sharing starts off and is controlled separately in Settings.',
            ),
            if (state.place case final place?) ...[
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 8),
                child: Text('One Check-in point is ready to save.'),
              ),
              OutlinedButton(
                onPressed: disabled ? null : controller.clear,
                child: const Text('Remove location'),
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Add weather to this Check-in'),
                value: place.includeWeather,
                onChanged: disabled
                    ? null
                    : (enabled) async {
                        final epoch = controller.epoch;
                        if (enabled &&
                            !widget.defaultWeatherAuthorized &&
                            !await _confirm(
                              'Allow weather lookup?',
                              'ENMORI will send a coordinate rounded to 0.1° through its Backend to Open-Meteo for current conditions. Open-Meteo can retain request metadata under its terms. No precise Check-in point or Note is sent. Weather failure still allows saving.',
                              'Allow once',
                            )) {
                          return;
                        }
                        if (mounted) {
                          await controller.allowWeather(
                            enabled,
                            expectedEpoch: epoch,
                          );
                        }
                      },
              ),
            ] else
              OutlinedButton.icon(
                icon: const Icon(Icons.my_location),
                label: const Text('Use location once'),
                onPressed: disabled
                    ? null
                    : () async {
                        final epoch = controller.epoch;
                        if ((widget.defaultLocationAuthorized ||
                                await _confirm(
                                  'Save a precise Check-in point?',
                                  'Use your current precise location once while this app is open. The point is saved with this Check-in. Friends can see it on your map only when Check-in visibility, location privacy and map sharing all allow it.',
                                  'Use once',
                                )) &&
                            mounted) {
                          await controller.capture(expectedEpoch: epoch);
                        }
                      },
              ),
            if (state.busy)
              Semantics(
                liveRegion: true,
                child: const Text('Checking permission…'),
              ),
            if (state.failure case final failure?)
              Semantics(liveRegion: true, child: Text(failure.message)),
          ],
        ),
      ),
    );
  }
}
