# 真实 Firebase 邮件准备

2026-10-19 使用已有 CLI 授权读取现有 `enmori-rmvp-controlled`，未新建项目、应用或启用付费服务。已有 Android app 包名为 `com.enmori.app`；服务端确认 Email/Password 已开启。验证码不另建服务，沿用 Firebase 托管邮件链接。

本机私有目录 `~/.local/state/enmori-real-auth-oct19`（0700）已保存 `google-services.json`、`auth-config.json` 和 `firebase-dart-defines.json`（0600）。这些配置不进入 Git、聊天、公开证据或当前 coretest APK。

已有 `lib/app/bootstrap.dart` 支持上述 Dart defines；实际构建通过 `--dart-define-from-file=/absolute/private/firebase-dart-defines.json` 读取，不把值展开到命令行。默认正式包名与已注册 Firebase Android app 匹配。**当前 v6 的 coretest 使用独立 Emulator 项目，不能仅替换其 Firebase key/app ID 来声称已接入真实账号。** 真实身份 Backend 验签与资料初始化组合尚未验证，不将真实 token 发送给 Emulator 后端，也不混用两套账号或数据。

下一步需要用户指定可接收邮件的测试邮箱，再使用该邮箱完成注册、验证邮件、重发、点击链接刷新验证状态、忘记密码、邮件重设后返回登录。不要使用 CLI 登录邮箱作为默认收件人，不发送到未指定地址，不修改已有账号的密码。邮件投递成功、用户点击链接、App 状态刷新是三个独立结果。

控制台准备已完成；完整真实账号 APK/后端流程与邮件投递仍待完成。准备时未向任何真实邮箱发送邮件。

参考：[Firebase 配置](https://firebase.google.com/docs/projects/learn-more)、[Auth 配置读取](https://docs.cloud.google.com/identity-platform/docs/reference/rest/v2/projects/getConfig)。

后续：用户已指定收件邮箱并授权注册测试；正式 Auth 创建测试账号和 VERIFY_EMAIL 均 HTTP200，等待收件并点击。账号凭据在上述私有目录，不在 APK 或 Git。后续只核对原账号状态，不自动重发。最新结果见 docs/evidence/sprint3/2026-10-19-local-device-checkpoint/verification.md。
