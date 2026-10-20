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
      controller.clear();
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(homeWeatherControllerProvider);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Current weather',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const Text(
              'Optional approximate location for this Home lookup. It does not add location to a Check-in.',
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
                state.weather == null
                    ? 'Use approximate location once'
                    : 'Update with location once',
              ),
              onPressed: state.busy
                  ? null
                  : () async {
                      final epoch = controller.epoch;
                      final allowed = await showDialog<bool>(
                        context: context,
                        builder: (context) => AlertDialog(
                          title: const Text('Allow current weather?'),
                          content: const SingleChildScrollView(
                            child: Text(
                              'ENMORI will obtain one foreground location, round it to 0.1°, and send the approximate coordinate through its Backend to Open-Meteo. Open-Meteo may retain request metadata. No precise point, identity or Check-in is sent. This lookup is separate from Check-in weather.',
                            ),
                          ),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.pop(context, false),
                              child: const Text('Not now'),
                            ),
                            FilledButton(
                              onPressed: () => Navigator.pop(context, true),
                              child: const Text('Allow once'),
                            ),
                          ],
                        ),
                      );
                      if (mounted && allowed == true) {
                        await controller.load(expectedEpoch: epoch);
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
