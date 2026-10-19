# PM 决定：单对话完成核心体验

- Source ID: `S-PM-1019-LI-CORE-SINGLE-CHAT`。
- 决定人：LI HOURUI / PM；2026-10-19，Asia/Singapore。
- 来源：本轮用户提交的《ENMORI 功能补齐计划：单对话执行，先完成核心体验》；已确认并授权实施。
- 工作区：`/home/miku/.codex/worktrees/li-core-priority-oct19/ENMORI`；核对起点 `ac4021dd13efc2bc6aa8676ccce0a1901311ef0d`，保留两份原有未跟踪草稿。

> 后续执行变更：达到检查点后按[五个完整任务包决定](2026-10-19-li-checkpoint-owner-packages.md)分工。以下产品规则继续有效，单对话全程实施仅适用检查点之前。

## 替代范围与保留来源

保留[原19Oct草稿](../planning/2026-10-19-li-core-feature-delivery-superseded.md)、[18Oct完整旅程决定](2026-10-18-li-complete-user-journey-delivery.md)、[19Oct演示接管](2026-10-19-li-sponsor-demo-local-takeover.md)、[5Oct设置批准](2026-10-05-li-profile-settings-approval.md)、[Q12目录合同](2026-09-02-interest-tag-event-category-contract.md)及其更早来源。

本轮明确替代：旧五成员实施分工、等待owner启动、账号扩展排后、目录名称Pending、初始Accept→Public绑定、仅进程生命周期保存/正常停止删除业务数据、地图精度及分享尚待决定、Persona自由字段尚待决定。由当前单一对话依序完成前后端、联调与验证，不派发其他成员。历史证据和作者不抹除；旧审查/测试不冒充本轮验收。更高权限冲突只暂停受影响行为，法律、许可、权限、语义验证及未知AI结果核对仍保留。

## 已确认产品与实施边界

1. 邮箱验证/重发、忘记密码采用Firebase邮件链接，重置后返回登录；不建六位码服务。注册条款勾选、密码显隐、错误反馈、初始化及资料完成状态路由需要补齐。退出清空账号页面栈与缓存。
2. Display Name可改，唯一Username不可改；BIO、学校/公司类型与名称、手填地区及明确操作的GPS同步。兴趣注册/资料共用，可跳过，最多10个。
3. 目录补齐Photography、Outdoors、Music、Art、Books、Films、Gaming、Food、Fitness、Travel、Technology、Volunteering；保留已有ID和引用。最小Admin单项创建，普通用户只读和选择。19Oct选择包A方向获准，具体实现沿用原认证/并发/错误惯例。
4. 数据同意与隐私独立，新签到默认Private；可设Public/Friends-only/Private，修改默认值不改历史。隐私包括资料、兴趣、位置、活动参与、默认签到、好友地图分享；服务端授权，旧记录新增分享默认关闭。
5. 拒绝数据同意仍可账号、手动活动、好友、签到、个人记录；Home非个性化，AI受限。底栏Home/Friends/Events/AI/Profile；签到主入口Home。
6. 受控服务正常停止/启动保留Auth账号及业务数据，不以清库重启作为正常方式；不扩展为正式云部署。
7. Check-in沿用Note或Mood至少一项，包含活动、位置、可见性及真实天气快照；天气失败可保存并明确未取得。编辑备注/心情不刷新历史天气，位置移除/改变清掉不对应天气。编辑/删除/单条权限、日期分组分页、月度数量热力、准确记录定位高亮及跨视图一致性。
8. 精确签到位置需单独授权，仅保存当次点；不后台定位/持续轨迹。地图默认不分享，开启仅好友；仍交叉检查签到与位置权限。仅按时间连接获准点，标为签到点连线。天气独立粗化至0.1度，精确点不得交天气服务。采用flutter_map、OSM、geolocator，署名/应用标识/合规缓存，禁批量瓦片下载。
9. Events按稳定Event ID读取；真实标签/时间/地点/简介/原因/获准人数；Interested、Going、忽略状态跨页一致。外部报名明确第三方跳转，返回Yes设Going、No保持，不新增Booked。参与名单Friends/Others分页及隐私过滤。仅沿用已批准Music真实映射，其余无匹配明确空态，不造映射或活动。
10. 好友推荐/忽略/See all、准确Username查找、申请/接受/拒绝/View Profile；好友姓名搜索、现有分类、特别关心；通知为好友请求入口及数量，无推送。获准好友资料/兴趣/记录/日历/地图/参与信息，解除好友需确认且双方权限同步失效。动态保留原字段范围。Home当前天气独立说明用途、前台粗定位、更新时间及可恢复错误。
11. AI继续本地Ollama；先保留故障证据，逐项检查服务/模型/GPU内存/超时/提示词/解析/语义。863b653需适配回归后合入，不以存在提交声称修复。未知结果先核对不自动重发，三次针对性修复失败则记录诊断继续核心功能。真实候选/获准上下文，不扩大数据读取。
12. Persona最多5个、唯一当前；全自由字段：名称、关系、Short Introduction、描述、性格、Communication Style、自定义兴趣、回复长度、语气、额外指令。草稿预览独立，不保存/激活/混入正式历史，不提升权限。删除当前恢复默认表达；确认、警告、未保存离开提示。AI Safety/Limited及深绿/Playfair Display/一致反馈。

## 实施及验收

依次：①账号/导航/资料/隐私/持久化；②Check-in/时间线/月历/地图；③Events；④Home社交/好友资料；⑤AI/Persona/整体界面。每批完成界面→保存→回读→错误恢复后进入下一批。复用Flutter/Riverpod、Backend/Firebase、现有Repository、认证与乐观并发；只新增上述功能实际需要的合同/依赖，严格测试数据同步更新。不创建新架构或任务管理系统。

最终同一APK/环境覆盖注册邮件/两种同意/重登隔离、跨页状态及正常重启、签到增改删/定位、双账号好友撤权、Events外部返回、拒绝定位/天气失败/断网/冲突，以及真实模型至少三轮相关对话和历史/Persona行为。交代码、可安装APK、功能核对表、源码版本和真实验证记录。组件Pass不等于真机Pass；缺凭证/服务故障仅局部阻塞；不自动合并main、公开发布、全项目Done。
