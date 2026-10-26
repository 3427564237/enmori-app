import 'dart:typed_data';

import '../../../core/result/result.dart';

final class AvatarPhoto {
  AvatarPhoto({required Uint8List bytes, required this.sourceSha256})
    : bytes = bytes.asUnmodifiableView();
  final Uint8List bytes;
  final String sourceSha256;
}

final class OwnAvatar {
  const OwnAvatar({required this.photo, required this.revision});
  final AvatarPhoto? photo;
  final int revision;
}

abstract interface class OwnAvatarRepository {
  Future<Result<OwnAvatar>> read(bool Function() current);
  Future<Result<OwnAvatar>> save({
    required AvatarPhoto? photo,
    required int expectedRevision,
    required bool Function() current,
  });
}

abstract interface class AvatarPhotoPicker {
  Future<Result<AvatarPhoto?>> pick();
}
