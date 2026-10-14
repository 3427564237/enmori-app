# ZHOU R-A／reader 本地独立复核

日期：2026-10-13，SGT（UTC+08:00）。本节由独立本地审查代理核对 ZHOU R-A 差异；不是 JIN 正式 review、LI 验收或外部发布。当前用户要求仅本地继续开发、不上传。审查者没有修改 Dart、运行 Flutter、启动 Emulator 或改变外部状态；实现作者运行的结果不得记作审查者执行。

**R-A 当前结论：首轮发现已修复，修后所审范围无剩余必修项。** 下文保留初始缺口和准确旧 blob；修复源及作者运行证据见末节，不把旧缺陷改写成首次即通过。

## R-A：首轮静态审查

依据：[Remaining A 正式选择](../../decisions/2026-10-13-li-remaining-isolated-ai-contract-a.md)、[#93 集中包第5节／NC11–12](../../planning/2026-10-13-zhou-real-ai-remaining-contract-packet.md)、[ARCHITECTURE.md](../../../ARCHITECTURE.md)、仓库 [flutter-dart-code-review 技能](../../../.agents/skills/flutter-dart-code-review/SKILL.md)。技能是审查清单，不增加新架构、依赖、UI或权限要求。

所读本地分支为 `codex/zhou-ra-reader-local-20261013`。首轮审查内容用 Git blob 固定，**不是新 commit 或已发布 head**：

| 文件 | 首轮已读 blob |
| --- | --- |
| `lib/features/ai_conversation/ai_conversation_providers.dart` | `ab38d776f49f798080192c549f2080601eba8b86` |
| `lib/features/ai_conversation/presentation/ai_conversation_page.dart` | `e6c942c56347af87ed8ba69ee471f4b553dd5806` |
| `lib/features/ai_conversation/presentation/ai_conversation_state.dart` | `9856c3bf39b51333229f0cb0d6aef995bb79c3e2` |
| `test/features/ai_conversation/ai_conversation_page_test.dart` | `2ed5e2fc960ded6812f222ce697b0a584e7b107c` |
| `test/features/ai_conversation/ai_conversation_recovery_test.dart` | `22a995d5537c8bdb8e9e693d6d669f8bcbd4e972` |

### R-A-01：已知 tombstone 的保护在同 session 重入时不完整

**首轮结论：需修复。** 这是静态控制流确认的具体缺口，本审查没有执行 Flutter 复现，不写成已经运行的失败测试。

首轮源位置：controller `build()` 第77–85行清空 `_tombstones` 后只从 `_memory.operationAssistantId` 恢复；第257–264行新 dispatch 会重置当前 assistant 记忆；`_merge()` 第672–683、710–714行仅将当前明确配对助手的 unavailable 状态写入 session memory。普通 history 的未配对 tombstone 仅进入 controller 内的 `_tombstones`。

复现路径：

1. Send execute 返回 unknown，尚未通过 execute／readback 获得明确 U/A 配对；operationAssistantId 仍为空。
2. 普通 history 读取到不可用 A，页面已经知道不能再展示它的正文。
3. 用户 `Leave without retrying`，原 controller dispose；同 session 重新进入，build 丢掉此前只存 controller 的 tombstone ID。
4. 后续普通 history 返回该 A 的旧 available DTO；它会作为 available 合入并显示正文，违反 NC12 的不可复活保护。

另一条等价边界：原已配对 A0 变 tombstone；独立新 Send 返回 unknown 时当前 operationAssistantId 被重置；随后 leave＋recreate，也丢失 A0 的保护。首轮新增测试覆盖了“不 recreate 的旧 A0”和“当前明确配对 A 的 recreate”，尚未覆盖这两种缺口。

最小修复目标是让同 session 的必要 non-content tombstone 屏障跨页面处置保留，既不保存正文／draft／token／ticket key，也不把 history 邻接推定为永久 U/A 配对；新 session 仍清空该记忆。补充 history-only tombstone→实际重入→旧 available，以及旧 A0→新 unknown operation→重入两条回归，并保留合法 available／新 session 负控。审查不要求新持久 schema、磁盘缓存或真实 Backend 功能。

### 首轮其余已核对边界

- **目标 U 元数据：** `_memory.recordOperationUser` 保存原 U ID／sequence／persistedAt；readback 与 history 在合入前核对。已知 ID 配缺 sequence/time 不作为 wildcard；初次 Send 的未知 U 没有凭空发明身份。Retry 输入仍与当前可重读的原 U 文本精确一致，不持久保留文本用于匹配。
- **取消与迟到准备：** `_close` 先同步取消 dispatch 权，再 abort／cleanup；`_run` 在 token 与 prepare await 后核对原 attempt。迟到 ticket 只走 cleanup，最后 execute 前另有无 await 的原 attempt 检查。该差异未把原 Cancel ACK 当成 no-effect。
- **R-A 离开与迟到普通读：** `leave` 取消原 attempt、推进 command version、abort全部读，清显示／retryUser并保留 unresolved；旧读通过 epoch／command 检查不能回填。页面先清draft/unfocus再调用 controller.leave 和host callback；本次没有增加receipt、自动Check result或自动生成。
- **按钮／active确认：** 新退出入口在 unresolved、已知target/op、非generation、非deleting时显示，ordinary readBusy不会困住用户。准备／执行期间仍使用原 `Stay`／`Request cancel and leave` 确认。新控件沿现有48dp与可滚动布局；现有行为测试覆盖2倍文字／小屏，但本审查未执行或声称设备证据。
- **session与隐私：** session replacement重建Memory和page key；同UID新session仍不是原operation控制权。已读差异没有加入文本、prompt、token、key、source记录的session持久化或磁盘恢复。当前明确配对A的tombstone记忆有效，但不能覆盖 R-A-01 中未配对／旧operation A 的缺口。

本轮结论只涵盖上述本地 R-A 差异，不证明真实store、ACK-loss／fence事务、source reader／cleanup或普通运行启用。R-A-01 的后续修复、作者实际回归结果与审查复核须另追加精确source，不能将首轮缺口抹去或把本地审查称为正式JIN APPROVE。

## R-A：修复复核与最终本地结论

R-A-01 已由实现作者修复：tombstone 屏障移入唯一 `_Memory.tombstones`，仅存当前 session／Conversation 已知 unavailable assistant 的 opaque message IDs；不存消息正文、source ID、token、ticket key、prompt 或磁盘缓存。controller rebuild 不再清掉这些 IDs，同一 Conversation 的独立新 operation 不清除它们；真正的 Conversation ID 变化或新 observed Auth session 清除。explicit pair 仍只由 execute/readback建立，history-only ID 屏障不被当作 U/A 配对。

复核中还指出中间修复的角色变化边界：已知 tombstone ID 若在重入后以 `role:user`／available DTO 返回，不能绕过只针对 assistant 的转换。实现作者已将其改为先 `_invalidMerge()`，并加入对应负例；最后仅 assistant/unavailable 才进入 Set。此修正没有扩大持久字段或将错误历史配对。

最终只读核对的 source blobs：

| 文件 | 修后复核 blob |
| --- | --- |
| `lib/features/ai_conversation/ai_conversation_providers.dart` | `c1538f21a04b2ff2884df4a7a5f56d9ddaee5419` |
| `lib/features/ai_conversation/presentation/ai_conversation_page.dart` | `e6c942c56347af87ed8ba69ee471f4b553dd5806`，与首轮同源 |
| `lib/features/ai_conversation/presentation/ai_conversation_state.dart` | `9856c3bf39b51333229f0cb0d6aef995bb79c3e2`，与首轮同源 |
| `test/features/ai_conversation/ai_conversation_page_test.dart` | `aec4279cd7cb457e49b85f4884df77e6e4160a1c` |
| `test/features/ai_conversation/ai_conversation_recovery_test.dart` | `9582ae06ebaaa91644916def9e6aa50be3f53cd4` |

已读新增用例覆盖 history-only tombstone→leave/rebuild→旧available、旧paired A0→新unknown operation→rebuild、同ID非法user角色、same UID新AuthSession清记忆并允许后续独立操作；已有current paired A、原U ID/sequence/time、迟到read与实际route dispose/re-entry控制仍保留。静态检查确认修后 Set 进入 `_merge` 的不可复活分支；known U 的缺sequence/time不被当作通配条件。

**执行证据归属：** 实现作者先运行精准history-only tombstone回归，结果0 Pass／1 Fail；审查者只读确认 `D:/3851 AI/drafts/ra-history-tombstone-red.log`（SHA-256 `ab82e71d25e06c3655b741d5b506a9edd1b059ae44ac7c08ca57251789a48150`），没有独立重跑或将最终整个测试文件版本冒充该初始检查点。作者修后运行全 `ai_conversation` feature suite **141/141 Pass**，其中16项为本轮新增，包含旧 NC11／R1／R2 覆盖。审查者只读了本地原日志 `D:/3851 AI/drafts/ra-feature-suite.log` 的最终结果并计算 SHA-256 `743249c698973f2a26a4941076285c1ba2080bcd36b52ca32c761fcc308fa818`，没有执行这批测试。此计数不与旧suite或中间focused54相加；不是全App、设备、Emulator或真实wire/store清理运行结论。

修后本地 R-A 所审范围无剩余必修发现。正式JIN、LI验收以及Backend reader/producer前置仍分别遵守各自真实source与职责；本结论不授予上传、merge、任务关闭或普通/live启用。

## Backend reader：独立本地审查与修复复核

审查范围是 Remaining A 第4节的三份新增未接线 inner reader 源码；不是
真实数据库／SDK adapter 的审查或能力验收。root 早读及独立审查保留以下修复：

- ready 只能在 view close 成功后报告；close 异常不能留下成功 completion。
- terminal 同步清 reader-owned 内容、dependency、context、clock／guard，
  立即尽力关闭已开 content-free view；迟到 open 只关闭，不读内容，不把 close
  当 SDK settlement。authority await 后先检原 guard，才验证迟到 payload。
- request-only seen IDs 验证全部处理到的 raw rows／pages，含 excluded 和已取五条后的
  同页重复；不形成持久 registry。source version 晚于 fixed view 是矛盾，不能使用。
- **READER-01：** current generation4→3 且 consent rejected 时，中间实现先判
  rejected，误报 denied。正式 F03 要求回退为 unavailable，不能成为已确认撤权证据。
  root 的独立 synthetic probe 对修前已编译源复现 `denied`≠`unavailable`，
  后续修复把完整合法结构／owner检查后的 rollback 判定置于 consent 判定之前。
  永久回归同时确认随后重授不能重开该 reader；同一独立 probe 修后通过。

Backend 作者的初次29项 focused测试及root中间571项通过都是旧检查点，不能当作
READER-01 已覆盖。修后 root 重新 strict build／全 Backend **572/572 Pass**，
其中30项为本轮 reader 回归；独立 probe 不另加入 suite 计数。

最终独立只读审查核对的 Git blobs：

| 文件 | 最终复核 blob |
| --- | --- |
| `backend/src/ai-conversation/ports/real-context-reader.ts` | `a1fbfb63da3376837f90005780210965961be26c` |
| `backend/src/ai-conversation/application/real-context-reader.ts` | `1bcfdcca2c570a362f9263e14c2b18749e8ea1c9` |
| `backend/test/ai-conversation/real-context-reader.test.ts` | `d57ffea83a705504a6d7bb95c00909a5554266c3` |

独立审查者仅静态审查，没有执行 root 的测试。最终未发现本批 inner reader 的
未处理必修问题：原 acceptance／asOf与纳秒窗口、先授权、五条及跨页顺序、完整 Persona
集合、used删除、代际比较、全部 current sources及late-open/current处理均已复核。
60/5/45仍由原 runtime／AbortSignal管理。本地 Port测试不证明真实readTime、原 Auth、
全库存canonical时间、source永久身份保证或 dispatch／write／sink 原子边界；这些在
对应接入时仍须提供实际证据。完整 source／日志绑定见本批 local source manifest。
