import 'dart:async';

import '../../../core/presentation/enmori_localizations.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../../auth/domain/auth_repository.dart';
import '../admin_interest_providers.dart';
import '../domain/interest_repository.dart';
import 'admin_interest_controller.dart';

final class AdminInterestCataloguePage extends ConsumerWidget {
  const AdminInterestCataloguePage({
    required this.onBack,
    this.onCreated,
    super.key,
  });

  final VoidCallback onBack;
  final ValueChanged<InterestTagOption>? onCreated;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = switch (ref.watch(authSessionProvider).asData?.value) {
      final AuthSessionAuthenticated value => value,
      _ => null,
    };
    return _CatalogueEditor(
      key: ValueKey(session),
      session: session,
      onBack: onBack,
      onCreated: onCreated,
    );
  }
}

final class _CatalogueEditor extends ConsumerStatefulWidget {
  const _CatalogueEditor({
    required this.session,
    required this.onBack,
    required this.onCreated,
    super.key,
  });
  final AuthSessionAuthenticated? session;
  final VoidCallback onBack;
  final ValueChanged<InterestTagOption>? onCreated;

  @override
  ConsumerState<_CatalogueEditor> createState() => _CatalogueEditorState();
}

final class _CatalogueEditorState extends ConsumerState<_CatalogueEditor> {
  final _name = TextEditingController();
  final _nameFocus = FocusNode();
  DialogRoute<bool>? _exitDialog;
  bool _leaving = false;
  bool _allowPop = false;

  bool get _currentSession =>
      mounted &&
      widget.session != null &&
      identical(ref.read(authSessionProvider).asData?.value, widget.session);

  @override
  void initState() {
    super.initState();
    ref.listenManual(adminInterestControllerProvider, (previous, next) {
      if (!_currentSession) return;
      if (previous?.confirmed == next.confirmed || next.confirmed == null) {
        return;
      }
      final confirmed = next.confirmed!;
      // The verified readback is the only path that clears an entered draft.
      _name.clear();
      widget.onCreated?.call(
        InterestTagOption(
          interestTagId: confirmed.interestTagId,
          displayName: confirmed.displayName,
        ),
      );
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        unawaited(
          ref
              .read(adminInterestControllerProvider.notifier)
              .load(session: widget.session),
        );
      }
    });
  }

  @override
  void dispose() {
    final dialog = _exitDialog;
    if (dialog != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        dialog.navigator?.removeRoute(dialog);
      });
    }
    _name.dispose();
    _nameFocus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(adminInterestControllerProvider);
    final capability = ref.watch(adminInterestCapabilityProvider);
    final allowed = capability.asData?.value == true;
    final editable =
        _currentSession &&
        allowed &&
        !state.busy &&
        !state.needsReadback &&
        state.phase != AdminInterestPhase.denied;
    return PopScope(
      canPop: _allowPop,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) unawaited(_back());
      },
      child: Scaffold(
        key: const Key('admin-interest-page'),
        appBar: AppBar(
          leading: BackButton(onPressed: _back),
          title: Text(context.tr('Interest catalogue', '兴趣目录')),
        ),
        body: SafeArea(
          child: Align(
            alignment: Alignment.topCenter,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 640),
              child: ListView(
                padding: const EdgeInsets.all(24),
                children: [
                  Text(
                    context.tr('Add an interest', '添加兴趣'),
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    context.tr(
                      'Create one catalogue item at a time. Existing interests keep their IDs.',
                      '每次创建一个目录条目。已有兴趣的标识保持不变。',
                    ),
                  ),
                  const SizedBox(height: 24),
                  TextField(
                    key: const Key('admin-interest-name'),
                    controller: _name,
                    focusNode: _nameFocus,
                    enabled: editable,
                    textInputAction: TextInputAction.done,
                    decoration: InputDecoration(
                      labelText: context.tr('Interest name', '兴趣名称'),
                      helperText: context.tr(
                        'Required. Use 1–50 characters.',
                        '必填，1–50 个字符。',
                      ),
                      helperMaxLines: 3,
                      errorText: _adminMessage(
                        context,
                        state.validationMessage,
                      ),
                      errorMaxLines: 4,
                      border: const OutlineInputBorder(),
                    ),
                    onChanged: (value) => ref
                        .read(adminInterestControllerProvider.notifier)
                        .editDraft(value, session: widget.session),
                    onSubmitted: editable && state.hasLoaded
                        ? (_) =>
                              _create(ref.read(adminInterestControllerProvider))
                        : null,
                  ),
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: [
                      FilledButton.icon(
                        key: const Key('admin-interest-create'),
                        onPressed: editable && state.hasLoaded
                            ? () => _create(state)
                            : null,
                        icon: const Icon(Icons.add),
                        label: Text(
                          state.phase == AdminInterestPhase.creating
                              ? context.tr('Creating…', '正在创建…')
                              : context.tr('Create interest', '创建兴趣'),
                        ),
                      ),
                      OutlinedButton.icon(
                        key: const Key('admin-interest-reload'),
                        onPressed: state.busy || !_currentSession
                            ? null
                            : () => ref
                                  .read(
                                    adminInterestControllerProvider.notifier,
                                  )
                                  .load(session: widget.session),
                        icon: const Icon(Icons.refresh),
                        label: Text(context.tr('Reload catalogue', '重新读取目录')),
                      ),
                    ],
                  ),
                  if (state.busy) ...[
                    const SizedBox(height: 16),
                    const LinearProgressIndicator(),
                    const SizedBox(height: 8),
                    Text(switch (state.phase) {
                      AdminInterestPhase.creating => context.tr(
                        'Saving the new interest…',
                        '正在保存新兴趣…',
                      ),
                      AdminInterestPhase.checking => context.tr(
                        'Checking the saved catalogue…',
                        '正在核对已保存的目录…',
                      ),
                      _ => context.tr(
                        'Checking access and loading the catalogue…',
                        '正在核对权限并读取目录…',
                      ),
                    }),
                  ],
                  if (state.phase == AdminInterestPhase.denied ||
                      widget.session == null) ...[
                    const SizedBox(height: 16),
                    Text(
                      context.tr(
                        'Admin access is not available for this session.',
                        '当前会话没有可用的管理权限。',
                      ),
                      key: Key('admin-interest-denied'),
                    ),
                  ],
                  if (state.failure case final failure?) ...[
                    const SizedBox(height: 16),
                    Semantics(
                      liveRegion: true,
                      child: Text(
                        _failureCopy(context, failure.kind),
                        key: const Key('admin-interest-failure'),
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.error,
                        ),
                      ),
                    ),
                  ],
                  if (state.notice case final notice?) ...[
                    const SizedBox(height: 16),
                    Semantics(
                      liveRegion: true,
                      child: Text(
                        _adminMessage(context, notice)!,
                        key: const Key('admin-interest-notice'),
                      ),
                    ),
                  ],
                  if (state.confirmed case final tag?) ...[
                    const SizedBox(height: 16),
                    Text(
                      '${tag.displayName}\nID: ${tag.interestTagId}',
                      key: const Key('admin-interest-confirmed'),
                    ),
                  ],
                  const SizedBox(height: 32),
                  Text(
                    context.tr('Available interests', '可选兴趣'),
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  if (!state.hasLoaded)
                    Text(
                      context.tr(
                        'The catalogue has not been loaded yet.',
                        '尚未读取兴趣目录。',
                      ),
                    )
                  else if (state.tags.isEmpty)
                    Text(
                      context.tr(
                        'No active interests are available.',
                        '暂无可用兴趣。',
                      ),
                    )
                  else
                    for (final tag in state.tags)
                      ListTile(
                        key: Key('admin-interest-tag-${tag.interestTagId}'),
                        contentPadding: EdgeInsets.zero,
                        title: Text(tag.displayName),
                        subtitle: Text('ID: ${tag.interestTagId}'),
                      ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _create(AdminInterestState expected) async {
    if (!_currentSession) return;
    await ref
        .read(adminInterestControllerProvider.notifier)
        .create(session: widget.session, expected: expected);
    if (!_currentSession) return;
    if (ref.read(adminInterestControllerProvider).validationMessage != null) {
      _nameFocus.requestFocus();
    }
  }

  Future<void> _back() async {
    if (_leaving || !mounted) return;
    if (widget.session != null && !_currentSession) return;
    final sessionAtRequest = ref.read(authSessionProvider).asData?.value;
    if (widget.session == null &&
        sessionAtRequest is AuthSessionAuthenticated) {
      return;
    }
    _leaving = true;
    final snapshot = ref.read(adminInterestControllerProvider);
    if (snapshot.dirty || snapshot.busy || snapshot.needsReadback) {
      final dialog = DialogRoute<bool>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: Text(context.tr('Leave interest catalogue?', '离开兴趣目录？')),
          content: Text(
            snapshot.busy || snapshot.needsReadback
                ? context.tr(
                    'The create result may still need checking. Leaving will discard this draft and will not undo a request already sent.',
                    '创建结果可能仍需核对。离开将丢弃草稿，不会撤销已经发送的请求。',
                  )
                : context.tr(
                    'Your unsaved interest name will be discarded.',
                    '未保存的兴趣名称将被丢弃。',
                  ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: Text(context.tr('Keep editing', '继续编辑')),
            ),
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: Text(context.tr('Leave', '离开')),
            ),
          ],
        ),
      );
      _exitDialog = dialog;
      final leave = await Navigator.of(context).push(dialog);
      _exitDialog = null;
      if (!mounted) return;
      if (leave != true || !_currentSession) {
        _leaving = false;
        return;
      }
    }
    if (!mounted) return;
    setState(() => _allowPop = true);
    // Let PopScope observe the accepted exit before app-owned navigation.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted &&
          identical(
            ref.read(authSessionProvider).asData?.value,
            sessionAtRequest,
          )) {
        widget.onBack();
      }
    });
  }
}

String _failureCopy(
  BuildContext context,
  AppFailureKind kind,
) => switch (kind) {
  AppFailureKind.catalogueNameConflict => context.tr(
    'That interest name already exists, including any inactive entry. Use a different name.',
    '此兴趣名称已存在，可能属于停用条目。请使用其他名称。',
  ),
  AppFailureKind.catalogueInvalid => context.tr(
    'The name is not valid. Use 1–50 characters without control or direction characters.',
    '名称无效。请使用 1–50 个字符，不包含控制或文字方向字符。',
  ),
  AppFailureKind.authRequired => context.tr(
    'Your session has expired. Sign in again.',
    '会话已失效，请重新登录。',
  ),
  AppFailureKind.authForbidden => context.tr(
    'Admin access was denied. Creating is disabled.',
    '管理权限被拒绝，暂时无法创建。',
  ),
  AppFailureKind.configurationUnavailable => context.tr(
    'The service is not configured.',
    '服务尚未配置。',
  ),
  AppFailureKind.unexpected => context.tr(
    'The service returned an invalid response. Reload the catalogue to check.',
    '服务响应无效，请重新读取目录核对。',
  ),
  _ => context.tr(
    'The service could not complete this request. Your draft has been kept.',
    '服务未能完成此请求，草稿已保留。',
  ),
};

String? _adminMessage(BuildContext context, String? value) {
  if (value == null || !context.usesChinese) return value;
  return const <String, String>{
        'Enter an interest name.': '请输入兴趣名称。',
        'Use a name without control or direction characters.':
            '名称不能包含控制或文字方向字符。',
        'Use a name of 1–50 characters without control or direction characters.':
            '请使用 1–50 个字符，不包含控制或文字方向字符。',
        'Admin access is not available for this session.': '当前会话没有可用的管理权限。',
        'Admin access could not be checked. Reload to try again.':
            '暂时无法核对管理权限，请重新读取。',
        'The create result is unknown. Reload the catalogue before trying again.':
            '创建结果尚未确认。再次尝试前请重新读取目录。',
        'Interest created and confirmed in the catalogue.': '兴趣已创建，并已在目录中确认。',
        'Creation was accepted, but this catalogue does not confirm the saved item yet. Reload to check again.':
            '创建请求已接受，但目录尚未确认保存的条目。请重新读取核对。',
        'Catalogue reloaded. Check the list before trying again; the earlier request may have saved.':
            '目录已重新读取。再次尝试前请核对列表，先前的请求可能已保存。',
      }[value] ??
      value;
}
