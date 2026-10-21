import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/local_time.dart';
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
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          '${localTimeLabel(context, record.createdAt)} (local time)',
          style: Theme.of(context).textTheme.labelLarge,
        ),
        if (record.note.isNotEmpty) ...[
          const SizedBox(height: 16),
          Text(
            record.note,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(height: 1.5),
          ),
        ],
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            if (record.mood case final mood?)
              Chip(
                avatar: const Icon(Icons.mood_outlined, size: 18),
                label: Text(mood),
              ),
            if (record.activity case final activity?)
              Chip(
                avatar: const Icon(Icons.local_activity_outlined, size: 18),
                label: Text(activity),
              ),
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
        if (record.locationLabel case final label?)
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.place_outlined),
            title: Text(label),
            subtitle: const Text('Your place label'),
          ),
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
