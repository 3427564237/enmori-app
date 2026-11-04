import 'package:enmori/core/presentation/enmori_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../../auth/domain/auth_repository.dart';
import '../domain/interest_repository.dart';
import 'interest_editor_controller.dart';

final class InterestEditorPage extends ConsumerStatefulWidget {
  const InterestEditorPage({this.onSaved, this.onSkip, super.key});

  final ValueChanged<InterestSelection>? onSaved;
  final VoidCallback? onSkip;

  @override
  ConsumerState<InterestEditorPage> createState() => _InterestEditorPageState();
}

final class _InterestEditorPageState extends ConsumerState<InterestEditorPage> {
  late final InterestEditorController _controller;
  bool _allowLeave = false;
  bool _confirming = false;
  DialogRoute<bool>? _exitDialog;

  @override
  void initState() {
    super.initState();
    _controller = ref.read(interestEditorControllerProvider.notifier);
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    Future<void>.microtask(() => _controller.abandon(resetState: false));
    final dialog = _exitDialog;
    if (dialog != null) {
      WidgetsBinding.instance.addPostFrameCallback(
        (_) => dialog.navigator?.removeRoute(dialog),
      );
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(authSessionProvider, (previous, next) {
      if (!identical(previous?.asData?.value, next.asData?.value)) {
        final dialog = _exitDialog;
        _exitDialog = null;
        _allowLeave = false;
        final observed = next.asData?.value;
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (dialog != null) dialog.navigator?.removeRoute(dialog);
          if (mounted &&
              observed is AuthSessionAuthenticated &&
              identical(
                observed,
                ref.read(authSessionProvider).asData?.value,
              )) {
            _load();
          }
        });
      }
    });
    final state = ref.watch(interestEditorControllerProvider);
    final needsConfirmation =
        state.hasUnsavedChanges || state.phase == InterestEditorPhase.saving;
    return PopScope<void>(
      canPop: _allowLeave || !needsConfirmation,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _leave();
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(context.tr('Your interests', "我的兴趣")),
          actions: [
            if (widget.onSkip != null)
              TextButton(
                onPressed: state.phase == InterestEditorPhase.saving
                    ? null
                    : () => _leave(widget.onSkip),
                child: Text(context.tr('Skip for now', "暂时跳过")),
              ),
          ],
        ),
        body: SafeArea(
          child: Align(
            alignment: Alignment.topCenter,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 640),
              child: _body(state),
            ),
          ),
        ),
      ),
    );
  }

  Widget _body(InterestEditorState state) {
    if (state.phase == InterestEditorPhase.loading ||
        state.phase == InterestEditorPhase.initial) {
      return const Center(
        key: Key('interest-loading'),
        child: CircularProgressIndicator(),
      );
    }
    if (!state.hasLoaded) {
      return _FailurePanel(
        key: const Key('interest-load-failure'),
        message: _failureCopy(state.failure?.kind),
        actionLabel: context.tr('Retry', "重试"),
        onAction: _load,
      );
    }

    final saving = state.phase == InterestEditorPhase.saving;
    final conflict = state.phase == InterestEditorPhase.conflict;
    return ListView(
      key: const Key('route-interests'),
      padding: const EdgeInsets.all(16),
      children: [
        if (widget.onSkip != null) ...[
          Text(
            context.tr('A little space for your everyday', "留一处空间给日常"),
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Text(
            context.tr(
              'Check-in to save a moment. Explore Events, connect with Friends, or talk things through with AI.',
              "用签到留住片刻，探索活动、结识好友，或与 AI 聊聊心事。",
            ),
          ),
          const SizedBox(height: 8),
          Text(
            context.tr(
              'Start wherever you like. Optional permissions stay yours to choose.',
              "从喜欢的地方开始，可选权限始终由你决定。",
            ),
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const Divider(height: 32),
        ],
        Text(
          context.tr('Choose up to 10', "最多选择 10 项"),
          style: Theme.of(context).textTheme.headlineMedium,
        ),
        const SizedBox(height: 8),
        Text(
          context.tr(
            '${state.selectedCount} of 10 selected',
            '已选 ${state.selectedCount} 项，最多 10 项',
          ),
        ),
        Text(
          context.tr(
            '${state.options.where((option) => option.lifecycleState == InterestLifecycleState.active).length} available interests',
            '共有 ${state.options.where((option) => option.lifecycleState == InterestLifecycleState.active).length} 项可选兴趣',
          ),
        ),
        const SizedBox(height: 16),
        if (state.options.isEmpty)
          Text(context.tr('No interests are available right now.', "目前没有可选兴趣。"))
        else
          for (final option in state.options)
            CheckboxListTile(
              key: Key('interest-option-${option.interestTagId}'),
              value: option.isSelected,
              onChanged:
                  saving ||
                      conflict ||
                      (!option.isSelected && !option.canSelect)
                  ? null
                  : (_) => ref
                        .read(interestEditorControllerProvider.notifier)
                        .toggle(option.interestTagId),
              title: Text(option.displayName),
              subtitle: option.lifecycleState == InterestLifecycleState.inactive
                  ? Text(
                      context.tr(
                        'No longer available — you can remove it.',
                        "已停用，可以移除。",
                      ),
                    )
                  : null,
              controlAffinity: ListTileControlAffinity.leading,
            ),
        if (state.validationMessage case final message?) ...[
          const SizedBox(height: 12),
          Text(
            context.tr(message, '最多选择 10 项兴趣。'),
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
        ],
        if (conflict) ...[
          const SizedBox(height: 16),
          _FailurePanel(
            key: const Key('interest-conflict'),
            message: context.tr(
              'Your interests changed. Reload them before saving again.',
              "兴趣已发生变化，请重新加载后再保存。",
            ),
            actionLabel: context.tr('Reload interests', "重新加载兴趣"),
            onAction: _load,
          ),
        ] else if (state.phase == InterestEditorPhase.failed) ...[
          const SizedBox(height: 16),
          _FailurePanel(
            key: const Key('interest-save-failure'),
            message: _failureCopy(state.failure?.kind),
            actionLabel:
                state.failure?.kind == AppFailureKind.interestSelectionInvalid
                ? context.tr('Reload interests', "重新加载兴趣")
                : context.tr('Retry save', "重新保存"),
            onAction:
                state.failure?.kind == AppFailureKind.interestSelectionInvalid
                ? _load
                : _save,
          ),
        ] else if (state.phase == InterestEditorPhase.saved) ...[
          const SizedBox(height: 16),
          Semantics(
            liveRegion: true,
            child: Text(
              context.tr('Interests saved.', "兴趣已保存。"),
              key: Key('interest-save-success'),
            ),
          ),
        ],
        const SizedBox(height: 20),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            OutlinedButton(
              key: const Key('interest-clear'),
              onPressed: saving || conflict
                  ? null
                  : () => ref
                        .read(interestEditorControllerProvider.notifier)
                        .clear(),
              child: Text(context.tr('Clear selection', "清空选择")),
            ),
            FilledButton.icon(
              key: const Key('interest-save'),
              onPressed: saving || conflict ? null : _save,
              icon: saving
                  ? const SizedBox.square(
                      dimension: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.save_outlined),
              label: Text(
                saving
                    ? context.tr('Saving…', "正在保存…")
                    : context.tr('Save interests', "保存兴趣"),
              ),
            ),
            if (state.savedSelection case final selection?)
              TextButton(
                key: const Key('interest-done'),
                onPressed: () => widget.onSaved?.call(selection),
                child: Text(context.tr('Done', "完成")),
              ),
          ],
        ),
      ],
    );
  }

  Future<void> _leave([VoidCallback? action]) async {
    if (_confirming || !mounted) return;
    final session = ref.read(authSessionProvider).asData?.value;
    final state = ref.read(interestEditorControllerProvider);
    if (state.hasUnsavedChanges || state.phase == InterestEditorPhase.saving) {
      _confirming = true;
      final saving = state.phase == InterestEditorPhase.saving;
      final saveSent = saving || state.phase == InterestEditorPhase.failed;
      final dialog = DialogRoute<bool>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: Text(
            saving
                ? context.tr('Leave while saving?', '保存时离开？')
                : saveSent
                ? context.tr('Leave after a save attempt?', '保存尝试后离开？')
                : context.tr('Discard interest changes?', '放弃兴趣修改？'),
          ),
          content: Text(
            saveSent
                ? context.tr(
                    'A save has already been sent. Leaving will not cancel it. Check your saved interests when you return.',
                    '保存请求已经发出，离开不会取消请求。返回后请核对已保存的兴趣。',
                  )
                : context.tr(
                    'Your unsaved selection will be discarded.',
                    '尚未保存的选择将被放弃。',
                  ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: Text(context.tr('Keep editing', '继续编辑')),
            ),
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: Text(
                saveSent
                    ? context.tr('Leave', '离开')
                    : context.tr('Discard', '放弃'),
              ),
            ),
          ],
        ),
      );
      _exitDialog = dialog;
      final leave = await Navigator.of(context).push(dialog);
      _exitDialog = null;
      _confirming = false;
      if (!mounted || leave != true) return;
    }
    if (!mounted ||
        !identical(session, ref.read(authSessionProvider).asData?.value)) {
      return;
    }
    setState(() => _allowLeave = true);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted ||
          !identical(session, ref.read(authSessionProvider).asData?.value)) {
        return;
      }
      if (action != null) {
        action();
      } else {
        Navigator.of(context).maybePop();
      }
    });
  }

  void _load() {
    if (!mounted) return;
    ref.read(interestEditorControllerProvider.notifier).load();
  }

  void _save() {
    ref.read(interestEditorControllerProvider.notifier).save();
  }

  String _failureCopy(AppFailureKind? kind) => switch (kind) {
    AppFailureKind.authRequired => context.tr(
      'Your session has expired. Sign in again.',
      "登录已过期，请重新登录。",
    ),
    AppFailureKind.authForbidden => context.tr(
      'This account cannot continue.',
      "此账号暂时无法继续。",
    ),
    AppFailureKind.onboardingRequired => context.tr(
      'Finish setting up your ENMORI account.',
      "请先完成 ENMORI 账号设置。",
    ),
    AppFailureKind.interestSelectionInvalid => context.tr(
      'One or more selected interests are no longer available. Reload and try again.',
      "部分已选兴趣已停用，请重新加载后重试。",
    ),
    _ => context.tr(
      'This service is temporarily unavailable. Try again.',
      "服务暂时不可用，请重试。",
    ),
  };
}

final class _FailurePanel extends StatelessWidget {
  const _FailurePanel({
    required this.message,
    required this.actionLabel,
    required this.onAction,
    super.key,
  });

  final String message;
  final String actionLabel;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(message),
            const SizedBox(height: 12),
            FilledButton(onPressed: onAction, child: Text(actionLabel)),
          ],
        ),
      ),
    );
  }
}
