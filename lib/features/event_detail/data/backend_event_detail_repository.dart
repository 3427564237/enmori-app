import 'package:flutter/services.dart';

import '../../../core/network/backend_api_client.dart';
import '../../../core/network/utc_timestamp_parser.dart';
import '../../../core/result/result.dart';
import '../domain/event_detail_repository.dart';
import '../domain/event_cover.dart';

final class BackendEventDetailRepository implements EventDetailRepository {
  BackendEventDetailRepository(this.client);
  final BackendApiClient client;
  @override
  Future<Result<EventDetail>> read(String eventId) async {
    final result = await client.get(
      '/v1/events/${Uri.encodeComponent(eventId)}',
    );
    if (result case Failure<JsonObject>(:final failure)) {
      return Failure(failure);
    }
    final value = (result as Success<JsonObject>).value['event'];
    const fields = [
      'eventId',
      'title',
      'startAt',
      'externalSourceUrl',
      'endAt',
      'locationLabel',
      'categoryLabel',
      'shortDescription',
      'coverImageUrl',
    ];
    bool text(Object? v, int max) =>
        v is String &&
        v.trim().isNotEmpty &&
        !v.runes.any((rune) => rune >= 0xd800 && rune <= 0xdfff) &&
        v.runes.length <= max;
    if (value is! Map<String, dynamic> ||
        value.keys.any((key) => !fields.contains(key)) ||
        value['eventId'] != eventId ||
        !text(value['title'], 200) ||
        !text(value['externalSourceUrl'], 2048)) {
      return _invalid();
    }
    final start = tryParseUtcTimestamp(value['startAt']);
    final startInstant = tryParseEventInstant(value['startAt']);
    final url = Uri.tryParse(value['externalSourceUrl'] as String);
    if (start == null ||
        startInstant == null ||
        url?.scheme != 'https' ||
        url!.host.isEmpty ||
        url.userInfo.isNotEmpty ||
        url.hasFragment) {
      return _invalid();
    }
    final end = tryParseUtcTimestamp(value['endAt']);
    final endInstant = tryParseEventInstant(value['endAt']);
    if (value.containsKey('endAt') &&
        (end == null || endInstant == null || endInstant <= startInstant)) {
      return _invalid();
    }
    for (final (key, max) in [
      ('locationLabel', 200),
      ('categoryLabel', 100),
      ('shortDescription', 1000),
    ]) {
      if (value.containsKey(key) && !text(value[key], max)) return _invalid();
    }
    return Success(
      EventDetail(
        eventId: eventId,
        title: value['title'] as String,
        startAt: start,
        externalSourceUrl: value['externalSourceUrl'] as String,
        endAt: end,
        locationLabel: value['locationLabel'] as String?,
        categoryLabel: value['categoryLabel'] as String?,
        shortDescription: value['shortDescription'] as String?,
        coverImageUrl: validEventCoverUrl(value['coverImageUrl'])
            ? value['coverImageUrl'] as String
            : null,
      ),
    );
  }

  @override
  Future<Result<void>> copyLink(EventDetail event) async {
    try {
      await Clipboard.setData(ClipboardData(text: event.externalSourceUrl));
      return const Success(null);
    } catch (_) {
      return const Failure(
        AppFailure(
          kind: AppFailureKind.unexpected,
          message: 'Could not copy the link. Try again.',
        ),
      );
    }
  }

  Failure<EventDetail> _invalid() => const Failure(
    AppFailure(
      kind: AppFailureKind.unexpected,
      message: 'The service returned an invalid event.',
    ),
  );
}
