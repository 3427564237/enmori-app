import '../../../core/network/backend_api_client.dart';
import '../../../core/network/utc_timestamp_parser.dart';
import '../../../core/result/result.dart';
import '../domain/event_recommendation_repository.dart';

const _formulaVersion = 'event_recommendation_v1';
const _reasonCode = 'interest_match';

final class BackendEventRecommendationRepository
    implements EventRecommendationRepository {
  BackendEventRecommendationRepository(this._client);

  final BackendApiClient _client;

  @override
  Future<Result<EventRecommendationResponse>> read({
    required EventRecommendationView view,
  }) async {
    final response = await _client.get(
      '/v1/recommendations/events?view=${view.name}',
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
        formulaVersion != _formulaVersion ||
        items is! List) {
      return _invalidResponse();
    }

    final parsedItems = <EventRecommendation>[];
    for (final item in items) {
      if (item is! Map<String, dynamic>) return _invalidResponse();
      final eventId = item['eventId'];
      final title = item['title'];
      final startAt = tryParseUtcTimestamp(item['startAt']);
      final endAt = tryParseUtcTimestamp(item['endAt']);
      final matchedInterests = item['matchedInterests'];
      final reasonCode = item['reasonCode'];
      if (eventId is! String ||
          eventId.isEmpty ||
          title is! String ||
          title.isEmpty ||
          startAt == null ||
          endAt == null ||
          matchedInterests is! List ||
          matchedInterests.isEmpty ||
          reasonCode != _reasonCode) {
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
      parsedItems.add(
        EventRecommendation(
          eventId: eventId,
          title: title,
          startAt: startAt,
          endAt: endAt,
          matchedInterests: parsedInterests,
          reasonCode: reasonCode,
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
