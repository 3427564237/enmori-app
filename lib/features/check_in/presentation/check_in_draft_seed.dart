/// Temporary editor input, never a persisted template or a copy of a record.
/// Deliberately excludes identity, timestamps, sharing, place and weather.
final class CheckInDraftSeed {
  const CheckInDraftSeed({required this.note, this.mood, this.activity});

  final String note;
  final String? mood, activity;
}
