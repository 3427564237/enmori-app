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

final class OwnProfilePage extends ConsumerWidget {
  const OwnProfilePage({
    required this.onEditInterests,
    this.onEditProfile,
    this.onOpenSettings,
    this.participationSection,
    this.onOpenRecords,
    this.onOpenHistory,
    this.onOpenFootprint,
    this.onManagePersonas,
    this.adminCatalogueEntry,
    super.key,
  });
  final Future<void> Function() onEditInterests;
  final Future<void> Function()? onEditProfile, onOpenSettings;
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

    return Scaffold(
      appBar: AppBar(
        title: Text(context.tr('My profile', "我的资料")),
        actions: [
          IconButton(
            key: const Key('profile-settings'),
            tooltip: context.tr('Settings', "设置"),
            onPressed: state.username == null || onOpenSettings == null
                ? null
                : () => edit(onOpenSettings),
            icon: const Icon(Icons.settings_outlined),
          ),
        ],
      ),
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
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          OwnProfileHeader(
                            profile: value,
                            onEdit: onEditProfile == null
                                ? null
                                : () => edit(onEditProfile),
                          ),
                          const SizedBox(height: 16),
                          if (value.details.bio case final bio?)
                            Padding(
                              padding: const EdgeInsets.only(top: 16),
                              child: Text(
                                bio,
                                style: Theme.of(context).textTheme.bodyLarge,
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
                                  if (value.details.region case final region?)
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
                  const SizedBox(height: 20),
                  Wrap(
                    alignment: WrapAlignment.spaceBetween,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 12,
                    children: [
                      Text(
                        context.tr('Interests', "兴趣"),
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      TextButton.icon(
                        key: const Key('profile-edit-interests'),
                        onPressed: state.username == null
                            ? null
                            : () async {
                                final controller = ref.read(
                                  ownProfileControllerProvider.notifier,
                                );
                                await onEditInterests();
                                if (context.mounted &&
                                    ref.read(currentAuthSubjectProvider) ==
                                        subject) {
                                  await controller.load();
                                }
                              },
                        icon: const Icon(Icons.edit_outlined, size: 18),
                        label: Text(context.tr('Edit interests', "编辑兴趣")),
                      ),
                    ],
                  ),
                  if (state.phase == OwnProfilePhase.loading)
                    const LinearProgressIndicator(key: Key('profile-loading'))
                  else if (state.phase == OwnProfilePhase.failed)
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(
                        context.tr('Interests could not be loaded.', "兴趣加载失败。"),
                      ),
                      trailing: TextButton(
                        onPressed: () => ref
                            .read(ownProfileControllerProvider.notifier)
                            .load(),
                        child: Text(context.tr('Retry', "重试")),
                      ),
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
                  const SizedBox(height: 20),
                  Text(
                    context.tr('Your records', "我的记录"),
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  if (onOpenHistory != null)
                    ListTile(
                      leading: const Icon(Icons.history),
                      title: Text(context.tr('Check-in History', "签到记录")),
                      subtitle: Text(
                        context.tr(
                          'Notes, moods and saved moments',
                          "文字、心情与留存的时刻",
                        ),
                      ),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: onOpenHistory,
                    ),
                  if (onOpenFootprint != null)
                    ListTile(
                      leading: const Icon(Icons.map_outlined),
                      title: Text(context.tr('Footprint', "足迹")),
                      subtitle: Text(
                        context.tr('Your Check-in locations', "签到留下的地点"),
                      ),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: onOpenFootprint,
                    ),
                  if (onOpenHistory == null &&
                      onOpenRecords != null &&
                      state.username != null)
                    ListTile(
                      leading: const Icon(Icons.calendar_month),
                      title: Text(
                        context.tr('My records, calendar & map', "我的记录、日历与地图"),
                      ),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => onOpenRecords!(state.username!),
                    ),
                  if (onManagePersonas != null) ...[
                    const Divider(height: 32),
                    ListTile(
                      key: const Key('profile-manage-personas'),
                      contentPadding: EdgeInsets.zero,
                      leading: const Icon(Icons.auto_awesome_outlined),
                      title: Text(context.tr('Your Personas', "我的 AI 角色")),
                      subtitle: Text(
                        context.tr(
                          'Choose how your AI companion responds',
                          "选择 AI 伙伴的回应方式",
                        ),
                      ),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: onManagePersonas,
                    ),
                  ],
                  if (participationSection != null) ...[
                    const SizedBox(height: 20),
                    participationSection!,
                  ],
                  const SizedBox(height: 20),
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
