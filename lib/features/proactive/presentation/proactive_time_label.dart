import 'package:flutter/material.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../../../core/presentation/local_time.dart';
import '../domain/proactive.dart';

/// Formats the resolver's verified civil fields without converting them through
/// the device zone or reusing an offset from a different instant.
String confirmedFollowUpTimeLabel(BuildContext context, FollowUpTime time) {
  final civil = DateTime.tryParse(time.displayTime);
  final labels = MaterialLocalizations.of(context);
  final display = civil == null
      ? time.displayTime
      : '${labels.formatMediumDate(civil)} · ${labels.formatTimeOfDay(TimeOfDay.fromDateTime(civil), alwaysUse24HourFormat: MediaQuery.alwaysUse24HourFormatOf(context))}';
  return '$display · ${time.timeZone} · ${time.offsetLabel}';
}

/// Intent readbacks contain an instant, not the original civil-time zone.
/// The current settings zone cannot safely be attributed to an older intent.
String deviceLocalFollowUpTimeLabel(BuildContext context, DateTime instant) =>
    context.tr(
      'Device local time: ${localTimeLabel(context, instant)}',
      '设备本地时间：${localTimeLabel(context, instant)}',
    );
