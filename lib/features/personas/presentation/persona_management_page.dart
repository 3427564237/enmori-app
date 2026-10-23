import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../domain/persona.dart';
import '../persona_providers.dart';
import 'persona_page_parts.dart';

final class PersonaManagementPage extends ConsumerWidget {
  const PersonaManagementPage({
    required this.onCreate,
    required this.onEdit,
    required this.onBack,
    super.key,
  });
  final VoidCallback onCreate;
  final ValueChanged<String> onEdit;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context, WidgetRef ref) => _PersonaManagement(
    key: ValueKey(ref.watch(personaSessionControllerProvider).sessionKey),
    onCreate: onCreate,
    onEdit: onEdit,
    onBack: onBack,
  );
}

final class _PersonaManagement extends ConsumerStatefulWidget {
  const _PersonaManagement({
    required this.onCreate,
    required this.onEdit,
    required this.onBack,
    super.key,
  });
  final VoidCallback onCreate;
  final ValueChanged<String> onEdit;
  final VoidCallback onBack;

  @override
  ConsumerState<_PersonaManagement> createState() => _PersonaManagementState();
}

final class _PersonaManagementState extends ConsumerState<_PersonaManagement> {
  final _confirmation = PersonaConfirmation();
  String? _selected;
  bool _confirming = false;
  bool _staleConfirmation = false;
  int _pageOperation = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) ref.read(personaSessionControllerProvider.notifier).load();
    });
  }

  @override
  void dispose() {
    _confirmation.dispose();
    super.dispose();
  }

  Future<void> _back() async {
    if (_confirming) return;
    final operation = ++_pageOperation;
    _confirming = true;
    final state = ref.read(personaSessionControllerProvider);
    final leave =
        (!state.isBusy && state.pendingCreate == null) ||
        await _confirmation.exit(context);
    if (!mounted || operation != _pageOperation) return;
    _confirming = false;
    if (leave &&
        state.sessionKey ==
            ref.read(personaSessionControllerProvider).sessionKey) {
      widget.onBack();
    }
  }

  Future<void> _confirm(Persona persona, {required bool deleting}) async {
    if (_confirming) return;
    final state = ref.read(personaSessionControllerProvider);
    if (state.isBusy || !state.isCurrent) return;
    final operation = ++_pageOperation;
    final invokingFocus = FocusManager.instance.primaryFocus;
    setState(() => _confirming = true);
    final active = state.collection?.activePersonaId == persona.personaId;
    final confirmed = await _confirmation.action(
      context,
      message: deleting
          ? context.tr(
              'Permanently delete this Persona? This cannot be undone.${active ? '\n\nYou will have no active Persona until you activate another.' : ''}',
              '永久删除此人设？此操作无法撤销。${active ? '\n\n删除后将使用默认表达，直到你启用另一个人设。' : ''}',
            )
          : context.tr(
              'Activate this Persona? It will replace your current active selection.',
              '启用此人设？它将替换当前人设。',
            ),
      cancelLabel: context.tr('Cancel', '取消'),
      actionLabel: deleting
          ? context.tr('Delete permanently', '永久删除')
          : context.tr('Activate', '启用'),
      actionKey: deleting
          ? 'persona-confirm-delete'
          : 'persona-confirm-activate',
    );
    if (!mounted || operation != _pageOperation) return;
    setState(() => _confirming = false);
    if (state.sessionKey !=
        ref.read(personaSessionControllerProvider).sessionKey) {
      return;
    }
    if (!confirmed) {
      // The invoking control was disabled during confirmation. Restore its
      // keyboard focus only after that control is enabled in the next frame.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted ||
            operation != _pageOperation ||
            state.sessionKey !=
                ref.read(personaSessionControllerProvider).sessionKey ||
            invokingFocus?.context == null ||
            invokingFocus?.canRequestFocus != true) {
          return;
        }
        invokingFocus!.requestFocus();
      });
      return;
    }
    final current = ref.read(personaSessionControllerProvider);
    if (!current.isCurrent ||
        current.collection?.stateRevision != state.collection?.stateRevision) {
      setState(() => _staleConfirmation = true);
      return;
    }
    final controller = ref.read(personaSessionControllerProvider.notifier);
    if (deleting) {
      await controller.delete(persona);
    } else {
      await controller.activate(persona);
    }
    if (!mounted || operation != _pageOperation) return;
    setState(() => _selected = null);
  }

  void _reload() {
    setState(() {
      _selected = null;
      _staleConfirmation = false;
    });
    ref.read(personaSessionControllerProvider.notifier).load();
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final state = ref.watch(personaSessionControllerProvider);
    final controller = ref.read(personaSessionControllerProvider.notifier);
    final collection = state.collection;
    final enabled =
        state.isCurrent &&
        !state.isBusy &&
        !state.isLoading &&
        !_confirming &&
        !_staleConfirmation;
    final selected = collection?.items
        .where((p) => p.personaId == _selected)
        .firstOrNull;
    return PersonaPageScaffold(
      title: context.tr('Manage Personas', '管理人设'),
      onBack: _back,
      child: state.isLoading && collection == null
          ? const PersonaLoading()
          : ListView(
              key: const Key('route-persona-management'),
              padding: const EdgeInsets.all(16),
              children: [
                PersonaStatusPanel(
                  state: state,
                  onReload: _reload,
                  onRetryCreate: controller.retryCreate,
                  onEndCreate: controller.endUnresolvedCreate,
                  onBack: _back,
                ),
                if (_staleConfirmation)
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Semantics(
                            liveRegion: true,
                            child: Text(
                              context.tr(
                                'Your Personas changed. Reload them before trying again.',
                                '人设已发生变化，请重新加载后再试。',
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                          OutlinedButton(
                            key: const Key('persona-confirmation-reload'),
                            onPressed: state.isLoading ? null : _reload,
                            child: Text(context.tr('Reload', '重新加载')),
                          ),
                        ],
                      ),
                    ),
                  ),
                if (state.isLoading) const LinearProgressIndicator(),
                if (state.isCurrent && collection != null) ...[
                  if (collection.items.isEmpty)
                    Text(
                      context.tr('You have no Personas yet.', '你还没有人设。'),
                      key: Key('persona-empty'),
                    ),
                  if (collection.items.length == 5)
                    Text(
                      context.tr(
                        'You have 5 Personas. Delete one before creating another.',
                        '你已有 5 个人设，请先删除一个再创建。',
                      ),
                    ),
                  const SizedBox(height: 16),
                  FilledButton(
                    key: const Key('persona-create'),
                    onPressed:
                        enabled &&
                            state.canStartNewCreate &&
                            collection.items.length < 5
                        ? widget.onCreate
                        : null,
                    child: Text(context.tr('Create Persona', '创建人设')),
                  ),
                  const SizedBox(height: 16),
                  for (final persona in collection.items)
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Align(
                              alignment: AlignmentDirectional.centerEnd,
                              child: PopupMenuButton<String>(
                                key: Key('persona-more-${persona.personaId}'),
                                enabled: enabled,
                                tooltip: context.tr(
                                  'More options for ${persona.fields.displayName}',
                                  '${persona.fields.displayName}的更多操作',
                                ),
                                onSelected: (action) {
                                  if (!mounted || !enabled) return;
                                  if (action == 'edit') {
                                    widget.onEdit(persona.personaId);
                                  } else if (action == 'delete') {
                                    _confirm(persona, deleting: true);
                                  }
                                },
                                itemBuilder: (_) => [
                                  PopupMenuItem(
                                    value: 'edit',
                                    child: Text(
                                      context.tr('Edit Persona', '编辑人设'),
                                    ),
                                  ),
                                  PopupMenuItem(
                                    value: 'delete',
                                    child: Text(
                                      context.tr('Delete Persona', '删除人设'),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            PersonaSummary(persona: persona),
                            const SizedBox(height: 8),
                            Text(
                              collection.activePersonaId == persona.personaId
                                  ? context.tr('Active', '已启用')
                                  : context.tr('Inactive', '未启用'),
                              semanticsLabel:
                                  collection.activePersonaId ==
                                      persona.personaId
                                  ? context.tr(
                                      'Current activation status: Active',
                                      '当前状态：已启用',
                                    )
                                  : context.tr(
                                      'Current activation status: Inactive',
                                      '当前状态：未启用',
                                    ),
                            ),
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                OutlinedButton(
                                  key: Key(
                                    'persona-select-${persona.personaId}',
                                  ),
                                  onPressed: enabled
                                      ? () => setState(
                                          () => _selected = persona.personaId,
                                        )
                                      : null,
                                  style: _selected == persona.personaId
                                      ? OutlinedButton.styleFrom(
                                          backgroundColor:
                                              colors.primaryContainer,
                                          foregroundColor:
                                              colors.onPrimaryContainer,
                                          side: BorderSide(
                                            color: colors.primary,
                                            width: 2,
                                          ),
                                        )
                                      : null,
                                  child: Semantics(
                                    selected: _selected == persona.personaId,
                                    label: _selected == persona.personaId
                                        ? context.tr(
                                            'Selected for activation: ${persona.fields.displayName}',
                                            '已选中待启用：${persona.fields.displayName}',
                                          )
                                        : context.tr(
                                            'Select for activation: ${persona.fields.displayName}',
                                            '选择待启用人设：${persona.fields.displayName}',
                                          ),
                                    value:
                                        collection.activePersonaId ==
                                            persona.personaId
                                        ? context.tr(
                                            'Currently active',
                                            '当前已启用',
                                          )
                                        : context.tr('Not active', '未启用'),
                                    excludeSemantics: true,
                                    child: _selected == persona.personaId
                                        ? Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              ExcludeSemantics(
                                                child: Icon(
                                                  Icons.check,
                                                  size: 18,
                                                ),
                                              ),
                                              SizedBox(width: 8),
                                              Text(
                                                context.tr('Selected', '已选中'),
                                              ),
                                            ],
                                          )
                                        : Text(context.tr('Select', '选择')),
                                  ),
                                ),
                                OutlinedButton(
                                  key: Key('persona-edit-${persona.personaId}'),
                                  onPressed: enabled
                                      ? () => widget.onEdit(persona.personaId)
                                      : null,
                                  child: Text(context.tr('Edit', '编辑')),
                                ),
                                OutlinedButton(
                                  key: Key(
                                    'persona-delete-${persona.personaId}',
                                  ),
                                  onPressed: enabled
                                      ? () => _confirm(persona, deleting: true)
                                      : null,
                                  child: Text(context.tr('Delete', '删除')),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  if (selected != null) ...[
                    const SizedBox(height: 16),
                    Text(
                      context.tr(
                        'Selected: ${selected.fields.displayName}',
                        '已选择：${selected.fields.displayName}',
                      ),
                    ),
                    const SizedBox(height: 8),
                    FilledButton(
                      key: const Key('persona-activate'),
                      onPressed: enabled
                          ? () => _confirm(selected, deleting: false)
                          : null,
                      child: Text(context.tr('Activate', '启用')),
                    ),
                  ],
                ],
              ],
            ),
    );
  }
}
