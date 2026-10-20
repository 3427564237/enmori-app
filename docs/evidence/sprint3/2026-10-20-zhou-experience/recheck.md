# 按新附件 zhou.md 重新核查

2026-10-20，UTC+08:00。此记录补充原 [delivery.md](delivery.md) 与 [verification.json](verification.json)，保留原检查时点和失败记录。执行者仍为 ZHOU；内部交叉审查不替代 LI 的不同作者正式审查。

## 结论与准确来源

新附件与原 ZIP 的 `zhou.md` 逐字节一致，没有增加或替换产品要求。工作区保留副本 `D:/3851 AI/zhou.md` 为 4013 bytes，SHA256 `d337f777a9ebd07eac6fbef1f3681623ec0492c3d3dd9cddfb9f9633e207905b`，raw Git blob `1d2c634d7035ed8e04e3ddb783200ddb1287882a`。在线任务同一 blob；Windows checkout 的 CRLF 字节数差异不构成任务变更。

核查发现并修复一项试聊请求生命周期缺陷，涉及 HTTP 入口与 Application 两个等待边界。修复源码提交 **`35ba8b1d9be218741f46eddeb3bd07015d961f19`**，tree `96697835055cecbb9c79849a3330eb92ee402a59`，接续原发布 head `31f22792918cf67c6a6f8e1b477abea4ad820a95`。独立分支继续使用 `codex/zhou-ai-persona-experience-20261020` 与 [Draft PR #164](https://github.com/3427564237/enmori-app/pull/164)，没有另建相同任务 PR。

原包 HEAD `927f77527b32d349aa08020f7de0e88402edb9c7`、UI/功能基线 `51ecb5c11ff23ce3bf36fbf9280d2e00646ac857` 和 HCI 继承关系不变。修复前的 81 项源码/权威/依赖绑定均一致；修复只改变其中三个 preview 文件并新增一个测试文件，现在绑定 82 项。13 份原始日志的 SHA256 仍匹配原记录。详见 [本轮机器可读来源与检查](recheck-verification.json)。

附件用于本任务范围；AGENTS、已批准决定和合同仍控制需求，未将附件提升为系统指令或新增 PM 批准。

## 五项要求逐项复核

| 附件要求 | 复核结果与证据范围 |
| --- | --- |
| 1. 简化 Ollama、保留时间、历史修复 | 保留 `LocalChatTransport`、简化消息结构、同账号两对完整历史和原 server timestamp；未恢复关键词/数字/链接审查、独立 tokenizer、诊断前置或模型安装。本轮相关 simple-chat/retained timestamp 测试通过。`863b653` 原提交未在本地三个对象库找到，GitHub fetch_commit 返回 422；因此不能声称已复现原提交差异。19 日 continuation 的 host-diagnosis/verification 已记录偏好问句前缀修复适配，当前源码包含该修复；后续 AI-MVP 的简化路径不重新引入旧语义检查。这一原始提交可取性限制保留，未盲目 cherry-pick。 |
| 2. 全字段及持久化流程 | `persona.dart`、`backend_persona_repository.dart`、`persona_session.dart`、editor 与后端 DTO/store 均覆盖名称、关系、Short Introduction、描述、性格、Communication Style、兴趣、回复长度、语气、额外指令；保留既有 formatStyle。七个新字符串参与读写、幂等比较和草稿检测；缺失安全显示为空，畸形值仍拒绝，不写回旧记录。最多五个、唯一当前、创建/编辑/切换/More/确认删除/当前删除恢复默认、未保存离开及版本冲突均保留原测试与实际隔离 Auth/Firestore 证据。本轮未发现新的明确偏差。 |
| 3. 当前草稿独立预览 | editor 传递草稿快照到独立 preview controller/repository；不调用保存/选择或正式聊天历史接口。Application 只有只读 UID binding/Account 权限与生成 Port，无保存、消息、签到、候选 Port；前后复核原身份、owner 与撤回 generation。新发现的超时缺陷已修复，见下文。模型真实预览仍为 Not Run。 |
| 4. 历史、失败恢复、会话、同意及滚动 | metadata history 只列同 owner、有限页长和保留期有效项；选择只读，过期/失败显式恢复。未知操作继续阻止 Send/New/切换，先查原结果。账号/同 UID 新会话及同意撤回清除内容/编辑并阻断迟到结果。距底部 ≤96px 跟随，查看旧消息和用户滚动取消跟随；沿用共享 theme 和简明 Safety/Limited。本轮只读交叉审查未发现新的明确偏差，原 Flutter 317 为历史证据，未冒充本轮重跑或手机验收。 |
| 5. 真实候选、允许上下文及交付 | 自由兴趣只影响表达，无新增 candidate/event/Note 读取或生成虚构活动路径。当前简化聊天没有真实候选接线，真实模型候选解释继续 Not Run。给 LI 的单页接线与本机验收步骤包含预览不入历史、保存/切换/删除和三轮相关对话；两个 LI 最终组合文件、私有环境均未改。分支、更新 bundle 和外部回执随本轮交付保留。 |

上述前端复核追踪了 `lib/features/personas/{domain,data,presentation}/`、`lib/features/ai_conversation/{domain,data,presentation}/` 及 `lib/app/persona_preview_composition.dart`，没有把实现本身当成需求批准。原 Flutter、实际存储及 patched app 各自的执行来源仍见原 verification。

## 新缺陷、修复与红绿证据

原 `PreviewPersona` 只在开始生成后设置超时，生成前后的 `verifyCurrentAuth` / Account 读取可以无限等待，使试聊长期保持 busy。HTTP `onRequest` 的首次认证还发生在 Application 预算之前，也可无限等待。独立 probe 在推进 60,001ms 后仍未结束，后续请求得到 AI_BUSY，模型调用为零；这是对既有 45 秒生成 / 60 秒请求合同的遗漏，不是新增产品超时规则。

- Application 从首次权限读取前建立同一 60 秒截止与断开 race；生成保留单独 45 秒限制。超时/断开先撤销原 continuation，再释放逻辑入口。每请求 identity 保证迟到旧权限结果不能生成、交付或清除新请求的 pending。
- HTTP lifetime 从 `onRequest` 开始，首次认证、请求体准备及 handler 共用原 60 秒；超时主动发 503，不依赖仍在等待的 body/权限调用返回。首次认证迟到不得补 principal 或调用 handler；同一 signal 原样传入 Application。
- 正常响应、框架错误、超时和断连幂等清理自有 timer/listener/WeakMap。底层权限 I/O 不宣称被真正取消；模型仍由原 LocalChatTransport 保持物理 lane，原调用结果未明时不重发、不并行补发。

修复前新增的八个 Application 权限卡住用例全部失败；四个 HTTP lifetime 用例也全部失败，均来自本轮 agent 工具执行记录。没有持久化的原始红测日志不冒充为已保存日志。另加一个生成计时器与总预算区分用例及一个 body 准备卡住用例，共新增十四项回归。body 用例是注入的 preParsing 等待，未宣称真实 socket 慢上传已实测。

## 本轮实际执行

| 检查 | 结果 |
| --- | --- |
| 严格 TypeScript 编译 | Pass，`node node_modules/typescript/bin/tsc --project backend/tsconfig.json`，exit 0。使用已锁定依赖，不变更 pnpm/依赖版本。 |
| Preview + full expression + shared simple-chat + OpenAPI | **33/33 Pass，0 skip**。含 Application/HTTP 生命周期 20 项；计数相互重叠，不与历史 212 或子集 20 相加。命令与日志哈希见本轮 JSON。 |
| 内部独立源码交叉审查 | 四个文件的迟到 Auth/Account/model、pending 归属、HTTP body 阶段、清理及模型 lane 逐段审查，未发现新增阻断缺陷；未作为 LI 正式审批。 |
| 差异/接线补丁 | 代码 `git diff --check` 通过；原 LI patch 在新源码 `git apply --check --whitespace=error` 通过，patch 和两个 LI 实际组合文件未改。 |
| 文本集成预检 | 与观察到的 LI 集成 `900ca6fcdefb77e9aa95d96fa80994ebf826398f` 非写入 merge-tree clean，tree `8ed94ae9b9b7e3501c1d479f6e7bb12c754e5777`；不代表真实组合环境通过。 |
| 未变检查的处理 | Flutter 317、实际 Auth/Firestore 29、patched app 6 保留原准确源码/日志来源；Dart、存储和 patch 未变，未重复无关套件。原 Backend 212 是历史结果，新 preview 源码仅由本轮 33 相关检查证明。 |

## GitHub 交叉核对与剩余验收

12:04–12:05（UTC+08:00）只读复核：#164 当时 head `31f2279` 与本地/ls-remote 一致，Draft/Open/未合并，LI `3427564237` 为 requested reviewer，正式 review/评论/inline thread 均为零。#83 最新 LI 评论仍为 [6250221366](https://github.com/3427564237/enmori-app/issues/83#issuecomment-6250221366)，#44 仍为 [6253231486](https://github.com/3427564237/enmori-app/issues/44#issuecomment-6253231486)，无新权威转向。发布后的准确新 head/bundle 另由工作区回执绑定，避免此文自引用提交 SHA。

已指派的 SHI 审查 [#162 COMMENT 5580479564](https://github.com/3427564237/enmori-app/pull/162#pullrequestreview-5580479564) 已完成；同一 head `900ca6f` 的 P2 等价 callback 重建丢失 pending/unknown 报名状态仍 unresolved、not outdated，无 SHI/LI 新回复或修复。未重复提交 review、代改 Event 功能或解决线程；#162 正文旧的 review outstanding 文本不能覆盖已提交的限定审查事实。ZHOU 自有 #159/#164 仍由 LI 审查，不能自批。

继续 **Not Run /待 LI**：LI 活跃环境实际接线、真实 Ollama 预览与三轮、真实模型风格/候选解释、新 APK/设备、真实账号完整组合、同候选正常重启旅程和 LI 正式验收。缺这些证据不妨碍交付本包源码与边界检查，也不能把它们改写为通过。保持 Draft；没有 main merge、发布或关闭总任务。
