import 'proactive.dart';

/// A suggestion in civil fields only. It is never an instant or a reschedule:
/// the user must choose it, resolve its IANA zone and confirm the result.
FollowUpCivilTime? nextAllowedFollowUpTime(
  FollowUpCivilTime civil,
  ProactiveQuiet quiet,
) {
  if (quiet is! ProactiveQuietWindow) return null;
  final minute = civil.hour * 60 + civil.minute;
  final start = quiet.startMinute, end = quiet.endMinute;
  final inside = start < end
      ? minute >= start && minute < end
      : minute >= start || minute < end;
  if (!inside) return null;
  // UTC is used only for calendar rollover, not to resolve local time.
  final day = DateTime.utc(
    civil.year,
    civil.month,
    civil.day,
  ).add(Duration(days: start > end && minute >= start ? 1 : 0));
  return FollowUpCivilTime(
    year: day.year,
    month: day.month,
    day: day.day,
    hour: end ~/ 60,
    minute: end % 60,
  );
}
