import 'package:enmori/core/presentation/enmori_localizations.dart';

import '../../auth/presentation/auth_email_page.dart';

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
  late final OnboardingController _controller;
  final _formKey = GlobalKey<FormState>();
  final _usernameController = TextEditingController();
  _OnboardingStep _step = _OnboardingStep.username;
  String? _acceptedUsername;
  InitialChoice? _chosenChoice;

  @override
  void initState() {
    super.initState();
    _controller = ref.read(onboardingControllerProvider.notifier);
  }

  @override
  void dispose() {
    _usernameController.dispose();
    Future<void>.microtask(() => _controller.abandon(resetState: false));
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
      _OnboardingStep.username => context.tr('Choose your Username', "设置用户名"),
      _OnboardingStep.purpose => context.tr('Optional data use', "可选数据使用"),
      _OnboardingStep.choice => context.tr(
        'Choose your initial settings',
        "选择初始设置",
      ),
    };
    return Scaffold(
      appBar: AppBar(title: Text(context.tr('Set up your account', "完善账号"))),
      body: SafeArea(
        child: Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 560),
            child: ListView(
              key: const Key('route-onboarding'),
              padding: const EdgeInsets.all(16),
              children: [
                const VerifyEmailButton(),
                Text(title, style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 16),
                ...switch (_step) {
                  _OnboardingStep.username => _usernameStep(),
                  _OnboardingStep.purpose => _purposeStep(),
                  _OnboardingStep.choice => _choiceStep(pending),
                },
                if (pending) ...[
                  const SizedBox(height: 16),
                  Semantics(
                    label: context.tr(
                      'Submitting ${_choiceLabel(_chosenChoice)} initial settings.',
                      '正在提交初始设置：${_choiceLabel(_chosenChoice)}。',
                    ),
                    liveRegion: true,
                    child: Text(
                      context.tr(
                        'Submitting ${_choiceLabel(_chosenChoice)} settings...',
                        '正在提交设置：${_choiceLabel(_chosenChoice)}…',
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  const LinearProgressIndicator(),
                ],
                if (state case CommandFailed<ProductAccount>(
                  :final failure,
                )) ...[
                  const SizedBox(height: 16),
                  _FailureText(failure: failure),
                  if (_step == _OnboardingStep.choice &&
                      (failure.kind == AppFailureKind.usernameInvalid ||
                          failure.kind == AppFailureKind.usernameUnavailable))
                    TextButton(
                      key: const Key('r6-onboarding-change-username'),
                      onPressed: () {
                        _controller.abandon();
                        setState(() {
                          _step = _OnboardingStep.username;
                          _acceptedUsername = null;
                          _chosenChoice = null;
                        });
                      },
                      child: Text(context.tr('Change Username', "重新选择用户名")),
                    ),
                  if (_step == _OnboardingStep.choice &&
                      _chosenChoice != null) ...[
                    const SizedBox(height: 12),
                    FilledButton(
                      key: const Key('r6-initial-choice-retry'),
                      onPressed: pending
                          ? null
                          : () => _complete(_chosenChoice!),
                      child: Text(context.tr('Retry', "重试")),
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
      Text(
        context.tr(
          'Use 3–30 lowercase letters, numbers or underscores. Start and end with a letter or number; do not use consecutive underscores.',
          "使用 3–30 个小写英文字母、数字或下划线。首尾须为字母或数字，不可连续使用下划线。",
        ),
        key: Key('r6-onboarding-username-guidance'),
      ),
      const SizedBox(height: 24),
      Form(
        key: _formKey,
        child: TextFormField(
          key: const Key('r6-onboarding-username'),
          controller: _usernameController,
          decoration: InputDecoration(labelText: context.tr('Username', "用户名")),
          textInputAction: TextInputAction.done,
          validator: _validateUsername,
        ),
      ),
      const SizedBox(height: 20),
      FilledButton(
        key: const Key('r6-onboarding-username-continue'),
        onPressed: _continueFromUsername,
        child: Text(context.tr('Continue', "继续")),
      ),
    ];
  }

  List<Widget> _purposeStep() {
    return [
      Text(
        context.tr(
          'This release does not perform optional AI or Recommendation processing in this setup flow. Your choice saves whether separately authorised optional features may use their approved data later. Reject keeps optional processing off. Either choice lets you continue.',
          "当前版本不会在账号设置过程中执行可选的 AI 或推荐处理。此选择仅保存后续已获单独授权的可选功能能否使用其批准范围内的数据。拒绝会关闭可选处理；两种选择都可以继续。",
        ),
        key: Key('r6-initial-choice-purpose-copy'),
      ),
      const SizedBox(height: 12),
      Text(
        context.tr(
          'Check-in Notes are not used for Recommendation ranking. Your selected area and optional private birthday can help recommendations when enabled. Device coordinates are not sent to AI.',
          "签到文字不用于推荐排序。开启后可使用所选地区和选填生日辅助推荐，设备坐标不会发送给 AI。",
        ),
        key: Key('r6-initial-choice-purpose-supporting-statement'),
      ),
      const SizedBox(height: 20),
      FilledButton(
        key: const Key('r6-initial-choice-info-continue'),
        onPressed: () => setState(() => _step = _OnboardingStep.choice),
        child: Text(context.tr('Continue', "继续")),
      ),
    ];
  }

  List<Widget> _choiceStep(bool pending) {
    return [
      Text(
        context.tr(
          'Optional data use is separate from privacy. New Check-ins start Private with either choice. You can change the default in Settings without changing past records.',
          "可选数据使用与隐私设置相互独立。无论如何选择，新签到最初都默认为私密。你可以在设置中修改默认值，不会改变历史记录。",
        ),
        key: Key('r6-initial-choice-statement'),
      ),
      const SizedBox(height: 20),
      _ChoicePanel(
        title: context.tr('Allow optional data use', "允许可选数据使用"),
        body: context.tr(
          'Allow personalised recommendations and AI using permitted data.',
          "允许使用已获许可的数据提供个性化推荐与 AI 功能。",
        ),
        icon: Icons.public,
        onPressed: pending ? null : () => _complete(InitialChoice.accept),
        buttonKey: const Key('r6-initial-choice-accept'),
      ),
      const SizedBox(height: 12),
      _ChoicePanel(
        title: context.tr('Continue without optional data use', "不允许可选数据使用并继续"),
        body: context.tr(
          'Keep using your account, activities, friends and Check-ins. AI will be limited.',
          "仍可使用账号、活动、好友与签到。AI 功能将受到限制。",
        ),
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
    final validShape = RegExp(r'^[a-z0-9][a-z0-9_]{1,28}[a-z0-9]$')
        .hasMatch(username);
    if (!validShape || username.contains('__')) {
      return context.tr(
        'Enter a valid Username using the format shown.',
        "请按提示格式输入有效用户名。",
      );
    }
    return null;
  }

  String _choiceLabel(InitialChoice? choice) {
    return switch (choice) {
      InitialChoice.accept => context.tr('Allow optional data use', "允许可选数据使用"),
      InitialChoice.reject => context.tr(
        'Continue without optional data use',
        "不允许可选数据使用并继续",
      ),
      null => context.tr('selected', '所选'),
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
      _failureCopy(context, failure.kind),
      key: const Key('r6-onboarding-failure'),
      style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: color),
    );
  }

  String _failureCopy(BuildContext context, AppFailureKind kind) {
    return switch (kind) {
      AppFailureKind.usernameInvalid => context.tr(
        'Enter a valid Username using the format shown.',
        "请按提示格式输入有效用户名。",
      ),
      AppFailureKind.usernameUnavailable => context.tr(
        'This Username is unavailable.',
        "此用户名不可用。",
      ),
      AppFailureKind.onboardingConflict => context.tr(
        'Account setup could not be completed with these details.',
        "无法使用这些信息完成账号设置。",
      ),
      AppFailureKind.authRequired => context.tr(
        'Your session has expired. Sign in again.',
        "登录已过期，请重新登录。",
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
}
