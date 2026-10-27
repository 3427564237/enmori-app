import 'event_detail_repository.dart';

/// Platform handoff only. A true result never means saved or registered.
abstract interface class EventActions {
  Future<bool> openMap(EventDetail event, bool Function() current);
  Future<bool> editCalendar(EventDetail event, bool Function() current);
}

final class VenueAddress {
  const VenueAddress({
    required this.street,
    this.street2,
    required this.city,
    required this.postalCode,
    required this.countryCode,
  });
  final String street, city, postalCode, countryCode;
  final String? street2;
  String get formatted =>
      [street, ?street2, city, postalCode, countryCode].join(', ');
}
