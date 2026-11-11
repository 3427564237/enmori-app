import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../../interests/admin_interest_providers.dart';
import '../../auth/auth_providers.dart';
import '../domain/admin_repository.dart';
import 'admin_controller.dart';

final class AdminHomePage extends ConsumerWidget {
  const AdminHomePage({required this.open, super.key});
  final void Function(String) open;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final allowed =
        ref.watch(adminInterestCapabilityProvider).asData?.value == true;
    return Scaffold(
      appBar: AppBar(title: Text(context.tr('Administration', '管理中心'))),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (!allowed)
              Text(
                context.tr(
                  'Admin access is not available for this session.',
                  '当前会话没有管理权限。',
                ),
              )
            else ...[
              Text(
                context.tr('Catalogue and service management', '目录与服务管理'),
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 16),
              for (final item in [
                (
                  'status',
                  Icons.monitor_heart_outlined,
                  context.tr('Runtime status', '运行状态'),
                  context.tr(
                    'Read existing service observations',
                    '查看服务已有的运行观察',
                  ),
                ),
                (
                  'interests',
                  Icons.interests_outlined,
                  context.tr('Interest tags', '兴趣标签'),
                  context.tr(
                    'Create, rename, deactivate and restore',
                    '创建、改名、停用和恢复',
                  ),
                ),
                (
                  'categories',
                  Icons.category_outlined,
                  context.tr('Event categories', '活动分类'),
                  context.tr(
                    'Maintain the ENMORI category catalogue',
                    '维护 ENMORI 活动分类目录',
                  ),
                ),
                (
                  'records',
                  Icons.history_outlined,
                  context.tr('Operation records', '操作记录'),
                  context.tr(
                    'Committed changes from the last 30 days',
                    '最近 30 天已提交的管理变更',
                  ),
                ),
              ])
                Card(
                  child: ListTile(
                    leading: Icon(item.$2),
                    title: Text(item.$3),
                    subtitle: Text(item.$4),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => open(item.$1),
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }
}

final class AdminPanelPage extends ConsumerStatefulWidget {
  const AdminPanelPage({
    required this.page,
    this.eventId,
    this.eventTitle,
    this.openEvents,
    super.key,
  });
  final String page;
  final String? eventId, eventTitle;
  final VoidCallback? openEvents;
  @override
  ConsumerState<AdminPanelPage> createState() => _AdminPanelPageState();
}

final class _AdminPanelPageState extends ConsumerState<AdminPanelPage>
    with WidgetsBindingObserver {
  final _name = TextEditingController();
  AdminCategory? _editing;
  bool _allowExit = false;
  String _query = '';
  bool? _activeFilter;
  String get _key => '${widget.page}:${widget.eventId ?? ''}';
  AdminController get _controller =>
      ref.read(adminControllerProvider(_key).notifier);
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) unawaited(_load());
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _name.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) unawaited(_resume());
  }

  Future<void> _resume() async {
    await ref.read(adminInterestCapabilityProvider.notifier).refresh();
    if (mounted) await _load();
  }

  Future<void> _load() =>
      _controller.load(widget.page, eventId: widget.eventId);
  Future<bool> _confirm(String title, String message) async =>
      await showDialog<bool>(
        context: context,
        builder: (c) => AlertDialog(
          title: Text(title),
          content: Text(message),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(c, false),
              child: Text(context.tr('Cancel', '取消')),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(c, true),
              child: Text(context.tr('Confirm', '确认')),
            ),
          ],
        ),
      ) ??
      false;
  Future<void> _exit(bool didPop) async {
    if (didPop) return;
    final leave = await _confirm(
      context.tr('Leave this page?', '离开此页面？'),
      context.tr(
        'Unsaved text will be discarded. A submitted change may still complete; check the current records before trying again.',
        '未保存文字会丢失。已提交的变更仍可能完成，再次操作前请先查看当前记录。',
      ),
    );
    if (!mounted || !leave) return;
    setState(() => _allowExit = true);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) Navigator.of(context).pop();
    });
  }

  bool _current(AdminState expected) =>
      mounted &&
      identical(ref.read(adminControllerProvider(_key)), expected) &&
      expected.allowed;

  Future<void> _save(AdminState expectedState) async {
    if (!_current(expectedState)) return;
    if (_name.text.trim().isEmpty) return;
    final saved = await _controller.save(expected: _editing, name: _name.text);
    if (mounted && saved) {
      setState(() {
        _name.clear();
        _editing = null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(authSessionProvider, (previous, next) {
      if (!identical(previous?.asData?.value, next.asData?.value)) {
        _name.clear();
        _editing = null;
        _query = '';
        _activeFilter = null;
      }
    });
    final state = ref.watch(adminControllerProvider(_key));
    final title = switch (widget.page) {
      'status' => context.tr('Runtime status', '运行状态'),
      'records' => context.tr('Operation records', '操作记录'),
      'classification' => context.tr('Classify event', '设置活动分类'),
      _ => context.tr('Event categories', '活动分类'),
    };
    return PopScope(
      canPop: _allowExit || (_name.text.isEmpty && !state.busy),
      onPopInvokedWithResult: (didPop, _) => unawaited(_exit(didPop)),
      child: Scaffold(
        appBar: AppBar(
          title: Text(title),
          actions: [
            IconButton(
              tooltip: context.tr('Refresh', '刷新'),
              onPressed: state.allowed && !state.busy ? _load : null,
              icon: const Icon(Icons.refresh),
            ),
          ],
        ),
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (!state.allowed)
                Text(
                  context.tr(
                    'Admin access is not available for this session.',
                    '当前会话没有管理权限。',
                  ),
                )
              else ...[
                if (state.busy) const LinearProgressIndicator(),
                if (state.failure != null)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: Text(
                      localizedFailure(context, state.failure!),
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                  ),
                if (state.writeUncertain) ...[
                  Text(
                    context.tr(
                      'The change is not confirmed. Refresh and check the result before another write. It will not be sent again automatically.',
                      '变更尚未确认。请刷新并核对结果，再决定下一步；系统不会自动重发。',
                    ),
                  ),
                  OutlinedButton(
                    onPressed: state.busy ? null : _load,
                    child: Text(context.tr('Read current state', '读取当前状态')),
                  ),
                ],
                if (state.notice != null)
                  Semantics(
                    liveRegion: true,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Text(
                        state.notice == 'saved'
                            ? context.tr(
                                'Saved and independently confirmed.',
                                '已保存，并已重新读取确认。',
                              )
                            : context.tr(
                                'Current state refreshed. Check it before deciding on another change.',
                                '当前状态已刷新。请核对后再决定是否继续修改。',
                              ),
                      ),
                    ),
                  ),
                if (widget.page == 'status') ..._status(state),
                if (widget.page == 'records') ..._records(state),
                if (widget.page == 'categories') ..._categories(state),
                if (widget.page == 'classification') ..._classification(state),
                if (state.failure != null && !state.writeUncertain)
                  OutlinedButton(
                    onPressed: state.busy ? null : _load,
                    child: Text(context.tr('Retry read', '重新读取')),
                  ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _status(AdminState state) => [
    Text(
      context.tr(
        'This service instance only. Refresh reads existing observations and does not call AI or Event providers.',
        '仅显示当前服务实例。刷新只读取已有观察，不调用 AI 或活动来源。',
      ),
    ),
    const SizedBox(height: 12),
    for (final service in state.status?.services ?? <AdminServiceStatus>[])
      Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(switch (service.service) {
                'backend' => context.tr(
                  'Backend / Admin maintenance',
                  '后端 / 管理记录清理',
                ),
                'firebase' => context.tr(
                  'Firebase identity check',
                  'Firebase 身份检查',
                ),
                'ai' => context.tr('AI readiness', 'AI 接入就绪状态'),
                'onepa' => 'onePA',
                _ => 'Ticketmaster',
              }, style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              Text(switch (service.state) {
                'ready' => context.tr(
                  'Ready / last observation passed',
                  '已就绪 / 最近观察通过',
                ),
                'unavailable' => context.tr('Unavailable', '暂不可用'),
                'disabled' => context.tr('Not configured', '未配置'),
                _ => context.tr('Unknown', '未知'),
              }),
              if (service.reason == 'not_observed')
                Text(
                  context.tr(
                    'No completed observation since this service started.',
                    '服务启动后尚无完整观察。',
                  ),
                ),
              if (service.reason == 'stale_observation')
                Text(
                  context.tr(
                    'The last observation is over five minutes old.',
                    '最近观察距今超过五分钟。',
                  ),
                ),
              if (service.reason == 'maintenance_unavailable')
                Text(
                  context.tr(
                    'Maintenance is incomplete or unavailable.',
                    '维护尚未完成或暂不可用。',
                  ),
                ),
              if (service.observedAt != null)
                Text(
                  context.tr(
                    'Observed: ${_time(service.observedAt!)}',
                    '观察时间：${_time(service.observedAt!)}',
                  ),
                ),
              if (service.succeededAt != null)
                Text(
                  context.tr(
                    'Last success: ${_time(service.succeededAt!)}',
                    '最近成功：${_time(service.succeededAt!)}',
                  ),
                ),
              if (service.service == 'ai')
                Text(
                  context.tr(
                    'Readiness does not prove a successful generated reply.',
                    '就绪状态不代表已成功生成回复。',
                  ),
                ),
            ],
          ),
        ),
      ),
  ];
  List<Widget> _records(AdminState state) => [
    Text(
      context.tr(
        'Committed changes only, retained for 30 days. Failed attempts and older history are not included.',
        '仅显示已提交的变更，保留 30 天；不包含失败尝试和更早历史。',
      ),
    ),
    const SizedBox(height: 12),
    if (!state.busy && state.records.isEmpty && state.failure == null)
      Text(context.tr('No operation records yet.', '暂无操作记录。')),
    for (final r in state.records.where(
      (r) => DateTime.now().toUtc().isBefore(r.expiresAt),
    ))
      Card(
        child: ExpansionTile(
          title: Text('${_operation(r.operation)} · ${_time(r.occurredAt)}'),
          subtitle: Text(_target(r.targetType)),
          childrenPadding: const EdgeInsets.all(16),
          expandedCrossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SelectableText(
              context.tr('Object: ${r.targetId}', '对象：${r.targetId}'),
            ),
            SelectableText(
              context.tr('Administrator: ${r.actor}', '管理员：${r.actor}'),
            ),
            Text(
              context.tr(
                'Revision: ${r.beforeRevision ?? 0} → ${r.afterRevision}',
                '版本：${r.beforeRevision ?? 0} → ${r.afterRevision}',
              ),
            ),
            Text(context.tr('Committed', '已提交')),
          ],
        ),
      ),
    if (state.nextCursor != null)
      OutlinedButton(
        onPressed: state.busy
            ? null
            : () => _controller.load('records', more: true),
        child: Text(context.tr('Load more', '加载更多')),
      ),
  ];
  String _operation(String v) => switch (v) {
    'create' => context.tr('Create', '创建'),
    'rename' => context.tr('Rename', '改名'),
    'deactivate' => context.tr('Deactivate', '停用'),
    'restore' => context.tr('Restore', '恢复'),
    'assign' => context.tr('Assign category', '指定分类'),
    _ => context.tr('Clear category', '清除分类'),
  };
  String _target(String v) => switch (v) {
    'interest_tag' => context.tr('Interest tag', '兴趣标签'),
    'event_category' => context.tr('Event category', '活动分类'),
    _ => context.tr('Event classification', '活动分类关联'),
  };
  String _time(DateTime date) => date.toLocal().toString().split('.').first;
  List<Widget> _categories(AdminState state) {
    final editable = !state.busy && !state.writeUncertain;
    return [
      Text(
        context.tr(
          'Inactive categories keep existing assignments and cannot be newly assigned. Permanent deletion is unavailable.',
          '停用分类保留已有活动关联，不能再新分配。永久删除暂不可用。',
        ),
      ),
      const SizedBox(height: 16),
      TextField(
        key: const Key('admin-category-name'),
        controller: _name,
        enabled: editable,
        onChanged: (_) => setState(() {}),
        maxLength: 50,
        decoration: InputDecoration(
          labelText: _editing == null
              ? context.tr('New category name', '新分类名称')
              : context.tr('Rename category', '修改分类名称'),
        ),
      ),
      Wrap(
        spacing: 8,
        children: [
          FilledButton(
            onPressed: editable && _name.text.trim().isNotEmpty
                ? () => _save(state)
                : null,
            child: Text(
              _editing == null
                  ? context.tr('Create category', '创建分类')
                  : context.tr('Save name', '保存名称'),
            ),
          ),
          if (_editing != null)
            TextButton(
              onPressed: state.busy
                  ? null
                  : () => setState(() {
                      _editing = null;
                      _name.clear();
                    }),
              child: Text(context.tr('Cancel edit', '取消编辑')),
            ),
        ],
      ),
      const SizedBox(height: 20),
      if (widget.openEvents != null)
        OutlinedButton.icon(
          onPressed: state.busy ? null : widget.openEvents,
          icon: const Icon(Icons.event_outlined),
          label: Text(
            context.tr('Open Events to assign a category', '打开活动并指定分类'),
          ),
        ),
      TextField(
        decoration: InputDecoration(
          labelText: context.tr('Search name or ID', '搜索名称或 ID'),
          prefixIcon: const Icon(Icons.search),
        ),
        onChanged: (v) => setState(() => _query = v.trim().toLowerCase()),
      ),
      Wrap(
        spacing: 8,
        children: [
          for (final filter in <bool?>[null, true, false])
            ChoiceChip(
              label: Text(
                filter == null
                    ? context.tr('All', '全部')
                    : filter
                    ? context.tr('Active', '启用')
                    : context.tr('Inactive', '停用'),
              ),
              selected: _activeFilter == filter,
              onSelected: (_) => setState(() => _activeFilter = filter),
            ),
        ],
      ),
      if (!state.busy && state.categories.isEmpty && state.failure == null)
        Text(context.tr('No categories yet.', '暂无分类。')),
      for (final c in state.categories.where(
        (c) =>
            (_activeFilter == null || c.active == _activeFilter) &&
            (_query.isEmpty ||
                c.name.toLowerCase().contains(_query) ||
                c.id.contains(_query)),
      ))
        Card(
          child: ExpansionTile(
            key: ValueKey(c.id),
            title: Text(c.name),
            subtitle: Text(
              c.active
                  ? context.tr('Active', '已启用')
                  : context.tr('Inactive', '已停用'),
            ),
            childrenPadding: const EdgeInsets.all(16),
            expandedCrossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SelectableText(c.id),
              Text(context.tr('Revision ${c.revision}', '版本 ${c.revision}')),
              Wrap(
                spacing: 8,
                children: [
                  TextButton(
                    onPressed: editable
                        ? () => setState(() {
                            _editing = c;
                            _name.text = c.name;
                          })
                        : null,
                    child: Text(context.tr('Rename', '改名')),
                  ),
                  OutlinedButton(
                    onPressed: editable
                        ? () async {
                            final confirmed = await _confirm(
                              c.active
                                  ? context.tr('Deactivate category?', '停用分类？')
                                  : context.tr('Restore category?', '恢复分类？'),
                              c.active
                                  ? context.tr(
                                      'Existing Event assignments will remain. New assignments will be blocked.',
                                      '已有活动关联保留，新的分类指派将被阻止。',
                                    )
                                  : context.tr(
                                      'This category can be assigned to Events again.',
                                      '此分类将重新允许指派给活动。',
                                    ),
                            );
                            if (_current(state) && confirmed) {
                              await _controller.save(
                                expected: c,
                                active: !c.active,
                              );
                            }
                          }
                        : null,
                    child: Text(
                      c.active
                          ? context.tr('Deactivate', '停用')
                          : context.tr('Restore', '恢复'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
    ];
  }

  List<Widget> _classification(AdminState state) {
    final current = state.classification,
        editable =
            !state.busy &&
            !state.writeUncertain &&
            current?.eventId == widget.eventId;
    return [
      Text(
        widget.eventTitle ?? widget.eventId ?? '',
        style: Theme.of(context).textTheme.titleLarge,
      ),
      const SizedBox(height: 12),
      Text(
        context.tr(
          'ENMORI classification is separate from the original provider category.',
          'ENMORI 分类与活动来源原有分类分开显示。',
        ),
      ),
      if (current != null) ...[
        const SizedBox(height: 16),
        Text(
          context.tr(
            'Current: ${current.category?.name ?? 'Unassigned'}',
            '当前分类：${current.category?.name ?? '未指定'}',
          ),
        ),
        if (current.category?.active == false)
          Text(
            context.tr(
              'The current category is inactive; the existing assignment is retained.',
              '当前分类已停用，已有活动关联仍保留。',
            ),
          ),
      ],
      const SizedBox(height: 16),
      for (final category in state.categories.where((c) => c.active))
        Card(
          child: ListTile(
            title: Text(category.name),
            trailing: current?.category?.id == category.id
                ? const Icon(Icons.check)
                : const Icon(Icons.chevron_right),
            onTap: editable && current?.category?.id != category.id
                ? () async {
                    if (await _confirm(
                          context.tr('Assign this category?', '指定此分类？'),
                          category.name,
                        ) &&
                        _current(state)) {
                      await _controller.assign(category.id);
                    }
                  }
                : null,
          ),
        ),
      if (current?.category != null)
        OutlinedButton(
          onPressed: editable
              ? () async {
                  if (await _confirm(
                        context.tr('Clear category?', '清除分类？'),
                        context.tr(
                          'The source Event and its original category remain unchanged.',
                          '来源活动和它的原始分类保持不变。',
                        ),
                      ) &&
                      _current(state)) {
                    await _controller.assign(null);
                  }
                }
              : null,
          child: Text(context.tr('Clear ENMORI category', '清除 ENMORI 分类')),
        ),
      if (!state.busy && state.categories.every((c) => !c.active))
        Text(
          context.tr(
            'No active categories. Create or restore one in Administration.',
            '暂无启用分类，请先在管理中心创建或恢复分类。',
          ),
        ),
    ];
  }
}
