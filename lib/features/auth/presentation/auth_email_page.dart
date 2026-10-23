import 'package:enmori/core/presentation/enmori_localizations.dart';
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
        () => _message = context.tr(
          'Email actions are unavailable in this environment.',
          "当前环境不支持邮箱操作。",
        ),
      );
      return;
    }
    if (widget.resetPassword && !_email.text.trim().contains('@')) {
      setState(() => _message = context.tr('Enter a valid email.', "请输入有效邮箱。"));
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
        Failure<Object?>() => context.tr(
          'Could not complete this request. Wait a moment and try again.',
          "请求未能完成，请稍后重试。",
        ),
        Success<Object?>(value: true) => context.tr(
          'Email verified.',
          "邮箱已验证。",
        ),
        Success<Object?>(value: false) => context.tr(
          'Your email is not verified yet. Open the link, then check again.',
          "邮箱尚未验证，请打开邮件中的链接后再检查。",
        ),
        _ =>
          widget.resetPassword
              ? context.tr(
                  'If this email has an account, a reset link has been sent. Complete it in your email, then return to sign in.',
                  "如果此邮箱已注册，重置链接已发送。请在邮件中完成重置后返回登录。",
                )
              : context.tr(
                  'Verification email sent. Open the link in your email, then check again.',
                  "验证邮件已发送，请打开邮件中的链接后再检查。",
                ),
      };
    });
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(
        widget.resetPassword
            ? context.tr('Reset password', "重置密码")
            : context.tr('Verify email', "验证邮箱"),
      ),
    ),
    body: ListView(
      padding: const EdgeInsets.all(24),
      children: [
        Text(
          widget.resetPassword
              ? context.tr(
                  'Use a secure email link to choose a new password.',
                  "通过安全的邮件链接设置新密码。",
                )
              : context.tr(
                  'Verify ownership of your email using the Firebase email link.',
                  "通过 Firebase 邮件链接验证邮箱归属。",
                ),
        ),
        if (widget.resetPassword)
          TextField(
            key: const Key('reset-email'),
            controller: _email,
            enabled: !_pending,
            keyboardType: TextInputType.emailAddress,
            decoration: InputDecoration(
              labelText: context.tr('Email', "邮箱"),
              prefixIcon: Icon(Icons.mail_outline),
            ),
          ),
        const SizedBox(height: 20),
        FilledButton(
          key: const Key('email-send'),
          onPressed: _pending ? null : () => _run(),
          child: Text(
            _pending
                ? context.tr('Please wait…', "请稍候…")
                : widget.resetPassword
                ? context.tr('Send reset link', "发送重置链接")
                : context.tr('Send / resend verification link', "发送／重新发送验证链接"),
          ),
        ),
        if (!widget.resetPassword)
          OutlinedButton(
            key: const Key('email-check'),
            onPressed: _pending ? null : () => _run(check: true),
            child: Text(context.tr('I have verified my email', "我已完成邮箱验证")),
          ),
        if (_message != null) Text(_message!, key: const Key('email-feedback')),
        if (widget.resetPassword)
          TextButton(
            onPressed: _pending ? null : () => Navigator.of(context).pop(),
            child: Text(context.tr('Back to sign in', "返回登录")),
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
    label: Text(context.tr('Verify email / resend link', "验证邮箱／重新发送链接")),
  );
}
