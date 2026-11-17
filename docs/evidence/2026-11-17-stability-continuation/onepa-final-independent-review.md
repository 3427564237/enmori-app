# onePA 三项组合的独立源码与隔离验证

2026-11-17，Asia/Singapore。独立审查者在实现者冻结源码、测试和 `backend/dist` 后复核并执行测试，没有修改生产代码、重编译、部署、操作设备或调用真实 provider/AI。**未发现阻止这三项修复进入候选包审阅的实质问题；这不批准部署，也不证明真实 onePA 详情已恢复。**

## 批准与审查边界

1. [身份及拒绝处理批准](../../decisions/2026-11-17-li-onepa-identity-refusal-repair.md)：原三文件 22+/7- 的实现与 44 个永久用例已独立审阅，提交为 `272decbf`。保留[前次记录](onepa-investigation.md)，不改写其 RED/GREEN 或 2092/21/9 历史收据。
2. [per-caller asOf 单独批准](../../decisions/2026-11-17-li-onepa-pending-time-repair.md)：在上述基线上仅改变 `OnePaBrowseSource.load` 中两行新增、一行删除。等待 shared work 完成后，按本次调用原来的 `asOf` 执行既有 `row.startAt > asOf` 检查。实际 source hash 与批准补丁 proposed hash 相同。

第三项没有读取新时钟、修改 shared promise/cache 内容、TTL、pending 清理、重试、取消、来源权限、API、数据模型或依赖。此前的 `loadExact` 仍独立要求返回 occurrence ID 等于请求 ID；普通渲染与 403/429 拒绝边界也未变。检查失败继续沿用 undefined/不可用路径，不添加新的公开错误语义。

## 永久测试审查

新增 `onepa-pending-time.test.ts` 共 13 例，使用实际 OnePaBrowseSource → CombinedEventSource → controlled projection → stable/Browse/participation application。HTTP、目录、账号、时钟和 Firestore gateway 均为合成输入；participation gateway 为进程内内存，不创建 Firebase SDK 或外部写入。

已审阅的边界包括：

- 第二调用者在开始时刻及开始后 1 毫秒均不可继承较早调用者的未来行，覆盖 stable、Browse 和新 Going 保存。
- 较早请求在测试时钟前进后仍按其原 `asOf` 成功；不引入响应时刻重新判断。
- 冷请求和已经完成的缓存继续执行相同时间规则；两个开始前请求共享一次获取并均成功。
- private/undefined 和 acquisition failure 不变，不增加来源读取；每例核对来源读取数量。
- Going 拒绝后 gateway 完整内容等于调用前的深拷贝，既没有新增参与事实，也没有修改既有账号。

审查者读过实现者的正式 RED 收据：13 例中 7 通过、6 个目标断言失败；没有将中间夹具的 generation 干扰当作目标缺陷。最终三项组合的独立验证结果如下。

| 本次独立执行 | 结果 | 证据类型 |
| --- | --- | --- |
| 新 asOf 13 例 + 原身份/拒绝 44 例 | **57/57**，退出 0，无跳过/取消 | pinned Node 24.19.0，合成 Ports 与实际应用组合 |
| Firebase 隔离集成 | **21/21**，退出 0，无跳过/取消 | 同一最终 dist，真实本地 Auth/Firestore emulator，仅 demo project |
| Azure entry | **9/9**，退出 0，无跳过/取消 | 同一最终 dist，module mocks，无 Azure 远端操作 |

Firebase 使用已审阅的私有 helper、`demo-enmori-rmvp01a-r10` 及 loopback 18080/19099/14400/14500/19150；临时 profile 和 auth/firestore/hub/logging 进程已清理关闭。此次集成因新增第三项生产代码而重新执行，**不是复用前两项 272decbf 的 21/9 收据**。完整 backend suite 由实现者另行执行，最新数量见[第三项实现报告](onepa-pending-time-review.md)，本审查不将旧 2092 数字当作最终组合结果。

命令中 `node` 为 `/home/miku/.local/state/enmori-backend-expiry-20261117/toolchain/node`，指向既有 Node 24.19.0；没有通过 package manager 安装依赖：

```text
node --test backend/dist/test/event-browse/onepa-pending-time.test.js backend/dist/test/event-browse/onepa-exact-identity.test.js backend/dist/test/event-browse/onepa-refusal-boundary.test.js
node /home/miku/.local/state/enmori-backend-expiry-20261117/firebase-emulator-check.mjs
node --experimental-test-module-mocks --test tool/azure_backend.test.mjs
```

## 最终冻结身份与证据

所有日志保存在私有目录 `/home/miku/.local/state/enmori-onepa-stability-20261117/`，使用新文件名，未覆盖原两项修复收据。

| 文件 | SHA-256 |
| --- | --- |
| `backend/src/event-browse/infrastructure/onepa-browse-source.ts` | `e58aa5b5485cfd41056bf1f135f2040d949864a55e81a390bdc3580a09d86ac4` |
| `backend/test/event-browse/onepa-pending-time.test.ts` | `6eabef92595b63de48bdf937a9511c30a54d241f9227252f335c12a6603a1c79` |
| `backend/dist/src/event-browse/infrastructure/onepa-browse-source.js` | `aa6c7bc4c12e7130d07272e9e31907273689e9f4bba9fe4f0e05ddd2b42056a3` |
| `final-combined-independent-focused.log` | `74026d86ea38297e1316e450f4740b44e8d42739db3ab0eae45c58737ee85ba9` |
| `final-combined-firebase.log` | `985f3474617ad7f24dafcd2f9b5d459ca828316d0cea823510265dcc66b0fa94` |
| `final-combined-azure-entry.log` | `4b5ae062bbc9286e191e143ae76bf814baa22f377fea360125af55560028b916` |

`public-event-pages.ts`、`onepa-public-reader.ts` 以及原两个测试文件与前次冻结 hash 一致。没有 API、package/lock 或 Firebase 规则差异。

这些结果关闭的是合成重现范围内的代码缺陷。历史 onePA 503 尚无准确阶段归属；真实来源失败、同身份恢复、匹配候选 APK 的验收以及最终部署身份仍需后续证据。provider 明确拒绝不会因修复而变成可用，单次成功也不能证明稳定版。
