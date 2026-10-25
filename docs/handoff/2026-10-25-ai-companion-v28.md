# ENMORI AI 陪伴 v28 — 候选交付与验证边界

2026-10-25，Integration：`01a1719f-a6aa-75e0-9ad4-f3724777fa95`。
本轮已完成获批范围的本地实现、集成和候选 APK；新后端尚未部署，手机尚未安装。
这是一份可审查的候选交付，不是 UAT、Release 或 Done 结论。
原始过程、旧结论和被取代范围继续保留在[本轮总记录](2026-10-25-ai-companion-round.md)。

## 已确认的产品选择与实际改动

- [C 主入口](../decisions/2026-10-25-li-ai-entry-c.md)：连续 AI 入口，保留历史、会话内搜索、新话题和整段删除。
- [F0](../decisions/2026-10-25-li-ai-companion-first-flow.md)：用户从已保存的真实消息明确要求稍后跟进，确认时间和时区；默认关闭、最多每滚动 24 小时一次，提供暂停、关闭和取消。主动消息不延长旧话题保留期。来源、未读和对应回复有明确呈现。
- F1a：当次手选自己的签到，默认不选、最多五条、仅最近七天内。选取 Note、已存 Mood/Activity 和原记录时间；先复核来源及必要的整组历史排除，再确认并单独发送。签到详情可明确进入附件选择，草稿、原操作未知状态和恢复边界保留。
- D1：固定 Messaging 16.7.0 的 Android 候选及后端单次发送实现已集成。当前 APK 未配置 installation reference，设置中显示本安装不可用；无 SDK 注册、令牌上传或真实推送。自动初始化保持关闭。
- 搜索及来源展示补齐权限失效保护；同一所有者切换会话后的未知注册保留待核对状态；F1 在内容访问失效后能够通过原操作读回恢复。这些缺陷均有独立复核记录。

上述实现依赖本轮新后端接口。正在运行的共享后端仍是旧版本，不能把安装本 APK 当作新流程已经联网可用的证明。系统推送及本地模型语义质量也各有独立限制。

## 构建产物

| 字段 | 实际值 |
| --- | --- |
| APK | `build/group-delivery-v28/ENMORI-group-v28-release.apk` |
| 冻结源码 | `fd1649724e38298418b22681fcce6b6a9fcf933c`；构建前后源码干净 |
| 构建完成时间 | `2026-10-25T10:49:54.083283+00:00` |
| 包名 / 版本 | `com.enmori.app.group` / `28` / `1.0.0-group20261025` |
| 大小 | 66,447,274 bytes |
| SHA-256 | `22dc680046950c61fb53bdfc824f0852c84da649094aa58b45c0ab4e9225f377` |
| 签名证书 SHA-256 | `0fa59aeaa9ce03a830405ce79136b4abc3d62510fbb8360c8ebf7c88a82966ee`，与保留 v26 一致 |
| 构建选择 | release；`ENMORI_AI_COMPANION_FIRST_FLOW=true`；未配置 installation reference |
| 配套记录 | 同目录 `candidate.json`、`SHA256SUMS`；私有构建日志保留在本轮状态目录 |

绝对产物目录：
`/home/miku/.codex/worktrees/ai-companion-integration-20261025/ENMORI/build/group-delivery-v28/`。
APK 未纳入 Git。v26 与 C-only v27 原件均保留。
QA 独立读取实际 APK 与保留 v26，重新验证哈希、大小、包版本、v2 签名和相同证书，全部通过。
实际 manifest 为非 debuggable，SDK 24→36，包含 POST_NOTIFICATIONS 和 FirebaseInitProvider；FCM 自动初始化及 Analytics 均为 false。
四个 Firebase 资源与本次既有受控客户端配置逐项完全匹配，installation reference 确实缺省。
资源原文仅存私有目录，未提交。静态检查没有执行 SDK、令牌、通知或手机操作。
独立 `artifact-review.json` SHA-256：`618d090f9fb8ffd012c5e79bc7b7b46e6c550de7feca6508185cc1497ff3e5eb`。
[完整 APK 独立核验](../evidence/ai-companion-20261025/qa-v28-artifact.md)在 `4b8a99f` 提交；源码绑定来自构建记录，QA 独立检查了记录及二进制，没有重复构建。

第一次 v28 构建在 `8d5a724` 的 Gradle 配置阶段失败，没有产出交付 APK。
AGP 9 的资源生成默认关闭；`4d030645ceb7f21c141291aaaa9042e89d6723d7`
仅在选中 companion native 时启用 `buildFeatures.resValues`，未改变依赖或版本。
依据：[Android BuildFeatures](https://developer.android.com/reference/tools/gradle-api/9.0/com/android/build/api/dsl/BuildFeatures)。
QA 已独立审查这四行；随后在 `fd16497` 完成实际 release 构建。
原失败日志 SHA-256 为 `ff9e8d0e7471f36a4cce3f792ec57893aef397f3f8b393a9e20344046cbec5ed`；
成功日志 SHA-256 为 `76261452452df42f318fdae533db3b070b11b13d0df94bfe376081f08d6ac893`。

## 验证结果及适用层次

| 层次 | 实际执行结果 | 不能据此推定 |
| --- | --- | --- |
| Backend 源码 | `fdc9ff4` 严格编译及完整 121 文件 / 1,481 项通过；直到 APK 源码无 Backend 差异 | 生产服务、真实账户、FCM |
| Flutter 完整套件 | `a20927c`：1,348 Pass / 62 Fail，分析无问题 | 全套通过 |
| 旧基线比较 | 仅重跑旧基线 `b81d93f` 的 19 个失败文件：76 Pass / 58 Fail；58 项失败身份完全一致 | 所有历史失败均无害，或完整旧套件通过 |
| 最终 Flutter 定向 | `8d5a724` 完整分析无问题；F1/共享路由/Messaging 六文件 55/55，另两项社交长文本测试 2/2；相关 Dart/Backend/API/依赖到 APK 源码无差异 | 重跑全部 1,410 项、原生手机验收 |
| F1 恢复独立反例 | 同一修正清理方式的反例在旧头仍失败、修复头通过；另有 saved-user Retry 分支通过，共 2/2 | 原生后台恢复或网络服务行为 |
| 真实 Auth/Firestore Emulator | QA 独立 F0 持久化 10/10 组，实际工厂及 HTTP 组合 5/5 组；组合使用假模型 | 生产规则、真实模型、设备推送 |
| 一次真实 F1 本地模型 | 实际 prepare / execute / canonical U/A / 来源回执链完成，一条固定历史签到复述经 QA 判为 1 Pass | 多来源、历史冲突或一般 F1 质量达标 |
| 原生制品 | 实际 release APK 的哈希、签名、包版本、manifest、四个 Firebase 资源及源绑定经 QA 独立静态核验通过 | 手机安装、进程重启、通知点击、跨网络和可访问性验收 |

计数按各自执行层次记录，不把作者、QA、Integration 的重叠测试相加。
完整套件新增四项失败均为可见性测试定位问题：两项详情入口查询了被 picker 覆盖的页面，两项社交长文本未滚动到懒加载状态。
生产行为未为这些四项测试改变；已修正测试并完成定向检查，未再次运行完整套件。
历史 58 项包含实际复现的英文大字签到编辑溢出，继续保留，不能统称为测试误报。

证据：[完整套件与旧基线](../evidence/ai-companion-20261025/integration-regression-audit.md)、
[集成记录](../evidence/ai-companion-20261025/integration-first-flow.md)、
[F1 独立恢复](../evidence/ai-companion-20261025/qa-f1-app-integration.md)、
[实际 Emulator 组合](../evidence/ai-companion-20261025/qa-composed-first-flow.md)、
[独立源码产品复核](../design/ai-companion-20261025/app-f1-source-review.md)。

## 模型决定与免费研究结果

开发智能体七个角色启动时均从实际 turn records 核对了指定配置：Integration、Product、Runtime、QA 为 `gpt-6-astra / max`；Context、Delivery、App 为 `gpt-6.1-sol / max`。六个会话创建均显式传入 model 和 thinking，无未确认项或静默降级。
[配置及会话表](../evidence/ai-companion-20261025/agent-configuration.md)保留完整证据；此配置不决定应用模型。

应用内本地模型仍为 `qwen3.5:9b`。固定 24 案例独立评测 **12 Pass / 12 Fail**；F0 一次有界修正后 **5 Pass / 3 Fail**，质量门槛仍失败，已停止继续调参。
F0 修正批中位模型时延约 2.029 秒、最大 3.830 秒；一次 F1 模型时长 6.093 秒，均不是手机端交互时延。
F1 单例通过不能覆盖 F0 或小计划已知失败。
[完整模型评审](../evidence/ai-companion-20261025/qa-model-review.md)、[F0 比较](../evidence/ai-companion-20261025/qa-f0-semantic-comparison.md)、[F1 实际链路](../evidence/ai-companion-20261025/qa-f1-production-attempts.md)。

LI 最新确认未接受或加入 Data Contributor Program 已记录为操作者陈述；不伪装为后台可见证明。
[仅免费决定](../decisions/2026-10-25-li-gemini-free-only.md)取代此前 USD 1 付费执行许可。
已有免费项目 `gen-lang-client-0930184174` 的禁用计费和受限服务端密钥已核实；密钥不在 Git 或报告中。
八例单遍 Gemini 3.8 Flash 研究实际只完成一次 token count（HTTP 200 / 189 tokens）。
首个 generation 的次数预留已消耗，但实际发出次数仍为 **0..1 未知**；没有响应，另七例未开始。
进程 85.469 秒时以 143 结束，信号来源不明；未重试、重置次数、升级或付费回退。
因此免费模型比较未完成，未采纳 Gemini 产品接入。
[独立中断核查](../evidence/ai-companion-20261025/qa-cloud-interruption.md)。

## 最终模块交接

| 角色 | 交付源或评审头 | 集成方式 |
| --- | --- | --- |
| Product / UX | `346ac94d07c740c8bc55786458b62449c7110b6e` | 保留祖先，APK 后仅文档 |
| AI Runtime / Models | `165c0094e7e9532adb347ed27f5b66f96f3a637b` | 保留祖先 |
| Context / Backend | `149ba2671f159377d6a0856744dd8028af9f0474` | 保留祖先 |
| Proactive / Delivery | `823d9576feebe82ad17c9212ab774ce358dca828`；修复源 `df3351f` | 保留祖先 |
| App / UI | `ee448278bce86766238f2b049b0822e21c5540ad`、`9bc571c38eeb9472b8f37128244b64862186f319`、`785571fe00ffe58d2a9e7908217264f1b8e7bfff` | 分别 cherry-pick 为 `721a253`、`6b4ec58`、`8d5a724`；三组 stable patch-id 一致 |
| QA / Evaluation | `4b8a99fac7662c7bd877af5fdfb876c5a751a14b`，前序 `dc1704117ea00b77a031d046d8850d7e46583bbf` | F1 恢复证据已并入 APK 冻结头；最终 APK 独立静态复核为文档增量，保留祖先 |

## 保留状态与后续具体窗口

2026-10-25 10:45:30 UTC 只读核对：六个原始未提交输入仍全部匹配启动哈希；共享
`enmori-group.service` active/running，源目录仍为 `li-zhou-integration-oct20/ENMORI`，
HEAD `7a3c4fa31b5bb609349a961a2e4e08aeb80c9036`。自有五个合成服务端口已关闭。
这是源码及服务状态观察，不是账户数据清单。记录 SHA-256：
`c56b68cd97735883e454a78a782f2bb0f10b92c6f544fb8049a425594946f0e1`。

没有部署、服务重启、真实账户测试写入、手机安装、卸载或清数据，没有真实推送，也没有 main 合并、推送分支或新增 PR。
后续若进入 LI/SHI 的明确设备与部署窗口，需先固定同范围账户 ID/内容哈希及服务检查点，再按原包签名升级安装并回读比较；各项通知前台、后台和普通关闭场景单独记录。
相同签名和更高 versionCode 仅证明必要的包升级条件，不证明数据一定保留。
不能假定 code 28 可直接降级为 26；如需恢复旧 App 行为，应保留新增记录，并从已保留旧源生成相同签名、适用更高版本号的经审查候选。服务回退单独处理，本轮尚无新部署需要回退。
本地 F0 质量、58 项历史失败、免费 Gemini 未知结果及未执行的设备/推送/UAT 各自保留，不能由 APK 构建成功消除。
