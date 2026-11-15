# Android 活动回归验收 · 2026-11-15

在 vivo V2405A 实体手机上沿用原登录会话，时间均为新加坡时间。使用 Android 屏幕截图和无障碍树记录测试结果。本轮手机操作为只读，回跳后选择 No 或取消，Going 的写入由隔离测试验证。 [修复与验收范围](../../decisions/2026-11-15-li-event-regression-repair.md)

## v67 故障复现

测试开始时手机安装的是 `com.enmori.app.group`、versionCode 67、versionName `1.0.0-usability20261112`。兴趣编辑页显示已选 1 项，Gaming 勾选，Music 未勾选。 [选择数量截图](/home/miku/Pictures/Screenshots/ENMORI-2026-11-15-event/v67-06-interest-selection.png) [Gaming 选择截图](/home/miku/Pictures/Screenshots/ENMORI-2026-11-15-event/v67-07-gaming-only.png)

| 入口 | 实体手机观察 |
|---|---|
| Home → Events for you | 前两项均为 PGL CS 2 Major Singapore 2026，分别是 12 月 10 日和 11 日场次。两项均显示 `Matches: Gaming`，官方封面可见。 [首页推荐截图](/home/miku/Pictures/Screenshots/ENMORI-2026-11-15-event/v67-33-home-gaming-with-heading.png) |
| Home → Next group | 列表标题为 `Event recommendations`，显示同一赛事的 12 月 12 日与 13 日场次。两项均显示 `Matches: Gaming`，滑到末尾显示 `You have reached the end of this list`。这次线上账号的完整推荐共四个 Gaming 匹配项，混合候选的顺序由隔离测试覆盖。 [下一组截图](/home/miku/Pictures/Screenshots/ENMORI-2026-11-15-event/v67-43-all-recommendations-result.png) [列表末尾截图](/home/miku/Pictures/Screenshots/ENMORI-2026-11-15-event/v67-45-all-recommendations-group-controls.png) |
| 底部导航 → Events | 显示 `Events across Singapore` 和 `Any time · All categories · Source order`。开头的 Songs That Keep Us Together 3 Concert 与 5 SECONDS OF SUMMER: EVERYONE’S A STAR! WORLD TOUR 均标为 Music。 [浏览列表截图](/home/miku/Pictures/Screenshots/ENMORI-2026-11-15-event/v67-49-browse-terminal.png) |

- PGL 12 月 10 日场次的详情显示官方封面、供应商分类 `Sports` 和 `On sale`，`About this event` 显示无法读取官网详情。Ticketmaster 的公开活动页有赛事介绍。 [App 详情截图](/home/miku/Pictures/Screenshots/ENMORI-2026-11-15-event/v67-35-gaming-detail.png) [Ticketmaster 活动页](https://ticketmaster.sg/activity/detail/26sg_pglcs2major)
- 同一 PGL 场次只有顶部 `Official event details` 可外开。点击后，Chrome 地址栏显示 `/ticket/area/26sg_pglcs2major/3239`。使用 Android 返回键回到同一活动详情页，未出现 `Did you complete registration?`。 [报名入口区域截图](/home/miku/Pictures/Screenshots/ENMORI-2026-11-15-event/v67-39-pgl-no-separate-booking.png) [回跳截图](/home/miku/Pictures/Screenshots/ENMORI-2026-11-15-event/v67-38-pgl-return-no-confirmation.png)
- 从 Recently viewed 打开 Songs That Keep Us Together 3 Concert，首次请求提示服务暂不可用。手动刷新后详情加载，封面位置显示 `No cover provided by source`，简介位置显示无法读取官网详情。官网按钮最终在 Chrome 打开 Ticketmaster 活动列表。Android 返回同一详情页时同样没有确认弹窗。 [缺失封面和简介截图](/home/miku/Pictures/Screenshots/ENMORI-2026-11-15-event/v67-20-detail-retry-complete.png) [回跳截图](/home/miku/Pictures/Screenshots/ENMORI-2026-11-15-event/v67-23-return-no-confirmation.png) [Ticketmaster 活动页](https://ticketmaster.sg/activity/detail/26sg_songs3)

第一次 Home 推荐请求结束于服务暂不可用。按截图采样，重开应用到看到推荐相隔约 121 秒，PGL 详情从加载中到看到页面约 47 秒，下一组推荐约 92 秒，Browse 从加载中到看到列表约 166 秒。
