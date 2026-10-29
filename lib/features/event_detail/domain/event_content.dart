import 'event_source_url.dart';

final class EventContent {
  const EventContent({
    required this.provider,
    required this.detailUrl,
    required this.timeZone,
    this.bookingUrl,
    this.detailsStatus,
    this.fullDescription,
    this.status,
    this.priceLabel,
    this.registrationDeadline,
    this.minimumAge,
    this.maximumAge,
    this.sections = const [],
  });
  final String provider, detailUrl, timeZone;
  final String? detailsStatus;
  final String? bookingUrl,
      fullDescription,
      status,
      priceLabel,
      registrationDeadline;
  final int? minimumAge, maximumAge;
  final List<({String heading, String text})> sections;
  String get sourceName => provider == 'onepa' ? 'onePA' : 'Ticketmaster';
  static EventContent? parse(Object? value) {
    if (value == null) return null;
    if (value is! Map<String, dynamic>) {
      throw const FormatException('Invalid event content');
    }
    String? text(String key, int max) {
      final v = value[key];
      if (v == null) return null;
      if (v is! String ||
          v.trim().isEmpty ||
          v.runes.length > max ||
          RegExp(
            r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f\u202a-\u202e\u2066-\u2069<>]',
          ).hasMatch(v)) {
        throw const FormatException('Invalid content');
      }
      return v;
    }

    final provider = text('provider', 20),
        detail = text('detailUrl', 2048),
        booking = text('bookingUrl', 2048);
    if (!['onepa', 'ticketmaster'].contains(provider) ||
        detail == null ||
        !validActivitySourceUrl(Uri.parse(detail)) ||
        (booking != null && !validActivitySourceUrl(Uri.parse(booking))) ||
        value['timeZone'] != 'Asia/Singapore') {
      throw const FormatException('Invalid source');
    }
    final sections = <({String heading, String text})>[];
    final rows = value['sections'];
    if (rows != null) {
      if (rows is! List || rows.length > 12) {
        throw const FormatException('Invalid sections');
      }
      for (final row in rows) {
        if (row is! Map ||
            row['heading'] is! String ||
            row['text'] is! String ||
            (row['heading'] as String).length > 100 ||
            (row['text'] as String).length > 12000) {
          throw const FormatException('Invalid section');
        }
        sections.add((
          heading: row['heading'] as String,
          text: row['text'] as String,
        ));
      }
    }
    int? age(String key) {
      final v = value[key];
      if (v != null && (v is! int || v < 0 || v > 150)) {
        throw const FormatException('Invalid age');
      }
      return v as int?;
    }

    return EventContent(
      provider: provider!,
      detailsStatus: text('detailsStatus', 30),
      detailUrl: detail,
      bookingUrl: booking,
      timeZone: 'Asia/Singapore',
      fullDescription: text('fullDescription', 30000),
      status: text('status', 30),
      priceLabel: text('priceLabel', 500),
      registrationDeadline: text('registrationDeadline', 100),
      minimumAge: age('minimumAge'),
      maximumAge: age('maximumAge'),
      sections: List.unmodifiable(sections),
    );
  }
}

extension EventSourceAddress on EventContent {
  String? get address =>
      sections.where((s) => s.heading == 'Address').firstOrNull?.text;
}
