# onePA 详情离线调查与已批准最小修复

2026-11-17，Asia/Singapore。调查基线源代码 `5bf281e6807eb69a5b08480f9c9e6a95b4044f95`，其后端与已部署 v85 对应源代码相同。**两个离线可复现缺陷已按 LI 的“批准修复，部署另确认”完成最小源码修复，尚未部署。它们尚不能解释此前每次真实 onePA 503；SC-03 仍未关闭，不能据此定版。** [本次正式批准](../../decisions/2026-11-17-li-onepa-identity-refusal-repair.md)仅覆盖下述两点及永久回归。

## 调查范围与权威

遵循仓库 AGENTS、Skill routing、`enmori-backend-development` 和 `systematic-debugging`。调查阶段只读源码、既有验收记录及安全元数据，使用合成诊断准备未应用补丁；批准后才修改三个生产源文件并加入永久测试。新用例的 HTTP、Chromium、账号 gateway 均为手写 fake；适用 Firebase 验证仅使用隔离的本地 emulator。没有实际浏览器启动、provider 请求、远端操作、AI 调用、手机操作、真实账号数据写入或生产配置改变。未增加依赖、API、日志字段、日志存储或诊断入口。

本次修复建议依照已有要求，不重新定义产品身份或 provider 权限：

- [10 月 15 日 EB04](../../decisions/2026-10-15-li-real-event-contract-selection.md)明确要求严格 occurrence locator 和 **returned Detail ID equality**；同文要求无效来源信息按既定路径排除或不可用。
- [10 月 28 日 onePA 集成](../../decisions/2026-10-28-li-event-profile-discovery.md)保留独立 onePA namespace，并要求 enriching API records 时核对 occurrence identity；普通公开页面的短期、受限浏览器渲染已经获准，但不允许绕过访问限制。
- [11 月 15 日内容与性能决定](../../decisions/2026-11-15-li-event-content-performance.md)第 9 行要求：`Diagnose an explicit provider refusal as unavailable rather than waiting for content that refusal cannot supply`。原有 freshness、精确身份、来源完整性及权限边界继续有效。
- [目录 warming](../../decisions/2026-11-17-li-activity-loading-performance.md)和[补充查询降级](../../decisions/2026-11-17-li-supplemental-query-degradation.md)继续控制目录准入、五分钟时效、失败不续期及明确降级。本建议不改变它们。

这些来源确定应有边界；本轮先交付具体方案，再取得 LI 实施批准，部署仍须另行确认。

## 真实服务问题仍然存在

沿用 [v78 阶段调查](../2026-11-17-backend-expiry/onepa-diagnosis.md)及 [v85 部署接口收据](../2026-11-17-v85-deployment/api-verification.json)，本轮没有重新探测来源。

| 已有证据 | 能说明的范围 |
| --- | --- |
| v78 同一 onePA 身份，刷新 Browse 前 stable/Browse detail 为 503，14.275/12.742 秒；刷新后仍 503，13.273/14.412 秒 | 目录刷新成功不能证明精确详情已恢复；不能全归因于已经修复的过期快照入场缺陷。 |
| v85 同一身份，快照过期前 stable detail 为 503/14.045 秒；过期后 stable/Browse 为 503/0.649/0.570 秒 | 入场快照仍有效时也失败。后两次变快不是成功恢复；真实详情仍未通过。 |
| v85 22:14:58 的来源状态为 unavailable，最近成功为 22:09:45；两个 after detail 开始前已 unavailable | 汇总字段混合多种来源操作，缺少请求阶段关联，不能由该值定位目录、静态 HTTP、浏览器或解析阶段。 |

已有失败响应只有安全错误 envelope，没有当时 provider HTML/JSON。实际服务日志没有可用的 onePA 分阶段关联，因此以下离线缺陷并非那些 503 的已证实根因。真实来源拒绝仍可能是外部可用性限制；正确停止渲染只使拒绝处理更准确，不会让被拒绝的内容变成可用。

## 新离线失败基线

运行现有编译输出及 pinned Node **24.19.0**，命令为 `node --test <private>/onepa-new-boundaries.test.mjs`。诊断源码 94 行；总计 **11 例，3 通过、8 失败，退出码 1，无跳过或取消**。此次是新边界诊断，不是把之前 9/9 的阶段夹具重复计数。

| 用例 | 基线实际结果 | 本次补丁范围 |
| --- | --- | --- |
| 静态 HTTP 403 | 仍启动一次 fake browser；预期不启动 | 纳入。 |
| browser navigation 403 | 仍进入 readiness 并返回合成内容；预期拒绝 | 纳入。 |
| 静态 HTTP 429 | 仍启动一次 fake browser；预期不启动 | 纳入。 |
| browser navigation 429 | 仍进入 readiness 并返回合成内容；预期拒绝 | 纳入。 |
| 完整静态 200 payload | 成功，不启动 browser | 已通过的正向控制。 |
| 普通 200 需要渲染 | 成功，context/browser 各关闭一次 | 已通过的正向控制。 |
| 原始 `projectOnePa` 收到较短数字尾段身份 | URL 指向合成 A，但返回的 product B 尾段仍被现有 `endsWith` 检查接受 | 仅说明错误行可能产生的机制；不直接修改 parser，也不承诺这个独立断言变绿。 |
| 真实 stable Event application composition 请求 A、来源返回 B | 成功，内容来自 B，而 composition 使用请求 A 作为 Event ID | 纳入：返回身份必须等于本次请求身份。 |
| 初诊 Browse application fixture 请求 A、来源配置返回 B | 断言失败；后续查明该 fixture 缺少运行时的 CombinedEventSource，实际可命中 legacy summary 分支 | 这条初诊断言不能证明 Browse 返回 B；以之后真实组合路径的正式 RED/GREEN 替代。 |
| 匹配身份进入两个真实 application compositions | 两者成功，Event ID/browseId 正确 | 已通过的正向控制。 |
| 同 URL pending 请求，第二调用者的 `asOf` 恰好跨过开始时刻 | 第二调用者得到第一调用者投影的未来活动行 | 单独风险记录；暂不纳入补丁，见下文。 |

初诊应用用例执行当前 `createControlledEventBrowse`、`createControlledEventRecommendations` 和 `EventBrowse`；账号使用既有 synthetic test support，底层来源完全 fake。后续实施验证发现初诊直接传入 OnePaBrowseSource，缺少运行时的 CombinedEventSource。故撤回对初诊 Browse 返回 B 的描述，保留原日志；正式永久用例补齐真实组合路径后，在旧码上重现两个 wrong-ID application 失败，修复后均通过。没有证明真实 provider 曾返回上述合成错配 payload。

静态拒绝初诊用例通过 launch 计数确认错误边界，catch 吞掉了返回结果；实施后的永久回归应加强为 `assert.rejects`，同时验证 cleanup，不能只保留 launch 断言。

## 已批准实施的精确范围

批准时冻结的未应用补丁保留在私有目录，批准后原样应用：

`/home/miku/.local/state/enmori-onepa-stability-20261117/onepa-refusal-and-identity-proposal.patch`

SHA-256：`7bfeff36ce22be5b893c354a2a1abd1a6b256bc3b5f83e4d23714db5ccda204b`。

批准前 `git apply --check` 通过；批准后应用结果与 proposal 元数据的三个 proposed hash 一致：**3 个生产文件，22 行新增、7 行删除**。生产范围没有扩展。

| 生产文件 | 最小修改与结果 |
| --- | --- |
| `backend/src/event-browse/infrastructure/public-event-pages.ts` | 增加仅供内部识别的 `PublicPageAccessDenied`；HTTP 403/429 保留拒绝分类。先取消 response body；即使取消抛错也保留拒绝类型，避免进入 browser fallback。公开消息仍为 `Source unavailable`，不附加来源内容。 |
| `backend/src/event-browse/infrastructure/onepa-public-reader.ts` | 静态 reader 收到上述拒绝即退出；其他现有普通渲染 fallback 不变。检查 `page.goto` 返回的 403/429，在 readiness 前退出，仍由现有 finally 关闭 context/browser。 |
| `backend/src/event-browse/infrastructure/onepa-browse-source.ts` | 添加私有 `loadExact`：`load` 成功后，仅当 `sourceEventId(row.browseId)` 等于本次请求的稳定 occurrence ID 才返回。known catalogue 与 sitemap 两条路径、`detail` 与 `event` 两个方法均使用它。错配走已有 undefined/不可用处理，不把另一条内容标成本条。 |

不改变 parser 的 provider 字段解释、URL 发现规则、TTL、asOf 规则、目录与 shared projection fence、pending/cancel/disable、并发上限、deadline、重试、依赖、API/DTO、错误表、数据模型、账号数据、AI 授权或运行时配置。既有 source publication/privacy/time filters 保留。若 provider 返回被拒绝状态，不增加代理、特征伪装或额外请求。

### 已撤回的较宽身份设想

初稿曾考虑强制 `Product.ID` 数字尾段、`xp.Event.Id` 和 URL 完整数字尾段三者相等。现有 `onepa-public-catalogue.ts` 确实按公开 search record 的 product ID 查找完整 `-e<ID>`/`-<ID>` DOM 链接；这只是现有实现及已批准精确身份要求的部分支持，**并不能证明 xp.Event.Id 与另外两个字段必须同号**。

检查三个既有公开来源采集 receipt 的安全结构，未找到保留原始 `xp` 的 product payload；投影后的 `content.sourceId` 和 URL 也不能证明第三个字段。因此撤回这项强等价约束，未使用合成夹具冒充真实映射证据。最终补丁只验证本次请求与实际返回的 occurrence 身份，不增加 provider 编号之间的新业务规则。

旧补丁 `onepa-refusal-and-identity-proposal-v1-unapplied.patch` 保留在同一私有目录，SHA-256 `304fd2f82324be6fb9c90928bc32a0ce5202d1c5173fb52c7977c50f47f55fa5`，已被上述最终补丁取代，从未应用。

### 批准范围内的回归要求

1. 永久测试先在生产基线失败，再应用已批准补丁。探索诊断的 6 个相关断言中，Browse 初诊夹具存在上述组合缺失，已由正式用例纠正；其余原始 parser/asOf 两个探索失败不纳入本补丁。不声称最初 11 例将全部通过。
2. 对静态 403/429 验证明确 rejection、零 browser launch，并覆盖 body cancel 成功、cancel 抛错和无 body。对 goto 403/429 验证 readiness 为零且 context/browser 清理完成。
3. 保留完整静态 200、不完整普通 200 的正常渲染，以及既有 401 bootstrap/普通公开渲染、timeout/abort、最大四并发等已批准行为；不把所有非 200 都改为拒绝，也不扩大到新获取策略。
4. wrong-ID 覆盖 `event`/`detail`、known catalogue/sitemap、cold/cached/coalesced 返回；同时断言正确匹配可继续通过。至少加入一个**请求 ID 匹配、旧合法映射条件成立、但 Product.ID 与 xp.Event.Id/URL 数字并不全相等**的正向控制，防止已撤回三字段规则重新进入实现。
5. 保留 source permission、精确身份、时间过滤、失败后显式重读、projection expiry/replacement、pending/abort/disable 全部既有 fence。source undefined 和上层 safe unavailable 应按当前契约验证，不新定 HTTP 语义。
6. focused green 后执行 backend 全套和适用的 isolated integration/runtime checks，由另一审查者独立复核。仍需单独交付确切 artifact/hash/部署计划，并取得部署批准。
7. 部署后如获准验证，应在同一候选 APK 与匹配后端、同一 onePA 身份上分别检查 detail 两路、拒绝/恢复/再次读取及目录部分不可用；一次成功、不同活动成功或目录 available 都不关闭 SC-03。

## 单独调查：pending asOf 已确认的额外缺陷

`load` 同 URL 合并请求时复用第一调用者计算的 promise。合成用例将第一 `asOf` 设为活动开始前一秒、第二设为开始时刻；第二调用者仍收到第一调用者的投影结果。它提示每调用者时间过滤可能不独立。

初诊只证明 **source adapter 边界**。两点修复冻结后，另一审查者使用 pinned Node 24.19.0、真实 CombinedEventSource → controlled source → stable/Browse application 以及 participation application + 内存 gateway 做了独立合成验证：三种 joined caller 在其 `asOf == startAt` 时仍成功；participation 用例甚至在纯内存中产生 Going revision 1。三个正向控制通过（两调用者均在开始前、冷调用者恰好开始时被拒、已完成缓存按新调用者时间过滤），三个目标断言失败；没有真实账号或 provider 访问。私有证据为同目录 `pending-asof-composition.test.mjs` 与 `pending-asof-controls-node24.log`。

这使该问题从 source-only 风险升级为**已复现的应用行为缺陷**，但仍未与历史真实 503 关联，也不是实际用户误存计划的证据。它不在本次两点批准或本报告下方冻结源码 hash 中。独立最小方案只在 shared promise 返回后按每位调用者原 `asOf` 再做既有未来时间过滤；不改变请求时刻语义、TTL、取消、provider 读取或 API，须单独确认后才实施。主报告应保留这个未关闭问题，不能因当前 2092 个已批准范围内测试通过而宣称稳定版。独立调查由 `onepa-pending-time-review.md` 后续记录；对应六例日志 SHA-256 为 `a39f1e93db30ded9038528a9afb995fae17b2f13f5ccdd8cc7cc343d21de852a`。

## 如真实 503 仍存在，阶段诊断的最小提案

先使用已经存在的观测能力：`OnePaBrowseSource.observations()` 的可用性与时间字段，以及 `readOnePaCatalogue` 的可选 diagnostics callback（complete/partial/unavailable、elapsed、task 完成/失败/取消数量和固定 index 状态）。当前 runtime 未把后一 callback 接入生产，前者又是汇总状态，因此它们不能补造过去失败的精确阶段。

本轮 offline fake 可以继续计数静态/导航/readiness/cleanup；这不需要生产日志。若仍需要真实阶段关联，提交以下**待决定方案**，不得静默启用：

| 项目 | 建议范围与前置条件 |
| --- | --- |
| 优先复用 | 复用已有 catalogue callback 和现有受控诊断基础，先确认其中 AI-only route/stage allowlist 的实际限制；不能直接把事件字段写进 AI collector。 |
| 拟需增加的观测 | 默认不存在的内部 observer，仅有限 stage/outcome 与 dependency status/duration：catalogue admission/cache/join、static、browser launch/navigation/readiness/cleanup、parse、identity、projection expiry/replacement。精确枚举和落点应单独审阅批准。 |
| 关联 | 只用服务端生成、仅本请求链可用的 correlation ID；不加入 activity/user ID、URL、query、内容、请求/响应 body、原始异常或生产 stack。 |
| 采集窗口 | 建议单次最多 30 分钟、200 条事件，自动关闭且不持续重试；这些是待确认诊断上限，不是已批准生产配置。 |
| 存储/保留 | [Q14 日志政策](../../decisions/2026-09-02-retention-logging-audit-policy.md)要求 server loggedAt 后 30 天立即不可访问、24 小时内物理清理、最小 out-of-app operator 权限。先证明具体 collector 支持这些规则；若现有机制不适配，先提出确切差异及存储方案，不能新建 sink 或默认 console 日志。 |
| 获取与验证 | 沿用公开读取权限和拒绝终止规则；阶段观察不授权额外 provider 请求、绕过拒绝、AI 费用、后台任务或部署。用 synthetic failure 分别验证每个允许字段、限量、自动关闭和 cleanup 后，才提交真实受控窗口批准。 |

本次已批准的实施仍只覆盖上述身份与拒绝处理两点，**不包含生产阶段采集、asOf 改动、AI 续期或部署**。

## 私有证据索引

私有根目录 `/home/miku/.local/state/enmori-onepa-stability-20261117/`；报告仅保存摘要与 hash。诊断不含实际账号/活动，仍不把原始私有记录搬进仓库。

| 文件 | SHA-256 |
| --- | --- |
| `onepa-new-boundaries.test.mjs` | `adb4dd45e5f20044a28361e95ddfe83c82d2e0f9977609e3a2c7f5d6da915a65` |
| `new-boundaries-red.log` | `f69d4aa8c836c547610b3f3fdc54ab77d4273f67f1718cf300f22b8d3a17c9ff` |
| 最终未应用 patch | `7bfeff36ce22be5b893c354a2a1abd1a6b256bc3b5f83e4d23714db5ccda204b` |

`patch-metadata.json` 保留批准前快照：三个生产文件的基线/提议 hash、源 commit、当时的 `applied:false` 和旧补丁替代关系；不覆盖该历史证据来表示现状。实施状态与最终验证见下文。

## 实施与验证记录

新增永久测试为 `backend/test/event-browse/onepa-refusal-boundary.test.ts`（12 例）和 `onepa-exact-identity.test.ts`（32 例）。正式 RED 使用未修复生产源码：**44 例，22 通过、22 失败**；目标错误边界失败而正向控制通过。准确应用获批补丁后，新增及既有 onePA reader、dual-source、stable-detail-expiry 共 **101/101 通过**。两端点、两个来源路径、cold/cache/coalesced、错误身份和三字段不全等的合法匹配、拒绝清理均覆盖。

最终同一冻结源码的完整后端 **2092/2092**、隔离 Firebase **21/21**、Azure entry **9/9** 全部通过，退出码均 0、无 skip/cancel。Firebase 仅使用 demo project `demo-enmori-rmvp01a-r10`，loopback 18080/19099/14400/14500/19150，测试临时 profile 和 auth/firestore/hub/logging emulator 已清理关闭；没有读取真实账号。Azure entry 使用 module mocks，不是云端调用。源码、离线 tests、隔离本地服务证据不等于线上恢复或真机验收。

本轮验证命令（`node` 均为下述 pinned 可执行文件）：

```text
node node_modules/typescript/bin/tsc --project backend/tsconfig.json
node --test --test-concurrency=4 'backend/dist/test/**/*.test.js'
node --experimental-test-module-mocks --test tool/azure_backend.test.mjs
node /home/miku/.local/state/enmori-backend-expiry-20261117/firebase-emulator-check.mjs
```

最后一条复用已审阅的隔离 helper，但将输出写入本轮私有目录，不覆盖 v85 前次日志。

另一审查者独立复核三文件 22+/7- 的实现与 44 个永久用例，并用 pinned Node 24.19.0 独立运行 **44/44 通过**。未发现阻止当前两点源码冻结的问题；独立日志 `independent-boundaries-green.log` SHA-256 为 `f48b304d26e656020775b5f0fc8c4fcafc0f0748d24ebf81274c34f10adb4704`。主线程已将批准决定、生产实现和永久测试统一提交为 `272decbf`；该提交不包含另外的 pending-asOf 修复。

中间过程保留：首次 pnpm 脚本因前置隐式 install 检查和无 TTY 而中止，没有安装/升级依赖；改用 pinned Node 直接调用现有 compiler。第一次 test compile 发现 Browse 返回联合类型需要收窄；第一次测试时钟不匹配导致一个正向控制失败；第一次应用后 focused 99/101 暴露缺少 CombinedEventSource 的 legacy summary 夹具问题。仅修正测试夹具，精确反应用同一补丁重建旧码，重跑正式 RED，再原样应用补丁达到 101/101。上述过程没有扩大生产修复。

实际 Node 为 `/home/miku/.local/share/pnpm/store/v11/links/@/node/24.19.0/00cf8b7bd601ac85fa8bfdb2a328cdee2766a25aaf53b02afe1a55508b36b33e/node_modules/node/bin/node`；私有 toolchain/node 是同一可执行文件的链接。编译命令为该 Node 执行 `node_modules/typescript/bin/tsc --project backend/tsconfig.json`，无依赖版本变更。

| 冻结文件 | SHA-256 |
| --- | --- |
| `public-event-pages.ts` | `de5c31a15118e9656389b0e933562770ef1c0e55d56ff11f4780378d34dae377` |
| `onepa-public-reader.ts` | `aa50e240e4fe6a29e103438dd92b640600d3e40fcee1a3decac79600edf1e456` |
| `onepa-browse-source.ts` | `d16e9d7a2ca54b2a933f627e8a45d0cf768846e18235ef7e68bd45d859e59b58` |
| `onepa-refusal-boundary.test.ts` | `3dcd23be21627b78cd1b70e37997d0a577e60b8e2cec2ab92879ce0606812786` |
| `onepa-exact-identity.test.ts` | `d70747ed6f5cb6c691437713c39a611420ea297351ea5fcd65318a295473759b` |

| 本轮私有日志 | SHA-256 |
| --- | --- |
| `permanent-red-runtime.log` | `d5456b568fc4fb5e9135f62af2b18102276981d027063bb5f337db422e6d8d4a` |
| `focused-green-runtime.log` | `a4b5bdbee29d73b3b57ebaf5841a477859f5e41314a71344e6b0cdfdf3707aef` |
| `full-backend-tests.log` | `c90fd427869df7f857df8beb9ab39ed2a9f9d165bd1b9c52169a64b900f27ba3` |
| `firebase-emulator-tests.log` | `60b19ded286dcf858d6b2804cd88ea6d9765b21515af2d1ba8fd001278ef3a62` |
| `azure-entry-tests.log` | `ef29308605ffd3a851d0d22322b62a3713bf2b3de7637a4f24f3cf106302c246` |

同目录 `implementation-receipt.json` 是当前两项修复的结构化收据；保留原初诊及失败夹具/工具调用日志，避免把修正过程抹成首次全绿。pending-asOf 不包含在这些生产 hash 内，部署仍未批准。

## 后续单独批准：第三项 per-caller asOf 修复

上述两项完成后，LI 已明确“加入修复并回归”，并记录为[第三项独立决定](../../decisions/2026-11-17-li-onepa-pending-time-repair.md)。批准范围仅为 shared promise 返回后按调用者原始 `asOf` 重做既有 `startAt > asOf` 检查；不新增响应时钟规则、TTL、取消、重试或 API 语义。此前“须单独确认”的状态保留为历史，现在由这个明确决定仅在所述边界内接续。

第三项根因、实现及最新组合回归见[独立 pending-time 报告](onepa-pending-time-review.md)。本报告的 `272decbf` 源 hash、2092 后端／21 Firebase／9 Azure 及 44 独立用例仍只证明**此前两项组合**，不能作为新增第三项后的最终测试数量或重跑收据。最终候选包及部署另行审阅批准；本轮没有批准 AI 续期或操作手机。
