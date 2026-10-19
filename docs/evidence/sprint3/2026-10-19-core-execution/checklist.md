# 核心功能逐项核对表

起点：ac4021dd13efc2bc6aa8676ccce0a1901311ef0d。状态为本轮源码核查，不代表当前真机验收。已有可用表示可复用的纵向实现；历史手机证据不转写为新APK Pass。检查点前由本对话执行；后续按五个完整任务包分工。

|批次|用户清单|起点状态|实现对应与缺口|
|---|---|---|---|
|1|条款勾选、密码显隐、登录错误|需补齐|auth/presentation；本轮已编辑，待测试|
|1|Firebase验证、重发、忘记密码、返回登录|需补齐|auth/data/firebase_auth_repository.dart；本轮已接线，真实邮件未验证|
|1|注册成功、资料初始化、完成状态路由|已有可用|account/onboarding、router；本轮组合尚未验证|
|1|退出清栈及账号缓存隔离|已有可用|app_router、session provider；需新增回归|
|1|Display Name、不可改Username|已有可用|own_profile、account_preferences|
|1|BIO、学校/公司、地区、明确GPS同步|缺失|现有Profile合同只有姓名/可见性|
|1|兴趣共用、跳过、最多10|需补齐|interest_editor已有；引导跳转待接|
|1|12名称保留ID、Admin单项创建|缺失|interest读取/替换已有；无创建路由|
|1|资料/兴趣/位置/参与/默认签到/地图隐私|需补齐|现有仅资料和默认签到/同意；服务端分项待扩|
|1|同意独立、默认Private、不改历史|需补齐|deriveInitialChoice本轮修改；需回归|
|1|正常停止重启保留账号业务数据|缺失|旧controlled_phone_service.stopAndClean清理；需专门保留模式|
|1|Home/Friends/Events/AI/Profile及Home入口|需补齐|social navigation第三项原Check-in；入口可复用|
|1|拒绝同意仍可核心功能、Home非个性化、AI受限|需补齐|AI consent gate已有；Home推荐空态/浏览待统一|
|1|空数据与加载失败区分|已有可用|各Repository Result/section；组合待验证|
|2|Note或Mood、活动、位置、可见性签到|需补齐|check_in仅Note纵向链完整|
|2|真实天气状况温度、失败仍保存|缺失|只有Q13合同，当前源码没有天气适配器；需实际实现|
|2|签到编辑、单条权限、删除确认|缺失|目前create/read/history|
|2|历史天气编辑保留、位置变化清除|缺失|依赖编辑扩展|
|2|日期分组分页、详情编辑返回|需补齐|Footprint日期查询/分页/详情已有|
|2|月历数量热力、选日记录、准确定位高亮|需补齐|日期选择已有；月份统计/定位缺失|
|2|本人好友共用记录/日历/地图、服务端过滤|缺失|own history已有；好友投影缺失|
|2|精确点独立许可、好友地图默认关闭、双重权限|缺失|未有地图|
|2|签到点连线、OSM署名缓存、0.1度天气坐标|缺失|未引入地图组件|
|2|删除收权解除好友跨页同步|缺失|需共享读取失效与服务端重验|
|3|Events分类列表与Home共享卡片|需补齐|真实browse与recommend已有，卡片未统一|
|3|真实详情标签时间地点简介原因人数|需补齐|源详情已有；参与人数缺失|
|3|稳定Event ID读取详情/参与者|需补齐|browse/detail已有稳定引用；参与者缺失|
|3|Interested/Going取消、忽略推荐、一致回读|缺失|当前活动主要只读|
|3|外部跳转提示、返回确认Going无Booked|需补齐|external opener已有；状态闭环缺失|
|3|Friends/Others参与名单分页、资料跳转、权限|缺失|新合同待实现|
|3|真实Music映射、其余无匹配不伪造|已有可用|controlled-event-recommendations；当前外部来源尚未验证|
|4|People推荐、See all、添加、忽略|缺失|推荐排序函数不代表接口/界面可用|
|4|Username查找、请求收发接受拒绝、View Profile|需补齐|friend_page主申请链已有；他人资料缺失|
|4|好友姓名搜索、分类、特别关心|需补齐|my_friends已有基础列表|
|4|通知好友请求入口数量|缺失|无Home请求计数|
|4|好友资料、获准兴趣/记录/日历/地图/参与|缺失|只可复用部分现有领域模型|
|4|确认删除好友、双向内容及地图撤权|缺失|删除路径待补|
|4|Home好友动态与完整列表、保留原字段|缺失|需接获准动态投影|
|4|Home当前天气授权/粗定位/更新时间/错误|缺失|需复用天气适配器|
|5|保存失败证据、确认AI运行配置|需补齐|baseline哈希已保存；旧runtime pointer缺失，Ollama进程存在不证明配置就绪|
|5|服务模型GPU超时提示词解析语义逐项诊断|尚未验证|本轮不发送/重试原请求|
|5|863b653适配回归后合入|尚未验证|提交存在，仅已查看diff stat|
|5|真实聊天三轮、历史、新会话、失败回读|尚未验证|既有UI/API可复用；历史真实失败仍保留|
|5|AI数据同意切换、真实候选允许上下文|需补齐|现有purpose/semantic gates需组合验证|
|5|Persona全自由字段、最多5/唯一当前|需补齐|已有管理/字段受限|
|5|新增切换更多删除当前警告/默认/未保存离开|需补齐|部分管理已有；按完整字段复核|
|5|独立草稿Try预览、不保存/激活/历史|缺失|当前无完整独立预览链|
|5|AI Safety/Limited、深绿Playfair一致交互|需补齐|受限状态已有；当前主题indigo|

## 验证环境

本轮ADB无已连接设备，旧受控运行目录指针不存在。真实邮件、真机定位、同一APK双账号及真实三轮模型：尚未验证。源码回归与APK构建另记实际结果，不以此替代用户流程。

## 第一批执行增量（持续更新）

- 已实现：Firebase验证/重发和密码重置页、条款勾选、密码显隐；注册后共用兴趣编辑页及Skip；初始签到Private与同意独立。
- 已实现：BIO（最多500字符）、学校/公司类型及名称（120）、地区（120），明确单次GPS粗坐标填充草稿；原Username只读；资料/设置沿用revision，不覆盖旧客户端未提交的扩展字段。
- 已实现：兴趣/位置/参与可见性和好友地图分享设置，旧记录默认Private/false。这是设置保存能力，后续地图/其他人投影尚未完成，不能称权限旅程已通过。
- 已实现：连接版底栏Events和Profile、Home保留签到；离线fixture保留历史预览导航并明确区分。
- 已实现：受保护Admin单项创建、Unicode16完整case fold、存量全目录事务查重及名称预留；12名称在本轮独立验证环境add-only初始化，未修改原8080/9099服务目录。
- 新增保留数据启动路径`tool/run_retained_core.mjs`，复用Backend/API/Firestore适配器。正常停止使用Firebase export-on-exit，后续import同一目录；不启动或重放AI，不调用旧stopAndClean。
- 尚未完成：本轮保留环境与手机TLS/handoff/真实Events/AI的统一组合；邮件实际投递、定位真机验收；第二至第五批均不可视为完成。

## 检查点新增完成（源码及受控环境层）

- 签到：Note或Mood至少一项；Mood/Activity展示标签、每条可见性；幂等键覆盖完整输入。原Note-only记录无需改写。
- 编辑/删除：所有权重验、revision乐观并发、删除确认、保留草稿/重新读取、成功后详情回读和Footprint刷新。备注/心情修改保留createdAt及既有天气字段；当前尚未新增位置/天气。
- 月历：按IANA时区计算当地日界，事务内精确日计数，月份切换、选择日期、分页摘要、按确切ID回Footprint定位和短暂高亮。无地图，不把此项称完整第二批。
- 实际Emulator：签到创建→修改→回读→旧版本412→删除→404；月历数量减少；正常停止/重启后原签到回读。结果见restart-pass.json。
- 已检查参考截图friend-profile.png：明确为OFFLINE SAMPLE，不能证明真实他人资料已实现；核对Figma导出的Check-in编辑/活动/心情区域仅用于遗漏检查，未引入样例天气或样例活动数据。

后续负责人：AI/Persona→ZHOU；社交/位置/地图/天气/统一运行组合→JIN；Events→SHI；已有账号/记录及视觉收尾→DU；少量本机联调验收→LI。详见docs/planning/core-checkpoint-oct19/。
