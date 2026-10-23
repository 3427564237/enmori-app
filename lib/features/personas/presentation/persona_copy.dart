import 'package:flutter/widgets.dart';

import '../../../core/presentation/enmori_localizations.dart';

/// Known application labels only; never pass a Persona's user-authored fields.
String personaLabel(BuildContext context, String label) => switch (label) {
  'neutral' => context.tr(label, '自然'),
  'warm' => context.tr(label, '温暖'),
  'encouraging' => context.tr(label, '鼓励'),
  'concise' => context.tr(label, '简短'),
  'balanced' => context.tr(label, '适中'),
  'detailed' => context.tr(label, '详细'),
  'plain' => context.tr(label, '普通文本'),
  'bulleted' => context.tr(label, '分点列出'),
  'Relationship' => context.tr(label, '关系'),
  'Short Introduction' => context.tr(label, '简短介绍'),
  'Description' => context.tr(label, '描述'),
  'Personality' => context.tr(label, '性格'),
  'Communication Style' => context.tr(label, '交流方式'),
  'Custom interests' => context.tr(label, '自定义兴趣'),
  'Extra instructions' => context.tr(label, '补充说明'),
  _ => label,
};

/// Exact client-owned status copies. Repository/model/user text is not translated.
String personaStatusCopy(
  BuildContext context,
  String message,
) => switch (message) {
  'Your change was saved.' => context.tr(message, '修改已保存。'),
  'Your change was saved, but the latest state could not be loaded. Reload to confirm it.' =>
    context.tr(message, '修改已保存，但未能加载最新状态。请重新加载以确认。'),
  'Your Personas changed. Reload them before trying again.' => context.tr(
    message,
    '人设已发生变化，请重新加载后再试。',
  ),
  'This Persona is unavailable.' => context.tr(message, '此人设已不可用。'),
  'The change could not be confirmed. Reload before trying again.' =>
    context.tr(message, '未能确认修改结果，请先重新加载，再决定是否重试。'),
  'Creation could not be confirmed. Recover this request or review your saved Personas before creating another.' =>
    context.tr(message, '未能确认创建结果。请先恢复此请求或核对已保存的人设，再创建新的人设。'),
  'Your Personas changed, so this request can no longer be recovered. Review your Personas before starting a new create.' =>
    context.tr(message, '人设已发生变化，无法继续恢复此请求。请先核对人设，再重新创建。'),
  'Use a name of 1–50 characters, valid style options and valid versions.' =>
    context.tr(message, '请使用 1–50 个字符的名称，并确认样式选项和版本有效。'),
  'You have 5 Personas. Delete one before creating another.' => context.tr(
    message,
    '你已有 5 个人设，请先删除一个再创建。',
  ),
  'This create request conflicts with an earlier operation. Reload before continuing.' =>
    context.tr(message, '此创建请求与之前的操作冲突，请重新加载后继续。'),
  'Personas could not be loaded. Try again.' => context.tr(
    message,
    '未能加载人设，请重试。',
  ),
  _ => message,
};
