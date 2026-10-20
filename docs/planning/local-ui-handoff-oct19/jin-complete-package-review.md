# JIN 完整模块交接 / SHI 新贡献审查

本包延续实际开发基线 `927f77527b32d349aa08020f7de0e88402edb9c7`，包含已交 UI 基线 `51ecb5c`；保留既有 JIN `cb23d6a` / `b882680` / `9723996` 和随后持续忽略增量，不从 main 重做。PR 目标为 `souma/li-shi-du-integration-20261020`，接续决定读取自 `900ca6fcdefb77e9aa95d96fa80994ebf826398f`。没有整体 rebase、reset、重复 cherry-pick 或直接写入 LI 分支。

## 集中交付的用户流程

- 准确 Username 查找/申请/收件接受拒绝/View Profile；全新账号无需预造 pair。My Friends 姓名搜索、现有分页、Special Care 私有选择、确认删除和双向列表失效。
- 本人/他人共用资料、按日记录、日历、地图；服务器检查当前身份、关系、记录及字段隐私，精确记录 ID 打开。位置和地图默认不分享；撤权、关闭分享、解除好友后回读不泄露旧内容。
- People You May Want To Know / See All 和待处理请求数；当前获准兴趣/参与投影排序，Home Top 2。持续忽略在服务器保存，跨刷新/登录保留；已忽略的人入口、普通 SnackBar Undo、同一版本化恢复、未知写入回读、账号切换隔离已接线。
- Friends Activity 只含批准元数据和类型；Check-in 分类可独立运行，SHI 参与 producer 未交付时明确 unavailable。
- 单次前台精确定位、独立粗天气用途授权、Check-in 保存/独立读回、删除或替换位置清旧天气；Note/Mood 编辑不刷新。Home 天气是单独用途，Open-Meteo 两秒预算失败仍可保存签到。地图继承主题、可见署名、精确 ID 回退、声明点连线。

## LI 最小接入补丁

1. 沿用 [既有单页接入说明](../../evidence/sprint3/2026-10-20-jin-module-integration.md) 的当前 identity/store/clock/history/cursor/weather 构造和 Flutter builders。原“忽略 Pending”段仅是早期历史；此包由 [正式决定](../../decisions/2026-10-20-li-friend-recommendation-ignore.md) 解除。`registerSocialModule` 现共注册 13 个操作（原 10 + ignore 3），无需新增 listener/bootstrap。
2. Home 和 See All 继续同一个 `FriendDiscoveryPanel`；它已包含 Ignore、“已忽略的人”、SnackBar Undo。`FriendModulePage` 保留内部导航；沿用同一个 `ProviderScope` / auth session / BackendApiClient。不要给 Undo 建第二个服务或把原始账号 ID交给客户端。
3. Check-in 原 composer 使用 `LocatedCheckInActions` 或相应 controller，替换原保存区域，不并列两个 Save。定位/Weather/地图最小接线仍按旧单页说明，最后 router/bootstrap/APK 属 LI，不覆盖 DU 编辑页面或共享主题。
4. SHI 的 `FriendEventProjection` / `EventActivitySource` 只接受同一事务的只读、vendor-neutral `SocialSourceReader`。本包不会替 SHI 实现参与持久化/人数/分页；参与本人/他人页面继续使用已交 `AuthorizedParticipation` 和 `participationBuilder`。
5. 账号永久删除 executor 后续需调用 `cleanupDeletedAccountPreferences`，tombstone 后重复有界 batch 至 complete。实际 executor 此基线没有；接缝测试不等于完整删除已执行。当前相关状态和最小 API/存储/未知写入合同见 [ignore 实施合同](../../evidence/sprint3/2026-10-20-jin-ignore-contract.md)。

## SHI 审查范围与验收边界

只审 JIN 相对上述基线的好友/资料/位置/Weather/本轮忽略新代码及组合影响；继承组件和旧 #135/#136/#137/#139/#141/#142/#146/#150/#158 等已完成评审不重开。各源码和执行记录按当前交付回执区分；早期 154 Backend / 119 Flutter / 5 SDK 只属于旧 source，不直接移记成新树全绿。本轮仅针对改变的推荐、忽略、transport 和 composition 编译/测试，不重复未变全套。

原始失败记录保留。手写 HTTP/Auth fixtures、实际隔离 Firebase SDK 和真实设备/外部 provider 分开；没有手机定位撤权、真实双账号、OSM native cache/实际瓦片或本轮公网 Open-Meteo 验收声明。SHI 完成新审查后 LI 处理最终组合和设备；不等待手机/模型来交代码，不在本包合并 main、发布 APK、部署服务、关闭 Issue 或改 Project 状态。
