import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

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
          ? 'Permanently delete this Persona? This cannot be undone.${active ? '\n\nYou will have no active Persona until you activate another.' : ''}'
          : 'Activate this Persona? It will replace your current active selection.',
      cancelLabel: 'Cancel',
      actionLabel: deleting ? 'Delete permanently' : 'Activate',
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
      title: 'Manage Personas',
      onBack: _back,
      child: state.isLoading && collection == null
          ? const PersonaLoading()
          : ListView(
              key: const Key('route-persona-management'),
              padding: const EdgeInsets.all(24),
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
                            child: const Text(
                              'Your Personas changed. Reload them before trying again.',
                            ),
                          ),
                          const SizedBox(height: 12),
                          OutlinedButton(
                            key: const Key('persona-confirmation-reload'),
                            onPressed: state.isLoading ? null : _reload,
                            child: const Text('Reload'),
                          ),
                        ],
                      ),
                    ),
                  ),
                if (state.isLoading) const LinearProgressIndicator(),
                if (state.isCurrent && collection != null) ...[
                  if (collection.items.isEmpty)
                    const Text(
                      'You have no Personas yet.',
                      key: Key('persona-empty'),
                    ),
                  if (collection.items.length == 5)
                    const Text(
                      'You have 5 Personas. Delete one before creating another.',
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
                    child: const Text('Create Persona'),
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
                                tooltip:
                                    'More options for ${persona.fields.displayName}',
                                onSelected: (action) {
                                  if (!mounted || !enabled) return;
                                  if (action == 'edit') {
                                    widget.onEdit(persona.personaId);
                                  } else if (action == 'delete') {
                                    _confirm(persona, deleting: true);
                                  }
                                },
                                itemBuilder: (_) => const [
                                  PopupMenuItem(
                                    value: 'edit',
                                    child: Text('Edit Persona'),
                                  ),
                                  PopupMenuItem(
                                    value: 'delete',
                                    child: Text('Delete Persona'),
                                  ),
                                ],
                              ),
                            ),
                            PersonaSummary(persona: persona),
                            const SizedBox(height: 8),
                            Text(
                              collection.activePersonaId == persona.personaId
                                  ? 'Active'
                                  : 'Inactive',
                              semanticsLabel:
                                  collection.activePersonaId ==
                                      persona.personaId
                                  ? 'Current activation status: Active'
                                  : 'Current activation status: Inactive',
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
                                        ? 'Selected for activation: ${persona.fields.displayName}'
                                        : 'Select for activation: ${persona.fields.displayName}',
                                    value:
                                        collection.activePersonaId ==
                                            persona.personaId
                                        ? 'Currently active'
                                        : 'Not active',
                                    excludeSemantics: true,
                                    child: _selected == persona.personaId
                                        ? const Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              ExcludeSemantics(
                                                child: Icon(
                                                  Icons.check,
                                                  size: 18,
                                                ),
                                              ),
                                              SizedBox(width: 8),
                                              Text('Selected'),
                                            ],
                                          )
                                        : const Text('Select'),
                                  ),
                                ),
                                OutlinedButton(
                                  key: Key('persona-edit-${persona.personaId}'),
                                  onPressed: enabled
                                      ? () => widget.onEdit(persona.personaId)
                                      : null,
                                  child: const Text('Edit'),
                                ),
                                OutlinedButton(
                                  key: Key(
                                    'persona-delete-${persona.personaId}',
                                  ),
                                  onPressed: enabled
                                      ? () => _confirm(persona, deleting: true)
                                      : null,
                                  child: const Text('Delete'),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  if (selected != null) ...[
                    const SizedBox(height: 16),
                    Text('Selected: ${selected.fields.displayName}'),
                    const SizedBox(height: 8),
                    FilledButton(
                      key: const Key('persona-activate'),
                      onPressed: enabled
                          ? () => _confirm(selected, deleting: false)
                          : null,
                      child: const Text('Activate'),
                    ),
                  ],
                ],
              ],
            ),
    );
  }
}
