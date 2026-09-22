import '../../../core/network/backend_api_client.dart';
import '../../../core/result/result.dart';
import '../domain/interest_repository.dart';

final class BackendInterestRepository implements InterestRepository {
  BackendInterestRepository(this._client);

  final BackendApiClient _client;

  @override
  Future<Result<List<InterestTagOption>>> readSelectableTags() async {
    final response = await _client.get('/v1/interest-tags');
    return switch (response) {
      Failure<JsonObject>(:final failure) => Failure(failure),
      Success<JsonObject>(:final value) => _parseCatalogue(value),
    };
  }

  @override
  Future<Result<InterestSelection>> readOwn() async {
    final response = await _client.get('/v1/me/interests');
    return switch (response) {
      Failure<JsonObject>(:final failure) => Failure(failure),
      Success<JsonObject>(:final value) => _parseSelection(value),
    };
  }

  @override
  Future<Result<InterestSelection>> replaceOwn({
    required List<String> interestTagIds,
    required int expectedRevision,
  }) async {
    final response = await _client.put(
      '/v1/me/interests',
      body: {
        'interestTagIds': interestTagIds,
        'expectedRevision': expectedRevision,
      },
    );
    return switch (response) {
      Failure<JsonObject>(:final failure) => Failure(failure),
      Success<JsonObject>(:final value) => _parseSelection(value),
    };
  }

  Result<List<InterestTagOption>> _parseCatalogue(JsonObject value) {
    final rawTags = value['interestTags'];
    if (rawTags is! List) return _invalidCatalogue();
    final tags = <InterestTagOption>[];
    final ids = <String>{};
    for (final rawTag in rawTags) {
      if (rawTag is! Map<String, dynamic>) return _invalidCatalogue();
      final id = rawTag['interestTagId'];
      final name = rawTag['displayName'];
      if (id is! String || id.isEmpty || name is! String || name.isEmpty) {
        return _invalidCatalogue();
      }
      if (!ids.add(id)) return _invalidCatalogue();
      tags.add(InterestTagOption(interestTagId: id, displayName: name));
    }
    return Success(tags);
  }

  Result<InterestSelection> _parseSelection(JsonObject value) {
    final rawInterests = value['interests'];
    if (rawInterests is! Map<String, dynamic>) return _invalidSelection();
    final rawTags = rawInterests['interestTags'];
    final revision = rawInterests['revision'];
    if (rawTags is! List || revision is! int || revision < 0) {
      return _invalidSelection();
    }
    final tags = <SelectedInterestTag>[];
    final ids = <String>{};
    for (final rawTag in rawTags) {
      if (rawTag is! Map<String, dynamic>) return _invalidSelection();
      final id = rawTag['interestTagId'];
      final name = rawTag['displayName'];
      final state = switch (rawTag['lifecycleState']) {
        'active' => InterestLifecycleState.active,
        'inactive' => InterestLifecycleState.inactive,
        _ => null,
      };
      if (id is! String ||
          id.isEmpty ||
          name is! String ||
          name.isEmpty ||
          state == null ||
          !ids.add(id)) {
        return _invalidSelection();
      }
      tags.add(
        SelectedInterestTag(
          interestTagId: id,
          displayName: name,
          lifecycleState: state,
        ),
      );
    }
    if (tags.length > 10) return _invalidSelection();
    return Success(InterestSelection(interestTags: tags, revision: revision));
  }

  Failure<List<InterestTagOption>> _invalidCatalogue() => const Failure(
    AppFailure(
      kind: AppFailureKind.unexpected,
      message: 'The service returned an invalid Interest catalogue.',
    ),
  );

  Failure<InterestSelection> _invalidSelection() => const Failure(
    AppFailure(
      kind: AppFailureKind.unexpected,
      message: 'The service returned an invalid Interest selection.',
    ),
  );
}
