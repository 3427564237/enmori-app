import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/result/result.dart';
import '../auth/auth_providers.dart';
import 'content_access.dart';
import 'data/backend_own_avatar_repository.dart';
import 'domain/own_avatar.dart';

final ownAvatarRepositoryProvider = Provider<OwnAvatarRepository>(
  (ref) => const _UnavailableAvatar(),
);
final avatarPhotoPickerProvider = Provider<AvatarPhotoPicker>(
  (ref) => const NativeAvatarPhotoPicker(),
);

final class AvatarPendingSave {
  const AvatarPendingSave({
    required this.revision,
    required this.photo,
    this.visibleToAuthenticatedUsers = false,
  });
  final int revision;
  final AvatarPhoto? photo;
  final bool visibleToAuthenticatedUsers;
}

/// An unresolved write and its small preview survive route departure in this
/// login session. A new page cannot treat an unchanged GET as proof of no effect.
final avatarPendingSaveProvider =
    NotifierProvider<AvatarPendingSaveController, AvatarPendingSave?>(
      AvatarPendingSaveController.new,
    );

final class AvatarPendingSaveController extends Notifier<AvatarPendingSave?> {
  @override
  AvatarPendingSave? build() {
    ref.watch(authSessionProvider.select((value) => value.asData?.value));
    return null;
  }

  bool begin(AvatarPendingSave attempt) {
    if (state != null) return false;
    state = attempt;
    return true;
  }

  void clear(AvatarPendingSave attempt) {
    if (identical(state, attempt)) state = null;
  }
}

final ownAvatarProvider = FutureProvider.autoDispose<Result<OwnAvatar>>((ref) {
  final session = ref.watch(authSessionProvider).asData?.value;
  final subject = ref.watch(currentAuthSubjectProvider);
  final access = ref.watch(contentAccessProvider);
  bool current() =>
      ref.mounted &&
      subject != null &&
      access.foreground &&
      identical(session, ref.read(authSessionProvider).asData?.value) &&
      identical(access, ref.read(contentAccessProvider));
  if (!current()) return const Failure(avatarUnavailable);
  return ref.watch(ownAvatarRepositoryProvider).read(current);
});

final class _UnavailableAvatar implements OwnAvatarRepository {
  const _UnavailableAvatar();
  @override
  Future<Result<OwnAvatar>> read(bool Function() current) async =>
      const Failure(avatarUnavailable);
  @override
  Future<Result<OwnAvatar>> save({
    required AvatarPhoto? photo,
    bool visibleToAuthenticatedUsers = false,
    required int expectedRevision,
    required bool Function() current,
  }) async => const Failure(avatarUnavailable);
}

final visibleAvatarRepositoryProvider = Provider<VisibleAvatarRepository?>(
  (ref) => null,
);
final visibleAvatarProvider = FutureProvider.autoDispose
    .family<Result<AvatarPhoto?>, String>((ref, username) {
      final session = ref.watch(authSessionProvider).asData?.value;
      final subject = ref.watch(currentAuthSubjectProvider);
      final access = ref.watch(contentAccessProvider);
      bool current() =>
          ref.mounted &&
          subject != null &&
          access.foreground &&
          identical(session, ref.read(authSessionProvider).asData?.value) &&
          identical(access, ref.read(contentAccessProvider));
      final repository = ref.watch(visibleAvatarRepositoryProvider);
      if (!current() || repository == null) {
        return const Failure(avatarUnavailable);
      }
      return repository.readForUsername(username, current);
    });
