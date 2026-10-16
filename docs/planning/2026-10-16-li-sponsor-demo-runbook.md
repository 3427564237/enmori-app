# 16 October Sponsor 演示操作单（历史草案，当前暂停）

**当前状态（16 October 晚间）：Not Ready / 暂停。** LI 已将演示延期到下周，要求优先完善应用；大部分开发与整合由 JIN 推进。原临时服务、凭证和测试数据已不可用；下面流程保留供后续准备参考，当前不能直接执行，也未完成连续两轮复现验收。v5 APK 已安装不代表服务仍在运行。[最新优先级及分工](../decisions/2026-10-16-li-application-completion-priority.md)。

这是一套固定测试账号、真实受控服务的演示。保留优化后的五个底栏、暖白／靛蓝主题、聊天气泡与 Note 编辑器。AI、Persona、Account、Note／Footprint 和 Activity 使用当前受控联网服务；Friends／Music 为明确标注的夹具，推荐和参与功能尚不可用。

## 演示前 2 分钟

1. 电脑接电并保持唤醒，USB 保持连接，手机解锁。使用 `com.enmori.app.personatest` 的 v5，不要打开另一个普通包。不要退出／关闭本次电脑上的服务。
2. 手机回到 ENMORI 的 **Home**。准备命令运行期间暂时不操作手机；命令可能短暂返回桌面，再恢复 ENMORI。
3. 在这台电脑运行下面的命令，等出现 `"result": "Pass"` 再开始。它核对本地与已安装 APK 哈希、原服务连续空闲状态、USB 反向连接、正式 9B 的版本／摘要／8192 上下文。模型已卸载时，只做一次手动空提示词加载，并显式开启当前服务的 Activity 源。它不发送用户消息，不重置数据、不延长 keepalive，也不自动重试未知操作。

```bash
cd /home/miku/.codex/worktrees/li-disclosure-receipt-20261015/ENMORI
python tool/li_sponsor_demo.py prepare
```

`formal9BResidentNow: true` 只代表检查当时已加载。模型空闲约数分钟后可能卸载；如果演示延期，请在 Home 再手动执行一次准备命令，完成后尽快进行 AI 部分。

当时经授权重建的测试账号有可读的 Check-in，包括 `I read a book today.`，并有一个激活的 Persona。演示前从 **Your own moments → Footprint** 和 **Manage Personas** 确认它们还在。不要批量删除、重建或用之前测试账号的数据。后续恢复时需重新验证固定夹具；历史配置为一条 Note、一个已激活的 LI Sponsor Persona，以及一个明确标注为 Music fixture 的兴趣。

## 固定演示顺序（约 6–8 分钟）

| 顺序 | 手机操作 | 给 Sponsor 的说明 | 成功标志 |
| --- | --- | --- | --- |
| 1，约 30 秒 | 从 Home 展示底部 Home／Friends／Check-in／AI／Me；进入 Me，再回 Home。 | “这是统一的移动端入口。” | 首页和个人页切换，选中项随页面变化。 |
| 2，约 45 秒 | 点 Check-in，展示 Note 编辑器；不保存新的重复记录，系统返回 Home。 | “用户可以记录自己的片刻；下面打开之前已保存的记录。” | 出现 Keep a little moment 和 Note 输入框。 |
| 3，约 45 秒 | Home → Your own moments → Footprint → 当天已有的 `I read a book today.` → Return Home。 | “这条是已存储后重新读取的记录，Footprint 按手机日期／时区查看。” | Saved Check-in 确认页面显示同一条 Note。 |
| 4，约 45 秒 | Home → Manage Personas，展示 Active Persona，然后返回。 | “Persona 控制后续 AI 的表达方式。” | 明确显示一个已激活的 Persona；不在台上临时删除／重建。 |
| 5，约 90 秒 | 点 AI，输入 `I read a book today.`，只点一次向上箭头 Send，等待完成。 | “这次请求通过真实受控服务，使用测试账号中符合条件的已保存 Notes 和激活 Persona。回答是实时生成的，措辞可能不同。” | 显示已接受的助手回答。不要背诵固定回答或要求逐字一致。 |
| 6，约 30 秒 | AI 顶部 Conversation actions → Reload messages。先切回 Home，最后再执行第 9 步删除。 | “重新读取已保存的会话，说明回答已被保存。” | 重新读取成功，显示同一组消息。 |
| 7，约 90 秒 | Home → Browse activities → 当前列表第一个可用活动 → 查看 Detail／来源说明 → View on Ticketmaster。 | “活动来自真实来源；原页面在系统浏览器打开。打开链接不代表报名或 Going。” | vivo 可能先显示跨应用跳转提示，按手机上的提示允许这一次打开；随后系统浏览器被唤起。第三方页面受当时网络及来源可用性影响，不承诺网页一定完整加载。 |
| 8，约 30 秒 | 通过最近任务／桌面图标切回 ENMORI。浏览器系统返回键不一定直接回到 ENMORI。若出现 Reload activities to continue，点 Reload；再返回 Home。 | “离开应用时会清除活动视图，回来需要显式请求最新信息。” | 旧 Detail 不继续留在画面上，Reload 后重新取数。 |

| 9，约 30 秒 | 回 Home → AI → Conversation actions → Delete conversation → Delete，停在 Conversation deleted. 页面。 | “显式删除这轮会话，准备下一轮。” | 删除确认完成，消息清空。 |

Friends 可以在删除前补充展示导航，但应明确说“这一部分目前是样例／夹具”。不要把空夹具、Music、推荐、报名／参与状态讲成真实端到端功能。演示核心无需复制链接；复制后链接可能留在系统剪贴板，不用于报名或支付。

## 再演示一次

当前客户端在删除后保持终态。确认上一轮 AI 已显示 **Conversation deleted.**，停在该页面，电脑执行：

```bash
python tool/li_sponsor_demo.py next-round
python tool/li_sponsor_demo.py prepare
```

next-round 先验证专用包、删除终态和同一原服务连续空闲／已确认退役，再只重启专用测试 App、重新消费私有交接。它保留 Backend 服务及已有 Note／Persona，不清除测试账号数据。看到 Home 后再演示；不手动新建重复 Persona／Note。每轮只主动发送一次 AI 消息；实时回答和活动列表内容允许变化。

AI 本轮使用的固定输入 `I read a book today.` 属于当前已批准的有限日常记录语言。开放式提问（例如要求确认 Note、建议或自由聊天）可能被拒绝；不要在现场将这一受限版本介绍为通用聊天助手。彩排中一次开放式指令被拒绝的记录保留。

## 现场恢复

| 情况 | 操作 |
| --- | --- |
| 手机显示 Waiting for the host’s private handoff／刚被系统杀掉进程 | 保持该等待页，电脑运行 `python tool/li_sponsor_demo.py connect`，得到 Pass 并进入 Home 后再运行 `prepare`。connect 不安装、清数据或停止服务；只复用原服务的私有交接。 |
| USB 重连后出现 phone_reverse_missing | 如果没有待确认结果或未保存草稿，通过手机最近任务关闭专用 ENMORI 后重新打开，等待私有交接，再执行 connect。不要重启服务或重发未知请求。 |
| 连接等待已超时 | 点 Retry connection，再执行 connect。不要在仍是 Home 的情况下重复交接。 |
| Activity 显示不可用 | 先在电脑 prepare，回活动页点 Retry／Reload。若来源仍不可用，现场如实说明并跳过该段，不换成伪装的样例活动。 |
| AI 正在处理／结果未知 | 不连点 Send、不新开会话、不重启服务。使用当前界面的 Check result；未确认终态就跳过本段并保留原操作供检查。 |
| 准备命令 Blocked | 按 reason 检查 USB、已安装版本或原服务；不要删除 preparation.lock、stop 标记或重启 Emulator 来绕过。空提示词调用若完成情况未知，准备锁会保留供原操作检查。 |
| 浏览器返回后活动内容消失 | 这是已选定行为，点 Reload。 |
| 手机被锁屏／切到其他应用 | 解锁并回 ENMORI；AI 如果取消或结果未知，沿用 Check result；不自动重新发送。 |

展示完成后，如需关闭 Activity 源，在空闲状态执行 `python tool/li_sponsor_demo.py off`。该命令只关闭当前服务的源，不停止整套服务，不清除无关浏览器／剪贴板内容。需要完整结束服务时由原操作人按现有停源／停止／回收流程执行。

## 来源和证据边界

- v5 客户端源码：`95eed0c101ac2adda0615123bd94698d62ef78ff`；新 Backend 源码：`160c95fbdb862f1c9d68f6eb2312bc3bd8b7df2e`（包含原运行修复与固定生成参数）。准备工具的后续修正单独保留在 Git 历史，不改变 APK 身份。
- APK：`build/distributions/li-sponsor-demo-20261016/enmori-sponsor-connected-v5-arm64.apk`；SHA256：`a15a3af172674e37f63d32a0fcd1ad94c4cdb52175f5d57f1b6da83fc70143c4`。
- 此流程依赖同一台电脑、指定 USB 手机及同一隔离服务。原服务现已不可用；连续两轮复现未通过，不可作为已就绪的演示交付。
- [本轮整合范围及客服确认的人类报告](../decisions/2026-10-16-li-sponsor-demo-composition.md)。先前 Not Run／失败记录保留；演示不代表独立审查、全应用 UAT、Release 或 Done 已完成。
