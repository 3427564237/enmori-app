import 'package:flutter/widgets.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../../../core/result/result.dart';

/// Only known application errors are mapped. Never pass user record content here.
String checkInFailureText(BuildContext context, AppFailure failure) {
  if (!context.usesChinese) return failure.message;
  return switch (failure.message) {
    'Return to the app before using location.' => '请返回应用后再使用位置。',
    'Location services are off. You can continue without location.' =>
      '系统定位服务已关闭，你仍可不附加位置继续保存。',
    'Location was not kept after leaving the app.' => '离开应用后，本次位置未被保留。',
    'Location permission was not granted. You can continue without location.' =>
      '未获得定位权限，你仍可不附加位置继续保存。',
    'Enable precise location for a Check-in point, or continue without it.' =>
      '签到位置需要精确定位权限，也可不附加位置继续保存。',
    'Location permission changed. You can continue without location.' ||
    'Precise location permission changed. You can continue without location.' =>
      '定位权限已变化，你仍可不附加位置继续保存。',
    'Current location is unavailable.' ||
    'Current location is unavailable. You can try again or continue without it.' =>
      '当前位置暂不可用，可以重试或不附加位置继续保存。',
    'Confirm location and weather permission for this Check-in.' =>
      '请确认本次签到的位置和天气权限。',
    'Choose a visibility in Edit before changing this legacy record.' =>
      '请先在编辑中选择可见范围，再修改这条旧记录。',
    'The previous save was not confirmed. Keep its original details for retry, or check your records before starting another Check-in.' =>
      '上次保存尚未确认。请保留原始内容并核对原请求，或先查看历史记录，再新建签到。',
    'This operation could not be confirmed. Read your saved record before making another change.' ||
    'Save could not be confirmed. Read the record before trying again.' =>
      '暂时无法确认操作结果，请重新读取记录后再修改。',
    _ when failure.kind == AppFailureKind.checkInInvalid =>
      '请填写笔记或心情，笔记最多 500 个字符。',
    _ => localizedFailure(context, failure),
  };
}
