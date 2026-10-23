import 'package:flutter/widgets.dart';

import '../result/result.dart';

/// Shared presentation lookup. Call only for application-owned interface copy;
/// user content, provider records and model replies retain their original text.
extension EnmoriTranslations on BuildContext {
  bool get usesChinese =>
      Localizations.maybeLocaleOf(this)?.languageCode == 'zh';

  String tr(String english, String chinese) => usesChinese ? chinese : english;
}

/// Translate typed application failures, never arbitrary record/message text.
String localizedFailure(BuildContext context, AppFailure failure) {
  if (!context.usesChinese) return failure.message;
  return switch (failure.kind) {
    AppFailureKind.authRequired => '请重新登录后继续。',
    AppFailureKind.authForbidden => '当前账号无法访问此内容。',
    AppFailureKind.authenticationInvalid => '登录信息无效，请检查后重试。',
    AppFailureKind.accountAlreadyExists => '此邮箱已注册，请登录或重置密码。',
    AppFailureKind.usernameInvalid => '用户名格式无效，请检查后重试。',
    AppFailureKind.usernameUnavailable => '此用户名不可用，请选择其他用户名。',
    AppFailureKind.onboardingRequired => '请先完成账号设置。',
    AppFailureKind.onboardingConflict => '账号设置已发生变化，请重新读取后继续。',
    AppFailureKind.profileInvalid => '资料内容无效，请检查后重试。',
    AppFailureKind.profileRevisionPreconditionFailed =>
      '资料已在其他位置修改，请读取最新资料后复核。',
    AppFailureKind.settingsInvalid => '设置内容无效，请检查后重试。',
    AppFailureKind.settingsRevisionPreconditionFailed => '设置已发生变化，请读取最新设置后复核。',
    AppFailureKind.interestSelectionInvalid => '兴趣选择无效，请检查后重试。',
    AppFailureKind.interestRevisionPreconditionFailed => '兴趣已发生变化，请读取最新选择后复核。',
    AppFailureKind.catalogueInvalid => '兴趣目录内容无效，请检查后重试。',
    AppFailureKind.catalogueNameConflict => '此兴趣名称已存在。',
    AppFailureKind.checkInInvalid => '签到内容无效，请检查后重试。',
    AppFailureKind.checkInUnavailable => '此签到暂时不可用，或你已无权查看。',
    AppFailureKind.checkInRevisionPreconditionFailed => '签到已发生变化，请读取最新记录后复核。',
    AppFailureKind.addFriendTargetUnavailable => '目前无法向此用户发送好友请求。',
    AppFailureKind.friendRequestUnavailable => '此好友请求已不可用，请刷新后查看。',
    AppFailureKind.friendRevisionPreconditionFailed => '好友关系已发生变化，请刷新后继续。',
    AppFailureKind.friendIgnorePreconditionFailed => '推荐状态已发生变化，请刷新后继续。',
    AppFailureKind.eventUnavailable => '活动信息暂时不可用，请返回活动列表刷新。',
    AppFailureKind.eventParticipationInvalid => '参与选择无效，请检查后重试。',
    AppFailureKind.eventParticipationRevisionPreconditionFailed =>
      '参与状态已发生变化，请读取最新状态后复核。',
    AppFailureKind.requestInvalid => '请求内容无效，请检查后重试。',
    AppFailureKind.requestTooLarge => '内容过长，请缩短后重试。',
    AppFailureKind.idempotencyKeyInvalid => '无法确认这次操作，请重新读取当前状态。',
    AppFailureKind.idempotencyConflict => '这次操作与已有请求冲突，请先核对结果。',
    AppFailureKind.personaInvalid => '人设内容无效，请检查后重试。',
    AppFailureKind.personaUnavailable => '此人设暂时不可用，请刷新后查看。',
    AppFailureKind.personaLimitReached => '已达到人设数量上限，请先管理现有人设。',
    AppFailureKind.personaCommandConflict ||
    AppFailureKind.personaRevisionPreconditionFailed => '人设已发生变化，请读取最新内容后复核。',
    AppFailureKind.aiContextNotPermitted ||
    AppFailureKind.aiAuthorityChanged => '当前授权不允许继续这次 AI 请求，请核对同意设置。',
    AppFailureKind.conversationUnavailable => '此对话暂时不可用，请重新读取对话。',
    AppFailureKind.aiOperationUnavailable => '这次 AI 操作暂时不可用，请先核对结果。',
    AppFailureKind.aiOperationConflict => '已有 AI 操作正在处理，请先核对结果。',
    AppFailureKind.aiInputInvalid => '消息内容无效，请检查后重试。',
    AppFailureKind.aiBusy => 'AI 正忙，请稍后再试。',
    AppFailureKind.aiUnavailable => 'AI 服务暂时不可用。',
    AppFailureKind.aiReplyRejected => '这次回复未通过检查，未显示该回复。',
    AppFailureKind.aiOutcomeUnresolved => '这次请求的结果尚未确认，请先核对结果，不要重复发送。',
    AppFailureKind.configurationUnavailable => '服务尚未配置完成，暂时无法使用。',
    AppFailureKind.serviceUnavailable => '服务暂时不可用，请检查连接后重试。',
    AppFailureKind.unexpected => '暂时无法完成操作，请先核对当前状态。',
  };
}
