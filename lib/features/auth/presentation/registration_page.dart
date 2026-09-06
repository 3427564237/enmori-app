import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/command_state.dart';
import '../../../core/result/result.dart';
import 'registration_controller.dart';

final class RegistrationPage extends ConsumerStatefulWidget {
  const RegistrationPage({super.key});

  @override
  ConsumerState<RegistrationPage> createState() => _RegistrationPageState();
}

final class _RegistrationPageState extends ConsumerState<RegistrationPage> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<CommandState<void>>(registrationControllerProvider, (
      previous,
      next,
    ) {
      if (!mounted) return;
      if (next case CommandSucceeded<void>()) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Account request submitted. Waiting for session.'),
          ),
        );
      }
    });

    final state = ref.watch(registrationControllerProvider);
    final pending = state is CommandPending<void>;
    return Scaffold(
      appBar: AppBar(title: const Text('Create account')),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: ListView(
              key: const Key('route-register'),
              padding: const EdgeInsets.all(24),
              children: [
                Text(
                  'Register for ENMORI',
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                const SizedBox(height: 8),
                const Text('Create access before completing onboarding.'),
                const SizedBox(height: 24),
                Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      TextFormField(
                        key: const Key('r6-register-email'),
                        controller: _emailController,
                        autofillHints: const [AutofillHints.email],
                        decoration: const InputDecoration(labelText: 'Email'),
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: TextInputAction.next,
                        validator: _validateEmail,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        key: const Key('r6-register-password'),
                        controller: _passwordController,
                        autofillHints: const [AutofillHints.newPassword],
                        decoration: const InputDecoration(labelText: 'Password'),
                        obscureText: true,
                        textInputAction: TextInputAction.next,
                        validator: _validatePassword,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        key: const Key('r6-register-confirm-password'),
                        controller: _confirmController,
                        autofillHints: const [AutofillHints.newPassword],
                        decoration: const InputDecoration(
                          labelText: 'Confirm password',
                        ),
                        obscureText: true,
                        textInputAction: TextInputAction.done,
                        validator: _validateConfirmPassword,
                      ),
                      if (state case CommandFailed<void>(:final failure)) ...[
                        const SizedBox(height: 12),
                        _FailureText(failure: failure),
                      ],
                      const SizedBox(height: 20),
                      FilledButton.icon(
                        key: const Key('r6-register-submit'),
                        onPressed: pending ? null : _submit,
                        icon: pending
                            ? const SizedBox.square(
                                dimension: 18,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Icon(Icons.person_add),
                        label: Text(pending ? 'Creating account' : 'Create account'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _submit() {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    ref.read(registrationControllerProvider.notifier).register(
          email: _emailController.text.trim(),
          password: _passwordController.text,
        );
  }

  String? _validateEmail(String? value) {
    final email = value?.trim() ?? '';
    if (email.isEmpty || !email.contains('@')) return 'Enter a valid email.';
    return null;
  }

  String? _validatePassword(String? value) {
    if ((value ?? '').length < 8) return 'Use at least 8 characters.';
    return null;
  }

  String? _validateConfirmPassword(String? value) {
    if (value != _passwordController.text) return 'Passwords must match.';
    return null;
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
      key: const Key('r6-register-failure'),
      style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: color),
    );
  }
}
