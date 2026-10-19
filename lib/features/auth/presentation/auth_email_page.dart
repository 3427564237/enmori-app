import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../auth_providers.dart';

/// Email links are completed by Firebase's hosted action handler.
final class AuthEmailPage extends ConsumerStatefulWidget {
  const AuthEmailPage({this.resetPassword = false, super.key});
  final bool resetPassword;
  @override
  ConsumerState<AuthEmailPage> createState() => _AuthEmailPageState();
}

final class _AuthEmailPageState extends ConsumerState<AuthEmailPage> {
  final _email = TextEditingController();
  bool _pending = false;
  String? _message;
  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _run({bool check = false}) async {
    if (_pending) return;
    final repository = ref.read(authEmailRepositoryProvider);
    if (repository == null) {
      setState(
        () => _message = 'Email actions are unavailable in this environment.',
      );
      return;
    }
    if (widget.resetPassword && !_email.text.trim().contains('@')) {
      setState(() => _message = 'Enter a valid email.');
      return;
    }
    final session = ref.read(authSessionProvider).asData?.value;
    setState(() {
      _pending = true;
      _message = null;
    });
    final Result<Object?> result;
    if (check) {
      result = await repository.readEmailVerified();
    } else if (widget.resetPassword) {
      result = await repository.sendPasswordResetEmail(_email.text);
    } else {
      result = await repository.sendVerificationEmail();
    }
    if (!mounted) return;
    if (!widget.resetPassword &&
        !identical(session, ref.read(authSessionProvider).asData?.value)) {
      Navigator.of(context).pop();
      return;
    }
    setState(() {
      _pending = false;
      _message = switch (result) {
        Failure<Object?>() =>
          'Could not complete this request. Wait a moment and try again.',
        Success<Object?>(value: true) => 'Email verified.',
        Success<Object?>(value: false) =>
          'Your email is not verified yet. Open the link, then check again.',
        _ =>
          widget.resetPassword
              ? 'If this email has an account, a reset link has been sent. Complete it in your email, then return to sign in.'
              : 'Verification email sent. Open the link in your email, then check again.',
      };
    });
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(widget.resetPassword ? 'Reset password' : 'Verify email'),
    ),
    body: ListView(
      padding: const EdgeInsets.all(24),
      children: [
        Text(
          widget.resetPassword
              ? 'Use a secure email link to choose a new password.'
              : 'Verify ownership of your email using the Firebase email link.',
        ),
        if (widget.resetPassword)
          TextField(
            key: const Key('reset-email'),
            controller: _email,
            enabled: !_pending,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(
              labelText: 'Email',
              prefixIcon: Icon(Icons.mail_outline),
            ),
          ),
        const SizedBox(height: 20),
        FilledButton(
          key: const Key('email-send'),
          onPressed: _pending ? null : () => _run(),
          child: Text(
            _pending
                ? 'Please wait…'
                : widget.resetPassword
                ? 'Send reset link'
                : 'Send / resend verification link',
          ),
        ),
        if (!widget.resetPassword)
          OutlinedButton(
            key: const Key('email-check'),
            onPressed: _pending ? null : () => _run(check: true),
            child: const Text('I have verified my email'),
          ),
        if (_message != null) Text(_message!, key: const Key('email-feedback')),
        if (widget.resetPassword)
          TextButton(
            onPressed: _pending ? null : () => Navigator.of(context).pop(),
            child: const Text('Back to sign in'),
          ),
      ],
    ),
  );
}

class VerifyEmailButton extends StatelessWidget {
  const VerifyEmailButton({super.key});
  @override
  Widget build(BuildContext context) => TextButton.icon(
    onPressed: () => Navigator.of(context)
        .push<void>(MaterialPageRoute(builder: (_) => const AuthEmailPage())),
    icon: const Icon(Icons.mark_email_read_outlined),
    label: const Text('Verify email / resend link'),
  );
}
