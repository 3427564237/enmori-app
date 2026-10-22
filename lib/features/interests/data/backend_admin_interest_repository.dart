import '../../../core/network/backend_api_client.dart';
import '../../../core/result/result.dart';
import '../domain/admin_interest_repository.dart';
import '../domain/interest_repository.dart';

final class BackendAdminInterestRepository implements AdminInterestRepository {
  BackendAdminInterestRepository(this._client);

  final BackendApiClient _client;

  @override
  Future<Result<bool>> readCapability({
    required bool Function() current,
  }) async {
    final response = await _client.getInterestAdminCapability(current);
    if (response case Failure<JsonObject>(:final failure)) {
      return Failure(failure);
    }
    final value = (response as Success<JsonObject>).value;
    final allowed = value['canCreateInterestTags'];
    return value.length == 1 && allowed is bool
        ? Success(allowed)
        : const Failure(_invalidResponse);
  }

  @override
  Future<Result<List<InterestTagOption>>> readCatalogue({
    required bool Function() current,
  }) async {
    final response = await _client.getInterestAdminCatalogue(current);
    if (response case Failure<JsonObject>(:final failure)) {
      return Failure(failure);
    }
    final value = (response as Success<JsonObject>).value;
    final rawTags = value['interestTags'];
    if (value.length != 1 || rawTags is! List) {
      return const Failure(_invalidResponse);
    }
    final tags = <InterestTagOption>[];
    final ids = <String>{};
    for (final raw in rawTags) {
      if (raw is! Map<String, dynamic> ||
          raw.length != 2 ||
          !_validIdentity(raw['interestTagId']) ||
          !_validDisplayName(raw['displayName'])) {
        return const Failure(_invalidResponse);
      }
      final id = raw['interestTagId'] as String;
      if (!ids.add(id)) return const Failure(_invalidResponse);
      tags.add(
        InterestTagOption(
          interestTagId: id,
          displayName: raw['displayName'] as String,
        ),
      );
    }
    return Success(List.unmodifiable(tags));
  }

  @override
  Future<Result<CreatedInterestTag>> create({
    required String displayName,
    required bool Function() current,
  }) async {
    final response = await _client.createInterestTag(displayName, current);
    if (response case Failure<JsonObject>(:final failure)) {
      return Failure(failure);
    }
    final value = (response as Success<JsonObject>).value;
    final tag = value['interestTag'];
    if (value.length != 1 ||
        tag is! Map<String, dynamic> ||
        tag.length != 4 ||
        !_validIdentity(tag['interestTagId']) ||
        !_validDisplayName(tag['displayName']) ||
        tag['lifecycleState'] != 'active' ||
        tag['revision'] is! int ||
        tag['revision'] != 1) {
      return const Failure(_invalidResponse);
    }
    return Success(
      CreatedInterestTag(
        interestTagId: tag['interestTagId'] as String,
        displayName: tag['displayName'] as String,
      ),
    );
  }
}

bool _validIdentity(Object? value) => value is String && value.isNotEmpty;
bool _validDisplayName(Object? value) =>
    value is String &&
    value == value.trim() &&
    value.runes.length <= 50 &&
    adminInterestNameError(value) == null;

const _invalidResponse = AppFailure(
  kind: AppFailureKind.unexpected,
  message: 'The service returned an invalid interest catalogue response.',
);
