import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../account/domain/account_repository.dart';
import '../../account/presentation/account_preferences_controller.dart';

/// Presentation gate for the connected app; Backend remains the authority.
final class AiConsentGate extends ConsumerWidget {
  const AiConsentGate({
    required this.child,
    required this.onOpenSettings,
    required this.navigationBar,
    super.key,
  });

  final Widget child;
  final VoidCallback onOpenSettings;
  final Widget navigationBar;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final provider = accountPreferencesControllerProvider(
      PreferencesView.settings,
    );
    final state = ref.watch(provider);
    if (state.phase == PreferencesPhase.ready &&
        state.settings?.consent == OptionalProcessingConsent.accepted) {
      return child;
    }
    final loading =
        state.phase == PreferencesPhase.loading ||
        state.phase == PreferencesPhase.saving;
    final rejected =
        state.settings?.consent == OptionalProcessingConsent.rejected;
    return Scaffold(
      appBar: AppBar(title: const Text('AI companion')),
      bottomNavigationBar: navigationBar,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: loading
              ? const CircularProgressIndicator()
              : Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      rejected ? 'AI Limited' : 'AI settings unavailable',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      rejected
                          ? 'AI requires optional data use. You can still browse activities, use Friends and keep Check-ins.'
                          : 'Your settings could not be loaded. Try again.',
                    ),
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: rejected
                          ? onOpenSettings
                          : () => ref.read(provider.notifier).load(),
                      child: Text(rejected ? 'Open settings' : 'Try again'),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}
