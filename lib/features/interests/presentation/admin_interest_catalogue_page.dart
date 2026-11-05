import 'dart:async';

import '../../../core/presentation/enmori_localizations.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../../auth/domain/auth_repository.dart';
import '../admin_interest_providers.dart';
import '../domain/interest_repository.dart';
import '../domain/admin_interest_repository.dart';
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
  final _search = TextEditingController();
  final _scroll = ScrollController();
  InterestLifecycleState? _filter;
  int _sort = 0;
  final _nameFocus = FocusNode();
  DialogRoute<bool>? _exitDialog;
  DialogRoute<bool>? _actionDialog;
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
      _search.clear();
      setState(() {});
      widget.onCreated?.call(
        InterestTagOption(
          interestTagId: confirmed.interestTagId,
          displayName: confirmed.displayName,
        ),
      );
    });
    ref.listenManual(adminInterestCapabilityProvider, (_, next) {
      if (next.asData?.value == false) {
        _actionDialog?.navigator?.removeRoute(_actionDialog!);
      }
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
    final action = _actionDialog;
    if (action != null) {
      WidgetsBinding.instance.addPostFrameCallback(
        (_) => action.navigator?.removeRoute(action),
      );
    }
    _name.dispose();
    _search.dispose();
    _scroll.dispose();
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
    final query = _search.text.trim().toLowerCase();
    final createEditable = editable && state.editTarget == null;
    final visibleEditTarget =
        allowed && state.phase != AdminInterestPhase.denied
        ? state.editTarget
        : null;
    final visible = state.tags
        .where(
          (tag) =>
              (_filter == null ||
                  !state.managementEnabled ||
                  state.managedTags.any(
                    (item) =>
                        item.interestTagId == tag.interestTagId &&
                        item.lifecycleState == _filter,
                  )) &&
              (tag.displayName.toLowerCase().contains(query) ||
                  tag.interestTagId.toLowerCase().contains(query)),
        )
        .toList();
    if (_sort != 0) {
      visible.sort((a, b) {
        final byName = a.displayName.toLowerCase().compareTo(
          b.displayName.toLowerCase(),
        );
        final order = byName == 0
            ? a.interestTagId.compareTo(b.interestTagId)
            : byName;
        return _sort == 1 ? order : -order;
      });
    }
    return PopScope(
      canPop: _allowPop,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) unawaited(_back());
      },
      child: Scaffold(
        key: const Key('admin-interest-page'),
        appBar: AppBar(
          leading: BackButton(onPressed: _back),
          title: Text(context.tr('Interest administration', '兴趣管理')),
        ),
        body: SafeArea(
          child: Align(
            alignment: Alignment.topCenter,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 640),
              child: ListView(
                controller: _scroll,
                padding: const EdgeInsets.all(24),
                children: [
                  if (visibleEditTarget case final target?) ...[
                    Text(
                      context.tr('Rename interest', '重命名兴趣'),
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'ID: ${target.interestTagId} · ${context.tr('Revision', '版本')} ${target.revision}',
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      key: ValueKey(
                        'admin-interest-rename-name-${target.interestTagId}',
                      ),
                      initialValue: state.renameDraft,
                      enabled: editable,
                      textInputAction: TextInputAction.done,
                      decoration: InputDecoration(
                        labelText: context.tr('New name', '新名称'),
                        errorText: _adminMessage(
                          context,
                          state.validationMessage,
                        ),
                        errorMaxLines: 4,
                      ),
                      onChanged: (value) => ref
                          .read(adminInterestControllerProvider.notifier)
                          .editRename(value, session: widget.session),
                      onFieldSubmitted: editable
                          ? (_) => ref
                                .read(adminInterestControllerProvider.notifier)
                                .rename(
                                  session: widget.session,
                                  expected: ref.read(
                                    adminInterestControllerProvider,
                                  ),
                                )
                          : null,
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 12,
                      runSpacing: 8,
                      children: [
                        FilledButton(
                          key: const Key('admin-interest-rename-save'),
                          onPressed:
                              editable &&
                                  state.managedTags.any(
                                    (tag) => tag.sameVersion(target),
                                  )
                              ? () => ref
                                    .read(
                                      adminInterestControllerProvider.notifier,
                                    )
                                    .rename(
                                      session: widget.session,
                                      expected: state,
                                    )
                              : null,
                          child: Text(context.tr('Save name', '保存名称')),
                        ),
                        TextButton(
                          key: const Key('admin-interest-rename-cancel'),
                          onPressed: editable
                              ? () => ref
                                    .read(
                                      adminInterestControllerProvider.notifier,
                                    )
                                    .cancelRename(session: widget.session)
                              : null,
                          child: Text(context.tr('Cancel editing', '取消编辑')),
                        ),
                      ],
                    ),
                    const SizedBox(height: 28),
                  ],
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.admin_panel_settings_outlined, size: 32),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          state.hasLoaded
                              ? state.managementEnabled
                                    ? context.tr(
                                        '${state.managedTags.where((tag) => tag.lifecycleState == InterestLifecycleState.active).length} active · ${state.managedTags.where((tag) => tag.lifecycleState == InterestLifecycleState.inactive).length} inactive',
                                        '${state.managedTags.where((tag) => tag.lifecycleState == InterestLifecycleState.active).length} 项启用 · ${state.managedTags.where((tag) => tag.lifecycleState == InterestLifecycleState.inactive).length} 项停用',
                                      )
                                    : context.tr(
                                        '${state.tags.length} available interests',
                                        '${state.tags.length} 项可选兴趣',
                                      )
                              : context.tr('Catalogue management', '目录管理'),
                          key: const Key('admin-catalogue-count'),
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
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
                    enabled: createEditable,
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
                    onSubmitted: createEditable && state.hasLoaded
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
                        onPressed: createEditable && state.hasLoaded
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
                      AdminInterestPhase.updating => context.tr(
                        'Saving the change…',
                        '正在保存变更…',
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
                    state.managementEnabled
                        ? context.tr('Interest catalogue', '兴趣目录')
                        : context.tr('Available interests', '可选兴趣'),
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
                    Text(context.tr('No interests are available.', '暂无兴趣条目。'))
                  else ...[
                    Text(
                      state.managementEnabled
                          ? context.tr(
                              'Inactive interests keep existing references and cannot be newly selected.',
                              '停用兴趣保留已有引用，不能被新选用。',
                            )
                          : context.tr(
                              'Only currently available interests are listed.',
                              '仅列出当前可选的兴趣。',
                            ),
                    ),
                    if (state.managementEnabled) ...[
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          for (final filter in <InterestLifecycleState?>[
                            null,
                            InterestLifecycleState.active,
                            InterestLifecycleState.inactive,
                          ])
                            ChoiceChip(
                              key: ValueKey(
                                'admin-filter-${filter?.name ?? 'all'}',
                              ),
                              selected: _filter == filter,
                              label: Text(switch (filter) {
                                null => context.tr('All', '全部'),
                                InterestLifecycleState.active => context.tr(
                                  'Active',
                                  '启用',
                                ),
                                InterestLifecycleState.inactive => context.tr(
                                  'Inactive',
                                  '停用',
                                ),
                              }),
                              onSelected: (_) =>
                                  setState(() => _filter = filter),
                            ),
                        ],
                      ),
                    ],
                    const SizedBox(height: 12),
                    TextField(
                      key: const Key('admin-catalogue-search'),
                      controller: _search,
                      onChanged: (_) => setState(() {}),
                      decoration: InputDecoration(
                        labelText: context.tr('Find an interest', '查找兴趣'),
                        hintText: context.tr('Name or ID', '名称或 ID'),
                        prefixIcon: const Icon(Icons.search),
                        suffixIcon: query.isEmpty
                            ? null
                            : IconButton(
                                tooltip: context.tr('Clear search', '清空搜索'),
                                onPressed: () => setState(_search.clear),
                                icon: const Icon(Icons.close),
                              ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<int>(
                      key: const Key('admin-catalogue-sort'),
                      initialValue: _sort,
                      isExpanded: true,
                      decoration: InputDecoration(
                        labelText: context.tr('Order', '排序'),
                      ),
                      items: [
                        DropdownMenuItem(
                          value: 0,
                          child: Text(context.tr('Catalogue order', '目录顺序')),
                        ),
                        DropdownMenuItem(
                          value: 1,
                          child: Text(context.tr('Name A–Z', '名称升序')),
                        ),
                        DropdownMenuItem(
                          value: 2,
                          child: Text(context.tr('Name Z–A', '名称降序')),
                        ),
                      ],
                      onChanged: (value) {
                        if (value != null) setState(() => _sort = value);
                      },
                    ),
                    const SizedBox(height: 12),
                    Text(
                      context.tr(
                        '${visible.length} of ${state.tags.length} interests',
                        '显示 ${visible.length} / ${state.tags.length} 项兴趣',
                      ),
                      key: const Key('admin-search-count'),
                    ),
                    if (visible.isEmpty)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        child: Text(
                          context.tr(
                            'No matching interests. Try another name or clear the search.',
                            '没有匹配的兴趣，请更换名称或清空搜索。',
                          ),
                          key: const Key('admin-search-empty'),
                        ),
                      ),
                    for (final tag in visible)
                      ExpansionTile(
                        key: Key('admin-interest-tag-${tag.interestTagId}'),
                        tilePadding: EdgeInsets.zero,
                        leading: const Icon(Icons.label_outline),
                        title: Text(tag.displayName),
                        subtitle: Text(
                          state.managementEnabled
                              ? context.tr(
                                  state.managedTags
                                              .firstWhere(
                                                (item) =>
                                                    item.interestTagId ==
                                                    tag.interestTagId,
                                              )
                                              .lifecycleState ==
                                          InterestLifecycleState.active
                                      ? 'Active · tap for details'
                                      : 'Inactive · tap for details',
                                  state.managedTags
                                              .firstWhere(
                                                (item) =>
                                                    item.interestTagId ==
                                                    tag.interestTagId,
                                              )
                                              .lifecycleState ==
                                          InterestLifecycleState.active
                                      ? '启用 · 点击查看详情'
                                      : '停用 · 点击查看详情',
                                )
                              : context.tr(
                                  'Available · tap for details',
                                  '可选 · 点击查看详情',
                                ),
                        ),
                        childrenPadding: const EdgeInsets.only(bottom: 16),
                        expandedCrossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          SelectableText('ID: ${tag.interestTagId}'),
                          if (!state.managementEnabled)
                            Text(
                              context.tr(
                                'Members can select this interest from the catalogue.',
                                '用户可以在兴趣目录中选择此项。',
                              ),
                            ),
                          if (state.managementEnabled)
                            ..._managementActions(
                              state.managedTags.firstWhere(
                                (item) =>
                                    item.interestTagId == tag.interestTagId,
                              ),
                              state,
                              editable,
                            ),
                        ],
                      ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  List<Widget> _managementActions(
    ManagedInterestTag tag,
    AdminInterestState state,
    bool editable,
  ) => [
    Text('${context.tr('Revision', '版本')}: ${tag.revision}'),
    const SizedBox(height: 12),
    Wrap(
      spacing: 12,
      runSpacing: 8,
      children: [
        OutlinedButton.icon(
          key: ValueKey('admin-rename-${tag.interestTagId}'),
          onPressed: editable && state.editTarget == null
              ? () {
                  ref
                      .read(adminInterestControllerProvider.notifier)
                      .beginRename(
                        tag,
                        session: widget.session,
                        expected: state,
                      );
                  WidgetsBinding.instance.addPostFrameCallback((_) {
                    if (mounted && _scroll.hasClients) {
                      unawaited(
                        _scroll.animateTo(
                          0,
                          duration: const Duration(milliseconds: 200),
                          curve: Curves.easeOut,
                        ),
                      );
                    }
                  });
                }
              : null,
          icon: const Icon(Icons.edit_outlined),
          label: Text(context.tr('Rename', '重命名')),
        ),
        OutlinedButton.icon(
          key: ValueKey('admin-lifecycle-${tag.interestTagId}'),
          onPressed: editable && state.editTarget == null
              ? () => _confirmChange(tag, state)
              : null,
          icon: Icon(
            tag.lifecycleState == InterestLifecycleState.active
                ? Icons.pause_circle_outline
                : Icons.restore,
          ),
          label: Text(
            tag.lifecycleState == InterestLifecycleState.active
                ? context.tr('Deactivate', '停用')
                : context.tr('Restore', '恢复'),
          ),
        ),
        if (state.permanentDeletionAvailable &&
            tag.lifecycleState == InterestLifecycleState.inactive)
          OutlinedButton.icon(
            key: ValueKey('admin-delete-${tag.interestTagId}'),
            onPressed: editable && state.editTarget == null
                ? () => _confirmChange(tag, state, deleting: true)
                : null,
            icon: const Icon(Icons.delete_forever_outlined),
            label: Text(context.tr('Delete permanently', '永久删除')),
          ),
      ],
    ),
  ];

  Future<void> _confirmChange(
    ManagedInterestTag tag,
    AdminInterestState expected, {
    bool deleting = false,
  }) async {
    if (!_currentSession || _actionDialog != null) return;
    final deactivate = tag.lifecycleState == InterestLifecycleState.active;
    final action = deleting
        ? context.tr('Delete permanently', '永久删除')
        : deactivate
        ? context.tr('Deactivate', '停用')
        : context.tr('Restore', '恢复');
    final dialog = DialogRoute<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text('$action ${tag.displayName}?'),
        content: Text(
          deleting
              ? context.tr(
                  'This cannot be undone. Existing references will prevent deletion.',
                  '此操作无法撤销。存在引用时将拒绝删除。',
                )
              : deactivate
              ? context.tr(
                  'Existing selections and records will keep this interest. Members cannot select it again while inactive.',
                  '已有选择和记录将保留此兴趣。停用后不能新选用。',
                )
              : context.tr(
                  'Members will be able to select this interest again.',
                  '恢复后可以再次选用此兴趣。',
                ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: Text(context.tr('Cancel', '取消')),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: Text(action),
          ),
        ],
      ),
    );
    _actionDialog = dialog;
    final confirmed = await Navigator.of(context).push(dialog);
    _actionDialog = null;
    if (!_currentSession || confirmed != true) return;
    final controller = ref.read(adminInterestControllerProvider.notifier);
    if (deleting) {
      await controller.delete(tag, session: widget.session, expected: expected);
    } else {
      await controller.changeLifecycle(
        tag,
        deactivate
            ? InterestLifecycleState.inactive
            : InterestLifecycleState.active,
        session: widget.session,
        expected: expected,
      );
    }
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
    final createMayBePending =
        snapshot.phase == AdminInterestPhase.creating ||
        snapshot.phase == AdminInterestPhase.updating ||
        snapshot.needsReadback;
    if (snapshot.dirty || createMayBePending) {
      final dialog = DialogRoute<bool>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: Text(context.tr('Leave interest catalogue?', '离开兴趣目录？')),
          content: Text(
            createMayBePending
                ? context.tr(
                    'The save result may still need checking. Leaving will discard this draft and will not undo a request already sent.',
                    '保存结果可能仍需核对。离开将丢弃草稿，不会撤销已经发送的请求。',
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
  AppFailureKind.catalogueRevisionPreconditionFailed => context.tr(
    'This interest changed in another session. Review the latest version before saving again.',
    '此兴趣已在其他会话中变更，请核对最新版本后再保存。',
  ),
  AppFailureKind.catalogueNotFound => context.tr(
    'This interest is no longer in the catalogue.',
    '此兴趣已不在目录中。',
  ),
  AppFailureKind.catalogueReferenced => context.tr(
    'This interest is still referenced and cannot be deleted.',
    '此兴趣仍被引用，无法删除。',
  ),
  AppFailureKind.catalogueStateConflict => context.tr(
    'The current lifecycle state does not allow this change. Reload the catalogue.',
    '当前状态不允许此变更，请重新读取目录。',
  ),
  AppFailureKind.authRequired => context.tr(
    'Your session has expired. Sign in again.',
    '会话已失效，请重新登录。',
  ),
  AppFailureKind.authForbidden => context.tr(
    'Admin access was denied. Changes are disabled.',
    '管理权限被拒绝，暂时无法修改。',
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
        'The change result is unknown. Reload the catalogue before trying again.':
            '变更结果尚未确认。再次尝试前请重新读取目录。',
        'This interest changed. Review the current catalogue before saving again.':
            '此兴趣已变更，请核对当前目录后再保存。',
        'The change is confirmed in the current catalogue.': '变更已在当前目录中确认。',
        'The saved change is not confirmed. Review the current catalogue before making another change.':
            '尚未确认保存的变更，请核对当前目录后再操作。',
      }[value] ??
      value;
}
