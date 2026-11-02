import 'package:enmori/core/presentation/enmori_localizations.dart';

import '../../auth/presentation/auth_email_page.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_motion.dart';

import '../../auth/auth_providers.dart';
import '../account_preferences_providers.dart';
import '../domain/account_preferences_repository.dart';
import '../domain/profile_details.dart';
import '../../../core/result/result.dart';
import '../../interests/domain/interest_repository.dart';
import 'own_profile_controller.dart';
import 'own_profile_header.dart';
import 'profile_action_group.dart';

final class OwnProfilePage extends ConsumerWidget {
  const OwnProfilePage({
    required this.onEditInterests,
    this.onEditProfile,
    this.onOpenSettings,
    this.onOpenRecommendationProfile,
    this.participationSection,
    this.onOpenRecords,
    this.onOpenHistory,
    this.onOpenFootprint,
    this.onManagePersonas,
    this.adminCatalogueEntry,
    super.key,
  });
  final Future<void> Function() onEditInterests;
  final Future<void> Function()? onEditProfile,
      onOpenSettings,
      onOpenRecommendationProfile;
  final Widget? participationSection;
  final Future<void> Function(String)? onOpenRecords;
  final VoidCallback? onOpenHistory, onOpenFootprint, onManagePersonas;
  final Widget? adminCatalogueEntry;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(ownProfileControllerProvider);
    final subject = ref.watch(currentAuthSubjectProvider);
    final details = subject == null
        ? null
        : ref.watch(ownProfileDetailsProvider(subject));
    Future<void> edit(Future<void> Function()? action) async {
      await action?.call();
      if (!context.mounted ||
          subject == null ||
          ref.read(currentAuthSubjectProvider) != subject) {
        return;
      }
      ref.invalidate(ownProfileDetailsProvider(subject));
    }

    final canEdit = state.username != null;
    final commonActions = <ProfileAction>[
      if (onOpenHistory != null)
        ProfileAction(
          key: const Key('profile-history'),
          icon: Icons.history_outlined,
          label: context.tr('Check-in History', '签到历史'),
          onPressed: onOpenHistory,
          emphasized: true,
        )
      else if (onOpenRecords != null)
        ProfileAction(
          key: const Key('profile-records'),
          icon: Icons.calendar_month_outlined,
          label: context.tr('My records', '我的记录'),
          onPressed: canEdit ? () => onOpenRecords!(state.username!) : null,
          emphasized: true,
        ),
      ProfileAction(
        key: const Key('profile-edit-interests'),
        icon: Icons.interests_outlined,
        label: context.tr('Edit interests', '编辑兴趣'),
        onPressed: !canEdit
            ? null
            : () async {
                final controller = ref.read(
                  ownProfileControllerProvider.notifier,
                );
                await onEditInterests();
                if (context.mounted &&
                    ref.read(currentAuthSubjectProvider) == subject) {
                  await controller.load();
                }
              },
      ),
      if (onOpenFootprint != null)
        ProfileAction(
          key: const Key('profile-footprint'),
          icon: Icons.map_outlined,
          label: context.tr('Footprint', '足迹'),
          onPressed: onOpenFootprint,
        ),
    ];
    final settingsActions = <ProfileAction>[
      if (onEditProfile != null)
        ProfileAction(
          key: const Key('profile-edit'),
          icon: Icons.edit_outlined,
          label: context.tr('Edit profile', '编辑资料'),
          onPressed: canEdit ? () => edit(onEditProfile) : null,
        ),
      if (onOpenRecommendationProfile != null)
        ProfileAction(
          key: const Key('profile-recommendation-profile'),
          icon: Icons.person_search_outlined,
          label: context.tr('Area, birthday & discovery', '地区、生日与发现'),
          onPressed: canEdit ? () => edit(onOpenRecommendationProfile) : null,
        ),
      if (onOpenSettings != null)
        ProfileAction(
          key: const Key('profile-settings'),
          icon: Icons.privacy_tip_outlined,
          label: context.tr('Privacy & settings', '隐私与设置'),
          onPressed: canEdit ? () => edit(onOpenSettings) : null,
        ),
      if (onManagePersonas != null)
        ProfileAction(
          key: const Key('profile-manage-personas'),
          icon: Icons.auto_awesome_outlined,
          label: context.tr('Your Personas', '我的 AI 角色'),
          onPressed: onManagePersonas,
        ),
    ];

    return Scaffold(
      appBar: AppBar(title: Text(context.tr('My profile', "我的资料"))),
      body: SafeArea(
        child: Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 640),
            child: MotionReveal(
              trigger: (subject, details.runtimeType),
              child: ListView(
                key: const Key('route-own-profile'),
                padding: const EdgeInsets.all(16),
                children: [
                  switch (details) {
                    AsyncData<Result<OwnProfile>>(
                      value: Success<OwnProfile>(:final value),
                    ) =>
                      Card(
                        margin: EdgeInsets.zero,
                        child: Padding(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              OwnProfileHeader(profile: value),
                              if (value.details.bio case final bio?)
                                Padding(
                                  padding: const EdgeInsets.only(top: 16),
                                  child: Text(
                                    bio,
                                    style: Theme.of(context)
                                        .textTheme
                                        .bodyLarge,
                                  ),
                                ),
                              if (value.details.affiliationName != null ||
                                  value.details.region != null)
                                Padding(
                                  padding: const EdgeInsets.only(top: 12),
                                  child: Wrap(
                                    spacing: 16,
                                    runSpacing: 8,
                                    children: [
                                      if (value.details.affiliationName
                                          case final name?)
                                        _ProfileDetail(
                                          icon:
                                              value.details.affiliationType ==
                                                  AffiliationType.company
                                              ? Icons.business_outlined
                                              : Icons.school_outlined,
                                          label: name,
                                        ),
                                      if (value.details.region
                                          case final region?)
                                        _ProfileDetail(
                                          icon: Icons.place_outlined,
                                          label: isCoordinateRegion(region)
                                              ? context.tr(
                                                  'Add a place name in Edit profile',
                                                  '在编辑资料中填写地点名称',
                                                )
                                              : region,
                                        ),
                                    ],
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                    AsyncData<Result<OwnProfile>>(
                      value: Failure<OwnProfile>(),
                    ) ||
                    AsyncError<Result<OwnProfile>>() => Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          state.username ?? context.tr('My profile', "我的资料"),
                          style: Theme.of(context).textTheme.headlineSmall,
                        ),
                        Text(
                          context.tr('Profile could not be loaded.', "资料加载失败。"),
                        ),
                        TextButton(
                          onPressed: subject == null
                              ? null
                              : () => ref.invalidate(
                                  ownProfileDetailsProvider(subject),
                                ),
                          child: Text(context.tr('Reload profile', "重新加载资料")),
                        ),
                      ],
                    ),
                    _ => const LinearProgressIndicator(),
                  },
                  const SizedBox(height: 24),
                  Text(
                    context.tr('Quick access', '常用功能'),
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 4),
                  ProfileActionGroup(actions: commonActions),
                  const SizedBox(height: 20),
                  Text(
                    context.tr('Interests', '兴趣'),
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  if (state.phase == OwnProfilePhase.loading)
                    const LinearProgressIndicator(key: Key('profile-loading'))
                  else if (state.phase == OwnProfilePhase.failed)
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          context.tr(
                            'Interests could not be loaded.',
                            "兴趣加载失败。",
                          ),
                        ),
                        TextButton(
                          onPressed: () => ref
                              .read(ownProfileControllerProvider.notifier)
                              .load(),
                          child: Text(context.tr('Retry', "重试")),
                        ),
                      ],
                    )
                  else if (state.interests.isEmpty)
                    Text(
                      context.tr(
                        'No interests selected. Add up to 10 things you enjoy.',
                        "还没有选择兴趣。可以添加最多 10 项你喜欢的事。",
                      ),
                    )
                  else
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        for (final tag in state.interests)
                          Chip(
                            label: Text(tag.displayName),
                            avatar:
                                tag.lifecycleState ==
                                    InterestLifecycleState.inactive
                                ? Tooltip(
                                    message: context.tr(
                                      'No longer available — you can remove it.',
                                      "已停用，可以移除。",
                                    ),
                                    child: Icon(Icons.info_outline, size: 18),
                                  )
                                : null,
                          ),
                      ],
                    ),
                  if (settingsActions.isNotEmpty) ...[
                    const SizedBox(height: 24),
                    Text(
                      context.tr('Profile & privacy', '资料与隐私'),
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 4),
                    ProfileActionGroup(actions: settingsActions),
                  ],
                  if (participationSection != null) ...[
                    const SizedBox(height: 20),
                    participationSection!,
                  ],
                  const SizedBox(height: 16),
                  const VerifyEmailButton(),
                  ?adminCatalogueEntry,
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

final class _ProfileDetail extends StatelessWidget {
  const _ProfileDetail({required this.icon, required this.label});
  final IconData icon;
  final String label;
  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Icon(
        icon,
        size: 16,
        color: Theme.of(context).colorScheme.onSurfaceVariant,
      ),
      const SizedBox(width: 6),
      Flexible(
        child: Text(label, style: Theme.of(context).textTheme.bodyMedium),
      ),
    ],
  );
}
