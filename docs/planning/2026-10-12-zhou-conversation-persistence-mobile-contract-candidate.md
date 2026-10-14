# ZHOU S3 AI 审批状态与下一阶段合同候选

## 当前集中包入口（2026-10-13）

当前阅读入口为 [剩余 N02／F03／unknown／来源清理合同集中包](2026-10-13-zhou-real-ai-remaining-contract-packet.md)。[四项 F01 规则已决定](../decisions/2026-10-13-li-delegated-f01-b-c-d-selection.md)，[#92 能力证据已限定验收](../decisions/2026-10-12-li-ai-capability-slice-acceptance.md)，不再重复确认；剩余精确物理／生产者选择和未证实保证见新包。[本轮本地开发指令](../decisions/2026-10-13-user-zhou-local-ai-development-scope.md)授权可分离规则的本地开发与审查，并禁止上传。以下 10 月 12 日入口及原合同保留为历史，不扩大其原批准范围。

## 当前实施补充入口（2026-10-12，保留原送审正文）

真实 AI 后续方案见 [F01／N02／F03／unknown／来源清理实施候选](2026-10-12-zhou-real-ai-slice-closure-proposal.md)。用户于2026-10-12明确授权上传本补充及此阅读入口，作为Draft文档送审；补充仍待批准，不释放真实适配实施。LI 条件 A 已选择部分设计及 F02；#88 398f81c 已获 JIN／LI 限定组件批准，但不解除真实存储／上下文／恢复出口／完整清理门槛，具体来源和差异见补充。

**以下原正文为 #81 2f00a6c7ab686ffba2429a4dc74761b12a04d3a5 已发布候选，截至原14:44:58核对；全部保留为历史，不将其中旧 Pending／待验收描述当作当前状态。** 明确后续批准仅在其限定范围 supersede 旧状态；不变业务规则与未解决门槛继续有效。本次只加此阅读入口，不改原文、API、代码、索引、依赖或运行配置。

日期：2026-10-12，Asia/Shanghai（UTC+08:00）。工作范围及提交责任：ZHOU 的 AI 部分；独立审查：JIN；实施范围及验收确认：LI。外部交接依赖：LI 的 Account／共享入口、DU 的 Check-in 生产者。

**状态：送审候选，待 JIN 审查和 LI 明确实施范围；不是批准记录，不释放实施或产品发布权限。** 本文件整合 ZHOU 整个 S3 AI 范围的已批准内容、待审批事项、待开发与待验收工作，保留原有对话接口、Conversation 持久化、AI 上下文消费端、P04＋M26 手机交互的具体候选。补入的 M27、真实模型、运行环境及条件性解释路径仅归集已有来源中的剩余边界，不新增产品需求或选择部署方案。

LI、DU 的内容只说明 ZHOU 接入 AI 所必需的审批和生产者交接，不构成他们的功能开发任务；Account／Settings、Check-in／History、Home／共享路由仍由原负责人管理。已验收 Persona 管理功能仅列状态和后续启用边界；新的 AI 工作涉及其请求快照与删除重验，不重做已验收功能。

下文明确给出候选选择及其未解决的证明条件；不能把内部 fake-Port 的通过结果当成这些 AI 边界已经完成。

此前用户要求仅在 `D:\3851 AI` 本地完成、不提交；2026-10-12 在三项协议修订完成后，用户明确授权“现在将内容提交审核，然后等待开工”。此次后续授权仅释放本候选文档的送审发布，不代表 LI 已选择实施合同。实际仓库为 `D:\3851 AI\formal\enmori-app`。本文件保留旧合同和批准历史，不修改 `api/openapi.json`、实现、共享路由、依赖、部署或既有决策；提交后等待相应审查及明确开工范围。

## 项目核对及来源层级

来源状态核对截至 2026-10-12 14:44:58，Asia/Shanghai（UTC+08:00）；只读核对 GitHub `3427564237/enmori-app` 与本地仓库：

| 项目 | 已核对结果及适用边界 |
| --- | --- |
| 项目主框架 | 远端 main 为 `f46a903cb5b339365ac2024004b32b7b96b99e7c`。[README](https://github.com/3427564237/enmori-app/blob/f46a903cb5b339365ac2024004b32b7b96b99e7c/README.md)、[ARCHITECTURE](https://github.com/3427564237/enmori-app/blob/f46a903cb5b339365ac2024004b32b7b96b99e7c/ARCHITECTURE.md) 及下列 Q30／Q17／Q19／Q31／Q14 文件与本地 HEAD 无差异。 |
| 当前开发源 | 分支 `codex/zhou-ai-lifecycle-local-20261012`；HEAD `d242cc9b8fa5626a877d0397c6f1a41278b5c81a`，与 [#79](https://github.com/3427564237/enmori-app/pull/79) head 相同。#79 为 Draft／Open，未合并。 |
| 已批准内部合同 | [10 月 12 日 LI 决策固定源](https://github.com/3427564237/enmori-app/blob/06082d3afe7706440aaba82b57fc4a23acf4f67c/docs/decisions/2026-10-12-li-friend-search-and-internal-ai-approval.md) 选定 [#76](https://github.com/3427564237/enmori-app/pull/76) 的 C01–C07／LC01–LC16，仅批准内部 synthetic fake-Port 生命周期。公开 HTTP、真实 Firestore、真实生产者、P04／M26／Home 均被明确排除。 |
| 实现验收状态 | [#78](https://github.com/3427564237/enmori-app/issues/78) 前三项内部实现／测试／构建有证据；JIN 新代码正式审查及 LI 最终限定验收仍待完成。[LI 预检查](https://github.com/3427564237/enmori-app/blob/a59ac5a0d9c4456f9571fc416c04238827ff803c/docs/evidence/sprint3/2026-10-12-li-ai-lifecycle-preacceptance.md) 记载 Backend 512/512、单独边界 probes 4/4，不是最终验收。本次未重跑这些测试。 |
| ZHOU AI 范围 | [#44](https://github.com/3427564237/enmori-app/issues/44) 的 ZHOU 责任以已接受的六个原映射为边界，见下表；不扩为整个项目的开发安排。[#49](https://github.com/3427564237/enmori-app/issues/49) 完成的是准备工作，不能据此推导新实施授权。 |
| 远端新批准核对 | [#44 的 AI 检查点](https://github.com/3427564237/enmori-app/issues/44#issuecomment-6116871549)、#78、#79 及近期 ZHOU 任务未见替代本表的新 AI 实施授权；后续 [DU 报告](https://github.com/3427564237/enmori-app/issues/44#issuecomment-6118783136) 也没有批准 AI consumer access。#79 的既有上传有其后续授权，早期 local-only 记录保留为历史；本候选合并和修订原先仅限本地，后续文档送审授权见上段。 |
| 本地原有文件 | 工作前存在 7 个 Persona 相关未跟踪文件；本次保留，不将这些本地副本视为新的远端批准。 |

控制来源如下。实施行为和 UI 导出只作证据；日期较新不构成自动替代。

| 来源 | 本合同继承的内容 |
| --- | --- |
| [Q30 Backend](../decisions/2026-09-01-backend-architecture.md) 及[详细设计](../superpowers/specs/2026-09-01-backend-architecture-design.md) | 可信 Backend、versioned HTTPS REST/JSON、规范 OpenAPI、Firebase Auth、Backend-only Firestore／Qwen、内层 Ports；没有自建第二套登录／session-cookie 服务。 |
| [Q17](../decisions/2026-09-01-recommendation-ai-field-allowlists.md) | 按用途授权和字段白名单；单一 `asOf`、七天内过滤后最多五条 Check-in；历史聊天不自动送模型。 |
| [Q19](../decisions/2026-09-01-persona-conversation-lifecycle.md) | 请求开始 Persona 快照、删除重验、整段 Conversation 删除、来源失效与历史元数据最小化。 |
| [Q31](../decisions/2026-09-02-qwen-runtime-failure-contract.md) | 完整非流式响应、60／5／45 秒、容量／隔离、终态／取消、模型输出验证、无自动重试或合成聊天 fallback。 |
| [Q14](../decisions/2026-09-02-retention-logging-audit-policy.md) | `lastPersistedMessageAt + 90 days`、到期立即不可读、24 小时内物理清理、处理副本 request-only、日志白名单。 |
| [Q04](../decisions/2026-09-02-ui-baseline-visual-acceptance-contract.md) 与 [M26／NS35–NS37 映射](../evidence/ui/figma-make-v5/Q04-C_ROUTE_STATE_MATRIX.md) | `ai-assistant`／`ai-limited`、进行中／成功、失败、来源不可用和整段删除；矩阵是支持证据，不能批准最终文案／新页面。Q04-D 已将 M27 `ai-safety` 定为 prototype/evidence-only。 |
| [Account／Settings 批准](../decisions/2026-10-05-li-profile-settings-approval.md) 及[被选合同](2026-10-05-li-profile-settings-contract-preview.md) | `optionalProcessingConsent=accepted` 不等于全部 AI、字段或供应商许可。 |
| [History H5／H6](../decisions/2026-10-07-li-next-read-option-a.md) | owner-only 历史读取不自动授权 AI；optional-AI 撤回不自动撤销普通 owner 历史读取。 |
| [S3 纵向责任](../decisions/2026-09-24-sprint3-figma-coverage-ownership.md) 与[小增量交付指导](../decisions/2026-09-30-sprint3-practical-delivery.md) | ZHOU AI／Persona、JIN 独立审查、LI 范围验收；LI 的共享 Home/router 修改仍由 DU 审查。局部决策只阻止依赖它的行为，不要求全部模块或全部环境先完成。 |
| [Persona P08 原批准固定源](https://github.com/3427564237/enmori-app/blob/141ebcf2cecccaa503ff48a8f3403915db6c060e/docs/decisions/2026-10-09-li-persona-p08-isolated-flow-approval.md)、[最终隔离候选验收](../decisions/2026-10-10-li-final-isolated-candidate-acceptance.md)、[ZHOU owner report 验收](../decisions/2026-10-11-li-zhou-owner-report-acceptance.md) | P01–P03、适用 P08 与三项 Persona 映射的既有隔离实现和旧精确组合 gate 已验收；六映射报告已接受。普通／演示启用与新的 AI 功能不在该验收内。 |

前序提案保留：[10 月 5 日 P01–P09](2026-10-05-s3-persona-ai-contract-proposal.md)、[10 月 11 日待决输入](2026-10-11-zhou-next-ai-decision-inputs.md)、[内部生命周期候选](2026-10-11-zhou-ai-application-lifecycle-contract-candidate.md)。10 月 12 日 LI 批准仅替代其中内部 C01–C07／LC01–LC16 的待选状态。本候选不替代任何批准条款，不重新开放已验收 Persona P08、P01–P03 或准备阶段 P09。

## S3 AI 全范围状态总览

**批准状态和开发状态分别记录。** “已批准”只对原来源明确选择的规则、功能及环境生效；不等于已开发或已验收。“待审批”表示该新选择仍未释放实施。“待开发”表示所列能力尚未交付，其中有些必须先取得对应批准。“待验收”用于已有实现／证据但尚缺指定审查的情况，不能重新写成待开工批准。旧精确源的通过也不自动覆盖以后变更。

### 六个原映射

本表沿用[已接受的原映射报告](../evidence/sprint3/2026-10-11-zhou-owner-handoff.md)及其 LI 验收，不把路由数换算为整体完成百分比。

| 原映射及状态组 | 已批准内容及开发状态 | 待审批内容 | 后续待开发或待验证内容 |
| --- | --- | --- | --- |
| `ai-customize`／29，M23／NS31 | Persona overview 的 isolated synthetic Auth／Firestore 实现已批准并验收。 | 不重批原功能；若选择 ordinary／controlled-demo 启用，按 E03 确认范围。 | 原隔离功能不重做；仅在获准启用或 AI 接口受影响时做相关适配／回归。 |
| `persona-management`／41，M24／NS31–NS33 | 列表、容量、选择／激活、删除及保存重读在原隔离范围已验收。 | 同上；模板、复制、roleplay、模型预览未被本文件纳入。 | 同上，不把整个 Persona 管理模块重新列为待开发。 |
| `edit-persona`／42，M25／NS32、NS34 | 创建／编辑、验证、冲突及离开处理在原隔离范围已验收；`/personas/new` 是 NS32 实现，不是第七个原映射。 | 同上，不重新开放 P01–P03 或 Persona P08。 | AI 只消费批准的四字段 projection；原编辑页面不重做。 |
| `ai-assistant`／30，M26／NS35–NS37 | Q17／Q19／Q31／Q14 规则已批准；内部组件有实现。公开对话产品尚未交付。 | N01–N03、N05–N07 及受影响 F01–F03；真实 producer 使用另依 N04。 | API／存储／清理、完整请求生命周期、手机等待／取消／恢复／删除、Android 和相关集成证据。 |
| `ai-limited`／32，M26 | 已批准为同意／权限受限的 Conversation 状态，不是运行故障或必须独立页面；尚未交付。 | N04 purpose／consent／revocation 映射、N06 文案及 LI 入口交接。 | AI 消费端权限处理、受限状态、权限变化与故障区分，及相应验证。 |
| `ai-safety`／31，M27 | 已批准的当前处分为 prototype/evidence-only；没有独立生产页面授权，也没有另一个 NS ID。 | 如要实现或改变 S3 对应功能落点，按 E01 由 LI 明确生产内容／导航／范围处置。 | 仅开发获批的实际内容／落点；当前不默认排一个新页面任务。底层 AI 安全义务持续适用。 |

### 跨页面能力与交付状态

| 内容 | 已批准部分 | 待审批部分 | 开发及验收状态 |
| --- | --- | --- | --- |
| Q30／Q17／Q19／Q31／Q14 | 架构、数据白名单、快照／删除、模型／预算／容量／输出政策、保留／日志规则已确定。 | 只有拟改变原规则或引入尚未批准具体合同的部分需明确决议；不重新选择 9B/Ollama 或重批 60／5／45、七日五条、90 天等。 | 内部实现覆盖有限；真实网络、存储、producer、模型和设备仍需对应实现与证据。 |
| 内部 Application C01–C07／LC01–LC16 | [10 月 12 日决策](../decisions/2026-10-12-li-friend-search-and-internal-ai-approval.md) 已释放指定 fake-Port 实施；无需再次申请开工。 | 没有重新批准同一合同的缺口；公开／真实适配不能借此获批。 | #79 已有代码／测试／构建及 LI 预检查；**待 JIN 新代码正式审查、LI 最终限定验收**，不列为尚未开发。 |
| N01–N07 对话产品候选 | 继承原规则，候选文字已在本地形成。 | 新接口／数据／权限／UI／隔离验证范围均待选；F01–F03 的真实实现或条款解释未解决。 | 相关公开接口、真实 Conversation 持久化、AI producer 接入和手机对话尚未开发交付；NC01–NC12 为新范围 Not Run。 |
| E01 M27 | 现有 evidence-only 处分及底层安全规则已批准。 | 生产内容落点／导航或范围变化待明确。 | 未开发新的生产 surface；不因此重开已批准安全规则。 |
| E02 真实模型与受控主机 | 9B、Backend-only Ollama、完整响应及 Q31-E 证据要求已批准。 | 真实适配的具体实施任务、tag/digest／tokenizer 对应、安装／主机／访问及 live 执行范围尚需选定。 | 尚未交付真实模型链路及完整 token／semantic-policy／受控主机证据；fake 判定不能替代。 |
| E03 运行与功能启用 | 既有 Persona 隔离验证范围有效；N07 仅提出下一个隔离 AI 候选。 | 普通／演示构建、实际数据／索引／运行配置及相关 Persona-to-AI 启用按所选目标环境确认。 | 不默认要求下一步真实账户上线；也不能仅移除隔离开关就声称普通功能完成。 |
| E04 Recommendation explanation | Q17 最小解释 projection、Q31 解释政策与最终 Release 证据义务已确定。 | 当前 Conversation 不含此路径；选中时还需具体 producer／消费入口／生命周期与 pre-acceptance fallback 解释。 | 当前 S3 Conversation 切片未实现／验收该解释路径；后续义务保留，不扩成 ZHOU 开发所有推荐模块。 |
| 新集成树及 S3 收尾 | 原负责人／独立审查链、相应 Android 证据和 JIN combined gate／LI review 已确定；旧精确 Persona gate 已完成。 | 新范围、实际合并／启用及范围调整须遵循适用授权；不是重复审批每个内部方法或普通测试。 | 新 AI 端到端、相应设备／集成验证、代码审查、合并和 LI S3 范围验收仍未完成。UAT／Release 不由 S3 或文档通过自动取得。 |

**开工范围按所选切片判断。** 当前可继续已批准内部范围内的修复／测试／审查收尾，以及本地合同和交接准备。公开 HTTP／Firestore、真实 AI reader、M26 手机工作须各自获得相应选择后才实施。M27、live host、解释路径及 ordinary 启用只阻止依赖它们的行为；不要求它们一次全部批准，也不要求先完成 DU 全部 History、SHI Event、合并 Persona PR 或重跑旧完整验收才开始独立获批 AI。

## ZHOU AI 候选选择与覆盖

下列 N 编号及后文 E 编号仅为审查行号，不是新增产品需求或 UI state ID。N01–N07 保留原有具体候选；E01–E04 归集原来源已留待后续确认的内容，不在本次另选参数或方案。**所有新增路径、字段、数值、文案和物理机制均属候选，等待相应范围确认。** 已批准的约束不重复申请批准。

| 行 | 单一建议及需确认的边界 | 原缺口及解除责任 |
| --- | --- | --- |
| N01 | 完整响应的 Send／Retry，加原操作 Cancel 与只读结果回读；采用下面的临时操作凭据协议。 | P05 公开接口、请求／响应／错误、取消身份；ZHOU 提交，JIN 审查，LI 确认。 |
| N02 | Conversation／Message／最小效果证明分开存储；用户提交、助手提交各自原子写入，读路径执行生命周期检查。 | P05 真实结构、事务、删除／过期；ZHOU 提交，JIN 审查，LI 确认。 |
| N03 | 不确定效果先撤销旧操作未来写入权，再权威回读；保留合法早期提交，不以补偿删除掩盖迟到写入。 | P05／P06 真实终态和写入竞争；物理可行性 F01 必须先解决。 |
| N04 | ZHOU 的 AI 消费端仅接入获准交接的当前 Account／用途同意、Active Persona、本人 Note-only Check-in；不实施生产者功能变更。 | P07；ZHOU 向 LI、DU 对齐所需读取合同，LI 明确选中 AI 范围。 |
| N05 | P04 选既有 A：AI 专用完整响应等待，取消／离开后旧请求终止；不选 detached continuation。 | P04 等待、网络取消、未知结果恢复；LI 确认具体值和行为。 |
| N06 | ZHOU 仅交付 M26／NS35–NS37 两条既有 route 的 AI 页面状态及内容候选；共享 Home／router 是 LI 提供的接入依赖。 | 剩余 P08；ZHOU 提交 AI 入口需求、JIN 审查、LI 确认；共享入口修改不算 ZHOU 本次交付。 |
| N07 | ZHOU AI 首个可申请实施边界为复用 isolated Auth／Firestore Emulator、synthetic completed Accounts 及 fake Qwen 的 AI 端到端合同验证。 | 建议范围，不新增 Account／Auth 功能，不启用普通／真实账户或受控演示；真实来源的 AI 消费端适配按 N04 选定。 |

N01–N07 的首段 Conversation 候选不包含 Recommendation explanation／其 pre-acceptance fallback、M27 生产内容、live 模型主机或普通环境启用；这些既有剩余边界在 E01–E04 明列，不被取消，也不因列入同一文件而获准实施。活动／好友功能、Account 删除／Q27、新依赖、流式输出、离线发送队列、跨会话搜索、标题编辑、单条消息删除或恢复不在本次范围。P07 未选中的 Mood／Activity／Weather 仍保留原要求；Note-only 是拟选第一切片，不能直接代表完整 AI 范围已交付。

## 必须保持的生命周期

本段是既有 Q19／Q31 及内部批准的约束，新的网络／存储适配必须实现它们。

1. Backend 验证身份和当前账户／用途权，再接受 AI 用例。原始单调时钟 `acceptedAt` 起算唯一 60 秒；队列至多 5 秒、生成至多 45 秒，均包含其中。原始 Persona/start view 和可信 UTC `asOf` 在开始时固定，不能等取得生成槽才首次读取。
2. 仅一个生成、最多两个排队、每用户一个 non-terminal。输入／语义验证、持久化和受保护交付仍属于原操作；不能释放用户槽后继续写入，不能建立第二个独立调度器。
3. 取得生成槽并通过 pre-generation 检查后，才原子提交用户消息；提交确认后，在真正调用模型前再次检查原操作／截止时间／当前权限。队列超时和前置拒绝不保存用户消息。
4. 只保存已完整验证且被接受的助手消息；提交和交付是不同事件，各自检查当前 authority。取消／超时／删除先于效果发生，禁止效果；合法提交先于后来取消，保留该消息的普通生命周期，阻止后续交付，不谎称未提交。
5. 断线使原操作 `abandoned`，到唯一截止点使其 `timed_out`。本地取消 future 不证明模型已停止；真实调用终止前生成槽隔离。取消、清理、重启均不能延长或恢复原请求。
6. 显式 Retry 是新操作，重新取当前 authority／Persona／`asOf`／容量／60 秒。仅复用仍合法存在、没有 accepted assistant，且同一用户消息上的全部相关写入均已确定的已保存用户消息；客户端重新明确提供相同文本，Backend 校验一致，不重复保存或重置保留锚点。旧操作回读不能解除后续 Retry 的未决写入保护；通过检查后才能为新 Retry 调用模型。禁止自动历史输入、后台重试或重用拒绝输出。

Q31 的 9B／Backend-only Ollama、完整输入最多 4096 tokens、context 8192、Conversation 输出最多 512 tokens／2400 Unicode code points、原始 JSON 与语义政策验证全部保留。公开 DTO 不直接复用 Qwen 输出对象；通过 fake token／policy 判定不证明实际 tokenizer／模型安全或 Q31-E Release 证据。

## N01 公开操作候选

### 通用边界

使用现有 Firebase Bearer 验证、撤销／disabled 检查和可信 UID-to-Account binding。owner 不来自 body、query、操作 ID 或普通 header。先认证，再校验请求；无关／未知字段一律拒绝。AI 数据返回 `Cache-Control: no-store`，不进入客户端持久缓存。时间为 UTC ISO 8601；ID 是无业务含义的字符串。

以下 wire 名称均待 LI 确认，确认前不写入规范 OpenAPI。为让审查可以检验，候选 `operationId`／新 `conversationId`／`messageId` 为 Backend 随机生成 canonical lowercase UUID-v4；`operationKey` 为 Backend 生成的 32 随机字节、无 padding base64url。两者都不是可信账户身份或日志 correlation ID。

### 操作准备与取消身份

建议引入一个**无内容、无生成、无持久化的操作准备调用**，让手机在长请求发出前就持有原操作引用，解决首个响应丢失时无法准确取消的问题。它是传输控制步骤，不是新业务页面，也不是 detached AI job。

候选准备记录只驻留单一 Backend 进程内存，绑定已验证 owner、这次已验证 ID token 的进程内摘要、操作类型和目标；凭据摘要／key 不入 Firestore、日志或客户端磁盘。仅同一原 token 实例和操作 key 能 execute／cancel。token 刷新或同 UID 重新登录不转移旧控制权；新的有效 owner 身份可执行普通保存结果读取。这是待 LI 审查的**token 实例绑定方案**，不把 `auth_time` 或 UID 冒充唯一登录 session；若 LI 要求跨 token 刷新继续控制，须由 LI 提供可信 session 合同，本方案不能声称已支持。

准备有效期候选为 15 秒，每 owner 最多一条未消费准备记录；重复准备在有效期内返回无内容冲突，不替换旧引用。未使用到期即销毁。它不占 Q31 accepted/user/generation 槽、不开始 60 秒、不读取模型上下文。execute 只消费一次；准备响应丢失后，没有任何代码可凭未知 ticket 开始生成。失效、已消费、旧进程 ticket 永远不被 execute 重新创建。所有准备／active／terminal registry 均不具备重启恢复执行能力。

手机把 prepare 使用的确切 token 值固定在本次尝试的内存句柄中，execute／Cancel 不以 token provider 自动刷新的值替换它；Backend 仍对每次调用执行有效期／撤销／disabled 检查。该句柄只活到尝试终态及必要的取消请求结束，不写磁盘；新 session 不继承。没有仍有效原句柄时，`active` 回读只提供 Check result，不显示可成功操作的 Cancel。

| 操作 | 精确候选输入 | 成功响应及效果 |
| --- | --- | --- |
| `POST /v1/me/ai/operations` | Send：`{kind:"send", purpose:"checkin_conversation", conversationId?}`；Retry：`{kind:"retry", purpose:"checkin_conversation", conversationId, userMessageId}`。不含文本、owner、Persona 或 source IDs。 | `201 {operationId, operationKey, conversationId, preparationExpiresAt}`。新会话仅预留随机 ID，尚未创建 Conversation。既有目标须先确认当前 own/live。用途标识本身不能授予 P07 权限。 |
| `POST /v1/me/ai/operations/{operationId}/execute` | Header `AI-Operation-Key`；body `{text}`。使用原 token。候选 text 为 well-formed Unicode，1–2400 Unicode scalars、非全空白，保留原文，不截断；候选请求 body 上限 16 KiB；完整模型输入仍受 Q31 token ceiling 限制。 | 仅完整成功为 `200 {operationId, conversationId, userMessage, assistantMessage}`。body 校验后单次消费 ticket；不返回 `202` 后继续后台生成。重复 execute 无新效果，不重放响应内容。 |
| `POST /v1/me/ai/operations/{operationId}/cancel` | 原 token＋`AI-Operation-Key`；无 body。 | `200 {operationId, state:"terminal"}` 只表示已确认原 Application 终态／未来效果已被封住，不表示模型停止。准备态可直接作废；active 终止；原 terminal 重复取消无内容。无法确认效果封锁时返回 unknown 错误，不能成功。 |
| `GET /v1/me/conversations/{conversationId}/operations/{operationId}` | 当前有效 owner token；无 body、无 operation key。 | `200 {operationId, state, userMessage?, assistantMessage?}`。`state` 候选为 `active / no_effect / user_saved / assistant_saved / unresolved`，字段组合见下表。是新普通授权读，不执行原 generation。 |
| `GET /v1/me/conversations/{conversationId}/messages` | 当前 owner；可选单个 `before` cursor，无其他 query。 | `200 {messages, nextCursor?}`；固定最多 20 条，最新一页先取后按会话 sequence 正序显示。无跨 Conversation 列表。本接口服务当前页面和已知会话恢复，不授权模型输入。 |
| `DELETE /v1/me/conversations/{conversationId}` | 当前 owner；无 body，由手机整段删除确认触发。 | `204` 仅在整段永久删除及相关效果封锁已确认完成后返回；处理结果未知返回安全错误，不能宣称删除成功。已确认不存在的 own target 幂等 `204`。不删除 Persona／Check-in／Event。 |

消息 DTO 候选：`{messageId, sequence, role:"user"|"assistant", persistedAt, availability:"available"|"unavailable", text?}`。unavailable 仅允许 assistant tombstone，必须省略 text；不返回来源 ID、Persona 记录、模型 metadata、Firestore 路径或操作控制字段。execute 的两个 message 必须 available。pagination cursor 候选为 canonical unpadded base64url UTF-8 JSON `{v:1,before:<positive safe integer sequence>}`，最大 128 ASCII 字符，严格解码／重编码，未知键／非法值拒绝；只按已授权路径约束读取，cursor 不是权限或冻结快照。每页重新验证当前权限／到期／来源，删除或 source 失效不能被旧 cursor 绕过。

### 效果回读与重试

| state | 必需证据和允许行为 |
| --- | --- |
| `active` | 原 registry 仍确认 non-terminal；不返消息内容、不允许 Retry；可对原操作 Cancel。 |
| `no_effect` | 原操作已经失去未来写权，且权威存储确认无用户／助手效果；仅此时允许新的明确 Send。不存在记录、404 或暂时空读本身不是该证据。 |
| `user_saved` | 原操作已被封住；已保存用户消息仍可读，同一用户消息上所有相关操作的写入均已确定、无 pending／unknown commit，且明确无 accepted assistant，才允许新 ticket 的 Retry。text 必须由客户端明确重新提供并与保存内容一致。 |
| `assistant_saved` | 原操作已终态且已有合法 accepted assistant；重新执行当前读权限／来源规则后返回现有消息。禁止 Retry 再生成第二条。来源失效时返回无内容 tombstone，不能因此重新生成。 |
| `unresolved` | 写入确认、旧操作封锁或来源权威尚未确定，或同一用户消息上任一后续 Retry 仍有 pending／unknown commit；不返回内容、不承诺保存／未保存、不允许自动或显式重发该逻辑输入。用户可再次明确 Check result。 |

对于尚未创建 parent 的新会话，operation 回读先验证当前 owner 与原 registry 的 owner／预留 target 是否精确相同；仅该原始新会话 ticket 可在已封锁、权威确认从未发生消息效果时返回 `no_effect`。这不是通用的“parent 不存在就成功”：已删除／到期的旧会话统一 unavailable，不能重建；无法证明原始目标归属或是否曾提交时不返回内容或 no_effect。

`no_effect` 可能仅在原进程保存的无内容终态观察仍存在时可证明；registry 已清理／进程重启且没有持久效果证据时，返回 unresolved／unavailable，不能伪造 no_effect。新会话预留 ID 不意味着已存在会话。普通历史读取可在新 session 继续，但不授予旧 cancel 权限。终态 registry 清理后重复 cancel 返回 `AI_OPERATION_UNAVAILABLE`，不重建控制记录、不操作新请求，也不改口宣称模型终止。

无内容终态观察仅随尚未结束的效果封锁／清理存在，不为长期恢复另设缓存；清理完成即销毁。因此完成清理后不保证仍能得到 `no_effect`。若 LI 需要更长的确定恢复窗口，须另行选定最小 receipt 用途、寿命和删除语义，不能把 request-only registry 无限延长。

**永久 unknown 的恢复出口仍待决定。** 原终态记录销毁后，Check result 可能永久无法证明 `no_effect`；离开页面、取消本地等待或清除页面状态均不等于服务端无效果，也不解除该逻辑输入的重发限制。ZHOU 须补交用户如何结束该尝试、之后允许哪些行动及相应提示的具体候选，由 JIN 审查、LI 接受这一限制或明确调整恢复合同；若需要 receipt，须同时确定上段的用途、寿命和删除规则。在此之前不擅自增加强制重发／重建会话出口，也不把无限 Check result 描述为已完成恢复设计；依赖该出口的恢复交互尚不能作为最终实施合同。

所有效果回读和 Retry 都必须同时检查同一保存用户消息上的**全部相关操作的未决写入**及 canonical `acceptedAssistantMessageId`，不能只看查询的 operation 或它自己的 effects／fence。存在任一 pending／unknown commit 时，旧操作回读也必须返回 `unresolved`，不能返回可释放 Retry 的 `user_saved`／`no_effect`，不能仅因旧 A 已封住就清除 B 的保护。只有所有相关写入已确定，才按 canonical 指针判断已有助手还是允许 Retry；即使助手随后成为 tombstone，仍属于 accepted assistant，不能重新生成。effects 只证明本次操作做过什么，不能成为跨操作排重或未决写入检查的唯一依据。

对该用户消息的写入在调用存储 Port 前就建立未决保护；取消、进入终态、丢 ACK、终态后迟到 ACK 或暂时为空的助手指针都不能自行解除。操作仍存活时，只有与实际效果一致的确定 ACK 才可解除它自己的未决项；操作已终态或结果仍未确定时，必须先永久封锁其未来效果，再经权威回读确定结果。解除时只清除该操作持有的项，并重新检查是否还有其他未决项；旧 A 的回读／清理不得覆盖 B 的项。正常已确认写入无需为了清除保护而提前终止操作或额外回读。这保留[内部实现](../../backend/src/ai-conversation/application/conversation-application.ts)及 [A→B→C 回归](../../backend/test/ai-conversation/acknowledgment-races.test.ts)的 target-wide 保护语义；代码仅为实现证据，不授权真实 schema。该保护针对同一用户消息，不额外封锁独立新 Send，也不把未开始生成的操作当作需要隔离的模型调用。

具体竞争序列：A 保存用户消息 U 并完成回读；B Retry 的助手提交未确认就被取消；此时查询 A 或 B 均不能释放 C Retry，C 不得调用模型。B 的提交最终确定后，若存在合法助手则查询 A 也须发现它；只有确认全部相关写入结束且无 accepted assistant，才可能重新提供 Retry。回读结果不是未来 Retry 的授权凭据；新 Retry 在复用 U、取得生成资格及实际 dispatch 前仍须重验这一共享边界，并与其他 Retry 的竞争协调，不能以最终唯一助手事务来代替生成前保护。真实 adapter 如何覆盖全部相关在途写入、避免检查与 dispatch 之间被绕过及处理重启后的不确定性，仍须按 F01 证明，不在此新增未经批准的持久字段。

手机进程结束后不保证自动找回 operation 引用，不增加持久 token／离线 outbox。已知 Conversation 的普通消息读仍适用；跨会话发现／自动 crash recovery 未纳入本轮，不能宣传为完整重启恢复。

### 错误合同候选

统一 envelope 候选 `{error:{code,message}, requestId}`；`requestId` 由可信服务器为这次 HTTP 请求生成，不能复用 operation／entity／session/key。下面的 code 和英文文案是待批准 public mapping，既有同名 code 的既有操作范围不被扩大为已批准事实。

| HTTP | code 候选 | 用户可见含义／后续 |
| --- | --- | --- |
| 400 | `REQUEST_INVALID` | 非法字段／结构／cursor；不开始 AI。 |
| 401 | `AUTH_REQUIRED` | 登录失效；清理当前页面敏感状态，重新登录后仅按新权限读取。 |
| 403 | `AUTH_FORBIDDEN` | 当前账户不可继续；不披露其他 owner 信息。 |
| 409 | `ONBOARDING_REQUIRED` | 完成既有账户设置；不在 AI 路由自动 provisioning。 |
| 403 | `AI_CONTEXT_NOT_PERMITTED` | 用途／同意限制，进入 `ai-limited`；不伪装为模型故障或空上下文。 |
| 404 | `CONVERSATION_UNAVAILABLE` | 不存在、非 owner、已删、到期统一安全响应；不能当成无写入证明。 |
| 404 | `AI_OPERATION_UNAVAILABLE` | 原凭据／绑定不适用或操作不可控制；不披露另一个 owner 的操作。 |
| 409 | `AI_OPERATION_CONFLICT` | duplicate execute、未消费准备冲突、Retry 输入不同或已有助手；先查看保存结果，不自动新建。 |
| 413 | `REQUEST_TOO_LARGE` | HTTP body 超候选字节上限，未开始 AI。 |
| 422 | `AI_INPUT_INVALID` | 文本校验或完整 token ceiling 不通过，无静默截断。 |
| 429 | `AI_BUSY` | 容量／同用户 non-terminal 拒绝；无排队或用户消息新写入，不自动 retry。 |
| 503 | `AI_UNAVAILABLE` | 模型、必要 producer 或存储不可用／invalid authority record；无空／默认成功。 |
| 502 | `AI_REPLY_REJECTED` | invalid 或 unsafe 输出，公众统一无内容失败，内部分类仍分开；无助手消息。 |
| 409 | `AI_AUTHORITY_CHANGED` | 仅在仍可合法响应的校验阶段表示权限已变；一旦已进入 stale-authority 终态，不另发迟到错误正文。 |
| 503 | `AI_OUTCOME_UNRESOLVED` | 可能已有写入，先回读；包括取消／删除无法确认，不能承诺无效果。 |

总体 60 秒到期、observed disconnect／abandoned、删除和 stale-authority 的既有 no-late-delivery 规则优先：不为了“补一个 HTTP 504／取消成功 body”在终态后再发送原请求响应。客户端将传输结束映射为 timeout／unknown，并通过新的授权读确认保存结果。queue／generation 子预算失败在原 deadline 内且仍有交付权时，候选用 `AI_UNAVAILABLE` 返回安全非内容错误。Cancel 是独立请求，其确认不重开原 execute。

## N02 真实存储与原子边界候选

### 物理记录提案

以下只是最小字段清单及生命周期提案，**不是已批准 schema 或 migration**。路径使用现有可信 AccountId 映射，但客户端只见随机业务 ID，不能提交 owner partition。字段未列出即不保存；不新增日志／分析／prompt 副本。

| 候选记录 | 精确最小内容 | 保留与删除 |
| --- | --- | --- |
| `accounts/{accountId}/conversations/{conversationId}` | `lastPersistedMessageAt`、`expiresAt`、单调 `nextSequence`、`lifecycleVersion`、`state:live/deleting`。首条用户消息成功时才创建；不创建无消息空会话，不存 title 或 Persona 指针。 | expiresAt 派生于合法最新消息＋90 天；删除／到期立即拒绝所有读写。deleting 仅后台清理状态，无恢复能力。 |
| 子集合 `messages/{messageId}` | `sequence`、`role`、`persistedAt`、available 时 `text`；user 可有 Backend-only `acceptedAssistantMessageId`；assistant 另有 `availability`、`replyToUserMessageId`、Q19 `presentationMode`／可选非识别 `presentationProjectionVersion`。user 指针与唯一 accepted assistant 同事务创建，指针不因 tombstone 消失。 | 随 Conversation；来源无效整条 assistant unavailable 并清除 text／provenance。Persona ID/name/enums/snapshot/fingerprint 永不入历史。 |
| 子集合 `message_sources/{assistantMessageId}` | Q19 最小来源对，候选物理表示为 `[{sourceType:"check_in", sourceId}]`；最多本次实际使用的五条，Backend-only。不额外持久化 purpose；本轮仅有一个固定用途。 | 不含 note/projection；随对应消息／会话；tombstone 完成时去掉被删 source ID，不能另留 reverse-index 残留。 |
| 子集合 `effects/{operationId}` | 已确认 `userMessageId`／`assistantMessageId` 引用及 Send／Retry 类型；只有相应消息效果真实存在时才有证明；不存 text/hash/key/token/snapshot/replayed body。 | **新用途待批**：建议仅为避免重复消息及 owner 回读，寿命不超过被证明消息／Conversation，删会话时一起删除。90 天不会仅因 Q14 自动授权给此新增记录。 |
| `ai_operation_fences/{operationId}` | 最小可信 owner/target 引用、原进程 epoch、单调 fence revision、open/closed；无内容／token／key／排队状态／恢复任务。 | **新用途待批**：仅封锁当前在途数据库效果；确认所有旧提交结束且必要 effects 已可读后立即清理。不能用固定 TTL 抢先删除仍保护迟到写入的 fence；未能结束须使相关 AI 路径不可用并报运维故障。具体最大保留及异常处置由 N03/F01 一并审查，未定前不创建生产记录。 |

操作 registry／queue／prompt／完整 Persona／Check-in projection／raw Qwen 仅在请求内存，终态释放内容。内容无关控制状态只能为尚未结束的清理存在；不能持久化 active queue、deadline 后恢复任务或 response cache。历史 retention 不是新控制记录的任意留存许可。

### 事务清单与重读

| 边界 | 候选必须同一提交发生的内容 | 失败／不确定处理 |
| --- | --- | --- |
| 用户首次提交 | 既有目标必须 own/live；仅原 ticket 明确预留的新目标允许 absent parent 并创建，删除／到期旧目标绝不能走此分支。用途／来源／used Persona 和原 fence／deadline 合法；首次消息＋效果证明＋sequence＋retention anchor；新 Conversation 仅在这一事务一起创建。 | 无成功证明不启动生成；未知先停止旧效果权，再回读；不得“先写 proof 后写 message”。 |
| Retry 复用及生成前验证 | 目标仍 own/live／文本精确相同；检查同一用户消息上全部相关操作的 pending／unknown commit，而非只检查原 effect；全部写入已确定且没有 accepted assistant，fresh operation 才能继续当前 context／生成资格检查；实际 dispatch 前重验并协调竞争。 | 任一未决写入阻止模型调用，旧 A 回读不能解除 B 的保护；不创建第二条用户消息，不重置 timestamp 或 anchor。 |
| 助手提交 | 完整 accepted output、原 operation／deadline／当前 authority；事务读取 user 的 `acceptedAssistantMessageId` 并要求不存在；assistant＋user 指针＋source provenance＋effects＋anchor／sequence 原子更新。 | 竞争两个 Retry 只能有一个 accepted assistant；tombstone 不释放该槽。此唯一性检查不替代上行的生成前保护；失败或 unknown 不假报无写入。 |
| 整段删除开始 | 当前 owner、Conversation fence 关闭／lifecycleVersion 改变、立即不可读，与所有消息提交形成冲突边界；同一目标的未消费 ticket 也作废。 | parent 尚未创建时，仍须封住本 owner 已知原 ticket／在途首次创建，不能仅凭 parent absent 返回 204；异步批量清理不能恢复读权限，完全删除和封锁确认后才 204。 |
| 来源失效 | 消息读当前重验，先 fail closed；再最小化整条 assistant 与所有关联 provenance／索引。 | DU 删除成功不依赖 AI 服务在线；ZHOU 的读边界不能等 cleanup job 才隐藏内容。 |
| 到期处理 | 每次读／写／Retry 以 Backend 时间验证 `now < expiresAt`；任务开始清理时重新读 anchor／version。 | 旧扫描任务不得删除刚被合法新消息延长的会话；过期会话不得通过新 Send／Retry 续命。 |

成功 user／assistant 持久化时间使用 Backend-authoritative commit 时间作为 retention 依据；读、Retry 复用、失败、fence／metadata 更改、清理都不推进锚点。候选可先保存 server timestamp，再从该权威值验证／计算 expiry；**不能把尚未解析的 server timestamp 或请求起始时间假当实际提交时间**。如 expiry 字段不能与实际 commit timestamp 同一事件准确派生，读路径须以权威 anchor 计算；派生字段不能成为放宽 retention 的依据。具体 adapter 证明归 F01。

Firestore 索引候选仅覆盖当前会话按 sequence 分页和到期扫描所需字段；ZHOU 在获批数据映射后提供精确查询／索引清单，JIN 验证，不先修改 `firestore.indexes.json`。如果需要 owner 级来源反查／collection-group 查询，须在 DU 交接中列清字段、读取界限、残留清理和用途；不默许新增 provenance 副本。

### 清理机制与责任候选

建议使用既有 Backend 内受控的定期清理执行入口，在启动时补扫并按候选每小时扫描到期会话；不引入 Cloud Functions、新队列或新服务。到期瞬间由读路径封锁，不依赖 Firestore TTL；物理清理包含 parent、全部 messages、sources、effects 和不再必要控制记录，必须在到期后 24 小时内完成。

ZHOU 负责删除／到期／来源失效清理逻辑与合成数据验证，JIN 审查；LI 在实施范围里指定运行入口和实际值班／故障处置责任。每小时是新候选值，不能证明主机停机期间仍达标；需要补扫、失败重试、积压测量及 24 小时边界演练。无法保证 SLA 的部署不能宣称 Q14 已满足。owner 删除不套用“24 小时可读宽限”，也不默增恢复窗口；删除确认只在永久移除完成后成功返回。

**来源失效后的完整清理方案仍未解决。** 立即 fail closed 只证明读边界，不能证明已找到并清除全部 dependent assistant 的内容及来源引用。实施前，ZHOU 须与 LI／DU 对齐如何发现全部依赖消息、覆盖服务离线期间的来源变化、处理中断后的重试／继续扫描，以及如何证明所有 text、provenance 和适用索引残留已清除；同时说明重复执行、分页中断、与新提交竞争及进度证据的最小留存／删除。任何所需查询、索引或进度记录须纳入 N02／N04 的具体候选和批准范围，不在本轮默增反向索引、新服务或持久事件副本。来源删除和读封锁不等待 AI 清理服务在线；离线恢复后的完整清理仍须有独立证据，不能只演示一条消息不可读就宣告完成。

## N03 真实适配必须先解决的证明缺口

**F01 原子效果与终态：尚未解决。** 内部 fake store 在同一同步事件检查 monotonic deadline／fence／authority；真实 Firestore 网络提交可能在 callback 检查之后才生效。`check → await commit → check` 不能证明“终态后没有写入”。把 timeout 后实际写入藏起来、回滚单条消息、只依赖本地 AbortSignal、认为 transaction callback 再运行就一定未提交，均不满足既有 C06／Q31。

N02 的 fence 事务可以提出取消／删除与消息提交的冲突排序，但单靠一个 fence 字段并未证明精确单调 60 秒及真实 server commit 的边界。ZHOU 须提供候选 adapter 的实际提交线性化点、pending commit 的取消／失去写权证明、精确截止两侧以及响应丢失后的权威读；JIN 独立验证。若现有栈无法实现，要把受影响的 C06／Q31 条款、可行替代及行为变化交 LI 作明确解释／修订，并保留旧源；本合同不预先批准放宽。**这只阻止受影响真实写入／交付适配，不阻止本候选整理或已经批准的内部工作。**

**F02 网络交付：尚未解决。** `reply.send`、socket write 完成和手机显示不是同一事件。候选以 Backend 在仍有权时向本次 response sink 接受完整 body 为交付检查点，并要求手机在显示前确认仍是当前 session／route／operation。此解释需 LI 明确确认；未确认前不能称其等同 fake sink，或保证无法撤回的网络字节能被事后删除。取消确认、保存确认和手机已读确认必须分开描述，不增加已读回执功能。

**F03 真实开始快照：尚未解决。** N04 的跨 producer 读取必须说明何时建立唯一 start view、何时 acceptance／`asOf` 固定、异步读取如何计入原 60 秒、如何在排队前冻结。建议在同一 Firestore 一致读边界取得 Account/consent、Persona set 和合格 Check-in view；Auth 撤销状态仍需自身验证。单次事务重试、不同源串行读取或 queue 后 current-read 不自动等于开始时快照。ZHOU／LI／DU 须给出真实 adapter 的共同读边界／版本协议及变化竞争证据；不能把内部同步 `capture/current/watch` 接口原样当成分布式保证。

## N04 ZHOU AI 上下文消费端与交接依赖

首批 purpose 候选名为 `checkin_conversation`。它限定本次字段使用，不让客户端选择数据来源或越过同意。拒绝／撤回时停止这一用途，不默认为“只去掉 Check-in 后继续聊天”；若需要纯当前输入的另一种用途，LI 另行明确其许可，本轮不创造。

下表是 ZHOU 为 AI 消费端列出的交接需求。生产者当前不能提供的能力作为依赖缺口提交原负责人确认，不由 ZHOU 在本任务中补写 Account、Settings、Check-in 或 History 功能。

| AI 依赖及现有负责人 | ZHOU 需要的交接内容 | AI 消费端必须区分的结果及变化 |
| --- | --- | --- |
| Account／LI | 可信 owner binding、completed／eligible 状态、该 purpose 当前许可及 version；明确 Settings consent 对本用途／历史来源再验证的适用关系。 | authorized、denied、unavailable/invalid；`accepted` 布尔值不是全部授权。新请求、在途提交／交付、既有 assistant 读取分别规定撤回效果。 |
| Persona／ZHOU，LI 确认 | 当前 owner coherent Active set；合法无 Active→default；request-only used-Persona ref；只将 Q19 四字段 `schemaVersion/tone/responseLength/formatStyle` 投影给模型。 | absent Active 是合法结果，读取失败不是 default；编辑／切换保持原快照，used Persona 删除阻止后续效果，无关 Persona 删除不影响本操作。 |
| Check-in／DU 与 ZHOU | 候选仅取本人 Note-only：`createdAt → occurredAt`、`note → noteText`；DU 确认实际字段语义、合法空集、逐条来源权限和删除版本。 | authorized empty 与 denied／读取失败分开；不复用 History 日期／20条 DTO 充当 AI query；不制造 Mood／Activity／Weather label。 |
| Conversation／ZHOU | own/live／expiry、用于 Retry 的明确用户消息、保存助手的 required source refs 再验证。 | 一项必要来源新失效，整条 dependent assistant 不可用；普通 owner history 权不能当 Qwen 权。 |

Check-in 以唯一 Backend UTC `asOf`，先过滤 unconsented／deleted／unauthorized／future／区间外，再按时间倒序＋opaque ID 稳定 tie-break，取 `[asOf−7×24h, asOf]` 内最多五条。候选首先只交接 Note-only；不能先取五条再过滤、造出空上下文，或传入 UID／record ID／path／location／temperature／provider／完整历史。

模型 payload 与内部 provenance 分开；后者只为当前权限检查及合法历史消息的 Q19 依赖验证。必要读取失败时 fail closed，不以临时故障当缺少 optional 值。Account、Persona、Check-in 的真实字段／索引／扫描界限、版本及撤权传播由各 producer 明确交接；没有当前权威就不调用模型。

后续纳入 Weather 时仍适用 [Q13](../decisions/2026-09-02-production-weather-contract.md)：缺失时省略 label；实质依赖 Weather 的输出由 Backend／UI 确定性提供 provider／CC BY 4.0／修改声明，不让 Qwen 生成 attribution。当前 Note-only 候选不声称已覆盖这部分。

## N05 手机等待 取消和恢复候选

采用前序 P04 A，同步等待一个完整响应。下列时间值是**供 LI 选择的新候选，未测量也未批准**；非 AI 默认 15 秒保持既有范围。

| 阶段 | 候选手机限制 | 与 Backend 的关系 |
| --- | --- | --- |
| token＋prepare | Send 点击起合计最多 15 秒；仅本次尝试仍有 dispatch 权且 session／route 有效时，prepare 拿到后立即 execute，不能在 UI 长留 ticket。 | 尚未 accepted；失败无生成。限时耗尽或任意 Cancel 都先同步关闭本次 dispatch 权限；迟到 token 不得继续 prepare，迟到 ticket 不得触发 execute，只能尽力作废或由 prepare expiry 清除。 |
| execute | dispatch 起最多 75 秒，且 Send 点击起总计最多 90 秒；包含完整 body 接收。 | 额外窗口只覆盖传输，不把 Backend 60 秒延长。入站延迟不可知；proxy／body delay 与实际部署兼容仍须验证。 |
| Cancel／结果回读／普通消息读／Delete | 各自独立普通 15 秒；Delete 超时显示结果未知。 | 新 HTTP 调用不延长旧 AI 操作；回读不生成／续传。 |

等待时禁重复 Send、提供 Cancel、保留有权阅读的已保存消息；不显示伪百分比、不逐 token 渲染、不把 request dispatched 当 Backend accepted／用户已保存。文本只按 application-controlled plain text 显示。

**任何 Cancel 都先同步、不可逆地撤销本次尝试的后续发送权，然后才执行异步 abort／Cancel／清理。** 此规则覆盖准备阶段点击 Cancel，以及限时、确认离开、适用后台状态和 session 变化触发的取消。每次 token／prepare 的异步返回及实际 execute dispatch 前都检查当前尝试身份和发送权；取消后迟到 token 不得发起 prepare，迟到 prepare ticket 不得 execute，也不得恢复等待／成功页面或转交新尝试。已知或随后收到的 ticket 只能在仍有有效原句柄时尽力作废，否则依 prepare expiry 清除；这类清理不恢复发送权。若 execute 已在取消之前发出，则按原操作 abort／Cancel 与未知结果回读处理，不能因本地已取消就宣称服务端无效果。

75 秒 execute 或 90 秒总限时任一先到，先禁止该 operation 的迟到 UI 更新，再执行 request-specific abort，并使用仍有效的原 token／key 尽力发送 Cancel；不能只用停止等待的 `Future.timeout`。进入 timeout／outcome unknown，通过新普通读确认保存效果。若原 token 已失效或已被清除，不用新 token 冒充原控制身份，不把取消失败当成未保存；Backend 的 disconnect／原 deadline 仍负责原终态。

进行中 Back／路由离开候选显示 `Stay`／`Request cancel and leave`。确认离开后立即禁止旧页面迟到更新，针对该请求 abort 并尽力发送原操作 Cancel；不关闭共享 HTTP client。`paused`／`detached` 候选请求取消，短暂 `inactive` 不自动等于离开；session 更换／logout 先从原尝试取得仅用于本次 best-effort Cancel 的句柄，再立即清除页面内容／session 引用，取消请求结束即释放句柄，绝不交给新 session。没有有效句柄则仅 abort／等待 Backend 原终态，不伪造控制权。进程死亡只能依赖 Backend observed disconnect／deadline 终态，不能假称手机已送达 Cancel。

为再次进入当前会话，应用在同一会话期内只保留必要的 operation／conversation 引用及临时控制凭据；不保留 prompt／model output cache 或磁盘 token。旧 A 终态后新 B 开始，A 的延迟 Cancel 只能影响 A。cancel 请求失败／错 token 不等于原请求仍可安全重发。

未知网络结果时显示 Check result，不自动 Retry。回读只返回以前合法保存且现在仍有权读取的数据；`assistant_saved` 合并已存消息，`user_saved` 才允许显式 Retry，`no_effect` 才允许新 Send，unresolved 保持未知。`user_saved` 仍须满足 N01 的同一用户消息全部未决写入检查，不能凭旧回读绕过后续 Retry；永久 unknown 的结束／恢复出口仍按 N01 待决事项处理。任何恢复都不能让原 abandoned 请求继续生成／保存／交付。来源失效的 accepted assistant 即使无内容可显示，也不能作为“从未有助手”的重试依据。

execute 成功、效果回读及普通消息读取统一在当前已授权 Conversation 内按 `messageId` 合并、按 Backend `sequence` 排序，不能直接追加返回数组，也不按 text 或 operationId 去重。Retry 返回已有用户消息 U 和新助手 A 时，保留 U 的原 `messageId`／`sequence`／`persistedAt`，仅合并一次 U 与 A；不能把响应接收时间当作 U 的新时间，或因复用 U 改变其位置／保留锚点。新助手保留自己的 Backend 提交时间，其合法提交仍按原规则更新 Conversation 锚点。重复响应、重叠分页或再次回读保持同一显示结果。

合并前仍检查本次响应所属 session／route 及请求是否有效；execute 响应校验原生成尝试，普通回读校验本次读取身份与权限，不要求旧生成仍 active。当前权威读取返回的 assistant tombstone 必须移除对应已显示 text；更早请求的迟到 available 响应不得恢复已被后续权威读取判为 unavailable 的内容。去重不允许继续保留已失效内容，也不能绕过原有迟到响应防护。

删除结果未知时，`Check again` 明确重发同一 owner／同一 Conversation 的幂等 DELETE，重新验证当前权限；只有 204 才确认永久删除及相关封锁完成。普通消息 GET 的 404、空列表、网络失败或换 session 不作为删除成功证明。重发 DELETE 不创建会话，不开始 AI，也不自动重复生成。

## N06 页面状态 文案及共享入口交接

以下英文与现有产品语言保持一致，只是内容候选，待 LI 确认。NS 为既有映射；表内细分是该映射的验收场景，不新增 NS ID。

| 映射／场景 | 候选显示与行动 |
| --- | --- |
| NS35 准备／等待 | `Sending…`／`Waiting for a reply…`，Cancel；等待状态可被辅助技术识别，无重复 live-region 播报。 |
| NS35 完整成功 | 仅当前 session／route／请求仍有效时，按 `messageId` 合并已接受完整消息并按 `sequence` 排序；Retry 不重复插入已有用户消息、不改变其原 `persistedAt`。回读按本次读取身份校验，不要求旧生成仍 active；网络成功不冒充用户已读证据。 |
| NS36 busy | `AI is busy. Try again later.`；本次不生成；不自动 Retry。 |
| NS36 dependency／必要读取故障 | `AI is unavailable right now. Try again later.`；与 ai-limited 分开。 |
| NS36 invalid／unsafe | `A reply could not be provided.`；无伪 assistant 文本，无原始输出，保存状态确认后才能 Retry。 |
| NS36 timeout | `This request timed out.`；状态不明附 `Check saved messages before trying again.` |
| NS36 cancel requested／abandoned／unknown | `Cancellation requested. The result has not been confirmed.` 或 `We couldn’t confirm the result. Check saved messages before trying again.`；Check result。 |
| NS36 stale authority | `This reply is no longer available.`；不透露具体私有来源／删除原因。 |
| M26 ai-limited | `Check-in context is not available under your current permissions.`；本候选 purpose 不允许 Send；不诱导用户必须同意才能使用其余 App。Settings 的具体导航由 LI 交接，不新增 consent toggle。 |
| NS37 source-unavailable | `This reply is no longer available.`；无 text／source ID；不产生重新生成按钮。 |
| NS37 删除确认 | `Delete this conversation? All messages will be permanently deleted.`；Keep／Delete；确认必须覆盖整段会话，不提供逐条删除。 |
| NS37 删除中／未知／完成 | `Deleting…`／`Deletion has not been confirmed. Check again.`／`Conversation deleted.`；用户在确认框选择 Delete 后立即隐藏本页内容；Backend 未确认不得宣称完成或重建会话。 |

ZHOU 交付 AI feature 入口、所需 session／回调、状态及内容清单；JIN 审查。ZHOU 向 LI 提交的共享接入需求包括 Home 入口显示条件、现有 `ai-assistant`／`ai-limited` 路由映射、Back 目标、Settings 交接及共享 Auth/session 生命周期。这些共同文件由 LI 按既有责任确认和交接，不属于本次 ZHOU 功能修改。沿用单一应用级 Auth；页面 route guard 不代替 Backend 授权。当前 Persona 专用 create foreground/completion 分离与 DELETE 能力只是实现证据，不可拿来授权 AI detached completion；已验收 Persona P08 不重做。

验证包括小屏／放大文字、焦点与有语义 Cancel、无纯颜色错误提示、loading/error announcements、真实 Android 退出／返回／背景与取消。不能把 RMVP-01A 的特定 accessibility evidence 延期扩大到本 AI 新切片，也不把 Android 证据写成 iOS 通过；iOS 依[现有正式延期范围](../decisions/2026-09-02-ios-product-delivery-deferral.md)记录适用状态。

## 三部分合同之外的既有待审批边界

E01–E04 来自[已接受的 ZHOU 后续决策输入](2026-10-11-zhou-next-ai-decision-inputs.md)、[Q31](../decisions/2026-09-02-qwen-runtime-failure-contract.md)、Q04-D 和既有隔离验收，不是新设的功能清单。以下保持“何时需要审批”和“实际还要完成什么”的区别。

### E01 M27 安全内容与范围处置

**已批准：** Q04-D 的 M27 `ai-safety` 是 prototype/evidence-only，底层 AI 安全义务没有被取消。其出处是[正式 Q04-D](../decisions/2026-09-02-ui-baseline-visual-acceptance-contract.md)及[详细处分记录](../superpowers/specs/2026-09-02-q04-d-inventory-content-acceptance-draft.md)；不能仅凭 Figma 路由或 S3 目标直接开发独立生产页面。

**待审批：** 若要落实 S3 对应功能或改变现有落点，ZHOU 向 LI 提交具体内容和导航选择：是否需要独立生产页，或将获准内容放入已有 AI／Settings surface；对应入口、文案、可达行为及原映射如何追踪。维持当前 evidence-only 状态本身不需要重批，但不能据此把 S3 尚未交付的目标默认为已完成或永久删除。任何有意合并／替代／取消应记录适用来源、理由及范围。

**待开发与验收：** 仅实现实际获准的内容及落点，并检查其可达性、文案、相关视觉／无障碍证据。若落在 Settings，共享修改仍由 LI 按原职责交接；不新增 NS ID，也不把此项列成所有 Conversation 或内部工作开工的前提。

### E02 真实 Qwen 适配与受控模型主机

**已批准：** Qwen3.5-9B 经 Backend-only Ollama、4B 仅手动开发替代、非流式响应、Q31 的预算／容量／验证／失败／隔离规则已经确定。真实模型实现须满足这些规则，不重新发起模型选型或批准同一安全政策。

**待审批或明确执行范围：** 在选择真实模型切片时，明确实际 adapter 的实施边界及验证责任；在安装／live 执行前，明确具体 Ollama tag 与 resolved digest、对应 tokenizer、安装配置、主机容量／访问、允许执行的数据和环境、停止／恢复的操作责任。Q31 没有选择这些实际环境值，本合同也不填入未经证实的值。若适配需要新的依赖、基础设施或改变既有行为，只对相应新增选择取得批准；常规内部签名和普通测试不逐项送批。

**待开发：** 将真实 generation transport、模型身份和 tokenizer 检查、完整输入 token accounting、实际语义政策执行接入同一生命周期；验证真正模型停止后才能释放 generation lane。现有 parser 和 fake checkpoints 不能被描述为实际 tokenizer、semantic classifier 或 Ollama 实现。语义政策要记录具体版本及 allowed／prohibited／ambiguous 对抗样例和结果，继续拒绝规则外或不确定的 mandatory case，不引入第二次模型调用自我审核，也不声称已数学证明自然语言 grounding。

**待验证：** 完成下文 Q31-E 证据。正常自动化继续使用 fake Qwen；live-host 执行只在其环境授权后进行。主机尚未选定不阻止已明确批准的内部或 isolated Emulator 开发。

### E03 普通与演示环境中的 AI 及相关 Persona 启用

**已批准：** Persona 原验收仅覆盖既有 isolated synthetic Auth／Firestore 范围；当前内部 AI 也未接入 Bootstrap／真实模型。N07 是下一段 isolated AI 验证的申请候选，不是普通构建的启用许可。[最终隔离验收](../decisions/2026-10-10-li-final-isolated-candidate-acceptance.md)没有释放 runtime／index／cloud／real-data／model enablement。

**待审批：** 按实际选择的交付环境，明确 AI 及相关 Persona 入口的开关／composition 范围、适用身份和已有账户状态、当前 purpose／consent 映射、真实 producer 可用性、实际 Firestore schema／索引／清理执行配置、所需数据准备或迁移及执行责任。已有孤立合成测试或历史读接口不能替代这些权限；不通过取消保护开关直接启用 ordinary／controlled-demo。没有选中的数据准备／迁移不新增为必做任务。

**待开发与验证：** ZHOU 只完成获批环境中的 AI adapter／feature composition、与已交接 producer 的集成及适用测试；LI 提供共享 Home/router，LI／DU 仍负责其生产者。相关 Persona 仅验证与新 AI 接入有关的变化，不重做已验收管理功能。自动化测试仍使用隔离数据，不能指向演示或真实用户数据；下一步不强制真实账户上线或用个人数据证明功能。

数据库结构／清理逻辑的候选审批 N02 与实际运行配置／索引部署授权 E03 可以在同一明确范围决定中处理，不必人为拆成重复审批；任何未选环境仍保持原边界。

### E04 后续 Recommendation explanation 的条件范围

**已批准：** Q17 对单一已选推荐结果的最小解释 projection、Q31 的解释输出／失败与安全 fallback 规则有效。当前 C01–C07 内部任务以及 N01–N07 首段 Conversation 候选均不选择该解释路径；ZHOU 的六个原映射没有新增完整推荐 UI／计算模块。

**选中该路径时待确认：** 对应 producer 提供的单一已授权结果和安全字段、消费入口、用途权限、实际适配及生命周期。ZHOU 的[原提案](2026-10-05-s3-persona-ai-contract-proposal.md)已指出：capacity rejection 发生在 acceptance 前时，当前组件没有 `acceptedAt/deadline`，而 Q31 的 explanation fallback 必须使用原 deadline；LI 需明确这一边界的适用解释，不能自行制造 acceptance、重启 60 秒或把被拒操作称为已接受。

**后续待开发与证据：** 若被选入具体任务，再完成最小解释适配及其 producer 交接；Friend／Event／Activity 的数据和推荐逻辑仍属原 owner，不由本文件分派给 ZHOU。最终 Q31-E 明文要求成功 Recommendation explanation 与相应安全 fallback 证据，不能因当前切片排除它而永久删除该 Release 义务。此项不构成独立 Conversation 开工的统一条件，完整 Release 证据也不自动成为每次内部小增量的验收前提。

## ZHOU AI 范围验收清单

本表 NC01–NC12 对应 N01–N07 的新范围，全部 **Not Run**；不覆盖已验收 Persona 或已执行内部 LC 的既有结果。内部 LC 通过不替代此表。选中哪些行，由 LI 在实际任务中标明，JIN 按相同源版本审查；不要求所有后续模块先决议才能开展独立已批准工作。

| 编号 | 最低可观察证据 |
| --- | --- |
| NC01 身份及 DTO | Auth-first，invalid／expired／revoked／disabled；owner substitution、跨 owner／Admin 普通越权、未知字段、输入边界、body 大小、cursor；Fastify injection／OpenAPI／Flutter mapping 一致。 |
| NC02 操作身份 | prepare 丢 ACK 无生成、到期／重复准备、execute 重复无第二 effect；原 token/key、刷新 token、同 UID 新 session、A cancel 晚于 B、旧 epoch／重启 ticket 不恢复执行。 |
| NC03 时钟与容量 | 单调 60／5／45、精确截止、时钟回拨、排队 capture、post-generation 持有用户槽、零 generation 不伪 quarantine、真正 stop 前不释放生成槽；与旧 runtime 共用容量。 |
| NC04 用户／助手原子效果 | 实际 Emulator 事务 barrier／失败：message、proof、sequence、anchor 不半写；用户成功后 dispatch 前撤权零调用；assistant 先合法 commit 后断线保留，不做单条回滚。 |
| NC05 未知结果／Retry | commit ACK 丢失、pending commit、封锁前空读、封锁后权威回读、double Retry、已有 assistant／tombstone、文本不等、deleted／expired；写入 Port 调用前已有保护，终态后迟到 ACK 不自行解除；A 保存 U 并回读→B Retry 提交未决后取消→再读 A 仍 unresolved→C Retry 零模型调用，旧 A 回读／清理不解除 B 保护；分别验证 B 最终合法提交与确认无效果两分支，以及旧 user_saved 后新 pending 出现时 dispatch 前重验。无重复用户、无第二 accepted assistant、无提前生成、无保留期重置；不额外封锁独立新 Send 或伪占 generation lane。 |
| NC06 F01／F02 | actual effect 两侧取消／删除／deadline；SDK 重试、server commit 与 response sink 分离；无法证明严格边界须记录 Blocked，不能用 fake 或“读不见”替代无迟到写入。 |
| NC07 真实 context | 单一 start view／asOf，七天两端／future、先过滤后选五条、同时间 tie-break、合法空 vs 故障、exact Note mapping、Persona edit/switch/delete、跨源版本变化、撤同意及无相关权限。 |
| NC08 来源传播 | DU source 删除／撤权时在途不发布；历史依赖整条 assistant fail closed，cleanup offline 仍不可读；按获批发现／续扫方案覆盖全部依赖消息，服务离线期间变化、分页／任务中断后继续和重复执行，证明所有相应内容及 provenance／索引残留清除；tombstone 不留被删 source ID。 |
| NC09 删除／保留 | whole Conversation 幂等删除／ACK 丢失／途中崩溃、分页／cursor 不泄漏、90 天精确到点、24 小时清理、补扫／积压、旧扫描遇新 anchor、control/effects 各自保留目的及清除；不复活 parent。 |
| NC10 输出及隐私 | Q31 parser／semantic corpus、unsafe/ambiguous fail closed、完整 token accounting；无历史输入、无 raw/private body／key／UID／source/path 进入日志；fake 模型证据明确隔离。 |
| NC11 手机网络 | 15／75／90 各起点、token/prepare 慢、入站／response body／proxy 慢、取消丢失、离开／paused／inactive／logout／同 UID 新 session／dispose；等待 token 时 Cancel 后迟到 token 零 prepare／execute，等待 prepare 时 Cancel 后迟到 ticket 零 execute、仅作废／到期清理；发送权在异步清理前同步关闭，覆盖 ticket 已得但 execute 前取消、重复 Cancel 不恢复发送权、旧尝试迟到后新尝试已开始；旧 reply 不落新页面。未知先 Check result；终态观察销毁后无 no_effect 的出口仅按 LI 明确后的合同验收，不伪报已恢复。 |
| NC12 页面及集成 | M26／NS35–NS37 全表、ai-limited 区别、语义焦点／announcement／大字小屏、真实 Android 保存重读／取消／删除；先回读 U、Retry 成功返回 U＋A 后仅显示 U、A，成功／回读／重叠分页重复或返回顺序交换均按 messageId 合并及 sequence 排序，U 的原时间不变，新 A 使用自身提交时间；普通回读不依赖旧生成 active，tombstone 清除旧 text，旧 available 响应不能恢复内容；验证 LI 提供的 Home/router 交接，非 AI 15 秒保持不变，仅回归 AI 改动影响到的 Persona 接口。 |

使用现有手写 fakes／runner、Port contract、Fastify injection、隔离 Auth／Firestore Emulator，再做获批设备验证；不新增 dependency／host／CI 产品。真实模型身份／tokenizer／semantic policy 及 controlled-host Q31-E 是后续已有要求，不以本文件或 Emulator 结果宣告 Release。验证记录必须带实际 source、命令、环境和 Pass／Fail／Blocked／Not Run，不能转抄旧测试数字当新合同结果。

### 已批准 Q31 要求的待完成真实证据

下表归纳 Q31-E 已有六组 Release 证据要求，**不是新的产品需求或六项新的开工审批**。内部 fake 测试已提供其中部分编排证据；下表的真实模型／真实适配／完整 Release 证据仍未完成，受控执行尚为 Not Run。本次不把它们并入旧测试通过数。

| 已有证据组 | 尚需取得的真实结果 | 对应范围 |
| --- | --- | --- |
| 模型身份与隔离 | 已加载的 9B reference＋不可变 digest、Backend-only／私有 Ollama、无应用级文件／网络／数据库／shell／工具／持久记忆权限；4B 结果明确仅属开发证据。 | E02；具体受控环境按 E03。 |
| 时钟与容量 | 真实 adapter 保持唯一 monotonic 60 秒、5／45 子预算、墙钟变化不影响、one active/two queued、用户槽直到真实 Application terminal，及 pre-acceptance overload。 | E02 及 N03/F01–F03；不重批限值。 |
| 终态与模型停止 | observed disconnect、timeout、删除竞争、迟到结果丢弃、实际调用终止／quarantine、shutdown/restart 不恢复队列。 | N01–N03、E02。 |
| token 与原始输出 | 匹配实际模型的 tokenizer，对包括 Backend framing 的完整输入计量；context/input/output ceilings；真实原始响应解析，重复键／多 root／未知字段／编码／截断／markup 等整体验证。 | E02；现有 parser 回归可复用但不代表真实 token 验证。 |
| 语义政策 | 可追踪政策版本、允许／禁止／模糊对抗样例、具体执行结果；ambiguous mandatory case fail closed，无第二模型自审或万能 grounding 声明。 | E02 及获批 use case；已定拒绝边界不重新审批。 |
| fallback／保留与故障隔离 | 真实 Conversation 成功及无合成聊天 fallback、失败不保存拒绝内容、正确 retention/log allowlist；受控模型故障时非 AI 继续可用；最终包括 explanation 成功／安全 fallback。 | Conversation 为 N01–N06/E02；解释部分按 E04 及原 Q31-E 保留。 |

受控场景还须覆盖 dependency unavailable、timeout／cancel、安全可注入的 invalid structured output，记录环境、source／model identity、命令／版本、时间、观察到的延迟及 Pass／Fail。日志限制适用于 Backend、HTTPS edge 和进程监督；Q14 的 30 天日志保留／到期不可读／24 小时清理仍有效，不因新主机或错误排查而保留 prompt、token、用户内容或禁止的标识。

### 新集成版本的审查与 S3 收尾

ZHOU 完成所选代码与 owner evidence 后，由 JIN 审查新实际 source，LI 验收限定范围；共享 Home/router 的 LI 修改仍按 LI→DU 的既有审查路径。适用 Q04／共享 AI pattern（包括 SP-11）的内容、状态与视觉／无障碍证据跟随所选 M26 变化确认，不要求先完成全项目视觉审查才能做无 UI 的已批准内部工作。

新实际组合树需要适用 Backend／Emulator／Flutter／Android 证据及 JIN combined gate，LI 独立审查 JIN 的 gate；旧 #72／#73 只证明旧精确候选，不认证后来新增 AI。保留原六映射、未完成或明确替代范围、真实 Pass／Fail／Blocked／Not Run；不以文档通过、测试数量或六个 route 名字声明整个 S3 完成。S3 原目标／日期保留在 [#44](https://github.com/3427564237/enmori-app/issues/44)；本文件不延期、取消或虚构新的完成日期，未完成范围由 LI 明确协调。

代码上传、PR 合并、ordinary／demo 启用、限定增量验收、S3 范围验收、UAT 和 Release 是各自适用的授权／证据边界，不相互代替。没有 source 变化时不重复要求旧 Persona 验收；有新组合变化时也不能复用旧记录假称新证据已通过。本次仅发布本候选文档并请求审核，不修改既有 Issue／Project／PR 状态，不进行合并或部署。

## ZHOU 提交与外部依赖确认

本文件按用户后续授权作为送审材料发布，仍待 JIN 审查及 LI 明确选择。ZHOU 将 N01–N07 的具体合同及 F01–F03 的真实适配问题交 JIN 审查，供 LI 选定实施范围；E01–E04 同时列清后续选择，但可以只确认与当前切片有关的项目。N04 的 LI／DU 交接仍是外部依赖。本文件不分派其他成员的开发任务，也不把 #79 的待验收重新包装成开工申请。

| 待解决项 | 决议／交付责任 | 在此之前受影响的工作 |
| --- | --- | --- |
| N01 wire paths／DTO／error／输入限值／token 绑定是否接受；跨 refresh 的控制需求 | ZHOU 候选、JIN 审查、LI 确认 | 公开 Transport／OpenAPI／客户端协议。 |
| N02 新 schema、effects 留存目的、fence 异常最大留存、精确 index／清理入口与运维责任 | ZHOU 候选、JIN 审查、LI 确认 | 实际 Firestore／清理部署。 |
| N01／N05 永久 unknown 时如何结束尝试及后续允许行动；是否接受现限制或另选最小 receipt 合同 | ZHOU 补交具体恢复候选、JIN 审查、LI 明确限制／调整及适用范围 | 依赖该出口的恢复交互；不以页面离开或无限 Check result 代替决定。 |
| N02／N04 来源失效的全部依赖发现、离线补偿、任务中断续扫及内容／引用清理证明 | ZHOU 对齐 LI／DU 交接，JIN 审查，LI 确认具体查询／索引／必要进度记录及执行范围 | 对应真实来源失效清理；立即 fail closed 规则保持，不据此宣称物理清理完成。 |
| F01 提交时截止与取消保证，F02 网络交付定义 | ZHOU 提供真实适配证明、JIN 审查；必要条款解释／修改由 LI 留痕 | 受影响真实 write／delivery，不能以同步 fake 冒充完成。 |
| F03 一致开始视图及 N04 purpose／consent／source mapping／删除传播 | ZHOU 对齐 LI 与 DU，LI 确认范围 | 真实 Account／Check-in／Persona AI read。 |
| N05 时间值／退出／背景／未知恢复；N06 文案／Home／路由／适用设备证据 | ZHOU＋JIN，LI 内容与共享入口确认 | 对应 P04／M26 实现。 |
| N07 首个 isolated AI 端到端切片的精确边界、适用 NC 行及生产者替身／真实 adapter 区别 | ZHOU 候选、JIN 审查、LI 选择任务范围 | 只影响新候选 isolated 集成；不重开既有 C01–C07。 |
| E01 M27 生产内容／导航／落点或适用范围变化 | ZHOU 提交内容与原映射处置，JIN 审查，LI 确认；落入共享 Settings 时仍依 LI 交接 | 只影响对应安全 surface/content，不影响独立已批准 Conversation。 |
| E02 真实模型适配任务、具体 tag/digest/tokenizer、host/配置/访问/live执行范围 | ZHOU 提供实现和验证边界，JIN 审查，LI 确认并明确实际环境责任 | 真实 adapter 按所选任务实施；安装／live 运行须有相应环境授权，不阻止获批 fake 工作。 |
| E03 ordinary／controlled-demo／实际数据库、索引、运行和相关 Persona-to-AI 启用 | ZHOU 提交 AI 需要的范围，LI 确认目标环境及对应 owner 交接 | 所选普通／演示启用或部署；不等于必须使用真实用户数据。 |
| E04 后续解释路径的 producer、消费入口及 pre-acceptance fallback lifetime | ZHOU 对齐相关 producer，JIN 审查，LI 确认仅该路径的选择／解释 | 未选不开展该实现；不阻塞独立 Conversation，最终 Q31-E 义务仍保留。 |

确认后由有权人将**实际选中的行、源版本、解释／变更、保留条款及未选边界**写入 `docs/decisions/`，绑定所选环境、具体实施任务及 ZHOU→JIN→LI 路径；如修改原规则，保留旧源、新源和明确变更范围。新代码完成后再记录实际审查／验收，不能将“已批准开发”直接写成“已完成”。不得把本次用户的整理指令当作 PM 已接受上述候选；也不要求重复批准内部 C01–C07、Persona P08、旧准备或旧精确 gate。

本轮审查修订补齐同一用户消息的跨操作未决写入保护、准备阶段取消后的发送封锁、以及 Retry／回读的页面消息合并规则，并补入 NC05／NC11／NC12；这些文字修订不等于真实适配验证通过。后续优先解决 F01–F03，并在依赖恢复出口或来源清理的切片实施前解决上表对应待决事项，再按 LI 实际选定的范围审批和开发；本文件目前仍不是后续所有 AI 开发的最终实施合同。

待验收而非待开工审批的现有事项单独保留：#79 的 JIN 新代码正式审查与 LI 限定验收。当前已有的 Persona 功能／旧组合验收／owner report 无需重复送审。今后新 AI 的 NC01–NC12、所选模型／设备证据、实际组合 gate、适用合并及 LI S3 范围验收，属于对应开发后的交付工作；E01–E04 未选范围则继续如实标明 Pending，不默认为已取消。

本地文档核对仅覆盖来源、范围映射、链接及文字一致性；新 API／Firestore／producer／手机／模型验证尚未执行。文档送审不代表 GitHub Issue 完成、实现代码交付、产品发布、Sprint／UAT／Release／Done。
