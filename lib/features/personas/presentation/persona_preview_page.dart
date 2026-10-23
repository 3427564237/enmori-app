import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../domain/persona.dart';
import '../persona_preview_providers.dart';

final class PersonaPreviewPage extends ConsumerStatefulWidget {
  const PersonaPreviewPage({required this.fields, super.key});

  final PersonaFields fields;

  @override
  ConsumerState<PersonaPreviewPage> createState() => _PersonaPreviewPageState();
}

final class _PersonaPreviewPageState extends ConsumerState<PersonaPreviewPage> {
  final _form = GlobalKey<FormState>();
  final _text = TextEditingController();
  final _inputFocus = FocusNode();
  late final Object _initialSession;
  bool _cleared = false;

  @override
  void initState() {
    super.initState();
    _initialSession = ref.read(personaPreviewControllerProvider).sessionKey;
    ref.listenManual(personaPreviewControllerProvider, (_, next) {
      if (next.sessionKey != _initialSession) {
        _cleared = true;
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) _text.clear();
        });
      }
    });
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
      appBar: AppBar(title: const Text('Try Your Persona')),
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
                    'Draft preview',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'This preview does not save or activate your Persona and '
                    'does not enter conversation history. Each message is an independent try.',
                  ),
                  const SizedBox(height: 16),
                  if (!available) ...[
                    Text(
                      _cleared ? 'Preview cleared' : 'AI Limited',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _cleared
                          ? 'Your account or data consent changed. Return to the editor to start a new preview.'
                          : 'Preview needs a signed-in account, accepted optional data use and an available AI service.',
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
                        focusNode: _inputFocus,
                        enabled: !state.isBusy,
                        autovalidateMode: AutovalidateMode.onUserInteraction,
                        minLines: 2,
                        maxLines: 6,
                        decoration: const InputDecoration(
                          labelText: 'Try a message',
                          prefixIcon: Icon(Icons.chat_bubble_outline),
                          helperText: 'Use 1–2400 characters.',
                          helperMaxLines: 3,
                          errorMaxLines: 5,
                        ),
                        validator: (value) =>
                            value == null ||
                                value.trim().isEmpty ||
                                value.runes.length > 2400 ||
                                !isPersonaExpressionText(value)
                            ? 'Enter a message of 1–2400 characters.'
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
                      label: Text(state.isBusy ? 'Trying…' : 'Try draft'),
                    ),
                    if (state.isBusy) ...[
                      const SizedBox(height: 16),
                      const LinearProgressIndicator(
                        semanticsLabel: 'Generating draft preview',
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
                        AppFailureKind.aiBusy => 'AI is busy. Wait a moment, then try the draft again.',
                        AppFailureKind.requestInvalid ||
                        AppFailureKind.requestTooLarge => 'The draft is too large for this request. Shorten it in the editor and try again.',
                        _ => 'Preview could not be loaded. Your draft is still in the editor. Try again when the service is available.',
                      }, key: const Key('persona-preview-error')),
                    ),
                  ],
                  const SizedBox(height: 24),
                  const Text(
                    'AI Safety · AI can make mistakes. Your Persona changes expression and does not expand data permissions.',
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
