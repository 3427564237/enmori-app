import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/result/result.dart';
import 'domain/interest_repository.dart';

final interestRepositoryProvider = Provider<InterestRepository>(
  (ref) => const _UnavailableInterestRepository(),
);

final class _UnavailableInterestRepository implements InterestRepository {
  const _UnavailableInterestRepository();

  @override
  Future<Result<List<InterestTagOption>>> readSelectableTags() async =>
      const Failure(_configurationFailure);

  @override
  Future<Result<InterestSelection>> readOwn() async =>
      const Failure(_configurationFailure);

  @override
  Future<Result<InterestSelection>> replaceOwn({
    required List<String> interestTagIds,
    required int expectedRevision,
  }) async => const Failure(_configurationFailure);
}

const _configurationFailure = AppFailure(
  kind: AppFailureKind.configurationUnavailable,
  message: 'The service is not configured.',
);
