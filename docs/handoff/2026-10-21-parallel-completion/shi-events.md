# 完整增量任务（一次 prompt 执行至可审查交付）

从 GitHub `3427564237/enmori-app` 的 `souma/li-zhou-runtime-20261020` 当前检查点 `256763eb91c1f461127caf1cb738233759093264` 创建自己的功能分支/独立工作树；不要从旧 main 重新实现，也不要重放已进入整合分支的旧包。先核对实际 HEAD、未提交改动和后续整合提交，保留自己的未交付工作。新 Draft PR 的 base 为上述整合分支，不合并 main。

先读 AGENTS.md、docs/tooling/skill-routing.md、ARCHITECTURE.md、docs/decisions/2026-10-19-li-core-feature-delivery.md、2026-10-21-li-remote-group-access.md、2026-10-21-li-history-footprint-chat-feedback.md 和 2026-10-21-li-parallel-completion.md。沿用 Flutter 3.47.2、Riverpod、现有 Backend/Firebase 和最小公共 Ports，不引入架构/通用平台/新依赖。真实账号、主机、公网、签名密钥及最终安装由 LI 负责，不索取或复制私有配置，不操作真实用户资料，不清库。

UI/UX 独立聊天正在 `souma/uiux-connected-flows-20261021` 完成全局导航、History/Footprint 分离、地图节点定位、签到反馈和聊天气泡。不要覆盖这些页面或重复实现；你的模块仅增加自己必需的页面/Port，并交最小组合接点。可直接复用整合分支已有 selectedAt producer、Admin 创建接口、签到天气/位置存储与 API；先读代码，不把旧回执的缺口当成现状。

完成界面/调用→保存→独立回读→错误恢复，必要合同和严格 fixtures 同步更新。必要检查集中一次；修复失败后只复跑受影响部分，不为凑数量重复全量。没有设备/SDK/凭据只标对应 Not Run 并继续独立工作，组件测试不冒充真机。交付一个完整 Draft PR：准确 base/head、功能变化、检查命令与真实结果、未完成项和最小接线说明。不能作者自批，不自动部署、发布 APK、关闭总任务或合并 main。不要只交计划或拆成每个按钮等待 PM 确认。

## SHI：完善真实活动来源覆盖和参与闭环

先完成仍欠的 JIN #166 `124a1f86ee49cd744740c61f0ba2cf971faa23d1` 原 R1/R2/R3 精确版本复审，明确这不是重复审旧 `0a806883`。然后在本包继续完成下列功能，不能停在审查回执。

1. LI 已提供 selectedAt + 当前获准标题 producer，不再重复。当前 `ControlledSourceProjection` 的好友活动/本人参与显示仅覆盖当前第一页来源；将实际已浏览的后续有效批次纳入现有有界短期来源窗口，使第二批活动 Interested/Going 可通过稳定 Event ID 获得当前合法标题、本人参与记录与好友动态。遵守 EB2（20行/批、最多50批、5分钟及现有1000 IDs界限），不得永久存供应商标题，不自动抓全量活动、不新增兴趣映射。复用当前来源代际失效与授权规则，任何缺来源/过期状态明确 unavailable，不能造成功空内容。
2. 检查并完善浏览→下一批/刷新→详情→Interested/Going/忽略/取消→参与者 Friends/Others 分页→资料的保存、回读与失败恢复；修复实际遗漏，已有功能直接复用。保存状态服务器唯一，取消与忽略的既定语义不变。
3. 守住 #167 已解决的两个P2：刷新/disable/代际替换后旧异步来源不能复活，后续页详情不能偷偷退回旧raw内容。将新覆盖加入同一有界来源合成回归；定向一次，不反复真实provider请求。
4. 精确更新 api/event-participation-contract.md 和 api/friend-activity-display-contract.md 的实施说明，不改变既定公开字段/隐私/排名；如发现必须超出现有缓存或供应商许可范围，只暂停超出部分，列明确冲突。

不要再改已由 LI 收回完成的简单标题/时间格式，也不改 UI/UX 聊天占用的全局页面。提供公共Port/模块代码与最小接点。LI 负责真实来源验收；ZHOU 主体完成后一次独立审查来源代际边界。
