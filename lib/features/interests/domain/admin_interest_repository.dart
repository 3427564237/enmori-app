import '../../../core/result/result.dart';
import 'interest_repository.dart';

/// A server acknowledgement, not proof of the subsequent independent read.
final class CreatedInterestTag {
  const CreatedInterestTag({
    required this.interestTagId,
    required this.displayName,
  });

  final String interestTagId;
  final String displayName;
}

abstract interface class AdminInterestRepository {
  Future<Result<bool>> readCapability({required bool Function() current});

  Future<Result<List<InterestTagOption>>> readCatalogue({
    required bool Function() current,
  });

  Future<Result<CreatedInterestTag>> create({
    required String displayName,
    required bool Function() current,
  });
}

/// Only checks rules that do not need Unicode normalization. The Backend owns
/// NFC length validation and the NFKC/default-casefold uniqueness comparison.
String? adminInterestNameError(String input) {
  if (input.trim().isEmpty) return 'Enter an interest name.';
  for (var index = 0; index < input.length; index++) {
    final unit = input.codeUnitAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      if (++index >= input.length) return _invalidName;
      final low = input.codeUnitAt(index);
      if (low < 0xdc00 || low > 0xdfff) return _invalidName;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return _invalidName;
    }
  }
  if (_forbiddenNameCharacters.hasMatch(input.trim())) return _invalidName;
  return null;
}

final _forbiddenNameCharacters = RegExp(
  r'[\x00-\x1f\x7f-\x9f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]',
);
const _invalidName = 'Use a name without control or direction characters.';
