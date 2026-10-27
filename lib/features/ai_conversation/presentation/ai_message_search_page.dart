import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../../../core/presentation/local_time.dart';
import '../ai_conversation_providers.dart';
import '../ai_owned_sources_providers.dart';

bool _hidden(AiConversationState state) =>
    state.canCancel ||
    state.canLeaveWithoutRetrying ||
    {
      AiConversationPhase.unauthenticated,
      AiConversationPhase.limited,
      AiConversationPhase.authorityChanged,
      AiConversationPhase.deleting,
      AiConversationPhase.deleteUnknown,
      AiConversationPhase.deleted,
      AiConversationPhase.preparing,
      AiConversationPhase.waiting,
      AiConversationPhase.unknown,
    }.contains(state.phase);

bool canFindAiMessages(AiConversationState state) =>
    !_hidden(state) &&
    state.canSelectConversation &&
    state.conversationId != null &&
    state.messages.isNotEmpty;

/// Searches only the existing, session-owned transcript. No search index,
/// copied message snapshot, model request or composer mutation is created.
final class AiMessageSearchPage extends ConsumerStatefulWidget {
  const AiMessageSearchPage({super.key});

  @override
  ConsumerState<AiMessageSearchPage> createState() =>
      _AiMessageSearchPageState();
}

final class _AiMessageSearchPageState
    extends ConsumerState<AiMessageSearchPage> {
  final _query = TextEditingController();
  final _scroll = ScrollController();
  late final Object _session;
  late final String? _conversation;
  bool _invalidated = false;
  bool _loadingEarlier = false;
  bool _loadFailed = false;
  String? _selectedId;

  @override
  void initState() {
    super.initState();
    final initial = ref.read(aiConversationControllerProvider);
    _session = initial.sessionKey;
    _conversation = initial.conversationId;
    _invalidated = !canFindAiMessages(initial);
    ref.listenManual(aiConversationControllerProvider, (_, next) {
      if (!_sameConversation(next) || _hidden(next)) {
        _invalidated = true;
        _selectedId = null;
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) _query.clear();
        });
      }
    });
  }

  bool _sameConversation(AiConversationState state) =>
      state.sessionKey == _session &&
      state.conversationId == _conversation &&
      _conversation != null;

  bool _available(AiConversationState state) =>
      !_invalidated && _sameConversation(state) && !_hidden(state);

  @override
  void dispose() {
    _query.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _loadEarlier() async {
    final before = ref.read(aiConversationControllerProvider);
    final cursor = before.nextCursor;
    if (!_available(before) ||
        !before.canSelectConversation ||
        before.readBusy ||
        _loadingEarlier ||
        cursor == null) {
      return;
    }
    setState(() {
      _loadingEarlier = true;
      _loadFailed = false;
    });
    await ref
        .read(aiConversationControllerProvider.notifier)
        .loadMessages(before: cursor);
    if (!mounted) return;
    final after = ref.read(aiConversationControllerProvider);
    setState(() {
      _loadingEarlier = false;
      // An accepted earlier page advances or exhausts the before cursor.
      // A failed read retains it; do not present that as an empty search page.
      _loadFailed = _available(after) && after.nextCursor == cursor;
    });
  }

  void _select(String? id) {
    final current = ref.read(aiConversationControllerProvider);
    if (!_available(current)) return;
    if (id != null) {
      final sources = ref.read(aiCompanionReferencesEnabledProvider)
          ? ref.read(aiOwnedSourcesControllerProvider)
          : null;
      if (!current.messages.any(
        (m) =>
            m.messageId == id &&
            canDisplayAiMessage(current, m, sources: sources),
      )) {
        return;
      }
    }
    FocusScope.of(context).unfocus();
    setState(() => _selectedId = id);
    if (_scroll.hasClients) _scroll.jumpTo(0);
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(aiConversationControllerProvider);
    final sources = ref.watch(aiCompanionReferencesEnabledProvider)
        ? ref.watch(aiOwnedSourcesControllerProvider)
        : null;
    bool displayable(AiMessage message) =>
        canDisplayAiMessage(state, message, sources: sources);
    final available = _available(state);
    final query = _query.text.trim().toLowerCase();
    final matches = available && query.isNotEmpty
        ? state.messages
              .where(
                (message) =>
                    displayable(message) &&
                    message.text!.toLowerCase().contains(query),
              )
              .toList()
        : const <AiMessage>[];
    final selectedIndex = _selectedId == null
        ? -1
        : state.messages.indexWhere(
            (m) => m.messageId == _selectedId && displayable(m),
          );
    final selectedSourceHidden =
        _selectedId != null &&
        state.messages.any(
          (m) =>
              m.messageId == _selectedId &&
              m.availability == AiAvailability.available &&
              !displayable(m),
        );
    return Scaffold(
      appBar: AppBar(title: Text(context.tr('Find in conversation', '查找对话消息'))),
      body: SafeArea(
        child: Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 640),
            child: ListView(
              controller: _scroll,
              padding: const EdgeInsets.all(20),
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              children: [
                if (!available) ...[
                  Text(
                    context.tr('Return to chat to continue', '返回对话后继续'),
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    context.tr(
                      'The account, permission, conversation or request state changed. This search has been cleared.',
                      '账号、权限、对话或请求状态已变化，本次查找已清除。',
                    ),
                  ),
                ] else if (_selectedId != null) ...[
                  TextButton.icon(
                    key: const Key('ai-search-results-back'),
                    onPressed: () => _select(null),
                    icon: const Icon(Icons.arrow_back),
                    label: Text(context.tr('Back to results', '返回查找结果')),
                  ),
                  Text(
                    context.tr('Message and nearby context', '消息与前后文'),
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    context.tr(
                      'From the messages currently loaded in this conversation.',
                      '来自此对话当前已加载的消息。',
                    ),
                  ),
                  if (selectedIndex < 0)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 20),
                      child: Text(
                        selectedSourceHidden
                            ? context.tr(
                                'Check this message’s sources in the conversation before displaying it.',
                                '请先在对话中核对这条消息的来源，再查看正文。',
                              )
                            : context.tr(
                                'This message is no longer available.',
                                '此消息已不可用。',
                              ),
                      ),
                    )
                  else ...[
                    FilledButton.icon(
                      key: const Key('ai-search-jump'),
                      onPressed: () {
                        final latest = ref.read(
                          aiConversationControllerProvider,
                        );
                        final sources =
                            ref.read(aiCompanionReferencesEnabledProvider)
                            ? ref.read(aiOwnedSourcesControllerProvider)
                            : null;
                        if (_available(latest) &&
                            latest.messages.any(
                              (m) =>
                                  m.messageId == _selectedId &&
                                  canDisplayAiMessage(
                                    latest,
                                    m,
                                    sources: sources,
                                  ),
                            )) {
                          Navigator.of(context).pop(_selectedId);
                        }
                      },
                      icon: const Icon(Icons.my_location),
                      label: Text(
                        context.tr('Jump to original message', '跳到原消息'),
                      ),
                    ),
                    for (
                      var i = selectedIndex > 0 ? selectedIndex - 1 : 0;
                      i < state.messages.length && i <= selectedIndex + 1;
                      i++
                    )
                      _contextMessage(
                        state.messages[i],
                        selected: i == selectedIndex,
                        displayable: displayable(state.messages[i]),
                      ),
                    Wrap(
                      spacing: 12,
                      runSpacing: 8,
                      children: [
                        if (selectedIndex > 0)
                          OutlinedButton(
                            key: const Key('ai-search-previous'),
                            onPressed:
                                displayable(state.messages[selectedIndex - 1])
                                ? () => _select(
                                    state.messages[selectedIndex - 1].messageId,
                                  )
                                : null,
                            child: Text(
                              context.tr('Previous message', '上一条消息'),
                            ),
                          ),
                        if (selectedIndex + 1 < state.messages.length)
                          OutlinedButton(
                            key: const Key('ai-search-next'),
                            onPressed:
                                displayable(state.messages[selectedIndex + 1])
                                ? () => _select(
                                    state.messages[selectedIndex + 1].messageId,
                                  )
                                : null,
                            child: Text(context.tr('Next message', '下一条消息')),
                          ),
                      ],
                    ),
                  ],
                ] else ...[
                  TextField(
                    key: const Key('ai-search-query'),
                    controller: _query,
                    textInputAction: TextInputAction.search,
                    onSubmitted: (_) => FocusScope.of(context).unfocus(),
                    onChanged: (_) => setState(() {}),
                    decoration: InputDecoration(
                      labelText: context.tr('Find text', '查找文字'),
                      prefixIcon: const Icon(Icons.search),
                      suffixIcon: _query.text.isEmpty
                          ? null
                          : IconButton(
                              key: const Key('ai-search-clear'),
                              tooltip: context.tr('Clear search', '清除查找文字'),
                              onPressed: () => setState(_query.clear),
                              icon: const Icon(Icons.close),
                            ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    context.tr(
                      'Searches loaded messages in this conversation only. Load earlier messages to look further back.',
                      '仅查找此对话已加载的消息。可加载更早消息，继续向前查找。',
                    ),
                  ),
                  if (state.messages.any(
                    (m) =>
                        m.availability == AiAvailability.available &&
                        !displayable(m),
                  ))
                    Text(
                      context.tr(
                        'Some message sources need checking in the conversation. Those messages are hidden from search.',
                        '部分消息来源需要在对话中重新核对，这些消息暂不显示在查找中。',
                      ),
                      key: const Key('ai-search-source-check-needed'),
                    ),
                  const SizedBox(height: 16),
                  if (query.isEmpty)
                    Text(
                      context.tr(
                        'Enter a word or phrase you remember.',
                        '输入你记得的词或一句话。',
                      ),
                    )
                  else ...[
                    Semantics(
                      liveRegion: true,
                      child: Text(
                        matches.isEmpty
                            ? context.tr(
                                'No matches in loaded messages. Try another phrase or load earlier messages.',
                                '已加载消息中没有匹配结果。可换个词或加载更早消息。',
                              )
                            : context.tr(
                                matches.length == 1
                                    ? '1 matching message'
                                    : '${matches.length} matching messages',
                                '${matches.length} 条匹配消息',
                              ),
                        key: const Key('ai-search-count'),
                      ),
                    ),
                    for (final message in matches)
                      ListTile(
                        key: ValueKey('ai-search-match-${message.messageId}'),
                        contentPadding: const EdgeInsets.symmetric(vertical: 8),
                        title: Text(
                          _excerpt(message.text!, query),
                          maxLines: 4,
                          overflow: TextOverflow.ellipsis,
                        ),
                        subtitle: Text(
                          '${_role(message)} · ${localTimeLabel(context, message.persistedAt)}',
                        ),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () => _select(message.messageId),
                      ),
                  ],
                ],
                if (available) ...[
                  const SizedBox(height: 16),
                  if (_loadFailed)
                    Text(
                      context.tr(
                        'Earlier messages could not be loaded. Your search is unchanged; try again when ready.',
                        '未能加载更早消息。查找文字已保留，可以稍后重试。',
                      ),
                      key: const Key('ai-search-load-error'),
                    ),
                  if (_loadingEarlier || state.readBusy)
                    const LinearProgressIndicator()
                  else if (state.nextCursor != null)
                    OutlinedButton.icon(
                      key: const Key('ai-search-load-earlier'),
                      onPressed: state.canSelectConversation
                          ? _loadEarlier
                          : null,
                      icon: const Icon(Icons.history),
                      label: Text(
                        context.tr('Load earlier messages', '加载更早消息'),
                      ),
                    )
                  else
                    Text(
                      context.tr(
                        'No earlier message page is available.',
                        '没有可继续加载的更早消息。',
                      ),
                    ),
                ],
                const SizedBox(height: 20),
                FilledButton(
                  key: const Key('ai-search-return'),
                  onPressed: () => Navigator.of(context).pop(),
                  child: Text(context.tr('Return to conversation', '返回对话')),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _role(AiMessage message) => message.role == AiRole.user
      ? context.tr('You', '你')
      : context.tr('AI', 'AI');

  Widget _contextMessage(
    AiMessage message, {
    required bool selected,
    required bool displayable,
  }) => Card(
    key: ValueKey('ai-search-context-${message.messageId}'),
    color: selected ? Theme.of(context).colorScheme.secondaryContainer : null,
    margin: const EdgeInsets.symmetric(vertical: 8),
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${_role(message)} · ${localTimeLabel(context, message.persistedAt)}',
            style: Theme.of(context).textTheme.labelMedium,
          ),
          if (selected) Text(context.tr('Selected message', '已选消息')),
          const SizedBox(height: 8),
          SelectableText(
            displayable
                ? message.text ?? ''
                : message.availability == AiAvailability.available
                ? context.tr(
                    'Message sources need checking in the conversation.',
                    '需要在对话中重新核对这条消息的来源。',
                  )
                : context.tr('Message unavailable', '消息不可用'),
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(height: 1.5),
          ),
        ],
      ),
    ),
  );

  String _excerpt(String text, String query) {
    final folded = text.toLowerCase();
    // Some Unicode case mappings change length; their folded offsets cannot
    // safely address the original text. Keep the original excerpt in that case.
    if (folded.length != text.length) return text;
    final match = folded.indexOf(query);
    var start = (match - 40).clamp(0, text.length).toInt();
    var end = (match + query.length + 100).clamp(0, text.length).toInt();
    // Avoid cutting a UTF-16 surrogate pair at either excerpt boundary.
    if (start > 0 &&
        start < text.length &&
        (text.codeUnitAt(start) & 0xfc00) == 0xdc00) {
      start--;
    }
    if (end < text.length && (text.codeUnitAt(end) & 0xfc00) == 0xdc00) end++;
    return '${start > 0 ? '…' : ''}${text.substring(start, end)}${end < text.length ? '…' : ''}';
  }
}
