import 'package:enmori/core/presentation/enmori_localizations.dart';
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
  bool _showPassword = false;
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  final _emailFocusNode = FocusNode();
  final _passwordFocusNode = FocusNode();
  final _confirmFocusNode = FocusNode();
  bool _submitted = false;
  bool _allowPopAfterDiscard = false;
  bool _confirmingLeave = false;
  bool _termsAccepted = false;

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
          SnackBar(
            content: Text(
              context.tr(
                'Account request submitted. Waiting for session.',
                "账号请求已提交，正在等待登录状态。",
              ),
            ),
          ),
        );
      }
    });

    final state = ref.watch(registrationControllerProvider);
    final pending = state is CommandPending<void>;
    final hasDraft =
        _emailController.text.isNotEmpty ||
        _passwordController.text.isNotEmpty ||
        _confirmController.text.isNotEmpty ||
        _termsAccepted;
    final page = Scaffold(
      appBar: AppBar(title: Text(context.tr('Create account', "创建账号"))),
      body: SafeArea(
        child: Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: SingleChildScrollView(
              key: const Key('route-register'),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    context.tr('Register for ENMORI', "注册 ENMORI"),
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    context.tr(
                      'Start with your email and a password.',
                      "使用邮箱和密码开始。",
                    ),
                  ),
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
                          key: const Key('r6-register-email'),
                          controller: _emailController,
                          onChanged: (_) => setState(() {}),
                          focusNode: _emailFocusNode,
                          autofillHints: const [AutofillHints.email],
                          decoration: InputDecoration(
                            labelText: context.tr('Email', "邮箱"),
                            prefixIcon: Icon(Icons.mail_outline),
                          ),
                          keyboardType: TextInputType.emailAddress,
                          textInputAction: TextInputAction.next,
                          validator: _validateEmail,
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          key: const Key('r6-register-password'),
                          controller: _passwordController,
                          onChanged: (_) => setState(() {}),
                          focusNode: _passwordFocusNode,
                          autofillHints: const [AutofillHints.newPassword],
                          decoration: InputDecoration(
                            suffixIcon: IconButton(
                              tooltip: _showPassword
                                  ? context.tr('Hide password', "隐藏密码")
                                  : context.tr('Show password', "显示密码"),
                              onPressed: () => setState(
                                () => _showPassword = !_showPassword,
                              ),
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
                          textInputAction: TextInputAction.next,
                          validator: _validatePassword,
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          key: const Key('r6-register-confirm-password'),
                          controller: _confirmController,
                          onChanged: (_) => setState(() {}),
                          focusNode: _confirmFocusNode,
                          autofillHints: const [AutofillHints.newPassword],
                          decoration: InputDecoration(
                            suffixIcon: IconButton(
                              tooltip: _showPassword
                                  ? context.tr('Hide password', "隐藏密码")
                                  : context.tr('Show password', "显示密码"),
                              onPressed: () => setState(
                                () => _showPassword = !_showPassword,
                              ),
                              icon: Icon(
                                _showPassword
                                    ? Icons.visibility_off
                                    : Icons.visibility,
                              ),
                            ),
                            labelText: context.tr('Confirm password', "确认密码"),
                            prefixIcon: const Icon(Icons.lock_outline),
                          ),
                          obscureText: !_showPassword,
                          textInputAction: TextInputAction.done,
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
                        CheckboxListTile(
                          key: const Key('register-terms'),
                          value: _termsAccepted,
                          onChanged: pending
                              ? null
                              : (value) => setState(
                                  () => _termsAccepted = value ?? false,
                                ),
                          title: Text(
                            context.tr(
                              'I agree to the terms of use',
                              "我同意使用条款",
                            ),
                          ),
                          subtitle: Text(
                            context.tr(
                              'This is separate from optional data use and sharing preferences.',
                              "此项与可选数据使用及分享偏好相互独立。",
                            ),
                          ),
                        ),
                        if (_submitted && !_termsAccepted)
                          Text(
                            context.tr(
                              'Please accept the terms before creating an account.',
                              "创建账号前请先同意使用条款。",
                            ),
                          ),
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
                            pending
                                ? context.tr('Creating account', "正在创建账号")
                                : context.tr('Create account', "创建账号"),
                          ),
                        ),
                        if (widget.onSignIn case final onSignIn?)
                          TextButton(
                            key: const Key('register-sign-in'),
                            onPressed: pending
                                ? null
                                : () async {
                                    if (!hasDraft || await _confirmDiscard()) {
                                      if (mounted) onSignIn();
                                    }
                                  },
                            child: Text(context.tr('Sign in', "登录")),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
    return PopScope<void>(
      canPop: (!pending && !hasDraft) || _allowPopAfterDiscard,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop || pending || !hasDraft || _allowPopAfterDiscard) return;
        final discard = await _confirmDiscard();
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

  Future<bool> _confirmDiscard() async {
    if (_confirmingLeave) return false;
    _confirmingLeave = true;
    final discard = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(context.tr('Leave registration?', "离开注册？")),
        content: Text(
          context.tr(
            'Your unsaved account details will be lost.',
            "未保存的账号信息将丢失。",
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(context.tr('Stay', "继续编辑")),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(context.tr('Discard details', "放弃填写")),
          ),
        ],
      ),
    );
    _confirmingLeave = false;
    return mounted && discard == true;
  }

  List<_FieldError> get _fieldErrors => [
    if (_validateEmail(_emailController.text) != null)
      _FieldError(
        context.tr('Email', "邮箱"),
        _validateEmail(_emailController.text)!,
        _RegistrationField.email,
      ),
    if (_validatePassword(_passwordController.text) != null)
      _FieldError(
        context.tr('Password', "密码"),
        _validatePassword(_passwordController.text)!,
        _RegistrationField.password,
      ),
    if (_validateConfirmPassword(_confirmController.text) != null)
      _FieldError(
        context.tr('Confirm password', "确认密码"),
        _validateConfirmPassword(_confirmController.text)!,
        _RegistrationField.confirmPassword,
      ),
  ];

  void _submit() {
    setState(() => _submitted = true);
    if (!(_formKey.currentState?.validate() ?? false) || !_termsAccepted) {
      return;
    }
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
    if (email.isEmpty || !email.contains('@')) {
      return context.tr('Enter a valid email.', "请输入有效邮箱。");
    }
    return null;
  }

  String? _validatePassword(String? value) {
    if ((value ?? '').length < 8) {
      return context.tr('Use at least 8 characters.', "请至少使用 8 个字符。");
    }
    return null;
  }

  String? _validateConfirmPassword(String? value) {
    if ((value ?? '').isEmpty || value != _passwordController.text) {
      return context.tr('Passwords must match.', "两次输入的密码必须一致。");
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
      _publicFailureCopy(context, failure.kind),
      key: const Key('r6-register-failure'),
      style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: color),
    );
  }

  String _publicFailureCopy(
    BuildContext context,
    AppFailureKind kind,
  ) => switch (kind) {
    AppFailureKind.authenticationInvalid => context.tr(
      'Enter valid account details and try again.',
      "请输入有效账号信息后重试。",
    ),
    AppFailureKind.accountAlreadyExists => context.tr(
      'This email is already registered. Sign in instead or use another email.',
      "此邮箱已注册，请直接登录或使用其他邮箱。",
    ),
    AppFailureKind.serviceUnavailable ||
    AppFailureKind.configurationUnavailable => context.tr(
      'This service is temporarily unavailable. Try again.',
      "服务暂时不可用，请重试。",
    ),
    AppFailureKind.authRequired => context.tr(
      'Your session has expired. Sign in again.',
      "登录已过期，请重新登录。",
    ),
    AppFailureKind.authForbidden => context.tr(
      'This account cannot continue.',
      "此账号暂时无法继续。",
    ),
    _ => context.tr(
      'This service is temporarily unavailable. Try again.',
      "服务暂时不可用，请重试。",
    ),
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
      label: context.tr(
        'Review ${errors.length} fields before continuing.',
        '请先检查 ${errors.length} 项输入。',
      ),
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
              Text(
                context.tr(
                  'Review ${errors.length} fields before continuing.',
                  '请先检查 ${errors.length} 项输入。',
                ),
              ),
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
