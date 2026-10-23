import 'package:flutter/material.dart';

import '../domain/weather.dart';
import '../../../core/presentation/local_time.dart';

/// Deterministic Q13 attribution accompanies every displayed weather snapshot.
final class WeatherCard extends StatefulWidget {
  const WeatherCard({
    required this.snapshot,
    required this.openAttribution,
    this.showUpdated = false,
    this.actions,
    super.key,
  });
  final WeatherSnapshot snapshot;
  final Future<bool> Function(Uri) openAttribution;
  final bool showUpdated;
  final Widget? actions;
  @override
  State<WeatherCard> createState() => _WeatherCardState();
}

final class _WeatherCardState extends State<WeatherCard> {
  String? _error;
  Future<void> _open(String url) async {
    try {
      final opened = await widget.openAttribution(Uri.parse(url));
      if (mounted) {
        setState(
          () => _error = opened ? null : 'The link could not be opened.',
        );
      }
    } catch (_) {
      if (mounted) setState(() => _error = 'The link could not be opened.');
    }
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 8),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (widget.showUpdated)
          Row(
            children: [
              Expanded(
                child: Semantics(
                  label: widget.snapshot.label,
                  child: ExcludeSemantics(
                    child: Wrap(
                      spacing: 12,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Icon(
                          _weatherIcon(widget.snapshot.condition),
                          size: 24,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                        Text(
                          '${widget.snapshot.temperatureCelsius.toStringAsFixed(1)}°C',
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        Text(
                          widget.snapshot.condition.label,
                          style: Theme.of(context).textTheme.bodyLarge,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              ?widget.actions,
            ],
          )
        else
          Row(
            children: [
              Icon(
                _weatherIcon(widget.snapshot.condition),
                color: Theme.of(context).colorScheme.primary,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  widget.snapshot.label,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ),
            ],
          ),
        if (widget.showUpdated)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              'Updated ${localTimeLabel(context, widget.snapshot.observedAt)}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
        Wrap(
          spacing: 8,
          children: [
            TextButton(
              onPressed: () => _open('https://open-meteo.com/'),
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                textStyle: Theme.of(context).textTheme.bodySmall,
              ),
              child: const Text('Weather data by Open-Meteo'),
            ),
            TextButton(
              onPressed: () =>
                  _open('https://creativecommons.org/licenses/by/4.0/'),
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                textStyle: Theme.of(context).textTheme.bodySmall,
              ),
              child: const Text('CC BY 4.0'),
            ),
          ],
        ),
        Text(
          'Conditions normalized by ENMORI.',
          style: Theme.of(context).textTheme.bodySmall,
        ),
        if (_error case final error?)
          Semantics(liveRegion: true, child: Text(error)),
      ],
    ),
  );
}

IconData _weatherIcon(WeatherCondition condition) => switch (condition) {
  WeatherCondition.clear => Icons.wb_sunny_outlined,
  WeatherCondition.partlyCloudy => Icons.wb_cloudy_outlined,
  WeatherCondition.overcast => Icons.cloud_outlined,
  WeatherCondition.fog => Icons.foggy,
  WeatherCondition.drizzle ||
  WeatherCondition.rain ||
  WeatherCondition.showers => Icons.water_drop_outlined,
  WeatherCondition.snow => Icons.ac_unit,
  WeatherCondition.thunderstorm => Icons.thunderstorm_outlined,
};
