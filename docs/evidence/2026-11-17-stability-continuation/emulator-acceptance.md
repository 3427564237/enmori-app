# v86 APK + v85 后端：模拟器独立验收复核

2026-11-17，独立复核主任务产生的截图、UI XML、脚本与 JSON 收据。本审查者未操作模拟器、手机或服务。所有原始材料保留在私有目录 `/home/miku/.local/state/enmori-stable-continuation-20261117/`，没有将截图、账号标识、记录正文或敏感日志复制进仓库。

## 版本与证据边界

- APK：正式 release v86，`1.0.0-rc20261117`，非 debuggable；安装收据和交付包收据均指向 SHA-256 `cedbd33d3538810f4d7a24cadfeb65876c6188f280112f54d6b24027e8bb3270`。主任务以保留数据方式更新原 v84 模拟器应用。
- 客户端来源：`7d2c0b24f849900765a753d6ba5c3b6eb6d3c048`；[统一验证记录](verification.json)分别保留全量 2017 例和此前一次旧布局测试输入失败的处理过程。
- 本轮匹配后端：v85，源提交 `9fb0e7c9bfc27ca860da66c83e39d9f6245564f4`，启动前实际挂载 manifest SHA-256 `b3a07766fb2cfbbc011683f0d1fd2b909ab609ab48b82aa8225912ba75bc4246`。本文件不把这些观察视为尚未部署 v87 的验收。
- 设备：Android 模拟器。不是物理手机或真实用户观察；不报告成功率。时间均为收据 UTC；抓取时间不是 HTTP 请求精确耗时。

本轮有限通过：同一 Ticketmaster 活动页面的五分钟内容过期、显式刷新、断网明确失败后的显式恢复；两轮启动错误后的等待反馈与联网恢复；一次返回桌面再重开；中文 2× 好友标签及空态。仍不足以宣布稳定版定版。

主任务在 15:30:42–15:30:52 UTC 再次核验实际运行容器挂载，[当前后端收据](current-backend.json)仍为同一 v85 源提交和 manifest，未部署 v87。该公开收据 SHA-256 为 `fe31930e73e908b9d912be8ce824a283a59a3d76c7a46b095793f0859d6169d1`。

## 详情过期与恢复

| 阶段 | 独立检查所得 | 证据 |
| --- | --- | --- |
| 已加载 | 15:16:43.006：所选公开 Ticketmaster 活动的标题、日期、场地和来源可见；官方链接和顶部 Reload 为 enabled/clickable；Your plans 可见。 | `v86-detail-ready.png/.xml`、同前缀 `-time.json` |
| 自然过期 | 15:21:57.297：距已加载抓图 314.3 秒，前后 PID 相同，未拨快时钟。核心详情撤下，显示明确不可用和重载指引；Your plans 仍在。官方链接仍保留在布局中，但 XML 的 enabled/clickable 均为 false；顶部 Reload 可用。 | `v86-expiry-receipt.json`、`v86-detail-expired.png/.xml` |
| 显式重载中 | 15:22:53.145：显示 Loading Event information；旧内容未重新出现，Reload 和官方链接禁用，Your plans 保留。 | `v86-detail-refresh-pending.png/.xml` |
| 重载恢复 | 15:23:02.419：同一已选活动的核心标题、日期、场地和来源恢复，无 Loading/详情不可用，Reload 和官方链接重新可用。 | `v86-detail-refreshed.png/.xml`、`v86-detail-refresh-receipt.json` |

这支持当前页面的客户端过期及显式恢复路径。观察期间没有切换活动或点击参与状态；标题一致、连续页面操作和收据相互支持，但这不是独立抓取 HTTP ID 或请求数的证明。不能由一次重载恢复推导长期外部来源可靠性或重复点击幂等性。

恢复图中下方仍可见官方详情正文无法读取的提示。因此恢复的是核心活动信息，**不代表官方详情正文恢复，也不代表 onePA 恢复**。官方链接可用与正文采集可用是两种不同状态；本轮没有打开外链。

## 断网终态之后恢复

独立读取 `emulator-detail-terminal.py`，脚本先等到 `terminalUnavailable && !loading`，才开启网络并点击已启用的顶部 Reload。没有在仍加载时提前把状态记为失败或恢复。其详情操作只有读与刷新，没有点击 Interested/Going 等参与动作。

- 15:23:05.974：原活动核心内容已加载。
- 15:23:13.619：断网刷新后截图和 XML 均为明确不可用、无 Loading；旧标题消失，Reload 可用，官方链接禁用。Your plans 区仍可见，但同时出现计划读取失败及 Load your plans，不能将“区块保留”写成“计划重读成功”。
- 网络恢复后，`detail-terminal-explicit-reload-immediate.png` 明确显示详情 Loading 和参与状态检查中，相关按钮禁用。
- 15:23:21.997 的第一次恢复观察仍在加载；15:23:27.440 才观察到同一核心活动内容恢复，Loading 消失，官方链接和 Reload 重新启用。最后截图的计划读取错误不再可见。

`emulator-detail-terminal.json` 的 `passed: true` 与上述画面一致。这个终态失败→联网→明确重载→恢复路径在 v86 + v85 上有限通过；不能代替对原 v83 活动异常根因、onePA 恢复或保存结果的验证。

## 启动 Retry 等待与返回导航

独立读取 `emulator-startup-regression.py` 并目视两轮即时等待和最终恢复图：

| 轮次 | 断网启动与断网再试 | 联网 Retry 即时画面 | 最终画面 |
| --- | --- | --- | --- |
| 1 | 15:24:34.689、15:24:37.597：Service unavailable + Retry；XML 中 Retry 可用。 | `startup-online-retry-immediate-1.png` 明确显示 Opening your space 与进度指示，旧错误和 Retry 不再显示。 | 15:24:45.274：`startup-recovered-1.png` 已进入 Home。 |
| 2 | 15:24:50.909、15:24:54.723：相同错误与可用 Retry。 | `startup-online-retry-immediate-2.png` 同样显示等待页，没有旧 Retry。 | 15:25:03.787：`startup-recovered-2.png` 已进入 Home。 |

即时等待只有 PNG，没有对应时点 XML，因此不从该截图推导具体路由字符串或控件语义树。脚本的 `home` 字段只检测底栏 Home 标签文字；这一检测单独不足以证明当前页为 Home。本复核额外目视两张最终截图，确认它们实际显示 Home 内容和选中底栏。Home 到达后，部分推荐区域仍在加载或显示 onePA 降级信息，不能写为首页全部数据完成。

主任务随后从 Home 连续返回两次，`startup-after-double-back-activity.txt` 显示系统 Launcher 为 resumed/focused，应用 task 不可见；不是只凭文件名推测退出。重新启动后先观察 Opening，再于 15:25:14.468 回 Home；前后 PID 相同。这是一次返回桌面再进入的有限验证，**不是进程死亡、长时间后台或所有草稿恢复验收**。即时重试期间没有进行并发重复点击，故本轮模拟器画面不证明请求去重；相关门禁仍依赖独立组件回归。

## 社交、AI 和设置恢复

社交详细根因、失败测试、修复与同配置对比见[好友布局审查](friend-layout-review.md)。独立补看 `v86-friends-returned-zh2x.png/.xml`：“我的好友”已选中，标签完整，搜索/筛选入口及明确空态可见，无加载指示。结合此前实际切换到 Activity、Discover 的画面，三个标签和返回均已在简中、字体 2×、约 360dp 下得到有限验收。

该账号未开启好友发现，主任务没有为造出建议内容改动设置。因此 SC-08 非空列表末尾提示的位置仍只有组件测试证据，不能标为新 APK 实际卡片验收通过。

`v86-ai-settled.png/.xml` 显示 AI Limited，以及需在设置审阅并允许处理的说明。本轮没有改变该许可或触发模型调用，**没有验证真实新对话的 Saved 后状态**。SC-12 的本轮改动仍以[AI 组件审查](ai-read-state-review.md)和自动化回归为证据，不以这个受限入口画面声称 AI 通过。

`display-restored.json` 于 15:09:46.306 记录字体恢复 1.0、语言 en、density 与初始值一致，未点击账号隐私保存。两个中断脚本均在 finally 恢复 Wi-Fi 和移动数据，JSON 记录 networkRestored；本审查只核对这些已有收据，没有读取当前设备设置，也没有把 earlier 收据推断为后续所有时点的状态。

## 最终清理

独立读取 `emulator-cleanup.json`：主任务在关闭前逐项核对 Wi-Fi/移动数据、字体/屏幕超时、density 均与初值相等，语言已恢复 en；已停止应用并删除本轮自有 UI dump。首次发出关闭后仅等 2 秒就检查断开，断言过早失败；收据保留这一过程，没有将它记为应用回归失败或隐去。15:32:30.211 UTC 的后续明确连接检查为 `connected: false`，确认本轮自有只读 AVD 已关闭。主任务另报告其自有 emulator 执行会话随后 exit 0；本审查不曾重新操作设备。

## 待完成与已知限制

- 模拟器最终关闭与临时设置恢复已由上述清理收据确认；首次过早退出检查的失败历史保留。
- 若后端改为 v87，需另记实际部署身份及匹配验收，不能继承本文件的 v85 成功结论。
- onePA 实际详情恢复、SC-08 非空建议位置、真实 AI 新话题保存后状态仍缺本轮最终组合证据；不能由 Ticketmaster 或组件通过替代。
- 没有物理手机、TalkBack、全机型、真实用户观察，也没有在本轮对账号全部历史数据做一致性审计。本文件不作稳定版定版结论。

## 关键私有证据指纹

原文件位于文首私有目录；以下仅记录文件名和 SHA-256。

| 文件 | SHA-256 |
| --- | --- |
| `installed-v86-receipt.json` | `3f0e05af7e4422b2ac2d4d2d46de76a67b8ee519d0e90ea3e7d6789d468bc996` |
| `v86-apk-verification.json` | `173c4caf5a740bff7c7eb1b0cb8140917a7aaecc22fbb74218d76944ac2b9ce2` |
| `v86-expiry-receipt.json` | `fee7b9a0efed9768155e1e1138700eba5710640b54fa4bc5161d805fb1c4399d` |
| `v86-detail-refresh-receipt.json` | `895f69170993b58aa3d5e343d49f113f9b8ec531def5f17936a662d7ff26bb41` |
| `emulator-detail-terminal.json` | `38081af58ff7fd59bbf7242a3ebc927e62fd1ab9735cb63f9d1654968fd6cf95` |
| `emulator-detail-terminal.py` | `3899b341797e8fe718af525b697da6056480fb746f0c53cbe0de539d4db45709` |
| `emulator-startup-regression.json` | `30062eeccf47ea73cb987a964642a922226e68fbe1f26cdbba6d1cec95b00401` |
| `emulator-startup-regression.py` | `38e5348fab673d5fb24fe83052d63ed6c1e31c0ae16f66e6c46b514667ee2b27` |
| `startup-after-double-back-activity.txt` | `1189bdacb03dc8a50116a4cdc7617dcae53fa6965aa3a7a126b1f5788fd25912` |
| `display-restored.json` | `e6b2ef6ff56f8244da842de8cc8d94e101241e6d5825af7f5b56f2f23df8d32c` |
| `emulator-cleanup.json` | `c348a9a983a704db7b37a556f021f00feb1bad37aa050f467a9cdddbaa6a0e7c` |
| `v86-detail-ready.png` | `baabf3a809e825bf8a739519acb551a3230012d70e1105e16610b7c8056dbb7d` |
| `v86-detail-expired.png` | `27a92e1e5b00e3b4d4154596ccc7a47306e9b8eda7299dba1e33f5a23ff1e9fa` |
| `v86-detail-refresh-pending.png` | `3095e77b152f20bf1996fc888d612542642cf325db925897a236e4f40e05cb95` |
| `v86-detail-refreshed.png` | `b50e861f41f521a04fd2d0416e7090cc4fb9345425e672bdf0b7b168ed24e355` |
| `detail-terminal-offline.png` | `94c4ad5280a780fd02e5e3d1f8c93ebb0e73318bbe6955c80ef1986a0c4ad1d8` |
| `detail-terminal-explicit-reload-immediate.png` | `8d789dd6f1bc6b9e9906616ca5b99acf08634238f285688a9adbd3d5b2e98839` |
| `detail-terminal-restored.png` | `b50e861f41f521a04fd2d0416e7090cc4fb9345425e672bdf0b7b168ed24e355` |
| `startup-offline-1.png` | `d7fdc4be002d38398819eb41a9760e479dd6261b6ab8230a4d7c301aa36a1414` |
| `startup-offline-2.png` | `d7fdc4be002d38398819eb41a9760e479dd6261b6ab8230a4d7c301aa36a1414` |
| `startup-online-retry-immediate-1.png` | `4a8f2148c5da1047614ac7a83c0506c5f506bac3e487a335a130e0265b639e21` |
| `startup-online-retry-immediate-2.png` | `17ac472526f0a99477dfe6fe2a767aecc3dd82773dd96ce0321ea7187ce3b9c9` |
| `startup-recovered-1.png` | `0d85af44d5461ceb04229111789155a1d4282b38c2409da96cd05daff8e62462` |
| `startup-recovered-2.png` | `c86bbaa975e9d22275b28f387b6c1d8463517c302e5ab31821b5ff549a64d066` |
| `startup-back-reopened.png` | `94940d6c6bbb247e4121edf68c07718d7f16fe843f94f8e80dc0adb034dafa1e` |
| `v86-ai-settled.png` | `9487122be87333fc64f5d673819b7a16112eb3d436f9ea90788b606dc67670df` |
| `v86-friends-returned-zh2x.png` | `8206551002b5aa24ffa02247f3484ad8be16532a0c8992a933beab8e31076870` |
