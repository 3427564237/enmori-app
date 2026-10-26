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
        final mode = ref.read(aiSelectedSourcesControllerProvider).mode;
        if (mode == AiReferenceMode.today) {
          await controller.previewToday();
          return;
        }
        if (mode == AiReferenceMode.off) return;
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
    final canChoose =
        available &&
        !state.busy &&
        !state.sending &&
        ai.canEditDraft &&
        !ai.canCancel;
    final canReview =
        available &&
        !state.busy &&
        !state.sending &&
        (ai.canSend || ai.canRetry);
    final review = state.review;
    final knownIds = state.records.map((record) => record.id).toSet();
    if (available && state.mode != AiReferenceMode.manual) {
      return _automatic(context, state, controller, canReview);
    }
    return PopScope<void>(
      onPopInvokedWithResult: (didPop, _) {
        final current = ref.read(aiSelectedSourcesControllerProvider);
        if (didPop && current.sessionKey == _session && !current.confirmed) {
          controller.editSelection();
        }
      },
      child: Scaffold(
        appBar: AppBar(title: Text(context.tr('Check-in references', '签到参考'))),
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
                    if (state.automaticAvailable) ...[
                      _modeControls(context, state, controller, canChoose),
                      const SizedBox(height: 20),
                    ],
                    Text(
                      context.tr(
                        'Choose Check-ins from different days',
                        '选择不同日期的签到',
                      ),
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      context.tr(
                        'Choose up to 5 from the last 7 days for your next reply. Only the note, recorded Mood/Activity and time are included, without location or weather.',
                        '近 7 天内最多选 5 条，用于下一次回复。只参考正文、记录时的心情／活动和时间，不包含位置或天气。',
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
                    if (!state.reviewRequired)
                      FilledButton(
                        key: const Key('ai-references-done'),
                        onPressed: canChoose ? _finish : null,
                        child: Text(context.tr('Done', '完成')),
                      ),
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
                      OutlinedButton(
                        key: const Key('ai-selected-review'),
                        onPressed: canReview
                            ? () => unawaited(controller.review())
                            : null,
                        child: Text(
                          context.tr('Check selected references', '核对所选签到'),
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

  void _finish() {
    if (_currentRoute && Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    }
  }

  Widget _modeControls(
    BuildContext context,
    AiSelectedSourcesState state,
    AiSelectedSourcesController controller,
    bool canReview,
  ) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      SwitchListTile(
        key: const Key('ai-today-enabled'),
        contentPadding: EdgeInsets.zero,
        value: state.mode == AiReferenceMode.today,
        onChanged: canReview
            ? (enabled) {
                if (!_currentRoute) return;
                controller.setTodayEnabled(enabled);
                if (enabled) unawaited(controller.previewToday());
              }
            : null,
        title: Text(context.tr("Use today's Check-ins", '使用今天的签到')),
        subtitle: Text(
          context.tr(
            'Automatically checks the latest 5 when you send.',
            '发送时自动核对今天最近 5 条。',
          ),
        ),
      ),
      if (state.mode != AiReferenceMode.manual)
        OutlinedButton.icon(
          key: const Key('ai-reference-manual'),
          onPressed: canReview
              ? () {
                  if (!_currentRoute) return;
                  controller.useManualSelection();
                  unawaited(controller.loadRecent());
                }
              : null,
          icon: const Icon(Icons.checklist_outlined),
          label: Text(
            context.tr('Choose Check-ins from other days', '手动选择其他日期的签到'),
          ),
        ),
    ],
  );

  Widget _automatic(
    BuildContext context,
    AiSelectedSourcesState state,
    AiSelectedSourcesController controller,
    bool canReview,
  ) {
    final enabled = state.mode == AiReferenceMode.today;
    final ai = ref.read(aiConversationControllerProvider);
    final canChoose =
        state.permitted &&
        !state.busy &&
        !state.sending &&
        ai.canEditDraft &&
        !ai.canCancel;
    final current = state.review;
    return PopScope<void>(
      onPopInvokedWithResult: (didPop, _) {
        if (didPop &&
            ref.read(aiSelectedSourcesControllerProvider).sessionKey ==
                _session) {
          controller.editSelection();
        }
      },
      child: Scaffold(
        appBar: AppBar(title: Text(context.tr('Check-in references', '签到参考'))),
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              _modeControls(context, state, controller, canChoose),
              if (!enabled)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  child: Text(
                    context.tr(
                      'Check-in references are off for this topic. You can still chat.',
                      '本话题不新增参考签到，仍可正常聊天。',
                    ),
                  ),
                ),
              if (state.busy) const LinearProgressIndicator(),
              if (enabled) ...[
                const SizedBox(height: 12),
                if (state.today case final today?) ...[
                  Text(
                    context.tr(
                      'Last checked: ${today.date} · ${today.timeZone}',
                      '上次核对：${today.date} · ${today.timeZone}',
                    ),
                  ),
                  if (today.hasMore)
                    Text(
                      context.tr(
                        'Only the latest 5 are used. There are earlier records in this day.',
                        '仅参考最近 5 条，当天还有更早的记录。',
                      ),
                      key: const Key('ai-today-has-more'),
                    ),
                  if (state.automaticIds.isEmpty)
                    Text(
                      context.tr(
                        'No Check-ins were found for this day. You can still chat.',
                        '当天没有签到，仍可正常聊天。',
                      ),
                      key: const Key('ai-today-empty'),
                    ),
                ] else
                  Text(
                    context.tr(
                      'Today’s records are checked when you send. You can preview them here.',
                      '发送时会自动核对当天记录，也可在这里预览。',
                    ),
                  ),
                if ({
                  AiSelectionNotice.unknown,
                  AiSelectionNotice.unavailable,
                }.contains(state.notice))
                  Text(
                    context.tr(
                      "Could not load today's Check-ins. Retry or turn them off for this topic.",
                      '签到暂未加载，可重试或关闭本话题签到参考。',
                    ),
                    key: const Key('ai-today-unknown'),
                  ),
                if (state.excludedCheckInIds.isNotEmpty)
                  Text(
                    context.tr(
                      '${state.excludedCheckInIds.length} excluded in this topic',
                      '本话题已排除 ${state.excludedCheckInIds.length} 条签到',
                    ),
                  ),
                OutlinedButton(
                  key: const Key('ai-today-preview'),
                  onPressed: canReview
                      ? () => unawaited(controller.previewToday())
                      : null,
                  child: Text(
                    context.tr("Preview today's Check-ins", '预览当天签到'),
                  ),
                ),
                for (final id in state.automaticIds)
                  Builder(
                    builder: (context) {
                      final matches = state.records.where(
                        (record) => record.id == id,
                      );
                      final record = matches.isEmpty ? null : matches.first;
                      final toggle = state.busy || state.sending
                          ? null
                          : () => controller.toggleTodaySource(id);
                      if (record != null) {
                        return _record(
                          context,
                          record,
                          selected: !state.excludedCheckInIds.contains(id),
                          onChanged: toggle,
                        );
                      }
                      return CheckboxListTile(
                        key: Key('ai-today-source-$id'),
                        value: !state.excludedCheckInIds.contains(id),
                        onChanged: toggle == null ? null : (_) => toggle(),
                        title: Text(
                          context.tr(
                            'Check-in preview is not loaded',
                            '签到正文尚未加载',
                          ),
                        ),
                        subtitle: Text(
                          context.tr(
                            'Uncheck to exclude this record from this topic.',
                            '取消勾选后，本话题不会参考这条记录。',
                          ),
                        ),
                      );
                    },
                  ),
              ],
              if (state.reviewRequired)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  child: Text(
                    aiSelectionNoticeCopy(
                      context,
                      state.notice == AiSelectionNotice.pastPairsChanged
                          ? state.notice
                          : AiSelectionNotice.conflict,
                    ),
                  ),
                ),
              if (state.reviewRequired && current == null)
                OutlinedButton(
                  key: const Key('ai-reference-recheck'),
                  onPressed: canReview
                      ? () => unawaited(controller.review())
                      : null,
                  child: Text(
                    context.tr('Review the current references', '核对当前参考'),
                  ),
                ),
              if (!enabled)
                OutlinedButton(
                  onPressed: canReview
                      ? () => unawaited(controller.review())
                      : null,
                  child: Text(
                    context.tr('Preview reply references', '预览本次回复参考'),
                  ),
                ),
              if (current != null &&
                  (state.reviewRequired || current.historyPairs.isNotEmpty))
                _ReferenceReviewDisclosure(
                  required: state.reviewRequired,
                  child: AiSelectedReplyReview(
                    selection: current,
                    excludedHistoryKeys: state.excludedHistoryKeys,
                    confirmed: state.confirmed,
                    expired: !ref
                        .read(aiConversationControllerProvider.notifier)
                        .hasSelectedPreparation(current.selectionRevision),
                    busy: !canReview,
                    onExcludeHistory: () {
                      if (_currentRoute) {
                        unawaited(
                          controller.review(
                            excludeDisplayedHistory: true,
                            expectedRevision: current.selectionRevision,
                          ),
                        );
                      }
                    },
                    onRefresh: () {
                      if (_currentRoute) {
                        unawaited(
                          controller.review(
                            expectedRevision: current.selectionRevision,
                          ),
                        );
                      }
                    },
                    onConfirm: () {
                      if (!_currentRoute) return;
                      controller.confirm(current.selectionRevision);
                      final latest = ref.read(
                        aiSelectedSourcesControllerProvider,
                      );
                      if (latest.confirmed &&
                          latest.review?.selectionRevision ==
                              current.selectionRevision &&
                          Navigator.of(context).canPop()) {
                        Navigator.of(context).pop();
                      }
                    },
                    onCancel: controller.editSelection,
                  ),
                ),
              const SizedBox(height: 12),
              if (!state.reviewRequired)
                FilledButton(
                  key: const Key('ai-references-done'),
                  onPressed: canChoose ? _finish : null,
                  child: Text(context.tr('Done', '完成')),
                ),
              Text(
                context.tr(
                  'Previewing or changing references does not send a message.',
                  '预览或更改参考不会发送消息。',
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

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

final class _ReferenceReviewDisclosure extends StatelessWidget {
  const _ReferenceReviewDisclosure({
    required this.required,
    required this.child,
  });
  final bool required;
  final Widget child;
  @override
  Widget build(BuildContext context) => required
      ? child
      : ExpansionTile(
          key: const Key('ai-reference-history-details'),
          title: Text(context.tr('References in earlier replies', '历史回复里的参考')),
          children: [child],
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
