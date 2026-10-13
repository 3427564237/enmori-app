# ZHOU 真实 AI 后续切片实施方案候选

## 2026-10-13 当前集中包入口（保留以下历史正文）

当前状态与剩余具体选择集中见 [N02／F03／unknown／来源清理合同包](2026-10-13-zhou-real-ai-remaining-contract-packet.md)。[LI 四项 F01 决定](../decisions/2026-10-13-li-delegated-f01-b-c-d-selection.md)已选择终态排序、必需 SDK 字节、到期晚副本和外部 Auth 检查点；[#92 能力切片已验收](../decisions/2026-10-12-li-ai-capability-slice-acceptance.md)。它们在各自范围内替代下文旧 Pending／Blocked 状态，不改变未选择的 N02 物理合同、F03 生产者、恢复或清理拓扑。

[本轮用户指令](../decisions/2026-10-13-user-zhou-local-ai-development-scope.md)允许按已决定规则先做可分离的本地开发和技术审查，明确禁止上传。本包之后的原文完整保留为 #90 `99583d6bd601ba51c577d46901b3e07e389e6fd8` 历史提案，不再将其中要求重复选择 F01 的文字作为当前门槛；其未被明确取代的规则、候选细节及反例继续保留。

日期：2026-10-12，SGT（UTC+08:00）。责任：ZHOU 提案与获批 AI 消费端实施；JIN 独立审查；LI 确认具体合同、生产者交接及限定验收。本文为**送审候选，尚未获批准，未执行真实适配或部署**。

此前本包仅在本地整理；2026-10-12 用户明确授权“现在上传内容等待审批”，仅释放本方案及原候选阅读入口的 Draft 文档送审，不授权相依实现或合并。精确送审 head／tree、差异和文档检查结果由该 Draft PR 固定，不将文档自身的 commit SHA 循环写入正文。

本包补齐原候选的 F01／F03、N02 及其永久 unknown／来源完整清理依赖；不选择 E01–E04，不创建新 Issue，不重开已验收 Persona、内部生命周期、客户端或旧组合门槛。第一实施环境仍是 LI 已选的 isolated synthetic Auth／Firestore 与 fake Qwen；“真实适配”指对实际数据库及真实生产者边界的适配，不代表已经选择 live Qwen、普通构建或真实账户。

## 阅读顺序和批准状态

先读本节与决议表，再读具体事务、读取和清理协议，最后选择开发切片与验收行。建议 JIN 集中审查本包的新增边界；LI 只对选中的差异留痕，不重复批准不变规则。

| 来源／项目 | 已确认状态 | 本包如何使用 |
| --- | --- | --- |
| [原 #81 候选 `2f00a6c`](https://github.com/3427564237/enmori-app/blob/2f00a6c7ab686ffba2429a4dc74761b12a04d3a5/docs/planning/2026-10-12-zhou-conversation-persistence-mobile-contract-candidate.md) | 原始送审合同与未决事项保留 | 作为旧源；本包逐项提出具体机制或明文修订，不以代码推导新要求。 |
| [LI 条件 A](../decisions/2026-10-12-li-isolated-note-conversation-conditional-a.md) | N01／N04／N05／N06／N07 方向及 F02 已选；F01／F03／N02／恢复／完整清理未解决 | 本包只补后五类具体条款。N01 六操作、plain text、原 token/key、60／5／45 与 15／75／90 保持；F02 不重批。 |
| [LI 并行交付](../decisions/2026-10-12-li-parallel-delivery-reissue.md) | 释放独立客户端与共享入口等工作；局部 hold 不冻结全队 | 文档准备与 #87 审查／组合验证并行；本包不暂停已获批工作。 |
| [#88 `398f81c` 的 JIN 批准](https://github.com/3427564237/enmori-app/pull/88#pullrequestreview-5490189972)、[LI 批准](https://github.com/3427564237/enmori-app/pull/88#pullrequestreview-5490506405)、[持久化组件验收](https://github.com/3427564237/enmori-app/blob/d76804c5e2d49018efe6679fb3a9be97389347ba/docs/decisions/2026-10-12-li-ai-client-component-acceptance.md) | N01／N05／N06 实际客户端与明确 synthetic harness 已验收；R1／R2 已解决 | 保存该精确源；不在其分支上追加未审数据模型，不把 443 或 APK 算真实存储结果。新恢复行为若被选中，另审其实际 delta。 |
| [LI 生产者交接草稿 `d76804c`](https://github.com/3427564237/enmori-app/blob/d76804c5e2d49018efe6679fb3a9be97389347ba/docs/planning/2026-10-12-li-ai-producer-and-shared-entry-handoff-draft.md) | 已提供当前 Account／Settings 与责任边界；尚非最终 AI reader／schema 合同 | 本包给出可逐行确认的 LI／DU 交接选择；历史 owner API 不授 AI 权。 |
| [Q30](../decisions/2026-09-01-backend-architecture.md)、[Q17](../decisions/2026-09-01-recommendation-ai-field-allowlists.md)、[Q19](../decisions/2026-09-01-persona-conversation-lifecycle.md)、[Q31](../decisions/2026-09-02-qwen-runtime-failure-contract.md)、[Q14](../decisions/2026-09-02-retention-logging-audit-policy.md) | 已批准的架构、白名单、快照／失效、预算／终态、留存与日志规则 | 没有在明文差异表列出的规则均保持。所有新物理字段、进度用途或规则解释均须明确选择。 |

送审基线为 #88 `398f81c901fc64f230442dc1405d0ba6b75763b7`，独立候选分支 `codex/zhou-real-ai-slice-candidates-20261012`；Draft PR 以 `codex/issue-83-ai-client` 为 base，仅审本次两份文档，不重新纳入 #88 源码差异。远端 #81 与 #66 的 source 已分别核对为 `2f00a6c7ab686ffba2429a4dc74761b12a04d3a5`、`d76804c5e2d49018efe6679fb3a9be97389347ba`。原候选的历史 Pending 不能覆盖后来的明确批准；后来的 client Approval 也不解除本文 hold。

## 必须由本包解决的选择

| 决议行 | 推荐候选及明确差异 | 审查／确认 | 未获选择时只暂停什么 |
| --- | --- | --- | --- |
| F01 | 推荐逐项选择 F01-B 的终态提交排序／必需SDK结算缓冲、F01-C 的到期不复活判定、F01-D 的外部Auth检查点；各自明文列旧／新差异，须修订受影响C06／Q31／Q14条款。保留F01-A严格旧义是另一选择，不能称替代方案等价。 | ZHOU 给出下文旧／新条款与证明计划 → JIN → LI；若存在更高来源冲突，由其有权主体处理 | 相依真实 user／assistant 写入及其成功声明。未修订时保留严格旧义并标 Blocked。 |
| N02 | 选择下文最小记录、原子事务、查询、索引及清理清单；仅权威 commit anchor 控制 90 天；新 effect／fence／epoch／进度各自给出用途和删除条件 | ZHOU → JIN → LI | 实际 schema／index／adapter／清理运行配置；不修改现有 index 文件。 |
| F03 | 固定 `asOf` 的单一只读 start view、原始 monotonic deadline、当前权限检查及 producer handoff；不允许重试偷偷换开始视图 | ZHOU＋LI／DU → JIN → LI | 真实 Account／Persona／Check-in AI reader。已有 owner history 继续按原合同。 |
| unknown | 不增加 receipt；明确停止本地回读／离开及其限制，不把未知写入当无效果，不新增强制重发出口 | ZHOU → JIN → LI | 依赖新恢复文案／结束动作的页面 delta；现 safe unknown 不重审。 |
| 完整来源清理 | canonical provenance 全量续扫与原子 tombstone，覆盖离线和中断；撤权后重授需最小失效代际及明确新增用途，不靠当前 consent 推断过去 | ZHOU＋LI／DU → JIN → LI | 真实失效发现／清理及相关 producer 数据差异。当前读立即 fail closed 不等待清理。 |

下文每项为推荐**候选**，不是仓库已存在的合同或 PM 决定。可先批准不依赖 F01 的独立验证，但不能仅因文档通过或某个测试变绿自动放行全部 adapter。

## F01 必须先选择的语义分支

Firestore 官方保证事务在 commit time 可串行化；参与事务的读写围绕该提交顺序发生。它没有把服务器提交瞬间绑定到本进程的单调时钟。服务器 SDK 的锁/冲突控制有助于建立 **数据库中的先后顺序**，不是本地终态瞬间的远端撤回保证。[官方事务说明](https://firebase.google.com/docs/firestore/transaction-data-contention)

本地锁文件使用 `firebase-admin 14.3.0` / `@google-cloud/firestore 8.7.1`。已只读核对安装文件 `D:/3851 AI/formal/enmori-app/node_modules/.pnpm/@google-cloud+firestore@8.7.1_supports-color@7.2.0/node_modules/@google-cloud/firestore/types/firestore.d.ts`：542–548 行 `ReadWriteTransactionOptions` 仅 `readOnly`、`maxAttempts`；714–719 行为其 `runTransaction` 签名；1619–1622 行定义 `createTime`。没有公开的 `AbortSignal` 或「按本地 monotonic deadline 原子拒绝 commit」选项；同目录 package.json 的实际 version 为 8.7.1。`maxAttempts:1` 只能作为避免 adapter 重跑业务事务的候选，不能证明已送出的 RPC 不会提交。SDK/网络错误、取消本地 Promise、客户端断线、读到空文档，均不能作为 no-effect 证明。C06 固定源已用本地 `git cat-file -e` 核对存在，对应 doc blob 为 `1d63c7573d84da47cd07379d52fe1a66cf015a81`。

### F01-A：保留现有严格物理语义

若 LI 保持「本地 cancel/disconnect/60 秒 terminal 先发生，Firestore 此后不得新增用户/助手物理效果」以及实际效果点精确检查 UTC 到期/权限的原条款，则 **真实写入、Retry、取消确认、删除确认的相应适配保持 Blocked**。有限次成功测试、加 fence 字段、提前几秒发写入、发送前看时钟或在 ACK 后隐藏消息，都不能完成此证明。继续可独立进行的已批准 client/fake-Port 工作，不重开其批准。

### F01-B：可审查的最小替代条款，待 LI 明确修订

以下是申请修订，不是对旧规则的重新解释；必须保留旧文并逐行标明替代范围。

| 旧条款 / 精确受影响位置 | 新条款候选及其可观察后果 |
| --- | --- |
| Q31-B 的 `acceptedAt+60s` 终态与 disconnect 后不得再持久化助手；C06「Cancellation/deadline/deletion wins before commit effect → no assistant commit」；N01 必须保持生命周期第 4、5 项。 | 本地 60 秒/cancel/disconnect 立即结束 Application、停止新 dispatch/事务发起/原响应交付，释放应用所有权并清空自身内容引用。**已经交给数据库的事务以 Firestore commit 顺序与 terminal-fence transaction 排序**：fence 先提交则旧事务不得在其后成功提交；旧事务先提交则其合法已提交效果可保留，即使其物理提交或 ACK 晚于本地 terminal。不能再宣称「本地第 60 秒起零远端物理效果」。 |
| C06 actual-effect 原时钟检查；fake-Port 的同步 `effect(commit)` 能原子拒绝迟到提交。 | 同步 fake 合同仍原样保留。另行批准真实 adapter 的 `dispatch guard + durable close barrier + authoritative readback` 合同；不能把异步 Firestore call 塞入同步 commit callback。控制面只报告 `closed` 已确认或 `unresolved`；未确认 barrier 不报告成功 Cancel/no_effect/user_saved。 |
| Q14「Transient model-processing data exists only for the request」及 C07 终态释放处理内容。 | 仅对终态前已经发出的数据库 RPC，允许 SDK 持有**完成/终止该 I/O 所必需的已验证消息字节**至该 I/O 结算；Application 不持有可再次使用的 prompt/candidate，不做 replay/cache/log/再次生成或新的持久副本。必需缓冲结算后立即释放；未能证明供应商缓冲的立即销毁时必须如实标为未知，不以 `AbortController` 宣称物理销毁。这个新处理用途必须显式批准。 |

F01-B **不改变** 60/5/45 的 Application 时间、one-active/two-queued、每用户 one-nonterminal、模型 lane 实际停机前隔离、fresh explicit Retry、F02 本地受保护 sink、没有 terminal 后原响应、Q14 的 90 天或 24 小时规则。它不授权已失效的 consent/来源/Persona 写入，不授权删除后重建，不自动释放 F03。

### F01-C：到期临界写入的独立具体选择

旧条款仍是「只有当实际效果发生时 Conversation 未到期才可写入；到期即不可访问，不得续命，成功消息才推进 anchor」。事务回调读取 `now < expiresAt` 不能证明 actual commit 早于 expiresAt；每小时才写 expiry fence 不能提供即时边界。

**待 LI 选择的新条款候选：** 保留 90 天到点立即不可访问和绝不复活；只容许到期前已交给 SDK、在 expiry-fence 提交前排序成功的事务产生不能对外采用的临界晚物理副本。晚副本不得成为新合法 retention anchor，不交付、不生成后续结果、不逐条回滚，随已到期的整个 Conversation 清理。物理清理期限仍从**原**到期 instant 起算 24 小时，不因晚 commit/ACK 重新起算。这明确修订了「到期后绝无物理写入」，没有新增 grace 或延长保留。

具体候选算法如下，不能仅用 parent.state 或 ACK 成功判断有效：

1. parent 字段采用 `latestMessageId`，只表示最近一次**物理**消息引用，读取时必须验证；不是直接可信的 retention anchor。每条对 existing parent 的新 user/assistant 增量在同一事务存不可变 `appendBefore`，值为该事务读取并验证的前一个有效 anchor＋90 天；仅原始 first-user/sequence=1 新 parent 可省略该字段。其余消息缺字段或时刻异常一律 fail closed。
2. 提交后、所有普通读/分页/readback/Retry/新 Send/生成 dispatch/交付/清理入口均用同一个 resolver：读取 parent 和其 latest message 的完整精度 createTime。若有 `appendBefore` 且 `createTime >= appendBefore`，**整个 Conversation 永久视为在 appendBefore 已到期**，不采用该 createTime 更新语义锚点。语义旧 anchor 可由 `appendBefore−90 天` 得出；所有内容读/写拒绝、后台标 deleting 并整段清理。只有 `createTime < appendBefore` 才可把该消息作为新有效 anchor。
3. 每次 append 必须在同一个事务读并验证当前 parent/latest message，再更新 parent。这使两个并发 append 冲突排序：后者只能建立在合法前者上，或因前者 late-expired 拒绝。已经发现 late append 的链条不能再添加合法新消息；清理和时钟后调也不能使其重新 live。原 U 的 canonical accepted 槽即使有物理指针也不绕过父级到期 resolver，不能对外声称 late 副本是合法 accepted 结果。
4. ACK 丢失不影响判断；resolver 从已持久 metadata+cutoff 判定。一个提交在旧 expiry 前合法创建的消息正常延长 90 天；提交在旧 expiry 处或以后者永不延长。第一次 user commit 若临界失效，模型调用数必须为零；Retry 的临界 assistant commit 不交付。所有旧页面、effects和任何普通结果读先过同一父级resolver；本案不新增receipt。
5. expiry-fence 事务将 resolved-expired parent 标 deleting；它先提交时所有读该 parent 的内容事务失效，它后提交时只能删除晚物理副本，不能批准新 anchor。若写入长期未结算跨过原 expiry＋24 小时，24 小时 SLA 已失败并保持不可读，不移动期限或伪报成功；依赖 outage 的这一现实上界不能由 SDK 保证。

该方案新增 `appendBefore`、更名 parent pointer、所有路由统一 resolver，并允许窄范围晚物理副本，必须与 F01-B 分别列为规则/data delta 交 LI 决定。依据仍是 LI 同意的服务器不可变创建时间解释，不能自行把 server REQUEST_TIME 当 actual commit。有界验证分两层：内层精确比较算法验证cutoff前1ns、等于、后1ns；实际锁定SDK／Emulator验证服务可观察的创建时间精度和临界提交、首写/助手/并发更新/ACK-loss及跨24h停顿，**不声称实际Firestore可以制造1ns间隔的提交**。JIN独立核对观察结果与源码推理。若本栈不能提供可信创建时间、统一resolver或fence顺序证明，输出明确反例/不可证明项并停止该适配，不反复实验冒充保证。

LI 若不选择 F01-C，则保留 strict 旧义，跨 expiry 的真实 append / Retry 继续 Blocked；F01-B 本身不能解除它。

### F01-D：外部 Firebase Auth 与产品数据 authority 分开

Account/purpose/source 在同一 Firestore 内并使用同一事务读取，才可与其 producer 写入冲突排序。Firebase Auth 的 token revoked/disabled 状态不属于该数据库事务；`verifyIdToken(...,checkRevoked) → await commit` 无法证明这段间隔没有外部变更。synthetic Account 也不证明任意撤销竞争均安全；本提案不加 Auth 影子状态表、永久事件或跨系统锁。

旧严格条款是C06 actual-effect必须仍有当前trusted authority。待LI选择的checkpoint解释仅针对外部Auth：原HTTP auth与admission校验不变；**每个内容事务发起前**重新取得revoked/disabled校验成功结果，并同步复查原Application/session/deadline。随后事务callback只做数据库读写和同步dispatch guard，不在其中访问Firebase Auth网络服务。任何已知失效终止且不发起新写入；实际模型dispatch和F02 sink也执行各自获批的current authority checkpoint。它承认Auth检查之后、数据库读取和远端commit之间存在无法与Firestore原子化的未观察变化窗口，不能宣称提交瞬间外部Auth绝对有效。敏感token仍只在原请求边界，内层仅用安全Port结果，不进入durable guard。

JIN 应在受控 synthetic 身份上对「校验返回后立刻 revoke/disable、再释放 commit」记录真实观察，并核对现有 Auth SDK 行为；不对真实用户执行。LI 若不接受此窄 checkpoint 语义，严格 actual-effect Auth 子项继续 Blocked，不能用 F03 transaction 或 fake Auth 成功替代。涉及更高权限隐私义务时另由有权方判断，不能以 PM 文字消除约束。

批准路径：ZHOU 提交本变更及故障反例 → JIN 技术/契约审查 → LI 在 Q31/C06/Q14 的 PM 权限范围内明确选择、持久化 `docs/decisions/` 并下发限定实施范围；不以新增 Issue 为前提。若触及更高层、不可豁免的隐私或平台义务，LI 不能代为豁免。没有修订则使用 F01-A；JIN 的测试/代码通过不替代 LI 修订，批准修订也不等于实现或启用通过。

## N02 精确物理增量候选

所有以下记录均 Backend-only；owner 从可信 Principal → Account binding 得到，不能由请求提供。ID 复用已选择的无意义 UUID-v4；不复制普通个人资料、token/key/hash、请求正文、模型参数、prompt、原始模型响应、Persona ID/name/snapshot。Firestore Admin 权限不是业务授权。

| 路径 / 记录 | 字段候选与用途 | 寿命 / 重要约束 |
| --- | --- | --- |
| `accounts/{accountId}` 现有 record 的候选增量 | `purposeRevocationGeneration` 非负 safe integer，本 Note-only 用途专用；synthetic 初值 0；LI `saveSettings` 对同 doc 的 accepted→rejected 转换在原事务内加 1，重接受不归零，溢出 fail closed。 | producer 扩展待 LI 同意并由其实施；不另造 settings 子 doc，不扩大到其他用途/设置，不在账户外复制撤回日志。AI 不创建/补齐/重设非法或缺失生产者字段。 |
| `accounts/{accountId}/conversations/{conversationId}` | `state:'live'\|'deleting'`、`lifecycleVersion` 正安全整数、`nextSequence` 正安全整数、`latestMessageId`。第一条用户消息事务创建，无空 parent。 | latest 引用须先经 F01-C resolver 才能代表合法 anchor。parent owner 由规范祖先路径确定。缺字段/非法值一律 fail closed。deleting 无恢复能力；全部后代和相关未决 guard 处理完后才删 parent。 |
| 同 parent 下 `messages/{messageId}`，user | `role:'user'`、`sequence`、`text`；可选 `acceptedAssistantMessageId`；可选 `pendingOperationId`。 | 正文在首次 create 后不可编辑。后两者为唯一助手槽和该 U 的独占操作 claim；不是 UI 字段，不推进 retention。单个 pointer 能覆盖全部相关未决操作的前提是所有入口在 generation 前原子独占同一 U，且旧 claim 未释放不能取得新的。 |
| `messages/{messageId}`，assistant | `role:'assistant'`、`sequence`、`availability:'available'\|'unavailable'`、`replyToUserMessageId`、Q19 `presentationMode` / 按原合同可选 `presentationProjectionVersion`；available 才有 `text`。 | 助手 ID 与 user canonical 指针同事务。tombstone 清除全部 text/provenance，不删除 accepted 指针，不允许再次为 U 生成；不得单条删除来修复迟到 commit。 |
| `message_sources/{assistantMessageId}` | **每条 available assistant 都有该 doc**：合法空 `{sources:[]}`；非空 `{sources:[{sourceType:'check_in',sourceId}],purposeRevocationGeneration}`，最多 5 条实际使用来源。 | 空 doc 与 missing doc 不同；缺失不能推断为「无来源」。tombstone 同事务删除整个 doc。`purposeRevocationGeneration` 仅是 F03 提出的**待批**用途撤回历史 stamp；须 LI producer 单调 generation 合同，不把一般 settingsRevision 当成全部失效，也不重新储存 purpose。 |
| `effects/{operationId}` | `kind:'send'\|'retry'`、已确实存在的 `userMessageId`、实际由本次操作创建时才加 `assistantMessageId`。 | 新用途：当前 owner 的已选 operation readback 及效果排重。拟随被证明消息/Conversation 保留，最迟其删除/到期清理一起删除；并非 Q14 自动授予的新审计记录。effects 不能取代 U 的 accepted/pending canonical pointer。 |
| 全局 `ai_operation_fences/{operationId}` | `ownerAccountId`、`conversationId`、`userMessageId`、`kind`、`targetKind:'reserved_new'\|'existing'`、`processEpoch`、`revision` 正整数、`state:'open'\|'closed'`。 | 仅当前在途事务及其结算保护。无恢复执行数据、deadline 队列、token/key、prompt。首次业务效果前建 guard；不是 prepare 持久化。closed 后永不 reopen，ID 永不重用。缺 guard 一律没有写权。 |
| 全局 `ai_runtime_fence/current` | `processEpoch` 随机 UUID-v4、`generation` 递增安全整数；`cleanupGeneration` 非负 safe integer。 | epoch 撤销旧进程全部存储写权。cleanupGeneration 仅使旧清扫 checkpoint 失效，不影响其他 U 的消息写权/模型槽。仅一个当前记录，无 epoch 历史、个人信息或恢复任务；服务退役且全部事务结算后删除。不是多主租约、容量调度器或新的服务。 |
| `ai_cleanup_progress/source_sweep` | 合并清理候选的唯一进度记录：`schemaVersion, revision, phase:'messages'\|'message_sources', lastDocumentName?, startedAt, resumeUntil, hadFailure`。 | 全量 canonical 两阶段清扫；`resumeUntil=startedAt+24h` 为候选 cursor 寿命，完成即删。path cursor 不含额外 source ID 列表，但自身含业务路径，不能入日志或 UI；具体治理见本文来源清理章节。 |

message共同新增候选字段 `appendBefore:{seconds,nanoseconds}`：seconds为safe integer，nanoseconds为0..999999999整数，map只允许这两个字段；仅按F01-C的first-user例外省略。它随tombstone保留为非内容到期guard，随整个Conversation删除，不建立新的保存期限。表内所有字段均需选定，未列字段不保存。

需要共同审批的 F03 字段是 LI producer 的最小单调 `purposeRevocationGeneration` 和非空 `message_sources` 的 stamp：它们解决「AI 离线期间撤同意再同意」不能靠当前 bool 判断历史可用性的问题。DU Check-in ID 不复用须成为生产者保证；saved edit 没有选择。本 N02 不自行发明 source edit version、删除事件表、反向来源索引或永久 mutation 日志。

### retention 时间的物理 delta

旧未批准 N02 表直接列 `lastPersistedMessageAt, expiresAt, persistedAt`。本候选保留这些**语义值**，物理上 parent 的 `latestMessageId` 指向最近一次新建消息，先按 F01-C 验证合法 append，再从该 message 不可变 Firestore metadata `createTime` 派生有效 `persistedAt` / `lastPersistedMessageAt`，计算 `expiresAt=anchor+90×24h`；late append 永不采用为新有效 anchor。parent pointer、appendBefore 与 message create 在同一事务，ACK 丢失也可判断；后续 accepted/pending 指针、tombstone、清理不改变 createTime。不能用 `updateTime`，不能删除再创建同 ID；锚点不存在/非法时整个会话 fail closed。

**精度：** Infra与内层权威timestamp使用整数seconds＋nanoseconds，比较/add90d/subtract90d保留服务实际提供的完整精度；内层不导入vendor type、不经JS Date／DTO／浮点毫秒决定retention。Firestore日期字段仅保留微秒，更细精度会被截断，因此`appendBefore`持久为上述整数map，不写Firestore Timestampvalue；不能从SDK类型支持nanoseconds推定数据库提交具有纳秒精度。[官方数据类型](https://firebase.google.com/docs/firestore/manage-data/data-types)。公开ISO沿既定N01，不将舍入值回流为权限依据；shared `AuthoritativeValues` 的Date接线须单独验算，不能自行宣称已符合。

如果 Backend `now` 只能精确到毫秒，在 expiry 落入该不可分辨的毫秒时 fail closed，不能把锚点向下/向上舍入后授予额外访问时间；这是边界精度不足时拒绝，不改变 canonical expiry。JIN 应分别验证时钟值精度与服务器 metadata 精度，不声称任意真实墙钟误差已解决。

这是**申请批准的物理实现解释**，不是已选 schema。官方将 `createTime` 定义为服务器生成的文档创建时间，`updateTime` 会随修改推进；官方 `REQUEST_TIME` 则是服务端处理请求时间，不能无证据把 `serverTimestamp()` 同义替换成 `CommitResponse.commitTime`。事务响应中的 commitTime 是提交发生时间，但响应到达后再回填 parent 不能满足原子锚点约束。[Document metadata](https://docs.cloud.google.com/firestore/docs/reference/rest/v1/projects.databases.documents#Document)、[server transform](https://docs.cloud.google.com/firestore/docs/reference/rest/v1/Write#ServerValue)、[Commit response](https://docs.cloud.google.com/firestore/docs/reference/rest/v1/projects.databases.documents/commit)

JIN 必须核对当前 SDK 与 Emulator 的 createTime / commit observation；LI 须明确接受用不可变创建时间实现 Q14 的权威持久化锚点。若要求证明其数值与原始 commitTime 完全相同而现有证据不足，保留此子项 Blocked，不能选 client UTC/request-start/serverTimestamp 冒充。同样不改变严格 expiry 竞争的上一节缺口。

## N02 事务和操作顺序候选

所有业务消息事务同时读取 **current runtime epoch、已存在且 open 的原 op fence、owned live parent/原始保留锚点、相关 U 的 canonical claim/assistant 指针、F03 规定的当前 producer authority**。校验 owner/target/epoch/revision；全部读在写之前。事务 callback 不生成、不调用模型、不发 HTTP、不记录私密日志，不产生新的业务 retry；失败映射 stable dependency/unknown。候选 `maxAttempts:1`，新的明确用户 Retry 才能生成。SDK 已发 RPC 是否完成仍以 barrier/readback 结算，不以异常类型猜测。

| 边界 | 同事务内容；明确拒绝条件 |
| --- | --- |
| 启动 | 在接受任何 AI 用例前替换 `ai_runtime_fence/current` 的 epoch 并推进 generation；确认该提交后，旧 epoch 的后续内容事务无权提交。结果未知则 AI affected readiness 不可用，非 AI liveness 独立。只做旧 guard 结算/清理，不恢复 queue/generation/旧 ticket。 |
| guard 建立 | 已消费 ticket、原 Application 有效并通过 lane/pre-generation checks 后，建立原 op fence；所有 guard 创建事务也读取并匹配本进程 epoch。未确认建立不得发送内容 commit/调用模型。guard 创建不保存消息、不开空 parent、不推进 retention。 |
| Send 首写 | 对 existing 目标只读现有 live parent；只有原内存 ticket 证明的 reserved_new 才可 create absent parent。create user U（含 `pendingOperationId=A`）、create/update A effects.user、parent sequence/last-message pointer 原子提交。拒绝容量/队列/输入/authority 时不写 U。未知不得调用模型。 |
| Retry claim | 读取 saved U，校验 owned/live、用户本次明确给出的 text 与 U 精确相同、无 acceptedAssistantMessageId、无任意其他 pendingOperationId；原子设置 `U.pendingOperationId=B` 并写 B effects.user。只建立无内容 claim，不重写 U.text/createTime、anchor 或 sequence。返回前/实际 model dispatch 时仍检查原 request/session/epoch/期限/authority；并非凭此事务永久授权生成。 |
| 助手提交 | 要求 `U.pendingOperationId=本 op` 且 accepted 指针为空；create assistant、create sources（包括合法空数组）、设置 U.acceptedAssistantMessageId、更新本 op effects、parent sequence/latestMessageId 原子发生。**此事务保留本 op 的 pending claim**，避免 commit 已完成但 ACK 丢失时旧操作误把后续操作视为已结算。assistant 和 U 配对不靠相邻 sequence 推断。任一缺失/错配 fail closed。 |
| terminal barrier | 本地终态先阻止新发起动作，再事务把本 op fence 从 open→closed、推进 revision；不得动另一 op。已确认 barrier 与之前读该 fence 的业务事务可串行排序；仅在选定 F01-B 后可据此解释已送出事务的终态结果。barrier 未知：保留 guard，结果 unresolved，不声称 Cancel 成功。 |
| terminal 结算 / readback | barrier 已确认或经已确认 restart epoch 证明旧 op 无未来写权后，在同一权威读取中看 U、canonical accepted pointer、对应 assistant、effects、任何其他 pending claim，且按当前来源/用途重新授权。只清除 `pendingOperationId==正在结算的 op`；读到 B 时旧 A 不修改 B、不返回可 Retry 的 user_saved/no_effect。 |
| Conversation 删除 | 先把 parent 原子标记 deleting、推进 lifecycleVersion，并作废同目标内存 ticket。此 parent 事务与内容事务冲突排序。对该目标全部 fence 建立/确认 barrier，随后枚举并清除 messages/sources/effects；parent 最后删除。204 前还需同事务推进 singleton.cleanupGeneration 并删除任意 active source_sweep checkpoint，避免仍在处理的旧 page 在 204 后重建含已删路径的 checkpoint。完全删除和封锁确认才 204。无限后代不能假称一个 batch 原子删完。 |
| 到期删除 | 读/写入口先按 F01-C resolver 判定 late-expired，再按合法 anchor 派生 expiry fail closed。扫描只提供候选；标 deleting 的事务重新读 anchor/version，不能凭旧页面删除被**合法**新消息更新的会话。late 副本只可整段清理，严格旧义分支仍受第 2 节阻断；不得依赖扫描延迟延寿。 |

**claim 与普通 ACK 的区别：** `pendingOperationId` 是对 U 的操作独占权。用户写入的确定 ACK 不解除其接下来的助手生成 claim；助手写入的确定 ACK 使当前请求知道效果已完成，但不在原助手事务内删除 claim。原请求仍存活时，以单独无内容事务核对该确定助手效果／accepted pointer，并仅在 `U.pendingOperationId==本op` 时解除自己的 claim，无需提前终止原操作或进行恢复性回读。这个事务不重写正文／createTime／sequence／anchor。若在解除前已经 terminal、ACK未知或解除结果未知，则按原 barrier＋权威结算路径处理，保留保护直到证实；旧 A 不清 B。回读见已保存assistant但仍有B claim时依旧 unresolved，只有结算后才返回 assistant_saved。对另一个新 U 的独立 Send 不施加此 target claim，仍只遵守 Q31 当前 nonterminal 和模型 lane 规则。

**初始 guard 创建的 ABA 边界：** 取消可能发生在 open-fence 创建 ACK 之前。原 registry 证明目标后，可写 closed guard 占住相同 op ID；不得「读到 absent 就当已封锁并马上删 guard」。在所有初始化/内容 RPC 确定结算，或已确认新 epoch 屏障令它们不能再提交以前，保留该 closed guard；否则迟到初始化可能在删除后重新创建 open。所有写入都必须读 epoch，所有内容事务永不创建缺失的 fence，op ID 永不复用。

**A → B → C：** A 已保存 U 并结算，B 已取得 U 的 claim 后提交助手 ACK 不明。查询 A 或 B 均先发现 B claim，返回 unresolved；C 不得生成。B 的 barrier 与读回确定有 accepted assistant 时，查询 A 也沿 U 的 canonical 指针找到它；成为 tombstone 仍占槽。若确认无助手并只清除 B 自己的 claim，C 才能重新原子争取。迟到 A ACK/cleanup 不得清 B，迟到 B ACK 不得释放新 C。整个流程不保存 request body、模型候选或复用旧 generation。

**重启：** durable guard 只证明/封锁旧效果，不能 execute 旧 ticket。新 epoch 确认前所有 AI message writes 暂停；确认后逐项结算旧 guard。旧 runtime 实际 model stop/quarantine 仍须独立证明，epoch 不是停止模型命令。不支持多 host/多实例容量；不能把上述记录宣传为分布式调度器。

**不存在 parent：** 原始 reserved_new ticket 的 registry owner/target 身份、原 op 已封锁和权威 absence 缺一不可，才能在尚存原终态观察期间给 no_effect。重启后 durable fence 只用于内部清理，不自行扩大 N01 为持久 ticket/no_effect receipt。已删/到期 existing target 统一 unavailable，不能用 absent-parent 分支重建。永久 unknown 出口由本文恢复候选决定；本 schema 不偷偷使其已解决。

## N02 查询、索引、清理与 control 保留

| 查询候选 | 必需索引 / 约束 |
| --- | --- |
| 已授权 parent/messages：`sequence < before`（有 cursor 时），`orderBy(sequence,desc)`, `limit(20)`；返回前按 sequence 正序 | `messages.sequence DESC` collection-scope 单字段索引；全会话 sequence 唯一由 parent 同事务保证，安全整数耗尽 fail closed。不会以 cursor 绕过 owner/来源/expiry。 |
| 已知 user/assistant/effect/fence/current epoch | 精确 document get；无查询索引，不允许用 operationId 推断 owner。 |
| whole-delete 发现该 owner/Conversation 全部 guard | `ai_operation_fences where ownerAccountId==owner and conversationId==id orderBy(__name__)`；候选 collection-scope composite `(ownerAccountId ASC,conversationId ASC,__name__ ASC)`，不用 state 过滤遗漏 closed/pending。 |
| parent expiry 发现 | `collectionGroup('conversations').orderBy(FieldPath.documentId(),'asc').limit(25)`，无业务过滤；后页`startAfter`前一完整DocumentReference（由内部full path构造）。逐项读latest message createTime并走resolver。无expiresAt范围查询或虚构metadata字段索引。 |
| 来源完整清理 / orphan 修复 | `collectionGroup('messages')`及`collectionGroup('message_sources')`，各显式`orderBy(FieldPath.documentId(),'asc')`＋full DocumentReference keyset，每页25；无业务过滤。验证canonical祖先路径，越界/异常非空成功；无source reverse index。 |
| 重启 guard 补扫 | `ai_operation_fences.orderBy(__name__).limit(25)`，逐项按 epoch/guard 状态结算；不筛只留 open 而漏 closed。 |

以上是**待批准查询与索引 inventory**；不在此更改 `firestore.indexes.json`。精确 field policy 选择如下，JIN 的职责是验证该候选能执行，不是代选遗漏的字段：

| collection group / 字段 | 单字段与 composite 的精确候选 |
| --- | --- |
| `conversations`, `message_sources`, `effects`, `ai_runtime_fence`, `ai_cleanup_progress` | 各自`fieldPath:'*', indexes:[]`，所有新增业务字段自动索引关闭；仅精确文档或无业务过滤／显式name排序扫描，不创建额外业务字段custom index。 |
| `messages` | `fieldPath:'*', indexes:[]`；唯一 automatic 例外 `sequence` 的 `{queryScope:'COLLECTION',order:'DESCENDING'}`。text/role/availability/replyTo/accepted/pending/presentation/appendBefore 全不自动索引；不创建 array 或 collection-group 业务字段索引。 |
| `ai_operation_fences` | `fieldPath:'*', indexes:[]`；无单字段例外。唯一手工 composite 为 `{queryScope:'COLLECTION', fields:[ownerAccountId ASC,conversationId ASC,__name__ ASC]}`；使这两个内部 target 字段只用于 whole-delete guard 发现。 |
| 既有 `accounts` 的新 `purposeRevocationGeneration` | 仅该 field `indexes:[]`；不 wildcard 修改已有 Account 索引/字段。LI producer 文档需引用本增量。 |
| 既有 `check_ins` | 本 N02 不变更已有索引；F03 的 owner＋createdAt DESC＋name ASC 新候选单列，不覆盖 History 的既有方向。 |

keyset明确使用显式documentId排序＋完整DocumentReference，不依赖默认排序对引用cursor的隐式补全；锁定8.7.1对无orderBy的DocumentReference cursor会拒绝。候选仅依赖name-only collection-group能力，不新增业务字段索引；切片A必须验证它与wildcard排除共存、首尾页、cursor文档已删、跨parent同名及非法ancestor，当前Not Run。wildcard只关闭自动字段索引，手工composite另列；不能凭默认排序文档就宣称本套group分页可执行，不以Emulator成功宣称云索引部署。[索引与exemption](https://firebase.google.com/docs/firestore/query-data/index-overview)、[默认排序](https://firebase.google.com/docs/firestore/query-data/order-limit-data)

调度候选复用既有 Backend 受控入口，启动补扫＋每 1 小时启动一轮，各 canonical page 25；不引入 Cloud Functions/新服务/队列。来源清理按本文候选的单条 progress 续扫；expiry/guard 小范围扫描可先用进程内 cursor，重启从头扫，重复处理必须安全。failed page 不报 complete；并发新建位于 cursor 之前的记录由下一轮从头重扫覆盖。最坏全轮耗时、停机、积压与重试必须留实测证据后才能声称到期后 24 小时完成；1 小时触发本身不是 SLA 证明。

每个 source sweep page 捕获 current `processEpoch + cleanupGeneration`，所有 checkpoint create/update 均在事务读取该 singleton 并匹配捕获值；全删推进 cleanupGeneration 后，旧 page 只能弃掉游标而不能重新保存 path，新扫描从头开始。只比较已被删除/重建 progress record 的 revision 不够，因为存在 absent→create 的 ABA。cleanup 执行是获准的 Backend 服务身份，不依赖用户 token 或用户同意仍为 accepted；普通 owner GET/Delete 权限仍按其独立 contract，不能用 AI purpose 拒绝 owner 管理自己的历史。

Firestore 删除 parent 不会删除其子集合；TTL 非即时、非事务且不级联子集合，官方「通常 24 小时」也不是本项目的物理清理承诺。因此本提案不以 TTL 实现安全 fence、即时 expiry 或整段删除。[删除文档说明](https://firebase.google.com/docs/firestore/manage-data/delete-data)、[TTL 限制](https://firebase.google.com/docs/firestore/ttl)

control 保留申请：

- `effects` 的确切新用途限已选 owner readback/排重，随所属 Conversation 清理；不是通用事件记录，不允许保留 token/key、正文摘要或相应 Persona/source 副本。
- 正常 op fence：所有初始化/内容 RPC 已结算、旧 op 已永久无写权、canonical outcome/claim 已解决时立刻删；无需为了长期 no_effect 保留它。无内容 terminal registry 也在必要清理结束即销毁。
- **异常 unresolved fence 不设自动 TTL。** 候选值：立刻停用受影响目标的 Retry/readback 放行；15 分钟仍未解决报告无内容运维故障；24 小时内由 LI 指定 operator 完成依赖恢复和 fence/reconciliation；逾期记录故障，不谎称清理完成、不自动删除保护。若依赖始终不可用，不能同时承诺有限硬删除时间和零迟到效果。LI 必须明确批准「证明完成前最小 control 持续保留」这一异常用途，或保留此切片 Blocked；不能把它写成默认无限保留许可。
- singleton runtime fence 只留当前 epoch，启动替换无历史。decommission 在全部旧事务结算且无再启用路径后删除。它不保留用户或操作名单。
- owner 整段删除确认前必须包括适用 controls 的实际清理。依赖不可用时返回 unknown，不因取消本地等待而假报 204。没有新增 Trash/Restore、永久 receipt、恢复执行、单条回滚或 source 删除补偿宽限。
- 运维记录只用 Q14 allowlist 的 route template、stable error、时长、可信 request correlation；控制文档/路径/UID/operationId/sourceId 不输出到日志、测试 transcript 或产品 UI。测试报告仅用固定 synthetic fixture 标签。

## F01／N02 实施前后证据计划（本文全部 Not Run）

先由 JIN 审核 SDK 真实可提供的语义及 F01 反例，LI 选择明确修订/字段/用途/保留/运行责任。只有决策落盘及限定实施下发后，才按 Domain/Application Port → Infra adapter → Transport/composition 的方向实现。**先关闭依赖门槛，不拿 fake current-authority 替代 F03 后宣布真实 Note 数据切片完成。** 不修改既有 client 六操作合同来迁就 adapter。

| 证据组 | 必须证明；不能被什么替代 |
| --- | --- |
| P01 原子消息效果 | user/message/effect/parent/sequence/anchor pointer 同时有或无；assistant/U 指针/sources/effect/anchor 同时有或无；故障注入在读、commit 发出、服务器 commit、ACK 交付四处。拒绝 proof-only、空 parent、无来源 doc 的 available assistant。 |
| P02 terminal 反例及新条款 | 真实 Emulator 事务在本地 60 秒/cancel 前发出、之后才提交；如观察到迟到 effect，旧 F01-A 明确失败而非隐藏。另证明 closed-fence 提交排序后不能再有旧效果。后者只能满足获批 F01-B，不证明严格本地时刻版本。 |
| P03 ACK 丢失/重入 | 确认 commit 丢 ACK、确认 no-effect、unknown；缺失读取不释放 Retry；正常确定 ACK 无多余 generation/读回/提前终态。模型计数为 fake Qwen 实际 dispatch 次数。 |
| P04 target-wide | A→B→C、B unknown 后查 A、两个 Retry 同 U、tombstone accepted、迟到 A 清理、独立新 U Send；同时验证 canonical pair 和 generation 前 claim，不仅最终唯一助手。 |
| P05 重启/ABA | 初始 guard ACK 丢失后 cancel；closed guard 删除竞争；旧进程已发 RPC 跨新 epoch；新 startup barrier ACK 未知；逐点 kill/restart。零旧执行恢复，保护不丢失，旧初始化不能 reopen/重建已删目标。 |
| P06 authority / expiry | 同事务F03 producer变化、来源/Persona删除、撤同意再接受；外部Auth事务前verify之后revoke/disable的窗口单独实测；cutoff比较前1ns/等于/后1ns为内层算法验证，实际SDK临界commit与24h停顿按其可观察精度另验，旧expiry页遇合法新anchor。未选语义／缺证据时Blocked，不标旧严格规则成功。 |
| P07 retention | 对照服务端 message createTime 和实际 commit observation；user claim 更新/assistant tombstone/read/retry/failure 不重置锚点；缺锚点拒读；晚于旧 expiry 的 commit 不可让会话复活。 |
| P08 整段/来源清理 | 多页 messages/sources/effects/fences、orphan subcollection、缺 provenance、停机期间 invalidation、失败 checkpoint、新建落在旧 cursor 之前、幂等续扫和 24 小时 backlog 演练；逐类证明没有 content/source index 残留。 |
| P09 边界与交付 | 对 adapter 跑获批后的共同 Port contract；Fastify injection auth/DTO/error/no-store；isolated Auth+Firestore Emulator 合成链路；client fixture 不冒充存储证据。无敏感日志、新依赖、默认入口或实时模型。 |

交付证据需固定 code head/tree、决策 SHA、依赖锁版本、Emulator/环境、命令、故障注入点和实际 Pass/Fail/Blocked/Not Run，保留严格规则不成立的证据。Emulator 不能证明真实云网络上限、Firestore 内部缓冲销毁、云索引已生效或 live 模型终止。ZHOU owner 验证、JIN review、LI 验收、JIN changed-tree gate、E03 启用各自独立。


## F03：已有能力与缺少的保证

| 生产者／适配层 | 已有源码与字段证据 | F03 不能据此推定的内容 |
| --- | --- | --- |
| Auth／Account（LI） | `FirebaseIdentityVerifier.verifyIdToken` 使用 `verifyIdToken(token, true)`；Firestore binding 关联 Account；有效 Account 含 onboarding 完成时间。 | 此次验证不覆盖之后的 Auth 撤销；Account 无已批准的 blanket AI capability。 |
| Settings（LI） | `optionalProcessingConsent` 为 accepted／rejected；`settingsRevision` 由 Settings 保存递增，合法 legacy 数据可为逻辑 0；visibility 与 consent 是不同语义。 | revision 变化不等于撤同意，当前 accepted 不能证明期间从未 rejected。现有字段不自行批准“旧 Note 可给 AI”。 |
| Persona（ZHOU，既有批准范围） | owner 的 `persona_state/current` 有 `stateRevision`、live IDs、可选 Active；每项有 revision，既有 repository 在同一事务验证集合。 | state/item revision 变化不能一律取消 AI；Q19 明确编辑和切换不影响已开始请求。 |
| Check-in（DU） | 存储有 `ownerAccountId`、`note`、`createdAt`、可选 visibility；Note 创建时已验证，现存仓库有 create／findOwned。 | 没有已批准 AI purpose permit、源撤销代际／删除订阅。当前 create 的“目标不存在”检查并不证明永久不复用 ID。 |
| 既有 History | owner 的日期／时区读取、每页 20 条和既有索引。 | [H6](../decisions/2026-10-07-li-next-read-option-a.md) 不授予模型读取权；其右端开区间、ID 降序和分页不能直接当 AI 的闭区间／稳定 tie 合同。 |
| 现有内部 AI | `ConversationSources.capture/current/watch` 是同步 synthetic 能力；`captureContext` 复制投影、按时间降序／ID 升序取五条。 | 不是分布式 Auth／真实数据库协议；capture 接收“已经用途授权”的记录，本身不批准它们。 |
| 通用 Firestore gateway | 各 producer repository 独立 `runTransaction`；文档映射只给数据／ID。 | 顺序调用多个 repository 不构成共同快照；现 gateway 没有固定 readTime 或保留 updateTime 的合同。 |

本地核对基线为 `398f81c901fc64f230442dc1405d0ba6b75763b7`。具体源码：

- `backend/src/shared/ports/identity-verifier.ts`；`backend/src/shared/infrastructure/firebase/firebase-identity-verifier.ts`、`firestore-records.ts`、`firestore-gateway.ts`。
- `backend/src/account/ports/account-preferences-repository.ts`、`infrastructure/firestore-account-preferences-repository.ts`；[Profile/Settings approval](../decisions/2026-10-05-li-profile-settings-approval.md) 与其固定 preview。
- `backend/src/personas/application/persona-model.ts`、`ports/persona-repository.ts`、`infrastructure/firestore-persona-repository.ts`。
- `backend/src/check-ins/ports/check-in-repository.ts`、`ports/check-in-history-firestore-gateway.ts`、`infrastructure/firestore-check-in-repository.ts`、`infrastructure/firebase-admin-check-in-history-gateway.ts`、`domain/note.ts`。
- `backend/src/ai-conversation/ports/conversation-lifecycle.ts`、`application/capture-context.ts`。

## 推荐 F03-A：固定开始时刻的复合只读快照

**候选选择：** 保留当前独立 producer 的领域所有权；增加只供 AI Application 消费的复合读取 Port，由受控 Firebase adapter 在同一 Firestore database、同一固定 `readTime` 的 read-only transaction 内解析 Account、Settings、Persona 及 Check-in。不把各自 HTTP／History 接口串成“快照”，不在事务回调中调用 fake Qwen、写 Conversation、占第二个请求槽或发布响应。

接受及预算顺序：

1. 使用现有可信 Auth 验证取得 UID，完成 N01 既定输入／操作身份检查；在 acceptance 前，经当前权威 verifier 最小读取 binding／owner、completed Account 与本次 `checkin_conversation` 的 consent／purpose，确认当前具备权限，此阶段不取 Note／Persona 内容。未获许可、读取失败或无法验证均不接受 use case；capacity admission 拒绝也不接受、不占 per-user slot。此处仅复用现有可信验证入口并要求交接已确认的用途判定，不把“已有 Account verifier”说成“已有 AI permit”。
2. 在同一无 `await` 的 Backend acceptance 步骤中，取得原 monotonic `acceptedAt`、唯一 UTC `asOf`，建立 request terminal／abort 控制并按原规则占用 per-user／capacity 状态。`asOf` 同时是数据快照 `readTime` 与七天窗口终点；不从手机输入、查询完成时刻或重试事务取得。
3. 完整 start view 的全部数据只从此固定 readTime 读取，不拼入 acceptance 前最小权限查询的字段。请求的排队顺序仍按原 acceptance 顺序，不能因快照完成顺序改变。接受后的物理读取消耗从原 `acceptedAt` 开始的 60 秒，已排队请求的 `queueEnd=min(acceptedAt+5s, deadline)` 继续计时；没有额外“context 5 秒”，更不能读完后重启 queue budget。快照必须完整、合法且通过当前权限检查，才可构造／提交模型输入。acceptance 前的权限查询不是 start snapshot；这里冻结的是 acceptance 时的开始视图，不是在排队之后读取当时的 latest 数据。
4. 固定 readTime 的事务再次读取／验证 binding、Account、consent／purpose，复核 acceptance 时权限；未获许可时不继续读取 Note／Persona 内容。随后在相同 transaction/readTime 内读取 Persona 集合和 AI Note 查询。无合法 Active 返回 default；缺失本应存在的实体、结构损坏或依赖故障不能当 default／empty。
5. 完整结果复制为不可变 request-only projection；只把白名单内容交给模型。异步结果若在 terminal／abort 后到达，丢弃、释放引用，不构造模型输入、不写入、不交付。固定快照失败只返回既有稳定失败类别，不自动选择新的 asOf、不切换到 latest、不自动重新调用模型。
6. start snapshot 不代替 current authorization。acceptance 前最小权限检查与实际 acceptance 之间、固定快照与后续效果之间的权限变化 race 均须由 F01／F03 共同边界闭合；不能把一次先读许可当成此后仍有效的授权，或凭后查补救而放宽“验证当前权限后才接受”。模型前、F01 实际持久化边界和 F02 guarded sink 接受边界都必须检查当前 Auth／owner／purpose、Conversation 有效性、原 used Persona 是否仍存在、所有 used Check-in 当前有效性。普通 read 也使用当前 owner／purpose／source 权限，不要求旧生成请求仍 active。

官方 SDK 提供 `runTransaction(..., {readOnly:true, readTime})` 的固定快照选项；read-only transaction 不采用 read-write 的自动事务重试。这仅说明候选技术能力，不是本项目已验证结果。[Node Firestore 官方参考](https://docs.cloud.google.com/nodejs/docs/reference/firestore/latest/firestore/firestore)、[TransactionOptions 官方参考](https://docs.cloud.google.com/firestore/docs/reference/rest/v1/TransactionOptions)。本仓库锁定 `firebase-admin 14.3.0`／`@google-cloud/firestore 8.7.1`，不得为此自行升级。

**必要真实适配证据：** 用锁定 8.7.1 的实际类型／行为以及本次指定 Emulator 证明固定 readTime 的 document＋query 一致性、边界 timestamp 精度和超时／取消后的结果丢弃。`asOf` 超前于数据库可接受时刻、时钟不可信、快照过旧／不可用或 SDK／Emulator 不支持时 fail closed；不得退化为 latest 或悄悄推迟 acceptance。若该固定时刻方案无法满足既定开始语义，只停受影响的 F03 适配，向 LI 提交精确解释／替代，不能用一般“读事务一致”冒充开始时刻一致。

## F03 AI 内部 Port 输入／输出候选

以下是职责与值语义，不是新增公开 wire DTO 或已批准 Firestore schema。owner、UID、源 ID、revision、clock、token、路径及 stamp 都是 Backend-only；不得从 Flutter／prompt 提供。类型名可在获批实现时适配现有 Result／budget，不能借此改变 N01 六接口。

```ts
type Purpose = 'checkin_conversation';
type AuthorityFailure =
  | { kind: 'denied' }                  // 已确定不具备本用途权限
  | { kind: 'unavailable' }             // 无法读取、无法验证、结构不合法
  | { kind: 'terminated' };             // 当前原请求已取消／超时／失效

interface AcceptedReadContext {        // 全部 request-only
  principal: VerifiedPrincipal;        // 已由可信 Auth 得到，不是客户端 owner
  originalRequest: RequestIdentity;
  purpose: Purpose;
  acceptedAt: MonotonicInstant;
  deadline: MonotonicInstant;
  asOf: TrustedUtcInstant;
  abort: AbortSignal;
}

interface AiSourceReadPort {
  captureStart(context: AcceptedReadContext): Promise<
    | AuthorityFailure
    | { kind: 'captured'; snapshot: StartAuthorityView }
  >;
  revalidateCurrent(input: {
    principal: VerifiedPrincipal;
    purpose: Purpose;
    dependency: RequestDependencies;
    deadline: MonotonicInstant;
    abort: AbortSignal;
  }): Promise<AuthorityFailure | { kind: 'valid'; current: CurrentAuthorityEvidence }>;
}

interface StartAuthorityView {         // 请求内持有；不整体写入 Conversation
  asOf: TrustedUtcInstant;
  owner: BackendAccountRef;
  permit: {
    purpose: Purpose;
    state: 'authorized';
    purposeRevocationGeneration: NonNegativeInteger; // 新候选，现不存在
  };
  observedSettingsRevision: ExistingSettingsRevision;
  persona:
    | { kind: 'default' }
    | { kind: 'active'; usedRef: BackendPersonaRef;
        projection: PersonaPresentationV1 };
  checkIns: ReadonlyArray<{
    source: { sourceType: 'check_in'; sourceId: OpaqueSourceId };
    observedVersion: RequestOnlySourceVersion;
    projection: { occurredAt: UtcInstant; noteText: string };
  }>;                                  // 0..5，已授权／过滤／排序
}
```

`RequestDependencies` 从 captured 结果生成，只含检查所需 owner／purpose generation、原 used Persona 身份、used source IDs 和请求内版本；不含模型提示或正文。`CurrentAuthorityEvidence` 只是一次可审查的权威读取结果，不是可长期缓存的授权 token、写入 lease 或 commit 证明。F01 必须将相应读条件与真实效果边界闭合；“await revalidate→await write”本身仍不合格。

普通 operation/messages read 与离线清理复用同一 producer 的 current authority/source 判定器，但输入自己的当前 verified principal／owner 与持久最小 provenance，不接收或要求已经 terminal 的 `originalRequest`。清理不持久化整份 `StartAuthorityView`。原生成请求的当前 Auth 检查由请求控制层持有的原 token-instance／session 证据执行；此 Port 中的 UID／owner 只是可信身份映射，不能单凭 UID 证明 token 未撤销。新的普通 read 则验证其自身当前 token，不要求旧 token 仍有效。

## F03 LI／DU 可选定的精确交接行

| 行 | 本包推荐候选及输入／输出保证 | 尚需提供／选择的精确内容 |
| --- | --- | --- |
| P-LI-1 identity／owner | 使用可信 verified UID→现有 binding→completed Account；返回 owner ref、authorized／denied／unavailable。非法 binding／Account 是 unavailable，不伪造已完成账户。Auth revoked／disabled／expired 沿现有 Auth 分类。 | LI 确认本次 synthetic completed Account 的绑定源、完成判定及原 session 当前验证入口；不新增客户端 owner 字段或新 accountStatus 字段。 |
| P-LI-2 purpose | **新用途映射候选：** completed owner 的当前 `optionalProcessingConsent=accepted` 允许 `checkin_conversation` 消费其 owner-owned Note；rejected 拒绝整项用途。此许可独立于 public／private／friends-only visibility；不读取他人的 Note。该映射覆盖本次获准的七天 owner Note，不推导其创建时曾同意，不授予其他 AI purpose。 | LI 明确选择此当前用途许可语义，并确认既有 consent 文案／范围足以承载；若不选，F03 source read 保持关闭。现有 Settings approved 字段或 History 可读事实不能自行替代此决定。 |
| P-LI-3 撤回可证明性 | 推荐增加 owner 用途 `purposeRevocationGeneration`。只有本用途许可的持久 authorized→denied 转换原子递增；本包 P-LI-2 映射即 consent accepted→rejected。重授不归零，accepted→accepted、仅改 visibility 不递增。单个 Auth token 失效或依赖读取失败不伪装成这类持久撤权。capture 与 current 检查比对，能发现 accepted→rejected→accepted 的 ABA。 | LI 确认字段所在实体／初始化、所有写入路径的原子更新和不可倒退／复用。精确路径／完整字段库存进入 N02；本稿不预批准。旧数据缺该字段不静默补 0；first isolated fixture 可在获批 schema 下明确初始化 0，普通／demo migration 不在本包。 |
| P-ZHOU-1 Persona | 在同一 readTime 读取 owner 集合和 Active；使用现有 stateRevision/item revision 验证结构一致。模型只接收 schemaVersion／tone／responseLength／formatStyle；无 Active 合法 default。 | 复用既有批准枚举／mapping。后续 current 检查是原 used Persona 未被永久删除，不比较“仍 Active／revision 未变”。不为 AI 新增 Persona 持久字段；原 snapshot 请求结束即释放。 |
| P-DU-1 Note mapping | `note→noteText` 原样复制已验证 Note；`createdAt→occurredAt`，是 Backend 赋值且已存入记录的语义时间，不声称是 Firestore 实际 commit timestamp。投影只含这两字段。 | DU 确认不可变 Note／时间、合法为空集合、UTC 精度／时区语义及 legacy 不合法记录处置；原 1–500 grapheme 校验不重新裁剪。不得因 note/time 损坏而假装该源不存在。 |
| P-DU-2 source validity | 最小主案：owner-owned immutable Note；没有本包新增的逐条 AI permission toggle／saved edit。current 以 owner／存在性和 request-only version 验证；删后来源永久失效。 | DU／LI 明确确认 source ID 永不复用、硬删后不恢复相同身份，并给出创建／删除／维护入口如何保证的实现约束。当前“document 不存在即可 create”不是足够证据。若实际已获准源操作含撤权再恢复／ID 复用，须提交专门 delta；不预装每条 invalidationGeneration、墓碑表或事件日志。 |
| P-DU-3 query | 固定 readTime，按 owner 及 `[asOf−7×24h, asOf]` 查询；过滤无权／已删／future／窗口外记录后，`occurredAt DESC, opaque ID ASC`，取最多五条。空结果为 captured＋空列表。 | DU 给出此 owner/date/query/tie 的可执行 query 与索引候选，JIN 审查、LI 选择；现有 History 索引与 page20 不是授权。不得先取五条原始记录再过滤而遗漏较旧合法记录。 |
| P-LI/DU-4 current／invalidations | 同一 current authority 判定器服务在途／普通 read／清理；producer 通知只加速失效，不能代替必要的 current read 或离线补偿。Auth 当前撤销另外检查，不用历史 readTime 将其“冻结为有效”。 | 明确撤同意、删除、解绑或依赖不可验证如何使 consumer 在途 terminal；核实所有效果边界接入 F01，历史读立即 fail closed，完整发现／清除则接来源清理候选。通知丢失／重连不是有效性证明。 |

如 query 需要分页才能得到五条合格项，所有页复用同一 readTime，继续至得到五条或确认候选集合耗尽。任一页失败／超出原预算则失败，不把尚未扫描完当合法 empty，也不静默削减条数来规避 token ceiling。本包不新增长期持久 AI 读取游标或 History day/page DTO。

`observedVersion` 推荐使用 adapter 取得的数据库 document updateTime（请求内技术证据），不声称它是已批准 producer revision，不进入模型／Flutter／日志／历史。不可变 Note 的意外版本／内容变化返回 unavailable 或失效，不能自动换入新的 Note。若已批准生产者允许纯非内容字段变动，DU 需明确该变化不影响有效性的判定，不让无关 visibility 变更产生新的 AI 内容权限。

### F03 的精确路径／query／index 候选

LI 的现有 `saveSettings` 更新 `accounts/{accountId}`，不是 Settings 子文档。本包推荐仅在这个原权威实体增 `purposeRevocationGeneration`，固定只服务 `checkin_conversation`。fresh synthetic fixture 明确初始化 0；接受→拒绝与原 consent/settingsRevision 同一事务递增，重新接受不归零，安全整数耗尽则 fail closed，不 wrap。Profile 和所有其他会重写 Account 的入口必须保留这个字段；缺失／倒退不可默认合法。生产者当前代际随其权威实体的既有用途存续，不另保留已删 source、旧 consent、代际事件或 Account 删除记录。LI 必须选择其用途及参与写入路径；ZHOU 不在本文代写 Account 功能。

| AI 专用查询选择 | 精确候选与前提 |
| --- | --- |
| 固定开始视图 Note query | 在固定 `readTime=asOf` 的同一只读事务中，`check_ins.where(ownerAccountId == trustedAccountId).where(createdAt >= lower).where(createdAt <= asOf).orderBy(createdAt,DESC).orderBy(__name__,ASC)`；lower 为同一 asOf 减7×24h。以 request-only `(createdAt, documentId)` 作 startAfter，候选每页25；逐页完成必要合法性／授权过滤再取五条，达到五条或确认耗尽停止。它不是普通 History API。 |
| producer 时间格式 | 当前源码把 `createdAt` 保存为 UTC string；本候选要求 DU 确认可供 query 的全部适用记录为固定规范 UTC ISO 毫秒形式，并让 asOf 的表示与 readTime 指同一瞬间。不能把 string 字段换 Timestamp query、用 locale 字符串或把不规范 legacy 值当作无记录。若生产者不能保证按时间的查询完整性，只暂停该 query 并提交精确修订／修复范围，不静默迁移数据或扩大窗口。 |
| AI Note index | 新增候选 collection-scope composite：`check_ins(ownerAccountId ASC, createdAt DESC, __name__ ASC)`。保留既有 History 的 `__name__ DESC` 索引，两者服务不同已选顺序。不为 note/visibility/generation 建 AI 查询索引。 |
| Account purpose 字段 | 新 `accounts.purposeRevocationGeneration` 只做精确 doc get，候选单字段索引排除；不改变 Account 其他字段的既有索引或 producer 查询。 |
| 身份和 Persona | Auth binding、completed Account、Persona 当前集合/Active 使用现有路径/允许枚举及同一 readTime；不增新的 accountStatus、Persona revision 存储或跨owner query。原 token 当前撤销另外验证，不以数据库快照冻结外部Auth。 |

源码依据：[preferences repository](../../backend/src/account/infrastructure/firestore-account-preferences-repository.ts)、[Check-in repository](../../backend/src/check-ins/infrastructure/firestore-check-in-repository.ts)、[History gateway](../../backend/src/check-ins/infrastructure/firebase-admin-check-in-history-gateway.ts)、[现有索引](../../firestore.indexes.json)。这些只是字段/实现证据；以上时间保证、AIquery/index和新增代际仍须 LI／DU 交接并由 LI 选定。本轮不修改 index 配置或 producer。

### 普通 owner 读、AI 用途与 Backend 清理分开

以下是 F03 的精确用途／历史解释候选，须 LI 选择；不让已撤回的 AI 许可成为阻止本人删除或 Backend 清除失效内容的理由。`captureStart/revalidateCurrent` 用于在途生成；另一个复用 producer 判定逻辑的 retained-source validator 输入受控 Backend 执行身份及 canonical owner/provenance，不要求原请求 active、不拿 owner ID 伪装成用户 token。

| 当前情况 | 普通当前 owner GET／whole DELETE | AI 新请求／在途请求 | Backend 来源清理 |
| --- | --- | --- | --- |
| owner 身份有效，consent rejected | user 消息、无 required source 的 saved assistant、无内容 tombstone 可沿 N01 普通 owner 生命周期读；不把 owner 历史访问权授给模型。sourced assistant 依照当前source权威不可读正文，已确认失效返回无内容tombstone；临时未知只 fail closed。whole DELETE仍可执行，204仍须完整封锁/删除。 | 不prepare/accept/dispatch本用途；已开始请求终态，重授不能恢复旧generation。`user_saved`是已保存事实，不能绕过当前purpose获得Retry资格。 | 受控服务身份可读最小authority/source并清理；在完整合法权威下purpose denied或current generation大于stored stamp才是确认失效，不是阻止清理的权限错误。代际回退／缺失／损坏仅unavailable，不永久擦除。 |
| 用户 token过期／revoked／disabled，或当前 owner绑定无效 | 当前用户读／删按既有Auth/owner错误拒绝；新合法token重新普通授权，不能控制原operation。 | 原session/attempt失效，停止新效果；外部Auth与DB共同边界依F01精确待决条款。 | 清理不依赖用户在线／原token有效。无法确定canonical owner/source结构是unavailable，不把Account缺失随意解释为本包批准Account删除。 |
| 所需source权威读取失败／数据损坏 | required sourced reply无正文；不能用一次故障造永久tombstone或清空sources。其他消息只在其独立检查通过时可读，接口原有整页失败分类保持。 | unavailable，不以empty/default继续。 | 未完成，重验并保留canonical证据；不以当前读失败证明永久删除。 |

已确认source删除／withdrawal generation失效时，普通读可构造无内容tombstone投影先封住正文，物理事务随后完成；这个投影不清canonical accepted pointer、不允许Retry、不假称物理清理已完成。无sources的历史不因新的最小stamp额外永久擦除。F03前文泛称“current purpose检查”的普通读／清理，均以上述职责和结果为准。

## F03 撤回／删除／失败的确定行为

| 场景 | 当前请求与模型 | 已存 assistant／后续读 |
| --- | --- | --- |
| 起始 consent rejected／用途明确不允许 | denied；不读取 Note／Persona、不调用模型；无 current-input-only fallback。 | 普通 read 按选定 N01/N04 当前权限；不拿旧生成 active 状态代替 current 权限。 |
| 起始合法已授权但零条 Note | 合法空数组；可按当前输入＋合法 Persona/default 继续，不把空数据当权限拒绝。 | 不凭空产生 source provenance。 |
| producer 超时、坏数据、无法验证 | unavailable；整次失败，不返回半份 snapshot／default／空数组。 | 暂时 fail closed；未知不等于已证明删除，不以一次读失败永久删历史。 |
| 起始后撤同意，随后又重新同意 | 合法current generation大于captured值证明撤权，旧request失效且永不恢复；current更小／缺失／损坏为unavailable，同样停止当前请求但不证明历史应永久擦除。重新操作捕获新asOf／generation。 | 含Check-in provenance的旧assistant仅在合法current generation大于stored stamp或必要source确定失效时永久tombstone；更小为回退/权威异常，仅fail closed、清理未完成。不能仅靠“当前又accepted”恢复撤权内容。 |
| 原 used Persona edit／Active switch | 继续原请求开始时四字段快照；不取消，不重新捕获。 | 既有历史 presentation metadata 不改写。 |
| 原 used Persona 永久删除 | terminal，取消尽力，禁止之后保存／交付；不换成 default。 | Q19 原历史规则不因 Persona 删除自动重写；不持久 used Persona ID 来辅助清理。 |
| used Check-in 删除／被确认失效 | terminal，任何一个 used source 失效都不能部分继续。未使用源删除不影响此请求。 | 依赖该 source 的整条 assistant unavailable；立即读保护与后续物理清除分别记录。 |
| watch 丢失／服务离线期间撤回再恢复 | watch 不是唯一正确性路径；current generation 能发现用途 ABA。 | offline sweep 对比持久最小 stamp；source 缺失＋不可复用身份处理硬删。完整扫描／续扫／清空以配套 N02 清理行闭合。 |

**需要明确批准的 Q19 最小 provenance 补充：** 当前 Q19 只批准 source type＋opaque ID；它没有批准用途代际。因此建议仅对依赖 Check-in 的 available assistant 增加一个 Backend-only `purposeRevocationGeneration`，用于当前读／离线补扫识别中途撤权，不存 consent 历史、整份版本向量、全文快照、Persona 身份／revision 或 projection。tombstone 化时同时删除 source refs 和该 stamp；整段删除／保留到期按 Q14／N02 一并清除。其精确存放、初始化和清理完成后的残留由同包 N02 清理库存列明，待 LI 选择后才可实施。无 Check-in 来源的 assistant 不因这条 provenance 补充新增 source 字段或新的永久删除规则。

与本文清理主案对齐的具体候选：每个 available assistant 都原子建立 canonical `message_sources` 文档；合法空来源写 `{sources:[]}` 且不含代际，非空写 `{sources:[{sourceType,sourceId}, ...], purposeRevocationGeneration}`。缺少文档不能当合法空；tombstone 原子删除整个 sources 文档，不另建 `hasSources` marker。这里明确空与缺失的可验证差别，不改变 Q17 模型投影；实际路径、字段库存和事务仍须随 N02 一起批准。

若不批准此最小持久证据，又允许服务离线期间撤回后重新授权，则只比较当前 accepted 无法证明历史内容从未依赖已撤权来源；不得把 F03／完整清理标成已解决。可以停该依赖行为等待决定，不能默默扩大保留到所有 context 或增建事件／反向索引系统。


## R-A：无 receipt，接受现有保守限制并提供明确离开出口（推荐）

### 恢复结果与离开意图分开

不新增 endpoint、恢复凭据、长期 registry、文本 hash、response cache、后台通知或 generation resume。使用现有 N01 `Check result`，但不保证所有丢失 ACK 都最终得到确定结果。registry 已销毁、进程已重启且没有足够持久效果证据时，永久无法证明 `no_effect` 是 LI 需要明确接受的功能限制。

不新增服务端“permanently_unknown”断言：一个 404、网络故障、空历史或 `AI_OPERATION_UNAVAILABLE` 均不能单独证明永久性或未保存。页面始终诚实呈现 unknown；允许用户明确停止当前恢复交互并离开。这是结束用户的等待，不是改变原操作的事实、future-write fence、accepted-assistant pointer 或原逻辑输入的 Retry 资格。

### 精确动作候选

| 用户动作/状态 | 允许内容与禁止的解释 |
| --- | --- |
| `Check result` | 每次只发一次当前 owner 的普通 outcome read，沿用 15 秒普通读上限；不自动轮询，不自动 Retry。只能由符合 N01 的 no_effect/user_saved/assistant_saved 证据解除相应限制。 |
| `Leave without retrying`（本次新增候选） | 当未在准备/执行时可选。同步关闭本页面尚未结束的 dispatch/读回写权，清除敏感显示及输入，调用已有 Back callback。若仍有 active attempt，先走已选的 `Stay` / `Request cancel and leave` 确认及原控制身份 Cancel。保留仍适用的 session 内 unresolved guard；不得为进入 idle 而重置它。 |
| Back / Settings | 继续已有 N05/N06 离开保护，Settings 使用 LI 的既有回调。返回同一 session 时 unknown 仍 unknown；不自动再次 Check result 或生成。普通历史读取按既有规则执行。 |
| 普通历史 `Reload messages` / 分页 | 目标已知且当前 owner/live/未过期/来源权限满足时可读。普通 GET 只能显示当前可读合法保存结果，不证明 original no_effect，也不自行释放 Retry。 |
| 本 unknown flow 的 Send/Retry | 在取得 no_effect、user_saved 等适用的当前权威结论之前均不开放；停止 Check result、离开回 Home、清本地状态、新 session 不构成安全重发结论。 |
| 独立新 Send 的既有 Backend 边界 | 保持原 N01 对不同 user-target 的独立 Send 规则，不扩大为全 owner 的永久冻结。本恢复推荐不增加新输入/新会话按钮或入口，不靠“内容不同”或用户重新命名意图证明独立，不把原输入复制、自动填回或换 ticket/conversation 当作恢复。原请求若仍 non-terminal，既有每用户容量仍阻止并发；generation 未确认停止时仍 quarantine。离开按钮不释放这些保护。 |
| 同一原逻辑输入 | unknown 时无 Send/Retry/Force resend/Regenerate 出口；只在当前权威 no_effect 或符合全部 target-wide 条件的 user_saved 后按原合同恢复。保留的 accepted assistant/tombstone 永不重新生成。换页面、换 session、whole Delete 都不是原输入 no_effect 证据。 |
| 整段 Delete | 复用已选 whole Conversation 确认；不以恢复按钮暗示必须删除。点击即隐藏；只有已确认永久清除和相关 future effects 已封住的 204 才成功。未知只可 `Check again` 重发同目标幂等 DELETE；GET 404/空页/登出不能宣称已删除。 |
| 已删/过期 Conversation | 不重建该 target；不以原 reserved ID 生成空 parent。其他独立新输入是否可发仍按现有单独授权、容量及入口组合规则，不由本恢复动作创建新路由或新 Conversation。 |

**独立 Send 的实施边界：** 当前 #88 单 composer 未实现多 attempt 工作台或“新话题”按钮。本推荐只提供停止本地追问与回 Home 的出口，保留本 flow 的 guard；不借清空 `_Memory` 启用 Send，也不增跨 Conversation 搜索/列表/恢复导航。后续若需要独立新输入 UI，须另有具体产品范围决定及 target 隔离证明；本文件不将它列作本推荐的可用动作，不能把 `Leave without retrying` 实现为 `unresolved=false`。

**不隐藏的技术限制：** 没有持久输入身份/receipt/content fingerprint 时，客户端和服务端无法在所有新 session、其他设备和手工重新输入场景中判断相同字串是否是同一次逻辑尝试。不能声称已提供跨设备/重启的全局内容排重。本候选保证已知 operation/user target 的重试与未来效果保护、不提供原输入重发捷径，并明确告知用户不要重试未确认的输入；如果 LI 要求机器强制识别任意重新键入的同一逻辑意图，必须另选新的身份/保留合同，不能伪装成无 receipt 方案已解决。

### 文案候选（英文产品语言；只改此出口相关 copy）

unknown 原有主文案继续 `We couldn’t confirm the result. Check saved messages before trying again.`；新增常驻说明：

> `We may not be able to confirm whether this message was saved. You can leave without retrying it. Leaving does not delete saved messages.`

按钮为 `Check result`、`Leave without retrying`；已有条件性 `Reload messages`、`Delete conversation`、Settings 保留各自含义。无 retry countdown、无“稍后一定完成”、无失败等同未保存。`Leave without retrying` 不以成功 toast 报告“Cancelled”或“Nothing was saved”。返回时若 guard 仍 unresolved，继续同一 unknown 提示；不会要求用户无限检查才能返回 App。

删除 copy 保持原已选文本：`Delete this conversation? All messages will be permanently deleted.`、`Keep` / `Delete`、`Deleting…`、`Deletion has not been confirmed. Check again.`、`Conversation deleted.`。来源不可用只显示 `This reply is no longer available.`，无 source ID、删除原因或重新生成按钮。

辅助技术可达的 status/按钮、放大文字、小屏与 48dp 既有控件边界仍适用；状态变化播报一次，离开后焦点按 host destination 处理。本次仅沿既有可达性合同验证新退出动作，不增自动 Retry／Undo。

### 恢复数据寿命

- 终态时清输入、prompt/projection/raw output、原 token/key；原控制句柄仅为当前必要 best-effort Cancel 使用，不因新增离开按钮续命。
- 现有 session 内无内容 target/operation 引用可沿用其既有恢复用途；session 失效即清除，不新增 disk restoration。页面 dispose 不等同 Backend effects 已结束。
- F01 的未决写入 fence/target guard 由真实写入安全证据解除，不能由 UI 放弃或清理 cursor TTL 解除；其独立异常寿命与故障处置属于 F01/N02 候选。
- 不保存“用户放弃”的永久业务记录；没有此动作的内容日志、source ID 日志或新 audit ledger。恢复交互结束不会推进 `lastPersistedMessageAt`。

## C-A：从 canonical records 完整补扫，避免持久来源反向索引（推荐）

### 最小发现模型

最终 N02 路径沿用固定候选的 `accounts/{accountId}/conversations/{conversationId}/messages/{messageId}` 与 `message_sources/{assistantMessageId}`，以父路径的 Account/conversation/message 关系为可信候选。**不新增 per-source reverse index、deleted-source 事件集合或 source-ID tombstone。**

推荐两个 Backend-only collection-group keyset sweep：

1. `messages` 全范围扫描，按完整 document name 严格排序，以完整 name 作 cursor，固定每页候选 25 个；不只扫 currently logged-in owners、recent 7 days、最新 5 条、当前页面或一个 Conversation。扫描所有 canonical assistant，包含 unavailable，检查配对及 provenance 有无缺失/遗留；用户行不当作清理对象。
2. `message_sources` 全范围同样扫描，发现已经没有 message/Conversation parent 的 orphan provenance、tombstone 下残留以及非 canonical 路径。不能只从仍存在的 Account/Conversation parent 枚举子集合，否则会漏掉 orphan 子文档。

全 name 的严格 cursor 避免不同 owner 具有相同 messageId 时漏扫。每一行从**已验证 canonical 路径**解析 owner；执行固定 purpose 的 producer 当前权威读取，而非信任页面/body owner、provenance 中自报 owner 或历史接口权限。跨 owner 全表扫描只授予既有 Backend 受控清理执行角色；不暴露给 Flutter/模型/普通 Admin。未知路径形状、损坏 schema 不是“无人拥有所以可以删除”；隔离为 failure、禁止内容读出并要求受控修复，不能宣告全清理通过。

此方案主动接受有限首切片的完整扫描成本，避免持久 source-ID 副本。查询/集合组权限/索引能力是新的待批 N02 选择；当前 gateway 没有实现。Firestore 的 collection-group 覆盖同名集合，cursor 使用确定排序；删除父文档不会自动删除子集合，因此两个发现方向及 whole-delete 子文档清单不可省略。[官方 query 文档](https://firebase.google.com/docs/firestore/query-data/queries)、[cursor 文档](https://firebase.google.com/docs/firestore/query-data/query-cursors)、[delete 文档](https://firebase.google.com/docs/firestore/manage-data/delete-data)。

### 离线期间撤权又恢复：不能只检查当前布尔值

永久 source 删除可由当前源缺失发现，但“撤权→重新同意”若全发生在 AI 服务离线期间，仅比较当前 `accepted` 会漏掉历史失效。推荐与 F03 同步的最小新字段 **`purposeRevocationGeneration`**：在 LI 所属当前 purpose authority record 中，只有该 purpose 从允许变为不允许时才单调递增；不是每次 `settingsRevision` 改变都递增，accepted→accepted 或普通 visibility 修改不递增。不存事件内容、被删 source ID 或每次撤回事件副本。

assistant 接受时把对应无内容代际存在自己的 `message_sources/{assistantMessageId}` 文档，用于未来历史再验证；不另复制进 messages/effects/进度。每个 available assistant 都与一份 canonical sources 文档原子创建：合法无来源为 `{sources:[]}` 且**不含**代际；有来源为 `{sources:[{sourceType:"check_in",sourceId}], purposeRevocationGeneration}`。缺少整个 sources 文档是完整性故障，不能默认为合法空集；不再另加 hasSources marker。其 producer 精确路径/初始化/overflow/迁移/撤回与存储线性化合并到 F03/N02 统一候选；**新增持久代际与这份明示空集/非空 provenance 记录超出当前物理库存，代际也超出 Q19 最小 source pair，是明确提交 LI 的数据合同 amendment，不是现有字段或默认授权。** 尚未证明代际的旧记录不能默认填 0 并恢复可读；首 isolated fresh-data 验证不借机迁移真实记录。

- 在producer合同／字段完整合法时，current generation大于stored stamp确认期间撤权，使适用依赖回复永久tombstone；重新同意只允许后续新请求。current小于stored、缺失／损坏是权威异常，只fail closed并将清理记未完成；相等仍须检查当前permit及全部source。仅在真正存在required Check-in context的历史回复上应用该永久失效规则；无required source的历史依本文明确的owner/history选择，不扩大删除范围。
- 第一 Note-only producer 候选限定 owner-owned immutable Note；owner 身份不可被 visibility 设置替代，普通 visibility 改动不当然使 owner-AI source 失效。**source ID 永不复用、无 Restore 是需 DU/LI 明确选择并提供执行点证据的 producer 保证，不能从随机 ID/现有代码自行推断已批准。** 无此保证，不宣称“hard delete→同 ID 重建”的 offline 场景已闭合。当前主案不预装 per-source invalidationGeneration；若 DU 表明现有适用行为允许逐源撤权后恢复、转移 owner、恢复已删 source 或 ID 重用，则只针对该行为补交 source incarnation/失效代际及其存放/删除合同，未解决前该行为仍阻塞。
- 每条 retained assistant 仍遍历其**所有**实际 required source pairs，而不是只检查触发事件的一条、当前最新五条或仍在七日窗口内的源。七日/五条是生成选择界限，不是历史 provenance 失效或保留界限。

### 单 assistant 原子清理及竞争

每个 assistant 在有界事务内重新读取 canonical parent、assistant、所需的 user accepted-assistant pointer、全部 canonical source pairs、当前 producer authority/代际以及当前源存在/owner/许可。所有数据读在写前；先读再 await 一个外部无法参与共同冲突边界的权限服务，不冒充同一原子权威。F03/F01 必须先证明共同边界。

| 事务观察 | 候选处理 |
| --- | --- |
| parent live、所有 required sources 合法、代际匹配 | 保持消息；不改 text、timestamp、anchor、usage metadata。依赖故障不能当合法空集。 |
| 某必要来源已确认删除/不再合法，或完整合法权威的current撤回代际大于stored stamp | 同一事务把**整条** assistant 变 unavailable、删除 text，并删除它的整个 message_sources 文档及 source-context 代际 stamp。不是仅移除一条 source pair 后继续展示其余生成内容。代际回退不是这类确认失效。 |
| assistant 已是 tombstone | 幂等剥除任何非法 text/provenance/stamp；保留顺序及 accepted pair。旧 available 回应/普通分页不能恢复它。 |
| message 已永久不存在，或已确认的 whole-deleted/expired parent 对应残留 | 在 N02 既定效果封锁完成后删除 orphan sources/适用残留；不创建 tombstone parent，不生成内容；整段删除/到期责任仍包含全部相关 children/control。 |
| source 权威读取超时、数据库故障、无法判断删除与缺权、available assistant 缺 canonical sources 文档、非空 sources 缺代际、代际损坏或current小于stored的回退 | 普通读取 fail closed；该项清理记未完成，不把暂时失败/权威异常当永久删除，也不造空集。下一轮重验；不对本条发成功清理结论。 |

保留messageId、sequence、role、availability、唯一配对所需non-content指针，以及不可变metadata.createTime派生的语义persistedAt；**保留N02的appendBefore到期guard**，不另造物理persistedAt字段。Q19 presentationMode/presentationProjectionVersion按其既定历史元数据寿命保留，不以fake曾清除为由擅改；其中无Persona身份/style/content。清理不改original U文本/time、不清acceptedAssistantMessageId、不允许第二assistant、不更新90d anchor。

全局 source/consent 删除与 assistant 新提交须读同一失效权威参与冲突：先失效则新提交被挡住；先合法接受则读立即受当前权限封锁，cleanup 后转 tombstone。一个全表 sweep 不是永久快照；读过某行后再失效，由下一轮发现。旧 cursor 前新插入记录同样由下一轮从头发现；不以一轮结束证明未来不会再有变化。

### 服务 offline、中断与最小进度

推荐受控既有 Backend 内单清理执行入口，无 Cloud Functions/新队列/新常驻服务。候选：启动后立即补扫；健康运行时每小时发起完整 sweep；每页 25 行，逐条有界事务，完成一页后才推进 checkpoint。没有在本机启动执行入口或部署任何索引。

为崩溃续扫，N02 可选一个 active checkpoint，路径候选 `ai_cleanup_progress/source_sweep`。这是受限内部操作进度，不是 public receipt，不是 request registry，不参与生成/Retry 判定。

| 候选字段 | 精确目的及边界 |
| --- | --- |
| `schemaVersion`、`revision` | 解析/并发 CAS；版本不含任何 source 信息。 |
| `phase: messages / message_sources` | 仅表示正在执行哪一 canonical sweep。 |
| `lastDocumentName?` | 当前 phase 最近已处理页的 full document name；仅 Account/Conversation/message 路径，无 source record ID。仅 Backend cleanup 可读，不进入日志。 |
| `startedAt`、`resumeUntil` | Backend 时间；本候选 `resumeUntil = startedAt + 24h` 是**新增 checkpoint 最大寿命**，不是 source cleanup SLA、Conversation 宽限或 request deadline。 |
| `hadFailure` | 本轮是否至少一项未成功核验/清理，防止将“扫描经过”误报“全部清理完成”；无逐项私有失败清单。 |

处理失败的行不删除其 canonical evidence；页可以前进且 `hadFailure=true`，使后面 owners 不被一条 poison row 阻塞；本轮结束立即删除 cursor 并从头发起下一轮，不把失败行跳过后记成功。因同一持久故障不能有进展时停止紧循环，以受控入口下一次重试并报稳定 dependency failure；不增加源 ID dead-letter 队列。每次启动继续有效 checkpoint；损坏/超期 checkpoint 安全删除并从头补扫，不推断旧页已完成。过期删除进度是安全的，因为它不封锁写入且所有源事实仍在 canonical 数据中，代价是重复扫描。

`resumeUntil` 到点立即禁止用它跳过前面记录，并执行进度删除；不存在“TTL 一到就已物理删除”的假设。若 Backend/数据库离线使物理清除超过所选进度上限，记录这项运行失败并在恢复入口先清超期进度，不能把停机时间排除后仍宣称保留上限已满足。LI 须连同运行责任选择这个上限；本文未启用额外云服务去补足该保证。

如果 crash 发生在消息事务后、checkpoint 前，重放幂等；checkpoint 不得在消息事务前前进。若多个进程可能执行清理，必须在 N02 明确单 leader/事务 CAS 的并发选择；当前推荐单入口，不能靠同一个 cursor 默认保证多 worker 安全。新用途/schema/运行责任被 LI 明确选择前不创建此记录。

一轮 messages+message_sources 正常结束后，删除 active progress，包括全部路径 cursor；只在现有允许的运行证据中记录非内容状态/稳定错误类别。没有永久“扫描历史”集合。whole Conversation 删除在返回204前，按N02共同singleton屏障推进cleanupGeneration并删除任意active checkpoint，覆盖仍在处理但尚未写回进度的旧页。每页捕获processEpoch＋cleanupGeneration；所有checkpoint创建/更新在事务中匹配它们，旧页不得因progress缺失而重新创建路径，新轮从头补扫。这个generation仅影响清理进度，不解除或增加其他user-target的写入/模型保护。Account 删除不属于本次，不能藉此新造 Q27 行为。

### text / provenance / 索引残留检查

1. 在 source-invalidated assistant 的原子转化中删 **全部** source pairs（包括仍有效的另一 source）及代际 stamp；tombstone 无进一步 provenance 目的。不得只清刚删的 source ID，把其他引用留成无目的历史。
2. 不建 text/sourceId/purpose-generation 内容索引或 source→message reverse collection。拟对 message text、provenance 数组及其 sourceId、历史授权 stamp、checkpoint 的 path payload 配置不参与查询的单字段索引排除；只选择本文列出的 name/sequence 查询及必要 guard/AI Note composite；expiry 从权威 metadata 派生，不建 expiresAt 业务字段索引。精确 fieldOverrides 与 collection-group capability 由统一 N02 inventory 列明，不能凭“默认索引”忽略 source ID 的索引副本。[官方索引说明](https://firebase.google.com/docs/firestore/query-data/index-overview)。
3. 清理后的 canonical read 必须证实 text/provenance/stamp 不存在，两个 sweep 都能覆盖 orphan。索引规则检查需证实禁止字段没有应用自建查询/索引；Firebase 管理索引的事务维护由实际受控验证支持，不声称能观察底层磁盘擦除。没有自建 backup/export/search cache；若实际环境存在额外副本，须先补入 N02 inventory 和独立授权，不能靠本表宣告已清理。
4. 已确认 writer/fence 不再能重建内容之后，才将一次源失效处理称为清理完成。读不可见、触发一次 watch、处理第一条依赖、分页 cursor 到尾分别都不足以单独证明完整清理。

## 寿命与完成标准分表（不可互相借用）

| 对象 | 来源/候选寿命 | 删除或完成条件 |
| --- | --- | --- |
| Conversation 与消息 | **已批准 Q14**：合法 `lastPersistedMessageAt + 90d`，owner 删除可更早 | 到期立即不可读；到期后 24h 内物理清理。owner Delete 只有完成清除与封锁才 204，无 24h 可读宽限。 |
| 未清理 source provenance | **已批准 Q19/Q14**：仅为仍 retained assistant 的必要 revalidation | source 清理时与内容一起删除；不得等待 Conversation 90d 作为拖延理由；无已批准统一“source 删除 + 24h”SLA。 |
| 无内容 tombstone/accepted pair | **已批准**：随所属 Conversation 生命周期 | 无 text/source ID，不再生成；到期/整段删除一并清除。 |
| `purposeRevocationGeneration` 历史 stamp | **新增候选 purpose**：仅用于 retained sourced assistant 离线撤回判定 | tombstone 时删除；最晚随 message/Conversation；不是永久 consent 审计。producer 当前代际的用途/lifecycle 由 LI 生产者合同单独确认，不能由本表批准 Account 删除。 |
| active cleanup checkpoint | **新增候选**：一轮未完成 sweep，最长 `startedAt + 24h` | 轮次完成立即删除；超期/损坏安全重扫；不得含 source ID；不是原操作 fence。 |
| request registry /模型处理副本 | **既有 request-only**；content-free 控制仅必要封锁/清理期间 | 原终态销毁内容，清理结束销毁控制；不延长成恢复窗口，不恢复生成。 |
| F01 fence/effects | **统一 F01/N02 另审**，不能从 Q14 推导新记录可保留90d | 清除前须有 actual pending effects 结束/封锁的证据；本文24h cursor不影响它。 |
| operational log | **已批准 Q14**：30d，过期立即不可读，24h物理清理 | 只原白名单；不记录 UID、业务ID、source ID、paths、prompt、text、token 或 raw error。 |

来源失效的建议运行目标是**在线每小时主动完整检查、恢复服务后立即继续/补扫并尽快完成**。这是调度候选，不是一个在任意负载、故障或 offline 长度下保证的物理删除时限；没有据此声称 source deletion 已有24h SLA。若 LI 要求具体 source cleanup 最大延迟，应明确从何种 producer authoritative event 起算、离线如何满足、容量上界及运行责任，再与基础设施选择一同批准。Q14 已批准的 Conversation 到期24h义务仍完整存在，不能因本文 source 周期较弱而降级。


## 实施切片、交付物和停止条件

下面只是本包的有界实施顺序建议，不是新 Issue、新产品映射或本轮开工批准。可独立的工作并行；每一行须有 LI 持久化的精确选择与任务范围，不能把某行通过当作后面所有行自动批准。

| 切片 | 开始前必须确定 | ZHOU 的限定交付 | 证据／审查入口 |
| --- | --- | --- | --- |
| A：锁定栈的能力验证 | LI 释放 synthetic Emulator 验证，选择本包实际验证项；不用真实账号或 live 模型 | 固定 readTime 的跨 document/query 探针、metadata 时间精度、真实提交／取消及事务重试 barrier 探针；复用锁定依赖，不升级 SDK、不部署 index | 明确哪些能力已证实、哪些不支持、哪些无法证明。独立实验只能证实实验结果，不能改原条款或声称 F01 已完成。JIN 审查精确源码和原始命令结果。 |
| B：生产者 AI reader | F03-A 与 LI／DU 逐行交接、purpose 映射／代际和最小 Q19 amendment；固定开始视图能力通过 | AI 内层 Port＋Firebase adapter＋synthetic fixture，Note-only/default/Persona、当前权限重验；对旧 producer 的变更仅由其 owner 获批交接执行 | NC07、NC08 的读取／权限部分与 NC10 投影；合法 empty／denied／unavailable 不混淆。reader 不依赖尚未批准的写入语义而可独立验证。 |
| C：真实 Conversation store／终态 | F01 的精确旧／新条款、到期边界、完整 N02 inventory、epoch／fence 异常寿命及操作责任；所有真实效果条件可验证 | 实际 user／assistant 原子事务、target-wide Retry reservation、operation outcome 普通权威读、重启封锁；保持 N01 六操作及 F02 完整响应 sink；不在 callback 中生成／发送 | NC01–06 相应真实适配＋NC10；ACK 丢失、A→B→C、已有 assistant/tombstone、错 user ID、取消与 deadline 两侧。若严格语义不可证明且没有获批修订，只交 Blocked 证据，不发布“可用 adapter”。 |
| D：删除／到期／来源清理 | C 的有效 writer fence；canonical sources、扫表／index／checkpoint／运行责任全部选定；producer 失效保证确定 | whole-delete、Q14 到期立即读封锁与24h清理、来源全量发现／续扫／原子 tombstone、orphan 清理，删除全部适用内容和引用 | NC08–09；offline 撤权→重授、多个 owner／多页／同名 ID、多 required sources、事务后 checkpoint 前 crash。source 运行周期不能冒充24h Conversation SLA。 |
| E：实际网络与手机恢复 | C／D 依赖项可用；R-A 文案／停止交互被明确选择；LI 给出本次 shared-entry 精确源 | 在获批 isolated 构建接真实 HTTP／Emulator／fake Qwen，补最小恢复 delta；沿用已接受取消、attempt identity、按 messageId 合并／sequence 排序及 R1/R2 保护 | NC11–12＋实际 Android 保存回读／取消／整段删除／unknown 离开；Backend 门槛、相关 Emulator／Flutter 回归和 JIN／LI 限定验收。同一组件通过不等于 shared combination 已验收。 |

本次若改变 LI 的 Home/router/shared composition，沿 LI→DU 独立审查；JIN changed-tree combined gate 与 LI 限定验收分别保留。复用未变的已验收 shared source 不重新审查。

首个可运行包可以是已释放的 A／B 的限定包，必须写清未支持的效果；不得用 synthetic transport 假扮实际存储。20:30／22:00／23:59 SGT 是原交付要求，已经经过的时点如实报实际交付与原因，不补写早于真实发生时间的完成记录，也不承诺尚未获批切片在截止前必然完成。本方案准备与既有共享组合工作并行。

## 必要证据清单与当前结果

本轮只做文档和来源核对。下表全部是将来按选中切片执行的 **Not Run** 项；#88 的 443、旧内部／Persona／设备结果分别保留在其精确源，不作为本包真实适配的通过数。一个既有名称下增加的是协议探针，不新建业务验收项。

| 既有编号 | 本包必须补足的实际证明 |
| --- | --- |
| NC01–03 | 精确 N01 六操作的 owner/原 token-instance/opaque operation+key 绑定、prepare 一次性／过期、完整 JSON/稳定错误、输入／路径／长度／隐私以及普通结果读；规范 OpenAPI 与真实 transport 一致，复用已接受 client 合同。 |
| NC04 | 原子 U／A＋proof＋sequence＋authoritative anchor＋sources；事务失败不半写，用户成功后模型前撤权零调用，重试复用原 U 与 timestamp。 |
| NC05 | user-target 上全部未决写入、并发 Retry reservation、A→B→C、旧 read 不清新 marker、late ACK 两分支、重启旧 epoch；accepted assistant/tombstone 永不 Retry；不同 U ID 不插第二用户消息。 |
| NC06 | 实际 SDK 提交线性化／终态 fence／到期边界／回调重试；cancel/disconnect/60s 两侧；F02 sink 与 route current guard；不能把本地 AbortSignal、不可见或回滚称为无物理效果。 |
| NC07 | acceptance 前最小当前 owner/completed/purpose 检查，固定 asOf/readTime 后重新取得跨源开始整体视图；前查不拼入snapshot、原预算不重置；七天两端inclusive/future/先过滤后5条/tie、合法空与故障、精准 Note/Persona mapping、edit/switch/delete。 |
| NC08 | 每一required source当前有效性、离线删除／撤权再重授；current generation大于stamp的确认失效与回退/缺失/损坏的unavailable分别验证；source身份不复用、全owner/Conversation/多页/orphan、终态写入竞争、重放与失败续扫、全部text/provenance/stamp清除。 |
| NC09 | 幂等 whole-delete、首次写入 pending/ACK 丢失/parent absence、children/control/cursor 全清、没有 parent 复活；尚未写回checkpoint的旧page与DELETE竞争，204后不能重现被删路径；90d精确到点立即不可读、24h物理清理与 outage/backlog、旧扫描不误删合法新 anchor；各控制记录独立寿命。 |
| NC10 | 沿 Q31 原 parser／semantic-policy 拒绝边界验证 adapter 输入输出、request-only disposal 与 allowlist日志；本包 fake Qwen token/模型证据标 synthetic，完整 live tokenizer／模型验证留在 E02。 |
| NC11 | 原15/75/90起点、慢 token/prepare/网络 body、Cancel 同步禁发、晚 ticket 清理零 execute、离开/session/logout/dispose、unknown 普通回读及 R-A 停止交互，不重发或伪造 no_effect。 |
| NC12 | 既有 M26 状态／ai-limited、权限失败文案、messageId 合并及 sequence 排序、U 时间不改、tombstone 清旧 text 且迟到 available 不复活；真实 Android与共享入口，相关可达性／放大字小屏。 |

每个运行包须给出：完整 commit head／tree、可执行源码范围、依赖锁及配置的非敏感摘要、实际命令与真实时间／退出码、通过／失败／Not Run、synthetic versus actual adapter 的界限、失败复现及必要受控残留检查。私有 UID、source/path、正文、token/key、raw error 不写日志或公开证据。不能用报告文件的 head 冒充不同 executable source。

## 审批差异与保留历史

| 旧源及不变范围 | 本包具体新选择 | 有权确认及仅受影响范围 |
| --- | --- | --- |
| C06／Q31：原 monotonic 60/5/45、终态封锁与禁止迟到保存；Q14 request-only | F01 下文明确列出的实际提交排序、SDK结算缓冲及到期边界选择；选择可行替代时须逐句保留旧/新行为差异，不能写“等价实现” | JIN 检验技术证据，LI 在其 PM 范围明确解释／修订；如有更高适用来源，由相应有权者处理。未选择前严格原义不变，只停受影响实际写入。 |
| 原 N02 提议物理 lastPersistedMessageAt／expiresAt、最小effects/fence；Q14 dedicated anchor、90d立即不可读＋24h清理 | 采用下文权威 commit metadata／pointer 方案，完整字段／查询／索引，以及 epoch/pending/checkpoint 的最小用途和异常清除 | LI 选择物理合同及运行责任；不得从90d反推新增控制记录自动可保留90d。 |
| Q17／Q19 原开始 snapshot、Note-only白名单、sources type+ID；当前 producer owner/history 并非 AI许可 | F03 固定 readTime、精确 purpose 映射、Account purposeRevocationGeneration、source ID 不复用保证；仅 sourced assistant 最小代际 stamp 是明示 Q19补充 | LI 确认用途与新数据合同，DU 确认其 source/query 保证；未批准不写字段或调用真实 sources。Persona既有功能／编辑切换语义不改。 |
| N01/N05安全unknown：不确定不重发、无持久registry；原恢复出口待定 | R-A 接受永久unknown的局限，新增停止当前恢复并离开copy；无receipt、强制重发、新话题按钮或跨设备内容排重声明 | LI 选择产品限制及copy，JIN审具体client delta；现已验收的R1/R2、Cancel、合并保护保持。 |
| Q19读立即保护、清text/provenance；原完整发现／offline／中断待定 | C-A 两个canonical sweep＋原子tombstone＋最小可过期checkpoint、无反向来源索引；运行参数均明示候选 | LI选择运行责任、字段用途、索引和受控环境；JIN验证完整发现／清除；不能把source周期当Q14 SLA。 |

本包为 [原候选](2026-10-12-zhou-conversation-persistence-mobile-contract-candidate.md) 的实施补充，原已发布正文保留为历史 source；本文未被选中前不 supersede 任何旧规则。今后每条选择须在 `docs/decisions/` 持久化旧源、本文精确版本、选择/拒绝的行、适用范围及未解决的局部 hold。仅较新日期、chat提及或代码行为不建立批准。

## 保留的后续范围及送审格式

本包不重批已批准 Persona、Q17／Q19／Q14／Q31 的不变规则，不新增 Home/router功能，由 LI 管理精确共享入口。E01 M27 仍 prototype/evidence-only；E02 live Qwen host/tag/digest/tokenizer 与完整 Q31-E 证据；E03 ordinary/demo/真实数据/运行启用；E04 Recommendation explanation producer/入口/pre-acceptance fallback 均继续按原候选保留，未选择、未开发。最终适用 Release 义务不因首 Note-only/fake 切片消失；也不据此让全队等待完整AI合同。

本轮按用户新授权只发布本包与原候选的阅读入口补充，附精确差异及文档检查结果；发布后等待 JIN 审查和 LI 的明确条款／范围选择。建议正式决定使用以下逐项记录，不把“总体同意”当作未解决方案的证明：

```text
Source: 原 #81 2f00a6c… + 本方案 Draft PR 记录的完整送审 head/tree
Selected/rejected: F01及到期条款；N02全部物理库存/异常寿命；F03各producer行；R-A；C-A
Supersession: 旧条款、具体新句、差异与实施范围；不变规则继续有效
Owner handoff: LI/DU具体producer保证、source/query/index精确源码与承担者
Released slice/environment: A/B/C/D/E中实际选择的行；isolated synthetic，不含E01–E04
Remaining hold: 无法证明的条件、停哪项动作；不影响哪些已批准工作
Verification/reviewer: 选中NC行、ZHOU→JIN；LI shared delta→DU；LI限定验收及JIN changed-tree gate
```

JIN 的技术审查不能替代 LI 的合同／范围选择；LI 的选择不能替代实际证据。未获相应批准前不合并、关闭任务、变更看板或启用目标环境。本轮完成标准仅为文档方案上传并交接审查，不是宣称真实AI开发／验收已完成。
