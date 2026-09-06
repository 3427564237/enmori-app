import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/command_state.dart';
import '../../../core/result/result.dart';
import '../domain/account_repository.dart';
import 'onboarding_controller.dart';

final class OnboardingPage extends ConsumerStatefulWidget {
  const OnboardingPage({required this.onCompleted, super.key});

  final VoidCallback onCompleted;

  @override
  ConsumerState<OnboardingPage> createState() => _OnboardingPageState();
}

final class _OnboardingPageState extends ConsumerState<OnboardingPage> {
  final _formKey = GlobalKey<FormState>();
  final _usernameController = TextEditingController();

  @override
  void dispose() {
    _usernameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<CommandState<ProductAccount>>(onboardingControllerProvider, (
      previous,
      next,
    ) {
      if (!mounted) return;
      if (next case CommandSucceeded<ProductAccount>()) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) widget.onCompleted();
        });
      }
    });

    final state = ref.watch(onboardingControllerProvider);
    final pending = state is CommandPending<ProductAccount>;
    return Scaffold(
      appBar: AppBar(title: const Text('Onboarding')),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 560),
            child: ListView(
              key: const Key('route-onboarding'),
              padding: const EdgeInsets.all(24),
              children: [
                Text(
                  'Initial choice',
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                const SizedBox(height: 8),
                const Text(
                  'Choose how your first Check-in is saved. This can be changed later.',
                ),
                const SizedBox(height: 24),
                Form(
                  key: _formKey,
                  child: TextFormField(
                    key: const Key('r6-onboarding-username'),
                    controller: _usernameController,
                    decoration: const InputDecoration(labelText: 'Username'),
                    textInputAction: TextInputAction.done,
                    validator: _validateUsername,
                  ),
                ),
                const SizedBox(height: 20),
                _ChoicePanel(
                  title: 'Accept - Public',
                  body: 'Save the first Check-in as public with optional processing consent accepted.',
                  icon: Icons.public,
                  onPressed: pending ? null : () => _complete(InitialChoice.accept),
                  buttonKey: const Key('r6-initial-choice-accept'),
                ),
                const SizedBox(height: 12),
                _ChoicePanel(
                  title: 'Reject - Private',
                  body: 'Save the first Check-in as private with optional processing consent rejected.',
                  icon: Icons.lock_outline,
                  onPressed: pending ? null : () => _complete(InitialChoice.reject),
                  buttonKey: const Key('r6-initial-choice-reject'),
                ),
                if (pending) ...[
                  const SizedBox(height: 16),
                  const LinearProgressIndicator(),
                ],
                if (state case CommandFailed<ProductAccount>(:final failure)) ...[
                  const SizedBox(height: 16),
                  _FailureText(failure: failure),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _complete(InitialChoice choice) {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    ref.read(onboardingControllerProvider.notifier).complete(
          username: _usernameController.text.trim(),
          initialChoice: choice,
        );
  }

  String? _validateUsername(String? value) {
    final username = value?.trim() ?? '';
    final validShape = RegExp(r'^[A-Za-z][A-Za-z0-9_]{2,19}$').hasMatch(username);
    if (!validShape || username.contains('__')) {
      return 'Use 3-20 letters, numbers, or underscores.';
    }
    return null;
  }
}

final class _ChoicePanel extends StatelessWidget {
  const _ChoicePanel({
    required this.title,
    required this.body,
    required this.icon,
    required this.onPressed,
    required this.buttonKey,
  });

  final String title;
  final String body;
  final IconData icon;
  final VoidCallback? onPressed;
  final Key buttonKey;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 4),
                  Text(body),
                  const SizedBox(height: 12),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: FilledButton(
                      key: buttonKey,
                      onPressed: onPressed,
                      child: Text(title),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

final class _FailureText extends StatelessWidget {
  const _FailureText({required this.failure});

  final AppFailure failure;

  @override
  Widget build(BuildContext context) {
    final color = Theme.of(context).colorScheme.error;
    return Text(
      failure.message,
      key: const Key('r6-onboarding-failure'),
      style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: color),
    );
  }
}
