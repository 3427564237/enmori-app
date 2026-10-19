# 真实 Firebase 邮件准备

2026-10-19 使用已有 CLI 授权读取现有 `enmori-rmvp-controlled`，未新建项目、应用或启用付费服务。已有 Android app 包名为 `com.enmori.app`；服务端确认 Email/Password 已开启。验证码不另建服务，沿用 Firebase 托管邮件链接。

本机私有目录 `~/.local/state/enmori-real-auth-oct19`（0700）已保存 `google-services.json`、`auth-config.json` 和 `firebase-dart-defines.json`（0600）。这些配置不进入 Git、聊天、公开证据或当前 coretest APK。

已有 `lib/app/bootstrap.dart` 支持上述 Dart defines；实际构建通过 `--dart-define-from-file=/absolute/private/firebase-dart-defines.json` 读取，不把值展开到命令行。默认正式包名与已注册 Firebase Android app 匹配。**当前 v6 的 coretest 使用独立 Emulator 项目，不能仅替换其 Firebase key/app ID 来声称已接入真实账号。** 真实身份 Backend 验签与资料初始化组合尚未验证，不将真实 token 发送给 Emulator 后端，也不混用两套账号或数据。

下一步需要用户指定可接收邮件的测试邮箱，再使用该邮箱完成注册、验证邮件、重发、点击链接刷新验证状态、忘记密码、邮件重设后返回登录。不要使用 CLI 登录邮箱作为默认收件人，不发送到未指定地址，不修改已有账号的密码。邮件投递成功、用户点击链接、App 状态刷新是三个独立结果。

控制台准备已完成；完整真实账号 APK/后端流程与邮件投递仍待完成。准备时未向任何真实邮箱发送邮件。

参考：[Firebase 配置](https://firebase.google.com/docs/projects/learn-more)、[Auth 配置读取](https://docs.cloud.google.com/identity-platform/docs/reference/rest/v2/projects/getConfig)。

后续：用户已指定收件邮箱并授权注册测试；正式 Auth 创建测试账号和 VERIFY_EMAIL 均 HTTP200，等待收件并点击。账号凭据在上述私有目录，不在 APK 或 Git。后续只核对原账号状态，不自动重发。最新结果见 docs/evidence/sprint3/2026-10-19-local-device-checkpoint/verification.md。

最新核对：用户手机截图及正式 Auth lookup 均确认邮箱已验证（emailVerified=true）；PASSWORD_RESET 请求 HTTP200，等待用户完成重设。此阶段仍不是同一 coretest APK 的真实账号完整闭环。

密码重置后续：用户已完成重设，一次旧密码登录返回 INVALID_LOGIN_CREDENTIALS，旧凭据失效已确认。不要继续使用私有 test-identity.json 中的原密码；不索取新密码。新密码登录及真实账号与 App/Backend 的完整组合尚待验证。

## 本轮真实 Backend 预检

2026-10-19T14:50:34Z，以原有 ADC、精确项目 enmori-rmvp-controlled 只读运行 Firebase Admin getUserByEmail，并按 createAuthBindingDocumentId 读取规范 auth_bindings 文档：Auth/Firestore 读取均成功、邮箱已验证、业务绑定不存在。第一次通用连接探测的裸 UID 路径不是合同路径，不用于业务状态结论；以上规范路径读回已更正该判断。未写云端资料、未再次发信、未使用已失效旧密码。

现有 controlled-runtime.ts 是真实 Auth+Firestore 组合，明确拒绝 Emulator 环境变量；完整 retained-core-runtime.ts 仍要求 Emulator。新密码原生登录、真实 UID 的引导及资料业务回读、整套 AI/好友/Events 的真实环境组合仍未完成。私有配置/ADC 已可用，接手时复用，不重建项目或要求把密码发到聊天中。

## 20 Oct 接线完成至安装前

真实账号模式、本机 TLS 服务及私有配置已经准备，APK v8 使用 com.enmori.app。账号模式明确拒绝 Emulator；已完成无手机的配置/身份拒绝/证书检查与正常停止启动。后续以 tool/real_account_local.md 和 docs/evidence/sprint3/2026-10-20-real-account-wiring/ 为准。仍未做真实新密码登录与资料保存，旧“尚未准备入口”的状态由此条替代，既往邮件及失败证据保留。
