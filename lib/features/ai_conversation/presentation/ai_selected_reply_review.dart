import 'package:flutter/material.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../domain/ai_owned_sources.dart';
import '../domain/ai_selected_reply.dart';

/// Displays one prepared selection only. The caller owns expiry, fresh keys,
/// operation recovery and navigation; confirming this view never sends a reply.
final class AiSelectedReplyReview extends StatelessWidget {
  const AiSelectedReplyReview({
    required this.selection,
    required this.excludedHistoryKeys,
    required this.confirmed,
    required this.expired,
    required this.busy,
    required this.onExcludeHistory,
    required this.onRefresh,
    required this.onConfirm,
    required this.onCancel,
    super.key,
  });

  final AiPreparedReplySelection selection;
  final Set<String> excludedHistoryKeys;
  final bool confirmed, expired, busy;
  final VoidCallback onExcludeHistory, onRefresh, onConfirm, onCancel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    const buttonStyle = ButtonStyle(
      minimumSize: WidgetStatePropertyAll(Size(0, 48)),
    );
    final historyKeys = selection.historyPairs.map((p) => p.historyKey).toSet();
    final currentExclusions = excludedHistoryKeys.every(historyKeys.contains);
    final allHistoryExcluded =
        historyKeys.isNotEmpty &&
        historyKeys.every(excludedHistoryKeys.contains);
    final canConfirm = !busy && !expired && !confirmed && currentExclusions;
    final status = busy
        ? context.tr('Checking the selected sources…', '正在核对所选来源…')
        : expired || !currentExclusions
        ? context.tr(
            'This review is no longer current. Your draft and choices are kept. Check again before confirming.',
            '本次核对已失效。草稿和选择仍保留，请重新核对后再确认。',
          )
        : confirmed
        ? context.tr(
            'References reviewed for this reply. Return to your draft and explicitly send when ready.',
            '所选来源已核对，返回对话后发送。',
          )
        : context.tr(
            'Review this reply’s references. Confirming here returns to your draft without sending.',
            '请核对所选签到和历史回复里的来源，确认后返回对话。',
          );

    Widget heading(String text) => Padding(
      padding: const EdgeInsets.only(top: 24, bottom: 8),
      child: Semantics(
        header: true,
        child: Text(text, style: theme.textTheme.titleMedium),
      ),
    );

    Widget action(Widget child) => Padding(
      padding: const EdgeInsets.only(top: 8),
      child: SizedBox(width: double.infinity, child: child),
    );

    return SafeArea(
      top: false,
      child: SingleChildScrollView(
        key: const Key('ai-selected-review-scroll'),
        primary: false,
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 560),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Semantics(
                  header: true,
                  child: Text(
                    context.tr(
                      'Selected Check-ins and earlier references',
                      '所选签到与历史参考',
                    ),
                    style: theme.textTheme.headlineSmall,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  context.tr(
                    'For this reply only · Local processing',
                    '仅用于这次回复 · 本地处理',
                  ),
                ),
                const SizedBox(height: 12),
                Semantics(liveRegion: true, child: Text(status)),
                const SizedBox(height: 8),
                Text(
                  context.tr(
                    'Sources are checked again before sending. Recheck if this review expires.',
                    '发送前还会核对来源；当前核对失效时，请重新核对。',
                  ),
                ),
                if (busy) ...[
                  const SizedBox(height: 12),
                  const LinearProgressIndicator(),
                ],
                heading(
                  context.tr(
                    'Selected Check-ins (${selection.sourceCards.length}/5)',
                    '本次选中的签到（${selection.sourceCards.length}/5）',
                  ),
                ),
                if (selection.sourceCards.isEmpty)
                  Text(
                    context.tr(
                      'No Check-ins are selected for this reply.',
                      '这次回复未选择签到。',
                    ),
                  ),
                for (final source in selection.sourceCards)
                  Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            source.card.kind == AiSourceKind.checkIn
                                ? context.tr('Check-in', '签到')
                                : context.tr('Conversation message', '对话消息'),
                            style: theme.textTheme.titleSmall,
                          ),
                          const SizedBox(height: 8),
                          Text(context.tr('Recorded at', '记录时间')),
                          Text(_utcLabel(source.card.sourceOccurredAt)),
                          const SizedBox(height: 8),
                          Text(context.tr('Read at', '读取时间')),
                          Text(_utcLabel(source.card.observedAt)),
                        ],
                      ),
                    ),
                  ),
                Text(
                  context.tr(
                    'To add or remove a Check-in, return to your choices and review again.',
                    '如需添加或移除签到，请返回选择后重新核对。',
                  ),
                ),
                heading(
                  context.tr(
                    'Past exchanges for this reply (up to 2)',
                    '本次会参考的旧问答（最多 2 组）',
                  ),
                ),
                if (selection.historyPairs.isEmpty)
                  Text(
                    context.tr(
                      'There are no past exchanges in this review.',
                      '本次核对中没有旧问答。',
                    ),
                  ),
                for (final pair in selection.historyPairs)
                  Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            context.tr(
                              'Messages ${pair.userSequence} and ${pair.assistantSequence}',
                              '消息 ${pair.userSequence} 与 ${pair.assistantSequence}',
                            ),
                            style: theme.textTheme.titleSmall,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            excludedHistoryKeys.contains(pair.historyKey)
                                ? context.tr(
                                    'Excluded from this reply',
                                    '本次已排除',
                                  )
                                : context.tr('Included in this reply', '本次会参考'),
                          ),
                        ],
                      ),
                    ),
                  ),
                Text(
                  context.tr(
                    'This applies only to this reply. Your saved exchanges and draft are kept.',
                    '仅影响这次回复，保存的问答和当前草稿会保留。',
                  ),
                ),
                if (historyKeys.isNotEmpty)
                  action(
                    OutlinedButton(
                      style: buttonStyle,
                      key: const Key('ai-review-exclude-history'),
                      onPressed: busy || expired || allHistoryExcluded
                          ? null
                          : onExcludeHistory,
                      child: Text(
                        context.tr(
                          'Exclude these past exchanges and review again',
                          '本次不参考这些旧问答，并重新核对',
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
                const SizedBox(height: 16),
                action(
                  FilledButton(
                    style: buttonStyle,
                    key: const Key('ai-review-confirm'),
                    onPressed: canConfirm ? onConfirm : null,
                    child: Text(
                      context.tr(
                        'Confirm references and return to draft',
                        '确认参考范围并返回草稿',
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
                action(
                  OutlinedButton(
                    style: buttonStyle,
                    key: const Key('ai-review-refresh'),
                    onPressed: busy ? null : onRefresh,
                    child: Text(
                      context.tr('Check references again', '重新核对参考范围'),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
                action(
                  TextButton(
                    style: buttonStyle,
                    key: const Key('ai-review-cancel'),
                    onPressed: onCancel,
                    child: Text(
                      context.tr('Back to Check-in choices', '返回签到选择'),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// The wire already validates canonical UTC instants. Preserve their precision;
// do not infer a timezone, current mood, record ID or a source-version mapping.
String _utcLabel(String instant) =>
    '${instant.replaceFirst('T', ' ').replaceFirst(RegExp(r'Z$'), '')} UTC';
