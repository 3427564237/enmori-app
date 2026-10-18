DateTime? tryParseUtcTimestamp(Object? value) {
  if (value is! String) return null;
  if (!value.endsWith('Z') && !value.endsWith('+00:00')) return null;

  final parsed = DateTime.tryParse(value);
  if (parsed == null || !parsed.isUtc) return null;
  return parsed;
}

/// Canonical calendar-exact UTC instant for Event ordering, preserving up to
/// nine fractional digits that DateTime presentation cannot represent.
BigInt? tryParseEventInstant(Object? value) {
  if (value is! String) return null;
  final match = RegExp(
    r'^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?Z$',
  ).firstMatch(value);
  if (match == null) return null;
  final whole = DateTime.tryParse('${match[1]}Z');
  if (whole == null || whole.toIso8601String().substring(0, 19) != match[1]) {
    return null;
  }
  return BigInt.from(whole.millisecondsSinceEpoch) * BigInt.from(1000000) +
      BigInt.parse((match[2] ?? '').padRight(9, '0'));
}
