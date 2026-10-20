# JIN → LI：好友资料、位置与天气模块接入

基线 `927f77527b32d349aa08020f7de0e88402edb9c7`，包含 `51ecb5c11ff23ce3bf36fbf9280d2e00646ac857`。本次按 human 接受的新 `jin.md` 任务包实施；最终 router/bootstrap/APK 仍由 LI 收口。源/树和实际检查见同目录交付回执。本说明不是已部署或已获 SHI 新审查的声明。

## 最小接入

1. **Backend**：保留现有 Auth、Firestore、Clock、history gateway、cursor codec 和监听器，在当前启动组合调用一次 `registerSocialModule(app, {identity, store, history, cursor, clock, weather, recommendationEvents?, activityEvents?})`。文件为 `backend/src/friends/transport/register-social-module.ts`。它只注册本包十个路由，不替换旧 Friend、Check-in 或 Events 路由。
2. **天气**：创建一个共享的 `OpenMeteoWeatherProvider(permitted)`，传给上述模块，并把原 Check-in 仓库构造调整为 `new FirestoreCheckInRepository(store, weather, clock)`。`permitted` 由当前主机配置给出，不从手机或请求体取值；仅在免费 API 用途/配额可用时允许。默认未给适配器仍能保存签到，只是不能取得天气。内存速率限制不是跨进程/重启配额证明，LI 需维持当前单实例用途与剩余配额判断；不可把常量 `true` 当作合规证据。没有新密钥、端口、云产品或自动 provider 探测。
3. **Friends/Profile/Home**：当前认证路由打开 `FriendModulePage(openAttribution: ...)`；本人和好友都用 `SocialProfilePage(username: ..., initialDate: ..., timeZone: ..., openAttribution: ...)`。使用既有 `HistoryDevicePort` 获取 IANA zone/当日，勿以 UTC 截断手机日期。Home 插槽可用 `FriendDiscoveryPanel(home: true, ...)`、`FriendActivityPanel(home: true, ...)` 和 `HomeWeatherCard(...)`；See All 用 `home: false`，服务端先统一排序再取 Top 2。保留既有深绿/Playfair 主题及同一个 BackendApiClient/session。
4. **Check-in 编辑器**：DU/LI 在原 composer 的保存区域插入 `LocatedCheckInActions(draftKey: stableDraftObject, note: currentNote, mood: currentMood, activity: currentActivity, visibility: selectedVisibility, openAttribution: ...)`，替代该区域原 Save 按钮；不要并列两套保存按钮。每次新建 composer 分配一个稳定 draftKey，勿在每次 build 中重新 `Object()`。此槽已包含单次定位/独立天气授权、保存、显式独立读回、确认移除/更换位置、移除天气和错误恢复。可先使用 `CheckInPlaceControls` + `LocatedCheckInController` 做同等布局组合。保留 DU 原日期/Footprint/编辑页面；本包未改这些页面。旧 Note/Mood 编辑自然保留已有天气，位置改变/删除清旧快照，不重新查询。
5. **链接与地图**：`openAttribution` 使用当前原生 HTTPS 外部打开能力，允许固定 `https://open-meteo.com/`、`https://creativecommons.org/licenses/by/4.0/`、`https://www.openstreetmap.org/copyright`；不要使用只接受 Ticketmaster 的校验器。地图由 flutter_map 8.3.2 默认原生缓存/浏览器缓存加载 OSM 标准瓦片，固定应用标识 `com.enmori.app`；保留可见署名，无离线批量下载。不要把测试用 `tileLayerBuilder` 传入运行候选。

## SHI 接线与明确边界

- **活动参与**：SHI 在现有事件接口内使用 `AuthorizedParticipation.read(principal, username, transactionCallback)`，只在服务器已核对身份、关系和 participation 字段权限后调用其受控投影；Flutter 通过 `participationBuilder` 打开该接口页面。本基线未包含参与生产者，不能编造名单/人数/状态。
- **推荐和动态**：SHI 分别实现 `FriendEventProjection` 与 `EventActivitySource`，在传入的同一事务内做当下可见性/删除/用途检查，且不作外网 IO。推荐只交允许的 Interested/Going ID 集合；动态只交 type/sourceRecordId/occurredAt。接口缺失且参与字段可见时，该相关组合返回 unavailable；Check-in 分类仍可独立运行。私人参与设置不会被假装成生产者错误。
- **忽略**：human 已选持续忽略；撤销入口/期限/删除处置待 LI。[已发决策请求](https://github.com/3427564237/enmori-app/issues/84#issuecomment-6274517573)。本包不落未定忽略记录，不显示假成功按钮。
- **设备/供应商**：JIN 交代码和夹具/隔离 SDK 证据；LI 组合后验证前台精确授权、拒绝/撤权、双账号资料/地图、实际瓦片缓存/署名、公开网格天气及断网回退。缺项不使其它模块停工，组件 Pass 不代替真机 Pass。无新增 APK、部署或真实 AI 尝试。

## 验收顺序

现有账号正常登录 → Username 申请/接受 → 资料/特别关心 → 私密/好友签到的单次位置保存及独立读回 → 月历/点选确切 ID → 关闭分享/收紧可见性 → 旧页面 Reload/旧 cursor/直接 API 均不再返回失权内容 → 确认解除好友、双方列表失效。拒绝数据同意仍可手动好友和签到，推荐/动态不读取其个人数据；通知仍仅待处理申请数。天气失败先保存签到，只有该次响应显示未附天气，后续记录无伪天气。
