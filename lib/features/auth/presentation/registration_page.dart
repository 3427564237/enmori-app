import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/command_state.dart';
import '../../../core/result/result.dart';
import 'registration_controller.dart';

final class RegistrationPage extends ConsumerStatefulWidget {
  const RegistrationPage({this.onSignIn, super.key});

  final VoidCallback? onSignIn;

  @override
  ConsumerState<RegistrationPage> createState() => _RegistrationPageState();
}

final class _RegistrationPageState extends ConsumerState<RegistrationPage> {
  late final RegistrationController _controller;
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  final _emailFocusNode = FocusNode();
  final _passwordFocusNode = FocusNode();
  final _confirmFocusNode = FocusNode();
  bool _submitted = false;
  bool _allowPopAfterDiscard = false;

  @override
  void initState() {
    super.initState();
    _controller = ref.read(registrationControllerProvider.notifier);
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    _emailFocusNode.dispose();
    _passwordFocusNode.dispose();
    _confirmFocusNode.dispose();
    Future<void>.microtask(() => _controller.abandon(resetState: false));
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
    final hasDraft = _emailController.text.isNotEmpty ||
        _passwordController.text.isNotEmpty ||
        _confirmController.text.isNotEmpty;
    final page = Scaffold(
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
                        focusNode: _emailFocusNode,
                        autofillHints: const [AutofillHints.email],
                        decoration: const InputDecoration(labelText: 'Email'),
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: TextInputAction.next,
                        onChanged: (_) => setState(() {}),
                        validator: _validateEmail,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        key: const Key('r6-register-password'),
                        controller: _passwordController,
                        focusNode: _passwordFocusNode,
                        autofillHints: const [AutofillHints.newPassword],
                        decoration: const InputDecoration(
                          labelText: 'Password',
                        ),
                        obscureText: true,
                        textInputAction: TextInputAction.next,
                        onChanged: (_) => setState(() {}),
                        validator: _validatePassword,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        key: const Key('r6-register-confirm-password'),
                        controller: _confirmController,
                        focusNode: _confirmFocusNode,
                        autofillHints: const [AutofillHints.newPassword],
                        decoration: const InputDecoration(
                          labelText: 'Confirm password',
                        ),
                        obscureText: true,
                        textInputAction: TextInputAction.done,
                        onChanged: (_) => setState(() {}),
                        validator: _validateConfirmPassword,
                      ),
                      if (_submitted && _fieldErrors.isNotEmpty) ...[
                        const SizedBox(height: 16),
                        _ValidationSummary(
                          errors: _fieldErrors,
                          onFocus: _focusField,
                        ),
                      ],
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
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Icon(Icons.person_add),
                        label: Text(
                          pending ? 'Creating account' : 'Create account',
                        ),
                      ),
                      if (widget.onSignIn case final onSignIn?)
                        TextButton(
                          key: const Key('register-sign-in'),
                          onPressed: pending ? null : onSignIn,
                          child: const Text('Sign in'),
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
    return PopScope<void>(
      canPop: (!pending && !hasDraft) || _allowPopAfterDiscard,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop || pending || !hasDraft || _allowPopAfterDiscard) return;
        final discard = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Leave registration?'),
            content: const Text(
              'Your unsaved account details will be lost.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('Stay'),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(context, true),
                child: const Text('Discard details'),
              ),
            ],
          ),
        );
        if (discard == true && mounted) {
          setState(() => _allowPopAfterDiscard = true);
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) Navigator.of(context).pop();
          });
        }
      },
      child: page,
    );
  }

  List<_FieldError> get _fieldErrors => [
    if (_validateEmail(_emailController.text) != null)
      _FieldError(
        'Email',
        _validateEmail(_emailController.text)!,
        _RegistrationField.email,
      ),
    if (_validatePassword(_passwordController.text) != null)
      _FieldError(
        'Password',
        _validatePassword(_passwordController.text)!,
        _RegistrationField.password,
      ),
    if (_validateConfirmPassword(_confirmController.text) != null)
      _FieldError(
        'Confirm password',
        _validateConfirmPassword(_confirmController.text)!,
        _RegistrationField.confirmPassword,
      ),
  ];

  void _submit() {
    setState(() => _submitted = true);
    if (!(_formKey.currentState?.validate() ?? false)) return;
    ref
        .read(registrationControllerProvider.notifier)
        .register(
          email: _emailController.text.trim(),
          password: _passwordController.text,
        );
  }

  void _focusField(_RegistrationField field) {
    final node = switch (field) {
      _RegistrationField.email => _emailFocusNode,
      _RegistrationField.password => _passwordFocusNode,
      _RegistrationField.confirmPassword => _confirmFocusNode,
    };
    node.requestFocus();
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
    if ((value ?? '').isEmpty || value != _passwordController.text) {
      return 'Passwords must match.';
    }
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
      _publicFailureCopy(failure.kind),
      key: const Key('r6-register-failure'),
      style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: color),
    );
  }

  String _publicFailureCopy(AppFailureKind kind) => switch (kind) {
    AppFailureKind.authenticationInvalid =>
      'Enter valid account details and try again.',
    AppFailureKind.accountAlreadyExists =>
      'This email is already registered. Sign in instead or use another email.',
    AppFailureKind.serviceUnavailable ||
    AppFailureKind.configurationUnavailable =>
      'This service is temporarily unavailable. Try again.',
    AppFailureKind.authRequired => 'Your session has expired. Sign in again.',
    AppFailureKind.authForbidden => 'This account cannot continue.',
    _ => 'This service is temporarily unavailable. Try again.',
  };
}

enum _RegistrationField { email, password, confirmPassword }

final class _FieldError {
  const _FieldError(this.label, this.message, this.field);
  final String label;
  final String message;
  final _RegistrationField field;
}

final class _ValidationSummary extends StatelessWidget {
  const _ValidationSummary({required this.errors, required this.onFocus});
  final List<_FieldError> errors;
  final ValueChanged<_RegistrationField> onFocus;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      liveRegion: true,
      label: 'Review ${errors.length} fields before continuing.',
      child: DecoratedBox(
        key: const Key('sp01-register-error-summary'),
        decoration: BoxDecoration(
          border: Border.all(color: Theme.of(context).colorScheme.error),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Review ${errors.length} fields before continuing.'),
              for (final error in errors)
                TextButton(
                  key: Key('sp01-register-error-${error.field.name}-link'),
                  onPressed: () => onFocus(error.field),
                  child: Text('${error.label}: ${error.message}'),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
