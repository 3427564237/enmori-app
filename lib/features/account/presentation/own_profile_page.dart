import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/auth_providers.dart';
import '../../interests/domain/interest_repository.dart';
import 'own_profile_controller.dart';

final class OwnProfilePage extends ConsumerWidget {
  const OwnProfilePage({required this.onEditInterests, super.key});

  final Future<void> Function() onEditInterests;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(ownProfileControllerProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('My profile')),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 640),
            child: ListView(
              key: const Key('route-own-profile'),
              padding: const EdgeInsets.all(24),
              children: [
                if (state.username case final username?) ...[
                  Text(
                    'Username',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    username,
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  const SizedBox(height: 32),
                  Text(
                    'Interests',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 12),
                ],
                if (state.phase == OwnProfilePhase.loading)
                  const Center(
                    key: Key('profile-loading'),
                    child: CircularProgressIndicator(),
                  )
                else if (state.phase == OwnProfilePhase.failed) ...[
                  const Text('Interests could not be loaded. Try again.'),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: () =>
                        ref.read(ownProfileControllerProvider.notifier).load(),
                    child: const Text('Retry'),
                  ),
                ] else if (state.interests.isEmpty)
                  const Text('No interests selected.')
                else
                  for (final tag in state.interests)
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(tag.displayName),
                      subtitle:
                          tag.lifecycleState == InterestLifecycleState.inactive
                          ? const Text(
                              'No longer available — you can remove it.',
                            )
                          : null,
                    ),
                const SizedBox(height: 24),
                OutlinedButton.icon(
                  key: const Key('profile-edit-interests'),
                  onPressed: state.username == null
                      ? null
                      : () async {
                          final subject = ref.read(currentAuthSubjectProvider);
                          final controller = ref.read(
                            ownProfileControllerProvider.notifier,
                          );
                          await onEditInterests();
                          if (!context.mounted ||
                              ref.read(currentAuthSubjectProvider) != subject) {
                            return;
                          }
                          await controller.load();
                        },
                  icon: const Icon(Icons.interests_outlined),
                  label: const Text('Edit interests'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
