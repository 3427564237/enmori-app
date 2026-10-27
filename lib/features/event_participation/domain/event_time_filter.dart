enum EventTimeFilter { all, today, weekend, sevenDays }

/// Civil-day boundaries use local constructors, preserving daylight-saving days.
bool matchesEventTime(String startAt, EventTimeFilter filter, DateTime now) {
  if (filter == EventTimeFilter.all) return true;
  final start = DateTime.tryParse(startAt)?.toLocal();
  if (start == null) return false;
  final local = now.toLocal();
  final today = DateTime(local.year, local.month, local.day);
  final from = filter == EventTimeFilter.weekend
      ? DateTime(today.year, today.month, today.day + 6 - today.weekday)
      : today;
  final days = switch (filter) {
    EventTimeFilter.weekend => 2,
    EventTimeFilter.sevenDays => 7,
    _ => 1,
  };
  final until = DateTime(from.year, from.month, from.day + days);
  return !start.isBefore(from) && start.isBefore(until);
}
