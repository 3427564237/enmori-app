# 专用验收账号同意状态差异：独立只读调查

本节记录 v87 部署后 HTTP 验收中新发现的未解释差异。证据类型是现有操作收据、私有响应比较及源码检查；本审查者没有进行远端调用、设置保存、账号修复、模型请求或设备操作。实际后端身份见本目录部署记录：v87 / `9e4c3ca6c44bc243823ee3f0a5d34ae3ec76bb28`。

## 已观察到什么

- 2026-11-17 **15:51:27.026 → 15:51:29.236 UTC**，专用账号 `GET /v1/me/onboarding` 返回 200，同意字段为 `accepted`。
- **15:59:01.651 → 15:59:03.117 UTC**，同一路径返回 200，同意字段为 `rejected`。两个 JSON 只有 `account.optionalProcessingConsent` 不同，其他投影字段相同。
- 两次 profile 响应原始字节相同。这仅证明所取 profile 投影相同，不能扩成所有账号数据完整性。
- 本轮 API 脚本两次均调用既有专用身份的 Firebase sign-in，并断言返回 `localId` 等于固定本地 intent 的 UID；脚本完成记录证明该断言通过。它没有保存 token、UID 或完整成功 Auth 响应，因此没有独立的历史远端 binding 快照。
- 后一次 onboarding 响应与已有 v85 的两次响应字节一致，不能据此认定缓存或恢复旧数据。主线程记录的本轮 UI signin 晚于此次差异，不能将其作为这次改变的已知触发。
- 两次响应均发生在原 AI 资金期限 16:00 UTC 之前。账号可选处理同意与 AI 资金授权是不同状态；没有证据支持以资金到期解释这次值差异。

相关私有响应 SHA-256：seed onboarding `70f82bf006d3da1338839d78647f2d02555e76eac4df105502fe7d13bd613c7f`；after onboarding `29c82ea89fedb3a0c8d176fccf2757a7044292e4a72adf241aa9f6a3f170b4cb`；两次 profile `c8f26daff2c45d32014cc726b4dcec5009dc79c609bcba40bd5620934517d99a`。原始响应、账号标识和私有档案不入库。

## 正常源码路径检查

| 路径 | 是否可改变既有账号同意字段 | 当前可确认的边界 |
| --- | --- | --- |
| `FirestoreOnboardingRepository.getStatus`、`parseAccountProjection`、onboarding transport | 否 | 同一事务解析 binding 和 account，并直传合法枚举；没有时钟或资金到期转换。 |
| `FirestoreOnboardingRepository.complete` | 仅首次创建 | 已有合法 binding 返回 onboarding conflict；幂等重放读已有账号，不覆盖同意。 |
| `PUT /v1/me/settings` → `OwnAccountPreferences.saveSettings` → `FirestoreAccountPreferencesRepository.saveSettings` | **是，明确传入新枚举** | 要求当前 `expectedRevision` 匹配；保存令 `settingsRevision` 增加。当前启用的 purpose 模式中，`accepted` → `rejected` 同时增加 `purposeRevocationGeneration`。 |
| Cloud consent gateway／fence | 不自行选择同意值 | 包装上述设置保存，检查服务 owner 与 epoch；内存 fence 和 durable runtime fence 不把同意改为 rejected。 |
| Profile、avatar/shared-avatar、recommendation-profile 保存 | 否，保留当前值 | 都在同一个 Firestore 事务中读取当前 account，展开其数据再替换各自字段；没有在事务外持有旧 account 后无条件回写的路径。 |
| `retained-core-runtime.initializeOwner` | 否，保留当前值 | onboarding GET 成功后可能创建缺失的支持记录；仅当 purpose generation 缺失时用当前事务 account 补 0。没有同意默认值覆盖。故“没有显式产品 mutation 请求”不能写成“GET 保证数据库零写入”。 |
| 启动、AI 资金／quota 恢复、owner 租约、会话 maintenance、proactive worker | 未发现修改父 account 同意字段的路径 | 金融与运行时恢复写各自记录；会话与 proactive 写其专有记录／子集合。资金 admission 关闭不产生同意撤回。 |
| `controlled-phone-service` 新建夹具／清理 | 不属于本次部署入口 | 只在明确隔离的空环境创建 accepted 测试夹具；Azure 入口实际调用 `createRemoteGroupRuntime`，没有调用该新建／清理服务。 |

源文件锚点：`backend/src/account/infrastructure/firestore-account-preferences-repository.ts:77`、`:97`；`backend/src/account/domain/purpose-revocation-generation.ts:2`；`backend/src/recommendation-profile/infrastructure/firestore-recommendation-profile.ts:54`；`backend/src/account/infrastructure/firestore-own-avatar-repository.ts:100`；`backend/src/bootstrap/retained-core-runtime.ts:271`、`:344`；`backend/src/shared/infrastructure/firebase/firestore-gateway.ts:185`；`tool/azure_backend.mjs:144`。

本轮私有 `api-expiry.mjs` 的产品请求由固定 GET allowlist 限制；唯一 POST 是 Firebase Authentication sign-in。v87 operator／owner helper 没有 account 或 auth binding 写入路径。以上是检查到的代码与本次脚本范围，不是对所有潜在写入者、历史部署或操作系统进程的排除证明。

## 尚缺证据与限定下一步

仍无法确定这是持久字段写入、历史身份映射／读取差异，或其他尚未定位的机制；不归因于用户、外部 actor、测试工具或资金过期，不改回字段、不关闭问题。只有当前 HTTP 值和一致的 profile 投影，无法还原一次设置事务的 revision 与提交时间。

准备的一次性私有脚本 `account-metadata-read-proposed.mjs`，SHA-256 `132dd629c855f8f8fb64b2e4ddb0da20780dfacd27eec079dbdd54e73a5e332c`，已由主线程审读并执行一次；本审查者只独立读取其收据。固定专用 UID 和既有项目；一个 `readOnly` 事务最多两份指定文档；服务端 field mask 限制为 binding `accountId`（只用于内存定址），以及 account 的同意、settings revision、purpose generation、cloud consent generation。收据仅记录这些字段与 create/update/readTime，不输出 UID、account ID、档案、日记或会话。60 秒截止，不登录、不调用应用初始化、不写产品数据、不循环探测。

该快照可帮助判断当前绑定是否早于问题窗口、account 最后更新时间与 revision/generation 是否符合设置保存形态。它不能仅凭最后 updateTime 还原所有历史写入或识别写入者；没有旧 metadata 基线时也不能声称某个 revision 必然在本轮增加。若新证据仍不能确定根因，应继续保留一致性验收缺口，另行审阅最小诊断，不以再次读到同值关闭。

## 16:10 UTC 限定 metadata 快照复核

执行区间为 **2026-11-17 16:10:34.201 → 16:10:34.552 UTC**，exit 0，收据 `passed: true`；同一只读事务的两个服务端 `readTime` 均为 **16:10:34.485470 UTC**。收据 script hash 与审阅版本一致，记录 authentication/model/product write 次数均为 0。私有 `account-metadata-read-private.json` SHA-256 为 `888c5a41aaad959f77d57b3ce17b321dcb63941a10db796e6e32ec6f587f43e7`。

| 指定文档／字段 | 当前快照 |
| --- | --- |
| auth binding 的 createTime 与 updateTime | 都为 2026-11-11 06:36:00.243794 UTC |
| account createTime | 2026-11-11 06:36:00.243794 UTC |
| account updateTime | **2026-11-17 15:52:51.584168 UTC** |
| optionalProcessingConsent | rejected |
| settingsRevision | 3 |
| purposeRevocationGeneration | 1 |
| cloudAiConsentGeneration | 2 |

当前 binding 的元数据没有显示在本轮窗口内更新。account `updateTime` 证明的是**父文档最后一次写入**时间，未标识究竟改了哪个字段：profile、avatar、推荐资料或初始化补字段也会更新该文档。因此不能直接称 15:52:51.584168 为“同意撤回的精确提交时刻”，也不能仅凭三个当前计数宣称它们在本轮分别增加了多少或由谁写入。

这个最后更新时间落在本轮 HTTP Browse 等待区间 **15:51:30.192 → 15:53:31.176 UTC** 内；同期 GET 脚本没有 settings 写请求。主线程记录本轮首次 app launch 发出约 15:52:56，截图采集从文件名所示 15:52:58 开始，收据 `atUtc` 为采集完成的 15:53:03.024764；Sign in 操作随后在 15:59:48 附近。因此该父文档最后更新时间早于本轮已记录的首次启动和登录，不能把后来的这次登录当成已知触发。

安装时间与启动时间必须区分：15:48:23.071240 的 prepared receipt 已确认 v86 安装完成，`priorPackageInstalled: false` 表示**本次安装前**没有该包，不能写成“15:52:51 时 APK 仍未安装”。该收据不观察登录状态；首次启动／登录判断依赖另外的操作与 UI 记录。

旧 revision 对照仅检查同一专用身份的原始创建记录、已有 v85 HTTP 验收以及 v86 continuation 中按 account/settings/consent/onboarding 命名的本地证据，共 18 个候选文件。原始创建收据与 v85 onboarding 投影没有旧 `settingsRevision`、`purposeRevocationGeneration` 或 `cloudAiConsentGeneration`；v85 投影只可确认此前读到 rejected。没有扩大搜索其他账号或取得新的远端数据。当前证据仍不足以确定写入路径、写入者或首次 accepted 响应与存储差异的原因；问题保持未解释状态。

用户随后就“该专用账号是否在其他地方并发使用”澄清为 **“不清楚”**。这既不是没有其他 writer 的确认，也不是存在外部 writer 的证据；不能用于归因或关闭异常。调查未修改账号状态。
