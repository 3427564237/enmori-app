import '../../../core/network/backend_api_client.dart';
import '../../../core/network/utc_timestamp_parser.dart';
import '../../../core/result/result.dart';
import '../domain/event_recommendation_repository.dart';

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
    if (asOf == null || formulaVersion is! String || items is! List) {
      return _invalidResponse();
    }

    final parsedItems = <EventRecommendation>[];
    for (final item in items) {
      if (item is! Map<String, dynamic>) return _invalidResponse();
      final eventId = item['eventId'];
      final title = item['title'];
      final startAt = tryParseUtcTimestamp(item['startAt']);
      final endAt = tryParseUtcTimestamp(item['endAt']);
      final labels = item['matchedInterestLabels'];
      final reasonCode = item['reasonCode'];
      if (eventId is! String ||
          title is! String ||
          startAt == null ||
          endAt == null ||
          labels is! List ||
          labels.any((label) => label is! String) ||
          reasonCode is! String) {
        return _invalidResponse();
      }
      parsedItems.add(
        EventRecommendation(
          eventId: eventId,
          title: title,
          startAt: startAt,
          endAt: endAt,
          matchedInterestLabels: labels.cast<String>(),
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
