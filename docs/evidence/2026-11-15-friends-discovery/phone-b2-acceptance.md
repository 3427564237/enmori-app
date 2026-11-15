# B2 后端 Android 活动复验 · 2026-11-15

实体设备为 vivo V2405A。Android 仍安装 `com.enmori.app.group`、versionCode 69、versionName `1.0.0-events20261115`。本次使用同一设备和安装记录核对 Japan East B2 单实例上的 v70 后端（`bb89730`）。手机侧只查看现有活动和兴趣。 [上次 Android 验收](phone-regression-acceptance.md) [B2 试验范围](../../decisions/2026-11-15-li-event-content-performance.md)

后端 onePA 列表于 09:59:38 UTC 完成，Ticketmaster 的最后来源观察于 09:59:41 UTC 完成；完整推荐读取随后返回。进入 For you 时距上述推荐请求发起约 5 分 23 秒，onePA 另有读取缓存。本轮手机从已有进程恢复前台，缓存命中情况未验证。以下时间为 UTC，以入口操作及首次稳定界面节点为采样点。

## Ticketmaster 与个性化推荐

手机由休眠恢复并解锁后，10:04:14.725 切回原 v69 会话，原先停留的 PGL 详情自动发起重读。随后返回 Events 进行推荐检查。

| 真机操作 | 开始 | 首次稳定观察 | 间隔 | 结果 |
|---|---|---|---|---|
| 返回 Events → For you | 10:04:29.595 | 10:04:55.581 | 26.0 秒 | 首条为 PGL CS 2 Major Singapore 2026 的 12 月 10 日 17:00 SGT 场次，显示 `Matches: Gaming` 和封面。 [推荐首屏](/home/miku/Pictures/Screenshots/ENMORI-2026-11-15-event/b2-v69-03-for-you-result.png) |
| 点击该 PGL 场次 | 10:05:20.234 | 10:05:28.963 | 8.7 秒 | API 提供的封面仍显示，`About this event` 明确提示无法读取官网详情。 [PGL 详情](/home/miku/Pictures/Screenshots/ENMORI-2026-11-15-event/b2-v69-04-pgl-detail.png) |

这次 PGL 详情缺少官网简介。独立 B2 后端诊断在 10:00:19 UTC 观察到 Ticketmaster 主页 403，并在 4.471 秒内记录 `EVENT_READER_HOME_ACCESS_DENIED_UNAVAILABLE`。

## Browse 与 onePA 详情

| 真机操作 | 开始 | 首次稳定观察 | 间隔 | 结果 |
|---|---|---|---|---|
| Events → Browse | 10:06:17.004 | 10:06:51.048 | 34.0 秒 | 浏览列表按来源顺序显示，Ticketmaster 和 onePA 均为 available。 [Browse 首屏](/home/miku/Pictures/Screenshots/ENMORI-2026-11-15-event/b2-v69-06-browse-result.png) |
| 打开 Karaoke Club @ Punggol 21 CC (December 2026) | 10:08:49.283 | 10:08:54.673 | 5.4 秒 | 显示 onePA 来源、日期和场地。About this event 展开显示活动日程、取号和报名细节，正文无障碍节点为 1,685 字符。封面位置明确显示 `No cover provided by source`。 [onePA 活动详情](/home/miku/Pictures/Screenshots/ENMORI-2026-11-15-event/b2-v69-08-onepa-description.png) [滚动后查看简介](/home/miku/Pictures/Screenshots/ENMORI-2026-11-15-event/b2-v69-09-onepa-full-introduction.png) |

计时是本次手机交互采样，单次结果包含客户端、网络和服务读取。onePA 详情依据同一场次的一次读取验收。

## 兴趣保留

10:09:47.788 打开 Profile，进入兴趣编辑页。10:10:45.111 完成核对，显示已选 1 项，Gaming 勾选，Music 未勾选。退出编辑页时保留原选择。 [选择数量截图](/home/miku/Pictures/Screenshots/ENMORI-2026-11-15-event/b2-v69-10-interest-count.png) [Gaming 勾选截图](/home/miku/Pictures/Screenshots/ENMORI-2026-11-15-event/b2-v69-11-gaming-only.png)
