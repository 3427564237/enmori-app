import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

typedef IdentityAvatarBuilder = Widget Function(String username, double size);

/// App composition supplies authenticated pixels; feature views supply only an
/// identity they are already permitted to display. The fallback is always local.
final identityAvatarBuilderProvider = Provider<IdentityAvatarBuilder>(
  (ref) =>
      (username, size) => CircleAvatar(
        radius: size / 2,
        child: Text(
          username.isEmpty ? '?' : username.characters.first.toUpperCase(),
        ),
      ),
);

final class IdentityAvatar extends ConsumerWidget {
  const IdentityAvatar({required this.username, this.size = 40, super.key});
  final String username;
  final double size;
  @override
  Widget build(BuildContext context, WidgetRef ref) => Align(
    alignment: AlignmentDirectional.centerStart,
    widthFactor: 1,
    heightFactor: 1,
    child: SizedBox.square(
      dimension: size,
      child: ref.watch(identityAvatarBuilderProvider)(username, size),
    ),
  );
}
