import 'dart:convert';

import '../../../core/network/backend_api_client.dart';
import '../../../core/network/utc_timestamp_parser.dart';
import '../../../core/result/result.dart';
import '../domain/activity_repository.dart';

bool validBrowseId(Object? value) {
  if (value is! String ||
      value.length < 5 ||
      value.length > 174 ||
      !RegExp(r'^tm_[A-Za-z0-9_-]+$').hasMatch(value)) {
    return false;
  }
  try {
    final source = utf8.decode(
      base64Url.decode(base64Url.normalize(value.substring(3))),
      allowMalformed: false,
    );
    return RegExp(r'^[A-Za-z0-9_-]{1,128}$').hasMatch(source) &&
        'tm_${base64Url.encode(utf8.encode(source)).replaceAll('=', '')}' ==
            value;
  } catch (_) {
    return false;
  }
}

bool validActivitySourceUrl(Uri url) =>
    url.scheme == 'https' &&
    const ['ticketmaster.sg', 'www.ticketmaster.sg'].contains(url.host) &&
    url.userInfo.isEmpty &&
    !url.hasFragment &&
    (!url.hasPort || url.port == 443) &&
    url.toString().length <= 2048 &&
    !RegExp(r'[\s\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]')
        .hasMatch(url.toString()) &&
    !url.queryParameters.keys.any(
      (k) => RegExp(
        r'^(api[_-]?key|token|access_token|secret|password|authorization)$',
        caseSensitive: false,
      ).hasMatch(k),
    );

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
  );
}

final class BackendActivityRepository implements ActivityRepository {
  BackendActivityRepository(this.client);
  final BackendApiClient client;
  Failure<ActivityRead> _invalid() => const Failure(
    AppFailure(
      kind: AppFailureKind.serviceUnavailable,
      message: 'Activities are unavailable. Try again.',
    ),
  );
  @override
  Future<Result<ActivityRead>> read(String? browseId) async {
    if (browseId != null && !validBrowseId(browseId)) return _invalid();
    final result = await client.get(
      browseId == null
          ? '/v1/event-browse'
          : '/v1/event-browse/${Uri.encodeComponent(browseId)}',
    );
    if (result case Failure<JsonObject>(:final failure)) {
      return Failure(failure);
    }
    try {
      final raw = (result as Success<JsonObject>).value;
      if (browseId == null) {
        if (raw.keys.any(
              (k) => !const ['asOf', 'scope', 'items'].contains(k),
            ) ||
            raw['scope'] != 'ticketmaster_sg_first_batch_v1' ||
            _instant(raw['asOf']) == null ||
            raw['items'] is! List) {
          return _invalid();
        }
        final rows = raw['items']! as List;
        if (rows.length > 20) return _invalid();
        final items = <ActivitySummary>[];
        final ids = <String>{};
        for (final row in rows) {
          if (row is! Map<String, dynamic> ||
              row.keys.any(
                (k) => !const [
                  'browseId',
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
          ActivityBatch(asOf: raw['asOf']! as String, items: items),
        );
      }
      if (raw.keys.any(
            (k) => !const [
              'browseId',
              'title',
              'startAt',
              'endAt',
              'externalSourceUrl',
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
      ]) {
        if (raw.containsKey(field) && !_text(raw[field], max)) {
          return _invalid();
        }
      }
      return Success(
        ActivityDetail(
          summary: summary,
          sourceUrl: url,
          locationLabel: raw['locationLabel'] as String?,
          categoryLabel: raw['categoryLabel'] as String?,
        ),
      );
    } catch (_) {
      return _invalid();
    }
  }
}
