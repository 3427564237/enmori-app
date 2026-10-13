# ZHOU AI reader 生产者前置事实本地复核

日期：2026-10-13，SGT（UTC+08:00）。记录人：ZHOU 本地工作代理。

本记录是对已发布决定、review 和固定源码的**只读核对**，不是 JIN 正式审查、LI 新批准或新的 producer 保证。当前用户要求继续 ZHOU 工作、仅在本地开发、不上传；本记录未对外发布，没有 GitHub 写入、提交、push、测试或 Emulator 执行。下述测试数量均保留原执行者归属，不记为本次重跑。

**当前结论：N02／F03／R-A／C-A 已获 Remaining A 选择；#95 的 DU 独立 review 也已经通过。** 不能再列为等待这些合同审批或等待 DU review。真实 Note reader 仍须补齐两类具体源证据：全部适用记录的 canonical 毫秒 UTC 查询前提，以及物理删除／恢复／维护路径下的 source 身份不复用。只限制依赖这些保证的真实接入；R-A、reader Port、已选政策及独立准备继续。

## 1. 决定和审查的精确来源

| 来源 | 已核对的身份与结论 | 使用边界 |
| --- | --- | --- |
| [#93 JIN APPROVE 5500140319](https://github.com/3427564237/enmori-app/pull/93#pullrequestreview-5500140319) | head `110eda443fbe101608c6aa6df551e52b6a18da5a`；tree `9b7ac0fde80c676af88ed0b5f888b9a7c4a39383`；2026-10-13 15:27:02 SGT。审查集中合同候选和两项未接线政策。JIN 独立 strict build／Backend 542/542、额外 reviewer probes 4/4，288 是边界输入数，不另计测试。 | 技术审查不代替人类选择；不证明 SDK 并发、ACK-loss 或完整清理。review 当时的“剩余合同未选”已由下面的正式决定在其范围内替代，原 review 不重写。 |
| [#93 LI APPROVE 5500286435](https://github.com/3427564237/enmori-app/pull/93#pullrequestreview-5500286435) | 同 head／tree；2026-10-13 15:41:49 SGT。LI 独立编译和 Backend 542/542，接受未接线政策组件及集中包的限定交付。 | 不把政策通过当作真实 reader／store／cleanup 证据；不重开 #88／#92 旧审查。 |
| [S-PM-1013-LI-REMAINING-AI-A](https://github.com/3427564237/enmori-app/blob/72c027933d4b3ac1a95e25dc733619a6c63522b6/docs/decisions/2026-10-13-li-remaining-isolated-ai-contract-a.md) | 本次读取 ref `72c027933d4b3ac1a95e25dc733619a6c63522b6`；Git blob `965457097426d044f930cacfed8b8a2e36038cb0`。人类 LI 明确选择 A；不是从此前 F01 委托推定。控制 #93 `110eda4` 的集中包第3–6节，包 blob `019cf329753ee18f02724ecb29c0cf61359a277d`。 | 选定首个 isolated synthetic Auth／Firestore／fake-Qwen Note-only 合同及分批实施；不选择未列物理库存，不放行普通／demo／cloud／live 模型或部署。 |
| [#95 DU APPROVE 5501062286](https://github.com/3427564237/enmori-app/pull/95#pullrequestreview-5501062286) | head `72c027933d4b3ac1a95e25dc733619a6c63522b6`；2026-10-13 16:51:48 SGT。无阻断 LI 新增 Account purpose／revocation producer 的问题。 | **DU review 已到达。** 它不实现 reader/runtime；调用方仍须确保所传 Firestore gateway 实际绑定受控 Emulator。review 中的 DU Note/time/source 说明是既有事实，不是新的源资格验证。 |
| [#44 LI 交付说明](https://github.com/3427564237/enmori-app/issues/44#issuecomment-6141090922) | 给出 #95 owner-delivered 源、writer inventory 和 reader 交接，区分 History 共享路径。 | 评论中较早的“DU review 仍待”已被上行实际 APPROVE 更新；不继续引用为当前阻塞。LI／DU 的各自交接职责保持，History 不成为 R-A 的统一前置。 |

Remaining A 已选择的具体范围包括：N02 第3.1–3.5节全部库存、完整精度 resolver、事务／claim／restart、`maxAttempts:1`、查询／index 声明与保留；F03 第4.2–4.6节 purpose／fixed start view／producer 行及非空 provenance 代际；R-A 第5节无 receipt 恢复和退出；C-A 第6.1–6.3节完整扫除及进度屏障。LI 是 unresolved controls 与单 cleanup 入口的 accountable operator；15分钟告警／24小时响应为已选运维目标，不是自动 TTL 或已解决证明，source 小时频率不新增删除 SLA。原 Conversation expiry+24h 仍是完成截止，不能重置。

## 2. LI Account producer：已交付事实和全部观察到的 writer

固定资料为 [#95 writer inventory／实际证据](https://github.com/3427564237/enmori-app/blob/72c027933d4b3ac1a95e25dc733619a6c63522b6/docs/evidence/sprint3/2026-10-13-li-isolated-ai-account-producer.md)，Git blob `f06ab031178325c3adc4dff7adecfc5fe2f24c25`，以及[源码 manifest](https://github.com/3427564237/enmori-app/blob/72c027933d4b3ac1a95e25dc733619a6c63522b6/docs/evidence/sprint3/2026-10-13-li-isolated-ai-account-producer-source.json)。实际执行源为 `c866eae8e266fcecb3ff035102d188a6c0a6c912`，基于 accepted #93 `110eda4`；最终 `72c0279` 补选定 Account 字段的无索引声明，七份 executable/test/launcher 输入保持相同。

| 观察到的 writer／路径 | 本次来源给出的保证 | 接入责任与限制 |
| --- | --- | --- |
| `FirestoreOnboardingRepository.complete` | fresh absent Account 在原 Account／binding／reservation／idempotency 同一事务建立 generation0；原 UID binding 冲突或 bound Account 缺失安全失败；replay 不重写或归零。 | 仅显式 isolated mode 初始化；无读时补零或 ordinary migration。 |
| `FirestoreAccountPreferencesRepository.saveSettings` | selected mode 读现有代际；仅 accepted→rejected 与 consent／settingsRevision 同事务递增。regrant、重复 accepted、仅 visibility 改动保留代际；stale revision 无写入。 | missing／坏／负数／fractional／overflow unavailable；overflow withdrawal 不写。plain legacy writer 碰到 opted-in Account 不能改变 consent 绕过代际。 |
| `FirestoreAccountPreferencesRepository.saveProfile` | 原 spread replacement 保留 generation／Settings／consent／其他字段；selected mode 写前验证 generation。 | Profile 不成为重置或撤权历史丢失入口。 |
| Interest／Persona／Friend／History／Event repositories | 提交源的 scan 发现它们读 Account parent，写各自 feature 路径，不替换 Account consent/generation。 | 这是所审源的 writer inventory，不是对任意特权外部写入的保证。generic gateway 是基础设施，不另称产品 writer。 |
| `controlled-runtime.ts` | 普通 runtime 仍构造 ordinary repositories，未隐藏 opt-in 或初始化代际。 | 后续 isolated composition 必须向两个 Account constructor 传经过验证的环境，并证明实际 gateway／Firestore client 绑定同一受控 Emulator；环境参数检查本身不足以证明连接目标。 |
| Synthetic setup／maintenance | 聚焦测试通过 selected onboarding 创建，使用后只删自己的四条记录。fresh AI fixture 显式初始化0；不能由 reader 修 legacy missing。 | 未授权 Account restore／replacement／delete、普通迁移或无界维护。未来 parent writer 必须保留代际或做选定原子撤权；未审 maintenance／复用 Account 不是支持的保证。 |

P-LI-1 复用 trusted verifier→UID binding→completed Account；client owner 不授访问权。P-LI-2 的 `checkin_conversation` 是 Remaining A 明确选择的用途，独立于 visibility；不把既有 consent copy 推广为 ordinary-user AI 启用。P-LI-4 要求 reader／effect transaction 读取**同一 authority documents**进入共同冲突边界；顺序 HTTP 检查不是原子授权。

LI owner 原执行记录是 strict build／Backend **550/550**（含8新增单测）、真实受控 Auth/Firestore Emulator **3/3**；涵盖创建、同 revision 并发撤权、重授／Profile／stale／replay。自己的1个 Auth identity／4条 records 删除及 absence、SDK／profiles／8080/9099/4400/4500 清理记录保持为 owner 证据。此前549是旧检查点，不记作最终。DU review 已接受这一新增 producer 范围；本次没有重跑它们。

Account `purposeRevocationGeneration` 无索引是版本化声明，**不是部署或实际 index enforcement 证据**。证据文档成稿时的“awaiting DU independent review”保留为历史状态，不能覆盖较晚的 5501062286 APPROVE。实际 AI reader/store、model、runtime fence、cleanup、新 index 部署仍不在 #95 交付内。

## 3. DU Note producer：源绑定事实

DU 在 #95 review 绑定的功能源是 #89 `9e2a0572ff0e760c958635cd8d1c1f6253581a91`。#89 后续 head `6ef6978c4dcdba79b66c781ba99d851aa4e26955` 的 [LI refresh APPROVE 5498833589](https://github.com/3427564237/enmori-app/pull/89#pullrequestreview-5498833589) 确认16个变更文件只各删一个尾部换行、无 executable token 差异；原功能执行证据仍归 9e2a057，不改记为后源执行。本记录下面直接读 DU 指定的 9e2a057。

| 事实 | 精确源及本次核对结果 | 不能从中推出 |
| --- | --- | --- |
| Note 内容 | [`domain/note.ts`](https://github.com/3427564237/enmori-app/blob/9e2a0572ff0e760c958635cd8d1c1f6253581a91/backend/src/check-ins/domain/note.ts)，blob `96620dee4cd12a7e265288ba1e5258e386bfcf1b`：去外侧 Unicode White_Space 后以 grapheme 计1–500。 | reader 不应重新 trim/truncate 改写已存 Note；旧 owner API 可读不授模型用途。 |
| 正常创建时间 | [`CreateCheckIn`](https://github.com/3427564237/enmori-app/blob/9e2a0572ff0e760c958635cd8d1c1f6253581a91/backend/src/check-ins/application/create-check-in.ts)，blob `1eda67886d10965fcdbbe159556f8094e77375b0`；[`authoritative-values.ts`](https://github.com/3427564237/enmori-app/blob/9e2a0572ff0e760c958635cd8d1c1f6253581a91/backend/src/shared/application/authoritative-values.ts)，blob `2a5943265a0ce6966c9841a019ba9f6946d7e3de`：Clock→Date.toISOString()，新建路径产生 canonical 毫秒 UTC string。 | 不是 Firestore physical commit timestamp；只证明正常 Application 创建路径，不证明所有历史／维护 fixture 格式。 |
| 当前允许的应用操作 | [`CheckInRepository`](https://github.com/3427564237/enmori-app/blob/9e2a0572ff0e760c958635cd8d1c1f6253581a91/backend/src/check-ins/ports/check-in-repository.ts)，blob `1ed0ad02e608b3fd22878cdbf02c13531334feda`：create／findOwned；DU 明确现 API 无应用编辑或删除。 | “没有应用删除接口”不证明物理维护不删，也不保证恢复／外部改写不存在。 |
| ID／当前覆盖保护 | [`CryptoOpaqueIdGenerator`](https://github.com/3427564237/enmori-app/blob/9e2a0572ff0e760c958635cd8d1c1f6253581a91/backend/src/shared/infrastructure/crypto-opaque-id-generator.ts)，blob `5e5bcdeb3db1312a2d685dd65b6225f02ffdc92c` 用 randomUUID；[`FirestoreCheckInRepository`](https://github.com/3427564237/enmori-app/blob/9e2a0572ff0e760c958635cd8d1c1f6253581a91/backend/src/check-ins/infrastructure/firestore-check-in-repository.ts)，blob `0aa699ae54d2c4d4f05cfc043e13875d9f198e9d` 读取 candidate absence 后 transaction.create；活动幂等重放读回原引用。 | 随机 UUID／create 只能防已存在文档被覆盖，不能证明硬删之后同身份永不创建或恢复；缺原重放源返回 dependency unavailable，不等于有永久 ID registry。 |
| Stored projection 验证 | [`firestore-records.ts` 第84–99、171–190行](https://github.com/3427564237/enmori-app/blob/9e2a0572ff0e760c958635cd8d1c1f6253581a91/backend/src/shared/infrastructure/firebase/firestore-records.ts#L84)，blob `0008fa6834bc85749e69205aedaa7d39a66b9615`：Note 必须已经规范化；createdAt 只要求 isUtcIsoInstant。该验证接受无小数或非固定三位小数的 UTC 字符串。 | 合法 projection 不自动意味着所有字段都符合 AI string range/query 的 canonical 毫秒前提。 |

## 4. 两个具体尚缺的来源保证

### 4.1 全部适用记录的 canonical 毫秒 UTC

已选 F03 查询使用 string createdAt 的 inclusive `[asOf−7×24h,asOf]`、时间DESC／opaque ID ASC；query边界须与fixed readTime指同一瞬间。正常 Application 的 `toISOString()` 已有源码证据，但现行 projection parser允许其他合法UTC形式，且 DU review只确认Backend authoritative UTC，未给全部适用记录／fixture／维护写入的统一格式保证。

需要 DU 交付的具体事实是：本次 isolated source 数据库存与所有适用创建／fixture／维护入口是否保证固定 canonical 毫秒UTC、不可变 Note/time；若存在旧的非规范值，说明其实际范围及已批准处置，不能由 ZHOU reader静默迁移、改变时间或把记录当空。**query后再验证/过滤不能证明未被字符串边界查询到的记录不存在**，因此不能凭 parser fail closed 宣称查询完整。

这是 selected query 的 producer前提证据，**不是重新请求 F03 PM选择**；只限制依赖它的真实Note查询完整性声明。已知fixture可以在其明确受控范围验证，但不得把合成fixture观察推广到未核对的全库存。

### 4.2 永久删除／恢复／维护路径与身份不复用

DU明确没有永久ID tombstone／registry，也没有应用编辑／删除接口。现源不能证明跨物理删除、恢复或特权外部写入的绝对不复用；更不能靠随机UUID或“当前document不存在”补足 C-A 离线source失效保证。

需要 DU／LI 把本次受控环境的实际writer／维护／fixture／teardown入口绑定到具体源：谁能物理删除、是否能恢复或重建同ID、如何确保不恢复旧source身份，以及不可变 Note/time 适用到哪里。Remaining A 已不允许 restored/reused source ID；缺的是该已选边界的实际执行事实，不是又一次业务选择。尚未证明前，不声明 offline delete→recreate 场景闭合，不把缺失判定／request-only updateTime 扩成永久历史证据。

本记录不要求新增墓碑表、逐source generation、事件表或永久registry；这些不在已选库存内，不可用新schema偷偷“修好”缺证据。若事实显示有与已选边界相冲突的适用维护行为，只报告该行为／owner／影响，停其依赖接入，交主管处理实际差异。

## 5. 当前可以继续的工作及验证边界

| 工作 | 现在可继续的范围 | 仍不得声称 |
| --- | --- | --- |
| R-A | accepted #88 上的退出copy／动作／session与target保护及测试；不等History、真实store、全producer或旧PR merge。 | leaving／newsession／404／closed证明未保存；新增receipt／强制重发／全局exactly-once。 |
| reader内部Port和政策 | selected StartAuthorityView、白名单投影、唯一asOf／原预算、empty/denied/unavailable、current generation比較、Persona edit/switch/delete与当前检查的独立实现及测试。 | fake projection／纯政策测试证明真实数据库一致性、source不复用或全库存格式。 |
| LI producer接入准备 | 以 #95 已审准确源准备同database authority读取；显式controlled environment、gateway实际绑定和原token/session边界。 | #95自带AI reader，或只检查env就证明gateway没有指向其他环境。 |
| 真实Note reader接入 | 可完成独立准备；实际依赖上述两项保证的路径待相应源事实补齐。 | 重新写成“等待LI选N02/F03”或“等待DU审#95”；已有History读取等于模型授权。 |
| 有界能力验证准备 | Remaining A 已限定释放group/name ordering、wildcard policy、多parent/deleted-reference keyset、并发close／initialization／restart和ACK-loss证据。每批先固定synthetic fixture／ports／guarded launcher／锁定SDK／具体保证与限制／自有fixture清理。 | 不必重批同一已选合同或重跑#92；本记录没有启动任何新实验，不证明云index部署、任意故障的SLA或SDK缓冲销毁。 |

正式 JIN 审查仍绑定后续实际 ZHOU 新增source，LI按其职责作限定验收。当前本地核对没有新增review结论、真实reader Ready、整体M26/Sprint/UAT/Release、合并、任务关闭或看板变更。
