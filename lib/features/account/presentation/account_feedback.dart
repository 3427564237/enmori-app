import 'package:flutter/widgets.dart';

import '../../../core/presentation/enmori_localizations.dart';

// Only application-owned feedback is mapped; never apply this to user content.
String accountFeedback(
  BuildContext context,
  String message,
) => switch (message) {
  "Profile could not be loaded. Try again." => context.tr(
    message,
    "资料加载失败，请重试。",
  ),
  "Settings could not be loaded. Try again." => context.tr(
    message,
    "设置加载失败，请重试。",
  ),
  "Use a display name of 1–50 characters or leave it unset, and choose a valid Profile visibility." =>
    context.tr(message, "显示名称须为 1–50 个字符或留空，并请选择有效的资料可见范围。"),
  "Choose valid privacy and data-use settings." => context.tr(
    message,
    "请选择有效的隐私与数据使用设置。",
  ),
  "These details changed elsewhere. Read the latest version before saving again." =>
    context.tr(message, "这些信息已在其他位置更改，请读取最新版本后再保存。"),
  "The save could not be confirmed. Check the latest version before trying again." =>
    context.tr(message, "无法确认是否保存成功，请先核对最新版本，再决定是否重试。"),
  "Turn on location services or enter your region manually." => context.tr(
    message,
    "请开启位置服务，或手动填写地区。",
  ),
  "Location permission was not granted. You can enter your region manually." =>
    context.tr(message, "未获得定位权限，可以手动填写地区。"),
  "Current location is unavailable. Try again or enter your region manually." =>
    context.tr(message, "无法获取当前位置，请重试或手动填写地区。"),
  "Location permission was not granted." => context.tr(message, "未获得定位权限。"),
  _ => message,
};
