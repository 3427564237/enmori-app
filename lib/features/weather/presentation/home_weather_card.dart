import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'home_weather_controller.dart';
import 'weather_card.dart';

final class HomeWeatherCard extends ConsumerStatefulWidget {
  const HomeWeatherCard({
    required this.openAttribution,
    this.onOpenSettings,
    super.key,
  });
  final Future<bool> Function(Uri) openAttribution;
  final VoidCallback? onOpenSettings;
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

  static const _disclosure =
      'ENMORI will obtain one foreground location, round it to 0.1°, and send the approximate coordinate through its Backend to Open-Meteo. Open-Meteo may retain request metadata. No precise point, identity or Check-in is sent. Choose automatic weather to remember this preference, refresh at most every 15 minutes while on Home, and change it anytime in Settings. No background tracking. Separate from Check-in weather.';

  Future<void> _requestWeather() async {
    final state = ref.read(homeWeatherControllerProvider);

    final epoch = controller.epoch;
    if (state.automatic) {
      await controller.load(expectedEpoch: epoch);
      return;
    }
    final allowed = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Allow current weather?'),
        content: const SingleChildScrollView(child: Text(_disclosure)),
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
      await controller.load(expectedEpoch: epoch, remember: allowed == 'auto');
    }
  }

  void _showInfo() => showDialog<void>(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('About Home weather'),
      content: const SingleChildScrollView(child: Text(_disclosure)),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Done'),
        ),
      ],
    ),
  );

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(homeWeatherControllerProvider);
    final actions = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (state.weather != null)
          IconButton(
            tooltip: 'Refresh weather',
            onPressed: state.busy ? null : _requestWeather,
            icon: const Icon(Icons.refresh),
          ),
        PopupMenuButton<String>(
          tooltip: 'Weather options',
          onSelected: (action) {
            if (action == 'clear') {
              controller.clear();
            } else if (action == 'settings') {
              widget.onOpenSettings?.call();
            } else {
              _showInfo();
            }
          },
          itemBuilder: (_) => [
            const PopupMenuItem(
              value: 'info',
              child: Text('About Home weather'),
            ),
            if (widget.onOpenSettings != null)
              const PopupMenuItem(
                value: 'settings',
                child: Text('Weather settings'),
              ),
            if (state.weather != null)
              const PopupMenuItem(value: 'clear', child: Text('Clear weather')),
          ],
        ),
      ],
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (state.weather == null)
          Row(
            children: [
              Expanded(
                child: TextButton.icon(
                  style: TextButton.styleFrom(
                    alignment: Alignment.centerLeft,
                    padding: EdgeInsets.zero,
                  ),
                  onPressed: state.busy ? null : _requestWeather,
                  icon: const Icon(Icons.cloud_outlined),
                  label: const Text('Add today’s weather'),
                ),
              ),
              actions,
            ],
          ),
        Text(
          state.automatic
              ? 'Approximate location · auto on'
              : 'Optional · approximate location',
          style: Theme.of(context).textTheme.bodySmall,
        ),
        if (state.weather case final weather?)
          WeatherCard(
            snapshot: weather,
            showUpdated: true,
            actions: actions,
            openAttribution: widget.openAttribution,
          ),
        if (state.failure case final failure?)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Semantics(liveRegion: true, child: Text(failure.message)),
          ),
        if (state.busy)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 8),
            child: LinearProgressIndicator(
              semanticsLabel: 'Getting current weather',
            ),
          ),
      ],
    );
  }
}
