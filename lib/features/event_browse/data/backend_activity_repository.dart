import '../../event_detail/domain/event_source_url.dart';
export '../../event_detail/domain/event_source_url.dart';
import '../../event_detail/domain/event_content.dart';

import 'dart:convert';

import '../../../core/network/backend_api_client.dart';
import '../../../core/network/utc_timestamp_parser.dart';
import '../../../core/result/result.dart';
import '../domain/activity_repository.dart';
import '../../event_detail/domain/event_cover.dart';

bool validBrowseId(Object? value) {
  if (value is! String ||
      value.length < 5 ||
      value.length > 174 ||
      !RegExp(r'^(tm|pa)_[A-Za-z0-9_-]+$').hasMatch(value)) {
    return false;
  }
  try {
    final source = utf8.decode(
      base64Url.decode(base64Url.normalize(value.substring(3))),
      allowMalformed: false,
    );
    return RegExp(r'^[A-Za-z0-9_-]{1,128}$').hasMatch(source) &&
        '${value.substring(0, 3)}${base64Url.encode(utf8.encode(source)).replaceAll('=', '')}' ==
            value;
  } catch (_) {
    return false;
  }
}

bool _text(Object? v, int max) =>
    v is String &&
    v.trim().isNotEmpty &&
    v.runes.length <= max &&
    !v.runes.any((r) => r >= 0xd800 && r <= 0xdfff) &&
    !RegExp(r'[\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069<>]|```')
        .hasMatch(v);

BigInt? _instant(Object? value) {
  if (value is! String || tryParseUtcTimestamp(value) == null) return null;
  final m = RegExp(r'^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?Z$')
      .firstMatch(value);
  if (m == null) return null;
  final whole = DateTime.parse('${m[1]}Z');
  if (whole.toIso8601String().substring(0, 19) != m[1]) return null;
  return BigInt.from(whole.millisecondsSinceEpoch) * BigInt.from(1000000) +
      BigInt.parse((m[2] ?? '').padRight(9, '0'));
}

ActivitySummary? _summary(Map<String, Object?> raw) {
  final start = _instant(raw['startAt']), end = _instant(raw['endAt']);
  if (!validBrowseId(raw['browseId']) ||
      (raw.containsKey('locationLabel') && !_text(raw['locationLabel'], 200)) ||
      (raw.containsKey('categoryLabel') && !_text(raw['categoryLabel'], 100)) ||
      (raw.containsKey('eventId') &&
          (raw['eventId'] is! String ||
              !RegExp(r'^(tm|pa)_event_[0-9a-f]{64}$')
                  .hasMatch(raw['eventId'] as String))) ||
      !_text(raw['title'], 200) ||
      start == null ||
      (raw.containsKey('endAt') && (end == null || end <= start))) {
    return null;
  }
  return ActivitySummary(
    browseId: raw['browseId']! as String,
    title: raw['title']! as String,
    startAt: raw['startAt']! as String,
    endAt: raw['endAt'] as String?,
    eventId: raw['eventId'] as String?,
    locationLabel: raw['locationLabel'] as String?,
    categoryLabel: raw['categoryLabel'] as String?,
    content: EventContent.parse(raw['content']),
    shortDescription: raw['shortDescription'] as String?,
    coverImageUrl: validEventCoverUrl(raw['coverImageUrl'])
        ? raw['coverImageUrl'] as String
        : null,
  );
}

final class BackendActivityRepository implements PagedActivityRepository {
  BackendActivityRepository(this.client);
  final BackendApiClient client;
  Failure<ActivityRead> _invalid() => const Failure(
    AppFailure(
      kind: AppFailureKind.serviceUnavailable,
      message: 'Activities are unavailable. Try again.',
    ),
  );
  @override
  Future<Result<ActivityRead>> read(String? browseId) => _read(browseId, null);
  @override
  Future<Result<ActivityRead>> readNext(String cursor) {
    if (!_cursor(cursor)) return Future.value(_invalid());
    return _read(null, cursor);
  }

  bool _cursor(Object? value) =>
      value is String &&
      value.length <= 512 &&
      RegExp(r'^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$').hasMatch(value) &&
      !value.endsWith('\n');
  Future<Result<ActivityRead>> _read(String? browseId, String? cursor) async {
    if (browseId != null && !validBrowseId(browseId)) return _invalid();
    final result = await client.get(
      browseId == null
          ? '/v1/event-browse${cursor == null ? '' : '?cursor=${Uri.encodeQueryComponent(cursor)}'}'
          : '/v1/event-browse/${Uri.encodeComponent(browseId)}',
      contractVersion: 3,
      readTimeout: browseId == null ? null : const Duration(seconds: 30),
    );
    if (result case Failure<JsonObject>(:final failure)) {
      return Failure(failure);
    }
    try {
      final raw = (result as Success<JsonObject>).value;
      if (browseId == null) {
        if (raw.keys.any(
              (k) => !const [
                'asOf',
                'scope',
                'items',
                'nextCursor',
                'sourceStatus',
              ].contains(k),
            ) ||
            ![
              'ticketmaster_sg_first_batch_v1',
              'singapore_events_v2',
            ].contains(raw['scope']) ||
            _instant(raw['asOf']) == null ||
            raw['items'] is! List ||
            (raw.containsKey('nextCursor') && !_cursor(raw['nextCursor']))) {
          return _invalid();
        }
        final rows = raw['items']! as List;
        if (rows.length > 40) return _invalid();
        final items = <ActivitySummary>[];
        final ids = <String>{};
        for (final row in rows) {
          if (row is! Map<String, dynamic> ||
              row.keys.any(
                (k) => !const [
                  'content',
                  'shortDescription',
                  'coverImageUrl',
                  'browseId',
                  'eventId',
                  'locationLabel',
                  'categoryLabel',
                  'title',
                  'startAt',
                  'endAt',
                ].contains(k),
              )) {
            return _invalid();
          }
          final item = _summary(row);
          if (item == null || !ids.add(item.browseId)) return _invalid();
          items.add(item);
        }
        return Success(
          ActivityBatch(
            asOf: raw['asOf']! as String,
            items: items,
            sourceStatus: {
              for (final row in (raw['sourceStatus'] as List? ?? const []))
                (row as Map)['provider'] as String: row['available'] as bool,
            },
            nextCursor: raw['nextCursor'] as String?,
          ),
        );
      }
      if (raw.keys.any(
            (k) => !const [
              'content',
              'browseId',
              'eventId',
              'title',
              'startAt',
              'endAt',
              'externalSourceUrl',
              'shortDescription',
              'coverImageUrl',
              'locationLabel',
              'categoryLabel',
            ].contains(k),
          ) ||
          raw['browseId'] != browseId) {
        return _invalid();
      }
      final summary = _summary(raw), source = raw['externalSourceUrl'];
      if (summary == null ||
          source is! String ||
          RegExp(r'[\s\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]')
              .hasMatch(source)) {
        return _invalid();
      }
      final url = Uri.tryParse(source);
      if (url == null || !validActivitySourceUrl(url)) return _invalid();
      for (final (field, max) in [
        ('locationLabel', 200),
        ('categoryLabel', 100),
        ('shortDescription', 1000),
      ]) {
        if (raw.containsKey(field) && !_text(raw[field], max)) {
          return _invalid();
        }
      }
      return Success(
        ActivityDetail(
          summary: summary,
          content: EventContent.parse(raw['content']),
          sourceUrl: url,
          locationLabel: raw['locationLabel'] as String?,
          categoryLabel: raw['categoryLabel'] as String?,
          shortDescription: raw['shortDescription'] as String?,
          coverImageUrl: validEventCoverUrl(raw['coverImageUrl'])
              ? raw['coverImageUrl'] as String
              : null,
        ),
      );
    } catch (_) {
      return _invalid();
    }
  }
}
