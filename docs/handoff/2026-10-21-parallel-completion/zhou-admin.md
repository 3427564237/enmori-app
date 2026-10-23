# 完整增量任务（一次 prompt 执行至可审查交付）

从 GitHub `3427564237/enmori-app` 的 `souma/li-zhou-runtime-20261020` 当前检查点 `256763eb91c1f461127caf1cb738233759093264` 创建自己的功能分支/独立工作树；不要从旧 main 重新实现，也不要重放已进入整合分支的旧包。先核对实际 HEAD、未提交改动和后续整合提交，保留自己的未交付工作。新 Draft PR 的 base 为上述整合分支，不合并 main。

先读 AGENTS.md、docs/tooling/skill-routing.md、ARCHITECTURE.md、docs/decisions/2026-10-19-li-core-feature-delivery.md、2026-10-21-li-remote-group-access.md、2026-10-21-li-history-footprint-chat-feedback.md 和 2026-10-21-li-parallel-completion.md。沿用 Flutter 3.47.2、Riverpod、现有 Backend/Firebase 和最小公共 Ports，不引入架构/通用平台/新依赖。真实账号、主机、公网、签名密钥及最终安装由 LI 负责，不索取或复制私有配置，不操作真实用户资料，不清库。

UI/UX 独立聊天正在 `souma/uiux-connected-flows-20261021` 完成全局导航、History/Footprint 分离、地图节点定位、签到反馈和聊天气泡。不要覆盖这些页面或重复实现；你的模块仅增加自己必需的页面/Port，并交最小组合接点。可直接复用整合分支已有 selectedAt producer、Admin 创建接口、签到天气/位置存储与 API；先读代码，不把旧回执的缺口当成现状。

完成界面/调用→保存→独立回读→错误恢复，必要合同和严格 fixtures 同步更新。必要检查集中一次；修复失败后只复跑受影响部分，不为凑数量重复全量。没有设备/SDK/凭据只标对应 Not Run 并继续独立工作，组件测试不冒充真机。交付一个完整 Draft PR：准确 base/head、功能变化、检查命令与真实结果、未完成项和最小接线说明。不能作者自批，不自动部署、发布 APK、关闭总任务或合并 main。不要只交计划或拆成每个按钮等待 PM 确认。

## ZHOU：完成最小 Admin 兴趣目录管理闭环

这是已批准的核心缺失功能，不是新增全能后台。现有 `backend/src/interests/transport/admin-routes.ts` 已有 POST `/v1/admin/interest-tags`，Firebase Admin 使用服务端当前用户 `enmoriAdmin === true` 且未禁用检查；普通用户不能创建。

1. 完成独立 Admin 兴趣目录页面和 Repository：读取现有目录、单项名称输入、创建、成功后重新读取并显示稳定 ID/名称；普通选择列表随目录刷新能选到新项。保留所有已有 ID 和引用，不重建目录，不按相似名称擅自合并。
2. 入口只对已确认 Admin 呈现；使用现有 Firebase claim/身份读取能力作为 UI 提示，服务端每次重新鉴权仍是唯一权限依据。若现有客户端安全身份接口不能获得该提示，可在现有身份层增加最小只读 Admin capability；先把精确 DTO/路由写入合同并与现有规则一致，授权仅覆盖这个必需的布尔能力，不扩展角色系统。给 LI 一个 Profile/设置入口接点，不改全局导航。
3. 输入验证、权限撤回/403、重复名称409（按原合同，不自行定义）、网络失败和重复点击要有清楚反馈；未知创建结果先回读核对，不能自动重发造成重复。草稿失败保留，离开未保存有提示。读取失败不假装空目录。
4. 合成普通/Admin/禁用或撤权身份验证权限，创建→回读→普通兴趣选择，以及会话切换清理；只跑涉及的定向 Backend/Flutter 检查。
5. 不自动给 LI 或任何真实账号赋 Admin claim，不加入用户封禁、角色授予、活动伪造、批量导入、删除或其他目录 CRUD；真实 Admin 授权与真实创建仅列本机后续步骤。Q12 及19Oct单项创建范围继续控制。

交付重点是可用功能和接点，不再重复旧 #167 审查；LI 审查新功能，必要独立权限复审由 JIN 在自己主体交付后一次给结论。
