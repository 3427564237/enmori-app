import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../domain/persona.dart';
import '../persona_providers.dart';
import 'persona_page_parts.dart';

final class PersonaEditorPage extends ConsumerWidget {
  const PersonaEditorPage({this.personaId, required this.onBack, super.key});

  final String? personaId;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context, WidgetRef ref) => _PersonaEditor(
    key: ValueKey((
      ref.watch(personaSessionControllerProvider).sessionKey,
      personaId,
    )),
    personaId: personaId,
    onBack: onBack,
  );
}

final class _PersonaEditor extends ConsumerStatefulWidget {
  const _PersonaEditor({
    required this.personaId,
    required this.onBack,
    super.key,
  });

  final String? personaId;
  final VoidCallback onBack;

  @override
  ConsumerState<_PersonaEditor> createState() => _PersonaEditorState();
}

final class _PersonaEditorState extends ConsumerState<_PersonaEditor> {
  static const _nameGuidance = 'Required. Use 1–50 characters.';
  static const _nameCorrection =
      'Enter a name of 1–50 characters without control characters.';
  GlobalKey<FormState> _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _nameFocus = FocusNode();
  PersonaTone _tone = PersonaTone.neutral;
  PersonaResponseLength _responseLength = PersonaResponseLength.balanced;
  PersonaFormatStyle _formatStyle = PersonaFormatStyle.plain;
  PersonaFields _baseline = const PersonaFields(
    displayName: '',
    tone: PersonaTone.neutral,
    responseLength: PersonaResponseLength.balanced,
    formatStyle: PersonaFormatStyle.plain,
  );
  Persona? _persona;
  String? _createKey;
  PersonaFields? _submittedFields;
  bool _loading = true;
  bool _unavailable = false;
  bool _loadFailed = false;
  bool _confirming = false;
  bool _savedCreate = false;
  int _pageOperation = 0;

  PersonaFields get _fields => PersonaFields(
    displayName: _name.text,
    tone: _tone,
    responseLength: _responseLength,
    formatStyle: _formatStyle,
  );

  bool get _dirty => _fields != _baseline;

  @override
  void initState() {
    super.initState();
    ref.listenManual(personaSessionControllerProvider, (_, next) {
      final submitted = _submittedFields;
      final commandKey = _createKey;
      final operation = _pageOperation;
      if (commandKey == null ||
          next.lastConfirmedCreateKey != commandKey ||
          submitted == null ||
          _savedCreate) {
        return;
      }
      // TextEditingController changes must occur after rendering, and only for
      // the still-matching page operation and session command.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted ||
            operation != _pageOperation ||
            _savedCreate ||
            commandKey != _createKey) {
          return;
        }
        final state = ref.read(personaSessionControllerProvider);
        if (state.sessionKey != next.sessionKey ||
            state.lastConfirmedCreateKey != commandKey) {
          return;
        }
        setState(() {
          _setFields(submitted);
          _savedCreate = true;
        });
      });
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _load();
    });
  }

  @override
  void dispose() {
    _pageOperation++;
    _name.dispose();
    _nameFocus.dispose();
    super.dispose();
  }

  void _setFields(PersonaFields fields) {
    _form = GlobalKey<FormState>();
    _name.text = fields.displayName;
    _tone = fields.tone;
    _responseLength = fields.responseLength;
    _formatStyle = fields.formatStyle;
    _baseline = fields;
  }

  Future<void> _load() async {
    if (_confirming) return;
    var discardedDraft = false;
    if (_dirty &&
        ref.read(personaSessionControllerProvider).pendingCreate == null) {
      final discard = await _confirmDiscard();
      if (!mounted || !discard) return;
      discardedDraft = true;
    }
    final operation = ++_pageOperation;
    final controller = ref.read(personaSessionControllerProvider.notifier);
    final sessionKey = ref.read(personaSessionControllerProvider).sessionKey;
    setState(() {
      _loading = true;
      _unavailable = false;
      _loadFailed = false;
    });
    await controller.load();
    if (!mounted ||
        operation != _pageOperation ||
        sessionKey != ref.read(personaSessionControllerProvider).sessionKey) {
      return;
    }
    final id = widget.personaId;
    if (id != null) {
      final result = await controller.readPersona(id);
      if (!mounted ||
          operation != _pageOperation ||
          sessionKey != ref.read(personaSessionControllerProvider).sessionKey) {
        return;
      }
      setState(() {
        _loading = false;
        switch (result) {
          case Success<PersonaMutation>(:final value):
            _persona = value.persona;
            _setFields(value.persona.fields);
          case Failure<PersonaMutation>(:final failure):
            _unavailable = failure.kind == AppFailureKind.personaUnavailable;
            _loadFailed = !_unavailable;
        }
      });
    } else {
      final current = ref.read(personaSessionControllerProvider);
      final pending = current.pendingCreate;
      setState(() {
        _loading = false;
        if (pending != null) {
          _createKey = pending.command.idempotencyKey;
          _submittedFields = pending.command.fields;
          _setFields(pending.command.fields);
        } else if (_createKey != null &&
            current.lastConfirmedCreateKey == _createKey &&
            _submittedFields != null) {
          _setFields(_submittedFields!);
          _savedCreate = true;
        } else if (discardedDraft) {
          _setFields(
            const PersonaFields(
              displayName: '',
              tone: PersonaTone.neutral,
              responseLength: PersonaResponseLength.balanced,
              formatStyle: PersonaFormatStyle.plain,
            ),
          );
        }
      });
    }
  }

  Future<bool> _confirmDiscard() async {
    if (_confirming) return false;
    _confirming = true;
    final sessionKey = ref.read(personaSessionControllerProvider).sessionKey;
    final discard = await confirmPersonaAction(
      context,
      message: 'Discard unsaved changes?',
      cancelLabel: 'Keep editing',
      actionLabel: 'Discard',
      actionKey: 'persona-confirm-discard',
    );
    if (!mounted) return false;
    _confirming = false;
    return discard &&
        sessionKey == ref.read(personaSessionControllerProvider).sessionKey;
  }

  Future<void> _back() async {
    if (_confirming) return;
    final session = ref.read(personaSessionControllerProvider);
    var leave = true;
    if (session.isBusy || session.pendingCreate != null) {
      _confirming = true;
      leave = await confirmPersonaExit(context);
      if (!mounted) return;
      _confirming = false;
    } else if (_dirty) {
      leave = await _confirmDiscard();
    }
    if (!mounted ||
        session.sessionKey !=
            ref.read(personaSessionControllerProvider).sessionKey) {
      return;
    }
    if (leave) {
      _pageOperation++;
      widget.onBack();
    }
  }

  Future<void> _save() async {
    if (!(_form.currentState?.validate() ?? false)) {
      _nameFocus.requestFocus();
      return;
    }
    final state = ref.read(personaSessionControllerProvider);
    if (state.isBusy || !state.isCurrent) return;
    final operation = ++_pageOperation;
    final submitted = _fields.normalized;
    final controller = ref.read(personaSessionControllerProvider.notifier);
    final persona = _persona;
    late final Future<bool> request;
    if (widget.personaId == null) {
      if (!state.canStartNewCreate) return;
      request = controller.create(submitted);
      _createKey = ref
          .read(personaSessionControllerProvider)
          .pendingCreate
          ?.command
          .idempotencyKey;
      _submittedFields = submitted;
    } else if (persona != null) {
      request = controller.edit(persona, submitted);
    } else {
      return;
    }
    final saved = await request;
    if (!mounted ||
        operation != _pageOperation ||
        state.sessionKey !=
            ref.read(personaSessionControllerProvider).sessionKey) {
      return;
    }
    if (saved) {
      setState(() {
        _setFields(submitted);
        _savedCreate = widget.personaId == null;
        final current = ref.read(personaSessionControllerProvider).collection;
        if (persona != null) {
          _persona =
              current?.items
                  .where((p) => p.personaId == persona.personaId)
                  .firstOrNull ??
              persona;
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(personaSessionControllerProvider);
    final controller = ref.read(personaSessionControllerProvider.notifier);
    final create = widget.personaId == null;
    final enabled =
        !_loading &&
        !_confirming &&
        !state.isBusy &&
        !state.isLoading &&
        state.isCurrent &&
        state.pendingCreate == null &&
        !_savedCreate;
    return PersonaPageScaffold(
      title: create ? 'Create Persona' : 'Edit Persona',
      onBack: _back,
      child: _loading
          ? const PersonaLoading()
          : ListView(
              key: Key(create ? 'route-persona-create' : 'route-persona-edit'),
              padding: const EdgeInsets.all(24),
              children: [
                if (_unavailable) ...[
                  const Text('This Persona is unavailable.'),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: _back,
                    child: const Text('Back to Personas'),
                  ),
                ] else ...[
                  PersonaStatusPanel(
                    state: state,
                    onReload: _load,
                    onRetryCreate: controller.retryCreate,
                    onBack: _back,
                    onEndCreate: () {
                      if (controller.endUnresolvedCreate()) {
                        setState(() {
                          _createKey = null;
                          _submittedFields = null;
                          _setFields(
                            const PersonaFields(
                              displayName: '',
                              tone: PersonaTone.neutral,
                              responseLength: PersonaResponseLength.balanced,
                              formatStyle: PersonaFormatStyle.plain,
                            ),
                          );
                        });
                      }
                    },
                  ),
                  if (_loadFailed) ...[
                    const Text('Personas could not be loaded. Try again.'),
                    FilledButton(
                      key: const Key('persona-editor-retry'),
                      onPressed: _load,
                      child: const Text('Retry'),
                    ),
                  ] else if (create || _persona != null)
                    Form(
                      key: _form,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const SizedBox(height: 16),
                          TextFormField(
                            key: const Key('persona-name'),
                            controller: _name,
                            focusNode: _nameFocus,
                            enabled: enabled,
                            textInputAction: TextInputAction.next,
                            decoration: InputDecoration(
                              labelText: 'Name',
                              helperText: _nameGuidance,
                              // These fixed messages can wrap as far as one
                              // character per line without an arbitrary cap.
                              helperMaxLines: _nameGuidance.length,
                              errorMaxLines: _nameCorrection.length,
                            ),
                            validator: (value) =>
                                PersonaFields.nameValidationMessage(
                                      value ?? '',
                                    ) ==
                                    null
                                ? null
                                : _nameCorrection,
                            onChanged: (_) => setState(() {}),
                          ),
                          const SizedBox(height: 24),
                          DropdownButtonFormField<PersonaTone>(
                            key: const Key('persona-tone'),
                            initialValue: _tone,
                            isExpanded: true,
                            decoration: const InputDecoration(
                              labelText: 'Tone',
                            ),
                            items: [
                              for (final value in PersonaTone.values)
                                DropdownMenuItem(
                                  value: value,
                                  child: Text(value.name),
                                ),
                            ],
                            onChanged: enabled
                                ? (value) {
                                    if (value != null) {
                                      setState(() => _tone = value);
                                    }
                                  }
                                : null,
                          ),
                          const SizedBox(height: 24),
                          DropdownButtonFormField<PersonaResponseLength>(
                            key: const Key('persona-response-length'),
                            initialValue: _responseLength,
                            isExpanded: true,
                            decoration: const InputDecoration(
                              labelText: 'Response length',
                            ),
                            items: [
                              for (final value in PersonaResponseLength.values)
                                DropdownMenuItem(
                                  value: value,
                                  child: Text(value.name),
                                ),
                            ],
                            onChanged: enabled
                                ? (value) {
                                    if (value != null) {
                                      setState(() => _responseLength = value);
                                    }
                                  }
                                : null,
                          ),
                          const SizedBox(height: 24),
                          DropdownButtonFormField<PersonaFormatStyle>(
                            key: const Key('persona-format'),
                            initialValue: _formatStyle,
                            isExpanded: true,
                            decoration: const InputDecoration(
                              labelText: 'Format',
                            ),
                            items: [
                              for (final value in PersonaFormatStyle.values)
                                DropdownMenuItem(
                                  value: value,
                                  child: Text(value.name),
                                ),
                            ],
                            onChanged: enabled
                                ? (value) {
                                    if (value != null) {
                                      setState(() => _formatStyle = value);
                                    }
                                  }
                                : null,
                          ),
                          const SizedBox(height: 24),
                          FilledButton(
                            key: const Key('persona-save'),
                            onPressed:
                                enabled && (!create || state.canStartNewCreate)
                                ? _save
                                : null,
                            child: Text(
                              state.isBusy
                                  ? 'Saving…'
                                  : create
                                  ? 'Create Persona'
                                  : 'Save changes',
                            ),
                          ),
                          if (_savedCreate) ...[
                            const SizedBox(height: 16),
                            OutlinedButton(
                              onPressed: _back,
                              child: const Text('Back to Personas'),
                            ),
                          ],
                        ],
                      ),
                    ),
                ],
              ],
            ),
    );
  }
}
