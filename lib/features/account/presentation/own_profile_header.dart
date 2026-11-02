import 'package:flutter/material.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../domain/account_preferences_repository.dart';
import 'own_avatar_view.dart';

final class OwnProfileHeader extends StatelessWidget {
  const OwnProfileHeader({required this.profile, this.onEdit, super.key});
  final OwnProfile profile;
  final VoidCallback? onEdit;
  @override
  Widget build(BuildContext context) {
    final audience = switch (profile.visibility) {
      ProfileVisibility.private => context.tr('Private profile', '私密资料'),
      ProfileVisibility.friendsOnly => context.tr(
        'Friends-only profile',
        '仅好友可见的资料',
      ),
      ProfileVisibility.public => context.tr('Public profile', '公开资料'),
    };
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        LayoutBuilder(
          builder: (context, constraints) {
            final avatar = OwnAvatarButton(
              initial: profile.username.substring(0, 1).toUpperCase(),
              size: 72,
            );
            final identity = Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  profile.displayName ?? profile.username,
                  key: const Key('profile-name'),
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 4),
                Text(
                  '@${profile.username}',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ],
            );
            if (constraints.maxWidth < 320 &&
                MediaQuery.textScalerOf(context).scale(16) > 24) {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [avatar, const SizedBox(height: 16), identity],
              );
            }
            return Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                avatar,
                const SizedBox(width: 16),
                Expanded(child: identity),
              ],
            );
          },
        ),
        const SizedBox(height: 12),
        Tooltip(
          message: audience,
          excludeFromSemantics: true,
          child: TextButton.icon(
            key: const Key('profile-audience'),
            style: TextButton.styleFrom(alignment: Alignment.centerLeft),
            onPressed: () => showDialog<void>(
              context: context,
              builder: (context) => AlertDialog(
                title: Text(audience),
                content: Text(
                  context.tr(
                    'Your records and sharing choices have separate controls. Your photo is currently visible only to you.',
                    '记录与各项分享范围分别设置。目前头像仅你自己可见。',
                  ),
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: Text(context.tr('Done', '完成')),
                  ),
                ],
              ),
            ),
            icon: Icon(
              profile.visibility == ProfileVisibility.private
                  ? Icons.lock_outline
                  : Icons.visibility_outlined,
            ),
            label: Text(audience),
          ),
        ),
        if (onEdit != null)
          TextButton.icon(
            key: const Key('profile-edit'),
            onPressed: onEdit,
            icon: const Icon(Icons.edit_outlined),
            label: Text(context.tr('Edit profile', '编辑资料')),
          ),
      ],
    );
  }
}

bool isCoordinateRegion(String value) =>
    RegExp(r'^\s*-?\d+(?:\.\d+)?°?\s*,\s*-?\d+(?:\.\d+)?°?\s*$')
        .hasMatch(value);
