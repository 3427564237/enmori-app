import 'dart:typed_data';

import '../../../core/result/result.dart';

final class AvatarPhoto {
  AvatarPhoto({required Uint8List bytes, required this.sourceSha256})
    : bytes = bytes.asUnmodifiableView();
  final Uint8List bytes;
  final String sourceSha256;
}

final class OwnAvatar {
  const OwnAvatar({
    required this.photo,
    required this.revision,
    this.visibleToAuthenticatedUsers = false,
  });
  final AvatarPhoto? photo;
  final int revision;
  final bool visibleToAuthenticatedUsers;
}

abstract interface class OwnAvatarRepository {
  Future<Result<OwnAvatar>> read(bool Function() current);
  Future<Result<OwnAvatar>> save({
    required AvatarPhoto? photo,
    bool visibleToAuthenticatedUsers = false,
    required int expectedRevision,
    required bool Function() current,
  });
}

abstract interface class AvatarPhotoPicker {
  Future<Result<AvatarPhoto?>> pick();
}

abstract interface class VisibleAvatarRepository {
  Future<Result<AvatarPhoto?>> readForUsername(
    String username,
    bool Function() current,
  );
}
