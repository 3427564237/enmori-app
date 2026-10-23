# 首页活动修复由 LI 当前聊天接手

- Status: PM-confirmed.
- Source ID: S-PM-1020-LI-HOME-EVENTS-REPAIR.
- Human instruction: “要分给他吗？如果还没分，你就直接用我这个修复吧。”

本次首页推荐故障尚未单独通知 SHI。LI 当前聊天直接接手首页活动接线、失效/失败状态修复和本机验证，局部替代此前把该修复写入 SHI 完整包的分工。SHI 原 Events 参与、外部报名保护、下一批任务以及 JIN 首页好友动态范围保持原分工；不等待其新包，也不重复实现其业务模块。

首页沿用现有后端推荐 Repository 和 Top 2 卡片；保留手动浏览入口和推荐完整列表。前后台/五分钟失效只说明需刷新，不能凭客户端失效声称后端不可用。真实请求失败保留失败提示和 Retry；空匹配保留 Q16 空态及显式 Refresh，刷新是一笔正常读取，无自动重试循环、随机补位或扩大 Music 映射。

保留 [Q16](2026-09-02-recommendation-empty-result-contract.md)、[19Oct 核心交付](2026-10-19-li-core-feature-delivery.md)、[下一批与动态范围](2026-10-20-li-event-batches-friends-activity.md)。本次不改变后端合同、兴趣或数据同意，不把组件验证冒充手机/供应商全链路验收，不合并 main。
