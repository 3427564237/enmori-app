import 'package:flutter/material.dart';

import '../domain/weather.dart';

/// Deterministic Q13 attribution accompanies every displayed weather snapshot.
final class WeatherCard extends StatefulWidget {
  const WeatherCard({
    required this.snapshot,
    required this.openAttribution,
    this.showUpdated = false,
    super.key,
  });
  final WeatherSnapshot snapshot;
  final Future<bool> Function(Uri) openAttribution;
  final bool showUpdated;
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
        Text(
          widget.snapshot.label,
          style: Theme.of(context).textTheme.titleMedium,
        ),
        if (widget.showUpdated)
          Text(
            'Updated ${MaterialLocalizations.of(context).formatMediumDate(widget.snapshot.observedAt.toLocal())} · ${MaterialLocalizations.of(context).formatTimeOfDay(TimeOfDay.fromDateTime(widget.snapshot.observedAt.toLocal()))}',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        Wrap(
          spacing: 8,
          children: [
            TextButton(
              onPressed: () => _open('https://open-meteo.com/'),
              child: const Text('Weather data by Open-Meteo'),
            ),
            TextButton(
              onPressed: () =>
                  _open('https://creativecommons.org/licenses/by/4.0/'),
              child: const Text('CC BY 4.0'),
            ),
          ],
        ),
        const Text('Conditions normalized by ENMORI.'),
        if (_error case final error?)
          Semantics(liveRegion: true, child: Text(error)),
      ],
    ),
  );
}
