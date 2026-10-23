# JIN 完整包的忽略续作与准确验证边界

20 October 2026，SGT。Author JIN；不是 SHI 独立审查或 LI 设备/最终组合验收。

## 源码与交接

- 实际开发 base `927f77527b32d349aa08020f7de0e88402edb9c7`。既有模块源 `cb23d6a` / `b882680` 和回执 `9723996` 原样保留；原工作区 `7875764` 及历史日志/APK未清理或覆盖。
- 忽略接线提交 `173a8590f30e71095044f8eccd55cf4a4a4fc7c3` / tree `e691fea79213781a3d834c57b44beeba2d4507fd`。
- 最终产品源 `c71c0c675d9a1dedd2d6972d7cbb54cc5c352bea` / tree `781b717478cdd429dd077afe40333859eb5c5beb`。该修正仅保留单条 Check-in 原有 UTC 格式兼容，以及一处 Dart guard 括号；历史分页仍强制 canonical time。
- PR 目标 `souma/li-shi-du-integration-20261020`，实际核对 head `900ca6fcdefb77e9aa95d96fa80994ebf826398f`。`git merge-tree --write-tree` 成功，合成树 `65455aff1fdaff3359db281a906563e76e98b9fb`；未移动任何分支、未在这个合成树执行测试，不能据此宣称整合候选已经验收。按 LI 指示保留在途基线，不整体 rebase。
- LI 忽略及 GitHub 交接决定按原 blob 导入，hash 与 `900ca6f` 相同；原局部 Pending 被正式决定覆盖，不重复请求。完整新贡献/最小接入/SHI 审查说明见 [集中交接](../../planning/local-ui-handoff-oct19/jin-complete-package-review.md)，物理映射见 [ignore 合同](2026-10-20-jin-ignore-contract.md)。

## 实际执行

Node 24.19.0 / TypeScript 7.0.2，Flutter 3.47.2（既有 FVM SDK），Java 21、既有 Firebase CLI/JAR。没有安装 Skill、测试框架或新增本轮依赖。

| 执行来源 | 命令/结果 | 边界 |
| --- | --- | --- |
| 开发阶段，最终 error enum / type-only Port 收尾之前 | `node --test …/friend-ignore.test.js …/friend-recommendation-source.test.js`，19/19，exit0 | 新忽略及受影响排序、权限、Unknown/恢复/删除接缝；保留原执行归属，不称最终 HEAD 重跑 |
| 同阶段 API 修改后 | OpenAPI 既有契约 6/6，exit0 | inventory、状态、身份、错误 allowlist |
| `173a859`，Backend 与 `c71c0c6` 同树 | strict compile exit0；新增 ignore 规范/Transport 一致性 1/1 | 新 body、投影、Username、recommendation version 精确比对 |
| 实际隔离 SDK，以下 emitted-runtime 绑定 | `node tool/run_social_weather_emulators.mjs --friend-ignore`，6/6、0skip、outer0 | 5 子项加 parent；真实本机 Auth/Admin Firestore、Fastify injection；非真机、非模型或公网 |
| `173a859` | ignore flow + shared transport failure + Backend repositories：43 Pass / 2 Fail，exit1 | 新 ignore 12 项全部通过；另外两项单条签到 UTC 响应失败保留，不改记45/45 |
| `c71c0c6` | 仅 `BackendCheckInRepository` 组7/7；仅 location/Weather HTTP create 1/1，exit0 | 两个失败修复和相邻严格 history / UTC 拒绝边界；不重跑未变成功集 |
| `c71c0c6` | 15个受影响 Dart 文件 fatal-info analysis clean；format15/0changed；whitespace exit0 | 无 analyzer/format failure 被称为最终成功 |

SDK执行后只改了两个内层 Port 的类型依赖（移除 Infrastructure 类型，传递只读 vendor-neutral source view）。保存实际 SDK 所用编译产物后再严格编译，**197 个 Backend emitted JS 文件逐字节相同**；manifest 摘要 `793a8ee50877105e5717d4f47dc8cdfdc9516719e7107d54bc719824b8e46870`。这支持代码等价的复用，**不冒称 SDK 在最终 Git HEAD 又执行一次**。`173a859` 和 `c71c0c6` 的 Backend subtree 一致。

SDK实际覆盖：忽略即时写入并从 Home/All 排序前排除；新 Auth sign-in + 重建 HTTP/module/repository 后回读；同版本两个并发 restore 恰好一个200、一个412；隐私收紧后 list 不显旧身份、GET/Undo404、存储 ignore事实保留；恢复公开后返回当前显示名；永久删除 tombstone 后拒绝原 owner 并执行双向关联清理接缝。最后独立核验 **18条自有文档和3个Auth用户不存在**、临时隔离配置移除、8080/9099/4400/4500/9150五端口空闲。未清其它项目数据。Emulator permissive rules 警告保留，测试服务器 Admin 授权路径，不宣称客户端 Firestore rules 已证明。

**HTTP模块重建不等于 OS/正式服务进程重启**；账号永久删除执行器尚未接线，合成 tombstone 清理测试不等于实际账号删除。前者真实重启/真实账号，后者执行器，均另列 Not Run。

两次冻结阶段各 **1,577 tracked inputs** 前后逐字节稳定；来源、119个相对base的输入blob/规范化hash及每份日志SHA256见 [机器回执](2026-10-20-jin-ignore-receipt.json)。本机原日志仍在本隔离checkout `build/jin-ignore/`，不声称 raw logs 已上传。前次 SDK 日志已另存 `prior-*` 后才运行新SDK，历史证据未覆盖。

## 保留的失败与修正

- 首次 TS compile：测试错误使用不存在的 `verifyBearerToken`；改成既有 `verifyIdToken` 接口。原 compile-01 保留。
- 首次 Flutter：两个不支持 const 的 Semantics 构造导致该文件加载失败；其它4个检查通过。原 flutter-01 保留。
- flutter-02：9通过/3失败。已消失的 SnackBar handle 被再次 close 导致 `Bad state: No element`；明确释放 closed handle、导航/会话时关闭，dispose 时不修改祖先 Messenger。大字体测试须先把按钮中心滚入可点击区域，修正后真实 tap 成功。
- flutter-03：11通过/1失败。锁定 SDK 中 action SnackBar 默认 persist，原“5秒后消失”预期揭示与普通提示时长不符；使用默认普通时长并保留 accessible navigation，flutter-04 的12项通过。没有新倒计时机制。
- analyze-01 的11条 info、首次冻结 analysis 的1条 info 均保留；最终15文件clean。
- 冻结 `173a859` 的43/2发现此前共用 Check-in parser 把单条读取也收紧到毫秒形式，合法旧 UTC `…00Z` 被拒。**修产品兼容而非修改成功夹具**；`c71c0c6` 保留单条原合同，分页继续严格，7+1修复检查通过。旧43/2不抹除或计入另一次全绿。

## 仍明确未完成

SHI 的参与 projection/activity producer，LI最终共享路由/Bootstrap/统一APK和真实双账号/设备定位撤权、OSM实际瓦片/缓存、实时Weather/配额、iOS、实际账号删除 executor、正式服务进程重启持久性均未在此包执行。JIN未替代其它作者，未接管 LI 的私有环境或最终整合；既有独立评审不重复。本PR交SHI审JIN新代码/composition，LI另行验收；无merge、Issue/Project/Release/整体Done声明。
