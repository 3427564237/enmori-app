import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../account/domain/account_repository.dart';
import '../../weather/weather_providers.dart';
import '../domain/check_in_repository.dart';

/// Render only the authorized saved projection; never fetch missing snapshots.
final class CheckInRecordView extends ConsumerWidget {
  const CheckInRecordView({
    required this.record,
    required this.openAttribution,
    super.key,
  });
  final CheckIn record;
  final Future<bool> Function(Uri) openAttribution;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final time = record.createdAt.toLocal();
    final labels = MaterialLocalizations.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          '${labels.formatMediumDate(time)} · ${labels.formatTimeOfDay(TimeOfDay.fromDateTime(time))} (local time)',
          style: Theme.of(context).textTheme.labelLarge,
        ),
        const SizedBox(height: 16),
        if (record.note.isNotEmpty)
          Text(record.note, style: Theme.of(context).textTheme.bodyLarge),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            if (record.mood case final mood?) Chip(label: Text('Mood: $mood')),
            if (record.activity case final activity?)
              Chip(label: Text('Activity: $activity')),
            if (record.checkInVisibility case final visibility?)
              Chip(
                label: Text(switch (visibility) {
                  CheckInVisibility.private => 'Private',
                  CheckInVisibility.friendsOnly => 'Friends-only',
                  CheckInVisibility.public => 'Public',
                }),
              ),
          ],
        ),
        const SizedBox(height: 16),
        if (record.location case final location?)
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.location_on_outlined),
            title: const Text('Saved location'),
            subtitle: Text('${location.latitude}, ${location.longitude}'),
          ),
        if (record.weather case final weather?) ...[
          Text(
            'Weather at Check-in',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          ref.watch(weatherCardBuilderProvider)(weather, openAttribution),
        ],
      ],
    );
  }
}
