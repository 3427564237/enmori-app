# ZHOU 对 LI 兼容修正与 AI/Persona 接线的复核

2026-10-20，SGT。按 [PM 任务来源](../../../decisions/2026-10-20-pm-zhou-integration-followup.md) 执行。

已提交 [PR #165 APPROVE 5582994488](https://github.com/3427564237/enmori-app/pull/165#pullrequestreview-5582994488)，绑定当前 head **`a822091071ddd206eea4d1041b7349006214ffb6`** 和核心修正/接线源码 **`52f494bbfd02f85dadbdf0e9f38189772be16edf`**。批准范围仅 LI 对 ZHOU 贡献的 legacy 兼容修正、两处 composition 及历史 router 测试滚动适配；不代表其后 Home/全局 UI 或全应用验收。

## 源码结论

| 位置 | 来源核查与判断 |
| --- | --- |
| `backend/src/ai-conversation/application/capture-context.ts` | blob `fc72f57` 与原交付基线 `927f775` 的文件相同，恢复 schemaVersion/tone/responseLength/formatStyle 四字段复制并 freeze。LC02/15 的 name/id canary 被省略，不因多余源字段拒绝旧同步视图。简化聊天/草稿仍各自严格校验 expression，未把自由字段变成权限或恢复自动 Note 读取。 |
| `backend/src/bootstrap/retained-core-runtime.ts` | blob `26e00ed` 与受测 `52f494b` 一致。复用同一 gateway、auth 和 LocalChatTransport 物理 lane；stop 先关闭 preview 入场，current() 合并 admission/healthy/原请求门禁；迟到权限读取不能借停止后的请求派发或交付。没有第二模型、自动重发或新写入 Port。 |
| `lib/app/controlled_demo_app.dart` | 受测 `52f494b` blob `3df22c9`，当前 `a822091` blob `0743697`。差异仅后续删除旧说明条的 24 行，preview imports、同 auth/client/baseURI 构造及 ProviderScope override 未变；接入 connected consent/session 资格。后续 UI/APK 结果不套用为 v9 新实测。 |
| `test/app/ai_conversation_shared_router_test.dart` | blob `e6c3649` 与 `52f494b` 一致。正常滚动分别找到 user/reply，精确消息内容和 execute 仅一次的断言仍在；恢复阅读位置无需要求旧用户消息同时出现在懒加载视口。 |

相对 `52f494b`，当前 Backend、API、依赖/锁文件均未改变。上述逐段源码复核未发现本范围新的阻断缺陷，没有制造或重复实现已由 LI 完成的修复。LI 对原 #164 的 P2 仍是原 head 的历史真实问题，此复核只确认其在 #165 中被纠正，不自批原分支。

## 既有验证的归属

已读取 #165 内提交的 `verification.md` 与 `receipt.json`，核对 testedSource、APK、结果和日志 SHA 清单：

- LI Backend 首轮 **505/506**，纠正后仅 lifecycle **78/78**；Flutter 首轮 **340/341**，滚动假定更正后仅 router **7/7**。子集重叠，不合并计数，不宣称首轮全量重新通过。
- LI 记录了实际保留的隔离 Auth/Firestore、现有 qwen3.5:9b、完整字段保存回读/选择/删除、三轮相关对话、正常 export/import 重启回读；v9 手机继续同历史会话及未保存草稿预览，随后读回正式历史和保存状态未被预览改变。
- 这些是 **LI 执行、`52f494b` / v9、专用合成账号受控环境**的限定证据。ZHOU 本轮未调用模型、主机、设备或重复上述检查；独立 review checkout 不含 LI 私有 `build/li-zhou-review/` 原始日志，未声称重新哈希这些主机日志。正式提交的结果与 SHA 清单可读，不等于拿到了原始文件。

保留真实 Firebase 用户 AI、真实 Event 候选解释、完整设备流程、原维护 degraded 状态及后续 v13 未安装等各自限制。此批准不构成发布、main merge、任务关闭或全应用 UAT/Done。
