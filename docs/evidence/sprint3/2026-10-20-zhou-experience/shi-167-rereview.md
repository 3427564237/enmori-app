# PR #167：两项 P2 修复的限定复审

2026-10-20，SGT。用户要求检查两项修复，复用已有验证，不重复运行未受影响的测试。复审 head **`0158ca6588e115323f4776d974c778a1d95352ca`**，修复源码 **`01d46d80ddddd5c61457d4111240ac75209dd427`** / tree `e22c7575e71fae65e5c41d350d0c8d98e311e010`，对照原 head `02197c93abd1ff6bfdc9ece6fc43ab2da2979f32`，base 仍为整合分支 `900ca6fcdefb77e9aa95d96fa80994ebf826398f`。

**结论：R1 已修复并关闭线程；R2 顺序路径已修复，但并发稳定详情仍可返回旧投影，保留 P2。** 已提交 [REQUEST_CHANGES 5585364546](https://github.com/3427564237/enmori-app/pull/167#pullrequestreview-5585364546)。这不是新增第三项缺陷，也没有新增产品要求。

## R1 — 已通过

四个写按钮均捕获渲染时的精确 AuthSession 与 EventParticipation 对象，统一调用 `changeRendered`。该方法在本地状态变更/Repository 调用之前检查 ref 生命周期、当前 auth 观察、原 session、Event ID 和同一个 expected 对象；检查到 `change` 之间没有 await。跨 UID、同 UID 新会话、同会话新读取的事实均拒绝旧动作，不静默借新 revision 写入；原 busy/uncertain 与先读未知结果的接口保留。

本轮独立 **Flutter 15/15 Pass**：作者新增十二例（3种替换 × Interested/Going/Cancel/Ignore）及原审查三项 frame/fresh-B probe。旧按钮都不写入，重绘后的 Cancel 仍按 revision7 保存 ignored=true。测试使用 `--no-test-assets` 与测试 NoSplash，不能作为视觉/设备证明。[R1 复审回复](https://github.com/3427564237/enmori-app/pull/167#discussion_r4325234233)后，由原 reviewer ZHOU 关闭该线程。

## R2 — 部分通过，仍有同代读取漏洞

page0 现在推进 epoch、清旧 snapshot、clone/freeze 完整结果并原子发布，firstBatch 并发读会加入 replacement pending；旧 first/next 不能覆盖新投影。原顺序 OLD→NEW probe、作者新增两个回归及相关来源/分页/disable 检查均通过。

但 `controlled-source-projection.ts:40–48` 的稳定 ID `event()` 没有等待已有 replacement pending。最小并发顺序：

1. 旧首批将 occurrence X 暖缓存为 OLD，并登记真实 adapter 的稳定身份映射。
2. page0 刷新开始，设置新 epoch E、清空 snapshot，replacement 尚未返回。
3. 普通 browse Detail(X) 等待 replacement；stable Event Detail(X) 却直接发 source.event，捕获同一 E。
4. page0 先发布 NEW；列表和普通详情读到 NEW。
5. stable lookup 迟到返回 OLD。发布并未改变 E，所以其后置检查仍通过，返回 OLD 成功；随后推荐为 NEW。

实际 TicketmasterBrowseSource + 合成 HTTP + 外层 controlled gate + 原推荐/详情 Application 的独立 probe 输出：

```json
{"listReads":2,"detailReads":1,"list":"NEW title","browseDetail":"NEW title","stableDetail":"OLD title","recommendationAfter":"NEW title","gate":{"configured":true,"enabled":true,"pending":0}}
```

该新增 probe **0 Pass / 1 Fail，exit1**。它验证同一已知首批 occurrence 在替换期间仍绕开共享 generation，不能用“后续页允许当前 provider lookup”消除这个反例。仍按 [19Oct 正式决定](../../../decisions/2026-10-19-li-sponsor-demo-local-takeover.md) 的原子刷新/推荐详情同代要求处理；EB2 未撤销此约束。[R2 复审回复](https://github.com/3427564237/enmori-app/pull/167#discussion_r4325234922)保留原线程，交 SHI 将该稳定读取绑定到 replacement generation，等待后重新核对或安全拒绝，避免旧成功结果越过新投影。保留 later-page 身份、来源有效性和 disable 门禁。

## 执行与复用清单

| 本轮独立执行 | 结果与边界 |
| --- | --- |
| 严格 TypeScript 编译 | Pass，Node24.19.0，既有锁定依赖，无新安装/升级。 |
| 受影响 Backend 四文件17项 + 原 reviewer两项 | **19/19 Pass**。四文件17由新增generation2和三个既有受影响source/browse/gate文件组成；不与作者17相加。 |
| R1 新十二项 + 原 reviewer三项 | **15/15 Pass**，固定 Flutter3.47.2/Dart3.13.2；未重跑作者51或旧43。 |
| R2 新并发 probe | **0/1 Fail**，只用 HTTP double，不是实际 Ticketmaster 联网。单独记录，不混入19项通过集合。 |
| 完整 PR 差异空白 | Pass，原 API 合同末尾空行已移除。 |

只审查了七文件增量：三个产品文件、两个新回归文件、修复证据、API 合同末尾空行。product→head 除证据只加测试 capture 语句 braces，断言/请求行为未变。API 语义/OpenAPI、依赖、存储/索引、Emulator 测试与 runner 均未变。原 Backend72、Flutter43、实际 SDK4 保留旧 source `71e0f4` 的归属；作者新17/51为作者执行，未当作本轮独立重跑。实际 SDK4可继续证明未变的存储/CAS/隐私组件，不能借为新 page0/concurrent source generation 或真实 provider 验证。

没有重复未受影响测试、启动 Emulator、调用真实来源/模型/主机/手机，也没有修改 SHI 产品或原测试。新增独立 probe、源码 blob、准确命令和日志 SHA256 见 [复审校验清单](shi-167-rereview-verification.json)；[并发 probe 源码](shi-167-concurrent-source-probe.mjs.txt)复制为 `.mjs` 后，仅调整顶部 root 为准确 checkout 的已编译 backend/dist，再用 `node --test` 复现。当前运行记录成功返回 OLD 是问题证据；修复可以返回当前投影或安全失败，不要求放松来源与资源门禁。

SHI 负责剩余 R2 修复及一个新 source/head；ZHOU 此轮复审已完成，后续只复核其实际变化。LI 保留最终组合、真实来源/账号/设备验收。R2/外部验收 ETA 尚未获确认。保持 Draft/Open，不批准整个 PR、不合并 main、不发布或关闭任务；原审查与失败记录不删除。
