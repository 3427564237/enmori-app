# AI 回应时长与管理员完善：本轮验证

日期：2026-11-05（Asia/Singapore）。源码、自动测试、合成 UI、三次受控云端请求及最终普通服务部署已完成验证；本轮测试数据已清理，本地服务恢复原状态。APK 产物已验证，但手机安装被设备拒绝，仍为 v53；实际 AI 时长仍超过 15 秒目标。

## 源码与批准范围

- AI 优化及批准记录：`f56e6cb37706d5916e0b5a35ecd36f3251d5b0e8`。
- 兴趣管理与已复现 UI 修复：`6c5531bc75fa22cdf0cdcaab5a92a3bd05dbfdae`。
- 依据：[LI 本轮决定及兴趣扩展确认](../../decisions/2026-11-05-li-ai-latency-admin-polish.md)、[批准方案](../../planning/2026-11-05-interest-admin-completion-proposal.md)、[Q12](../../decisions/2026-09-02-interest-tag-event-category-contract.md)，并遵循仓库 [Skill 路由](../../tooling/skill-routing.md)。后台/API 的逐文件 SHA-256、环境和失败修正经过见 [Admin 验证明细](admin-verification.md)。

兴趣管理现有创建保留，增加完整启用/停用目录、状态筛选、重命名、停用和恢复；展示稳定 ID/版本，写入后独立重读确认。冲突后刷新，未知结果保留草稿且不自动重放。每次后台操作重新检查当前用户是否停用及 `enmoriAdmin === true`；原 capability 仅作导航提示，未增加角色或权限授予入口。

真实运行的永久删除保持关闭：DELETE 返回 **503**，连接真实后端的客户端不显示可点击删除动作。当前源码可确认的引用是 `account_interests` 和 `events`；这不能证明已部署历史数据及所有写入者的完整性。安全删除事务已在明确重置的隔离数据上实现并验证；未将该测试证明用于真实数据。Event Category、推荐配置和账户请求不列为本轮已完成能力。

## AI 时长改善与证据边界

同一校验点内的独立 context/history 读取在新鲜身份及云端同意校验后并行；两者成功前不会继续产生效果。保留校验点数量、上下文失败优先级、取消/晚到结果拒绝。已选记录在每个获准阶段内最多并行读取 5 条，保持权限→Persona→来源顺序，事务结束前等待该阶段所有读取结束。

以下是 **mock timer 的受控等待时间**，每项依赖固定注入 100 ms，并非真实网络、模型或端到端回应时间：

| 场景 | 串行等待等价值 | 当前受控结果 |
| --- | --- | --- |
| 9 个校验点，各含 context/history 两次读取 | 1800 ms | 900 ms |
| 准备 5 条已选记录 | 500 ms | 100 ms |
| 5 条 Persona 后再校验 5 条来源 | 1000 ms | 200 ms |

实际输出见 `admin-backend-full.log` 的两条 `Controlled 100ms` 诊断。三个额外独立核查通过：身份拒绝和云端同意拒绝均不启动两类读取，历史拒绝不能借用上下文成功。源码追踪确认相关 history 读取不清理持久历史；批量读取没有引入写入。

尚无本轮真实端到端分布或 **p95** 结论，不能把这些百分比当作用户实际提速。原完整回应 15 秒目标没有被取消，也未由这些模拟结果证明达标。

## 三次受控真实云端时长

主任务临时部署 AI-only 源码 `f56e6cb37706d5916e0b5a35ecd36f3251d5b0e8`，精确 ZIP SHA-256 为 `4bbd8c924824d8b72af80000c2283cf0727874bb9d81a745a4140c737e194fce`，使用自己持有的合成测试身份与输入，三次请求均成功并确认云端来源。脱敏数值来自私有原始记录的字段白名单：[cloud-latency-summary.json](cloud-latency-summary.json)，不包含身份、凭证或消息内容。

| 样本 | Prepare | Execute | 完整请求 |
| --- | --- | --- | --- |
| 1 | 1.858 s | 37.867 s | 39.876 s |
| 2 | 1.561 s | 34.713 s | 36.331 s |
| 3 | 1.417 s | 34.990 s | 36.468 s |

历史同提示词、同模型的两个暖态完整请求为 46.351 s、41.554 s。当前三个值较低，但这是少量、不同时间的非并发样本，不能归因于本次代码变更，也不能推算可靠性或 p95。**三次均超过完整回应 15 秒目标，实际时长目标仍未达标。** Prepare/Execute 分项包含各自 API 路径的等待，不能直接等同纯模型推理时间。

首次派发前的预检因新进程恢复账本元数据与旧预期不同而失败；失败前没有创建 intent 或调用模型。主任务核对 `recover()` 实现并经本地独立复查后，仅修正该元数据预期，未放宽预算或修改既存 attempts。三次新增尝试均已结算：总 attempts 从 101 增至 104，已结算从 99 增至 102；累计支出 USD 0.0938607 → **0.1001847**，本次增加 **0.006324**（分别 0.001968、0.002258、0.002098）。原有 USD **0.004096** 预留保持，既存 attempts 原样保留，额度仍为 USD 3.40。

本节确认上述临时 AI-only 包与三次请求；清理、恢复和最终部署的独立证据见下节。账本总数仍有两个旧未结算条目，不把它们视为本轮新请求或擅自清除。最终 `6c5531bc` 中的两处 AI 优化文件与本节实测的 `f56e6cb3` 完全相同。

## 最终部署、清理与恢复

2026-11-05 **01:44:46 UTC / 09:44:46 SGT**，现有 Azure 服务上的最终运行 ZIP 已下载核验，SHA-256 为 `4a22062b2478e44875d1900bae7b44017bb65b4ae579e097a046491177ff28ec`，manifest 对应源码 `6c5531bc75fa22cdf0cdcaab5a92a3bd05dbfdae`。启动日志确认 `firebaseRead=true`、`aiConfigured=false`。合成普通账号的资料 GET 为 200、管理员 capability 为 false、管理目录 GET 为 **403 AUTH_FORBIDDEN**，并检查 `no-store`。这是部署真实性及普通账号拒绝证据；管理员正向操作的证据仍来自源码、Emulator 和 Widget 测试，没有授予真实管理员角色或修改真实目录。

三段测试对话分别读取 canonical outcome 后删除，均返回 204，再读为 404；两个本轮自建身份及已知普通记录已删除并核验。临时 AI 容器已确认物理终止，再移除三项云 AI 配置，并验证普通服务恢复；最终部署保持普通模式。清理后账本再次核验为 104 次尝试、102 次结算、支出 USD 0.1001847、预留 USD 0.004096，既存 attempts 与 grant 不变。本地 `enmori-group.service` 已恢复原来的 **enabled / active** 状态；这里只确认进程状态恢复，不将其等同手机端验证。

普通服务恢复时 Azure 延迟约 6 分钟才启动容器，之后应用正常监听；没有通过重复部署或重新开启 AI 绕过等待。上述脱敏证据与私有原始记录的哈希见 [runtime-verification.json](runtime-verification.json)。没有合并 main、推送源码或进行正式 UAT / Release 验收。

## 自动验证

| 验证层 | 最终结果 | 主要证据 |
| --- | --- | --- |
| Backend 严格 TypeScript 编译 | 通过 | `admin-backend-build.log` |
| Backend 全量 | **1817/1817**，无跳过 | `admin-backend-full.log`；含路由/OpenAPI/错误码一致性 |
| Interest 聚焦 | **34/34** | `admin-backend-focused.log`；已包含在 1817 中，不重复累计 |
| Firebase Auth/Firestore Emulator | **6/6**，CLI exit 0 | `admin-emulator.log`；并发、引用保护、权限撤销/停用 |
| Flutter 全量 | **530/530** | `flutter-final.log` |
| Flutter analyze | **No issues found** | `admin-full-analyze.log`、`flutter-analyze.log` |
| 合成 Admin 预览 | 英文、中文 **2/2** | `admin-previews.log`，下方已保留 PNG |
| 独立 AI 权限边界补查 | **3/3** | `review-checkpoint.log`；单独本地补查，不计入 1817 |

Backend 使用已有固定 Node 24.19.0、TypeScript 7.0.2；Flutter 使用 3.47.2，按本轮共享锁串行验证。Emulator 仅使用 `demo-enmori-rmvp01a-r10` 和本机端口，不连接真实项目。源代码/测试检查与手机实测属于不同证据层。

保留失败经过：首次 Backend 全量为 1815/1817，失败原因是静态路由清单未加入三条新路由，错误映射测试未同步四个新错误码；同步后完整重跑通过，详情见明细。Flutter 原 Home 返回测试仍期待一次读取，与 [26 日可见页面自动刷新决定](../../decisions/2026-10-26-li-reference-and-event-usability.md) 冲突，现按该决定验证返回后的唯一一次额外刷新；没有因此改动 Home 产品逻辑。

## 已修复 UI / 功能问题与预览

- Admin 普通目录加载时返回不会再错误提示“创建结果未知”；真实创建/修改待确认及未保存草稿仍保留退出保护。
- 重命名途中权限撤销后隐藏编辑目标及保存控件，拒绝晚到结果；同 UID 的新会话也不能继承旧会话授权操作。
- Check-in 搜索的键盘提交与按钮共享实时状态检查，避免快速重复提交启动重叠扫描。
- Check-in 趋势日期格补全语义点击动作，使读屏可执行其已有选择功能。

已查看以下合成图片，英文目录、停用筛选及中文大字体重命名没有观察到溢出；停用条目只提供重命名和恢复，没有永久删除入口。图片使用合成账号/条目，不是生产账号或手机截图。

| 页面 | 预览 |
| --- | --- |
| 英文管理目录 | [admin-en.png](previews/admin-en.png) |
| 停用筛选与恢复 | [admin-inactive-en.png](previews/admin-inactive-en.png) |
| 中文大字体重命名 | [admin-rename-zh.png](previews/admin-rename-zh.png) |

本地独立代理检查覆盖后台事务/权限及前端恢复/撤权路径；在最终 `6c5531bc` 再次只读检查当前 Admin 权限边界，未发现新的明显绕过路径。此处是本地代理复查，**不是正式 PR 审批**。没有进行真实 Admin 授权或目录写入，也不宣称 UAT、Release 或 Done。

## v57 APK 与手机更新结果

已从最终整合源码 `6c5531bc75fa22cdf0cdcaab5a92a3bd05dbfdae` 构建发布候选产物 `build/ai-admin-v57/ENMORI-admin-v57-release.apk`，版本 **57 / 1.0.0-admin20261105**，大小 69,068,164 bytes；SHA-256 为 `0d7c98e466c62df7177fcef8e548a855b27d70f0610354c15b7751b39eaced5a`。包名为 `com.enmori.app.group`，非 debuggable，APK v2 签名通过，签名证书与保留安装基线相同；权限列表与 v55/v56 相同。产物逐项记录见 [apk-v57.json](apk-v57.json)。这不是已安装或发布成功的声明。

首次 `--no-pub` 发布构建复用了测试生成的 Android plugin registrant，错误引用 `integration_test`，因此 Java 编译失败。通过正常 pub/tooling 再生成后重新构建成功，release registrant 已移除该测试插件；没有改动产品源码或依赖。初次失败保留在 `apk-build.log`，成功重建保留在 `apk-build-regenerated.log`，没有隐去失败步骤。

实际执行了一次保留数据的 `adb install -r`；安装前从手机拉取现有 v53 APK，验证原 APK SHA-256 `5eac3340359d964f533cb26e78ac972551c204e669b973519169f3c9a3270133`、相同签名及原 first-install 时间。安装返回 **`INSTALL_FAILED_ABORTED: User rejected permissions`**。随后独立读取包状态仍为 **v53**，first-install 时间未变，**没有确认 v57 安装成功**。未自动重试、卸载、清空应用数据或授予权限；正在等待用户解锁手机并处理设备确认。未查看应用数据内容，不把保留安装机制当作登录/数据实际验收。

去除设备标识后的状态见 [phone-update-status.json](phone-update-status.json)。最终普通云服务已完成上节的独立运行验证；手机仍为 v53，不能把后端上线当作 v57 真机 UI 验证。

## 本地日志 SHA-256

以下日志位于忽略目录 `output/ai-admin-20261105/`，完整后台源码与日志哈希另见 Admin 明细。

```text
e9f61e037af3288439ab929ee42400736124fd49f9bc29dde1c872bd6df68529  admin-backend-full.log
1d7c4f919818eb4876a2a37c84f9dac2e980a4452cabb32479bf0c1db80a4f2a  flutter-final.log
7b36c09df20fe281fb506a73a9292cfee30e9892ff150b10b63e61c75c328835  admin-full-analyze.log
98f70aef0d4c57717126490a5d91909a4ae158357c661348752ce54aadcfb9f2  admin-emulator.log
1476349237a3a2dec047598c4fceceedfa10dd7ff4920358146741aa07c33470  admin-previews.log
705f78c6980fbc8c28ff8d9fc6877baf635e6f53b742f53d96da4f4962a53ff4  review-checkpoint.log
53493c8e95c2553ed25260fbcd805ce8eb69534e117f987fec3d621880aa8329  apk-build.log
f4ada5468a2bef8dfd3abcc195e546751c4c46638ea6a3e296fda684df5a3aa3  apk-build-regenerated.log
```
