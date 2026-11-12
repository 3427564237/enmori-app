# ENMORI v65 验收与交付缺口审查

日期：2026-11-12（Asia/Singapore）。源码：`/home/miku/.codex/worktrees/demo-ready-20261111/ENMORI`，HEAD `a3c6b544`。本次为独立本地只读审查：未操作手机、未请求云端、未生成 AI、未发送 FCM、未运行 Flutter、未改产品代码。跳过大字模式和讲述人。下列 11 月 11 日数值属于已有记录，不是今天复测结果。

审查采用仓库 `enmori-backend-development` 的边界，读取 AGENTS、Skill routing、Backend 设计及本次相关 PM 决策。没有发现足够证据将运行续接代码判定为新的 P1/P2 缺陷；主要结论是交付条件仍未闭合、长等待，以及 Android 版本与预约界面可用性问题。

## 需要优先处理

### 1. 两个月 AI 连续运行仍缺实际付费额度接续（交付缺口，优先级高）

当前 gift 的应用内截止与余额/价格证据截止均为 **2026-11-18 00:00 SGT**。老师计划 11 月 16 日开始使用，现有证据仅覆盖开始后的约两天。paid successor 源码已实现，但实际 successor 未安装。用户计划按服务商显示的 11 月 19 日到期后购买，无法自动跨过应用更早的 11 月 18 日截止。需在截止前完成真实购买凭据、净 USD 余额/expiry 与受控安装；之后仍有最多七天的手工复核周期。不能把“额度很多”或现有重启通过写成两个月可用。

证据：`docs/evidence/2026-11-11-v65-teacher-runtime.md:29`、`:61`；`docs/planning/2026-11-11-teacher-delivery-operating-plan.md:63`、`:65`；`docs/decisions/2026-11-11-li-openai-balance-reverification.md:7`、`:11`。

### 2. 活动冷读约 150 秒、服务重启约 6–7 分钟（已测性能限制，需本轮实机再次观察）

11 月 11 日真实活动首屏 149.607 秒，第二页 2.181 秒；两次 start-to-ready 为 374.368 / 403.652 秒。恢复能力已被验证，但长等待仍直接影响初次访问、演示及故障恢复体验。首屏 150 秒不应算作“功能坏了”，也不应因为放宽 timeout 就算性能达标。PM 已批准的等待值为 source 180s / aggregate 210s / client 225s，记录明确并未达到原 15 秒目标。可用性验收应重点确认等待说明、用户离开再返回、重试/重复请求及不阻塞其他页面；任何 cache、分批加载或基础设施改造须按已有行为/决策边界另行评估。

证据：`docs/evidence/2026-11-11-v65-teacher-runtime.md:35`、`:47`、`:53`；`docs/decisions/2026-11-11-li-measured-onepa-wait-budget.md`。

### 3. Android 7.x 可以安装，但预约与启用系统通知都无法完成（源码确认的兼容性限制）

APK min API 24。`resolveCivil` 在 API <26 返回 TIME_UNAVAILABLE；另外 `prepareChannel` 在 API <26 返回 false，通知控制器将 false 映射为 permissionDenied。即使旧机已授予通知权限，也会被拒绝。现有交付文档仅突出预约解析 API26+，没有同样清楚地列出通知限制。应确认老师设备；短期明确完整预约/推送能力需要 API26+，或者单独修复与验证 API24/25 路径。不要把能够安装视为全部功能支持。当前新款 Android 实机不能证明该旧版本路径可用。

触发：在 API24/25 安装 v65，进入“稍后联系我”核对时间，或者在已启用预约和同意处理后点“启用系统通知”。

证据：`docs/evidence/2026-11-11-v65-android-candidate.md:17`；`android/app/src/main/kotlin/com/enmori/app/MainActivity.kt:88`–`:90`、`:148`–`:149`；`lib/features/proactive/proactive_notification_controller.dart:526`–`:528`。

## UI/UX 的具体改善候选（建议，不是新增的已批准要求）

### 4. 预约页面仍要求用户输入技术格式，并在确认后改显示 UTC

预约日期/时间是 YYYY-MM-DD 和 HH:mm 文本框；IANA 时区为可编辑文本。核对后显示 offset、完整 ISO UTC 值；成功回执直接显示 dueAt ISO；管理预约卡片又只显示 ISO UTC。用户明明按新加坡或澳大利亚当地时间选择，回看时要自行换算，存在“时间变了”的理解成本。管理预约关闭时重新启用还要手工填写 IANA zone。

建议方向：保留内部 UTC/IANA 和显式核对规则，用日期/时间选择器或输入辅助、城市/时区选择说明，并以用户确认时区的可读时间作为主显示，UTC 放次要位置。现有时区/DST规则不应因简化界面而改变。这是现有预约流程的可用性建议，不能直接声称调度时间计算错误。

证据：`lib/features/proactive/presentation/proactive_follow_up_page.dart:404`–`:435`、`:509`–`:512`、`:638`；`lib/features/proactive/presentation/proactive_settings_page.dart:220`–`:227`、`:358`。

### 5. 通知续期发现性还可改善

v65 已显示真实 expiry，不能再沿用旧审计的“没有日期”问题。现有按钮一直叫“启用系统通知”，实际也承担重新注册/续期。30 天最长登记期意味着 61 天老师体验不能只登记一次。当前文案没有直接说明哪个按钮会续期；建议在已登记/临期/过期状态解释续期动作，保留显式用户操作与权限，不做自动续期。

证据：`lib/features/proactive/presentation/proactive_push_controls.dart:89`–`:94`、`:115`–`:119`；`lib/features/proactive/proactive_notification_controller.dart:543`–`:546`；`backend/src/proactive/infrastructure/firestore-first-flow-store.ts:123`。该项为 UX 建议，尚未本轮实机验证。

## 仍缺实证的验收项

| 项目 | 已有证据 | 不能据此声称 |
| --- | --- | --- |
| OpenAI 对话与主动跟进 | 11/11 专用 synthetic：对话 34.281s；跟进 due 后 78.6s 自动发布，两个调用成功 | v65 本轮实机生成、语义全面通过、物理推送成功 |
| v65 真机 | 保留数据安装、Home 中原登录/头像/Check-in 可见 | v65 populated expiry label、注册/重新注册、所有主要页面都已本轮验收 |
| 系统通知 | 旧独立实现/测试、现在显式最多 30 天登记 | 11/11 两个 synthetic 没有 FCM 注册/发送；当前 v65 在前台/后台/锁屏点击与第二设备替换未因此通过 |
| 自动重启 | 同包同配置 restart 与 owner renewal 已实测 | pending 模型/FCM 请求中崩溃、持续 occupied owner、transient unknown 均已实机/云端演练 |
| 跨时区 | JVM resolver 已覆盖 Singapore、Lord_Howe DST fold 等 | 老师实际城市/设备系统 tzdb、澳洲网络、物理送达已通过 |
| 数据恢复 | 有代码 rollback ZIP | 数据库误删/损坏恢复。11/11 audit 无 PITR、无 scheduled backups；这是恢复限制，尚无批准新增备份要求 |
| 老师交付 | Android/backend 候选与 maintainer 记录 | 老师账号已创建、老师设备已确认、iOS 已就绪、完整 UAT/Release 已完成 |

证据：`docs/evidence/2026-11-11-v64-install-and-scheduled-openai.md:15`–`:28`；`docs/evidence/2026-11-11-v65-android-candidate.md:19`–`:21`；`docs/evidence/2026-11-11-v65-teacher-runtime.md:49`、`:61`；`docs/planning/2026-11-11-teacher-operation-audit.md:11`–`:17`、`:27`–`:29`；operating plan `:66`。

## 已修复/不能重复报告为未完成

- onePA 已有真实 Azure 两页成功读取，不能再说源始终不可用；未证明全源/所有 tag 覆盖。
- OpenAI proactive 已有真实 worker 生成和 canonical publication，不能再说集成未实现。
- 自动 owner renewal/restart 已上线且两次已观察，不再是一用后不能重启的旧状态。
- 通知 expiry label 已进入 v65；欠缺的是当前真机有值状态验证和续期发现性。
- Azure expiry 已在 11/11 记录确认至 2027-10-28；不能把更早“expiry unknown”继续当当前结论。

这些修复见 operating plan `:59`–`:66`；当日状态应由本轮实机/云端读数另行确认。两个付费 synthetic 授权已经消耗，当前评审不能把旧授权当成继续付费测试权限。


## 独立实机截图复核（2026-11-12，追加）

只读检查 root 提供的 5 张截图：`phone/01-home.png`、`08-profile-ready.png`、`13-events-below.png`、`16-checkin-editor.png`、`11-settings-lower.png`（目录 `/tmp/enmori-audit-20261112`）。环境由 root 读取：font_scale=1.0，1260×2800，density560，Android17。本审查没有操作手机。系统手写字体不算产品字体缺陷；截图不足以证明点击命中、动画或完整页面滚动行为。未见这五张图中可确定的文字溢出/系统栏遮挡。

以下限于 3 项**可选 UI/UX 优化**，均不增加功能要求，也不改变已批准的隐私/可见性规则。

1. **Check-in 对同一个非阻塞状态重复提示，削弱保存流程的清晰度。** `16-checkin-editor.png` 中权限摘要已显示 No GPS / Weather off，下方又同时出现“Location services are off”“Weather needs a GPS point”，保存按钮后还有“Location unavailable”。这些内容都表达可以不带定位保存，却占了三段正文，使用户容易以为保存前仍有错误要处理。建议汇成一条贴近 Permissions 的状态说明，并只在实际请求定位/天气失败时增加对应恢复提示；保留“可以无定位保存”的结论和可见性摘要。截图实际已显示 Save，不应误报保存按钮不可达。

2. **Home 的身份展示和重复资料入口占据了首屏主要位置。** `01-home.png` 在主要 New Check-in 动作前依次展示品牌、地区、定位降级提示、头像身份、Public profile、Edit profile；同一身份与公共资料入口又在 `08-profile-ready.png` 的顶部大卡片出现。用户完成日常记录前需要扫过较多自己的固定信息，首屏只能露出 Today / 日记录部分，其他内容更靠下。建议在保留此前批准的 Profile 可发现性前提下，评估更紧凑的身份区与同行操作，把日常主动作提前。属于信息层次建议，不是要求删除 Profile 入口或判定现有品牌留白错误。

3. **Events 将很多设置内容置于结果之前，长等待时缺少结果区的明确状态。** `13-events-below.png` 首屏依次显示地区、定位说明、搜索、My plans、来源说明、两行日期选项、排序、Device local time，随后只有细进度条和禁用 Reload。这张图没有能够告诉首次用户“正在加载活动、预计需多久、可以先去哪里”的文字，长等待时整页更像筛选表单。建议保留核心搜索/日期选项，评估将次要排序与来源解释压缩到可展开区，并给结果区加清楚的加载说明及合适的退出/稍后再试路径。源读取为何慢须与 root 的时序证据合并；不能仅凭静态截图断言超时，也不能把 source-order 当作缺陷。

`11-settings-lower.png` 的云处理说明较长，但它承担数据范围与同意告知；本轮没有把删除、折叠隐私告知作为优化要求。五张截图总体颜色、按钮和卡片样式保持一致；上面的建议聚焦信息优先级与提示重复，不针对系统字体或大字模式。
