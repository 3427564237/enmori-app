import 'package:enmori/core/presentation/enmori_localizations.dart';
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
  bool _submitted = false;
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
      appBar: AppBar(title: Text(context.tr('Sign in', "登录"))),
      body: SafeArea(
        child: Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: ListView(
              key: const Key('route-sign-in'),
              padding: const EdgeInsets.all(16),
              children: [
                Text(
                  context.tr('Sign in to ENMORI', "登录 ENMORI"),
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 8),
                Text(context.tr('Welcome back.', "欢迎回来。")),
                const SizedBox(height: 24),
                Form(
                  key: _formKey,
                  autovalidateMode: _submitted
                      ? AutovalidateMode.onUserInteraction
                      : AutovalidateMode.disabled,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      TextFormField(
                        key: const Key('sign-in-email'),
                        controller: _emailController,
                        enabled: !pending,
                        autofillHints: const [AutofillHints.email],
                        decoration: InputDecoration(
                          labelText: context.tr('Email', "邮箱"),
                          prefixIcon: Icon(Icons.mail_outline),
                        ),
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: TextInputAction.next,
                        validator: (value) {
                          final email = value?.trim() ?? '';
                          return email.isEmpty || !email.contains('@')
                              ? context.tr('Enter a valid email.', "请输入有效邮箱。")
                              : null;
                        },
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        key: const Key('sign-in-password'),
                        controller: _passwordController,
                        enabled: !pending,
                        autofillHints: const [AutofillHints.password],
                        decoration: InputDecoration(
                          suffixIcon: IconButton(
                            tooltip: _showPassword
                                ? context.tr('Hide password', "隐藏密码")
                                : context.tr('Show password', "显示密码"),
                            onPressed: () =>
                                setState(() => _showPassword = !_showPassword),
                            icon: Icon(
                              _showPassword
                                  ? Icons.visibility_off
                                  : Icons.visibility,
                            ),
                          ),
                          labelText: context.tr('Password', "密码"),
                          prefixIcon: const Icon(Icons.lock_outline),
                        ),
                        obscureText: !_showPassword,
                        textInputAction: TextInputAction.done,
                        onFieldSubmitted: (_) => _submit(),
                        validator: (value) => (value ?? '').isEmpty
                            ? context.tr('Enter your password.', "请输入密码。")
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
                        label: Text(
                          pending
                              ? context.tr('Signing in', "正在登录")
                              : context.tr('Sign in', "登录"),
                        ),
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
                        child: Text(context.tr('Forgot password?', "忘记密码？")),
                      ),
                      TextButton(
                        key: const Key('sign-in-create-account'),
                        onPressed: pending ? null : widget.onCreateAccount,
                        child: Text(context.tr('Create account', "创建账号")),
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
    if (ref.read(signInControllerProvider) is CommandPending<void>) return;
    setState(() => _submitted = true);
    if (!(_formKey.currentState?.validate() ?? false)) return;
    ref
        .read(signInControllerProvider.notifier)
        .signIn(
          email: _emailController.text.trim(),
          password: _passwordController.text,
        );
  }

  String _failureCopy(AppFailureKind kind) => switch (kind) {
    AppFailureKind.authenticationInvalid => context.tr(
      'Enter valid account details and try again.',
      "请输入有效账号信息后重试。",
    ),
    AppFailureKind.authForbidden => context.tr(
      'This account cannot continue.',
      "此账号暂时无法继续。",
    ),
    AppFailureKind.serviceUnavailable ||
    AppFailureKind.configurationUnavailable => context.tr(
      'This service is temporarily unavailable. Try again.',
      "服务暂时不可用，请重试。",
    ),
    _ => context.tr(
      'This service is temporarily unavailable. Try again.',
      "服务暂时不可用，请重试。",
    ),
  };
}
