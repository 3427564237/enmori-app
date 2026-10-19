请以 SHI 身份执行“Events 参与与返回闭环包”，复用已完成的真实来源/浏览/详情。

UI/UX 基线已前置落地：先读本包 ui-baseline.md，应用与 controlled demo 已共用 lib/app/enmori_theme.dart，深绿/暖白、本地 Playfair、表单图标、按钮/导航/抽屉/反馈样式均可直接继承。HCI 7848b5a 已包含在源码，无需再次 cherry-pick。不各自创建全局主题；你负责的功能页面随实现一起完成 UI/UX、空/加载/失败与恢复状态，不等最后统一补。

源码功能与 UI 基线为 `51ecb5c11ff23ce3bf36fbf9280d2e00646ac857`（全局深绿、本地 Playfair、HCI 继承及 v6 已验证核心流程均已在源码内；v7 已构建但未做真机验证）。使用同一压缩包内的 Git bundle，核对 manifest.json 中的 HEAD，并确认包含该基线。不要使用旧 9e45b1e 包或从旧 main 重做。每人独立分支/worktree，保留已有文件，不与别人共写 LI 的运行工作区。

先读 AGENTS.md、docs/tooling/skill-routing.md、ARCHITECTURE.md，以及 docs/decisions/2026-10-19-li-core-feature-delivery.md、2026-10-19-li-ai-mvp-simplification.md、2026-10-19-li-local-verification-entry.md 和 docs/evidence/sprint3/2026-10-19-local-device-checkpoint/。产品、身份/隐私/版本并发仍按已批准规则；旧记录缺字段安全显示为空，新增分享默认关闭，不清库。现有实现不是需求权威。

这是一次完整任务包：完成包内界面→保存→重新读取→错误恢复、必要后端/合同/严格 fixture、受影响定向检查、一个集中交付。不要只输出计划，不按按钮拆成等待 PM 多次启动的任务；每批检查通过后不重复无关全量套件。缺真实主机/凭据只标具体 Not Run，继续可完成代码，不用假服务冒充实测。共享主题和私有主机环境由 LI 维护；最终 router/bootstrap 组合由 LI 收口；模块可独立增加自己的 builder/Repository/路由注册并交最小接入补丁，不等待其他包完成才开始自己的实现。不得自动合并 main、公开发布、关闭总任务；保留不同作者审查，作者不自审。

交付：基线及提交 SHA、可独立取用分支/bundle、合同变更、用户流程结果、受影响检查、剩余阻塞、给 LI 的单页接入说明。无需得到本机凭据才交付。不要修改其他负责人的功能文件或私有运行目录。

1. Home 与 Events 共用卡片、分类列表和稳定 Event ID 的详情/参与者页，展示真实标签/时间/地点/简介/允许的推荐原因及可见人数。不重写 Ticketmaster 适配器或依赖全局当前活动变量。
2. 后端保存 Interested/Going 及取消、忽略；处理版本冲突、重复点击、账号切换，Home/列表/详情/个人参与区回读一致。拒绝数据同意仍可手动浏览与参与。
3. 现有外部打开及返回在手机通过，但尚无报名确认。补第三方提示→打开→返回询问是否完成报名→确认设 Going，不新增 Booked；取消/打开失败/中途后台/再次返回不重复提交。
4. 参与者 Friends/Others 分组、See all 分页、明确用户 ID 的资料回调；名单与人数遵守现有好友关系和 participation 隐私，不用总数泄漏隐藏成员。好友页面尚未组合时验证回调携带正确 ID，并标出待接处，不阻塞本包。
5. 推荐保留已批准 Music 映射，其他兴趣无匹配时真实空态。自己的前后端和 fixture 一起交付；给 LI 活动参与 section 与个人资料回调接线。不要接手社交关系或主机运行。此包按中等完整功能包估算，不把它称为简单 UI 修改。审查 SHI→ZHOU。
