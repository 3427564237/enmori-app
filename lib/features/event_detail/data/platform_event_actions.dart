import '../domain/event_content.dart';

import 'package:flutter/services.dart';

import '../domain/event_actions.dart';
import '../domain/event_detail_repository.dart';

final class PlatformEventActions implements EventActions {
  const PlatformEventActions();
  static const channel = MethodChannel('com.enmori.app/event_actions');

  @override
  Future<bool> openMap(EventDetail event, bool Function() current) async {
    final address = event.venueAddress;
    if (address == null) {
      final text = event.content?.address;
      if (text == null || !current()) return false;
      try {
        return await channel.invokeMethod<bool>('openSourceAddress', {
              'address': text,
              'countryCode': 'SG',
            }) ==
            true;
      } catch (_) {
        return false;
      }
    }
    try {
      if (!current()) return false;
      return await channel.invokeMethod<bool>('openMap', {
            'street': address.street,
            if (address.street2 != null) 'street2': address.street2,
            'city': address.city,
            'postalCode': address.postalCode,
            'countryCode': address.countryCode,
          }) ==
          true;
    } catch (_) {
      return false;
    }
  }

  @override
  Future<bool> editCalendar(EventDetail event, bool Function() current) async {
    final url = Uri.tryParse(event.externalSourceUrl);
    if (url == null ||
        url.scheme != 'https' ||
        !{
          'ticketmaster.sg',
          'www.ticketmaster.sg',
          'www1.ticketmaster.sg',
          'www.onepa.gov.sg',
        }.contains(url.host) ||
        url.userInfo.isNotEmpty ||
        url.hasFragment ||
        (url.hasPort && url.port != 443)) {
      return false;
    }
    try {
      if (!current()) return false;
      return await channel.invokeMethod<bool>('editCalendar', {
            'title': event.title,
            'startMillis': event.startAt.millisecondsSinceEpoch,
            'endMillis': ?event.endAt?.millisecondsSinceEpoch,
            'location': ?(event.venueAddress?.formatted ?? event.locationLabel),
            'url': event.externalSourceUrl,
          }) ==
          true;
    } catch (_) {
      return false;
    }
  }
}
