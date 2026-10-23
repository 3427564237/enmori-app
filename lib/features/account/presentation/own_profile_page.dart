import '../../auth/presentation/auth_email_page.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_motion.dart';

import '../../auth/auth_providers.dart';
import '../account_preferences_providers.dart';
import '../domain/account_preferences_repository.dart';
import '../../../core/result/result.dart';
import '../../interests/domain/interest_repository.dart';
import 'own_profile_controller.dart';

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
        title: const Text('My profile'),
        actions: [
          IconButton(
            key: const Key('profile-edit'),
            tooltip: 'Edit profile',
            onPressed: state.username == null
                ? null
                : () => edit(onEditProfile),
            icon: const Icon(Icons.edit_outlined),
          ),
          IconButton(
            key: const Key('profile-settings'),
            tooltip: 'Settings',
            onPressed: state.username == null
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
                          Row(
                            children: [
                              CircleAvatar(
                                radius: 28,
                                child: Text(
                                  value.username.substring(0, 1).toUpperCase(),
                                  style: const TextStyle(fontSize: 24),
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      value.displayName ?? value.username,
                                      key: const Key('profile-name'),
                                      style: Theme.of(context)
                                          .textTheme
                                          .headlineSmall,
                                    ),
                                    Text('@${value.username}'),
                                  ],
                                ),
                              ),
                            ],
                          ),
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
                                      icon: Icons.school_outlined,
                                      label: name,
                                    ),
                                  if (value.details.region case final region?)
                                    _ProfileDetail(
                                      icon: Icons.place_outlined,
                                      label: region,
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
                          state.username ?? 'My profile',
                          style: Theme.of(context).textTheme.headlineSmall,
                        ),
                        const Text('Profile could not be loaded.'),
                        TextButton(
                          onPressed: subject == null
                              ? null
                              : () => ref.invalidate(
                                  ownProfileDetailsProvider(subject),
                                ),
                          child: const Text('Reload profile'),
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
                        'Interests',
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
                        label: const Text('Edit interests'),
                      ),
                    ],
                  ),
                  if (state.phase == OwnProfilePhase.loading)
                    const LinearProgressIndicator(key: Key('profile-loading'))
                  else if (state.phase == OwnProfilePhase.failed)
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Interests could not be loaded.'),
                      trailing: TextButton(
                        onPressed: () => ref
                            .read(ownProfileControllerProvider.notifier)
                            .load(),
                        child: const Text('Retry'),
                      ),
                    )
                  else if (state.interests.isEmpty)
                    const Text('No interests selected.')
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
                                ? const Tooltip(
                                    message: 'No longer available — you can remove it.',
                                    child: Icon(Icons.info_outline, size: 18),
                                  )
                                : null,
                          ),
                      ],
                    ),
                  const SizedBox(height: 20),
                  Text(
                    'Your records',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  if (onOpenHistory != null)
                    ListTile(
                      leading: const Icon(Icons.history),
                      title: const Text('Check-in History'),
                      subtitle: const Text('Notes, moods and saved moments'),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: onOpenHistory,
                    ),
                  if (onOpenFootprint != null)
                    ListTile(
                      leading: const Icon(Icons.map_outlined),
                      title: const Text('Footprint'),
                      subtitle: const Text('Your Check-in locations'),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: onOpenFootprint,
                    ),
                  if (onOpenHistory == null &&
                      onOpenRecords != null &&
                      state.username != null)
                    ListTile(
                      leading: const Icon(Icons.calendar_month),
                      title: const Text('My records, calendar & map'),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => onOpenRecords!(state.username!),
                    ),
                  if (onManagePersonas != null) ...[
                    const Divider(height: 32),
                    ListTile(
                      key: const Key('profile-manage-personas'),
                      contentPadding: EdgeInsets.zero,
                      leading: const Icon(Icons.auto_awesome_outlined),
                      title: const Text('Your Personas'),
                      subtitle: const Text(
                        'Choose how your AI companion responds',
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
