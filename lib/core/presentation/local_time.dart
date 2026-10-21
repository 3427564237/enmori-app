import 'package:flutter/material.dart';

/// User-facing local time, including the device's 12/24-hour preference.
/// Stored timestamps and source timezone contracts are never changed here.
String localTimeLabel(
  BuildContext context,
  DateTime instant, {
  bool includeDate = true,
}) {
  final local = instant.toLocal();
  final labels = MaterialLocalizations.of(context);
  final clock = labels.formatTimeOfDay(
    TimeOfDay.fromDateTime(local),
    alwaysUse24HourFormat: MediaQuery.alwaysUse24HourFormatOf(context),
  );
  return includeDate ? '${labels.formatMediumDate(local)} · $clock' : clock;
}
