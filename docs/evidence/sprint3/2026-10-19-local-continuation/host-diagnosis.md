# 本机继续执行：当前事实

依据S-PM-1019-LI-LOCAL-FIRST，从cf9605e继续；设备V2405A通过USB连接。LI明确提供本次临时管理员授权，通过系统pkexec窗口建立临时root会话，仅作下列限定诊断读取，之后exit关闭；没有增加sudo规则、保存口令或永久授权。

- Ollama监听loopback11434，当前/api/ps为空；RTX4060 Laptop 8188MiB，检查时118MiB已用。此为当前空闲，不是旧请求成功/取消证据。
- 旧v2原服务状态closed/cleanupConfirmed=true，operator退出0、端口空闲、内外profile移除有回执。v3退出1，profile移除有回执。bee5dd7退出0。后来的nonai状态仍是断电前running，但本轮进程/监听不存在；不得将陈旧状态当现行运行，不重启或清掉其目录。
- 既有root诊断store仍有31条记录；只读取允许的阶段/状态汇总，不复制原记录。旧请求生成done_confirmed一次、HTTP200响应一次、output_validation passed一次，随后AI_REPLY_REJECTED/502一次。因此模型执行已产生结果，应用拒绝回复；没有原正文，不能证明最早拒绝的具体句子。
- 现store失败原因CAPTURE_UNAVAILABLE、CAPTURE_HOST_RESTARTED、CAPTURE_RUNNER_STALE。小时timer active，最近系统清理exit1；lastSweep已更新，永久失败标记仍在。当前主机已重启，原helper刻意把重启当连续性事件，不能用重新启动模型解决。
- 同store已有19Oct10:30修复COMMITTED/FINAL，明确原31条记录未变、实际UID边界/维护核验通过；旧故障根因仍标not-established。修复后的helper哈希5d9c1ffad26948d1248af8dffb5fd066f903f55fd3426014dc6a4e8f39ffedcd，与现安装匹配。

当前AI阻塞边界：既有批准的恢复程序是单次、两阶段、需独立审查的root恢复例外，已执行；重启后的新事件没有现成可重复使用的受审恢复入口。本次管理员认证提供操作权限，不自行解释为允许静默清flag、initialize、换store或删除故障历史。故本轮不重放模型请求，也不更改系统unit成功标准。后续应把重启恢复做成保留原失败/原始到期期限、核验实际清理、独立审查后显式确认的同store维护入口，避免每次重启都临时手改。仅此AI入场部分等待该明确恢复边界；核心持久环境与真机验证继续。

863b653已按当前源码适配：只允许固定偏好疑问句头避开“私人事实断言”检测，保留句子其余内容及独立安全检查，后端严格构建和43项相关测试通过。不是原回复根因结论，也不是三轮真实聊天通过。

## 后续PM简化决定

以上旧诊断事实和恢复边界保留。后续S-PM-1019-LI-AI-MVP（docs/decisions/2026-10-19-li-ai-mvp-simplification.md）明确取消新简化聊天组合的root诊断入场前置与项目词句审查。旧store不再阻塞新组合，不据此改写原31条失败、清flag或声称旧链修复。新真实运行结果另记simple-chat-and-events.md。
