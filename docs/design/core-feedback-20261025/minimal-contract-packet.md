# 核心体验修复：首批合同核对与可复用交接

2026-10-25，Product / UX。共同基线 `087281e11ec5a681fd012b9d64431b225ed6f8ea`。
本文件是来源审计与交互交接，不创建推荐权重、共享 API 或新的 PM 决定。
控制来源为 [LI 核心体验修复决定](../../decisions/2026-10-25-li-core-experience-repair.md)。
Root 的以下规范已按精确提交全文读取，本包据此提供交互交接：

- `72fc616ca81d6d7703fc139600ce959d7a84dc9e`：`api/ai-today-context-contract.md`。
- `d8b88105b7cc7b176f08fa25eb5c6f90c7d5e141`：`api/own-avatar-contract.md`
  及核心反馈决定中的照片补充。
- `da73337fac9999ba7d60f14a4df8fe80ace361b4`：`api/event-detail-presentation-contract.md`。

## 1. 上位来源、具体冲突与可兼容路线

读取 `docs/SOURCE_MAP.md` 的归属后，直接从原资料仓库
`3427564237/nexus-five-project-records` 的登记快照 `5d4ac26` 取回下列原件。
GitHub 连接器不支持二进制 PDF，改用已授权的只读 `gh api`；未修改原仓库。
原件保留在本机证据目录，不向此仓库复制全文。

| 来源及归属 | 本次核对的原文位置 | 对本轮的约束 |
| --- | --- | --- |
| S-KD5，项目来源登记中的已确认 Sponsor 决定汇总；`Sprint5/Sprint_5_Key_Decisions_English.pdf` | 第 3 页第 15 条："The Homepage Top 2 must match the first two items in the corresponding See All result." 第 15 条还禁止 UI 独立重排。 | Home Event/Friend/Friends Activity 均保留完整排序前两项；PM 新反馈不能被 Product 或 Root 静默解释为可覆盖该上位边界。原 PDF 第 3 页已渲染目视核对。 |
| S-BR45，Member B 的正式增量需求包，不提升为一份新 Sponsor 签批；`Sprint4/Business Rules and Requirements Lead— Sprint 4.5.pdf` | 第 1 页区分业务边界与不在本包内的详细公式；第 4 页 S5-AC19/20、第 5 页 S5-AC24 规定 Top 2/See All 对齐与禁止 UI 独立重排。 | 与 S-KD5 一致；不能从示意图或 UI 文案推导新权重。 |
| S-BR5，正式 Sprint 5 增量包；`Sprint5/Business Rules and Requirements Lead — Sprint 5.pdf` | 第 1 页确定性 Backend 掌握候选、权重、评分与顺序；第 2 页及第 16 页 NIS-SN08 保留既有相关业务规则。 | 模型不能替代排名；“新文档日期更晚”不是范围外的默示替代。后续具备权限的明确逐项决定仍须保留变更轨迹。 |

这次核验按已有来源登记记录归属，不把历史 PDF 重新签署或升级权限。SHA-256：

- S-KD5：`c588331513f0ae91398de5eece3a79002b3f5de55f6c29ca3bc2b04bdcc71f80`。
- S-BR45：`b897d3c983e95b999ba2c238b5b7dae3dfbdd8b273e6978e7e78f52674a50298`。
- S-BR5：`1fea055278e6cb01e542132006571325705d195dd6fde9e580155835eac3e8be`。

**Root 提出的最小路线符合上述 Top 2 边界：** Home 保留两条精选及真实刷新；
“继续发现／换一批”进入完整 Backend 排序的推荐列表，定位到已展示组之后的第一条。
原前两条仍保留在该列表，可向上返回查看；不得过滤掉它们后声称新列表就是原完整排序。
首次可直接定位精选之后的第 3 条。后续只用当前账号会话内的稳定 ID/位置继续浏览，
不新增云服务、曝光数据库、持久化推荐副本或权重。

成功后才推进位置；空结果、真实耗尽、来源失效和读取失败分别说明。
“刷新推荐”拿到同组可以如实显示已更新，不能称获得新一批。
新快照发生变化时按稳定 ID 与新的完整顺序定位，不能沿用越界下标或打乱结果。
复用现有来源有效期；不要用永久 RAM 快照延长供应商内容生命周期。
Events 浏览的 Next 继续使用真正的服务端 cursor，失败保留原列表与位置。
若将来必须直接把 Home 前两条换成第 3 条以后的内容，则另需具备相应权限的明确解决；
本交接没有作出该批准。

另有一项**既存受影响语义冲突**：S-KD5 第 1 页第 4 条及 S-BR45 第 4 页 S5-AC12
要求 Interested/Going 独立，而 [20Oct P01–P06](../../decisions/2026-10-20-li-event-participation-selection.md)
采用互斥状态。已报告 Root；本轮不借推荐展示修复改写参与状态、迁移数据或声称新 PM
记录自动越过 Sponsor。本轮新增展示应诚实呈现当前实际状态，避免推断已参加或已购票。

## 2. 推荐因素：已有、尚缺与不能混用的用途

现行准据为 [Q03](../../decisions/2026-09-01-deterministic-v1-recommendation-formulas.md)、
[Q17](../../decisions/2026-09-01-recommendation-ai-field-allowlists.md)、
[Q04-DEV-08/09](../../decisions/2026-09-02-ui-baseline-visual-acceptance-contract.md)。

| 因素 | Event v1 | Friend v1 | 可立即交付或所需差异 |
| --- | --- | --- | --- |
| 有效兴趣 | 分数为有效 InterestTag 交集个数。分数降序、开始时间升序、ID 稳定排序。 | 共同兴趣数 × 2。 | 沿用真实目录/已批准映射、现有排名及真实原因文案。不造活动标签。 |
| Interested/Going | 朋友参与及人数不进入当前 Event v1 分数。 | 两人的获准 Interested∪Going 交集，每 Event 只算一次，乘 1。 | Friend 现有公式及目的授权投影可复用；Event 详情可显示已授权参与信息，但不能称其已影响推荐名次。 |
| 位置/地区 | Q17 未允许进入评分。 | 同样未允许。 | 手填地区/GPS 同步获准用于资料显示，不等于地理推荐用途。地理范围、粒度、缺失行为、目的同意和版本需明确差异。 |
| 年龄 | 无获准评分输入。 | 无获准评分输入。 | 当前 ProfileDetails 没有 DOB/年龄；不可为此默默收集生日或推断年龄。 |
| 学校/组织 | 无获准评分输入。 | Q04 明确排除 campus/school/year/role 等 v1 原因。 | 19Oct 已允许学校/公司资料类型与名称，但只“存得到”不授予评分用途。新用途/可见性/版本/权重需另定。 |
| 头像、简介、Check-in、Persona | 不评分。 | 不评分。 | 仅在各自允许的展示或 AI 用途内使用；来源共享不等于跨用途授权。 |

Event 候选仍需满足已批准的 active/published、有效未来活动和正兴趣匹配条件；
不能为“换一批”塞入不合格条目。Friend 同分依次按共同兴趣数降序、共同活动数降序、
candidate ID 升序，不由 UI 重排。浏览目录与推荐结果的资格不能混为一谈。

Friend 的实现证据在 `backend/src/friend-recommendations/domain/friend-ranking.ts`、
`infrastructure/firestore-friend-recommendations.ts` 与
`backend/src/bootstrap/social-event-source.ts`：先核对当前参与可见性和来源，再构造
共同 Event 投影。缺少来源服务不应假造“共同活动为零”。这些是源码接缝，未证明当前
运行服务或用户账号已经返回相应原因。可能认识的人入口可复用
`FriendDiscoveryPanel`、现有 `home`/`all` repository 与关系/忽略/会话保护；
Home 与 Friends 的可发现入口由 Root 接线，不另造搜索算法。

**首批不改评分。** 先交付兴趣原因、真实共同活动计数及已授权朋友参与信息；
区分“推荐原因”和“朋友的参与信息”。新 Event 社交分数、地理、人口或组织分数
只列明确目的、字段、缺失/撤权行为、版本与权重差异，不能自行填数字。

## 3. 自动当天签到：已落盘的最小行为

以下使用 Root `72fc616c:api/ai-today-context-contract.md`，取代本轮稍早的候选讨论。
它补充 LI 的自动当天授权，不取消原 unknown、草稿、Persona 和来源权限规则。

| 场景 | 交互与实现合同 |
| --- | --- |
| 何谓当天 | 复用 `HistoryDevicePort` 获取规范 IANA 时区。客户端不传 date/asOf/cap；服务器在同一 trusted asOf 推导当地 `[00:00, 次日00:00)`，再限制不晚于 asOf。复用 `parseCivilDay` 的 DST 处理，不能固定减 24h 或默用 UTC 日期。 |
| 有多少条 | 服务端按 `createdAt DESC, document ID DESC` 读最多 6 条，前 5 条入选，第 6 条只用于 hasMore。排除后不补第 6 条。显示“最多参考今天最近 5 条”，不知道总数时不伪报总数。 |
| 普通聊天 | 自动参考默认随当前话题的已启用本地 AI 用途打开。正常显式 Send 内 fresh prepare→一次 execute；不要求先进入 picker、不要求常规预确认。合法 0 条也可聊。 |
| 可理解控制 | 用“今天的签到 · 本地参考”和“此话题使用今天的签到”。排除条目说明“在此话题中不参考”，在当前 session/topic RAM 保存 source ID 意图，用每次 fresh keys 提交。新话题/账号替换清理；不扩大为永久画像。 |
| 关闭 | 关闭当前话题引用使用已有 explicit `sources:[]`。不关闭 AI、不删除签到。仍需验证 inherited history 的来源依赖，不能通过关闭后悄悄复用带来源的旧回答。 |
| 来源未知 | 显示签到暂未加载及可操作的重试/关闭此话题签到参考路径；不得把失败标为 0 条，不能静默降级后直接发送。用户明确关闭后可继续，但原 operation 若 unknown 仍先核对。 |
| 需要确认的冲突 | 实际 inherited-history 依赖冲突显示完整有限 pair，保留草稿；用户选择排除后 fresh prepare。旧排除意图只能按相同完整 pair 身份映射到新 keys，集合变化重新审阅；不复用过期 keys。 |
| 午夜/编辑/删除/会话切换 | 保留 draft；失效旧 preparation，按新的授权版本核对。跨 civil day 不能接着接受昨天的准备。实际冲突需恢复，不自动重放；unknown 只走原 operation GET/原保存 U Retry。 |

基础代码可复用 `lib/app/home_today_provider.dart` 的设备时区接口、
`backend/src/check-ins/application/check-in-history.ts` 的日界、已有 owner/date
查询和 selected-reply 的原 token/expiry/执行状态机。Home 的“三条摘要”及其 UI 缓存
不能作为模型上下文权威。自动分支只增加规范的 today metadata 与 owner UI 排除映射
ID，模型输入仍仅 Note、记录时的 Mood/Activity 和原发生时间；没有天气/坐标/朋友记录。

App 已报告独立 widget/IME 对照：0 选择普通输入两种 UI 可发送；选择一条后 Back，
`canSend=true` 且草稿非空，但 `_selectionReady` 令 Send callback 为空。
这是作者已复现的本地门控路径，不等于 LI 手机症状的唯一根因，也不沿用旧 389 测试
宣称新行为已通过。修复应把准备动作移入显式 Send，同时保留已有排除意图，不能直接
绕过 selected path 调用普通 Send。

## 4. 跟进：先把已有流程变得可发现、可恢复

当前 AI drawer 的“明确跟进”实际进入设置/已有预约；新建功能位于已保存本人消息的
“稍后跟进”动作，使用 `SavedFollowUpSource` → `onFollowUpRequested` →
`ProactiveFollowUpPage`。这两种用途应清楚分开：

- 入口 **“稍后联系我”**。说明：“选一条已发送的消息，约定稍后在此话题联系。”
  可从当前话题的已保存本人消息选择一个，再复用原 source-bound callback；草稿不能
  伪装已保存消息。无合格消息时显示先发送消息的原因与返回聊天动作。
- **“管理预约”** 显示已有预约、暂停/关闭/取消与各自结果。选择时刻仍需明确确认
  当地时间/IANA/合法候选，保留已有 quiet/数量/冷却规则；不自动更改设置替用户预约。
- 设置/预约读取失败显示“暂时无法加载预约”，有原 GET 恢复；未知创建/取消继续核对
  原操作，保留字段。未知不是关闭，也不是可再次创建。
- 应用内跟进与系统推送分开。Delivery 静态核对 `canSchedule` 不依赖 pushEnabled、
  系统 permission 或注册；D1 未配置不是已证实的 F0 门禁原因。系统推送可暂缓，
  应用内陪伴、消息/来源权限与实际后端可用性仍须交付。此结论未执行真实预约。

沿用仓库 UI/UX Skill 的可操作错误恢复原则，增加具体原因和恢复动作，不用泛“未知”
或单纯禁用按钮让用户猜。消息创建、设置保存及系统通知权限不是同一个成功状态。

## 5. 自己的照片：存储复用与隐私最小差异

LI 明确需要上传自己的照片。Root 已在 `003a79e` 持久化照片选择与首批呈现范围，
并在 `d8b8810` 完善 `api/own-avatar-contract.md`；不再停留在候选建议。
19Oct 的 BIO/学校公司/地区批准本身没有照片输入或上传接口；新规范保留该变更轨迹。

复用已完成账户的 owner binding 和 `accounts/{accountId}`，但采用独立的
`/v1/me/profile/avatar` GET/PUT 与 `avatarRevision`，不复用或修改资料 revision。
Android 系统选图只读取用户显式选择的图，生成每边最多 256px、最多 128KiB 的
小正方形 PNG 预览，重新编码去源 metadata；原图不复制进应用存储或上传。
格式、字节/像素/解压边界、校验、透明度和完整 PNG 终止由 Root 规范；不新增依赖、
第三方存储或任意外链。

具体交互/兼容规则：

1. 选图只是本地预览；Save 才上传。取消保留旧照片。失败/未知 PUT 保留草稿，
   通过 owner GET 的递增 revision 和照片摘要核对，不自动重发；未变化或不一致的
   回读不能证明原写入无效果。显式删除与替换分开，删除同样需要 revision。
2. 首批只在 owner Home/Profile 显示，明确说“目前仅自己可见”，不默认改为 Public。
   资料原本公开也不代表照片自动公开。如将来扩展他人资料照片，Root 需明确纳入现有
   ProfileVisibility、关系/屏蔽/资格/当前会话检查后的投影，不因有 bytes 或 URL 即公开。
   不顺手扩张 Friend 推荐、参与者预览或 AI/source DTO；照片不进入排名或模型。
3. 存储缺字段代表无照片/revision 0；已存在但损坏的状态不可假装无照片。
   头像 null 明确删除；旧资料写请求不接触头像字段，避免旧完整保存覆盖新值。
4. **真实兼容风险：** v28 `BackendAccountPreferencesRepository._profile` 严格检查
   返回 key 集合；默认 GET 即使只新增 `avatar:null` 也会破坏旧客户端读资料。
   Root 已选择分开的头像 GET/PUT，保留旧 `/v1/me/profile` 响应与保存形状。
   这解决了合同设计上的冲突，仍需实现回归证据；不能仅凭 optional 就称向后兼容。
5. 会话替换、离开和后台等失效边界阻止晚到结果显示另一账号照片；前台重新读取
   当前权威状态。显示与预览按当前账号/版本作用域，不让另一账号看到旧照片。
   无效/不可读照片保留可理解占位和恢复状态，不用其他人的照片替代。

昵称右侧的“查看资料／编辑资料”是导航，不是自动公开资料。用现有触控尺寸与可访问
标签，不能为了紧凑只留不可解释的小图标；头像选择与资料范围必须可分别理解。

## 6. 活动详情与外跳：已规范的核心范围

Root `da73337f:api/event-detail-presentation-contract.md` 明确应用先打开自己的
可用详情，再提供外部动作。Delivery 负责既有 BrowseDetail/EventDetail 的真实来源
投影和详情呈现；Root 负责共享入口接线，不用购票按钮替代详情。

- 简介使用当前 Ticketmaster occurrence 实际返回的 `info`，再退到安全纯文本
  `description`；不抓网页、不造摘要或替供应商翻译内容。缺字段明确未提供。
- 封面仅取该 occurrence 的实际 `images`，按已批准 HTTPS `s1.ticketm.net` 白名单。
  仅当前可见详情在来源披露后加载；说明图片会直接连接 Ticketmaster CDN。图片失败
  保留标题、时间、场地、已有简介和操作。沿用五分钟来源寿命，不落盘、不延长缓存。
- 地点使用实际场地名称及获准长度内的实际地址；不补地理编码服务，不用坐标当可读
  地点，也不在来源缺失时猜测。内容与图片在既有失效/退出边界清除。
- 实际验证的 `externalSourceUrl` 标为 Ticketmaster 购票/预订；外部页面和选座流程由
  Ticketmaster 控制。“查看活动介绍”只有在另有真实、单独验证的活动信息 URL 时显示，
  不能给同一购票链接换个标签冒充两个目的地。

上述是已冻结合同的交接，未代表本轮已获取真实活动、成功加载封面或测试外部购票。

## 7. 本轮可直接并行的第一批与保留项

| 第一批 | 复用与责任 | 明确不冒充已完成的部分 |
| --- | --- | --- |
| 普通发送＋自动今日引用 | App/Context 实施 Root 已落盘 today 合同；独立 QA 原门控与新分支。 | 当前真实服务接线、LI 手机唯一根因与模型语义仍分开。 |
| 推荐可发现与继续浏览 | Root 复用 Home/FriendDiscovery/完整有序结果；Events 真 cursor。 | 不增新权重；Home Top 2 不改。 |
| 完整活动详情 | Delivery 复用稳定 Event ID/既有详情；补许可允许、实际可取得的封面/简介/可读地点。 | 缺字段明确未提供，不造内容；不能用直接购票替代详情。 |
| 稍后联系我/管理预约 | App 复用 saved-U callback、F0 创建/管理；Root 后端接线。 | 系统推送、权限和云端配置可分开暂缓，不能删掉应用内陪伴。 |
| 照片与昵称旁入口 | Root 账户/媒体/Android 与共享 Home；按已落盘的 owner-only 照片合同。 | 摄入、保存/回读、隔离与旧客户端兼容仍需实现和验证，不以默认图案验收。 |

保留原模型失败/未知账目，不开启云端配置、模型自动切换或无边界调参。
不清扫历史 58 项失败来扩大这一轮范围。所有例证区分源码、作者测试、独立 QA、
实际服务、APK 与真机；没有新的部署、真实账户写入或通知发送授权。
