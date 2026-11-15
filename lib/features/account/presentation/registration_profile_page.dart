import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../../auth/auth_providers.dart';
import '../content_access.dart';
import 'account_feedback.dart';
import 'account_preferences_controller.dart';
import 'own_avatar_view.dart';

/// Optional guidance after the account itself has been created.
final class RegistrationProfilePage extends ConsumerWidget {
  const RegistrationProfilePage({
    required this.onContinue,
    this.hasRecommendationStep = true,
    super.key,
  });

  final Future<void> Function() onContinue;
  final bool hasRecommendationStep;

  @override
  Widget build(BuildContext context, WidgetRef ref) => _ProfileStep(
    key: ValueKey(ref.watch(authSessionProvider).asData?.value),
    onContinue: onContinue,
    totalSteps: hasRecommendationStep ? 3 : 2,
  );
}

final class _ProfileStep extends ConsumerStatefulWidget {
  const _ProfileStep({
    required this.onContinue,
    required this.totalSteps,
    super.key,
  });
  final Future<void> Function() onContinue;
  final int totalSteps;

  @override
  ConsumerState<_ProfileStep> createState() => _ProfileStepState();
}

final class _ProfileStepState extends ConsumerState<_ProfileStep> {
  final _name = TextEditingController();
  final _form = GlobalKey<FormState>();
  bool _initialized = false, _submitting = false, _confirming = false;
  bool _saveUnconfirmed = false;
  int _epoch = 0;

  static final _provider = accountPreferencesControllerProvider(
    PreferencesView.profile,
  );

  bool _current(Object? session, int epoch) =>
      mounted &&
      epoch == _epoch &&
      ref.read(currentAuthSubjectProvider) != null &&
      identical(session, ref.read(authSessionProvider).asData?.value) &&
      ref.read(contentAccessProvider).foreground &&
      ModalRoute.of(context)?.isCurrent == true;

  @override
  void dispose() {
    _epoch++;
    _name.dispose();
    super.dispose();
  }

  Future<void> _continue() async {
    final state = ref.read(_provider);
    final profile = state.profile;
    final session = ref.read(authSessionProvider).asData?.value, epoch = _epoch;
    if (_submitting ||
        !_current(session, epoch) ||
        state.phase != PreferencesPhase.ready ||
        profile == null ||
        !(_form.currentState?.validate() ?? false)) {
      return;
    }
    FocusScope.of(context).unfocus();
    final text = _name.text.trim(), name = text.isEmpty ? null : text;
    setState(() => _submitting = true);
    try {
      if (name != profile.displayName) {
        _saveUnconfirmed = true;
        // Omit optional details and retain the freshly read visibility.
        await ref
            .read(_provider.notifier)
            .saveProfile(name, profile.visibility);
        if (!_current(session, epoch)) return;
        final fresh = ref.read(_provider);
        if (fresh.phase != PreferencesPhase.ready ||
            !fresh.saved ||
            fresh.profile?.displayName != name) {
          return;
        }
        _saveUnconfirmed = false;
      }
      if (_current(session, epoch)) await widget.onContinue();
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _skip() async {
    final state = ref.read(_provider);
    final session = ref.read(authSessionProvider).asData?.value, epoch = _epoch;
    if (_submitting ||
        _confirming ||
        state.phase == PreferencesPhase.saving ||
        !_current(session, epoch)) {
      return;
    }
    final uncertain =
        _saveUnconfirmed || state.phase == PreferencesPhase.reloadRequired;
    if (_name.text.trim() != (state.profile?.displayName ?? '') || uncertain) {
      _confirming = true;
      final leave = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(context.tr('Continue without saving?', '不保存并继续？')),
          content: Text(
            uncertain
                ? context.tr(
                    'The earlier save may have completed. You can check your profile later; this does not cancel that save.',
                    '此前的保存可能已完成。你可以稍后在个人资料中核对，继续不会取消那次保存。',
                  )
                : context.tr(
                    'Your unsaved nickname will be discarded. Saved photos and profile details stay as they are.',
                    '未保存的昵称将被放弃，已保存的头像和资料会保留。',
                  ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text(context.tr('Keep editing', '继续编辑')),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: Text(context.tr('Continue', '继续')),
            ),
          ],
        ),
      );
      _confirming = false;
      if (leave != true || !_current(session, epoch)) return;
    }
    if (!mounted) return;
    FocusScope.of(context).unfocus();
    setState(() => _submitting = true);
    try {
      await widget.onContinue();
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(_provider), profile = state.profile;
    final access = ref.watch(contentAccessProvider);
    ref.listen(contentAccessProvider, (before, after) {
      if (before?.foreground != after.foreground) _epoch++;
    });
    if (!_initialized &&
        profile != null &&
        state.phase == PreferencesPhase.ready) {
      _name.text = profile.displayName ?? '';
      _initialized = true;
    }
    final busy = _submitting || state.phase == PreferencesPhase.saving;
    final active =
        access.foreground && ref.watch(currentAuthSubjectProvider) != null;
    final ready =
        active &&
        !busy &&
        state.phase == PreferencesPhase.ready &&
        profile != null;
    return PopScope(
      canPop: !busy,
      child: Scaffold(
        appBar: AppBar(title: Text(context.tr('Make it yours', '完善个人资料'))),
        body: SafeArea(
          child: Align(
            alignment: Alignment.topCenter,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 560),
              child: ListView(
                key: const Key('registration-profile-step'),
                padding: const EdgeInsets.all(24),
                keyboardDismissBehavior:
                    ScrollViewKeyboardDismissBehavior.onDrag,
                children: [
                  Text(
                    context.tr(
                      'Step 1 of ${widget.totalSteps} · Your profile',
                      '第 1/${widget.totalSteps} 步 · 个人资料',
                    ),
                    style: Theme.of(context).textTheme.labelLarge,
                  ),
                  const SizedBox(height: 8),
                  LinearProgressIndicator(
                    value: 1 / widget.totalSteps,
                    semanticsLabel: context.tr(
                      'Profile setup progress',
                      '资料完善进度',
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    context.tr(
                      'What would you like to be called?',
                      '希望大家怎么称呼你？',
                    ),
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    context.tr(
                      'Nickname and photo are optional. You can change them later in your profile.',
                      '昵称和头像都可跳过，之后可在个人资料中修改。',
                    ),
                  ),
                  const SizedBox(height: 24),
                  if (profile != null) ...[
                    Center(
                      child: AbsorbPointer(
                        absorbing: !active || busy,
                        child: OwnAvatarButton(
                          initial: profile.username
                              .substring(0, 1)
                              .toUpperCase(),
                          size: 88,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      context.tr('Tap to add a photo (optional)', '点击添加头像（选填）'),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      '@${profile.username}',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      context.tr(
                        'Your Username uniquely identifies you and cannot be changed. Your nickname is the name shown on your profile.',
                        '用户名用于唯一识别账号，不能修改；昵称是资料中显示的名称。',
                      ),
                    ),
                  ],
                  const SizedBox(height: 20),
                  Form(
                    key: _form,
                    child: TextFormField(
                      key: const Key('registration-nickname'),
                      controller: _name,
                      enabled: ready,
                      textInputAction: TextInputAction.done,
                      decoration: InputDecoration(
                        labelText: context.tr('Nickname (optional)', '昵称（选填）'),
                        helperText: context.tr(
                          'Up to 50 characters. Leave blank to use your Username.',
                          '最多 50 个字符，留空时显示用户名。',
                        ),
                        helperMaxLines: 3,
                      ),
                      validator: (value) =>
                          (value ?? '').trim().runes.length > 50
                          ? context.tr(
                              'Use 50 characters or fewer.',
                              '请输入不超过 50 个字符的昵称。',
                            )
                          : null,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    context.tr(
                      'Your privacy choices stay unchanged. A new photo is shared with signed-in users only after you explicitly save it in the photo editor.',
                      '这里不会改变你的隐私设置。新头像仅在照片编辑页由你明确保存后，才会对已登录用户可见。',
                    ),
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  if (state.phase == PreferencesPhase.loading || busy) ...[
                    const SizedBox(height: 16),
                    const LinearProgressIndicator(),
                    Text(
                      busy
                          ? context.tr('Saving and checking…', '正在保存并核对…')
                          : context.tr('Reading your profile…', '正在读取资料…'),
                    ),
                  ],
                  if (state.message case final message?) ...[
                    const SizedBox(height: 16),
                    Semantics(
                      liveRegion: true,
                      child: Text(
                        accountFeedback(context, message),
                        key: const Key('registration-profile-error'),
                      ),
                    ),
                  ],
                  if (state.phase == PreferencesPhase.failed ||
                      state.phase == PreferencesPhase.reloadRequired) ...[
                    const SizedBox(height: 8),
                    OutlinedButton(
                      key: const Key('registration-profile-reload'),
                      onPressed: active && !busy
                          ? () => ref.read(_provider.notifier).load()
                          : null,
                      child: Text(context.tr('Read saved profile', '读取已保存资料')),
                    ),
                  ],
                  const SizedBox(height: 24),
                  FilledButton(
                    key: const Key('registration-profile-continue'),
                    onPressed: ready ? _continue : null,
                    child: Text(context.tr('Continue', '继续')),
                  ),
                  const SizedBox(height: 8),
                  TextButton(
                    key: const Key('registration-profile-skip'),
                    onPressed: active && !busy ? _skip : null,
                    child: Text(context.tr('Skip for now', '暂时跳过')),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    widget.totalSteps == 3
                        ? context.tr(
                            'Next: recommendation preferences, then interests. Both are optional.',
                            '接下来设置推荐偏好和兴趣，两步都可以跳过。',
                          )
                        : context.tr(
                            'Next: choose interests, or skip and start exploring.',
                            '接下来选择兴趣，也可以跳过并开始使用。',
                          ),
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
