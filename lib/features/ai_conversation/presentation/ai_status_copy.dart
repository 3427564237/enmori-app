import 'package:flutter/widgets.dart';

import '../../../core/presentation/enmori_localizations.dart';

/// Exact application status messages only, never message content or AI output.
String aiStatusCopy(BuildContext context, String message) => switch (message) {
  'Enter the same saved message to retry.' => context.tr(
    message,
    '请输入原来已保存的同一条消息以重试。',
  ),
  'Enter 1–2400 characters of valid text.' => context.tr(
    message,
    '请输入 1–2400 个字符的有效文字。',
  ),
  'Cancellation requested. The result has not been confirmed.' => context.tr(
    message,
    '已请求取消，但尚未确认结果。',
  ),
  'This conversation is no longer available. Choose another conversation or send a new message.' =>
    context.tr(message, '此对话已不可用。请选择其他对话或发送新消息。'),
  'New conversation.' => context.tr('New topic.', '新话题。'),
  'New conversation. Previous messages remain saved.' => context.tr(
    'New topic. Previous messages remain saved.',
    '已开始新话题。之前的消息仍然保留。',
  ),
  'Could not load conversation history. Try again.' => context.tr(
    message,
    '未能加载历史对话，请重试。',
  ),
  _ => message,
};
