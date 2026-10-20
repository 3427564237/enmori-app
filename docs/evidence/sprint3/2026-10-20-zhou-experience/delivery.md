# ZHOU AI/Persona 完整任务包交付

> PM 后续任务已完成：已独立 [复核并批准 LI 的兼容修正/接线范围](li-integration-review.md)（#165，源码52f494b/current a822091）；原 #164 的兼容 P2 在 LI 分支纠正，未重复实现。另已对 [SHI #167 请求修改两项 P2](shi-167-review.md)。本轮执行与证据边界见 [统一清单](followup-verification.json)；下文旧“未审查/本机 Not Run”保留原时点，当前应按后续 LI 准确源码的限定验证读取。

> 后续复核：新 `zhou.md` 与原任务一致；发现并修复 preview 前后权限及 HTTP 首次认证可能无限等待的问题。新增源码 `35ba8b1d9be218741f46eddeb3bd07015d961f19`，本轮严格编译与相关 33/33 通过。见 [重新核查及剩余边界](recheck.md) 和 [新源码绑定](recheck-verification.json)。下文保留原交付时点，原 212 等结果不冒充新源码全量重跑。

2026-10-20，UTC+08:00。作者 ZHOU；不同作者审查及范围验收：LI。本包完成模块源码和可独立验证的边界，不替代 LI 的最终主机/同一 APK 真实旅程验收。

## 精确来源

- 已校验包 HEAD：`927f77527b32d349aa08020f7de0e88402edb9c7`，包含 UI/功能基线 `51ecb5c11ff23ce3bf36fbf9280d2e00646ac857`；manifest 全文件 SHA256 通过。
- 产品/测试提交：`5f949a596bea2385200e7ccac10f9ca9e973cc16`，tree `da009ec63bf63931ebbaabc4241ed1f346ee7ddf`。分支：`codex/zhou-ai-persona-experience-20261020`。后续交付证据提交不改变产品源码。
- 独立目录：`D:\3851 AI\formal\enmori-zhou-experience-20261020`；原 `formal/enmori-app` 和 `D:\3851` 均未覆盖。工作区级分支/bundle/PR 回执另行保存。
- [执行来源与旧/新规则范围](../../../decisions/2026-10-20-user-zhou-complete-package-execution.md)、[精确 Persona 合同](../../../planning/2026-10-20-zhou-persona-expression-preview-contract.md)、[GitHub 交叉核对](github-crosscheck.md)。转交任务、包内任务和 GitHub 任务 blob 一致；新集成分支观察为 `900ca6fcdefb77e9aa95d96fa80994ebf826398f`。

## 已实现与用户流程结果

| 流程 | 实现与实际证据边界 |
| --- | --- |
| 完整 Persona | 名称、关系、Short Introduction、描述、性格、Communication Style、自定义兴趣、回复长度、语气、额外指令；保留既有 formatStyle。保存/编辑/回读/选择/More/确认删除、最多五个与唯一当前、删除当前恢复默认。Flutter 全流程与实际 Auth/Firestore 保存、幂等、修订及旧记录验证通过。 |
| 草稿 Try Your Persona | 当前未保存草稿快照，独立输入/回复，返回编辑保留草稿；不保存/激活、不进入正式历史。Backend 没有写入或聊天/签到/候选读取 Port；当前身份/同意及撤回 generation 前后复核。UI/HTTP/Port fixtures 通过；真实模型预览未执行。 |
| 新对话与历史选择 | 同账号现有会话子集合的稳定分页，只返回 ID/显示时间；保留完整精度保留期。加载/真实空态/失败显式重试/更多页；历史目标随后过期或删除可安全恢复。选择读回不发送消息。真正未知操作仍先查原结果，不能借历史或 New 绕过。 |
| 连续聊天/权限 | 沿用简化 Ollama 接线、原模型、两对获准历史、原结果查询和保留时间修复。自由字段仅影响表达；不恢复关键词/数字/链接审查、tokenizer或诊断健康前置，不自动读取签到正文。账号更换、同意/权限撤回清空内容和编辑器并屏蔽迟到结果。 |
| 消息滚动与 UI | 靠近底部时跟随新消息，阅读旧消息时不强拉；保留单一主滚动目标、键盘/大字/横屏及草稿焦点。沿用共用深绿/Playfair，加入简明 AI Safety/AI Limited；未改全局主题。 |
| 推荐解释边界 | 不按自定义兴趣造活动，不新增候选/签到数据读取。当前简化聊天没有真实候选接线，不能声称已完成真实候选解释或以模拟数据冒充真实推荐。 |

旧记录缺七个新字段返回空字符串且不写回；存在畸形值仍拒绝。未清库、回填或迁移；未修改模型、依赖/锁文件、Android/iOS、共享主题或 LI 的实际两个最终组合文件。

## 本轮检查

| 检查 | 结果 |
| --- | --- |
| 源码提交上的 AI/Persona + app 预览权限绑定 Flutter 定向套件 | **317/317 Pass**，`fvm flutter test --no-pub test/features/ai_conversation test/features/personas test/app/persona_preview_composition_test.dart --reporter expanded`。包含真实 controller/mapper 和显式 HTTP/Auth/Repository fixtures；不冒充真实模型。 |
| 受影响 Backend/AI/Persona/OpenAPI | **212/212 Pass**；严格 TypeScript 编译通过。原 bounded 模式、简化聊天、上下文、异步原请求、字段/预览/历史与合同一起检查；未跑无关全量套件。 |
| 独立实际 Auth/Firestore Emulator Persona | **29/29 Pass**，CLI exit0；全字段真实保存回读、幂等/并发/撤销身份/ACK丢失、旧记录不迁移均覆盖。228个事务、234次尝试、6次SDK重试、最多9个业务get、0业务集合扫描；fixture检查另计。全部自有测试服务退出，5个固定测试端口释放。 |
| 静态/格式/差异 | 六处定向 fatal-info analyze 无问题；41个 Dart 文件非写入格式检查 0 变更；代码空白通过。嵌入补丁保留 unified-diff 合法上下文空格，补丁自身以 `git apply --check --whitespace=error` 检查。 |
| LI 最小补丁验证 | 在源码提交的独立副本实际应用补丁，Backend 严格编译和 patched app 分析通过，既有 app + 预览绑定 **6/6 Pass**（其中2项与317重叠，不相加）。没有启动实际主机或模型。 |
| 集成可组合性 | 与 `900ca6f` 的非写入 merge-tree clean，tree `efa76fef349623d6f4cec18fae35508a14a062ec`；补丁在该临时组合 index 上也应用检查通过。仅文本可组合，不是组合环境运行通过。 |

命令、输入 Git blob、执行日志 SHA256 及结果见 [verification.json](verification.json)。原始日志仍在工作区 `drafts/` 和 `artifacts/persona-emulator-20261020/`；没有上传私有主机配置、账号凭证、APK或模型记录。

保留失败：离线 pub 首次缺 geolocator（随后仅取得既有锁定依赖）；滚动红测2失败；Safety最初置顶使小屏状态不可见1失败，移至内容尾后63/63；撤回权限编辑器红测4失败，修复后通过；历史 UI 测试滚动未稳定的初次失败；并行编写期间 OpenAPI 曾3失败、补齐历史后最终212/212；各子记录保留原 fixture/调度失败。没有将旧失败改写为成功，也没有累加重叠测试。

## GitHub 审批职责

已完成 SHI 增量独立审查并提交 [PR #162 COMMENT 5580479564](https://github.com/3427564237/enmori-app/pull/162#pullrequestreview-5580479564)。原组件16/16及Backend5/5通过；独立反例2个正向通过/2个重建失败，发现一项 P2：等价回调重建清除未决外部报名状态。要求 SHI 修复后再接入；没有批准累计927文件的整个PR。[完整审查](shi-review.md)保留精确来源和可复现 probe。ZHOU自有#159和本包仍由LI审查，不自批、不改任务完成状态。

## 给 LI 的单页接入与实际验收

执行 [最小补丁及接线说明](../../../integration/2026-10-20-zhou-persona-runtime.md)；保留现有私有配置、认证/数据、相同模型 transport 和正常停止导出，不重装模型或接管主机。模块 `buildApp` 可选注册、简化表达与历史转发已提供；最终运行接线仅在补丁中，由 LI 收口。

1. 接受同意的自有测试账号：填全部字段，不保存先预览；正式历史数量和当前 Persona 不变，返回草稿仍完整。拒绝/撤回同意后预览和 AI 输入消失，其他批准功能仍可用。
2. 保存→退出→重新读取；编辑→保存→读回；切换→当前唯一；第六个拒绝；取消删除不变，确认删除当前恢复默认；旧修订冲突保留草稿并显式重新读取。双账号及同UID新会话无旧内容。
3. 同一实际模型连续三轮相关话题，离开回读续聊、New保留旧历史、选择历史后继续；网络/超时未知先查原操作，不自动重发。新回复在底部跟随，查看旧消息时保持位置。
4. 独立保存/停止/恢复同一环境后回读；小屏、横屏、键盘和较大字体实际查看，记录新源码/APK身份。不要借旧v6或其它候选的结果。

**Not Run /待 LI**：当前补丁在 LI 活跃环境中的实际接线、真实 Ollama 三轮与预览、真实模型风格/候选解释、最终 APK 构建/设备、真实账号完整组合、正常重启的同候选旅程及正式不同作者验收。本包不宣称完整 UAT/Release/Done；保持 Draft，不合并 main、不公开发布、不关闭总任务。
