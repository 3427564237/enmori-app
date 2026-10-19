请以 ZHOU 身份一次执行下面这个完整任务包，完成代码、前后端联调、受影响测试及交付，不要只输出计划，不要拆成需要PM逐个启动的小任务。

起点是 ENMORI 核心检查点 `9e45b1ebc13c1287fc903a6edf4059f4eeb792ec`，不是较旧main。当前本机工作区为 `/home/miku/.codex/worktrees/li-core-priority-oct19/ENMORI`；其他电脑从随附 `enmori-core-checkpoint.bundle` 导入该提交，再建立自己的分支，保留已有改动。不要在同一个工作区与他人并行写文件。先核对 HEAD/status、`AGENTS.md`、`docs/tooling/skill-routing.md`、`ARCHITECTURE.md`、`docs/decisions/2026-10-19-li-core-feature-delivery.md`、`docs/decisions/2026-10-19-li-checkpoint-owner-packages.md` 和 `docs/evidence/sprint3/2026-10-19-core-execution/`。按hierarchy保留替代范围，UI参考不是需求权威。

复用 Flutter/Riverpod、当前Backend/Firebase、Repository/认证/版本并发。只新增本包实际需要的接口和已批准依赖，不建新架构/任务系统。一个负责人完成包内前后端和严格fixture。遇到凭证、真实外部服务或更高权限冲突，只停受影响行为，继续其他部分；不要伪造数据或把组件Pass当真机Pass。旧数据缺字段按安全空值，新分享默认关闭。不得清理/替换原有服务数据，不自动重放未知AI请求，不自动合并main、发布应用、关闭总任务或宣称全项目Done。

你的包：AI聊天、完整Persona和独立试聊，从页面到真实后端保存/回读完成。

1. 保留既有AI失败证据和未知请求状态，读当前Ollama/模型/内存GPU/超时/提示词/输出解析/语义校验配置。检查独立修复863b653与当前源码实际关系，按差异应用并回归，不能盲目cherry-pick或重装。最多三次针对性修复；仍失败则交原条件、具体诊断与下一步，不以成功重试覆盖原失败。
2. 聊天、历史、新对话、离开返回继续、明确失败和结果核对、同意撤回/账号切换/草稿保留完整闭环。继续本地Ollama，不接Google云。只有明确请求结果才允许下一次发送；重复点击不能产生重复执行。真实模型至少三轮相关对话，离开回读并继续；本机无真实服务时完成代码/fixture/错误恢复并明确该项未跑。
3. Persona补齐名称、关系、Short Introduction、描述、性格、Communication Style、自定义兴趣、回复长度、语气、额外指令。沿用最多5个、唯一当前、版本冲突规则。新增/编辑/切换/更多操作/删除确认、删除当前警告和恢复默认表达、未保存离开提示都要回读验证。
4. Try Your Persona用当前草稿独立预览，不保存、不激活、不进入正式历史。自由字段只影响表达，不赋予数据权限、不覆盖系统规则。推荐解释只能用后端真实候选及现有允许上下文，绝不创造活动或扩大读数据范围。补齐AI Safety/Limited；视觉复用DU给出的全局主题，不另起主题系统。
5. 主改AI/Persona的feature、对应Backend合同/适配器和测试。提供现有builder及组合参数给JIN；本包无需等待好友/地图/Events参与系统开工。不要接手其他人的功能；集中审查沿用ZHOU→LI。

交付时给出一个集中审查包：源码提交/分支、变更合同、实际通过的用户流程、受影响Backend/Flutter测试与静态检查、可构建APK及剩余Blocked/Not Run。包内可多次提交，最终不用为每个按钮再开一个任务。复用现有Issue历史作索引，先读当前状态，不把关闭的准备票当成新功能已完成。不代表其他人已开工或已同意ETA。
