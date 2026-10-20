# PR #167：fba5a82 的剩余 R2 复审

2026-10-20，SGT。按用户要求只复核 R2 新修复，复用未变验证。准确 head `fba5a82ebd0074b875f40153381eee6c746a4772`，产品 `ed63795719534f1e3834a0d3a88305cb083d0dce` / tree `8eda719df18075991a0319d8a1421ecb61da8a4e`，对照 `0158ca6588e115323f4776d974c778a1d95352ca`。

**原稳定 ID 并发窗口已修复；普通浏览详情的 raw fallback 仍能越过新投影，R2 保留。** 已提交 [REQUEST_CHANGES 5585687685](https://github.com/3427564237/enmori-app/pull/167#pullrequestreview-5585687685)，并在 [原 R2 线程回复](https://github.com/3427564237/enmori-app/pull/167#discussion_r4325494513)。R1 不变，继续保持已通过/已解决状态。

## 已修复并通过的范围

`event()` 先等待 pending replacement，再核 generation/cancellation、读新 frozen snapshot；正常后续页 raw 读取返回后核对 epoch、snapshot 和 pending。新 firstBatch 工作也推进 epoch，失败刷新不能放行旧 raw 成功。源文件当前 blob 为 `f716333fe145fdd6d668f1d5c707fcc6e6d879f6`。

严格 TypeScript 编译通过；四个受影响 Backend 文件22项加原 reviewer 并发 probe，**23/23 Pass、0 skip**。原 probe 的驱动做了必要适配：修复后不再产生 raw Detail，不能继续等待 raw-entry 事件；改成一个 event-loop 周期并断言三个操作已被门禁接纳，再释放刷新。保留原 NEW 内容断言，另断言 raw Detail 请求为0。结果：

```json
{"listReads":2,"detailReads":0,"list":"NEW title","browseDetail":"NEW title","stableDetail":"NEW title","recommendationAfter":"NEW title","gate":{"configured":true,"enabled":true,"pending":0}}
```

失败刷新、raw stable lookup跨publication、disable等待和pending归零、后续页身份等受影响检查均通过。不借测试通过代替源码审查。

## 同一 R2 的未关闭分支

`ControlledSourceProjection.detail():87–89` 在首批未命中时，直接返回 `this.source.detail(...)`；未在该 await 前后绑定/核对 projection generation。外层 controlled gate 只检查 operator disable，page0 替换不会改变它的 epoch。

实际 Ticketmaster adapter、合成 HTTP、外层 controlled gate 与 EventBrowse 的可达流程：

1. 读首批 A，跟随真实签名 cursor 读下一批 B/OLD，确认 B 确实来自已观察后续页。
2. 发普通浏览 Detail(B)；因旧首批仅 A，进入 raw fallback 并保留其旧响应在途。
3. page0 刷新将同一个 B 发布为 NEW，新请求的 Detail(B)也为NEW。
4. 释放旧 raw响应；较早的普通 Detail(B)仍成功返回OLD。

```json
{"firstPageReads":2,"laterPageReads":1,"rawDetailReads":1,"refresh":"NEW title","freshDetail":"NEW title","lateOrdinaryDetail":"OLD title","gate":{"configured":true,"enabled":true,"pending":0}}
```

这一单独新增 probe **0 Pass / 1 Fail，exit1**；不混入23项通过集合。它允许拒绝旧结果，不要求必须改成新成功，也没有新增字段、权限或供应商一致性假设：同一类的稳定详情 raw 分支已采取的 publication/generation 检查，普通详情 raw 分支尚缺。仍是 [19Oct 决定](../../../decisions/2026-10-19-li-sponsor-demo-local-takeover.md) 的原子刷新、推荐和详情同代要求；不是第三个 finding。

## 复用与交接

parent→head仅三文件：来源投影、generation regression、修复证据；product→head仅证据文档。R1/Flutter、API语义/OpenAPI、依赖、参与存储/索引、Emulator测试和runner均未变。本轮未重跑 Flutter、实际 SDK、存储、模型、真实 provider、主机或设备；原72/43/SDK4、作者17/51/22及ZHOU19/15各自保留原源码和执行者，不相加或重标成本轮通过。

已核对提交的修复记录及作者 Before/Final SHA收据；独立checkout没有作者私有原始日志，不声称重新哈希它们。本轮自己的编译、23项和新失败probe日志已保留并绑定。无作者产品修改。完整PR空白检查通过。

SHI负责仅补齐 ordinary raw Detail 的 generation/publication 围栏或安全拒绝，保留真正后续页详情可用性；返回同一包的新source/head与该反例。LI继续最终接线和真实来源/账号/设备验收。当前复审已交付，外部修复ETA未确认。保持Draft/Open，不批准整个PR、不合并main、不发布或关闭任务。

[精确源码/命令/日志](shi-167-r2-fba5a82-verification.json)、[适配后的原稳定详情probe](shi-167-r2-stable-probe-adapted.mjs.txt)、[本次普通详情probe](shi-167-r2-ordinary-probe.mjs.txt)。复制为 `.mjs` 后仅调整顶部 root 为准确checkout的已编译backend/dist，`node --test`复现；不使用真实密钥或账号。
