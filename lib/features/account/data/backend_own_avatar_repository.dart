import 'dart:convert';

import 'package:flutter/services.dart';

import '../../../core/network/backend_api_client.dart';
import '../../../core/result/result.dart';
import '../domain/own_avatar.dart';

const avatarUnavailable = AppFailure(
  kind: AppFailureKind.serviceUnavailable,
  message: 'The photo could not be loaded or saved.',
);

AvatarPhoto? parseAvatarPhoto(Object? encoded, Object? hash) {
  if (encoded is! String ||
      encoded.length > 174764 ||
      hash is! String ||
      !RegExp(r'^[a-f0-9]{64}$').hasMatch(hash)) {
    return null;
  }
  try {
    final bytes = base64Decode(encoded);
    if (bytes.length < 45 ||
        bytes.length > 131072 ||
        base64Encode(bytes) != encoded) {
      return null;
    }
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    for (var i = 0; i < signature.length; i++) {
      if (bytes[i] != signature[i]) return null;
    }
    final view = ByteData.sublistView(bytes);
    final width = view.getUint32(16), height = view.getUint32(20);
    if (view.getUint32(8) != 13 ||
        ascii.decode(bytes.sublist(12, 16)) != 'IHDR' ||
        width < 1 ||
        width > 256 ||
        height != width ||
        bytes[24] != 8 ||
        !const [2, 6].contains(bytes[25]) ||
        bytes[26] != 0 ||
        bytes[27] != 0 ||
        bytes[28] != 0) {
      return null;
    }
    return AvatarPhoto(bytes: bytes, sourceSha256: hash);
  } catch (_) {
    return null;
  }
}

final class BackendOwnAvatarRepository implements OwnAvatarRepository {
  BackendOwnAvatarRepository(this.client);
  final BackendApiClient client;
  @override
  Future<Result<OwnAvatar>> read(bool Function() current) async =>
      _parse(await client.getGuarded('/v1/me/profile/avatar', current));
  @override
  Future<Result<OwnAvatar>> save({
    required AvatarPhoto? photo,
    required int expectedRevision,
    required bool Function() current,
  }) async => _parse(
    await client.putGuarded('/v1/me/profile/avatar', {
      'pngBase64': photo == null ? null : base64Encode(photo.bytes),
      'expectedRevision': expectedRevision,
    }, current),
  );

  Result<OwnAvatar> _parse(Result<JsonObject> response) {
    if (response case Failure<JsonObject>(:final failure)) {
      return Failure(failure);
    }
    final body = (response as Success<JsonObject>).value;
    final value = body['avatar'];
    if (body.length != 1 ||
        value is! Map<String, dynamic> ||
        value.length != 3 ||
        !value.keys.toSet().containsAll([
          'pngBase64',
          'sourceSha256',
          'revision',
        ])) {
      return const Failure(avatarUnavailable);
    }
    final revision = value['revision'];
    if (revision is! int || revision < 0 || revision > 9007199254740991) {
      return const Failure(avatarUnavailable);
    }
    if (value['pngBase64'] == null && value['sourceSha256'] == null) {
      return Success(OwnAvatar(photo: null, revision: revision));
    }
    final photo = parseAvatarPhoto(value['pngBase64'], value['sourceSha256']);
    return photo == null
        ? const Failure(avatarUnavailable)
        : Success(OwnAvatar(photo: photo, revision: revision));
  }
}

final class NativeAvatarPhotoPicker implements AvatarPhotoPicker {
  const NativeAvatarPhotoPicker();
  @override
  Future<Result<AvatarPhoto?>> pick() async {
    try {
      final result = await const MethodChannel('com.enmori.app/avatar')
          .invokeMapMethod<String, Object?>('pick');
      if (result == null) return const Success(null);
      final photo = parseAvatarPhoto(
        result['pngBase64'],
        result['sourceSha256'],
      );
      return photo == null ? const Failure(avatarUnavailable) : Success(photo);
    } catch (_) {
      return const Failure(avatarUnavailable);
    }
  }
}
