# onePA 降低优先级：只读范围审查

2026-11-18。检查点源码 `04f80272027f582c61c524c6cbec2a4dcb5b9578`。输入是本轮用户原话：“onepa不能稳定就降低优先级吧，不需要在应用里面说明”。本报告只定位已有权威、实现和可选最小范围，没有改代码、发出服务请求或操作设备，也不将下列方案记录成已批准的新业务规则。

**主任务已采用下述最窄解释并向用户说明：**降低本轮 onePA 调查优先级，不在应用新增取舍说明，不改排序、采集等待或已有恢复。SC-03 作为可延期的外部来源限制保留，根因未关闭；源身份验证、数据隔离、安全拒绝与五分钟过期规则仍不可降级。PM 决定和验收 gate 由主任务另行持久化，本报告不替代决定。后文 UI 简化表仅是已分析的备选范围，**本轮不实施**。

## 可直接采用的最小解释

降低 onePA 故障继续调查的优先级，把未完成的真实来源恢复留在内部已知限制；应用不新增“我们降低了 onePA 优先级”之类工程解释。已有推荐、Browse、来源采集、后台预热、超时、排序和数据保护均可保持。这样不需要用户再决策一个未提出的运行策略，也不能宣称 onePA 已稳定。

如果用户的实际意图是“用户请求不再等 onePA”“减少 onePA 结果排名”“暂时不使用 onePA”或“删除所有部分结果提示”，这些分别是运行契约、排序或已批准提示的变化，须先明确是哪一种。不能从降低调查优先级自动推导任意一种。尤其原来的 Ticketmaster-first 是来源调研/接入顺序，不是现在运行时必须先响应 Ticketmaster 的保证。

## 批准来源及冲突边界

| 来源 | 具体约束 | 对本轮的影响 |
| --- | --- | --- |
| [25 September 来源优先级](../../decisions/2026-09-25-sprint3-event-source-priority.md)，第 12–18 行 | Ticketmaster first、onePA second，范围是 Sprint 3 来源选择与研究；第 18 行明确 reported Sponsor onePA preference 并非正式 Sponsor 决定。 | 支持降低 onePA 后续研究优先级，不能用它覆盖后来已批准的双来源运行规则。未发现必须把 onePA 作为最高优先级的正式 Sponsor 约束。 |
| [28 October 双来源整合](../../decisions/2026-10-28-li-event-profile-discovery.md)，第 8、20、24、34 行 | 已批准双来源、真实来源归属和详情；来源失败提示是真实降级，不等于详情功能完成。 | 推迟调查不能写成来源恢复或详情已完整。不能顺便删除来源身份、真实缺失字段或报名边界。 |
| [15 November 兴趣优先排序](../../decisions/2026-11-15-li-event-interest-first-ordering.md)，第 16–19 行 | 兴趣匹配组优先，组内原分数、开始时刻、稳定 ID；完整候选集排序后再取 Home Top 2。 | 引入 onePA 降权、置底、未等待完整候选集就先排名，会改变同层已批准规则。 |
| [17 November 兴趣/发现迭代](../../decisions/2026-11-17-li-interest-discovery-uiux.md)，第 49–51、58–60 行 | 中断/失败不能声称无匹配；空态与来源不可用分开说明，包括有结果的降级状态；保持冻结 sourceStatus。 | 全删部分来源失败提示会与已批准 UI 冲突。这里并未规定必须用品牌名 onePA 展示技术原因。 |
| [17 November 查询级降级](../../decisions/2026-11-17-li-supplemental-query-degradation.md)，第 15–19、31 行 | 默认组必须成功；所有补充任务须在原 180 秒预算内结算；只接纳完成组。空与非空结果均有双语范围不完整提示，与全来源不可用分开。 | 提前返回在途部分结果、缩短源预算、降低查询范围，均非纯文案修改。第 31 行的具体“部分兴趣查询无法加载”解释可在明确记录本轮窄文案调整后改为用户可理解的范围说明，但不能静默假装完整。 |
| [17 November 性能/预热选择](../../decisions/2026-11-17-li-activity-loading-performance.md)，第 26–32 行；[11 November 预算](../../decisions/2026-11-11-li-measured-onepa-wait-budget.md)，第 7–9 行 | 一次/五分钟、无重叠预热；前台用有效目录或加入已接纳在途周期；180/210/225 秒边界；不过期续命、不陈旧回退。 | cache-only、不等待在途 onePA 或修改预算都需要单独的窄运行策略决定；不得以“降优先级”暗改。 |

以上直接相关决策均为 PM 层。当前用户可以明确更新自身既有决定，但需保留旧来源并由主任务在 `docs/decisions/` 记录具体 supersession 范围。没有发现更高 authority 要求向普通用户展示 onePA 的技术故障诊断。来源归属/实际内容、第三方连接和隐私披露仍受原批准来源及适用提供方义务控制；本轮没有重新审核外部条款，不能借此声称可删除一切来源标识或披露。

## 当前实现：优先级与等待是不同维度

- `backend/src/event-browse/infrastructure/combined-event-source.ts:65` 同时调用 Ticketmaster 和 onePA，`Promise.allSettled` 等待两者结算；单源失败后保留另一来源，首批失败状态保持到本次列表结束。合并结果在第 135–138 行按开始时刻和 browseId 排序，没有 onePA 优先权重。
- `backend/src/event-browse/infrastructure/controlled-source-projection.ts:136` 才把全部已接纳来源页面组成完整推荐快照，最多 210 秒；后页丢失原可用来源不把未完成前缀当成功。此快照也被社交读取复用，所以改变等候不只影响一处卡片。
- `backend/src/event-recommendations/domain/rank-events.ts:99` 实现已批准兴趣优先、分数、开始时刻、稳定 ID 顺序，不含 provider 权重。给 onePA 减分或置底不是可靠性修复。
- `lib/features/event_participation/presentation/participation_events_page.dart:148` 在默认“来源顺序”下保留 Backend 顺序；显式时间排序才本地重排。该标签不表示 Ticketmaster/onePA 来源优先级。
- `lib/features/event_recommendations/data/backend_event_recommendation_repository.dart:25`、`lib/features/event_browse/data/backend_activity_repository.dart:118` 和相关好友读取使用原 225 秒客户端预算。`onepa-browse-source.ts:217` 起保留五分钟预热/前台共享 admission。只修改展示文字不会缩短实际等待。

## 如需去掉现有技术性 onePA 说明：最小 UI 范围

以下是供主任务选择的文案/布局范围，不是本报告已执行的变更：

| 当前展示 | 可简化范围 | 应保留的任务语义 |
| --- | --- | --- |
| Home/For you/独立推荐 `_SourceAvailabilityNotice`，`event_recommendations_page.dart:773`；动态写出 `onePA is temporarily unavailable…` | 删除品牌故障诊断表达，改用一般“部分活动暂时无法加载，当前仅显示可用结果”。 | 已知部分失败与正常空结果不同；刷新可恢复。状态字段及解析不变。 |
| Browse 的 `Ticketmaster: available / onePA: unavailable` 状态行，`participation_events_page.dart:476` | 删除逐供应商运行状态列表；若存在部分失败，用同类简短通用结果范围提示。正常来源全可用时无需展示“可用”状态表。 | 有卡可继续浏览；没有结果时仍准确说明“当前可用范围”，不虚称全站无活动。 |
| `lib/core/presentation/event_source_coverage_notice.dart:34` 的 `onePA 部分兴趣查询…` | 去掉 onePA 专名和内部“查询”术语，表达“部分活动暂时无法加载，当前活动范围不完整”。 | 显式 incomplete 条件、空/非空都显示、完整刷新后消失；与完全不可用不混为同一状态。 |
| 加载超过十秒的等候提示 | 如需简化，可保留“加载时间较长，可停止等待或稍后重试”，无需点名来源或说明工程排期。 | 仍可 Stop/Reload/离开；停止只结束本地等待，不虚称服务端已取消。 |

本句不应自动扩大到移除活动卡和详情的真实 sourceName、官方链接、费用/余位需登录确认、缺失正文/截止时间等事实，也不应删除 About/privacy 的第三方连接披露。发生完整失败、过期或点击失败时，必须继续有能完成任务的通用错误、重试、返回路径及已保存计划不受影响的说明；不能靠隐藏反馈把失败变成成功空态。

**建议主任务落地顺序：**先把 onePA 调查降为非本轮优先项，应用不新增工程解释。若决定本轮顺便简化已存在的技术文案，先记录上述 UI-only 窄范围，保留通用结果范围反馈；以双语、空/非空、部分失败/完整恢复的 widget 回归验证。后端来源顺序、超时、查询数量、排名、API 字段和预热均不触及。只有用户明确需要“请求不再等待 onePA”等运行变化时，才提出对应具体方案及所需决策。

本轮没有执行测试；这是权威/代码只读分析，不能代替 UI 修改后验证、部署或设备验收。
