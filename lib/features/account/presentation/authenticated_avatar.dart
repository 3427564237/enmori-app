import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/refresh_on_return.dart';
import '../../../core/result/result.dart';
import '../content_access.dart';
import '../domain/own_avatar.dart';
import '../own_avatar_providers.dart';
import 'own_avatar_view.dart';

final class AuthenticatedAvatar extends ConsumerWidget {
  const AuthenticatedAvatar({
    required this.username,
    required this.size,
    super.key,
  });
  final String username;
  final double size;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final visible =
        ref.watch(contentAccessProvider).foreground &&
        ModalRoute.of(context)?.isCurrent != false &&
        TickerMode.valuesOf(context).enabled;
    final result = visible ? ref.watch(visibleAvatarProvider(username)) : null;
    final photo = result != null && !result.isLoading && !result.hasError
        ? switch (result.asData?.value) {
            Success<AvatarPhoto?>(:final value) => value,
            _ => null,
          }
        : null;
    return RefreshOnReturn(
      onRefresh: () => ref.invalidate(visibleAvatarProvider(username)),
      child: AvatarPixels(
        photo: photo,
        initial: username.isEmpty
            ? '?'
            : username.characters.first.toUpperCase(),
        size: size,
      ),
    );
  }
}
