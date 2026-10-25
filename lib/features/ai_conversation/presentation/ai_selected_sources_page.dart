import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../../../core/presentation/local_time.dart';
import '../ai_conversation_providers.dart';
import '../ai_selected_sources_providers.dart';
import 'ai_selected_reply_review.dart';

/// Opening the picker is explicit. It never sends, selects a default record,
/// grants cloud use or reuses a saved message's source card as a request key.
final class AiSelectedSourcesPage extends ConsumerStatefulWidget {
  const AiSelectedSourcesPage({this.initialCheckInId, super.key});
  final String? initialCheckInId;
  @override
  ConsumerState<AiSelectedSourcesPage> createState() =>
      _AiSelectedSourcesPageState();
}

final class _AiSelectedSourcesPageState
    extends ConsumerState<AiSelectedSourcesPage> {
  late final Object _session;
  @override
  void initState() {
    super.initState();
    _session = ref.read(aiConversationControllerProvider).sessionKey;
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted ||
          ref.read(aiConversationControllerProvider).sessionKey != _session) {
        return;
      }
      final controller = ref.read(aiSelectedSourcesControllerProvider.notifier);
      if (widget.initialCheckInId case final String id) {
        await controller.chooseOwned(id);
        if (!mounted ||
            !ref
                .read(aiSelectedSourcesControllerProvider)
                .selectedIds
                .contains(id)) {
          return;
        }
      }
      if (mounted &&
          ref.read(aiConversationControllerProvider).sessionKey == _session) {
        await controller.loadRecent();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(aiSelectedSourcesControllerProvider);
    final ai = ref.watch(aiConversationControllerProvider);
    final controller = ref.read(aiSelectedSourcesControllerProvider.notifier);
    final available = state.sessionKey == _session && state.permitted;
    final canReview =
        available &&
        !state.busy &&
        !state.sending &&
        (ai.canSend || ai.canRetry);
    final review = state.review;
    final knownIds = state.records.map((record) => record.id).toSet();
    return PopScope<void>(
      onPopInvokedWithResult: (didPop, _) {
        final current = ref.read(aiSelectedSourcesControllerProvider);
        if (didPop && current.sessionKey == _session && !current.confirmed) {
          controller.editSelection();
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(context.tr('References for this reply', '本次参考')),
        ),
        body: SafeArea(
          child: Align(
            alignment: Alignment.topCenter,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 640),
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  if (!available)
                    Text(
                      context.tr(
                        'Return to chat and check your account and AI data-use permission.',
                        '请返回对话，核对账号与 AI 数据使用许可。',
                      ),
                    )
                  else ...[
                    Text(
                      context.tr('Choose your Check-ins', '手选自己的签到'),
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      context.tr(
                        'Up to 5 from the inclusive last 7 days, for this local reply only. Note quotations, recorded Mood/Activity and their original times are used. No location or weather is included.',
                        '近 7 天内（含边界）最多 5 条，仅用于这一次本地回复。仅使用正文引文、记录时的心情／活动与原始时间，不包含位置或天气。',
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      state.selectedIds.isEmpty
                          ? context.tr('No Check-ins selected.', '未选择签到。')
                          : context.tr(
                              '${state.selectedIds.length} of 5 selected',
                              '已选 ${state.selectedIds.length}／5 条',
                            ),
                      key: const Key('ai-selected-count'),
                    ),
                    if (state.notice != AiSelectionNotice.none)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        child: Text(
                          aiSelectionNoticeCopy(context, state.notice),
                          key: const Key('ai-selected-notice'),
                        ),
                      ),
                    if (state.busy) ...[
                      const LinearProgressIndicator(),
                      const SizedBox(height: 12),
                      Text(
                        context.tr('Checking current sources…', '正在核对当前来源…'),
                      ),
                    ],
                    if (review != null) ...[
                      for (final record in state.records.where(
                        (record) => state.selectedIds.contains(record.id),
                      ))
                        _record(
                          context,
                          record,
                          selected: true,
                          onChanged: null,
                        ),
                      AiSelectedReplyReview(
                        selection: review,
                        excludedHistoryKeys: state.excludedHistoryKeys,
                        confirmed: state.confirmed,
                        expired:
                            !controller.canSend &&
                            !ref
                                .read(aiConversationControllerProvider.notifier)
                                .hasSelectedPreparation(
                                  review.selectionRevision,
                                ),
                        busy: state.busy || state.sending,
                        onExcludeHistory: () {
                          if (!_currentRoute) return;
                          unawaited(
                            controller.review(
                              excludeDisplayedHistory: true,
                              expectedRevision: review.selectionRevision,
                            ),
                          );
                        },
                        onRefresh: () {
                          if (!_currentRoute) return;
                          unawaited(
                            controller.review(
                              expectedRevision: review.selectionRevision,
                            ),
                          );
                        },
                        onConfirm: () {
                          if (!canReview || !_currentRoute) return;
                          controller.confirm(review.selectionRevision);
                          if (ref
                                  .read(aiSelectedSourcesControllerProvider)
                                  .confirmed &&
                              ref
                                      .read(aiSelectedSourcesControllerProvider)
                                      .review
                                      ?.selectionRevision ==
                                  review.selectionRevision &&
                              Navigator.of(context).canPop()) {
                            Navigator.of(context).pop();
                          }
                        },
                        onCancel: controller.editSelection,
                      ),
                    ] else ...[
                      FilledButton(
                        key: const Key('ai-selected-review'),
                        onPressed: canReview
                            ? () => unawaited(controller.review())
                            : null,
                        child: Text(
                          context.tr('Review current selection', '审阅本次选择'),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        context.tr(
                          'Reviewing and returning to your draft do not send a message.',
                          '审阅与返回草稿都不会发送消息。',
                        ),
                      ),
                      if (!ai.canSend && !ai.canRetry)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          child: Text(
                            context.tr(
                              'Check the original operation in chat before preparing another reply.',
                              '请先在对话中核对原操作，再准备下一次回复。',
                            ),
                          ),
                        ),
                      if (state.failedDates.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          child: Text(
                            context.tr(
                              'Some recent records could not be loaded. This is a partial list.',
                              '部分近期记录尚未读到；当前列表不完整。',
                            ),
                            key: const Key('ai-selected-partial'),
                          ),
                        ),
                      OutlinedButton(
                        key: const Key('ai-selected-reload'),
                        onPressed: canReview
                            ? () => unawaited(
                                controller.loadRecent(refresh: true),
                              )
                            : null,
                        child: Text(
                          context.tr('Reload recent Check-ins', '重新读取近期签到'),
                        ),
                      ),
                      for (final id in state.selectedIds.where(
                        (id) => !knownIds.contains(id),
                      ))
                        Card(
                          child: ListTile(
                            title: Text(
                              context.tr(
                                'Selected source needs checking',
                                '所选来源需要重新核对',
                              ),
                            ),
                            trailing: IconButton(
                              key: Key('ai-selected-remove-$id'),
                              tooltip: context.tr(
                                'Remove from this reply',
                                '从本次回复中移除',
                              ),
                              onPressed: canReview
                                  ? () => controller.toggle(id)
                                  : null,
                              icon: const Icon(Icons.close),
                            ),
                          ),
                        ),
                      for (final record in state.records)
                        _record(
                          context,
                          record,
                          selected: state.selectedIds.contains(record.id),
                          onChanged:
                              canReview &&
                                  (state.selectedIds.contains(record.id) ||
                                      state.selectedIds.length < 5)
                              ? () => controller.toggle(record.id)
                              : null,
                        ),
                      if (state.loaded &&
                          state.records.isEmpty &&
                          state.failedDates.isEmpty)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          child: Text(
                            context.tr(
                              'No Check-ins in this 7-day window.',
                              '近 7 天内没有签到。',
                            ),
                          ),
                        ),
                      if (state.cursors.isNotEmpty)
                        OutlinedButton(
                          key: const Key('ai-selected-more'),
                          onPressed: canReview
                              ? () => unawaited(
                                  controller.loadMore(state.cursors.keys.first),
                                )
                              : null,
                          child: Text(
                            context.tr(
                              'Load more recent Check-ins',
                              '加载更多近期签到',
                            ),
                          ),
                        ),
                    ],
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  bool get _currentRoute =>
      mounted &&
      ModalRoute.of(context)?.isCurrent == true &&
      ref.read(aiConversationControllerProvider).sessionKey == _session;

  Widget _record(
    BuildContext context,
    AiSelectedCheckIn record, {
    required bool selected,
    required VoidCallback? onChanged,
  }) => Card(
    key: Key('ai-selected-record-${record.id}'),
    margin: const EdgeInsets.symmetric(vertical: 8),
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Checkbox(
                key: Key('ai-select-${record.id}'),
                value: selected,
                onChanged: onChanged == null ? null : (_) => onChanged(),
              ),
              Expanded(
                child: Text(
                  localTimeLabel(context, record.occurredAt),
                  style: Theme.of(context).textTheme.titleSmall,
                ),
              ),
            ],
          ),
          if (record.note.isNotEmpty) SelectableText(record.note),
          if (record.mood != null)
            Text(
              context.tr(
                'Recorded mood: ${record.mood}',
                '记录时的心情：${record.mood}',
              ),
            ),
          if (record.activity != null)
            Text(
              context.tr(
                'Recorded activity: ${record.activity}',
                '记录时的活动：${record.activity}',
              ),
            ),
        ],
      ),
    ),
  );
}

String aiSelectionNoticeCopy(BuildContext context, AiSelectionNotice notice) =>
    switch (notice) {
      AiSelectionNotice.none => '',
      AiSelectionNotice.limit => context.tr(
        '5 selected. Remove one before choosing another.',
        '已选 5 条，取消一条后可再选。',
      ),
      AiSelectionNotice.changed => context.tr(
        'The source changed. Review its current version. Your draft and choices are kept.',
        '来源已更新，请审阅当前版本。草稿与选择仍保留。',
      ),
      AiSelectionNotice.unavailable => context.tr(
        'A selected source is unavailable or outside the 7-day window. Recheck it or explicitly remove it.',
        '所选来源不可用或已超出 7 天范围，请重新核对或明确移除。',
      ),
      AiSelectionNotice.conflict => context.tr(
        'Review the references for this reply. Your draft and choices are kept. Check the original operation before preparing again.',
        '本次参考范围需要重新核对，草稿与选择已保留。请先核对原操作，再重新准备。',
      ),
      AiSelectionNotice.pastPairsChanged => context.tr(
        'The past exchanges changed. Review the current set again before excluding it.',
        '旧问答集合已变化，请重新审阅当前集合后再决定排除。',
      ),
      AiSelectionNotice.expired => context.tr(
        'This review expired. Your draft and choices are kept. Check the selection again.',
        '本次审阅已过期，草稿与选择仍保留，请重新核对。',
      ),
      AiSelectionNotice.unknown => context.tr(
        'The result or source check is not confirmed. Your draft and choices are kept.',
        '结果或来源核对尚未确认，草稿与选择仍保留。',
      ),
      AiSelectionNotice.recheck => context.tr(
        'Review this selection, then return to your draft to send.',
        '请审阅本次选择，再返回草稿明确发送。',
      ),
    };
