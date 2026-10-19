import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/command_state.dart';
import '../../../core/result/result.dart';
import 'sign_in_controller.dart';
import 'auth_email_page.dart';

final class SignInPage extends ConsumerStatefulWidget {
  const SignInPage({
    required this.onCreateAccount,
    required this.onSucceeded,
    super.key,
  });

  final VoidCallback onCreateAccount;
  final VoidCallback onSucceeded;

  @override
  ConsumerState<SignInPage> createState() => _SignInPageState();
}

final class _SignInPageState extends ConsumerState<SignInPage> {
  late final SignInController _controller;
  bool _showPassword = false;
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _controller = ref.read(signInControllerProvider.notifier);
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    Future<void>.microtask(() => _controller.abandon(resetState: false));
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<CommandState<void>>(signInControllerProvider, (previous, next) {
      if (!mounted) return;
      if (next case CommandSucceeded<void>()) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) widget.onSucceeded();
        });
      }
    });

    final state = ref.watch(signInControllerProvider);
    final pending = state is CommandPending<void>;
    return Scaffold(
      appBar: AppBar(title: const Text('Sign in')),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: ListView(
              key: const Key('route-sign-in'),
              padding: const EdgeInsets.all(24),
              children: [
                Text(
                  'Sign in to ENMORI',
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                const SizedBox(height: 8),
                const Text(
                  'Continue an existing account or recover your session.',
                ),
                const SizedBox(height: 24),
                Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      TextFormField(
                        key: const Key('sign-in-email'),
                        controller: _emailController,
                        autofillHints: const [AutofillHints.email],
                        decoration: const InputDecoration(labelText: 'Email'),
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: TextInputAction.next,
                        validator: (value) {
                          final email = value?.trim() ?? '';
                          return email.isEmpty || !email.contains('@')
                              ? 'Enter a valid email.'
                              : null;
                        },
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        key: const Key('sign-in-password'),
                        controller: _passwordController,
                        autofillHints: const [AutofillHints.password],
                        decoration: InputDecoration(
                          suffixIcon: IconButton(
                            tooltip: _showPassword
                                ? 'Hide password'
                                : 'Show password',
                            onPressed: () =>
                                setState(() => _showPassword = !_showPassword),
                            icon: Icon(
                              _showPassword
                                  ? Icons.visibility_off
                                  : Icons.visibility,
                            ),
                          ),
                          labelText: 'Password',
                        ),
                        obscureText: !_showPassword,
                        textInputAction: TextInputAction.done,
                        validator: (value) => (value ?? '').isEmpty
                            ? 'Enter your password.'
                            : null,
                      ),
                      if (state case CommandFailed<void>(:final failure)) ...[
                        const SizedBox(height: 12),
                        Text(
                          _failureCopy(failure.kind),
                          key: const Key('sign-in-failure'),
                          style: Theme.of(context).textTheme.bodyMedium
                              ?.copyWith(
                                color: Theme.of(context).colorScheme.error,
                              ),
                        ),
                      ],
                      const SizedBox(height: 20),
                      FilledButton.icon(
                        key: const Key('sign-in-submit'),
                        onPressed: pending ? null : _submit,
                        icon: pending
                            ? const SizedBox.square(
                                dimension: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Icon(Icons.login),
                        label: Text(pending ? 'Signing in' : 'Sign in'),
                      ),
                      TextButton(
                        key: const Key('forgot-password'),
                        onPressed: pending
                            ? null
                            : () => Navigator.of(context).push<void>(
                                MaterialPageRoute(
                                  builder: (_) =>
                                      const AuthEmailPage(resetPassword: true),
                                ),
                              ),
                        child: const Text('Forgot password?'),
                      ),
                      TextButton(
                        key: const Key('sign-in-create-account'),
                        onPressed: pending ? null : widget.onCreateAccount,
                        child: const Text('Create account'),
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
    ref
        .read(signInControllerProvider.notifier)
        .signIn(
          email: _emailController.text.trim(),
          password: _passwordController.text,
        );
  }

  String _failureCopy(AppFailureKind kind) => switch (kind) {
    AppFailureKind.authenticationInvalid =>
      'Enter valid account details and try again.',
    AppFailureKind.authForbidden => 'This account cannot continue.',
    AppFailureKind.serviceUnavailable ||
    AppFailureKind.configurationUnavailable =>
      'This service is temporarily unavailable. Try again.',
    _ => 'This service is temporarily unavailable. Try again.',
  };
}
