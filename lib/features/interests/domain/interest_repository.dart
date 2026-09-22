import '../../../core/result/result.dart';

enum InterestLifecycleState { active, inactive }

final class InterestTagOption {
  const InterestTagOption({
    required this.interestTagId,
    required this.displayName,
  });

  final String interestTagId;
  final String displayName;
}

final class SelectedInterestTag {
  const SelectedInterestTag({
    required this.interestTagId,
    required this.displayName,
    required this.lifecycleState,
  });

  final String interestTagId;
  final String displayName;
  final InterestLifecycleState lifecycleState;
}

final class InterestSelection {
  const InterestSelection({required this.interestTags, required this.revision});

  final List<SelectedInterestTag> interestTags;
  final int revision;
}

abstract interface class InterestRepository {
  Future<Result<List<InterestTagOption>>> readSelectableTags();

  Future<Result<InterestSelection>> readOwn();

  Future<Result<InterestSelection>> replaceOwn({
    required List<String> interestTagIds,
    required int expectedRevision,
  });
}
