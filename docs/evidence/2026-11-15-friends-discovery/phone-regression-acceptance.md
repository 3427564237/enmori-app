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
- 同一 PGL 场次只有顶部 `Official event details` 可外开。点击后，Chrome 地址栏显示 `/ticket/area/26sg_pglcs2major/3239`。使用 Android 返回键回到同一活动详情页，返回后的无障碍树显示详情且没有 `Did you complete registration?` 弹窗。 [Chrome 选座页截图](/home/miku/Pictures/Screenshots/ENMORI-2026-11-15-event/v67-37-pgl-ticket-page.png) [返回后查看计划区域的截图](/home/miku/Pictures/Screenshots/ENMORI-2026-11-15-event/v67-39-pgl-no-separate-booking.png)
- 从 Recently viewed 打开 Songs That Keep Us Together 3 Concert，首次请求提示服务暂不可用。手动刷新后详情加载，封面位置显示 `No cover provided by source`，简介位置显示无法读取官网详情。官网按钮最终在 Chrome 打开 Ticketmaster 活动列表。Android 返回同一详情页时，返回后的无障碍树同样没有确认弹窗。 [缺失封面和简介截图](/home/miku/Pictures/Screenshots/ENMORI-2026-11-15-event/v67-20-detail-retry-complete.png) [Chrome 活动列表截图](/home/miku/Pictures/Screenshots/ENMORI-2026-11-15-event/v67-22-official-ticketmaster-loaded.png) [Ticketmaster 活动页](https://ticketmaster.sg/activity/detail/26sg_songs3)

第一次 Home 推荐请求结束于服务暂不可用。按截图采样，重开应用到看到推荐相隔约 121 秒，PGL 详情从加载中到看到页面约 47 秒，下一组推荐约 92 秒，Browse 从加载中到看到列表约 166 秒。

## v69 保留数据安装

使用 [签名 APK](/home/miku/Downloads/ENMORI-events-v69-release.apk)。安装前核对了 SHA-256、大小、包名、版本和发布签名。第一次安装在系统确认期间遇到锁屏，安装命令以 `INSTALL_FAILED_ABORTED` 结束，版本仍为 67。用同一包再次覆盖安装并点击系统的继续安装后，设备记录更新至 versionCode 69、versionName `1.0.0-events20261115`，更新时刻为 16:57:44，首次安装时间与升级前相同。 [安装确认截图](/home/miku/Pictures/Screenshots/ENMORI-2026-11-15-event/v69-03-install-current.png)

后端换包冷启动期间，v69 首次打开显示 `Service unavailable`。会话与功能复验在后端恢复后执行。 [冷启动期间的提示](/home/miku/Pictures/Screenshots/ENMORI-2026-11-15-event/v69-04-after-install.png)

后端恢复后点 Retry 直接回到原登录会话。兴趣编辑页仍显示已选 1 项，Gaming 勾选，Music 未勾选。 [选择数量截图](/home/miku/Pictures/Screenshots/ENMORI-2026-11-15-event/v69-11-interest-count-retained.png) [Gaming 选择截图](/home/miku/Pictures/Screenshots/ENMORI-2026-11-15-event/v69-12-gaming-only.png)

底部 Friends 显示 My friends、Activity、Discover 三个标签。My friends 显示搜索和 All、Starred 筛选。首次打开底部 Events 时，For you 默认选中，Browse 为可切换的独立标签。 [Friends 布局截图](/home/miku/Pictures/Screenshots/ENMORI-2026-11-15-event/v69-07-friends-tabs.png) [Events 默认标签截图](/home/miku/Pictures/Screenshots/ENMORI-2026-11-15-event/v69-13-events-for-you-default.png)

### v69 推荐与官网回跳

- For you 加载后的第一项为 PGL CS 2 Major Singapore 2026 的 12 月 10 日 17:00 场次。卡片显示 `Matches: Gaming` 和封面。按截图采样，从进入推荐页到看到结果约 53 秒，从打开 PGL 到看到详情约 29 秒。 [加载完成的推荐页](/home/miku/Pictures/Screenshots/ENMORI-2026-11-15-event/v69-14-events-for-you-load-result.png)
- 打开同一场次详情，点击 `Official event details`，在告知弹窗选择 `Open website`。Chrome 打开该场次的 Ticketmaster 选座页，地址为 `https://ticketmaster.sg/ticket/area/26sg_pglcs2major/3239`。使用 Android 返回键，ENMORI 显示 `Did you complete registration?` 和 No、Yes, mark Going 两个选项。 [外开告知](/home/miku/Pictures/Screenshots/ENMORI-2026-11-15-event/v69-24-official-site-disclosure-stable.png) [Ticketmaster 选座页](/home/miku/Pictures/Screenshots/ENMORI-2026-11-15-event/v69-25-ticketmaster-booking-stable.png) [回跳确认弹窗](/home/miku/Pictures/Screenshots/ENMORI-2026-11-15-event/v69-26-return-confirmation-stable.png)
- 选择 No 后弹窗关闭，同一场次的 Going 仍未选中。弹窗截图取自第二次真机复验的稳定画面，两次都选了 No。Yes 分支由隔离组件测试验证对该活动仅保存一次 Going。 [关闭弹窗后](/home/miku/Pictures/Screenshots/ENMORI-2026-11-15-event/v69-27-after-no-stable.png) [参与状态截图](/home/miku/Pictures/Screenshots/ENMORI-2026-11-15-event/v69-22-plans-idle-after-no.png)
- PGL 的封面在 v67 和 v69 详情均可见。v69 的 `About this event` 仍提示无法读取官网详情，手机未显示官网简介。现有封面来自供应商 API。新封面解析补丁已部署，但同一 Ticketmaster 公开详情从 Azure 仍返回 403。 [v69 活动详情截图](/home/miku/Pictures/Screenshots/ENMORI-2026-11-15-event/v69-16-pgl-detail.png) [云端抓取复核](event-regression-repair.md)
