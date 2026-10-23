import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../ai_conversation_providers.dart';

/// Local composition only. The ordinary chat composer owns explicit dispatch.
final class AiPlanDraftPage extends ConsumerStatefulWidget {
  const AiPlanDraftPage({required this.initialText, super.key});

  final String initialText;

  @override
  ConsumerState<AiPlanDraftPage> createState() => _AiPlanDraftPageState();
}

final class _AiPlanDraftPageState extends ConsumerState<AiPlanDraftPage> {
  final _form = GlobalKey<FormState>();
  late final _goal = TextEditingController(text: widget.initialText);
  final _limits = TextEditingController();
  final _review = TextEditingController();
  final _scroll = ScrollController();
  late final Object _sessionKey;
  bool _reviewing = false;
  bool _cleared = false;

  @override
  void initState() {
    super.initState();
    _sessionKey = ref.read(aiConversationControllerProvider).sessionKey;
    ref.listenManual(aiConversationControllerProvider, (_, next) {
      if (next.sessionKey != _sessionKey || _restricted(next)) {
        _cleared = true;
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!mounted) return;
          _goal.clear();
          _limits.clear();
          _review.clear();
        });
      }
    });
  }

  bool _restricted(AiConversationState state) => {
    AiConversationPhase.limited,
    AiConversationPhase.unauthenticated,
    AiConversationPhase.authorityChanged,
  }.contains(state.phase);

  @override
  void dispose() {
    _goal.dispose();
    _limits.dispose();
    _review.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _prepareReview() {
    if (!(_form.currentState?.validate() ?? false)) return;
    _review.text = [
      'Help me make a small, realistic plan.',
      'What I want to work on:\n${_goal.text.trim()}',
      if (_limits.text.trim().isNotEmpty)
        'My limits or preferences:\n${_limits.text.trim()}',
      'Suggest one manageable first step and a short plan. '
          'If an essential detail is missing, ask me. '
          'Do not assume I have completed any steps.',
    ].join('\n\n');
    FocusScope.of(context).unfocus();
    _showReview(true);
  }

  void _showReview(bool reviewing) {
    if (_scroll.hasClients) _scroll.jumpTo(0);
    setState(() => _reviewing = reviewing);
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(aiConversationControllerProvider);
    final available =
        !_cleared &&
        state.sessionKey == _sessionKey &&
        !_restricted(state) &&
        state.canSend;
    final length = _review.text.runes.length;
    return Scaffold(
      appBar: AppBar(title: const Text('Make a small plan')),
      body: SafeArea(
        child: Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 640),
            child: SingleChildScrollView(
              key: const Key('ai-plan-page'),
              controller: _scroll,
              padding: const EdgeInsets.all(20),
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (!available) ...[
                    const Text('Return to chat to continue'),
                    const SizedBox(height: 12),
                    const Text(
                      'Your account, data permission or conversation state changed. '
                      'This helper cannot add a message now.',
                    ),
                  ] else if (!_reviewing) ...[
                    Text(
                      'Start with what matters today',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Use your own words. You will review the message before '
                      'adding it to chat. Nothing is sent from this helper.',
                    ),
                    const SizedBox(height: 24),
                    if (widget.initialText.isNotEmpty) ...[
                      const Text(
                        'Your chat draft is included below. Going back keeps '
                        'the original draft unchanged.',
                      ),
                      const SizedBox(height: 16),
                    ],
                    Form(
                      key: _form,
                      child: Column(
                        children: [
                          TextFormField(
                            key: const Key('ai-plan-goal'),
                            controller: _goal,
                            minLines: 3,
                            maxLines: 6,
                            textInputAction: TextInputAction.newline,
                            decoration: const InputDecoration(
                              labelText: 'What would you like to work on?',
                              alignLabelWithHint: true,
                              errorMaxLines: 4,
                            ),
                            validator: (value) =>
                                value?.trim().isNotEmpty == true ? null : 'Describe one thing you would like help with.',
                          ),
                          const SizedBox(height: 20),
                          TextFormField(
                            key: const Key('ai-plan-limits'),
                            controller: _limits,
                            minLines: 2,
                            maxLines: 4,
                            textInputAction: TextInputAction.newline,
                            decoration: const InputDecoration(
                              labelText: 'Limits or preferences (optional)',
                              hintText: 'Time, energy, or something to avoid',
                              alignLabelWithHint: true,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                    FilledButton(
                      key: const Key('ai-plan-review'),
                      onPressed: _prepareReview,
                      child: const Text('Review message'),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Only what you type here is added. This helper does not '
                      'read your journal, friends, activities or location.',
                    ),
                  ] else ...[
                    Text(
                      'Make it sound like you',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Edit any part below. It will be added to your current '
                      'conversation as an unsent draft. Tap Send in chat when ready.',
                    ),
                    const SizedBox(height: 20),
                    TextField(
                      key: const Key('ai-plan-message'),
                      controller: _review,
                      minLines: 6,
                      maxLines: 12,
                      textInputAction: TextInputAction.newline,
                      onChanged: (_) => setState(() {}),
                      decoration: InputDecoration(
                        labelText: 'Message to AI',
                        alignLabelWithHint: true,
                        helperText: '$length / 2400 characters',
                        errorMaxLines: 4,
                        errorText: length > 2400
                            ? 'Shorten this message to 2400 characters. Nothing has been cut.'
                            : null,
                      ),
                    ),
                    const SizedBox(height: 20),
                    FilledButton(
                      key: const Key('ai-plan-apply'),
                      onPressed:
                          length <= 2400 && _review.text.trim().isNotEmpty
                          ? () => Navigator.of(context).pop(_review.text)
                          : null,
                      child: Text(
                        widget.initialText.isEmpty
                            ? 'Use this draft'
                            : 'Replace chat draft',
                      ),
                    ),
                    TextButton(
                      key: const Key('ai-plan-edit-details'),
                      onPressed: () => _showReview(false),
                      child: const Text('Edit goal and limits'),
                    ),
                    const Text(
                      'The service also uses the current conversation context '
                      'and your current Persona. The reply will appear in chat.',
                    ),
                  ],
                  const SizedBox(height: 12),
                  TextButton(
                    key: const Key('ai-plan-cancel'),
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text('Back to chat'),
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
