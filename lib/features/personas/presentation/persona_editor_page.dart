import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../../../core/result/result.dart';
import '../domain/persona.dart';
import '../persona_providers.dart';
import '../persona_preview_providers.dart';
import 'persona_page_parts.dart';
import 'persona_copy.dart';
import 'persona_preview_page.dart';

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
  final _scroll = ScrollController();
  final _expression = {
    for (final field in _expressionLabels.keys) field: TextEditingController(),
  };
  final _nameFocus = FocusNode();
  final _confirmation = PersonaConfirmation();
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
  String _previewText = '';

  PersonaFields get _fields => PersonaFields(
    displayName: _name.text,
    tone: _tone,
    responseLength: _responseLength,
    formatStyle: _formatStyle,
    relationship: _expression['relationship']!.text,
    shortIntroduction: _expression['shortIntroduction']!.text,
    description: _expression['description']!.text,
    personality: _expression['personality']!.text,
    communicationStyle: _expression['communicationStyle']!.text,
    interests: _expression['interests']!.text,
    extraInstructions: _expression['extraInstructions']!.text,
  );

  bool get _dirty => _fields != _baseline;

  @override
  void initState() {
    super.initState();
    ref.listenManual(personaPreviewAccessProvider, (_, allowed) {
      if (!allowed) _previewText = '';
    });
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
        _showFeedback();
      });
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _load();
    });
  }

  @override
  void dispose() {
    _pageOperation++;
    _confirmation.dispose();
    _name.dispose();
    _scroll.dispose();
    for (final controller in _expression.values) {
      controller.dispose();
    }
    _nameFocus.dispose();
    super.dispose();
  }

  void _setFields(PersonaFields fields) {
    _form = GlobalKey<FormState>();
    _name.text = fields.displayName;
    for (final entry in fields.expressionFields.entries) {
      _expression[entry.key]!.text = entry.value;
    }
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
    final discard = await _confirmation.action(
      context,
      message: context.tr('Discard unsaved changes?', '放弃未保存的修改？'),
      cancelLabel: context.tr('Keep editing', '继续编辑'),
      actionLabel: context.tr('Discard', '放弃修改'),
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
      leave = await _confirmation.exit(context);
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
    _showFeedback();
  }

  void _showFeedback() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_scroll.hasClients) return;
      if (MediaQuery.disableAnimationsOf(context)) {
        _scroll.jumpTo(0);
      } else {
        _scroll.animateTo(
          0,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _preview() async {
    if (!(_form.currentState?.validate() ?? false)) {
      _nameFocus.requestFocus();
      return;
    }
    final draft = _fields.normalized;
    final sessionKey = ref.read(personaSessionControllerProvider).sessionKey;
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (_) => PersonaPreviewPage(
          fields: draft,
          initialText: _previewText,
          onTextChanged: (text) {
            if (mounted &&
                sessionKey ==
                    ref.read(personaSessionControllerProvider).sessionKey &&
                (text.isEmpty || ref.read(personaPreviewAccessProvider))) {
              _previewText = text;
            }
          },
        ),
      ),
    );
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
      title: create
          ? context.tr('Create Persona', '创建人设')
          : context.tr('Edit Persona', '编辑人设'),
      onBack: _back,
      child: _loading
          ? const PersonaLoading()
          : ListView(
              controller: _scroll,
              key: Key(create ? 'route-persona-create' : 'route-persona-edit'),
              padding: const EdgeInsets.all(16),
              children: [
                if (_unavailable) ...[
                  Text(context.tr('This Persona is unavailable.', '此人设已不可用。')),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: _back,
                    child: Text(context.tr('Back to Personas', '返回人设')),
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
                    Text(
                      context.tr(
                        'Personas could not be loaded. Try again.',
                        '未能加载人设，请重试。',
                      ),
                    ),
                    FilledButton(
                      key: const Key('persona-editor-retry'),
                      onPressed: _load,
                      child: Text(context.tr('Retry', '重试')),
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
                            autovalidateMode:
                                AutovalidateMode.onUserInteraction,
                            textInputAction: TextInputAction.next,
                            decoration: InputDecoration(
                              labelText: context.tr('Name', '名称'),
                              prefixIcon: const Icon(Icons.person_outline),
                              helperText: context.tr(
                                _nameGuidance,
                                '必填，使用 1–50 个字符。',
                              ),
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
                                : context.tr(
                                    _nameCorrection,
                                    '请输入 1–50 个字符的名称，不含控制字符。',
                                  ),
                            onChanged: (_) => setState(() {}),
                          ),
                          const SizedBox(height: 16),
                          DropdownButtonFormField<PersonaTone>(
                            key: const Key('persona-tone'),
                            initialValue: _tone,
                            isExpanded: true,
                            decoration: InputDecoration(
                              labelText: context.tr('Tone', '语气'),
                              prefixIcon: Icon(
                                Icons.record_voice_over_outlined,
                              ),
                            ),
                            items: [
                              for (final value in PersonaTone.values)
                                DropdownMenuItem(
                                  value: value,
                                  child: Text(
                                    personaLabel(context, value.name),
                                  ),
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
                          const SizedBox(height: 16),
                          DropdownButtonFormField<PersonaResponseLength>(
                            key: const Key('persona-response-length'),
                            initialValue: _responseLength,
                            isExpanded: true,
                            decoration: InputDecoration(
                              labelText: context.tr('Response length', '回复长度'),
                              prefixIcon: Icon(Icons.subject),
                            ),
                            items: [
                              for (final value in PersonaResponseLength.values)
                                DropdownMenuItem(
                                  value: value,
                                  child: Text(
                                    personaLabel(context, value.name),
                                  ),
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
                          const SizedBox(height: 16),
                          DropdownButtonFormField<PersonaFormatStyle>(
                            key: const Key('persona-format'),
                            initialValue: _formatStyle,
                            isExpanded: true,
                            decoration: InputDecoration(
                              labelText: context.tr('Format', '格式'),
                              prefixIcon: Icon(Icons.format_list_bulleted),
                            ),
                            items: [
                              for (final value in PersonaFormatStyle.values)
                                DropdownMenuItem(
                                  value: value,
                                  child: Text(
                                    personaLabel(context, value.name),
                                  ),
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
                          const SizedBox(height: 16),
                          OutlinedButton.icon(
                            key: const Key('persona-preview-quick'),
                            onPressed: enabled ? _preview : null,
                            icon: const Icon(Icons.chat_bubble_outline),
                            label: Text(context.tr('Try this draft', '试聊此草稿')),
                          ),
                          Padding(
                            padding: EdgeInsets.only(top: 8, bottom: 16),
                            child: Text(
                              context.tr(
                                'Try, return to edit, then save when it feels right. '
                                    'Trying does not save or make this Persona current.',
                                '先试聊，返回调整，满意后再保存。试聊不会保存或启用此人设。',
                              ),
                            ),
                          ),
                          Text(
                            context.tr('Personal expression', '个性表达'),
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            context.tr(
                              'These optional details shape expression only. '
                                  'They do not grant access to your data or actions.',
                              '这些选填内容只影响表达方式，不赋予数据访问或操作权限。',
                            ),
                          ),
                          for (final entry in _expressionLabels.entries) ...[
                            const SizedBox(height: 16),
                            TextFormField(
                              key: Key('persona-${entry.key}'),
                              controller: _expression[entry.key],
                              enabled: enabled,
                              minLines: 1,
                              maxLines: 4,
                              textInputAction: TextInputAction.newline,
                              decoration: InputDecoration(
                                labelText: personaLabel(context, entry.value),
                                prefixIcon: Icon(_expressionIcons[entry.key]),
                                helperText: context.tr('Optional', '选填'),
                              ),
                              onChanged: (_) => setState(() {}),
                            ),
                          ],
                          const SizedBox(height: 16),
                          OutlinedButton.icon(
                            key: const Key('persona-preview'),
                            onPressed: enabled ? _preview : null,
                            icon: const Icon(Icons.chat_bubble_outline),
                            label: Text(context.tr('Try Your Persona', '试聊人设')),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            context.tr(
                              'Try the current draft without saving, activating '
                                  'or adding to conversation history.',
                              '试聊当前草稿，不保存、不启用，也不写入正式对话历史。',
                            ),
                          ),
                          const SizedBox(height: 16),
                          FilledButton(
                            key: const Key('persona-save'),
                            onPressed:
                                enabled && (!create || state.canStartNewCreate)
                                ? _save
                                : null,
                            child: Text(
                              state.isBusy
                                  ? context.tr('Saving…', '正在保存…')
                                  : create
                                  ? context.tr('Create Persona', '创建人设')
                                  : context.tr('Save changes', '保存修改'),
                            ),
                          ),
                          if (_savedCreate) ...[
                            const SizedBox(height: 16),
                            OutlinedButton(
                              onPressed: _back,
                              child: Text(
                                context.tr('Back to Personas', '返回人设'),
                              ),
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

const _expressionLabels = {
  'relationship': 'Relationship',
  'shortIntroduction': 'Short Introduction',
  'description': 'Description',
  'personality': 'Personality',
  'communicationStyle': 'Communication Style',
  'interests': 'Custom interests',
  'extraInstructions': 'Extra instructions',
};

const _expressionIcons = {
  'relationship': Icons.people_outline,
  'shortIntroduction': Icons.waving_hand_outlined,
  'description': Icons.description_outlined,
  'personality': Icons.psychology_outlined,
  'communicationStyle': Icons.forum_outlined,
  'interests': Icons.interests_outlined,
  'extraInstructions': Icons.edit_note_outlined,
};
