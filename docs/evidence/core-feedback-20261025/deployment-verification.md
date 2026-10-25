# v29 配套后端受控部署

日期：2026-10-25。授权：LI 明确回复“批准后端更新和受控验证”，已记录在
[决策](../../decisions/2026-10-25-li-core-experience-repair.md#v29-部署与受控验证授权)。
部署源码为 `0e60cb9b675e7607c7e5761c8dd78d09d1e889b8`，与 v29 APK 冻结源码一致。

## 实际执行

原 `enmori-group.service` 正常停止，未强制结束进程、删除锁或修改旧工作区。
原服务文件和受保护配置先备份到私有证据目录。新增单个 systemd drop-in，
只将 WorkingDirectory 指向已验证的私有候选目录；ExecStart、Node 24.19.0、
受保护配置路径、TLS、端口、账户、数据库及 Ticketmaster 配置均沿用。

20:56:01 SGT 新进程 PID 333834 就绪；最终读取仍为同一 PID、active/running、
NRestarts=0。就绪状态报告 Firebase 身份管理与 Firestore 读取正常，
本地 Qwen available、maintenanceHealthy，pending=false、outcomeUnknown=false；
活动 configured/enabled。没有把模型准备就绪表述为新聊天语义验收。

受控 firstFlow 仅绑定已核实的现有账号，窗口于 20:55:19 SGT 配置，
21:25:19 SGT 截止，每分钟检查。没有 push 配置或 installationRef。
成功启动后从持久配置移除 worker，保留账号和 firstFlow；本次进程继续持有
已冻结的截止时间，重启不会延长窗口，亦不会因过期 worker 配置拒绝整个服务启动。
进程提前重启会提前结束本次预约验证；未承诺持续后台预约服务。

## 集中核验

- 真实 Firebase Admin 只读前后快照：身份、owner 绑定、账户、兴趣和处理同意的
  SHA-256 一致；本人签到计数前后均为九条。同意仍为 accepted。
- 使用冻结后端的 `FirestoreSelectedReplyReader.prepare` 与实际 Firebase gateway，
  重新验证受控 Auth 后只读执行当地当天查询。20:58:09 SGT 返回 success，
  日期 2026-10-25、Asia/Singapore、limit=5、hasMore=false、sourceCount=1。
  身份、来源 ID、签到内容未写入公共证据；未调用模型或业务写接口。
- 实际 loopback HTTP 上 `/v1/me/profile/avatar` 和 `/v1/me/proactive-settings`
  对未认证 GET 均返回 401，证明路由装载并保留认证边界；不冒充认证后的功能验收。
- APK 内容、签名与此前独立 QA 记录不变。`candidate.json` 仅补充后端部署、
  当天来源读取和已通过二进制评审状态；此前 QA 记录的旧 manifest 哈希是当时快照。

私有证据目录：`/home/miku/.local/state/enmori-core-feedback-20261025/`。
`deployment-verification.json` 记录各原始文件哈希，其 SHA-256：
`1f4ec31a140125cd3c98639e3dc1871fc7e673af3c444b5ed9e6c0e6d07cf474`。
备份、身份及原始读取文件仅本机用户可读，不进入版本库。

## 验证边界与回退

未产生本轮真实 today → 本地模型 → canonical pair 发送闭环、头像上传、
系统推送或手机/跨网证据。仍须 LI/SHI 覆盖安装 v29 后验收，不自动操作手机。
未重跑已经通过且未变化的集中测试，不重新构建 APK；原结果及独立 QA 见
[最终评审](qa-final-verification.md)。

如需恢复旧后端，应先正常停止现服务，在没有未终结操作的前提下恢复私有原配置，
移除本次 `90-core-feedback-v29.conf` drop-in，再 daemon-reload/start。
保留原锁和未知操作证据；不得用强杀、清库、卸载清数据或盲目重发作为回退。
