import '../../event_detail/domain/event_content.dart';
import '../../event_detail/domain/event_cover.dart';
import '../../../core/network/backend_api_client.dart';
import '../../../core/network/utc_timestamp_parser.dart';
import '../../../core/result/result.dart';
import '../domain/event_recommendation_repository.dart';

const _formulaVersion = 'event_recommendation_v1';
const _reasonCode = 'interest_match';

final class BackendEventRecommendationRepository
    implements EventRecommendationRepository {
  BackendEventRecommendationRepository(this._client, {this.activityAreaCode});
  final String? Function()? activityAreaCode;

  final BackendApiClient _client;

  @override
  Future<Result<EventRecommendationResponse>> read({
    required EventRecommendationView view,
  }) async {
    final response = await _client.get(
      '/v1/recommendations/events?view=${view.name}${activityAreaCode?.call() == null ? '' : '&activityAreaCode=${Uri.encodeQueryComponent(activityAreaCode!.call()!)}'}',
      contractVersion: 3,
      readTimeout: const Duration(seconds: 225),
    );
    return switch (response) {
      Failure<JsonObject>(:final failure) => Failure(failure),
      Success<JsonObject>(:final value) => _parse(value),
    };
  }

  Result<EventRecommendationResponse> _parse(JsonObject value) {
    final asOf = tryParseUtcTimestamp(value['asOf']);
    final formulaVersion = value['formulaVersion'];
    final items = value['items'];
    if (asOf == null ||
        formulaVersion is! String ||
        ![
          _formulaVersion,
          'event_recommendation_v2',
          'event_recommendation_v3',
        ].contains(formulaVersion) ||
        items is! List) {
      return _invalidResponse();
    }

    final v2 = formulaVersion != _formulaVersion;
    final parsedItems = <EventRecommendation>[];
    final ids = <String>{};
    for (final item in items) {
      if (item is! Map<String, dynamic>) return _invalidResponse();
      for (final field in [
        'locationLabel',
        'shortDescription',
        'coverImageUrl',
      ]) {
        if (item[field] != null && item[field] is! String) {
          return _invalidResponse();
        }
      }
      final eventId = item['eventId'];
      final title = item['title'];
      final startAt = tryParseUtcTimestamp(item['startAt']);
      final endAt = tryParseUtcTimestamp(item['endAt']);
      final startInstant = tryParseEventInstant(item['startAt']);
      final endInstant = tryParseEventInstant(item['endAt']);
      final matchedInterests = item['matchedInterests'];
      final reasonCode = item['reasonCode'];
      if (eventId is! String ||
          eventId.isEmpty ||
          title is! String ||
          title.isEmpty ||
          startAt == null ||
          startInstant == null ||
          (item.containsKey('endAt') &&
              (endAt == null ||
                  endInstant == null ||
                  endInstant <= startInstant)) ||
          matchedInterests is! List ||
          (!v2 && matchedInterests.isEmpty) ||
          reasonCode != (v2 ? 'relevance_match' : _reasonCode)) {
        return _invalidResponse();
      }
      final parsedInterests = <MatchedInterest>[];
      for (final interest in matchedInterests) {
        if (interest is! Map<String, dynamic>) return _invalidResponse();
        final interestTagId = interest['interestTagId'];
        final displayName = interest['displayName'];
        if (interestTagId is! String ||
            interestTagId.isEmpty ||
            displayName is! String ||
            displayName.isEmpty) {
          return _invalidResponse();
        }
        parsedInterests.add(
          MatchedInterest(
            interestTagId: interestTagId,
            displayName: displayName,
          ),
        );
      }
      if (!ids.add(eventId)) return _invalidResponse();
      final reasons = <EventRecommendationReason>[];
      if (v2) {
        final rows = item['reasons'];
        if (rows is! List || rows.isEmpty || rows.length > 5) {
          return _invalidResponse();
        }
        final seen = <String>{};
        for (final row in rows) {
          if (row is! Map<String, dynamic> || row.length != 3) {
            return _invalidResponse();
          }
          final code = row['code'],
              count = row['count'],
              points = row['points'];
          if (code is! String ||
              count is! int ||
              points is! int ||
              count < 1 ||
              count > 1000 ||
              !seen.add(code)) {
            return _invalidResponse();
          }
          final expected = switch (code) {
            'shared_interests' =>
              count == parsedInterests.length ? count * 4 : -1,
            'friends_participating' => (count > 5 ? 5 : count) * 2,
            'same_area' =>
              formulaVersion == 'event_recommendation_v3' && count == 1
                  ? 2
                  : -1,
            'target_age' =>
              formulaVersion == 'event_recommendation_v3' && count == 1
                  ? 1
                  : -1,
            'same_region' => count == 1 ? 1 : -1,
            _ => -1,
          };
          if (points != expected || expected < 1) return _invalidResponse();
          reasons.add(
            EventRecommendationReason(code: code, count: count, points: points),
          );
        }
        if (seen.contains('shared_interests') != parsedInterests.isNotEmpty) {
          return _invalidResponse();
        }
      }
      EventContent? content;
      try {
        content = EventContent.parse(item['content']);
      } catch (_) {
        return _invalidResponse();
      }
      parsedItems.add(
        EventRecommendation(
          eventId: eventId,
          content: content,
          locationLabel: item['locationLabel'] as String?,
          shortDescription: item['shortDescription'] as String?,
          coverImageUrl: validEventCoverUrl(item['coverImageUrl'])
              ? item['coverImageUrl'] as String
              : null,
          title: title,
          startAt: startAt,
          endAt: endAt,
          matchedInterests: parsedInterests,
          reasonCode: reasonCode,
          reasons: List.unmodifiable(reasons),
        ),
      );
    }
    return Success(
      EventRecommendationResponse(
        asOf: asOf,
        formulaVersion: formulaVersion,
        items: parsedItems,
      ),
    );
  }

  Failure<EventRecommendationResponse> _invalidResponse() => const Failure(
    AppFailure(
      kind: AppFailureKind.unexpected,
      message: 'The service returned invalid Event recommendations.',
    ),
  );
}
