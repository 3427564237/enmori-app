# 已批准首流：F0 最小 App 交接

2026-10-25 · Product / UX · 设计交接，非 native / 服务验收。

## 权威与范围

依据 [LI 首流决定](../../decisions/2026-10-25-li-ai-companion-first-flow.md)，共同基线
`26af8c95da4fa00b76f841952d742d9da8c07e5c`。Product 已独立核对 Integration 中的原始人类答复
`01a171cc-8f2f-78d2-a909-d1472f097376`：“按推荐范围实现（推荐）”。
该决定批准 F0 明确的一次本地跟进、F1a 手选本人签到和 D1 Android 推送实现候选；部署、真实注册/发送及手机写入未包含。
本页先交付 F0；具体 wire schema、稳定错误码、组合和路由由 Integration 统一，以下状态名是 UI 名称。
[Context 合同](../../evidence/ai-companion-20261025/context.md)及
[Proactive 合同](../../evidence/ai-companion-20261025/proactive.md)的历史 Proposed 标记按上述决定限定采用。

## 最小用户路径

1. **已保存的用户消息 → 稍后跟进。** 入口附在当前可读、本人所属、仍有效话题中的真实 user 消息上。
   不从未发送草稿、assistant 建议或模型编造的 ID 创建预约。读取/归属无法确认时停在核对状态，保留正在编辑的草稿。
2. **审阅 → 确认时间与时区。** 显示原要求、来源发生时间、一次性范围，以及明确的日期、当地时间和 IANA 时区。
   用户逐项确认未来时间及所在时区；不从一句“明天下午”静默推断时间。
   落入安静时段时展示可选择的允许时间，再让用户确认；不自动改期。
   设备时区变化时提供“保留此时区 / 使用当前时区”，未解决前暂停提交。
   已确认 dueAt 为绝对时刻，改时区不暗中移动它；修改到期时间需要再次确认。
3. **明确开启 → 创建一次预约。** 初始总开关 off、无类别及推送登记。
   显示“开启明确跟进并预约”的两个顺序步骤：先确认设置，再以返回的新 revision 创建预约。
   设置失败不创建；设置成功而预约未知必须分别显示。已有 on 设置可直接进入预约确认。
   首流仅 `explicit_follow_up`、本地模型；滚动 24h 最多 1 次、冷却 8h、最多 3 个有效预约；默认安静时段 22:00–08:00。
   开启本流不等于同意系统推送。模型不会在创建预约时立即生成内容。
4. **确认已预约 → 可查、暂停或取消。** 仅在明确 receipt 后显示时间及状态。超过话题/来源有效期不能预约；单次有效期不超过 dueAt + 2h。
   创建/取消结果未知时保留原 command/key 与界面输入，GET 原 intent 核对，不自动重试、不换新 key 再创建。
   关闭取消尚未开始的工作；再次开启不复活它。暂停可到明确时间或无限期；恢复时重新核对仍有效的项，不补发过期积压。
5. **真实主动消息 → 原因/来源 → 回复。** 使用同一话题内真正保存的 assistant proactive 消息，无伪造 user turn。
   卡片显示“你约好的跟进”及发生时间；未读以点标识，不能根据局部页编造总数。
   原因和最小来源卡是可信 sidecar，生成正文继续纯文本显示；来源存在不证明模型每句话都准确。
   来源点击走受权 resolver；通知定位走受权 message anchor，再取原 transcript 页并核对精确 ID/sequence。
   若无法定位，显示不可用/核对失败，不跳到最新消息充数。消息真正可见后才提交 read watermark；未知已读状态不显示“已同步”。
   回复先进入带原话题/原消息提示的草稿，用户明确 Send 才发送；切换其他话题仍遵守单草稿确认和未知操作保护。

## 状态及中英文文案

| UI 状态 | 中文 | English | 动作与保留 |
| --- | --- | --- | --- |
| off | 明确跟进已关闭 | Requested follow-ups are off | “开启并继续 / Turn on and continue”；不默认为推送同意 |
| paused | 已暂停至 {时间与时区} / 已暂停，直到你恢复 | Paused until {time and zone} / Paused until you resume | 审阅后恢复；到期旧项不补发 |
| confirming | 在 {日期、时间、IANA} 跟进一次 | Follow up once at {date, time, IANA zone} | 显式确认；保留原消息引用及当前草稿 |
| settings unknown | 设置结果尚未确认。先核对，再预约。 | Settings are not confirmed. Check them before scheduling. | 核对设置；不能推进 create |
| creating | 正在确认预约… | Confirming your follow-up… | 禁用重复提交和改变该 command |
| create unknown | 预约结果尚未确认，可能已保存。 | Your follow-up may have been saved. Its status is not confirmed. | “核对这次预约 / Check this follow-up”；无“再次预约” |
| scheduled | 已预约一次：{时间与时区} | Scheduled once for {time and zone} | 显示真实 receipt；可取消 |
| stale settings | 联系设置已变化，请重新核对。 | Contact settings changed. Review them again. | 读当前 revision；不直接覆盖别端设置 |
| at limit | 你已有 3 个有效预约。请先查看或取消一个。 | You have 3 active follow-ups. Review or cancel one first. | 不自动删除最旧项 |
| provider disabled | 系统推送当前不可用。请在 App 内查看消息。 | Push notifications are currently unavailable. Check messages in the app. | 分开显示联系设置、登记和系统权限；不声称未保存或已送达 |
| cancel unknown | 取消结果尚未确认。正在核对原预约。 | Cancellation is not confirmed. Check the original follow-up. | 不隐藏为“已取消” |
| dispatch may have begun | 这次通知可能已提交，无法保证撤回。 | This notification may already have been submitted. Recall cannot be guaranteed. | 保留准确状态；不删除会话或宣称已追回 |
| expired | 这次跟进已过期，不会补发。 | This follow-up expired and will not be sent later. | 返回当前入口；新预约必须是新的显式动作 |
| source unavailable | 这条来源已不可用。草稿仍保留。 | This source is unavailable. Your draft is kept. | 不显示旧正文、不复活过期话题 |
| verification unknown | 暂时无法核对来源，请稍后重试核对。 | The source could not be verified. Try checking it again. | 保留未知；无可发送的旧内容 |
| read pending/unknown | 已打开，阅读状态尚未同步。 | Opened. Read status has not synced yet. | 实际可见后核对 read-state；点击不等于已读 |
| reply | 回复这次跟进 · {原话题} | Reply to this follow-up · {original topic} | 保留输入，显式 Send；不把 proactive 伪装成普通历史 pair |

`provider disabled` 文案只对应已知关闭/不可用；provider/注册读取失败用“暂时无法核对推送状态 / Push status could not be checked”。
FCM accepted 只能表示服务商接受，不表示送达或阅读；App 页面不将它展示为“已收到”。
源消息/话题不可用时，上述一般提示不能带回其旧正文、标题或已删除 ID。

## App 需要的最小接口连接

- Context / Integration：当前已保存 user 消息身份；设置与 intent 的真实 revision/status；最小可信来源卡；typed resolver 与 message anchor；兼容旧请求的 `replyToMessageId`。
- Proactive / Integration：off/paused/quiet/zone/cap/expiry 的明确 eligibility；创建/取消未知 readback；推送登记可用性与平台权限分别显示。
- App：使用返回的 locator/sequence；anchor 的 `pageBefore` 交给现有 transcript **`?before=`**，在返回页找到精确目标再滚动。禁止自造 ID、anchor、路径或历史语句。
- 阅读：只对当前受权且实际显示的 committed sequence 提交 watermark；不因卡片出现、通知收取或点击而确认已读。
- 草稿：预约/核对/返回不发送聊天草稿。已 admitted Send 继续沿用现有 outgoing 保留及未知结果恢复，不把已发送原文重新变成可重发草稿。

主动 append 与阅读均不推进旧话题 90 天锚点，不复活已过期内容。正常真实 user 消息/接受的回复继续适用现行 Q14。
D1 只实现已批准候选，默认不初始化/登记推送；实际注册上传、发送、部署及设备检查仍需要其具体授权窗口。

## 后续补齐

同一现有原型将补齐 F1a：本人近 7 天最多 5 条签到 → 审阅 Note 引文、记录时 Mood/Activity 与发生时间 → 排除 → 本次本地 Send。
来源变化、依赖冲突及未知状态保留草稿并重新审阅，不静默略过。活动、位置、自动签到跟进、云端个人回复均不进入本轮。
