import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../../../core/result/result.dart';
import '../domain/persona.dart';
import '../persona_preview_providers.dart';

final class PersonaPreviewPage extends ConsumerStatefulWidget {
  const PersonaPreviewPage({
    required this.fields,
    this.initialText = '',
    this.onTextChanged,
    super.key,
  });

  final PersonaFields fields;
  final String initialText;
  final ValueChanged<String>? onTextChanged;

  @override
  ConsumerState<PersonaPreviewPage> createState() => _PersonaPreviewPageState();
}

final class _PersonaPreviewPageState extends ConsumerState<PersonaPreviewPage> {
  final _form = GlobalKey<FormState>();
  late final _text = TextEditingController(text: widget.initialText);
  final _inputFocus = FocusNode();
  late final Object _initialSession;
  bool _cleared = false;

  @override
  void initState() {
    super.initState();
    _initialSession = ref.read(personaPreviewControllerProvider).sessionKey;
    ref.listenManual(personaPreviewControllerProvider, (_, next) {
      if (next.sessionKey != _initialSession || !next.canPreview) {
        _cleared = true;
        widget.onTextChanged?.call('');
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) _text.clear();
        });
      }
    });
  }

  void _backToEditor() {
    Navigator.of(context).pop();
  }

  @override
  void dispose() {
    _text.dispose();
    _inputFocus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(personaPreviewControllerProvider);
    final available =
        state.canPreview && !_cleared && state.sessionKey == _initialSession;
    return Scaffold(
      appBar: AppBar(
        title: Text(context.tr('Try Your Persona', '试聊人设')),
        leading: BackButton(onPressed: _backToEditor),
      ),
      body: SafeArea(
        child: Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 640),
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    context.tr('Draft preview', '草稿试聊'),
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    context.tr(
                      'This preview does not save or activate your Persona and '
                          'does not enter conversation history. Each message is an independent try.',
                      '试聊不会保存或启用人设，也不会写入正式对话历史。每条消息都是一次独立试聊。',
                    ),
                  ),
                  const SizedBox(height: 16),
                  if (!available) ...[
                    Text(
                      _cleared
                          ? context.tr('Preview cleared', '试聊已清除')
                          : context.tr('AI Limited', 'AI 功能受限'),
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _cleared
                          ? context.tr(
                              'Your account or data consent changed. Return to the editor to start a new preview.',
                              '账号或数据同意已变化。请返回编辑页重新开始试聊。',
                            )
                          : context.tr(
                              'Preview needs a signed-in account, accepted optional data use and an available AI service.',
                              '试聊需要登录、允许可选数据处理，并且 AI 服务可用。',
                            ),
                    ),
                  ] else ...[
                    Text(
                      widget.fields.displayName,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 16),
                    Form(
                      key: _form,
                      child: TextFormField(
                        key: const Key('persona-preview-input'),
                        controller: _text,
                        onChanged: (text) {
                          final current = ref.read(
                            personaPreviewControllerProvider,
                          );
                          if (!_cleared &&
                              current.canPreview &&
                              current.sessionKey == _initialSession) {
                            widget.onTextChanged?.call(text);
                          }
                        },
                        focusNode: _inputFocus,
                        enabled: !state.isBusy,
                        autovalidateMode: AutovalidateMode.onUserInteraction,
                        minLines: 2,
                        maxLines: 6,
                        decoration: InputDecoration(
                          labelText: context.tr('Try a message', '试着说一句'),
                          prefixIcon: Icon(Icons.chat_bubble_outline),
                          helperText: context.tr(
                            'Use 1–2400 characters.',
                            '请输入 1–2400 个字符。',
                          ),
                          helperMaxLines: 3,
                          errorMaxLines: 5,
                        ),
                        validator: (value) =>
                            value == null ||
                                value.trim().isEmpty ||
                                value.runes.length > 2400 ||
                                !isPersonaExpressionText(value)
                            ? context.tr(
                                'Enter a message of 1–2400 characters.',
                                '请输入 1–2400 个字符的消息。',
                              )
                            : null,
                      ),
                    ),
                    const SizedBox(height: 16),
                    FilledButton.icon(
                      key: const Key('persona-preview-send'),
                      onPressed: state.isBusy
                          ? null
                          : () {
                              if (_form.currentState?.validate() ?? false) {
                                ref
                                    .read(
                                      personaPreviewControllerProvider.notifier,
                                    )
                                    .preview(widget.fields, _text.text);
                              } else {
                                _inputFocus.requestFocus();
                              }
                            },
                      icon: const Icon(Icons.send_outlined),
                      label: Text(
                        state.isBusy
                            ? context.tr('Trying…', '正在试聊…')
                            : context.tr('Try draft', '试聊当前草稿'),
                      ),
                    ),
                    if (state.isBusy) ...[
                      const SizedBox(height: 16),
                      LinearProgressIndicator(
                        semanticsLabel: context.tr(
                          'Generating draft preview',
                          '正在生成草稿试聊回复',
                        ),
                      ),
                    ],
                  ],
                  if (available && state.reply != null) ...[
                    const SizedBox(height: 24),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Semantics(
                          liveRegion: true,
                          child: SelectableText(
                            state.reply!,
                            key: const Key('persona-preview-reply'),
                          ),
                        ),
                      ),
                    ),
                  ],
                  if (available && state.failure != null) ...[
                    const SizedBox(height: 16),
                    Semantics(
                      liveRegion: true,
                      child: Text(switch (state.failure!.kind) {
                        AppFailureKind.aiBusy => context.tr(
                          'AI is busy. Wait a moment, then try the draft again.',
                          'AI 正忙，请稍等片刻再试聊。',
                        ),
                        AppFailureKind.requestInvalid ||
                        AppFailureKind.requestTooLarge => context.tr(
                          'The draft is too large for this request. Shorten it in the editor and try again.',
                          '草稿超出本次请求容量。请返回编辑页缩短内容后重试。',
                        ),
                        _ => context.tr(
                          'Preview could not be loaded. Your draft is still in the editor. Try again when the service is available.',
                          '未能获取试聊回复。草稿仍保留在编辑页，服务可用后可再试。',
                        ),
                      }, key: const Key('persona-preview-error')),
                    ),
                  ],
                  const SizedBox(height: 24),
                  OutlinedButton.icon(
                    key: const Key('persona-preview-edit'),
                    onPressed: _backToEditor,
                    icon: const Icon(Icons.edit_outlined),
                    label: Text(context.tr('Back to editing', '返回编辑')),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    context.tr(
                      'AI Safety · AI can make mistakes. Your Persona changes expression and does not expand data permissions.',
                      'AI 使用说明 · AI 可能出错。人设只改变表达方式，不扩大数据权限。',
                    ),
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
