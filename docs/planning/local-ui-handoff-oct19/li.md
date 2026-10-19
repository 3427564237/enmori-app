请在 LI 的本机对话执行“两包本机与 UI/UX 工作”，本 prompt 完整推进可做部分，不要求 PM 为每个小步骤再次开工。

源码基线为 `436b56632fe2f0f741132aab19893f50e6281f7e`（本机功能源码 ad4dfeb，后续为真实邮件证据）。使用本次新源码包，核对 manifest 中的 HEAD，并确认包含该基线；不要使用旧 9e45b1e 包或从旧 main 重做。每人独立分支/worktree，保留已有文件，不与别人共写 LI 的运行工作区。

先读 AGENTS.md、docs/tooling/skill-routing.md、ARCHITECTURE.md，以及 docs/decisions/2026-10-19-li-core-feature-delivery.md、2026-10-19-li-ai-mvp-simplification.md、2026-10-19-li-local-verification-entry.md 和 docs/evidence/sprint3/2026-10-19-local-device-checkpoint/。产品、身份/隐私/版本并发仍按已批准规则；旧记录缺字段安全显示为空，新增分享默认关闭，不清库。现有实现不是需求权威。

这是一次完整任务包：完成包内界面→保存→重新读取→错误恢复、必要后端/合同/严格 fixture、受影响定向检查、一个集中交付。不要只输出计划，不按按钮拆成等待 PM 多次启动的任务；每批检查通过后不重复无关全量套件。缺真实主机/凭据只标具体 Not Run，继续可完成代码，不用假服务冒充实测。全局主题及最终主机/router/bootstrap 组合由 LI 收口；模块可独立增加自己的 builder/Repository/路由注册并交最小接入补丁，不等待 LI 的 UI 主题。不得自动合并 main、公开发布、关闭总任务；保留不同作者审查，作者不自审。

交付：基线及提交 SHA、可独立取用分支/bundle、合同变更、用户流程结果、受影响检查、剩余阻塞、给 LI 的单页接入说明。无需得到本机凭据才交付。不要修改其他负责人的功能文件或私有运行目录。

A. 主机、真实账号与最终接线。当前工作区固定 /home/miku/.codex/worktrees/li-core-priority-oct19/ENMORI。先检查 tool/core_local.py status 和设备。复用原私有保留目录、TLS/nonce、Ticketmaster、Ollama；不重装、不清数据、不自动重发未知操作。真实 Firebase 邮件验证与重置已通过，旧密码失效，当前 coretest 仍为 Emulator 身份。沿用已有 Firebase 身份验证合同，准备真实账号登录→资料初始化→重登/邮件返回的最小组合，严格检查真实 token 的项目/身份，不能把 Emulator 接受规则用于真实身份，也不顺带部署云数据库。若某种环境组合没有批准依据，先明确最小方案和受影响范围，继续独立 UI 工作。登录入口准备好后由用户本人输入新密码；不读取/索取/保存新密码。旧 auth_mail_probe 私有密码已失效，不能重试它。接收各包后做最小根路由/Repository/运行组合，集中构建同一个 APK，单次覆盖必要真实流程，保留正常导出/恢复。旧 AI 维护异常需按原记录诊断，不能清 flag 或删记录制造通过。

B. 全局 UI/UX 收尾。沿用已批准 Enmori 深绿、Playfair Display，先看现有 lib/app/social_demo_presentation.dart 与主题，再补合法本地字体及许可、统一文字层级/间距/输入图标/按钮/抽屉/反馈。以现有 Home、Profile/Settings、Check-in、Events、AI 的正常/空/加载/失败截图为依据，用一个代表性页面确定统一组件，再应用到全部全局表面，不逐页重开设计会。用户可直接在手机标出拥挤、文字大小、按钮或返回不清楚；由本机对话改代码。只触及主题和共用表面，功能页分别由负责人维护，必要变更以小补丁交对应负责人。UI 参考不能改产品/隐私规则。小屏/键盘/较大文字做一次集中验收，真实照片/字体来源合规，不引入新设计平台。

用户本人只需在准备好的节点输入新密码、批准系统安装/定位、看代表性页面并集中反馈；不再让用户手动运行 sudo 或反复搬运配置。精确位置/天气用途在相应功能就绪后另行明确授权，本轮粗定位授权不能当后续持续许可。LI 不兜底其余四包的全部功能，独立审查 LI→DU；检查点结果不等于全项目 Done。
