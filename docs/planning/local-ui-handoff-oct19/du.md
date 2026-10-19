请以 DU 身份执行“已有账号与记录的可用性收尾包”，这是较小的既有功能完善，不重做全局 UI 风格。

UI/UX 基线已前置落地：先读本包 ui-baseline.md，应用与 controlled demo 已共用 lib/app/enmori_theme.dart，深绿/暖白、本地 Playfair、表单图标、按钮/导航/抽屉/反馈样式均可直接继承。HCI 7848b5a 已包含在源码，无需再次 cherry-pick。不各自创建全局主题；你负责的功能页面随实现一起完成 UI/UX、空/加载/失败与恢复状态，不等最后统一补。

源码功能与 UI 基线为 `51ecb5c11ff23ce3bf36fbf9280d2e00646ac857`（全局深绿、本地 Playfair、HCI 继承及 v6 已验证核心流程均已在源码内；v7 已构建但未做真机验证）。使用同一压缩包内的 Git bundle，核对 manifest.json 中的 HEAD，并确认包含该基线。不要使用旧 9e45b1e 包或从旧 main 重做。每人独立分支/worktree，保留已有文件，不与别人共写 LI 的运行工作区。

先读 AGENTS.md、docs/tooling/skill-routing.md、ARCHITECTURE.md，以及 docs/decisions/2026-10-19-li-core-feature-delivery.md、2026-10-19-li-ai-mvp-simplification.md、2026-10-19-li-local-verification-entry.md 和 docs/evidence/sprint3/2026-10-19-local-device-checkpoint/。产品、身份/隐私/版本并发仍按已批准规则；旧记录缺字段安全显示为空，新增分享默认关闭，不清库。现有实现不是需求权威。

这是一次完整任务包：完成包内界面→保存→重新读取→错误恢复、必要后端/合同/严格 fixture、受影响定向检查、一个集中交付。不要只输出计划，不按按钮拆成等待 PM 多次启动的任务；每批检查通过后不重复无关全量套件。缺真实主机/凭据只标具体 Not Run，继续可完成代码，不用假服务冒充实测。共享主题和私有主机环境由 LI 维护；最终 router/bootstrap 组合由 LI 收口；模块可独立增加自己的 builder/Repository/路由注册并交最小接入补丁，不等待其他包完成才开始自己的实现。不得自动合并 main、公开发布、关闭总任务；保留不同作者审查，作者不自审。

交付：基线及提交 SHA、可独立取用分支/bundle、合同变更、用户流程结果、受影响检查、剩余阻塞、给 LI 的单页接入说明。无需得到本机凭据才交付。不要修改其他负责人的功能文件或私有运行目录。

1. 复用已完成账号/资料/隐私/兴趣引导。集中检查并修复表单错误恢复、密码显隐、未保存离开、键盘遮挡、返回与重复提交等明确问题。真实邮件已验证/重置，真实身份与 App 组合由 LI 完成，不要求拿到用户密码或 Firebase 配置。
2. 复用签到 Note或Mood、编辑/删除/权限、revision 冲突保留草稿与重新读取、月份数量、翻月/日期分页/按准确 ID 跳 Footprint 高亮。只修复可复现的断链或反馈问题，不重建日期/分页机制，不增加地图天气或新状态平台。
3. 聚焦已有账号和记录页面的小屏、大字、键盘、按钮可达与加载/失败/空态区别。全局深绿、Playfair Display、共用按钮/抽屉/视觉 token 归 LI，本包只继承，不互相覆盖。不要改 AI/Persona 或 Events 功能文件。
4. 输出少量有用户价值的前后对比、定向回归及实际通过/Not Run 清单；没有缺陷的已验收路径不用为了凑工作再次改写或大量加测试。一次完整交付，审查 DU→LI。
