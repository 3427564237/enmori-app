## 21 October continuation checkpoint (operational baseline update)

Continue in `/home/miku/.codex/worktrees/li-zhou-integration-oct20/ENMORI`, branch
`souma/li-zhou-runtime-20261020`, Draft PR #165. Current product source is
`5529f7b4d5cf91489aa0b1b4ff118ec53a7fd522`: reviewed SHI #167 is merged and
connected to the isolated core candidate; v14 is installed; selected native Events/Home flows passed (see native follow-up).
This supersedes only the older package/workspace/startup-status instructions below;
retain their product scope and historical evidence. The real-account v8 checkout
is separate and was not changed by this checkpoint.

Read [the Events verification record](../../evidence/sprint3/2026-10-21-li-events-integration/verification.md)
before continuing. The retained environment has **confirmed normal export** after both service and
native checks and is being restarted for the connected phone. Check status before
starting; use `python3 tool/core_local.py start --events --ai` only when stopped;
use existing private handoff, not a new credential flow. Prior SIGTERM/export
failure and possible loss after the earlier snapshot remain recorded. Device subsequently connected; see the native verification record for passed
Events/Home flows and the remaining nonempty profile/privacy/error scenarios.

JIN #166 `124a1f86` still needs SHI's latest-head rereview. Full public profile and
Home friend activity are not integrated. Activity producer needs a real
Interested/Going transition timestamp and currently authorized title; `updatedAt`
also changes for ignore/unignore and must not be treated as participation time.
No speculative mapping/title/history may be substituted. Retain P05 scope and
independent review, no main merge or overall Done.

---

请在 LI 的本机对话执行“HCI/UIUX 基线优先与本机接线工作”，本 prompt 完整推进可做部分，不要求 PM 为每个小步骤再次开工。

源码功能与 UI 基线为 `51ecb5c11ff23ce3bf36fbf9280d2e00646ac857`（全局深绿、本地 Playfair、HCI 继承及 v6 已验证核心流程均已在源码内；v7 已构建但未做真机验证）。使用同一压缩包内的 Git bundle，核对 manifest.json 中的 HEAD，并确认包含该基线。不要使用旧 9e45b1e 包或从旧 main 重做。每人独立分支/worktree，保留已有文件，不与别人共写 LI 的运行工作区。

先读 AGENTS.md、docs/tooling/skill-routing.md、ARCHITECTURE.md，以及 docs/decisions/2026-10-19-li-core-feature-delivery.md、2026-10-19-li-ai-mvp-simplification.md、2026-10-19-li-local-verification-entry.md 和 docs/evidence/sprint3/2026-10-19-local-device-checkpoint/。产品、身份/隐私/版本并发仍按已批准规则；旧记录缺字段安全显示为空，新增分享默认关闭，不清库。现有实现不是需求权威。

这是一次完整任务包：完成包内界面→保存→重新读取→错误恢复、必要后端/合同/严格 fixture、受影响定向检查、一个集中交付。不要只输出计划，不按按钮拆成等待 PM 多次启动的任务；每批检查通过后不重复无关全量套件。缺真实主机/凭据只标具体 Not Run，继续可完成代码，不用假服务冒充实测。共享主题和私有主机环境由 LI 维护；最终 router/bootstrap 组合由 LI 收口；模块可独立增加自己的 builder/Repository/路由注册并交最小接入补丁，不等待其他包完成才开始自己的实现。不得自动合并 main、公开发布、关闭总任务；保留不同作者审查，作者不自审。

交付：基线及提交 SHA、可独立取用分支/bundle、合同变更、用户流程结果、受影响检查、剩余阻塞、给 LI 的单页接入说明。无需得到本机凭据才交付。不要修改其他负责人的功能文件或私有运行目录。

A. 全局 UI/UX 第一版已完成，见 ui-baseline.md。后续维护共用主题并承接用户集中反馈；不重复导入 HCI 或建立新设计平台。首页/登录实际 Flutter widget 预览可供先看，v7 尚未真机安装；各成员继续实现自己的功能页面和必要交互，LI 只收口共享表面与最后组合。

B. 主机、真实账号与最终接线。当前工作区固定 /home/miku/.codex/worktrees/li-core-priority-oct19/ENMORI。先检查 tool/core_local.py status 和设备。最近一次正常停止导出于 2026-10-19T14:48:51.345Z 成功，随后已重新启动；此前一次全进程终止导致导出失败的日志和旧快照已备份，不得抹去失败记录。复用原私有保留目录、TLS/nonce、Ticketmaster、Ollama；不重装、不清数据、不自动重发未知操作。真实 Firebase 邮件验证与重置已通过，旧密码失效，当前 coretest 仍为 Emulator 身份。新增只读 Admin/Firestore 预检通过，真实测试账号 emailVerified=true、规范 auth binding 尚不存在。现有 controlled-runtime.ts 是真实 Auth+Firestore（禁用 Emulator），retained-core-runtime.ts 是完整本地 Emulator 模式；不得混接或把预检当已登录业务 App。已有 ADC 可用，不要重建 Firebase 或索取新密码。沿用已有 Firebase 身份验证合同，准备真实账号登录→资料初始化→重登/邮件返回的最小组合，严格检查真实 token 的项目/身份，不能把 Emulator 接受规则用于真实身份，也不顺带部署云数据库。若某种环境组合没有批准依据，先明确最小方案和受影响范围，继续独立 UI 工作。登录入口准备好后由用户本人输入新密码；不读取/索取/保存新密码。旧 auth_mail_probe 私有密码已失效，不能重试它。接收各包后做最小根路由/Repository/运行组合，集中构建同一个 APK，单次覆盖必要真实流程，保留正常导出/恢复。旧 AI 维护异常需按原记录诊断，不能清 flag 或删记录制造通过。

用户本人只需在准备好的节点输入新密码、批准系统安装/定位、看代表性页面并集中反馈；不再让用户手动运行 sudo 或反复搬运配置。精确位置/天气用途在相应功能就绪后另行明确授权，本轮粗定位授权不能当后续持续许可。LI 不兜底其余四包的全部功能，独立审查 LI→DU；检查点结果不等于全项目 Done。
