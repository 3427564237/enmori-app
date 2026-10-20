# ZHOU：SHI PR #167 独立审查

2026-10-20，SGT。按 [本轮 PM/用户指派](../../../decisions/2026-10-20-pm-zhou-integration-followup.md) 执行。

已提交 [REQUEST_CHANGES 5583042964](https://github.com/3427564237/enmori-app/pull/167#pullrequestreview-5583042964)，绑定 head **`02197c93abd1ff6bfdc9ece6fc43ab2da2979f32`**、产品 source **`71e0f4083d3ad88aaad11e890796bbe04a3f091e`**、tree `3c9e690e7ee9cedba63256ad3b3f07d5321e7b9b`；目标整合分支 base `900ca6fcdefb77e9aa95d96fa80994ebf826398f`。head 相对产品 source 只增加验证文档。

## 两项必须修正的问题

**R1 / P2：旧可见按钮可把旧会话意图写入新会话。** `lib/features/event_participation/presentation/participation_controls.dart:78–82` 的 Cancel 等写入回调捕获旧 value，却由 `controller.change` 取调用时的新 session 和最新 revision。

独立 Widget probe 真实 `tester.tap`：A 按钮已渲染，A=going / ignored=false / revision1；Auth stream 已替换、Provider 已读到 B=going / ignored=true / revision7，但 Flutter 新帧尚未渲染。点击仍可见的 Cancel 实际保存 `B:7:none:ignored=false`，错误取消并解除 B 的忽略。跨 UID 与同 UID 新 AuthSession 两项均失败；当前 B 正常按钮的正向对照只保存 `B:7:none:ignored=true`。主证据不是手动调用已经移除的闭包。需要绑定渲染时 session/原事实和预期版本，拒绝观察到会话替换后的旧动作；同类按钮作为一个 finding 处理。

**R2 / P2：分页读取绕过原子来源投影，列表与详情不同代。** `backend/src/event-browse/infrastructure/controlled-source-projection.ts:16–18` 的 batch 只透传、不发布 snapshot；新增 `EventBrowse` 的第一页也走 batch。

实际 Ticketmaster adapter 配合明确标注的合成 HTTP：推荐先暖缓存同一 occurrence 的 `OLD title`，EB2 第一页再次抓取得到 `NEW title`，随后 browse Detail 和 stable-ID Detail 仍从 snapshot 返回 `OLD title`。输出为 `reads=2,list=NEW,browseDetail=OLD,stableDetail=OLD`。这是 [19Oct 正式决定](../../../decisions/2026-10-19-li-sponsor-demo-local-takeover.md)“刷新原子替换来源投影，推荐和详情读取同代”被新增路径绕过；EB2 只替代无分页限制，没有取消该约束。修复需保持第一页/后续页身份和已有读者的同代一致、有限缓存及 disable 门禁，不靠关闭旧断言或新增供应商内容持久化解决。

## 已完成的检查与复用边界

| 本轮独立执行 | 结果 |
| --- | --- |
| Node24.19.0 严格 TypeScript 编译 | Pass，exit0，既有锁定依赖复用；无新安装/升级。 |
| 八个指定 Backend 套件 | **72/72 Pass**。Transport、EP1 持久化/CAS/权限、OpenAPI、受控来源及 EB2 覆盖；不把 probe 失败混入该通过集合。 |
| 五个指定 Flutter 套件 | **43/43 Pass**，Flutter3.47.2/Dart3.13.2，`--no-test-assets` / 测试 NoSplash；不作为视觉、shader、APK或手机证明。 |
| 独立 Flutter frame probe | **1 Pass / 2 Fail**，真实两帧间点击；跨 UID 和同 UID 替换是同一个 R1。 |
| 独立来源 probe | **1 Pass / 1 Fail**；同代一致反例失败，disable 后迟到 detail 的正向边界通过。 |
| 完整 PR 差异空白检查 | exit2：`api/event-participation-contract.md:125` 末尾多一空行。非阻断清理项，不作为第三个功能 finding，未把它记成 Pass。 |

合计五个主 probe 为两个正向通过、三个预期断言失败，说明两项缺陷；不与 72/43 相加。初次保留旧闭包的补充反例和 probe teardown 挂起属于过程记录，主证据使用已正常退出的最终日志，不改写初始失败。

未重启 Emulator。SHI 提交的 **实际隔离 Auth/Firestore 4/4** 及原始失败归属已读回，仍是作者执行证据；不是 ZHOU 本轮独立执行。没有调用真实 Ticketmaster、模型、共享主机或设备，也没有修改作者产品或原测试文件。

源码交叉审查覆盖规范合同、API/存储/index、参与 CAS/no-op/墓碑、独立 ignore、当前关系/隐私及人数扫描、scope/signature/cursor、外部打开返回、页间去重/重试和账号隔离。原 #162 的普通父 rebuild callback-reset 已被本包修复（fresh callbacks/opener 不再重置），本轮 R1/R2 不等同于原 P2。

另外两个候选未升级为缺陷：普通 onboarding 拒绝已存在 UID binding，未找到获准可达的重绑 Account 流程，所以不以人工改库的旧 cursor 继续为 finding；detail fallback 虽无局部 epoch 后置检查，但外层 controlled gate 已拒绝 disable 后的迟到结果，正向 probe 通过且 pending 归零。

## 修复交接

SHI 负责在同一完整包修复 R1/R2，回复一个新 source/head 和有意义的回归结果；ZHOU 随后只复核变化及受影响检查，不重跑未变的大套件。未代作者修复、解决线程或批准 #167。LI 继续负责最终 root/runtime、真实来源/设备和部署授权；JIN 的好友动态另属其包。

本轮审查意见和最小 probe 已可取，ZHOU 的当前审查交付已完成；SHI 修复、LI 最终设备验收的 ETA 未获确认，不编造时间。保持 Draft/Open，不合并 main、不发布、不关闭 Issue/Project、不声明完整 UAT/Release/Done。

精确文件 blob、命令、原始日志路径/SHA256 和两份 probe 源码见 [本轮统一校验清单](followup-verification.json)。

复现：在 #167 的准确 head 独立 checkout，将 [Flutter probe](shi-167-callback-probe.dart.txt) 复制为 `test/review_zhou_pr167_callback_probe_test.dart`，按清单的 `--name "frame boundary|current B Cancel"` 执行三个主用例；文件中另保留最早的闭包补充用例，不计入该三个主用例。将 [来源 probe](shi-167-source-probe.mjs.txt) 复制为 `.mjs`，仅调整文件顶部 `root` 为该 checkout 的已严格编译 `backend/dist/` 绝对路径，再运行 `node --test`。仅使用合成 HTTP 和 Repository，不注入真实供应商密钥/账号。
