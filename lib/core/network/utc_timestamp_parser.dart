DateTime? tryParseUtcTimestamp(Object? value) {
  if (value is! String) return null;
  if (!value.endsWith('Z') && !value.endsWith('+00:00')) return null;

  final parsed = DateTime.tryParse(value);
  if (parsed == null || !parsed.isUtc) return null;
  return parsed;
}
