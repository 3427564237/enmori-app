import 'dart:typed_data';

/// Only an occurrence-supplied asset on the approved Ticketmaster image host.
bool validEventCoverUrl(Object? value) {
  if (value is! String ||
      value.length > 2048 ||
      value.runes.any((rune) => rune >= 0xd800 && rune <= 0xdfff) ||
      RegExp(r'[\s\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]')
          .hasMatch(value)) return false;
  final url = Uri.tryParse(value);
  return url != null &&
      url.scheme == 'https' &&
      url.host == 's1.ticketm.net' &&
      url.userInfo.isEmpty &&
      (!url.hasPort || url.port == 443) &&
      !url.hasQuery &&
      !url.hasFragment &&
      url.path.isNotEmpty && url.path != '/';
}

abstract interface class EventCoverLoad {
  Future<Uint8List?> get bytes;
  void cancel();
}

abstract interface class EventCoverLoader {
  EventCoverLoad start(String sourceUrl);
}
