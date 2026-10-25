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
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        OwnAvatarButton(
          initial: profile.username.substring(0, 1).toUpperCase(),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                profile.displayName ?? profile.username,
                key: const Key('profile-name'),
                style: Theme.of(context).textTheme.titleLarge,
              ),
              Text(
                '@${profile.username}',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ),
        IconButton(
          key: const Key('profile-audience'),
          tooltip: audience,
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
        ),
        IconButton(
          key: const Key('profile-edit'),
          tooltip: context.tr('Edit profile', '编辑资料'),
          onPressed: onEdit,
          icon: const Icon(Icons.edit_outlined),
        ),
      ],
    );
  }
}

bool isCoordinateRegion(String value) =>
    RegExp(r'^\s*-?\d+(?:\.\d+)?°?\s*,\s*-?\d+(?:\.\d+)?°?\s*$')
        .hasMatch(value);
