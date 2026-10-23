import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../../../core/presentation/enmori_motion.dart';
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
          context.tr(
            '${localTimeLabel(context, record.createdAt)} (local time)',
            '${localTimeLabel(context, record.createdAt)}（本地时间）',
          ),
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
          spacing: 16,
          runSpacing: 8,
          children: [
            if (record.mood case final mood?)
              _RecordMeta(icon: Icons.mood_outlined, label: mood),
            if (record.activity case final activity?)
              _RecordMeta(icon: Icons.local_activity_outlined, label: activity),
            if (record.checkInVisibility case final visibility?)
              _RecordMeta(
                icon: visibility == CheckInVisibility.private
                    ? Icons.lock_outline
                    : Icons.people_outline,
                label: switch (visibility) {
                  CheckInVisibility.private => context.tr('Private', '仅自己'),
                  CheckInVisibility.friendsOnly => context.tr(
                    'Friends-only',
                    '仅好友',
                  ),
                  CheckInVisibility.public => context.tr('Public', '公开'),
                },
              ),
          ],
        ),
        if (record.location != null ||
            record.locationLabel != null ||
            record.weather != null)
          const Divider(height: 32),
        if (record.location case final location?)
          ExpansionTile(
            key: ValueKey('record-location-${record.checkInId}'),
            expansionAnimationStyle: EnmoriMotion.surface(context),
            tilePadding: EdgeInsets.zero,
            leading: const Icon(Icons.place_outlined),
            title: Text(
              record.locationLabel ?? context.tr('Saved location', '已保存的位置'),
            ),
            subtitle: Text(context.tr('Location details', '位置详情')),
            childrenPadding: const EdgeInsets.only(bottom: 16),
            expandedCrossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SelectableText('${location.latitude}, ${location.longitude}'),
            ],
          )
        else if (record.locationLabel case final label?)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _RecordMeta(icon: Icons.place_outlined, label: label),
          ),
        if (record.weather case final weather?) ...[
          Text(
            context.tr('Weather at Check-in', '签到时的天气'),
            style: Theme.of(context).textTheme.titleMedium,
          ),
          ref.watch(weatherCardBuilderProvider)(weather, openAttribution),
        ],
      ],
    );
  }
}

final class _RecordMeta extends StatelessWidget {
  const _RecordMeta({required this.icon, required this.label});
  final IconData icon;
  final String label;
  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Icon(
        icon,
        size: 18,
        color: Theme.of(context).colorScheme.onSurfaceVariant,
      ),
      const SizedBox(width: 6),
      Flexible(
        child: Text(label, style: Theme.of(context).textTheme.bodyMedium),
      ),
    ],
  );
}
