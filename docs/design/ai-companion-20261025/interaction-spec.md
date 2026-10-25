# 已批准首流：交互状态与模块交接

2026-10-25 · Product / UX · C / F0 / F1a / D1 的设计规格，不定义生产 DTO、存储或路由。

本页在 `26af8c95da4fa00b76f841952d742d9da8c07e5c` 的[首流决定](../../decisions/2026-10-25-li-ai-companion-first-flow.md)下更新。
之前的选择前版本保留在 `2e2e2fb9dbfdfd56bdf15322f685dca515f3cf30`；[A/B/C 对照](product-choices.md)仍是历史材料。
C 的入口决定及 F0/F1a 的后续批准各自限定其范围，旧来源未因较晚日期而全部失效。

## C 入口、草稿与历史

连续主入口保留现有 Conversation、History、会话内查找、新话题和整段删除。
搜索仅针对当前会话已加载且当前可用的消息；早页读取失败保留查询、现有结果和游标，不显示为空成功。
未确认当前身份/同意/历史时显示核对状态，不假装首次空账号；不自动冷启动到第一段历史或引入跨会话全文索引。

保持单份当前未发送草稿。切换另一会话，包括通知/主动回复，先让用户保留编辑或放弃；同话题查看来源再返回不清空草稿。
新话题沿用现有新会话边界，保留待编辑草稿，但不自动继承旧来源选择。非 streaming、2400 Unicode scalar 上限及未知操作保护继续生效。
已 admitted Send 可以清空 composer；原文在现有 outgoing/未知恢复中保留，不要求重新放进可重发草稿。
原型为检查方便把待发文字放在只读输入框，不把这种摆放升级成 App 合同。

## F0 明确的一次跟进

可立即消费的用户路径、状态、双语文案、时间字段和接口需要见 [F0 最小交接](first-flow-handoff.md)。
起点是已保存、当前受权的本人 user 消息；新建草稿和 assistant 建议不能充当原要求。
界面明确日期、当地时间、IANA、可信解析的 UTC offset/instant；最终确认后按设置保存→创建 intent 的顺序显示各自结果。
未知只读回原操作；不换 key 重试。仅 local / explicit_follow_up；默认 off，滚动 24h 1 次、冷却 480 分钟、最多 3 个有效预约。
默认 quiet 22:00–08:00，可依已批准合同调整/关闭；时区不明、DST 缺口或重复时刻未选定则 hold。

当前实现可用的时间能力必须明确表达。没有跨 IANA 解析能力时不能用设备 `DateTime.local` 猜 UTC。
重复时刻由可信 TimePort 返回候选，用户明确选定；不存在的当地时间要求另选。修改时间/时区清除旧解析和确认。
Product 原型仅固定 Asia/Singapore 合成时间验证，不是该 TimePort 的实现或验收。

真实主动消息是原话题中的 standalone assistant `origin:proactive`，不能伪造 user turn 或普通历史 pair。
它不推进旧话题 90 天锚点；阅读也不推进。已过期话题不复活，旧 source/receipt 不保留副本。

## F1a 本人签到：选择 → 审阅 → 排除 → 显式发送

1. 从输入框“本次参考 / References”进入“手选自己的签到 / Choose your Check-ins”。可从本人签到详情明确选择该条进入审阅。
2. 仅展示当前本人受权记录；本轮允许近 7 天（含边界）最多 5 条。按发生时间新到旧、ID tie-break；不是无限历史选择器。
3. 默认无选择。允许内容仅为当前 Note 引文、归一化的已存 Mood/Activity 标签、原始发生时间。
   标签注明“记录时 / Recorded”，不能改写成现在的情绪或活动。无 Weather、locationLabel、坐标、Event 或其他人的记录。
4. 选择后先审阅本次列表与范围，再明确 Send。UI 的当前选择仅指定本次精确来源集合，不授予全部签到、未来重用、主动跟进或云端用途。
5. 附加新来源需新 prepare；使用后端返回的 request-local selectionKey/revision，不将 saved cardRef 或任意 ID 当作 selectionKey。
   原文输入、source reading 和 final execute 的权限分别重核，不能因 UI 可读而省略模型用途检查。
6. 本次排除包括同一来源的所有投影及其完整历史依赖。不得从旧 assistant 正文重新引入被排除记录，或用选中 A 的许可带入 B。
   原记录、旧消息和用户自己输入的文字仍保留；不是永久遗忘、删除或全局撤回。
7. `invalid_selection` / `AI_CONTEXT_SELECTION_CONFLICT` 时没有可用 modelContext。保留草稿和选择，显示关联完整问答需要审阅；用户明确排除关联 pair，再重新 prepare。
   不静默删除来源/剥离 provenance 后继续旧正文，不在“核对”动作中自动发送。
8. 来源变动需重新 prepare 并审阅当前版本；删除/拒绝显示不可用；verification failure 保留未知，不显示旧正文。
   任何选中来源无法核实时阻止 Send，直到重新核对或用户明确排除并解决依赖。
9. 成功接受后清空本次选择；失败/未知保留并受原操作恢复保护。下一次回复不因旧消息可读而自动重用其签到。

Integration 后续收口的有限历史排除接口及准确文案见
[历史依赖冲突交接](history-exclusion-handoff.md)。该补全保留上述批准行为与旧接口缺口，
使用最多两组 server pair keys 和已有 selection revision；不是新的 PM 决定或实现通过记录。

## 查看旧来源与选择新来源分开

已保存消息的“查看这条消息的来源 / View sources for this message”是只读 sidecar。
`cardRef` 由服务器签发并限定于受权消息；点击调用 saved-message resolver，返回 typed target。
其返回值可以是 Check-in detail ID 或真实 message anchor；不接受模型提供的路径、URL 或有权限效力的 ID。

当前草稿的“本次参考”是准备本次请求的选择。临时排除不改变已保存消息的来源卡或永久隐藏历史。
保存后的 cardRef 不能直接变成下一次 execute key；读取旧来源不会默认选中它。
私有 provenance、Persona ID、账户标识和删除后的 source ID 不泄露到 UI。最小来源卡不构成句子级事实验证；正文继续纯文本。

## 核心状态与双语文案

| 状态 | 中文 | English | 可执行动作 |
| --- | --- | --- | --- |
| 未选择签到 | 未选择签到。不会自动读取其他签到。 | No Check-ins selected. Other Check-ins will not be read automatically. | 选择，或保持现有无新增签到请求 |
| 达到数量上限 | 已选 5 条。取消一条选择后可再选。 | 5 selected. Remove one before choosing another. | 禁用第 6 条；取消选择不删除记录 |
| 超过时间范围 | 超出 7 天范围，不能用于本次回复。 | Outside the 7-day window; unavailable for this reply. | 不提供绕过日期门槛的附加动作 |
| 待审阅 | 请核对本次选择，再返回草稿发送。 | Review this selection, then return to your draft to send. | 明确审阅；无隐式 Send |
| 来源已更新 | 来源已更新，请审阅当前版本。草稿仍保留。 | The source changed. Review its current version. Your draft is kept. | 重新 prepare；不能只勾选旧 key |
| 来源不可用 | 这条来源已不可用。 | This source is unavailable. | 不回显旧内容；审阅并明确排除 |
| 来源核对未知 | 暂时无法核对来源。 | The source could not be verified. | 重核或明确排除；不显示空成功 |
| 历史依赖冲突 | 先审阅关联历史，再重新核对。 | Review dependent history, then check the selection again. | 明确排除关联完整 pair，再 prepare |
| 处理中 | 正在准备回复，重复发送已停用。 | Preparing a reply. Duplicate sending is disabled. | 取消等待仍可能结果未知 |
| 结果未知 | 可能已经保存。请核对原操作。 | It may already have been saved. Check the original operation. | 不重复发送、不换话题绕过 |
| 本地未完成、明确 no-effect | 本地服务未完成，草稿保留。 | The local service did not complete the request. Your draft is kept. | 确认 no-effect 后才显式再试；无云端回退 |

## 通知、定位和阅读

D1 是 Android 实现候选，默认不初始化/登记；App 内选择与系统权限、设备登记、服务商可用性分别显示。
明确 off/disabled 与 unknown 分开，不能把 provider 失败当作空状态。锁屏只有通用消息或 hidden，不携带私密生成正文。
FCM accepted 不等于 delivered/read；普通关闭、后台、系统终止、强制停止、撤回权限分别需要设备证据。

通知点击先校验当前账号/归属/版本和有效性，取得可信 anchor。将其 `pageBefore` 传给现有 transcript `?before=`，在页内找到精确 ID/sequence 再滚动/highlight。
找不到时停在不可用/核对失败，不跳最新消息冒充目标。未读用点，不从局部列表拼总数。
消息实际可见后才提交 read watermark；原型使用可见性观察后显示 pending，再由明确“模拟同步”按钮确认，点击本身不确认已读。
read-state 的 stale/unknown 需 GET 核对，不声称跨端已同步。读回后回复仍由真实 user Send 显式建立关联。

## 模块边界与验收

- Context / Integration 提供规范 selection、source resolver、anchor、read-state 及兼容旧请求的扩展；Product 不定义 DTO 或后端 schema。
- Runtime 返回本地可用/确定失败/结果未知；本轮个人 F0/F1a 没有云端选择。独立合成云端研究不是个人数据许可。
- Proactive / Integration 负责 intent、effect/outbox、频率/quiet/TTL、去重和投递 readback；UI 不推断触发权。
- App 复用现有主题和路由，通过受信类型连接；单草稿、历史搜索、未知恢复均保留。
- 本交付只有设计与本机 HTML 浏览器证据。真实服务、模型质量/成本、Android build、安装、原生字号/TalkBack、后台通知、UAT、Release 和 Done 均另记。
