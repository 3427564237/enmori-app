# PR #167：db1b724 独立复审通过

2026-10-20，SGT。已提交 [APPROVE 5586692615](https://github.com/3427564237/enmori-app/pull/167#pullrequestreview-5586692615)，绑定 head **`db1b7249c7b97d0e0f8e68e3d9024efcc4e1b9be`**、产品 **`ac849740ead323d19419eaf7b3dcd3098445f411`** / tree `7bb11f90a38f7ac01f318cb4879ffd5920f04a3b`，目标仍为 LI 整合分支 base `900ca6fcdefb77e9aa95d96fa80994ebf826398f`，不是 main。

**R2 剩余普通详情回退问题已修复，已由原 reviewer ZHOU 关闭线程。** [确认回复](https://github.com/3427564237/enmori-app/pull/167#discussion_r4326298907)。R1 在0158ca6的独立通过/关闭状态保持；本轮没有重做未变组件审查。原 REQUEST_CHANGES 和失败记录保留，不改写成当时已通过。

## 修复与源码结论

相对fba5a82，仅来源投影、generation回归及修复证据三个文件变化；product→head仅新增证据文档。普通 `detail()` 在 firstBatch 同步入场/加入之后、yield之前绑定epoch，await后读取当前snapshot并检查当前代；raw详情返回后与稳定ID分支共用 `requireCurrent` 检查epoch、snapshot、pending和取消状态。firstBatch也核对admitted epoch和实际发布items身份，避免旧数组穿越新发布。

源码blob `cddb0568e0f4264ad2e4a96491b58cf73349e8fc`；回归blob `578858cdbd4a0a590f77793899cf1de8abf9910a`。逐段复核后未发现该修复及保留的Event功能范围内新增阻断缺陷。正常未换代的后续页详情仍可读取，没有通过禁用fallback、自动重试、改合同或增加权限来制造通过。

## 本轮独立执行

- 严格TypeScript编译通过，Node24.19.0，既有锁定依赖复用，无新安装/升级。
- 四个受影响Backend文件28项，加原reviewer普通详情反例1项，**29/29 Pass、0 skip**。该原probe只改本地checkout路径，断言和实际signed cursor/page1流程未变。
- 原反例：首批A→签名cursor/page1 B/OLD→raw详情在途→page0 B/NEW→新详情NEW→释放旧raw，现在输出如下。旧请求安全失败，fresh详情保留NEW，pending归零。

```json
{"firstPageReads":2,"laterPageReads":1,"rawDetailReads":1,"refresh":"NEW title","freshDetail":"NEW title","lateOrdinaryDetail":"SERVICE_UNAVAILABLE","gate":{"configured":true,"enabled":true,"pending":0}}
```

- 未刷新时的后续页正向读取仍成功；成功/失败刷新、disable、取消、稳定详情、cached Detail跨firstBatch await等检查通过。
- 完整PR差异空白检查通过。本轮没有修改作者产品或原测试。

28 = generation13 + projection8 + pagination3 + controlled-browse4；29与SHI的28重叠，不相加。作者Before10Pass/2Fail属于补入cached-await用例前的12例阶段，之后generation为13；不把不同测试树标成同一阶段。作者新证据列原始失败/最终日志路径和SHA，但独立checkout无其私有原始日志，未声称重新读取或重算那些日志；本轮独立日志已保存并绑定。

R1/全部Flutter、API语义/OpenAPI、参与存储/索引、依赖、Emulator及runner均未变。既有72/43/SDK4、作者17/51/22/28和ZHOU19/15/23继续保留各自准确源码/执行者归属；未重跑Flutter、存储、Emulator、真实来源、模型、主机、APK或设备，不借旧SDK4证明本次并发围栏。

## 当前交接

SHI完整Event包的指定独立代码审查现已完成，两项P2均由ZHOU确认解决。无需SHI重复原问题或凑新增改动。LI继续最终router/bootstrap接入、真实来源/账号/浏览器/设备验收和启用授权；JIN的Home好友动态仍独立。代码批准不构成这些验收已完成。

保持Draft/Open，无main merge、部署、发布、Issue/Project关闭或整应用UAT/Done声明。[准确输入、命令与日志清单](shi-167-db1b724-verification.json)；[本轮原probe副本](shi-167-db1b724-ordinary-probe.mjs.txt)仅需把顶部root改为准确checkout的已编译backend/dist后执行，不注入真实密钥/账号。
