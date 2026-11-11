import '../../../core/network/backend_api_client.dart';
import '../../../core/network/utc_timestamp_parser.dart';
import '../../check_in/domain/check_in_repository.dart';
import '../../../core/result/result.dart';
import '../domain/friend_activity_repository.dart';

final class BackendFriendActivityRepository
    implements FriendActivityRepository {
  BackendFriendActivityRepository(this.client);
  final BackendApiClient client;
  @override
  Future<Result<List<FriendActivityItem>>> read({
    required bool home,
    FriendActivityType? category,
  }) async {
    final response = await client.get(
      '/v1/me/friends/activity?view=${home ? 'home' : 'all'}&category=${category?.wire ?? 'all'}',
      readTimeout: category == FriendActivityType.checkIn
          ? null
          : const Duration(seconds: 225),
    );
    if (response case Failure<JsonObject>(:final failure)) {
      return Failure(failure);
    }
    final body = (response as Success<JsonObject>).value;
    try {
      if (body.length != 1 || body['activities'] is! List) {
        {
          throw const FormatException();
        }
      }
      final rows = <FriendActivityItem>[], seen = <String>{};
      for (final raw in body['activities'] as List) {
        if (raw is! Map ||
            raw.length != 6 ||
            !raw.keys.toSet().containsAll({
              'type',
              'sourceRecordId',
              'occurredAt',
              'username',
              'displayName',
            }) ||
            raw['sourceRecordId'] is! String ||
            raw['username'] is! String ||
            raw['occurredAt'] is! String ||
            (raw['displayName'] != null && raw['displayName'] is! String)) {
          {
            throw const FormatException();
          }
        }
        final type = FriendActivityType.values.singleWhere(
          (t) => t.wire == raw['type'],
        );
        if (category != null && type != category) {
          throw const FormatException();
        }
        final time = tryParseUtcTimestamp(raw['occurredAt']);
        if (time == null ||
            time.toIso8601String() != raw['occurredAt'] ||
            !_id(raw['sourceRecordId']) ||
            !_id(raw['username'])) {
          throw const FormatException();
        }
        String? note, mood, eventId, title;
        if (type == FriendActivityType.checkIn) {
          final content = raw['checkIn'];
          if (content is! Map ||
              !content.containsKey('note') ||
              !content.keys.every({'note', 'mood'}.contains) ||
              content['note'] is! String ||
              (content.containsKey('mood') &&
                  (content['mood'] is! String ||
                      (content['mood'] as String).isEmpty ||
                      (content['mood'] as String).trim() != content['mood'] ||
                      (content['mood'] as String).runes.length > 50))) {
            throw const FormatException();
          }
          note = content['note'] as String;
          mood = content['mood'] as String?;
          final normalized = normalizeCheckInNote(note, mood: mood);
          if (normalized is! Success<String> || normalized.value != note) {
            throw const FormatException();
          }
        } else {
          final event = raw['event'];
          if (event is! Map ||
              event.length != 2 ||
              !event.keys.toSet().containsAll({'eventId', 'title'}) ||
              !_id(event['eventId']) ||
              ((event['eventId'] as String).startsWith('tm_') &&
                  !RegExp(r'^tm_event_[0-9a-f]{64}$')
                      .hasMatch(event['eventId'] as String)) ||
              event['title'] is! String ||
              (event['title'] as String).isEmpty ||
              (event['title'] as String).trim() != event['title'] ||
              (event['title'] as String).length > 500) {
            throw const FormatException();
          }
          eventId = event['eventId'] as String;
          title = event['title'] as String;
        }
        if (!seen.add('${type.wire}/${raw['sourceRecordId']}')) {
          {
            throw const FormatException();
          }
        }
        rows.add(
          FriendActivityItem(
            type: type,
            sourceRecordId: raw['sourceRecordId'] as String,
            occurredAt: time,
            note: note,
            mood: mood,
            eventId: eventId,
            eventTitle: title,
            username: raw['username'] as String,
            displayName: raw['displayName'] as String?,
          ),
        );
      }
      if (home && rows.length > 2) {
        throw const FormatException();
      }
      return Success(List.unmodifiable(rows));
    } catch (_) {
      return const Failure(
        AppFailure(
          kind: AppFailureKind.unexpected,
          message: 'Friends Activity is unavailable. Reload to try again.',
        ),
      );
    }
  }
}

bool _id(Object? value) =>
    value is String &&
    value.isNotEmpty &&
    value.length <= 128 &&
    !RegExp(r'[^A-Za-z0-9_-]').hasMatch(value);
