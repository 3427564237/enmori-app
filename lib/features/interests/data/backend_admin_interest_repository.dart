import '../../../core/network/backend_api_client.dart';
import '../../../core/result/result.dart';
import '../domain/admin_interest_repository.dart';
import '../domain/interest_repository.dart';

final class BackendAdminInterestRepository
    implements AdminInterestManagementRepository {
  BackendAdminInterestRepository(this._client);

  final BackendApiClient _client;

  // Deployed reference inventory is not yet independently verified.
  @override
  bool get permanentDeletionAvailable => false;

  @override
  Future<Result<List<ManagedInterestTag>>> readManagementCatalogue({
    required bool Function() current,
  }) async {
    final response = await _client.getInterestManagementCatalogue(current);
    if (response case Failure<JsonObject>(:final failure)) {
      return Failure(failure);
    }
    final body = (response as Success<JsonObject>).value,
        rows = body['interestTags'];
    if (body.length != 1 || rows is! List) {
      return const Failure(_invalidResponse);
    }
    final tags = <ManagedInterestTag>[], ids = <String>{};
    String? prior;
    for (final row in rows) {
      final tag = _managed(row);
      if (tag == null ||
          !ids.add(tag.interestTagId) ||
          prior != null && prior.compareTo(tag.interestTagId) >= 0) {
        return const Failure(_invalidResponse);
      }
      tags.add(tag);
      prior = tag.interestTagId;
    }
    return Success(List.unmodifiable(tags));
  }

  @override
  Future<Result<ManagedInterestTag>> rename({
    required ManagedInterestTag expected,
    required String displayName,
    required bool Function() current,
  }) => _update(expected, {
    'expectedRevision': expected.revision,
    'displayName': displayName,
  }, current);
  @override
  Future<Result<ManagedInterestTag>> changeLifecycle({
    required ManagedInterestTag expected,
    required InterestLifecycleState lifecycleState,
    required bool Function() current,
  }) => _update(expected, {
    'expectedRevision': expected.revision,
    'lifecycleState': lifecycleState.name,
  }, current);

  Future<Result<ManagedInterestTag>> _update(
    ManagedInterestTag expected,
    JsonObject body,
    bool Function() current,
  ) async {
    final response = await _client.updateInterestTag(
      expected.interestTagId,
      body,
      current,
    );
    if (response case Failure<JsonObject>(:final failure)) {
      return Failure(failure);
    }
    final value = (response as Success<JsonObject>).value,
        tag = _managed(value['interestTag']);
    if (value.length != 1 ||
        tag == null ||
        tag.interestTagId != expected.interestTagId ||
        tag.revision < expected.revision ||
        tag.revision > expected.revision + 1) {
      return const Failure(_invalidResponse);
    }
    // A mutation acknowledgement must preserve the untouched field.
    if (body.containsKey('displayName') &&
            tag.lifecycleState != expected.lifecycleState ||
        body.containsKey('lifecycleState') &&
            (tag.displayName != expected.displayName ||
                tag.lifecycleState.name != body['lifecycleState'])) {
      return const Failure(_invalidResponse);
    }
    final changed =
        tag.displayName != expected.displayName ||
        tag.lifecycleState != expected.lifecycleState;
    if (tag.revision != expected.revision + (changed ? 1 : 0)) {
      return const Failure(_invalidResponse);
    }
    return Success(tag);
  }

  @override
  Future<Result<void>> delete({
    required ManagedInterestTag expected,
    required bool Function() current,
  }) async {
    if (!permanentDeletionAvailable) {
      return const Failure(
        AppFailure(
          kind: AppFailureKind.configurationUnavailable,
          message: 'Permanent deletion is not available.',
        ),
      );
    }
    final result = await _client.deleteInterestTag(
      expected.interestTagId,
      expected.revision,
      current,
    );
    return switch (result) {
      Success<JsonObject>() => const Success(null),
      Failure<JsonObject>(:final failure) => Failure(failure),
    };
  }

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

ManagedInterestTag? _managed(Object? row) {
  if (row is! Map<String, dynamic> ||
      row.length != 4 ||
      !_validIdentity(row['interestTagId']) ||
      !_validDisplayName(row['displayName'])) {
    return null;
  }
  final revision = row['revision'];
  if (revision is! int || revision < 1 || revision > 9007199254740991) {
    return null;
  }
  final lifecycle = switch (row['lifecycleState']) {
    'active' => InterestLifecycleState.active,
    'inactive' => InterestLifecycleState.inactive,
    _ => null,
  };
  return lifecycle == null
      ? null
      : ManagedInterestTag(
          interestTagId: row['interestTagId'] as String,
          displayName: row['displayName'] as String,
          lifecycleState: lifecycle,
          revision: revision,
        );
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
