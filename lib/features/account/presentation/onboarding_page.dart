import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/command_state.dart';
import '../../../core/result/result.dart';
import '../domain/account_repository.dart';
import 'onboarding_controller.dart';

enum _OnboardingStep { username, purpose, choice }

final class OnboardingPage extends ConsumerStatefulWidget {
  const OnboardingPage({required this.onCompleted, super.key});

  final VoidCallback onCompleted;

  @override
  ConsumerState<OnboardingPage> createState() => _OnboardingPageState();
}

final class _OnboardingPageState extends ConsumerState<OnboardingPage> {
  final _formKey = GlobalKey<FormState>();
  final _usernameController = TextEditingController();
  _OnboardingStep _step = _OnboardingStep.username;
  String? _acceptedUsername;
  InitialChoice? _chosenChoice;

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
    final title = switch (_step) {
      _OnboardingStep.username => 'Choose your Username',
      _OnboardingStep.purpose => 'Initial Choice information',
      _OnboardingStep.choice => 'Choose your initial settings',
    };
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
                Text(title, style: Theme.of(context).textTheme.headlineMedium),
                const SizedBox(height: 16),
                ...switch (_step) {
                  _OnboardingStep.username => _usernameStep(),
                  _OnboardingStep.purpose => _purposeStep(),
                  _OnboardingStep.choice => _choiceStep(pending),
                },
                if (pending) ...[
                  const SizedBox(height: 16),
                  Semantics(
                    label:
                        'Submitting ${_choiceLabel(_chosenChoice)} initial settings.',
                    liveRegion: true,
                    child: Text(
                      'Submitting ${_choiceLabel(_chosenChoice)} settings...',
                    ),
                  ),
                  const SizedBox(height: 8),
                  const LinearProgressIndicator(),
                ],
                if (state case CommandFailed<ProductAccount>(:final failure)) ...[
                  const SizedBox(height: 16),
                  _FailureText(failure: failure),
                  if (_step == _OnboardingStep.choice &&
                      _chosenChoice != null) ...[
                    const SizedBox(height: 12),
                    FilledButton(
                      key: const Key('r6-initial-choice-retry'),
                      onPressed: pending
                          ? null
                          : () => _complete(_chosenChoice!),
                      child: const Text('Retry'),
                    ),
                  ],
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  List<Widget> _usernameStep() {
    return [
      const Text(
        'Use 3–30 lowercase letters, numbers or underscores. Start and end with a letter or number; do not use consecutive underscores.',
        key: Key('r6-onboarding-username-guidance'),
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
      FilledButton(
        key: const Key('r6-onboarding-username-continue'),
        onPressed: _continueFromUsername,
        child: const Text('Continue'),
      ),
    ];
  }

  List<Widget> _purposeStep() {
    return [
      const Text(
        'The two final choices jointly control approved optional processing and current Check-in visibility. Either choice allows continued use of the bounded core flow.',
        key: Key('r6-initial-choice-purpose-copy'),
      ),
      const SizedBox(height: 20),
      FilledButton(
        key: const Key('r6-initial-choice-info-continue'),
        onPressed: () => setState(() => _step = _OnboardingStep.choice),
        child: const Text('Continue'),
      ),
    ];
  }

  List<Widget> _choiceStep(bool pending) {
    return [
      const Text(
        'Accept saves optional processing as accepted and current Check-in visibility as Public. Reject saves optional processing as rejected and current Check-in visibility as Private. Either choice lets you continue.',
        key: Key('r6-initial-choice-statement'),
      ),
      const SizedBox(height: 20),
      _ChoicePanel(
        title: 'Accept — Public',
        body: 'Accept saves optional processing as accepted and current Check-in visibility as Public.',
        icon: Icons.public,
        onPressed: pending ? null : () => _complete(InitialChoice.accept),
        buttonKey: const Key('r6-initial-choice-accept'),
      ),
      const SizedBox(height: 12),
      _ChoicePanel(
        title: 'Reject — Private',
        body: 'Reject saves optional processing as rejected and current Check-in visibility as Private.',
        icon: Icons.lock_outline,
        onPressed: pending ? null : () => _complete(InitialChoice.reject),
        buttonKey: const Key('r6-initial-choice-reject'),
      ),
    ];
  }

  void _continueFromUsername() {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _acceptedUsername = _usernameController.text.trim();
      _step = _OnboardingStep.purpose;
    });
  }

  void _complete(InitialChoice choice) {
    final username = _acceptedUsername;
    if (username == null) return;
    setState(() => _chosenChoice = choice);
    ref
        .read(onboardingControllerProvider.notifier)
        .complete(username: username, initialChoice: choice);
  }

  String? _validateUsername(String? value) {
    final username = value?.trim() ?? '';
    final validShape = RegExp(r'^[a-z0-9](?:[a-z0-9_]{1,28}[a-z0-9])?$')
        .hasMatch(username);
    if (!validShape || username.contains('__')) {
      return 'Enter a valid Username using the format shown.';
    }
    return null;
  }

  String _choiceLabel(InitialChoice? choice) {
    return switch (choice) {
      InitialChoice.accept => 'Accept — Public',
      InitialChoice.reject => 'Reject — Private',
      null => 'selected',
    };
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
                    child: Semantics(
                      label: '$title. $body',
                      button: true,
                      child: FilledButton(
                        key: buttonKey,
                        onPressed: onPressed,
                        child: Text(title),
                      ),
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
      _failureCopy(failure.kind),
      key: const Key('r6-onboarding-failure'),
      style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: color),
    );
  }

  String _failureCopy(AppFailureKind kind) {
    return switch (kind) {
      AppFailureKind.usernameInvalid =>
        'Enter a valid Username using the format shown.',
      AppFailureKind.usernameUnavailable => 'This Username is unavailable.',
      AppFailureKind.onboardingConflict =>
        'Account setup could not be completed with these details.',
      _ => 'Account setup could not be completed. Try again.',
    };
  }
}
