import 'package:flutter/material.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../../../core/result/result.dart';
import '../domain/proactive.dart';

String proactiveFailureCopy(BuildContext context, AppFailure failure) =>
    switch (failure.kind) {
      AppFailureKind.authRequired || AppFailureKind.authForbidden => context.tr(
        'Sign in again to continue.',
        '请重新登录后继续。',
      ),
      AppFailureKind.aiSourceUnavailable ||
      AppFailureKind.aiAuthorityChanged => context.tr(
        'This source is unavailable. Your chat draft is kept.',
        '这条来源已不可用，聊天草稿仍保留。',
      ),
      AppFailureKind.proactiveRevisionPreconditionFailed => context.tr(
        'Contact settings changed. Review them again.',
        '联系设置已变化，请重新核对。',
      ),
      AppFailureKind.proactiveInputInvalid ||
      AppFailureKind.requestInvalid => context.tr(
        'Review the date, time, time zone and follow-up limits.',
        '请核对日期、时间、时区与跟进限制。',
      ),
      AppFailureKind.aiContextNotPermitted => context.tr(
        'Check AI data-use permission before continuing.',
        '请先核对 AI 数据使用许可。',
      ),
      _ => context.tr(
        'The result could not be verified. Keep your choices and check again.',
        '暂时无法核对结果。选择已保留，请再次核对。',
      ),
    };

String followUpIntentCopy(
  BuildContext context,
  FollowUpIntent intent,
) => switch (intent.state) {
  FollowUpIntentState.queued => context.tr('Scheduled once', '已预约一次'),
  FollowUpIntentState.reserved || FollowUpIntentState.prepared => context.tr(
    'Preparing this follow-up',
    '正在准备这次跟进',
  ),
  FollowUpIntentState.published => context.tr(
    'Saved in the original topic',
    '已保存到原话题',
  ),
  FollowUpIntentState.cancelled => context.tr('Cancelled', '已取消'),
  FollowUpIntentState.failed => context.tr(
    'This follow-up could not be completed',
    '未能完成这次跟进',
  ),
  FollowUpIntentState.expired => context.tr(
    'Expired. It will not be sent later.',
    '已过期，不会补发。',
  ),
  FollowUpIntentState.dispatching || FollowUpIntentState.unknown => context.tr(
    'Notification submission is not confirmed. Recall cannot be guaranteed.',
    '通知提交结果尚未确认，无法保证撤回。',
  ),
  FollowUpIntentState.accepted => context.tr(
    'Accepted by the notification service. Delivery and reading are not confirmed.',
    '通知服务已接受；尚未确认送达或阅读。',
  ),
};

final class ProactiveFailureNotice extends StatelessWidget {
  const ProactiveFailureNotice({required this.failure, super.key});
  final AppFailure failure;
  @override
  Widget build(BuildContext context) => Semantics(
    liveRegion: true,
    child: Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Text(proactiveFailureCopy(context, failure)),
    ),
  );
}
