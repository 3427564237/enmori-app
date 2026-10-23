import 'package:flutter/widgets.dart';

import '../../../core/result/result.dart';

import '../../../core/presentation/enmori_localizations.dart';

// Only application-owned feedback is mapped; never apply this to user content.
String weatherFeedback(BuildContext context, AppFailure failure) {
  final message = failure.message;
  return switch (message) {
    "Your settings changed. Please try again." => context.tr(
      message,
      "设置已发生变化，请重试。",
    ),
    "Current location is unavailable." => context.tr(message, "无法获取当前位置。"),
    "Current weather is unavailable." => context.tr(message, "无法获取当前天气。"),
    "Return to the app before using location." => context.tr(
      message,
      "请返回应用后再使用定位。",
    ),
    "Location services are off. You can continue without location." =>
      context.tr(message, "位置服务已关闭，你可以不附加位置继续。"),
    "Location was not kept after leaving the app." => context.tr(
      message,
      "离开应用后未保留位置。",
    ),
    "Location permission was not granted. You can continue without location." =>
      context.tr(message, "未获得定位权限，你可以不附加位置继续。"),
    "Enable precise location for a Check-in point, or continue without it." =>
      context.tr(message, "请开启精确定位以添加签到地点，也可以不附加位置继续。"),
    "Location permission changed. You can continue without location." =>
      context.tr(message, "定位权限已改变，你可以不附加位置继续。"),
    "Precise location permission changed. You can continue without location." =>
      context.tr(message, "精确定位权限已改变，你可以不附加位置继续。"),
    "Current location is unavailable. You can try again or continue without it." =>
      context.tr(message, "无法获取当前位置，你可以重试或不附加位置继续。"),
    "The service is not configured." => context.tr(message, "服务尚未配置。"),
    "The service returned an invalid response." => context.tr(
      message,
      "服务返回了无效响应，请稍后重试。",
    ),
    "The service is unavailable. Try again." => context.tr(
      message,
      "服务暂时不可用，请重试。",
    ),
    _ => localizedFailure(context, failure),
  };
}
