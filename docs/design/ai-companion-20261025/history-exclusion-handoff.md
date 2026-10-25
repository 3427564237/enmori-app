# F1a 历史依赖冲突：明确排除后重新核对

2026-10-25 · Product / UX · Integration 技术合同补全的交互交接。
本页记录已批准行为如何恢复，不是新的 PM 决定；实现候选与尚未完成的验收另行注明。

## 批准来源与补全范围

[LI 首流决定](../../decisions/2026-10-25-li-ai-companion-first-flow.md)的 F1a
仅授权本次明确选择的本人签到，临时排除覆盖继承历史依赖，冲突时保留草稿并要求审阅。
该决定明确引用 Context `ce0a5ed5ba5ded1365faa816025f747a6729863e`。
该版本 `docs/evidence/ai-companion-20261025/context.md:649–668` 规定：
本次排除覆盖所有投影和继承依赖，未获当前精确来源许可的历史 pair 返回冲突且没有
model payload；选择 A 不授予 B，旧消息可读不等于允许下次重用。
`679–687` 同时保留已存消息及只读来源权限，与本次模型用途分开。

[交互规格](interaction-spec.md)第 6–9 项据此要求：明确排除完整 pair，重新 prepare，
再显式 Send。当前界面中输入的原文、选中的签到和 canonical 旧消息均不删除。

QA 对 Context `362d8cb` 的审查及 Context 自身确认发现，该 checkpoint 的 prepare/execute
只有来源 keys，尚无明确排除完整历史 pair 的入口。安全拒绝冲突是正确行为；
当时“用户明确排除以后能继续当前话题”的实现仍有缺口。旧来源已超过 7 天时，不能靠
重新选择该来源来绕过缺口，也不能因此扩大签到窗口。

Integration 聊天 `01a1719f-a6aa-75e0-9ad4-f3724777fa95` 收口为：prepare
返回最多两组 server `historyPairs` keys，execute 带 `excludedHistoryKeys`，
复用已有 `selectionRevision`。服务器只返回 owner-visible pair IDs/sequence，
不返回 source IDs、正文或私有 provenance。Root 负责规范 API，Context 负责实现。
这些字段名记录的是 Integration 当前技术方向；精确 DTO 以其规范提交为准。

此前 Product 提过关联冲突组的审阅标识语义；Integration 也考虑过
`historyMode: latest_pairs | omit_all`。后一个仅是候选，已被上述有限 pair-key
方案替换，不作为当前合同，也不记录为 PM 批准。旧的来源 key 合同继续保留，
补全仅增加本次完整历史排除能力。

## 界面动作与文案

冲突说明：

> 部分旧问答使用了本次未选择或已排除的签到。请核对本次会参考的旧问答。
>
> Some past exchanges use Check-ins that are not selected for this reply.
> Review the past exchanges included in this request.

只有后端明确识别为这类历史依赖冲突时才使用这段原因文案；其他未知、失效或
权限失败继续显示各自状态。不能凭通用 409 猜测被排除的具体来源。
若现有错误只确认 selection conflict，使用“本次参考范围需要重新核对。你的草稿
与选择已保留。 / Review the references for this reply. Your draft and choices
are kept.”，再展示新 prepare 实际返回的有限集合；不为文案推断额外原因或要求
另加错误字段。

列表标题用“本次会参考的旧问答（最多 2 组） / Past exchanges for this reply
(up to 2)”。列出当前有限历史中实际待排除的完整问答，以可识别的顺序/消息序号
定位；内部 key 不作为可读标题。没有证明哪组造成冲突时，不声称“仅相关问答”。
若现有受权 transcript 可定位，可以查看对应位置；不要为识别标签额外抓取无权限的
旧正文或私有 provenance。

主按钮：**本次不参考以下旧问答，并重新核对** /
**Exclude these past exchanges and review again**。

辅助说明：**仅影响这次回复，保存的问答和当前草稿会保留。** /
**This applies only to this reply. Your saved exchanges and draft are kept.**

这是一键排除已展示的最多两组完整问答，不是通用历史选择器。用户也可以返回编辑
当前选择。返回本身不清空原选择或草稿，不发送请求。

1. 用户明确选择排除展示的集合，保留当前话题、草稿和签到选择。
2. 重新 prepare，获取新的 revision、expiry、当前来源卡及有限 history pairs。
3. 按新准备结果核对完整 pair 身份及范围，再显示“本次已排除以下旧问答 / These
   past exchanges are excluded from this reply”，让用户确认当前审阅结果。旧 keys
   不复用；当前 keys 只能对应这次展示并确认的 pair 身份。先前看到的集合发生变化时，
   要求再次审阅；不能把旧的排除意图自动套到新出现的两组。
4. 用户返回原草稿，明确 Send。最终 execute 使用当前 revision 和该 revision
   允许的来源/历史 keys；重新核对或返回草稿都不是 Send。

排除只作用于服务器先确定的有限历史，不向前补入更早问答。整个 user/assistant
pair 一起排除，不能只剥离来源 metadata 后继续旧 assistant 正文。若剩余历史仍有
未获许可的依赖，仍然冲突；不能为得到成功而静默清洗或当作空历史。

本次用户自己输入的文字继续保留。以上不授予新签到、超期签到、云端用途或后续
自动重用，不改变 Persona 的既有规则，也不把 standalone proactive 消息当作普通
user/assistant pair。后端无法核实当前集合时维持 unknown/conflict。

execute 的结果未知仍使用原 operation 只读恢复；不能将这条已确认依赖冲突的
重新准备路径用于绕过未知 Send、替换 idempotency 身份或自动再发。
prepare 过期时保留草稿和选择，回到重新核对；不自动刷新 revision 并沿用过期确认。

## 需要的闭环证据

| 反例 | 应观察的结果 |
| --- | --- |
| 已选 A，旧问答依赖未选 B | 冲突；明确排除完整旧问答后新 prepare/review/Send，只使用当前许可集合。 |
| 旧依赖超过 7 天 | 不扩大窗口或重新附加旧签到；明确排除对应展示集合后可继续同一话题。 |
| 用户排除某签到，旧 assistant 仍依赖它 | 不剥离 provenance 后复用正文；完整 pair 排除或继续冲突。 |
| 新 prepare 的 pair 集合变化 | 显示当前集合并再次审阅，不将旧排除确认套用到新组，不 backfill。 |
| 重新核对失败或用户返回编辑 | 原话题、草稿、签到选择保留；无隐式发送，无空成功。 |
| execute 未知 | 保留原 operation，不能进入可重复提交的冲突恢复路径。 |

Context 随后交付实现候选 `26dd48cae40a20a571d73731ea696fde1854259f`，
报告严格编译及 487/487 fake 检查通过。Product 只核对了该提交的准备/执行字段、
key 校验和 selector 签名，确认有 `historyPairs`、`historyKey`、可选
`excludedHistoryKeys`（默认空），且旧/跨 prepare key 在执行前被拒绝；未把此项
有限接口检查称为独立 Backend 验收，也未运行其测试。Root 的 HTTP/composition、
App 的重新核对及显式 Send、独立 QA 和真实环境证据仍各自需要交付。

上述作者报告不抹去 `362d8cb` 的缺口历史。原型中的合成冲突演示只说明交互意图，
不能作为后端依赖闭包或端到端恢复的证明。
