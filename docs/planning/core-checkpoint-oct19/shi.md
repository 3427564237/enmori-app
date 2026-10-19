请以 SHI 身份一次执行下面这个完整任务包，完成代码、前后端联调、受影响测试及交付，不要只输出计划，不要拆成需要PM逐个启动的小任务。

起点是 ENMORI 核心检查点 `9e45b1ebc13c1287fc903a6edf4059f4eeb792ec`，不是较旧main。当前本机工作区为 `/home/miku/.codex/worktrees/li-core-priority-oct19/ENMORI`；其他电脑从随附 `enmori-core-checkpoint.bundle` 导入该提交，再建立自己的分支，保留已有改动。不要在同一个工作区与他人并行写文件。先核对 HEAD/status、`AGENTS.md`、`docs/tooling/skill-routing.md`、`ARCHITECTURE.md`、`docs/decisions/2026-10-19-li-core-feature-delivery.md`、`docs/decisions/2026-10-19-li-checkpoint-owner-packages.md` 和 `docs/evidence/sprint3/2026-10-19-core-execution/`。按hierarchy保留替代范围，UI参考不是需求权威。

复用 Flutter/Riverpod、当前Backend/Firebase、Repository/认证/版本并发。只新增本包实际需要的接口和已批准依赖，不建新架构/任务系统。一个负责人完成包内前后端和严格fixture。遇到凭证、真实外部服务或更高权限冲突，只停受影响行为，继续其他部分；不要伪造数据或把组件Pass当真机Pass。旧数据缺字段按安全空值，新分享默认关闭。不得清理/替换原有服务数据，不自动重放未知AI请求，不自动合并main、发布应用、关闭总任务或宣称全项目Done。

你的包：在已有真实活动浏览/详情基础上补完Events闭环，包含本功能自己的Backend和Flutter，不接手好友/地图/AI后端。

1. 检查点已把底栏第三项接到Events。复用稳定ID的真实活动来源、分类列表和详情，统一Home及Events活动卡片。显示真实标签、时间、地点、简介、允许的推荐原因和可见参与人数；空态与失败区分。每个详情和参与者页携带稳定Event ID，禁止全局“当前活动”变量。
2. 服务器保存Interested/Going标记及取消、忽略推荐，登录身份/版本冲突/重复点击/账号切换都安全。Home、列表、详情和个人资料回读一致。最小规范合同随功能更新，不能仅靠页面布尔值模拟完成。
3. 外部报名先提示第三方网站，用已有external opener；返回后询问是否报名成功，Yes设Going，No保持原状态；不新增Booked。取消、打不开、外部停留、返回和重复点击都要可恢复。
4. 感兴趣/参加名单按Friends/Others分组，See all分页，点击通过明确身份打开资料。名单和人数都遵守个人参与信息权限，不能用总计泄露隐藏成员。复用已有好友关系、settings.fieldPrivacy.participation和认证；你的participants投影自己实现，不等待社交重写。
5. 推荐只用已批准Music映射，其他兴趣可保存但无真实匹配就明确暂无推荐。拒绝数据同意仍能手动浏览/参加，不能伪装成个性化。真实数据缺失时完成错误/空态，不造活动。
6. 提供Events route builder、Home卡片/个人参与section和onOpenProfile身份回调，JIN做最终根路由组合。独立先跑列表→详情→状态→回读→外部返回→名单的完整测试。尚缺JIN资料页时验证回调携带正确身份并明确最终组合待接，不能用样例资料冒充。已有#47是关闭的准备票，不重写其历史为本次功能完成。集中审查SHI→ZHOU。

交付时给出一个集中审查包：源码提交/分支、变更合同、实际通过的用户流程、受影响Backend/Flutter测试与静态检查、可构建APK及剩余Blocked/Not Run。包内可多次提交，最终不用为每个按钮再开一个任务。复用现有Issue历史作索引，先读当前状态，不把关闭的准备票当成新功能已完成。不代表其他人已开工或已同意ETA。
