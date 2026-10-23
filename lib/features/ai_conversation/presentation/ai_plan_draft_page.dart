import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_localizations.dart';
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
      context.tr('Help me make a small, realistic plan.', '请帮我制定一个简单、可行的小计划。'),
      context.tr(
        'What I want to work on:\n${_goal.text.trim()}',
        '我想做的事：\n${_goal.text.trim()}',
      ),
      if (_limits.text.trim().isNotEmpty)
        context.tr(
          'My limits or preferences:\n${_limits.text.trim()}',
          '我的限制或偏好：\n${_limits.text.trim()}',
        ),
      context.tr(
        'Suggest one manageable first step and a short plan. '
            'If an essential detail is missing, ask me. '
            'Do not assume I have completed any steps.',
        '请给我一个容易开始的第一步和简短计划。如果缺少关键信息，请先问我。不要假定我已经完成任何步骤。',
      ),
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
      appBar: AppBar(title: Text(context.tr('Make a small plan', '制定小计划'))),
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
                    Text(context.tr('Return to chat to continue', '返回对话后继续')),
                    const SizedBox(height: 12),
                    Text(
                      context.tr(
                        'Your account, data permission or conversation state changed. '
                            'This helper cannot add a message now.',
                        '你的账号、数据权限或对话状态已变化，暂时无法添加消息。',
                      ),
                    ),
                  ] else if (!_reviewing) ...[
                    Text(
                      context.tr('Start with what matters today', '从今天想做的事开始'),
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      context.tr(
                        'Use your own words. You will review the message before '
                            'adding it to chat. Nothing is sent from this helper.',
                        '用自己的话写下来。添加到对话前，你可以先检查消息。这里不会直接发送。',
                      ),
                    ),
                    const SizedBox(height: 24),
                    if (widget.initialText.isNotEmpty) ...[
                      Text(
                        context.tr(
                          'Your chat draft is included below. Going back keeps '
                              'the original draft unchanged.',
                          '下方已带入你的对话草稿。直接返回会保留原草稿。',
                        ),
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
                            decoration: InputDecoration(
                              labelText: context.tr(
                                'What would you like to work on?',
                                '你想做什么？',
                              ),
                              alignLabelWithHint: true,
                              errorMaxLines: 4,
                            ),
                            validator: (value) =>
                                value?.trim().isNotEmpty == true
                                ? null
                                : context.tr(
                                    'Describe one thing you would like help with.',
                                    '请写下一件希望获得帮助的事。',
                                  ),
                          ),
                          const SizedBox(height: 20),
                          TextFormField(
                            key: const Key('ai-plan-limits'),
                            controller: _limits,
                            minLines: 2,
                            maxLines: 4,
                            textInputAction: TextInputAction.newline,
                            decoration: InputDecoration(
                              labelText: context.tr(
                                'Limits or preferences (optional)',
                                '限制或偏好（选填）',
                              ),
                              hintText: context.tr(
                                'Time, energy, or something to avoid',
                                '例如可用时间、精力，或想避开的事',
                              ),
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
                      child: Text(context.tr('Review message', '检查消息')),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      context.tr(
                        'Only what you type here is added. This helper does not '
                            'read your journal, friends, activities or location.',
                        '这里只添加你输入的内容，不读取日记、好友、活动或位置。',
                      ),
                    ),
                  ] else ...[
                    Text(
                      context.tr('Make it sound like you', '改成你想说的话'),
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      context.tr(
                        'Edit any part below. It will be added to your current '
                            'conversation as an unsent draft. Tap Send in chat when ready.',
                        '下方内容都可以修改。它将作为未发送的草稿放入当前对话，准备好后再点击发送。',
                      ),
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
                        labelText: context.tr('Message to AI', '发给 AI 的消息'),
                        alignLabelWithHint: true,
                        helperText: context.tr(
                          '$length / 2400 characters',
                          '$length / 2400 字符',
                        ),
                        errorMaxLines: 4,
                        errorText: length > 2400
                            ? context.tr(
                                'Shorten this message to 2400 characters. Nothing has been cut.',
                                '请将消息缩短至 2400 字符以内。内容没有被截断。',
                              )
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
                            ? context.tr('Use this draft', '使用此草稿')
                            : context.tr('Replace chat draft', '替换对话草稿'),
                      ),
                    ),
                    TextButton(
                      key: const Key('ai-plan-edit-details'),
                      onPressed: () => _showReview(false),
                      child: Text(
                        context.tr('Edit goal and limits', '修改目标和限制'),
                      ),
                    ),
                    Text(
                      context.tr(
                        'The service also uses the current conversation context '
                            'and your current Persona. The reply will appear in chat.',
                        '服务还会使用当前对话的上下文和当前人设，回复将显示在对话中。',
                      ),
                    ),
                  ],
                  const SizedBox(height: 12),
                  TextButton(
                    key: const Key('ai-plan-cancel'),
                    onPressed: () => Navigator.of(context).pop(),
                    child: Text(context.tr('Back to chat', '返回对话')),
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
