请以 JIN 身份一次执行下面这个完整任务包，完成代码、前后端联调、受影响测试及交付，不要只输出计划，不要拆成需要PM逐个启动的小任务。

起点是 ENMORI 核心检查点 `9e45b1ebc13c1287fc903a6edf4059f4eeb792ec`，不是较旧main。当前本机工作区为 `/home/miku/.codex/worktrees/li-core-priority-oct19/ENMORI`；其他电脑从随附 `enmori-core-checkpoint.bundle` 导入该提交，再建立自己的分支，保留已有改动。不要在同一个工作区与他人并行写文件。先核对 HEAD/status、`AGENTS.md`、`docs/tooling/skill-routing.md`、`ARCHITECTURE.md`、`docs/decisions/2026-10-19-li-core-feature-delivery.md`、`docs/decisions/2026-10-19-li-checkpoint-owner-packages.md` 和 `docs/evidence/sprint3/2026-10-19-core-execution/`。按hierarchy保留替代范围，UI参考不是需求权威。

复用 Flutter/Riverpod、当前Backend/Firebase、Repository/认证/版本并发。只新增本包实际需要的接口和已批准依赖，不建新架构/任务系统。一个负责人完成包内前后端和严格fixture。遇到凭证、真实外部服务或更高权限冲突，只停受影响行为，继续其他部分；不要伪造数据或把组件Pass当真机Pass。旧数据缺字段按安全空值，新分享默认关闭。不得清理/替换原有服务数据，不自动重放未知AI请求，不自动合并main、发布应用、关闭总任务或宣称全项目Done。

你的包：好友社交、位置与地图权限、真实天气及保留数据的统一运行组合。这些共享授权和生命周期工作由你一次贯通。

1. 先复用检查点现有账号/设置/兴趣、签到CRUD/Mood/Activity/月历/定位。好友实现准确Username查找、申请收发/接受拒绝/View Profile、姓名搜索、既有分类、特别关心、确认删除好友，双向关系和好友限定内容立即失效。补People You May Want To Know/See all/忽略及合法推荐读数；不得使用不允许字段排名。
2. 他人资料投影、允许的兴趣、签到/日历/地图和参与信息都由服务器过滤。Home接好友动态和完整列表，保持既有动态字段范围；通知仅好友请求入口和待处理数。数据同意拒绝仍保留这些核心功能，Home用非个性化内容，AI受限。
3. 给签到补“明确单次授权→精确位置保存→回读→删除/换位置”的全链；geolocator已用于Profile的单次粗坐标填草稿，不等于签到定位完成。用flutter_map/OSM，不后台定位/轨迹追踪/批量瓦片下载，保留OSM署名、应用标识和合规缓存。地图默认不分享，开启也仅好友；必须同时通过记录和位置字段权限。按时间连接允许的点，明确“签到点连线”，不能称真实行走路线。本人/好友共用记录、日历、地图组件，删除、收紧、关闭分享、解除好友同步生效；对过期页面和直接API绕过做负向验证。
4. 当前只有Q13天气合同，没有可复用源码适配器；按该合同实现Open-Meteo真实快照及Home当前天气的明确单次粗定位查询。Flutter和Backend都确保天气坐标为0.1°网格，精确签到位置不传给天气服务。校验时间/单位/WMO/温度与两秒预算，失败仍保存签到。备注/心情编辑不刷新历史天气；移除/改变位置清掉旧快照；无回填/伪造。Home显示更新时间，不把历史天气当当前。保留Open-Meteo/CC BY链接及归一化说明。
5. 在现有保留模式上完成同一环境的账号/业务数据、真实Events接入、AI接入和手机私有入口组合；原一次性stopAndClean不能成为日常启动。检查原服务和未知AI操作，不能用缺/tmp指针推断数据已丢或直接重启。正常停止/启动保留Auth/Firestore、关系、参与、记录、Persona；新验证目录已经通过重启证据，复用而不重建。新权限默认关闭，迁移不得清库或覆盖历史。
6. ZHOU负责AI/Persona，SHI负责Events自己的前后端，DU负责现有账号/记录界面与主题；不要替他们重写。你拥有最终共享router/bootstrap/运行组合，接入他们现有builder和合同；他们未交付时先完成自己的完整功能与验证，只把最后组合缺口标出。LI只执行少量本机验证。集中审查JIN→SHI；组合证据由LI独立核对。

交付时给出一个集中审查包：源码提交/分支、变更合同、实际通过的用户流程、受影响Backend/Flutter测试与静态检查、可构建APK及剩余Blocked/Not Run。包内可多次提交，最终不用为每个按钮再开一个任务。复用现有Issue历史作索引，先读当前状态，不把关闭的准备票当成新功能已完成。不代表其他人已开工或已同意ETA。
