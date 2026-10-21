import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'home_weather_controller.dart';
import 'weather_card.dart';

final class HomeWeatherCard extends ConsumerStatefulWidget {
  const HomeWeatherCard({required this.openAttribution, super.key});
  final Future<bool> Function(Uri) openAttribution;
  @override
  ConsumerState<HomeWeatherCard> createState() => _HomeWeatherCardState();
}

final class _HomeWeatherCardState extends ConsumerState<HomeWeatherCard>
    with WidgetsBindingObserver {
  HomeWeatherController get controller =>
      ref.read(homeWeatherControllerProvider.notifier);
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) controller.openHome();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (mounted &&
        (state == AppLifecycleState.paused ||
            state == AppLifecycleState.hidden ||
            state == AppLifecycleState.detached)) {
      controller.suspend();
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(homeWeatherControllerProvider);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Current weather',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            Text(
              state.automatic
                  ? 'Updates when you visit Home. Change this in Settings.'
                  : 'A little context for your day. Optional and separate from Check-ins.',
            ),
            if (state.weather case final weather?)
              WeatherCard(
                snapshot: weather,
                showUpdated: true,
                openAttribution: widget.openAttribution,
              ),
            if (state.failure case final failure?)
              Semantics(liveRegion: true, child: Text(failure.message)),
            if (state.busy)
              Semantics(
                liveRegion: true,
                child: const Text('Getting current weather…'),
              ),
            OutlinedButton.icon(
              icon: const Icon(Icons.cloud_outlined),
              label: Text(
                state.weather == null ? 'Get local weather' : 'Refresh weather',
              ),
              onPressed: state.busy
                  ? null
                  : () async {
                      final epoch = controller.epoch;
                      if (state.automatic) {
                        await controller.load(expectedEpoch: epoch);
                        return;
                      }
                      final allowed = await showDialog<String>(
                        context: context,
                        builder: (context) => AlertDialog(
                          title: const Text('Allow current weather?'),
                          content: const SingleChildScrollView(
                            child: Text(
                              'ENMORI will obtain one foreground location, round it to 0.1°, and send the approximate coordinate through its Backend to Open-Meteo. Open-Meteo may retain request metadata. No precise point, identity or Check-in is sent. Choose automatic weather to remember this preference, refresh at most every 15 minutes while on Home, and change it anytime in Settings. No background tracking. Separate from Check-in weather.',
                            ),
                          ),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.pop(context),
                              child: const Text('Not now'),
                            ),
                            TextButton(
                              onPressed: () => Navigator.pop(context, 'once'),
                              child: const Text('Only this time'),
                            ),
                            FilledButton(
                              onPressed: () => Navigator.pop(context, 'auto'),
                              child: const Text('Automatically on Home'),
                            ),
                          ],
                        ),
                      );
                      if (mounted && allowed != null) {
                        await controller.load(
                          expectedEpoch: epoch,
                          remember: allowed == 'auto',
                        );
                      }
                    },
            ),
            if (state.weather != null)
              TextButton(
                onPressed: controller.clear,
                child: const Text('Clear weather'),
              ),
          ],
        ),
      ),
    );
  }
}
