# ZHOU 真实 AI 剩余合同集中包

## 当前送审入口（2026-10-13；以下本地成稿历史保留）

用户随后明确授权将本包、本地源码和测试证据上传给 JIN、LI 审核，见[后续上传指令](../decisions/2026-10-13-user-zhou-local-ai-development-scope.md#subsequent-publication-instruction--13-october-2026)。本批将以已接受 #92 `029437c5939bfb50643254a7a976bf7fc70c8c12` 为基线独立送审，不改 #90／#92 的旧 head。精确新 head／tree 和证据链接固定于新 Draft PR 正文及回读确认的交接评论；[本批提交证据清单](../evidence/sprint3/2026-10-13-zhou-real-ai-submission-evidence.json)记录实际源码绑定、测试日志与相对本地成稿的文档增量。以下“本地／未上传”及 local-manifest 描述只反映上传前快照，不再限制本次已授权送审，也不表示本包已获批准。JIN 审新源码／协议；LI 集中决定剩余合同并在相应实施后限定验收，四项 F01 不再重复确认。未获批准前不合并、关闭任务或变更看板。

日期：2026-10-13，SGT（UTC+08:00）。状态：**本地完整候选，未上传、未提交，未获本包的正式 JIN 审查或 LI 剩余合同选择**。ZHOU 提案与已授权 AI 局部开发；JIN 审查实际新增差异；LI 选择剩余物理／用途／保留条款并承担自己的 producer／共享入口交接，DU 提供自己 Note producer 的明确保证。

本包按四组剩余差异合并 N02、F03、R-A 恢复、C-A 完整清理。F01 四项产品选择已经解决，#92 限定能力验证已经验收；两者均不再列为 Pending 或重复审批。其余具体候选在下文完整展开，尚未选定的 schema、索引、producer 用途、记录保留和运行配置仍是候选。当前用户要求本地推进合同、技术核对与限定开发，未授权本轮上传；独立政策函数的本地开发不等于真实 adapter 开工或运行启用。

## 1. 来源、范围及旧文保留

| 来源 | 精确范围与本包用法 |
| --- | --- |
| [原 #90 全文](https://github.com/3427564237/enmori-app/blob/99583d6bd601ba51c577d46901b3e07e389e6fd8/docs/planning/2026-10-12-zhou-real-ai-slice-closure-proposal.md)，[本地旧文](2026-10-12-zhou-real-ai-slice-closure-proposal.md) | 固定 head `99583d6bd601ba51c577d46901b3e07e389e6fd8` 的 **555 行正文全部保留**，不覆盖旧提案、旧分支、失败及 Not Run。#90 的 JIN review `5491753860` 仅是原文档／技术审查，不是所有候选已获 PM 选择。下文只对齐后续明确决议并集中剩余合同。 |
| [S-PM-1013-LI-DELEGATED-F01-BCD](../decisions/2026-10-13-li-delegated-f01-b-c-d-selection.md) | 源 #66 `20ff6cfc01ec0caaa7f811ec3d9d4eec547f2072`；blob `566f48b64712f89cd919ec4b483c6b92d259c004`。人类 LI 明确委托“你帮我决定即可”后作出四项选择，不描述成 LI 分别逐行回复接受。选择控制 first isolated synthetic Auth／Firestore／fake Qwen Note-only 方向的前瞻规则修订；不覆盖更高层义务。 |
| [四项产品选择说明](2026-10-13-li-real-ai-product-choice-brief.md) | 同 `20ff6cfc`，blob `bb0f69f23dc61f0a883a4286d890b6581e8fdc27`；保留为决策前说明及授权轨迹，不重新使用旧回复格式要求 LI 重选。 |
| [#92 限定验收](../decisions/2026-10-12-li-ai-capability-slice-acceptance.md) | 同 `20ff6cfc`，blob `c2b5335317d209ffda48b17a36f3569a1a4dae02`；accepted head `029437c5939bfb50643254a7a976bf7fc70c8c12`。能力观察与边界保持；其中早于新决议的 F01 尚未选择／严格旧义状态，仅在新决议明示范围被替代，不重写验收正文。 |
| [LI producer 交接草稿](2026-10-12-li-ai-producer-and-shared-entry-handoff-draft.md) | 同 `20ff6cfc`，blob `1c10740a4e10f309574dd43f436c675408ba7d4c`，与先前 `d76804c` 内容一致。是 source-bound 准备，不是已经完成的 AI reader／schema／用途授权。 |
| [LI 下一交接](https://github.com/3427564237/enmori-app/pull/90#issuecomment-6138396835)、[催办](https://github.com/3427564237/enmori-app/pull/90#issuecomment-6138420133)、[职责澄清](https://github.com/3427564237/enmori-app/pull/90#issuecomment-6139863614) | 四项 F01 不再等待；剩余差异集中一次交 JIN、LI。LI consent/purpose 与共享接入不转交 JIN，DU 给既有 Note/time/source 保证；不增加截止、合并、关闭或修改看板。 |
| [JIN 四组新增差异清单](https://github.com/3427564237/enmori-app/issues/44#issuecomment-6138916347) | 本包第 3–6 节逐项响应：N02 库存／保留、F03 producer、unknown／recovery、完整 cleanup。该评论是审查准备与范围交付，不是本包 APPROVE；本地代理核对也不记作正式 JIN。 |
| [LI 条件 A](../decisions/2026-10-12-li-isolated-note-conversation-conditional-a.md)、[并行交付](../decisions/2026-10-12-li-parallel-delivery-reissue.md) | 已选 N01／N04／N05／N06／N07 方向及 F02。#88 客户端 R1／R2 和已接受共享组件不重开审批；实际新 delta 单独核对，局部 hold 不冻结其他已批准工作。 |
| [Q17](../decisions/2026-09-01-recommendation-ai-field-allowlists.md)、[Q19](../decisions/2026-09-01-persona-conversation-lifecycle.md)、[Q31](../decisions/2026-09-02-qwen-runtime-failure-contract.md)、[Q14](../decisions/2026-09-02-retention-logging-audit-policy.md)、[Q30](../decisions/2026-09-01-backend-architecture.md) | 未被 competent authority 明文修订的已定规则继续生效。C06 原文固定 blob `1d63c7573d84da47cd07379d52fe1a66cf015a81` 及严格同步 fake-Port 行为保留；代码或探针均不自行改变业务要求。 |
| [本轮本地开发范围](../decisions/2026-10-13-user-zhou-local-ai-development-scope.md) | 记录当前用户授权及纯政策开发边界，不冒充 LI 已选 N02／F03／R-A／C-A，不授予部署、索引变更、真实模型或普通构建接线。 |

旧 #90 的 F01-A／B／C／D 候选保留作 supersession trail；现在按下节选择执行相依的政策推导。旧文 Slice A 的“尚未释放／全部 Not Run”已被 #92 的四项限定观察替代；旧文提及 name-only group／wildcard／cursor 的实验不在 #92 释放范围，不能倒推 #92 未完成或要求重跑。旧文的 2026-10-12 上传授权不用于本轮外部写入。

首切片仍是 Note-only、synthetic Auth／Firestore、fake Qwen。实际存储／生产者适配没有在本包中被自动释放。M27 正式落地位置、live Qwen／tokenizer／host、普通／demo／真实数据运行与索引启用、Recommendation 解释条件范围仍按 E01–E04 独立处置；它们不是本包全部工作的统一前置门槛。Account 删除 Q27、saved Note edit、Trash／Restore、新通知／搜索／对话列表／恢复执行不在本包新增范围。

## 2. 已选择 F01：本包统一使用的四条规则

| 已定行 | 确切新语义 | 不得推导出的结论 |
| --- | --- | --- |
| F01-B：terminal 与提交顺序 | 本地 cancel／disconnect／60 秒 terminal 立即结束 Application，阻止新 dispatch／事务发起／原响应交付，释放应用所有权和内容引用。此前已经交给 SDK 的事务与 durable terminal fence 按 Firestore commit 顺序排列；fence 先则挡住旧事务，合法内容先则其效果可保留，即使物理提交或 ACK 晚于本地 terminal。之后获准的独立读可发现它。 | 不再宣称本地 terminal 起零远端物理效果；也不把 content ACK 当作当前有效性或已关闭证明。 |
| F01-B：已发 I/O 必要字节 | 仅已经发出的数据库 I/O 可在 SDK 内保留完成／终止所必需的已验证消息字节，至其结算立即释放。Application 不保留可重用 prompt／candidate，不 replay、cache、log、再生成或新增副本。 | 不将此例外扩为请求内容的恢复窗口；供应商缓冲立即销毁不可观察时如实写未知，不用 AbortController 声称物理销毁。 |
| F01-C：晚到期副本 | 只允许到期前交给 SDK、在 expiry fence 前排序成功的窄范围晚物理副本。它不可访问、不交付、不进一步生成、不产生新合法 anchor；随原已到期 Conversation 清理。到期即不可读、不能复活，物理清理仍须最迟在**原 expiry + 24h 完成**。 | 不能因晚 commit／ACK 延长时钟、推进 anchor 或重起 24h；I/O 超过原期限未清完就是 SLA 失败，继续不可读并报告失败。 |
| F01-D：外部 Auth 检查点 | request／admission 验证保持。每个内容事务发起前 fresh revoke／disable 检查，之后同步复核原 Application／session／deadline guard；已知失效不发起新写。明确接受未观察到的 Auth check→DB commit 窗口。Firestore 内的 Account／purpose／source 权限仍与 producer 写入在同一事务冲突边界检查。 | 不在 Firestore callback 内请求 Auth HTTP，不宣称 Auth-at-commit 原子性，也不取消数据库内权限条件。 |

真实 adapter 的逻辑应区分 `dispatch guard`、`durable close barrier`、`authoritative readback`；严格 fake-Port 的同步 `effect(commit)` 原样保留。`closed` 只表示已证实关闭了旧写权，不等于没有历史效果；未确认 barrier 为 `unresolved`，不得给 confirmed Cancel／no_effect／user_saved。结果读还必须满足 owner／有效期／来源与 user-target 全部 pending 检查。

**保持的规则：** 60／5／45、one-active／two-queued、每用户一个 nonterminal、模型真正停止前 lane quarantine、fresh explicit Retry、F02 guarded sink、无 terminal 后原响应、plain text／Q17 allowlist、Persona 编辑／切换保持开始快照及 used Persona 删除失效、同 U 至多一条 accepted assistant（tombstone 仍占槽）、删除目标不重建、无 token／operation key／prompt 日志或持久化。N01 六接口及原 token-instance／session 控制和 15／75／90 手机时间不因本包重新设计。

创建 metadata 的完整精度及旧 cutoff 比较现在是选定的共同有效性约束；**物理 `appendBefore`、`latestMessageId`、resolver、事务与 index 库存仍须 N02 选择**。所有 Send／Retry、普通页／readback、模型 dispatch、交付、清理都用同一有效性规则，`createTime == cutoff` 为到期，旧页面或 accepted 指针不能绕过。

## 3. N02：物理库存、事务、索引与保留完整候选

本节是推荐一套可整体审查的最小物理方案，**尚未选定**。所有记录 Backend-only，owner 由 trusted principal→Account 映射，不能由 wire owner 字段决定。业务 ID 为既定 opaque UUID-v4；固定 singleton 名仅为候选。无 raw token／key／hash、request body 副本、prompt、完整 context／Persona／版本向量／模型结果缓存。messages 的 text 仅按已选消息用途保存。

### 3.1 精确路径与字段

下表 `C` 表示 `accounts/{accountId}/conversations/{conversationId}`，只用于表内简写，不是新增路径变量或另一份 owner 字段。表外字段不保存；缺失／非法必需字段 fail closed。

| 候选路径 | 字段和允许形状 | 用途、完整性与删除条件 |
| --- | --- | --- |
| 既有 `accounts/{accountId}` | 新 `purposeRevocationGeneration`：非负 safe integer | LI producer 的单一 `checkin_conversation` 撤权代际。与 accepted→rejected 及 settingsRevision 在同一写事务递增；重授不归零，visibility-only 不递增。缺字段不由 AI 补 0，overflow 拒绝。新 fresh synthetic fixture 可经选定后明确设 0；不包含普通数据迁移或 Account 删除。 |
| `C` | `state:'live'\|'deleting'`、`lifecycleVersion` 正 safe integer、`nextSequence` 正 safe integer、`latestMessageId` | 第一条 user 原子创建，禁止空 parent；owner 从路径。latest 是物理指针，须 resolver 证明合法 anchor。deleting 不回 live，parent 最后删除。 |
| `C/messages/{userMessageId}` | `role:'user'`、正 safe integer `sequence`、`text`；可选 `acceptedAssistantMessageId`、`pendingOperationId` | user text／createTime／sequence 不可变。所有生成入口必须争取同 U 的 canonical claim；任何其他未结算 claim 挡住 Retry。指针不进 wire／模型，不更新 retention。 |
| `C/messages/{assistantMessageId}` | `role:'assistant'`、正 safe integer `sequence`、`availability:'available'\|'unavailable'`、`replyToUserMessageId`、Q19 `presentationMode` 与适用的 `presentationProjectionVersion`；仅 available 有 `text` | 创建时与 U.accepted 指针原子成对。配对不用相邻 sequence 推定。tombstone 保留槽与 non-content 元数据，不允许第二助手或恢复 text。 |
| 每条 message 的共同候选字段 | `appendBefore:{seconds,nanoseconds}`：只这两个字段；seconds 为 safe integer，nanoseconds 为 0..999999999 整数 | 记录此前有效 anchor＋90d 的完整精度 cutoff。只原 first-user／sequence=1 新 parent 可省略。tombstone 保留此到期 guard；随 Conversation 删除，无新期限。 |
| `C/message_sources/{assistantMessageId}` | 合法无来源**恰为** `{sources:[]}`，不含代际；有来源为 `{sources:[{sourceType:'check_in',sourceId}],purposeRevocationGeneration}`，最多五条实际 required source | 每个 available assistant 原子带一份 canonical 文档；缺文档不是空列表，不另建 hasSources。非空 stamp 是明确 Q19 最小 pair 用途 amendment，待 LI 选择。tombstone 原子删除整份文档和全部 refs／stamp。 |
| `C/effects/{operationId}` | `kind:'send'\|'retry'`、确实存在的 `userMessageId`；仅本次操作实际创建助手时加 `assistantMessageId` | 新用途限普通 owner operation readback／效果排重，随 associated Conversation；不冒充 Q14 自动允许的审计，不取代 U canonical claim／accepted pair。 |
| `ai_operation_fences/{operationId}` | `ownerAccountId`、`conversationId`、`userMessageId`、`kind:'send'\|'retry'`、`targetKind:'reserved_new'\|'existing'`、`processEpoch`、正 safe integer `revision`、`state:'open'\|'closed'` | 首次效果前建立，无 prepare 持久化、恢复执行数据、deadline 队列或内容。closed 永不 reopen，op ID 不复用；missing 一律不授写权。正常／异常寿命见 3.5，不能默认为永久。 |
| `ai_runtime_fence/current` | 随机 UUID-v4 `processEpoch`、递增 safe integer `generation`、非负 safe integer `cleanupGeneration` | 当前 epoch 撤销旧进程写权，无历史、用户名单、多主 lease 或分布式调度。cleanupGeneration 仅挡旧进度重建；不解除消息 claim／模型槽。退役且全部旧 I/O 结算、无再启用路径后删。 |
| `ai_cleanup_progress/source_sweep` | `schemaVersion`、`revision`、`phase:'messages'\|'message_sources'`、可选 `lastDocumentName`、`startedAt`、`resumeUntil`、`hadFailure` | 唯一 active 两阶段扫描 checkpoint；候选 resumeUntil=startedAt+24h。cursor 自身含业务路径，禁止日志／UI／模型；完整用途和删除见第 6 节。 |

### 3.2 完整精度 retention resolver 候选

1. 每次 append 在同一事务读 owned live parent 及其 latest message，验证此前合法 anchor，记录 immutable `appendBefore` 后再原子写 message／parent pointer。只有原始 reserved_new first user 的第一次新建无此前 cutoff。missing／非法时间、例外外省略字段、缺 latest 指向均 fail closed，不凭 ACK 修复为有效。
2. 以服务实际提供的 message **不可变创建 metadata**派生语义 persistedAt。若 `createTime >= appendBefore`，整个 Conversation 永久视为在 appendBefore 到期；旧合法 anchor 可由 cutoff−90d 得出，晚副本永不成为 anchor。若 `<`，才允许该消息推进 anchor 与 90d。`updateTime`、client UTC、request-start 或事后回填值不替代它，禁止删后重建同 ID。
3. 原始有效 message、parent/latest、accepted 指针、effects、旧 page 均不能绕过 resolver。第一次 user 临界失效不调用模型；Retry 临界助手不交付。合法前一消息推进后下一事务据此判断；晚到期链不能再被新 append、时钟回调或 cleanup 复活。
4. Infra→内层使用整数 seconds＋nanoseconds，完整精度比较／加减 90×24h，不经 JS Date、wire ISO 或浮点毫秒授权。`appendBefore` 选整数 map，避免物理日期字段截断更细精度；这是待选物理字段，SDK 类型支持 nanos 不证明服务器 1ns 分辨率。Backend now 只有毫秒且与 expiry 落在同一不可分辨毫秒时 fail closed，不舍入后多给访问时间。
5. expiry fence 事务再次验证 resolver 后标 deleting；旧扫描读到候选不授删除权。合法并发新消息延长 anchor 时不删，late copy 时按原截止整段清除。晚 I/O 超原 expiry+24h 未完成是失败，保持不可读并记录，不重置时钟。

新决议已经选定上述完整精度／旧 cutoff 语义，不再问 LI 是否接受四项产品规则；本节待选的是具体 metadata 映射、字段与 resolver 实现库存。#92 创建时间观察不是 serverTimestamp 等于物理 commit instant，也不是所有时钟误差或真实云实例保证。

### 3.3 事务和结算顺序

所有内容事务读取 current runtime epoch、已存在且 open 的原 op fence、owned live parent／resolver、相关 U claim／accepted pair，以及 F03 的当前 Firestore producer authority；核对 owner／target／epoch／revision。**全部读在写之前**。fresh external Auth 在每个内容事务发起前完成，其后同步 Application／原 session／deadline guard；callback 只做数据库读写及同步 guard，不调 Auth HTTP／模型／响应／私密日志，不生成业务 retry。候选 `maxAttempts:1` 仍待物理选择，不能证明撤销已发 RPC。

| 边界 | 原子操作与未知结果处理 |
| --- | --- |
| 进程启动 | 在任何 AI accept 前更新 singleton epoch／generation；确认后旧 epoch 内容事务不能再获权。未知则 affected AI readiness unavailable，非 AI liveness 独立。只结算旧 guard，不恢复旧 ticket、队列或生成。 |
| guard 建立 | ticket 已消费、原 Application 仍有效且通过 lane／pre-generation 检查后，建立原 op fence；创建 guard 也必须读本进程 epoch。结果不明时不发内容事务／模型。不开空 parent、不推进 anchor。 |
| Send user 首写 | existing 只读现存 live parent；只有原内存 ticket 的 reserved_new 身份可创建 absent parent。user U＋`pendingOperationId=A`、A.effects.user、parent sequence／latest 原子写。输入／容量／队列／权限失败不写 U；未知不调用模型。 |
| Retry claim | owned live U、本次明确输入 text 与原 U 精确相同、无 accepted 且无任意其他 pending，才原子设置 pending=B 与 B.effects.user。U text／time／sequence／anchor 不变。实际 dispatch 仍复核原请求／期限／权限；claim 不是可长期使用的生成许可。 |
| 助手写入 | 要求 U.pending=本 op 且 accepted 为空；assistant＋sources（包括合法空）＋U.accepted＋本 op effects＋parent sequence/latest 原子提交。**保留 pending** 至确定结算，防 ACK 丢失被旧读误当可 Retry。错配／缺项 fail closed。 |
| 本地 terminal 与 durable close | 先同步关 Application／新 dispatch，再把原 fence open→closed、revision 前进；不操作他人 op。确认只证明与内容事务的数据库排序，内容可能已先提交。未知保持 unresolved／guard，不给 confirmed Cancel。 |
| terminal／unknown 结算 | 已确认 barrier，或已确认 restart epoch 证明旧 op 不再有未来写权，再同一权威读取检查 U、canonical assistant、effects、**任何其他 pending**、当前 owner／expiry／source。只清 `pending==正在结算op`；旧 A 见 B 不修改 B，也不返回可 Retry 的 user_saved／no_effect。 |
| 活请求的确定 ACK | user ACK 不解除后续助手 claim。assistant 确定 ACK 后，单独无内容事务核对确定效果／accepted pair，仅清本 op claim，不更新 text／time／anchor；正常路径无需提前 terminal 或额外恢复回读。清除前已 terminal、ACK 未知或清除未知则走 barrier＋结算保护。助手已知但另有 B claim 仍 unresolved。 |
| whole Conversation Delete | 先 parent deleting＋lifecycleVersion++，作废同目标内存 tickets，与内容事务冲突排序；确认该目标所有 fence，再枚举清 messages／sources／effects／适用 controls，parent 最后。204 前同事务推进 cleanupGeneration 并删 active checkpoint；完整封锁＋删除确认才 204，不把无限后代说成一个原子 batch。 |
| expiry Delete | 各入口即时 resolver 拒绝；扫描只发现候选。标 deleting 的事务复查 current anchor／version，合法延长者不删。随后复用 whole Delete 的全部 target fences、未决初始化／内容 I/O 结算与封锁、所有 messages／sources／effects／适用 controls／children 清除和 parent-last 顺序；晚副本也整段清理。差别是没有用户 DELETE 的204响应，且完成截止始终为原 expiry+24h，不因扫描或晚 I/O 重起。 |

**initial-guard ABA：** cancel 可能早于 open guard 创建 ACK。原 registry 证明 target 后可用同 op ID 的 closed guard占位，不能读 absent 就删掉／宣称无效果。在全部初始化与内容 RPC 确定结算，或已确认新 epoch 永久挡住它们之前保留 closed；所有初始化也读 epoch，内容事务不补建 missing guard，closed 不 reopen、ID 不复用。晚初始化不能在删除后重建 open。

**A→B→C 全 target 保护：** A 保存 U 并结算；B 取得 U claim 后助手提交 ACK 不明。读 A 或 B 均先发现 B pending，返回 unresolved，C 不发生成。B barrier＋结算发现 canonical assistant 时，之后读 A 也沿 U 找到同一助手；tombstone 仍占槽。只有证实无助手、旧写权已封锁并清 B 自己 claim 后，C 才能原子争取。迟到 A ACK／cleanup 不清 B，迟到 B ACK 不清新 C；已关闭 A 不代表 B 已结算。另一个独立新 U 不套此 U 的 claim，仍遵守 Q31 per-user／lane 规则。

**restart／absent parent：** 新 epoch 确认前停相关 AI 写；确认后结算旧 guard，不能执行旧 ticket。实际 model stop／quarantine 另证，epoch 不是停模型命令。原 reserved_new registry 身份、原 op closed、权威 absence 三者齐全，且仍在原终态观察期间，才可给 no_effect；重启后的 fence 不扩大成持久 receipt。existing 已删／到期统一 unavailable，不以 absent 路径重建。本案不提供多 host 容量或旧请求恢复。

### 3.4 精确查询与 index 候选

| 查询 | 顺序、分页和索引 |
| --- | --- |
| 授权 messages | 有 before 时 `sequence < before`；`orderBy(sequence,desc), limit(20)`，返回按 sequence ASC。parent 同事务保证全会话 unique sequence；safe integer 耗尽拒绝。需要 `messages.sequence` collection-scope DESC 单字段，cursor 不绕 owner／source／expiry。 |
| 已知 IDs | user／assistant／effect／fence／singleton 精确 get；operationId 不证明 owner。 |
| whole-delete 全部 guard | `ai_operation_fences` 的 ownerAccountId==owner、conversationId==id，显式 name ASC；collection composite `(ownerAccountId ASC,conversationId ASC,__name__ ASC)`。不只查 open 而漏 closed／未结算。 |
| expiry parents | `collectionGroup('conversations')`，显式 documentId ASC，limit25，后页 full DocumentReference `startAfter`；逐项读 latest metadata／resolver，无 expiresAt 伪字段查询。 |
| 全量 source／orphan | `collectionGroup('messages')` 和 `collectionGroup('message_sources')` 各显式 documentId ASC，limit25，full DocumentReference keyset，无业务 filter；验证 canonical ancestor，跨 parent 同 ID 不混淆。 |
| restart guard | `ai_operation_fences` 显式 name ASC，limit25；包括 closed，不凭状态筛掉未结算记录。 |
| F03 AI Note | owner 等值＋`createdAt >= windowStart`＋`createdAt <= asOf`；createdAt DESC、documentId ASC，内部页25，以 request-only `(createdAt,documentId)` tuple 作 `startAfter`。同一 fixed readTime；最多取五条**合法项**，必要时翻页。专用 composite `(ownerAccountId ASC,createdAt DESC,__name__ ASC)`；不覆盖 History 的 name DESC 索引或 page20。 |

| collection group／字段 | 精确 field policy 候选 |
| --- | --- |
| conversations、message_sources、effects、ai_runtime_fence、ai_cleanup_progress | 各 `fieldPath:'*', indexes:[]`，不建业务字段自动索引。name-only 查询不据此自动宣称已验证可行。 |
| messages | wildcard `indexes:[]`；唯一自动例外 sequence `{queryScope:'COLLECTION',order:'DESCENDING'}`。text／source／role／pair／presentation／appendBefore 无自动索引。 |
| ai_operation_fences | wildcard `indexes:[]`，无单字段例外；仅上表 owner＋conversation＋name 的 collection composite。 |
| accounts | 仅新 purposeRevocationGeneration 的 `indexes:[]`，不 wildcard 改已有 Account 字段／索引。 |
| check_ins | 保持现有 History owner ASC／createdAt DESC／name DESC；新增 AI ASC tie 的独立 composite 待 F03／LI 选择。不部署或改动本轮实际 index 文件。 |

显式 name order＋完整 Reference cursor 是本候选必要形状，不依赖隐式排序。wildcard 排除与 name-only collection-group、首尾页、cursor 已删、同名跨 parent、非法 ancestor 的实际组合能力**尚未验证**，不借 #92 代证。若确需新增探针，先列未覆盖保证、固定锁定 SDK／synthetic fixture／清理边界供有界释放；本轮不自行执行。原依赖 `firebase-admin 14.3.0`／Firestore `8.7.1` 保持，不升级。

### 3.5 正常／异常 control 保留待选清单

| 记录 | 推荐保留选择及完成条件 | 尚需选择 |
| --- | --- | --- |
| effects | 仅既定普通 owner readback／排重，随关联 Conversation，删除／到期与其一起清。无请求内容、Persona／source 副本。 | LI 明确新用途及生命周期；不是由 Q14 自动授予 90d 审计。 |
| 正常 op fence／content-free terminal registry | 所有初始化／内容 I/O 已结算、旧 op 永久无写权、canonical outcome／claim 已解决后立即清；不为长期 no_effect 留记录。 | LI 选字段与这个清除条件，JIN 验实际结算，不用 Promise cancel 当证明。 |
| 异常 unresolved fence | 无自动 TTL；立即保持受影响 target 保护。候选 15 分钟未解决报非内容故障；24 小时内由 LI 指定 operator 恢复依赖／fence／reconcile；超时记录失败继续保护，不能假删或假成功。 | **这些 15m／24h 是旧 #90 未选运维候选，不是新增承诺或已经批准的期限。** LI 须明确最小 control 在证明完成前持续保留的新用途和责任；依赖永久不可用不能同时承诺硬删时限与零迟到。未选不默认无限保留。 |
| runtime singleton | 只当前 epoch／generation；启动替换无历史。退役且旧 I/O 全结算、无再启用路径后删除。 | 单受控进程范围；不推导多主 lease／调度。 |
| cleanup checkpoint | 完成即删；最长 startedAt+24h，超期／损坏从头重扫；whole Delete 204 前共同屏障清除。 | 新 cursor 用途／寿命／运行责任，独立于 fence 保留及 expiry SLA。 |
| whole Delete | 全部目标内容／provenance／effects／适用 guards 和含路径 active progress 删除、写权封锁后才确认 204。 | 不用 cursor TTL、owner 登出或用户放弃代替 actual cleanup。 |
| Q14 log | 原白名单；30d 到点不可读、24h 内物理清理。 | 已定不重批。无 UID／业务 ID／source ID／路径／body／token／raw error；报告只稳定类型、允许关联及非内容指标。 |

## 4. F03：真实 producer 交接与一致开始视图候选

### 4.1 已有事实与不能据此获得的保证

| owner／现有源 | 已有事实 | 仍缺的明确合同 |
| --- | --- | --- |
| LI Auth／Account | Firebase verifier `verifyIdToken(token,true)`；UID binding→Account；完成 onboarding 的当前账户条件。 | AI purpose 判定、其后新撤销及对原 session 的当前检查；一次验证不是未来许可。 |
| LI Settings | optionalProcessingConsent accepted／rejected、settingsRevision；合法 legacy revision 可为逻辑0；visibility 独立。 | consent→checkin_conversation 用途映射；离线撤回再重授不能由 accepted／settingsRevision 推断，须代际及所有 writer 保证。 |
| ZHOU Persona | owner `persona_state/current` 的 stateRevision／live IDs／Active；item revision／当前合法集合；已批准 default 与最多5 Persona。 | fixed readTime 复合读取适配。revision／Active 变化不是撤销条件；不得重批或改成编辑／切换即取消。 |
| DU Check-in | ownerAccountId、note、createdAt、可选 visibility；已有 create／findOwned 及 Note 校验。 | AI 用途许可、不可变 Note/time、时间格式／删除行为／ID 永不复用的交接。create 的 absent check 不证明历史 ID 从不重建。 |
| DU History | owner 日期／时区、page20、end-exclusive／ID DESC 查询与现有索引。 | 历史读取不授模型权，也不直接实现 AI inclusive 7d／ID ASC tie。 |
| 既有 AI／通用 gateway | `ConversationSources.capture/current/watch` 同步 fake；各 producer repository 独立 transaction，gateway 映射数据／ID。 | 不是 joint view／fixed readTime／updateTime Port；多个独立 repository 依次读不能拼称一致开始快照。 |

实现事实源沿原 #90 的固定 #88 `398f81c901fc64f230442dc1405d0ba6b75763b7`：`backend/src/shared/{ports,infrastructure/firebase}` 的 identity/gateway、Account preferences repository、Persona model/repository、Check-in repository/history gateway/domain/note、AI lifecycle/capture-context。后续 producer 草稿确认的是职责和交接准备，不能将以上字段提升为 AI 权限。实际 source 升级只核实其新增 delta。

### 4.2 F03-A 接受顺序和固定视图

1. 可信 Auth 与 N01 输入／操作身份检查后，**accept 前**最小 current verifier 读 binding、owner、completed Account、本次 purpose／consent；不取 Note／Persona。denied／无法验证不 accept，capacity 拒绝亦不占用已接受槽。现有 Account verifier 不冒充已经存在的 AI permit。
2. 在同一无 await 的 acceptance 事件固定原 monotonic acceptedAt、唯一 Backend UTC asOf、原 terminal／abort 和 per-user／capacity 状态。队列排序按 acceptance，不按快照完成顺序。60 秒从原 acceptedAt 计；queueEnd=min(acceptedAt+5s,deadline)，model 45 秒保持，没有另加 context 5 秒或读完重启预算。
3. 在同一 Firestore database 的 read-only transaction 指定 `readTime=asOf`；完整 binding／Account／Settings／Persona／Check-in 都来自它。先复核该视图的 owner／purpose，再读内容；不拼入 accept 前字段，不换成 query 完成时 latest。合法无 Active／空查询可 default／empty；应该存在但缺失、损坏、依赖故障不得伪装正常空。
4. 所有 query 页复用同一 readTime／窗口。接收完整合法 projection 前不造模型输入；晚到 terminal／abort 后的结果丢弃并释放。原始预算继续消耗，失败无新 asOf、无 latest fallback、无自动再生成。
5. #92 已观察锁定栈的两类 fixed anchor 跨 documents/query/repeat 能力；它不是生产者用途批准或完整开始语义证明。asOf 超前不可读、时钟不可信、快照不可用／过旧、不支持或 budget 到期均 fail closed；不能悄推 acceptance 或切 latest。需在真实 AI adapter 验 preaccept→accept 与 fixed view、延迟结果丢弃。
6. start view 不授未来权限。accept 前验证到实际 acceptance 的 race，以及 snapshot→dispatch／内容 transaction／F02 sink 的 race，由 F01/F03 共同闭合。每个边界检查原 session/Auth、owner/purpose、Conversation、原 used Persona 存在与全部 used Note。Auth 采用已选 F01-D 检查点；DB 内 authority 在实际共同冲突边界检查，不能“await current→await write”即宣称原子。

### 4.3 AI 内部 Port 候选

下列是内部值语义，非新增 wire DTO；无新公开 endpoint。owner、source IDs、版本、clock、stamp 不交 Flutter／模型，也不整体持久化。类型名可在获批实现时适配现有 Result／budget。

```ts
type Purpose = 'checkin_conversation';
type AuthorityFailure =
  | { kind: 'denied' }
  | { kind: 'unavailable' }
  | { kind: 'terminated' };
interface AcceptedReadContext {
  principal: VerifiedPrincipal;
  originalRequest: RequestIdentity;
  purpose: Purpose;
  acceptedAt: MonotonicInstant;
  deadline: MonotonicInstant;
  asOf: TrustedUtcInstant;
  abort: AbortSignal;
}
interface AiSourceReadPort {
  captureStart(context: AcceptedReadContext): Promise<
    AuthorityFailure | { kind: 'captured'; snapshot: StartAuthorityView }>;
  revalidateCurrent(input: {
    principal: VerifiedPrincipal;
    purpose: Purpose;
    dependency: RequestDependencies;
    deadline: MonotonicInstant;
    abort: AbortSignal;
  }): Promise<AuthorityFailure | { kind: 'valid'; current: CurrentAuthorityEvidence }>;
}
interface StartAuthorityView {
  asOf: TrustedUtcInstant;
  owner: BackendAccountRef;
  permit: { purpose: Purpose; state: 'authorized';
            purposeRevocationGeneration: NonNegativeInteger };
  observedSettingsRevision: ExistingSettingsRevision;
  persona: { kind: 'default' } |
    { kind: 'active'; usedRef: BackendPersonaRef;
      projection: PersonaPresentationV1 };
  checkIns: ReadonlyArray<{
    source: { sourceType: 'check_in'; sourceId: OpaqueSourceId };
    observedVersion: RequestOnlySourceVersion;
    projection: { occurredAt: UtcInstant; noteText: string };
  }>;
}
```

RequestDependencies 只保留 request-only owner／purpose generation、原 used Persona、实际 used source IDs／版本；不存 prompt/text。CurrentAuthorityEvidence 是该次读取观察，不是 lease、token 或 commit 证明。普通 owner GET 用自己的当前 verified token／owner 与最小 provenance，不要求旧生成请求 active；cleanup 用被授权的 Backend 服务身份与 canonical owner，不假冒用户 token，也不因 consent 已拒绝而无法删除来源残留。

### 4.4 需 LI／DU 选定和交付的精确行

| 行／owner | 推荐合同 | 所需交付及不得省略的边界 |
| --- | --- | --- |
| P-LI-1 identity | trusted UID→binding→completed Account，输出 owner 或 denied／unavailable；Auth revoked/disabled/expired 沿已有类别。 | 确认 synthetic 绑定源、完成判定、原 token-instance/session 当前验证入口；无客户端 owner／新 accountStatus。 |
| P-LI-2 purpose | **新映射候选**：当前 completed owner 的 accepted 许可 checkin_conversation 读取本人的 eligible Note，含本窗口内既有 Note；rejected 拒绝整个用途，无 current-input-only fallback。visibility 不当 AI permit。 | LI 确认 consent 文案／范围适用，不推定每条创建时曾同意，不扩 Mood／Activity／Weather／social／其他 purpose；未选则 F03 source read 不开。 |
| P-LI-3 撤权代际 | Account 上 nonnegative purposeRevocationGeneration；authorized→denied 原子递增，重授不归零，普通 accepted save／visibility 不增；overflow fail closed。 | LI 列出**所有**相关 writer：Settings、Account replacement／维护／fixture 等，对不改许可的写入原样保留，对撤权原子递增；不得由全量覆盖写删／回退字段。选择初始化／schema；legacy missing 不默认0，ordinary migration 未选。 |
| P-ZHOU-1 Persona | 同视图用已有 state/item revision 验集合一致；只 schemaVersion／tone／responseLength／formatStyle 进模型，合法无 Active default。 | 后续只要求原 used Persona 未被永久删；edit／switch保留快照，不要求仍 Active／revision 相同。不新增 Persona persist 字段。 |
| P-DU-1 Note/time | immutable `note→noteText`、`createdAt→occurredAt`；Backend 已赋且持久的语义时间，不声称 DB 物理 commit。原1–500 grapheme 原样，不默默 trim／truncate。 | DU 确认时间 canonical UTC ISO 毫秒格式、不可变性、空集合和损坏/legacy处理；query asOf 表示须与 fixed readTime 指同一瞬间，不截断／移动窗口。若现有 string时间不具排序前提，停相应 query；不把 Timestamp 查询套 string 或遗漏记录当 empty。 |
| P-DU-2 source | owner-owned immutable Note，无本包新增 saved edit／每条 AI toggle；硬删后该 source 永久失效。 | DU／LI 明确 source ID 永不复用／不 Restore，以及 create、delete、维护各入口执行证据；随机ID／absent check 不够。若实际已允许恢复／转移／逐源撤权再授，单列所需 incarnation delta，不能预装未来逐条 generation／事件表。 |
| P-DU-3 AI query | 同 readTime 的 `[asOf−7×24h,asOf]` inclusive；先过滤未授权／已删／future／窗口外，再 occurredAt DESC、opaque ID ASC 取最多5条；合法0条为 captured。 | AI index 见3.4，与 History 并存。内部页25、request-only full cursor直到5合法项或耗尽，均吃原预算；任何 required页读取失败不是部分成功／empty。 |
| P-LI/DU-4 current | 在途、普通历史读、cleanup 共用明确 current判定。producer通知仅加速；offline补偿不能省。 | 明确所有 effect-boundary读与撤回／删除 writer共同冲突关系；当前错误/缺权限/删除区分；通知丢失或重连不作有效证明。LI→DU 的 producer 交接先明确，上述缺项不转由 JIN 发明业务含义。 |

源 updateTime 仅 request-only 观察版本，不作永久 ledger、模型字段或 source stamp；未获准的 immutable Note/time 改动 fail closed，visibility-only 不凭版本变化撤销 AI。Q19 开始 Persona edit/switch规则仍适用，不用统一 version相等算法误伤。

**代际比较：** 在 producer 合同及字段完整合法时，current>captured/stored 才证明期间发生用途撤权，终止在途并使适用 sourced历史永久失效；current<stored、missing／bad 是 unavailable，终止在途且历史 fail closed，但**不以异常证据永久擦除**。相等仍检查 current permit／全部source；目前 accepted 不消除旧撤回。该 stamp 只在 nonempty canonical sources 中存在，空来源不保存，tombstone 全删。

### 4.5 普通 owner 管理、AI 用途与 cleanup 的候选权限矩阵

| 当前事实 | AI accept／模型／Retry | 普通 owner read／Delete | Backend cleanup |
| --- | --- | --- | --- |
| valid owner、purpose有效、来源有效 | 仍过原会话／请求／预算等全部条件 | 沿当前 owner／expiry／source授权读；Delete按完整封锁删除 | 正常验证，合法内容不改 |
| valid owner、purpose rejected | 整项用途拒绝；user_saved事实不授Retry | 可管理 user、合法unsourced assistant、tombstone；sourced回复不得给text。Delete不因AI拒绝而被挡，204仍须完整清理 | 用服务身份执行，确认撤权按代际合同使适用 sourced回复失效 |
| Auth expired／revoked／disabled、owner无效 | 不授新操作；原session守卫终止 | 当前用户GET／Delete按既有Auth拒绝；新合法token可普通读取，不接管旧operation控制 | 独立受控身份；不能推导 Account删除或免掉producer判定 |
| source／代际不可读、损坏／回退、available缺sources | 不构造输入／不授新效果 | fail closed，不把暂时故障当empty／永久删；合法owner管理路径仍按其独立合同 | 该项incomplete，保留证据，稳定错误后重验 |
| 已确认required source失效 | 不授相依效果 | 可返回unavailable投影；物理清除前也不交text，accepted槽保留 | 原子整条tombstone＋删除所有sources/stamp，见第6节 |

此矩阵的普通读与 purpose关系是本包需 LI 明确选择的部分，不能从 History 授权或现存Settings状态自行推断；不增加 owner普遍读取别人的内容或 source日志。

### 4.6 失效与合法空数据的行为保留

| 场景 | 在途请求及已存历史边界 |
| --- | --- |
| 已获本用途许可且合法0条Note | captured空列表，可用本次输入＋合法Persona/default继续；canonical sources写合法空。不把空等同拒绝，也不凭空增加来源。 |
| 任一required读取失败／损坏／无法验证 | 整次unavailable，不返回半份projection/default/empty；历史临时fail closed，不凭一次失败永久清除。 |
| 起始后撤权又重授 | 合法current>captured使旧request终态且不可恢复；新明确请求重新capture新asOf。stored sourced历史按完整合法current>stored或已确认required source失效转tombstone；回退/缺坏只unavailable。 |
| used Persona edit／Active switch | 沿原四字段开始快照继续，不重新capture；历史presentation metadata不改。 |
| used Persona永久删除 | 原请求terminal、尽力cancel、禁止后续保存/交付，不换default；按Q19不自动重写既有历史，不新增持久usedPersona ID用于清理。 |
| used Note删除／确认失效 | 任一required source失效即终止，不部分继续；依赖历史整条A不可读并清理。未使用source的删除不影响此请求。 |
| 通知丢失／服务离线 | current判定与代际补扫仍必需；watch不是唯一正确性路径，恢复连接本身不证明来源有效或清理完成。 |

## 5. R-A：无新 receipt 的未知结果与退出候选

本候选不增 endpoint、永久 receipt／fingerprint、长注册表、自动轮询／重发、通知、跨设备恢复或模型执行恢复。永久 unknown 是不能证明时保留的可能结局，**不是**用404、empty、断线或清屏证明“永久没有结果”。现 safe unknown 与已验收 R1/R2 继续，新增文案／退出动作待 LI 选择。

| 情况／动作 | 候选行为及与新 F01 的对齐 |
| --- | --- |
| Check result | 一次使用当前普通 owner read 的15秒读，无自动poll／Retry。只有权限、关闭/无未来效果、实际 canonical结果和**同U全部pending**都充分，才解除相应guard。closed只证明旧写权关，内容可能先于fence提交。 |
| barrier 未知／ACK丢失 | 继续 unresolved；不能给 confirmedCancel／no_effect／user_saved。之后发现有效已保存结果可采用；发现晚到期／失效source副本不可采用。未确认，不以新规则改写成已经证明。 |
| Cancel／迟到 token 或 prepare | 任何Cancel先同步关闭本attempt的dispatch写权，再按原控制身份尽力取消。之后到达的token／prepare结果只可丢弃、清理或作废ticket，绝不进入execute；remote Cancel ACK不重开本地attempt。 |
| A→B→C／旧readback | 全部遵守3.3：旧A的closed／用户已保存不能解除B，新C零生成直到B证明结算；accepted/tombstone永久占同U槽。历史相邻行只提示不确定性，不代替实际pair；fresh applicable user_saved仅澄清其有权证明的事实。 |
| 普通page／readback／Retry结果合并 | client按messageId合并、按sequence排序；Retry只接原U，同一U的ID／sequence／persistedAt不替换，不插第二U。迟到available不能复活已知tombstone；任何新结果仍受当前session/target及上述保护，不能靠合并清屏开放Retry。 |
| Leave without retrying | 不在prepare／execute时，可停止页面读／清私有显示与draft并调用既有Back；保留适用session内unresolved target保护。仍active时走既有Stay／Request cancel and leave控制。leave不等于远端终止，不删saved消息，不释放未知Retry。 |
| 返回、Settings、session变化 | 沿N05原callback；同session回来仍unknown，无自动Check result／生成。普通history重载不是原op无效果证明。新token／同UID新session可按普通owner读，不能据此接管旧ticket／清旧效果；session失效清私有本地状态不证明Backend结算。 |
| 未知目标继续发送 | 原未知Send／Retry不得强制重发／复用输入／再生成／清memory绕过。另一个独立新U仅遵守自身claim及Q31，不新增全owner永久freeze；本包不新增“新话题/列表/自动复制旧输入”逃逸UI。 |
| whole Delete | 沿已有确认，确认操作后隐藏内容；204只在完整封锁清除后。未知只能Check again幂等删同ID；GET404／空页／logout／关闭页面不作删除确认，不把删除当原op无效果。 |

明确限制：没有 receipt／fingerprint 就不能全局判断新设备／新session手工重新输入是否同一意图；本案不声称全局exactly-once、最终一定可确认或重新打开原操作。restart／reserved_new／absent parent的证明边界保持3.3，不为退出新存registry。

保留原 unknown copy：`We couldn’t confirm the result. Check saved messages before trying again.` 新退出说明候选为：`We may not be able to confirm whether this message was saved. You can leave without retrying it. Leaving does not delete saved messages.` 按钮 `Check result`、`Leave without retrying`；已有条件性 `Reload messages`／`Delete conversation`／Settings 各守原含义。无Retry countdown、无“稍后一定完成”、无取消成功或Nothing was saved toast。

原删除copy继续：`Delete this conversation? All messages will be permanently deleted.`、`Keep`／`Delete`、`Deleting…`、`Deletion has not been confirmed. Check again.`、`Conversation deleted.` 来源失效只给 `This reply is no longer available.`，不带源ID、原因或重新生成按钮。沿既有M26可达性：48dp、放大文字/小屏、状态一次播报、host返回焦点；不增加Undo或新路由。

终态释放Application输入／projection／prompt／raw output及原token/key；best-effort Cancel仅在既有必要控制阶段持句柄。已选F01-B的SDK已发I/O必要字节是独立窄例外，不授权UI／Application缓存。content-free session target/op引用按必要恢复用途、session失效即清，无diskrestore；durable fence只能靠真实结算证据解除，不能用UI放弃／cursor TTL。无永久“用户放弃”业务记录或新日志，退出不推进retention。

## 6. C-A：完整来源清理、原时钟与 runner 候选

### 6.1 全量发现与原子状态转换

采用两次Backend-only canonical collection-group sweep：先全部messages中的assistant（含unavailable），再全部message_sources。每页25、完整name严格ASC与fullReference keyset。跨所有owners／retained Conversations，不限定当前登录、七天、五条、当前页或有parent的记录；第二次扫发现orphan／tombstone残留。canonical祖先路径验证后才获得cleanup owner；非法路径／坏schema记录failure，不假定无人拥有即可删。无反向source索引、deleted-source事件表、sourceID tombstone或新Admin公开读取。

在途／历史source验证检查所有实际required pairs；生成时7天/5条不是历史清理范围。offline accepted→rejected→accepted 由 P-LI-3 current>stored 发现；硬删发现依赖 P-DU-2 ID不复用保证。current<stored／损坏不擦历史。无required来源的合法空文档不含stamp，也不扩大到此用途的永久失效目标。

每条assistant用有界事务读parent、A、U.accepted pointer、canonical sources及全部current producer authority；所有读取先于写入。cleanup是受控服务身份，不在callback调用用户Auth或外部服务后假称原子。与source／consent writer竞争读相同权威记录。

| 观察 | 原子处理 |
| --- | --- |
| live、所有required sources合法、代际匹配 | 原样保留，不改text、createTime、anchor、usagemetadata；source合法空与missing分开。 |
| 已确认任一required source删除／失效，或完整合法current generation>stored | **整条**A变unavailable、删除text、删除整个sources文档及全部pair／stamp；不是仅去掉触发source后继续展示。 |
| 已tombstone | 幂等清非法text／残留provenance／stamp；保留唯一pair／sequence／role／availability／createTime及appendBefore、Q19 presentationMode／适用projectionVersion。旧available不能恢复。 |
| message永久不存在或确认whole-deleted／expired parent残留 | N02 writer封锁完成后删orphan／适用残留，不补造parent、receipt或生成。whole-delete责任仍覆盖全部children／controls。 |
| timeout、DB故障、缺权/删除不能区分、available缺sources、非空缺stamp、代际坏／回退 | 当前读fail closed；该项incomplete并保留证据，不造空来源／永久tombstone，下次重验。 |

不改原Utext/time、不清accepted槽、不允许第二A、不推进90d。source／consent失效先提交则新A事务受阻；A先合法提交则当前读立即封锁、cleanup再tombstone。一次sweep不是永久快照；读过后失效／cursor前新插入由下一轮从头发现，不称“到尾即未来全清”。

### 6.2 服务责任、进度与 ABA

推荐既有受控Backend的**单清理入口**：启动补扫、健康时每小时发起完整两阶段sweep、页25、逐项有界事务；无Cloud Functions／新queue／新常驻服务。本轮未配置或执行runner，LI须选实际operator与运行责任；小时频率不是清理SLA证明。expiry／guard可先进程内cursor、重启从头，幂等且failed page不报complete。

`ai_cleanup_progress/source_sweep`只有一份active记录：schemaVersion／revision用于解析CAS；phase取messages／message_sources；lastDocumentName仅上一已处理页完整path，无额外sourceID清单；startedAt／resumeUntil是Backend时间且候选+24h；hadFailure避免“经过”冒充成功。cursor本身含业务路径，禁止日志／UI／模型；不是publicreceipt／requestregistry／生成许可。

- 消息事务完成后才保存pagecursor；crash在消息后cursor前安全重放。failed行保留canonical证据，hadFailure=true可推进后面owners；整轮结束删cursor从头再验，不把失败跳过记成功。
- 持久故障无进展时停止紧循环、稳定错误并等受控重试，不加sourceID deadletter。启动续合法checkpoint；损坏／超期则安全清进度并从头，不推定前页完成。
- `resumeUntil`到点禁止用cursor跳过记录，并清其物理记录；+24h只是**待选checkpoint最大寿命**，不是source清理SLA或Conversation宽限。offline超过上限是运行失败，恢复先清过期进度，不排除offline时间美化结果，不依赖TTL即时删除。
- 多worker不能由同一cursor自动证明安全；本案选单入口。若实际引入多进程，需明确leader／CAS delta，不静默扩大。
- 每page捕获singleton的processEpoch＋cleanupGeneration；每次checkpoint create/update事务都读取并比较两者。whole Delete在204前同事务推进cleanupGeneration并删除activeprogress。旧page不得趁progress absent重建已删路径；仅检查progress revision不能挡absent→create ABA。下一轮head重扫，generation不影响其他U写权／模型槽。
- 正常两阶段结束删除所有progress路径，仅留Q14允许的非内容证据；无永久扫描历史。Account删除不借此实施Q27。

### 6.3 清除范围与独立时钟

清理source-invalid A时同时删除**全部**pairs（包括仍有效伙伴）和stamp，无继续provenance目的。字段index排除与唯一必要query按3.4；无text/source反向搜索或backup/export/cache。若实际环境另有副本，必须先补库存及授权，不能凭本表说已清。canonical读证实text／refs／stamp不在、两方向能覆盖orphan、writer已封锁才报告一次完成；不声称观察到DB底层磁盘安全擦除。

| 对象 | 时钟／完成要求，不能互借 |
| --- | --- |
| Conversation／消息 | 已定合法anchor+90d，到点立即不可读；原expiry+24h物理清理。晚副本不续期，长期I/O跨期限就是SLA失败。ownerDelete可提前，但确认204须已完成而非24h可读宽限。 |
| source清理 | Q19必要来源失效即不展示；text与全部provenance一起清，不能借Conversation90d拖延。原规则无统一source-delete+24hSLA；每小时／恢复即扫只是候选运行目标。 |
| tombstone／acceptedpair | 随所属Conversation；无text／source，不再生成。保留原精度expiryguard和Q19非内容usage，不另起anchor。 |
| sourcedassistant代际stamp | 新用途待选，仅retained sourcedassistant再验证，tombstone时删；producer当前generation的账户生命周期由LI管，不能推导Account删除。 |
| checkpoint | 新用途待选，一轮完成即删，最长startedAt+24h；过期不释放opwriteguard。 |
| request／SDKI/O | Application原request-only；只有已选SDK必要字节至已发I/O结算例外。无模型恢复窗口／日志。 |
| effects／fence | 按3.5分别选，不由90d、source周期或cursor24h推导。异常不假清，不默认无限许可。 |
| operationallog | 原Q14 30d＋24h清理，allowlist不变。 |

若LI需要source清理最大延迟，须明确producer权威事件起点、offline／容量上界与运行责任后单独选择；不在本包凭合理性补新SLA。既有Conversation expiry+24h义务仍完整，不因source目标较弱而降级。

## 7. 技术验证：复用 #92，列清尚未证明部分

### 7.1 已验收证据，不重跑或重批

#92 accepted head `029437c5939bfb50643254a7a976bf7fc70c8c12`，tree `23b48472e744c1ace2a11f5992e25452b0f9a832`；owner实际工具 source `2a64f705a61505e34976f86fff41e74b2c65b843`，tree `f83b230bdfccad55e3ea678566118c94fb00b916`。源及运行证据见[已保存证据](../evidence/sprint3/2026-10-12-zhou-ai-capability-probes.md)与验收记录。最终26 reports；准备期missing-module、run01 preflight失败、run02 credential guard失败、run03 exit0各自保留，不把失败改作成功或后来源码同版本复现。

| 四项实际观察 | owner／JIN／LI责任与证据边界 |
| --- | --- |
| 固定readTime | 两个synthetic文档＋query/repeat，mutation ACK后旧view仍一致；server snapshot anchor与BackendUTC两case，无latestfallback。支持本次API观察，不授F03用途，不证明所有生产者／云环境。 |
| metadata | 创建身份在update后保留；观察到micro／submillisecond精度并完整比较。不是控制1ns、物理commitinstant或serverTimestamp等同commitTime。 |
| terminal／barrier | 只验证两个串行顺序与held callback。localmarker不是SDKcancel；heldcallback尚未发RPC，不能写成已发RPC取消反例。无任意并发barrier、线级RPC时刻、ACK丢失恢复或严格旧F01证明。 |
| genuine conflict／retry | owner maxAttempts1 callbacks[1,1]一commit／一ABORTED10；max3[2,1]两commit一retry。JIN max1[1,1]零commit／两ABORTED10；max3[2,2]两commit两retry。LI max1[1,1]一commit／一ABORTED10；max3[1,2]两commit一retry。不同合法schedule都保留，不要求固定计数。 |

JIN review `5493056107` 独立APPROVE，LI review `5493078408` 限定接受；其原测试／build／negativeguard和独立时序按正式记录归属，不能统记为ZHOU结果。17fixture删除、Firestore collections0／Authusers0、profile清除及8080/9099/4400/4500释放为本次观察，不是任意停机／迟到I/O／清理SLA保证。本轮不执行新Emulator或把本地代理核对称正式JIN。

### 7.2 剩余真实适配验证矩阵

下表均为**相依adapter尚未执行的计划**，不是新业务要求；复用已有组件测试仅限同组件同范围。新增探针若需要先有未覆盖保证的有界释放，不要求重跑四项旧探针。

| 关联范围 | 必须留实际证据的剩余项 | 责任／当前状态 |
| --- | --- | --- |
| N01／NC01–03 | 既定六操作实际HTTP边界、原token-instance／prepare一次消费、输入错误／cursor／普通ownerread；不新增wire。 | ZHOU已验收client可复用；真实Backend接线Not Run，JIN审新增delta。 |
| NC04／N02 | 原子U/A/sources/effects/pair/sequence/pointer，失败无半写；user后model前失效不dispatch；完整精度resolver／晚副本无anchor。 | 待物理选择与adapter；本地纯policy测试不能代证DB原子性。 |
| NC05 | 同U并发claim、A→B→C、旧readback/ACK/cleanup不解新保护；accepted/tombstone、错U/变time/seq/pair拒绝。 | #88 client R1/R2复用；实际store竞争Not Run。 |
| NC06／F01 | 新逻辑guard／closed与unresolved、真实并发close/ACKloss、restart／initialguardABA、原session、freshAuth与已承认未观察窗口。 | #92仅串行观察；strictfake不改，实adapterNot Run，不能承诺Auth原子。 |
| NC07／F03 | preaccept最小权限、acceptance固定asOf／原预算、jointview与late discard；inclusive七日边界／ASCtie／最多5合法项；denied/empty/error、Persona edit/switch/delete。 | LI/DU先交精确producer事实与选择；新AI reader Not Run。 |
| NC08／C-A | 所有sources当前验证、offline revoke→regrant、current>/</missing、ID不复用；全owner多页orphan、tombstone残留、writer竞争、crash/restart、refs与stamp全清。 | 不以watch/currentaccepted或一次sweep代证；cleanup Not Run。 |
| NC09／Delete/expiry | unknown首写/absentparent不复活、targetfence全发现、cleanupGenerationABA、合法新anchor挡旧expiry扫、原expiry+24h积压/故障记录。 | 未证明的group/wildcard/deletedcursor具体探针需另有限释放；无新Emulator结果。 |
| NC10 | Q17/Q19投影、plain-text parser／semantic既定政策；fakeQwen只证明相应受控处理。 | 已有政策测试按源复用；真实模型/tokenizer/Q31-E不在此证明。 |
| NC11／NC12／M26 | Cancel先同步关dispatch，迟到token/prepare不execute；messageId合并/sequence排序，Retry保原U ID/sequence/persistedAt、无第二U、迟到available不复活tombstone。R-A新退出文案/action的focus/status/48dp、15/75/90和新session；真实接线后Android组合与Back/Settings不绕guard。 | 现client/共享接受不重复；仅选定R-A实际delta和新组合source另测。 |

## 8. 集中选择、局部交付与 review 路径

| 待决组 | 推荐选择包及精确输出 | 未选时局部hold |
| --- | --- | --- |
| N02 | 3.1全部path/fields＋3.2physicalresolver＋3.3transaction/barrier/claim＋3.4query/index＋3.5正常/异常retention及operator；明确接受／修改的行，未选字段不落库。 | 真实schema/index/store/fence/cleanup配置，不阻止已授权纯政策或已接受组件。 |
| F03 | F03-A固定开始视图；P-LI-1/2/3/4、P-DU-1/2/3/4的purpose、所有writer保留/增代际、immutable/time/ID不复用；4.5权限矩阵与nonempty stamp最小Q19 amendment。 | 实际AI producer读取/写入；LI/DU owner交接独立推进，JIN不代选用途。 |
| R-A | 选不加receipt的退出/恢复限制、具体copy和session行为，与3.3闭合；ackunknown不改closed，A→B→C保留。 | 新页面恢复delta；现safeunknown及已接受client不重审。 |
| C-A | canonical两sweep＋原子tombstone、所有sources清除、单入口runner/页25/小时候选、progress新用途+24h/cleanupGeneration、原expiry时钟和失败责任。 | 真实清理运行；不把读failclosed等待为可展示，也不降低既定expiry义务。 |

已经选择的F01四行、已接受#92四探针、F02、原client/Persona内部规则在表外，不加入本轮批准选项。N02/F03/C-A的共同字段一次选择、各自owner执行，不能在多个文件重复逐项要求批准。LI可对不依赖其余候选的完整小批次给限定任务，不等全模块或旧PR合并；含明确依赖的真实adapter仍须相应合同与有界任务释放。

后续候选实施路径：F03 AI reader（用途与producer先定）→N02真实store/close/readback（物理库存/保留先定）→C-A完整清理（runner/进度及producer保证先定）→R-A页面实际delta与受控组合；可独立部分并行，不强制伪串行全部前置。ZHOU提交精确新增source／diff／失败与Not Run，JIN审实际变更，LI集中决定剩余PM事项与限定验收。LI共享Home/router/session接入由LI负责，DU审新的共享差异；随后JIN changed-source组合门槛与LI验收按实际新source。旧History/共享/AI已接受范围不因本包重跑或移记证据。

S3工作、Release、merge/Issue关闭、普通runtime enabling是不同判断。E01 M27正式UI、E02 liveQwen/digest/tokenizer/host与Q31-E、E03普通/demo/真实数据及索引启用、E04 Recommendation解释所需producer/入口与fallback条件仍由原具体范围触发；不替LI选、不当本包统一门槛，也不把解释从条件范围扩成新功能。本包不给新截止、不开Issue、不变看板、不合并或关闭。

## 9. 本地开发附录：选定规则的隔离政策，不接真实 adapter

按本轮用户授权，只开发能够独立表达已选F01的Domain／Application政策：无内容preissue guard、local-terminal latch、durable-barrier观察的closed/unresolved，以及完整精度expiry判定。它们不选择/创建Firestore路径字段、没有SDK事务、生产者读取、runner/索引或运行接线；不替代旧strict fake-Port，也不把纯函数通过写成真实wire／ACKloss／cleanup证明。

本地开发已完成以下可分离规则，全部未接线：

| 文件／规则 | 已做验证及边界 |
| --- | --- |
| `backend/src/ai-conversation/domain/real-effect-expiry.ts` | 完整 seconds/nanoseconds、显式 first/existing lineage、等于旧cutoff到期、晚副本不续期、原90d/+24h、坏/缺metadata unavailable。14项纯数学测试；1ns边界不代表实际数据库精度。 |
| `backend/src/ai-conversation/application/real-write-control.ts` | 同步local-terminal latch、每次fresh Auth后复核原guard、已知失效/异常不重开旧request、close的closed/unresolved单调观察。16项无内容测试；不发SDK I/O，不证明匹配op身份/事务排序，也不代替Application内容销毁。 |

锁定 Node `24.19.0`，直接使用已安装仓库 TypeScript 编译器（等价于既定 build，不依赖 ambient pnpm）：`node node_modules/typescript/bin/tsc --project backend/tsconfig.json` PASS；两新增套件 **30/30 PASS**；最终 `node --test --test-reporter=spec 'backend/dist/test/**/*.test.js'` **542/542 PASS**，0失败/跳过/取消。先前27/27、539/539是修正Auth失效锁定前的中间快照，保留但不当最终证据。

[本地实现与验证证据](../evidence/sprint3/2026-10-13-zhou-real-ai-local-contract-and-policy-evidence.md)、[独立本地技术核对及修正](../evidence/sprint3/2026-10-13-zhou-real-ai-local-technical-review.md)和[源码清单](../evidence/sprint3/2026-10-13-zhou-real-ai-local-source-manifest.json)固定本批工作树内容；没有新提交head或远端review。本轮未跑新Emulator/Cloud/Android/Flutter/模型；未改API、索引、依赖、Bootstrap或共享入口。真实旧A→B隔离/ACKloss、SDK字节销毁、数据库排序和24h完整清理仍按第7节Not Run，不由纯policy测试代证。

正式JIN审查仍须未来实际新增source交付；用户本轮no-upload期间只记录本地技术核对，不伪造远端review、LI物理选择或整个真实AI Ready/Done。后续不重复确认F01四项；集中处理第8节剩余确切合同选择及对应真实适配验证。
