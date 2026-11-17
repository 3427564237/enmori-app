# v87 部署流程与实际收据独立复核

2026-11-17，Asia/Singapore；下列精确时间使用 UTC。**本次精确包切换、实际挂载身份及限定时间内的单 owner／财务保留复核通过。HTTP 已返回真实应用认证错误；这不是活动详情恢复、模型验证或稳定版定版。** 独立审查者只读本地脚本与主线程提供的实际操作收据，没有执行远端请求、脚本修改、部署、模型调用或设备操作。

依据 [LI 的 v87 部署批准](../../decisions/2026-11-17-li-v87-deployment.md)和[具体部署／回滚方案](../2026-11-17-stability-continuation/deployment-review.md)。三项源码修复和确切包身份已另行[独立核验](../2026-11-17-stability-continuation/package-review.md)，这里不重复测试或打包。

## Operator 适配审查

私有本次目录 `/home/miku/.local/state/enmori-v87-deploy-20261117/` 与已使用的 v85 operator 逐文件比对：

- `control_base.py` 仅将基线换为 v85 selector `2026111713582385.zip`、源 `9fb0e7c9bfc27ca860da66c83e39d9f6245564f4`、ZIP SHA-256 `7b2ffcccbf6c129ccaa839de1fced57125e2c41e33a5f746dc444189fcbe4140`。
- `v87_operator.py` 仅更新候选名称注释及硬编码的候选 hash／源 commit。mode allowlist 仍不开放 seed、arm 或配置写入；prepare 只上传确切 ZIP，使用唯一名称、`If-None-Match: *` 和独占 intent。未知结果使用原 intent 的 confirm/inspect，不重复提交。
- `exact_package_remote.py` 仅改为 v85 → v87 manifest 及已审查的九个差异条目。原逐 entry 检查、切换前 selector 比对、独占临时文件、原子替换和 fsync 仍保留。回滚目标是上述确切 v85。
- `owner_config.mjs`、`upgrade.py`、`rollback.py`、`verify_current_stop.py`、`drain_proof.py` 与 v85 私有版本逐字节相同。单 owner、现存 grant、资金／未知预留、停止排空、当前实例和回滚守卫未降低。

候选 metadata 绑定目标 `2026111715442687.zip`、v87 源 `9e4c3ca6c44bc243823ee3f0a5d34ae3ec76bb28`、68,086,761 bytes、8570 项，ZIP SHA-256 为 `357e981363ddc0c5297dd224dabbed288e5c637059d9f9819146cc68fa747102`。

入口 SHA-256：`fc2c1765a1d37ffd5820cf8c389eb87fe267b507f52a1d5b80600120f82f9546`；远端精确包校验代码 SHA-256：`4ced903ae903f27ede3b9e5a4b6bc634ae9f4ebd5dc16cb83f1321d0a45f6499`。本审查没有运行它们。

## 停止、切换与启动顺序

| 收据阶段 | 实际记录与独立核对 |
| --- | --- |
| Stop intent／提交 | 15:45:51.411327／15:45:51.736188；唯一 intent 指向 v85 基线。 |
| 首次 verify-stop | 保存通用 `ValueError`；没有保留具体失败的 require 条件，原因未知，不归因为某个日志或平台时序。没有再次提交 stop。 |
| 后续只读停止验证 | 15:46:30.362688；intent hash 匹配，ARM 当前实例清单前后相同且只有一个已停止实例，平台停止序列完成，HTTP stopped 页和本地旧服务 stopped 条件均通过。 |
| Selector 切换 | 15:46:58.497626；activation 收据的目标／hash 与 v87 候选相同，仍在停止状态下进行。 |
| Start 提交 | 15:47:05.817323；原设置指纹、停止证明、candidate 和 ledger 守卫通过，未重新构造包。 |

停止证据类型为 `arm-current-instances-and-site-stop-v2`，其 `individualContainerTerminationsObserved` 明确为 false。它依赖完整当前实例清单与平台停止证明，不能写成亲眼取得逐个容器 termination 日志。停止证明与激活／启动时间顺序、原 intent 关联均已核对。

## Owner 和财务保留

审查直接读取私有 `restart-baseline.json`、`ledger-snapshot.json` 和两份 `owner-observation`，逐结构比较完整记录，没有把账号、grant/attempt 标识、金额余额或原始账目复制到仓库。

- Baseline → stopped capture：全部 monetary 字段、所有 attempts 和两个 quota 记录相同；fence epoch/generation 相同，cleanup generation 未倒退。逐 attempt 汇总与账目总量吻合；现有 grant、原 cap 及未知预留保持。
- Capture → 新进程观察：恰好获取下一 generation 和新 epoch，owner 与 fence、cost recovery 同代；完整 monetary 和 attempts 仍与 baseline 相同。quota 只发生既有保守恢复转换，未释放未知预留、增加额度或换策略。
- 两次服务端观察时间分别为 **15:50:06.312** 和 **15:50:48.245**。两次 owner 均在当时有效租期内；第二次与第一次保持同 epoch/generation，lease version、renewedAt 和 leaseUntil 前进，quota 和 monetary 保持相同。
- Restart config 的 grant 与 ledger grant 相同，ownership 模式保持、无 manual claim。预检设置指纹与 restart-settings 收据相同；observe/renewal wrapper 也继续核对同一指纹。操作日志确认没有 operator 发起的 paid request。

正常重启按原协议更新 owner/fence 和 cost/quota 恢复元数据，因此不能声称全程 Firestore 零写入。以上证明的是这些具体观察之间的完整财务保留，不是对其他使用者在其后无限时间内的消费保证。

## HTTP 与实际挂载

HTTP 等待收据保留了 10 次约 7.2 秒的超时，直到 **15:50:59.572199** 才观察到应用返回 **401 / AUTH_REQUIRED，406 ms**。这说明请求进入既有应用认证边界，不能代替认证后 profile、Browse、详情或来源恢复验收。

安全启动收据记录 configuration 于 15:49:12.3324864、listening 于 15:50:56.9272644，平台 startup probe 用时约 184.069 秒。`aiAvailable: true` 只是当时的运行时状态，不是实际模型调用或午夜后连续可用证据。

前三次 actual-container SSH 挂载核对未通过，记录保留。随后 **15:51:26.621279 → 15:51:36.206102** 的实际应用容器核对通过：

- `demoVersion`: **87**；
- `sourceCommit`: `9e4c3ca6c44bc243823ee3f0a5d34ae3ec76bb28`；
- 挂载 manifest SHA-256：`78b42c8af4801e24a6b3c9e684479ac908b4d8473b2134cb49ee60710de07692`。

这与已核验候选及 selector 切换收据一致；没有把管理面的 Running 状态当作实际挂载成功。

## 授权到期与后续边界

本次私有 grant 中 credit expiry、balance validity 和 price validity 均仍为 **2026-11-17 16:00 UTC，即 11 月 18 日 00:00 SGT**。未续期、充值、改变 cap、grant 或模型验证额度。两次 owner 观察都在该期限之前完成。

既有 `owner_config.mjs` 在 restart-baseline、capture、start 检查、observe 和 renewal 都要求 grant 当前有效，回滚复用相同守卫。到期后不能删除这些门禁来继续操作，也不能把它们的失败直接当作普通 HTTP 服务宕机：运行时的 owner 租约与 AI 资金 admission 是不同边界。若到期后需要重启／回滚，必须先明确其可执行前置条件；包回滚不会续期 AI。

同一 v86 APK 与实际 v87 的有界详情过期／恢复、启动 Retry、onePA 降级及真实来源观察由主线程后续记录。本报告不预先判它们通过，不关闭未明 onePA 503、历史启动／回首页问题，也不作稳定版定版结论。

## 关键私有收据指纹

| 文件 | SHA-256 |
| --- | --- |
| `restart/restart-baseline.json` | `8831ca1b057a738dcdf29b6e0df4e8a8a1736a8a41ea4b6af9dcaa36a07500c2` |
| `restart/ledger-snapshot.json` | `d829e9a8500493fa5754b77e510e9dc700797c8253ab4f85e0bc299a897a2946` |
| 首次 `owner-observation` | `201e33619683d3991ca9f50b5e1743b4039ff4ad1aad100bc77390903db0e046` |
| 后续 `owner-observation` | `92850fdd2bea792ca8cecd57d9ec69e454f9e5184a1753f0c27e1d9b8c68d82f` |
| `verify-stop.log` — 首次失败 | `b6cbc9abda4278413a19dac1899db5712d54848dba2c653ecb0d42f94138f2ce` |
| 最终 `stop-proof` | `2efba0fcd660ba840721dc80372dd21d6a64534f5dc41452032d363e6b66de43` |
| `restart/activation-receipt.json` | `1cd6d7894e66219075813197a120ea4c4d6fd72607c60fb25bcae68eb5a8ef90` |
| `restart/start-submit-receipt.json` | `65e17d6da561784864e6e1692ca915c513f64a37707a3b6d59ffaef78ba1ed07` |
| `restart/startup-status.json` | `2c5c37712c752ddd71f08c1d73104f7bb7d4e74957d24fc429150563e2eeb7b0` |
| `http-readiness.json` | `334ee59041b3cc5bc21804539261c9197444fa45c6c97a75c6d48a5946be4314` |
| 最终 actual-container mounted manifest 收据 | `4985cb89d625fa7e6dbc2c4b406b87c3847264b27a4fac49cc779f3b18e7ea07` |
