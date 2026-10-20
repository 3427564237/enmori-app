# Events 下一批与首页好友动态 — 20 October 2026

- Status: PM-confirmed product direction; implementation and device acceptance pending.
- Decision owner: LI HOURUI.
- Source ID: S-PM-1020-LI-EVENT-BATCHES-FRIENDS-ACTIVITY.
- Human instruction: “活动界面最下面应该有个刷新按钮来获取新一批活动，而且主页要有一个好友动态部分来显示好友最近标记感兴趣的活动，最近的心情，checkin内容等等”。

## 明确范围与旧规则

保留 [19Oct 核心交付决定](2026-10-19-li-core-feature-delivery.md)、[真实 Events 合同](2026-10-15-li-real-event-contract-selection.md)、[18Oct 功能优先决定](2026-10-18-li-functionality-and-reliability-priority.md)、[Q17 字段边界](2026-09-01-recommendation-ai-field-allowlists.md)及[动态排序](2026-09-01-deterministic-v1-recommendation-formulas.md)。

1. Events 列表底部提供明确的“获取下一批活动”操作。此次授权补齐真正的下一批读取，局部替代 EB02 的无分页查询限制、EB 合同将分页排除在外的范围，以及 18Oct 仅重读第一批的执行限制。原 Reload 仍是刷新当前数据，不能把相同第一批重新展示称为“新一批”。
2. 首页需要好友动态区域及完整列表入口，展示当前好友最近 Interested/Going 的活动，以及获准签到中的 Mood、Note 内容。Mood 必须标为对应签到中的心情，不能推断为好友此刻状态。
3. 这局部扩展 19Oct“动态保留原字段范围”和 Q17 动态展示字段限制：Mood、Note 仅用于排序后经过授权的展示。Q17 的评分输入限制、七天候选窗口、既有确定性排序、用途/同意检查继续有效；不把内容送给排名器或 AI，不开放新的敏感推断。
4. “等等”不扩大字段：本次不在动态卡片增加精确位置、天气、私密记录、聊天或人设信息。可见活动标题/稳定 ID 和签到内容必须按当前来源权限读取。删记录、收紧可见性、撤回适用同意、解除好友后，旧卡片和详情不得继续通过服务端读取。

## 完整包与验收

沿用已有 SHI Events 包、JIN 好友/资料包，LI 负责最终 Home/router/真实主机接线。无需重新开始、换基线或另拆零散任务。授权在这两个包内补齐必要的最小分页/动态 DTO、现有 Repository、严格 fixture 和错误细节；不新增依赖、架构、持久化推荐副本或通用 Feed 系统。共享接口以 GitHub Draft PR 中的明确合同交付，不凭 UI 猜字段。

- SHI：下一批使用服务端控制的分页位置，不让客户端传供应商凭据或任意查询；跨批按稳定 occurrence/Event ID 去重，正确处理最后一批、空批、过期、失败重试、重复点击和账号切换。失败保留当前可用列表及分页位置，不自动绕回第一页或反复换序伪装新内容。Provider 浏览和兴趣推荐继续分别说明，不造标签映射或活动。
- JIN：首页摘要/See all 复用同一动态读取和授权；区分加载、没有可见动态、服务失败。展示实际参与/签到时间，导航按稳定源 ID 进入获准详情。Home 组合补丁交 LI；活动源接口未接线时如实标明，不填假活动。先授权过滤，再评分，再最小字段展示；客户端不能自行放宽源权限。
- 集中验证下一批/失败恢复/去重/末批，以及双账号动态内容/私有拒绝/撤权失效。组件通过不等于手机验收；本决定没有宣称上述新增功能已经完成。

## 当前接线事实

20Oct 在 v12 对应的保留环境，使用现有专用测试账号做一次读取：`GET /v1/event-browse` 为 200、18 条；`GET /v1/recommendations/events?view=home` 为 200、0 条；自己的兴趣接口为 200。未更改兴趣、同意或业务数据，未重启服务、发模型请求或重跑套件。

这说明推荐接口在此次读取时可用，不能把此前 v12 页面记录的“推荐服务不可用”泛化为 Events 列表不可用。此前瞬时失败原因仍未确定；空推荐也不证明已经完成下一批或动态功能。
