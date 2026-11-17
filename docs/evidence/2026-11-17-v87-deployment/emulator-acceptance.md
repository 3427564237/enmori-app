# v86 APK / v87 后端：模拟器验收证据独立复核

本阶段的有界详情恢复和启动 Retry 流程有实际模拟器证据支持。onePA 的部分覆盖与完全不可用提示也已实际出现；尚不能据此关闭 onePA 详情故障、历史长等待回首页或账号同意状态异常，更不构成稳定版定版结论。

主线程执行操作，本审查者只读取已有私有收据、XML、Activity 信息，并实际查看下述关键 PNG；没有运行设备命令、访问网络、改变账号或触发模型请求。这不是源码／widget test 推断，也不是真机或真实用户观察。原图含账号和活动信息，保留私有，不复制到仓库；本文将所选活动称为“TM 验收活动”，不公开其名称、日期、场所组合。

## 固定版本与环境

- APK：**v86**，`com.enmori.app.group`，versionName `1.0.0-rc20261117`；安装收据核对源 APK 与安装包 SHA-256 同为 `cedbd33d3538810f4d7a24cadfeb65876c6188f280112f54d6b24027e8bb3270`，客户端源 `7d2c0b24f849900765a753d6ba5c3b6eb6d3c048`。
- 后端：实际挂载 **v87 / `9e4c3ca6c44bc243823ee3f0a5d34ae3ec76bb28`**；部署身份与实际挂载证据见 `deployment-independent-review.md`。
- 执行环境：专用 API 36 AVD `enmori_s2_api36`、`emulator-5556`，read-only/headless 模拟器模式；没有操作手机。15:48 UTC 安装收据确认安装前没有该包，安装后未启动 app；后续使用专用既有账号登录。
- 本文 UTC 时间均为 **2026-11-17**；16:00 UTC 后对应 SGT **11 月 18 日**。没有为详情到期测试推进系统时钟。
- 本文仅验收 **v86/v87**。自然午夜 Home 日期更新问题与后续拟定／构建的 v88 修复另记，不能将这批截图当作 v88 的通过证据。

## 详情自然到期、重读与网络中断

| 步骤与复现 | 期望 | 实际证据与结论 |
| --- | --- | --- |
| 保持已加载的 TM 验收详情前台，不导航、不改时钟；从 ready 观察到 after 观察经过 **312.94 秒** | 过期详情停止展示；原路由与用户计划保持，提供刷新入口 | `tm-detail-expired-160741826256` PNG/XML 显示 Event details 路由仍在，旧标题已移除，明确说明暂不可用及返回列表重开的恢复路径；官方链接 disabled，Reload enabled；Interested 的勾选与背景仍可见。前后 PID 相同，Activity 仍为 ENMORI。该有界场景通过。 |
| 在到期状态点 Reload | 立即显示加载，避免使用旧详情；完成后恢复 | 即时 PNG `detail-reload-immediate-160813988939` 显示 Loading Event information、禁用刷新及官方链接；两份随后 XML 同样确认。到 **16:08:25.722 UTC**，同一路由恢复相同标题及基础信息，官方链接／刷新重新 enabled，Interested 视觉选择保持。该次恢复通过。 |
| 已恢复详情上关闭 Wi-Fi 与 data，再点 Reload；等待明确终态后恢复网络并再次 Reload | 断网终态可理解、可恢复，不保留旧详情为当前结果 | **16:09:10.169 UTC** PNG/XML 已显示服务不可用和详情不可用，旧标题移除，Reload enabled、官方链接 disabled；计划区保留 Interested，同时显示计划读取错误和 Load your plans。恢复后的即时 PNG 显示详情加载、Checking your participation，参与按钮暂时禁用；**16:09:24.958 UTC** 再次恢复标题／基础信息、官方链接和 Interested，计划错误及检查提示消失。该次终态后恢复通过，脚本 finally 恢复 Wi-Fi/data。 |

这三步均未按 Interested、Going 或提交计划保存；收据记录 `participationWrites: 0`，操作脚本与之相符。“计划保持”在这里表示已见的 Interested 选择持续显示、重读后仍显示，不能扩大成所有计划记录或重复提交的全面验收。Interested 选中以 PNG 中勾选和背景确认；XML 的 `selected`/`checked` 不暴露该视觉选择，因此本节不宣称屏幕阅读器能正确播报选中状态。

恢复后的 TM 基础详情可用，但同屏 About this event 仍说明官方详情正文未能读取。因此“详情恢复”仅覆盖该活动基础信息、官方入口及计划区，不表示外部正文抓取恢复。没有点击官方链接验证外部网页，也没有证明所有 TM ID 或 onePA ID 都恢复。

`312.94 秒` 是两个已保存 UI 观察的主机 uptime 差，不是精确源数据年龄，也不是在到期瞬间连续录像观测到的延迟。该自然等待与另一次断网终态恢复是两个不同条件，不能把一次成功重试概括成永久稳定。

## 两轮离线启动与 Back 后重开

操作脚本 `startup-regression.py` 明确执行两轮：关闭 Wi-Fi/data → force-stop 并启动 → 观察 Service unavailable → 离线 Retry 再观察错误 → 开网 → Retry → Home。图片与 XML 相互核对，不只依赖收据 `passed` 字段。

| 轮次／步骤 | 已复核的实际结果 |
| --- | --- |
| 第一轮 | 16:12:33.660 错误页与可点击 Retry；16:12:39.038 离线 Retry 后仍为错误。开网后的即时 PNG `startup-online-retry-immediate-1-161243710859` **实际显示 spinner 与 Opening your space…，没有 Retry**。16:12:48.609 进入真实 Home：New Check-in、今日概览与底部 Home 页签可见，XML 中 `Home / Tab 1 of 5` 为 selected。推荐区此时仍可独立加载，不能称整个 Home 数据已齐。 |
| 第二轮 | 16:12:53.952 与 16:12:59.307 分别显示启动错误和离线 Retry 后错误。即时 PNG `startup-online-retry-immediate-2-161304015918` 同样为 **Opening、无 Retry**。16:13:08.503 进入真实 Home，XML selected 与 PNG 一致。 |
| 返回 Android 桌面后重开 | 脚本发出两次系统 Back；`startup-after-back-161309607544` PNG 实际为 Android 桌面，Activity 为 NexusLauncher，不能将其误写成应用 Home。重开后 **16:13:19.279** 先为 Opening、无 Retry，**16:13:23.302** 再到真实 Home。前后 app PID 相同，但 Activity/task 已重新进入；这是系统 Back 后重开，不是进程被杀后的状态保留证明。 |

两轮 force-stop 启动分别产生不同 PID；每轮从错误到恢复没有改换安装包或后端。启动用例与详情终态用例的脚本都在 finally 恢复 Wi-Fi/data。这些结果验证被主动制造的离线条件下存在清楚恢复路径，不能解释或关闭历史自然发生的启动异常／长等待后回首页根因。

## 兴趣编辑草稿的睡眠／唤醒等待（v86/v87 追加）

在已保存的 Music 选择上，输入测试搜索 `dance`，新增 Dance 但不按 Save。**16:16:51.751 UTC** 的 `interest-unsaved-before-wait-161648648913` PNG/XML 记录 Your interests、搜索原文、Dance 与 Music 两个 chip、Dance checkbox checked 和 `2 of 10 selected`。

脚本于 **16:17:08.345 UTC** 发送系统 sleep 键，留存 `interest-screen-off-power.txt`。该快照在睡眠键后约 108 ms 显示 `mLastSleepReason=sleep_button`、`mWakefulness=Dozing`、`mWakefulnessChanging=true`，而非仅凭操作命令推断睡眠。脚本使用 host uptime 等待至少 **450 秒**后才发送 wake 与 dismiss-keyguard，没有推进时钟或执行页面导航。

唤醒后 **16:24:42.631 UTC** 的 `interest-after-long-wait-162439484818` PNG/XML 仍是同一个兴趣编辑页，搜索 `dance`、Music 与未保存的 Dance、2/10 计数都保持。独立核对前后 Activity 为相同 ENMORI `MainActivity`、相同 ActivityRecord identity 与 task 9，PID 也保持 6393；此结论不只依据 PID。没有观察到回首页或草稿消失。本次有界保留场景通过，但不关闭历史自然回首页根因或推断进程被杀后的草稿可恢复。

收据 `actualElapsedSeconds: 454.28` 是 **sleep 记录到唤醒后截图完成**的 uptime 差，包含唤醒与采集时间；不能将其写成精确连续灭屏 454.28 秒，也没有连续电源采样证明全程显示状态。证据证明的是 sleep/doze 起始状态、至少 450 秒的脚本等待和唤醒后的保留结果。

随后实际 PNG `interest-discard-prompt-162522337228` 显示 Discard interest changes?，并提供 Keep editing／Discard。`interest-saved-reopened-162541258214` 虽然文件名含 reopened，实际 PNG/XML 是 **Home**，只能证明回到 Home 后仍显示原选择，不能充作编辑器重开后搜索清空的证据。该次自动检查保留 `AssertionError`；没有导航请求跟踪足以区分操作未生效、采集时机或产品导航问题，原因仍未归属，不能用后续成功抹去，也不据此认定产品缺陷。

后续已补齐真正的编辑器重开：**16:28:21.303 UTC** `interest-reopened-confirmed-162817785875` 的 PNG 明确是 Your interests，只有原 Music chip、`1 of 10 selected`，搜索输入空白且 Dance 未勾选；XML 确认 EditText 的实际 `text=""`、存在 Remove Music、没有 Remove Dance。ActivityRecord/task/PID 与此前相同。私有 `interest-discard-receipt.json` 记录明确选择 Discard、未触发 Save，并将此前检查失败与本次结果分别保存。至此，本次明确丢弃草稿后读回原选择、搜索清空的闭环有证据支持，不能描述成第一次自动重开就成功。

最终 **16:29:16.353 UTC** `v86-final-home-162913114060` PNG/XML 已回到真实 Home，Home tab selected，原 Music 选择可见；该结束状态没有兴趣 Save 操作。以上仍属 v86/v87，不能借用为 v88 构建或验收结果。

本段主收据 `interest-long-wait-receipt.json` SHA-256 为 `5621aad14e3b585df60ece0de7ba597433163aafb042c604a87ad2dd30130ad9`；power 快照为 `33a14425e36f9100314aefd218e1f63bbce069365a2b158ed941ee69ec63427f`；等待前／后 PNG 分别为 `5c734564a1d2db8e8553c036cb74a77b664d3a480e510c54ceb142511c5aaa84`、`d62625b8437b34fbd59106de3fdc253eb3df403861801c1b0d666b94ec1b1229`。没有兴趣保存提交，版本仍是 v86 APK / v87 后端。

补充 Discard 收据 SHA-256：`fc95af3aa2e6df23088fe863891dc44a5335755f8f3d56cfa2656d4fa066d9e1`；真正重开 PNG：`0dc6a123b7fa89638a1bfac9ec3399bf728ac1abb35c8d3a28fcd8d801c3fa39`，其 XML：`6a191659ad627a8d51a791c3509899eaaeb6c45a7b39a872a6677436005306f9`；最终 Home PNG：`f34f25ba3df146213a0a0092cb0eeb45a5e00d4febc389c4037975d27b309d5c`。

## onePA 降级与 Home 的实际状态

- **Browse 部分覆盖**：`browse-current-160134764185` PNG/XML 同时显示 Ticketmaster/onePA available，并明确说明部分 onePA 兴趣搜索未能加载、当前活动范围不完整；列表中已有可见活动。此处是部分覆盖，不能写成 onePA 完全成功或完全不可用。
- **Home 完全不可用提示**：`home-after-recovery-161433619617` PNG/XML 显示实际 Home，New Check-in 与导航仍存在，同时明确显示 “onePA is temporarily unavailable. Results only include sources that could be loaded.” 该提示属于当次 Home 查询的来源降级，不证明整个 onePA 网站或所有查询同时不可用，也不表示 app 整体 Service unavailable。
- 这两个观察发生在不同页面、不同时间与读取条件下；可以确认两类降级提示都能被用户看见，不能直接据此计算来源成功率、推导由 partial 到 unavailable 的单一因果，或声称已经验证 onePA 完全恢复。

UI 中加载、终态、来源提示和恢复入口没有在这些默认英语／浅色截图中出现阻止上述任务的文字重叠。大字体、深色、中文、TalkBack、键盘遮挡和其他尺寸没有在本批证据里完成验收，保持未验证。

## 证据收据与未关闭项

| 私有文件 | SHA-256 |
| --- | --- |
| `prepared-emulator-receipt.json` | `f2ff734ae1fa7eaf981a8209647ef78bf8cdb694ac5eaff3c2208bab456ee871` |
| `detail-expiry-receipt.json` | `d0bf66b94cb5ed123af66c936d9d6639bdcffe4fad2a4a73e852fe91ff1bf2bd` |
| `detail-reload-receipt.json` | `96e499c03e51a6d50c5cc86b35cddfa86ec5980aef403987add65c55d2121018` |
| `detail-terminal-receipt.json` | `2ac5329414b9604770c74a30bf08e4a8858870e5bfcd0f977cccc590d5024dc9` |
| `startup-regression.json` | `9e6c4a99f0701978a68dc6b2a3cec7b833e70edf5b5bca45af50fb74a049ecdf` |
| 第一轮即时 Opening PNG | `c3034f03b0256e6c242868946abc997974c41bf83761d2edd29ea2043c9321ab` |
| 第二轮即时 Opening PNG | `c048219a2b113c09f8ad8126015f23497b0b27a4addebb484aa750cecad090c5` |
| Browse partial PNG | `02305df4681c2db6d5b78a9d7cd59e8fb5299e8bb7190a004d68b431a899dda7` |
| Home unavailable PNG | `bfecfae28d5242c4e174cc2f7a222fd564aca1aaa60a536cb11e3fbb80356f63` |

仍未关闭：onePA 详情真实恢复、来源长期可靠性、历史自然启动／回首页异常的因果、自然午夜日期更新、专用账号同意投影差异，以及最终同一 APK 的完整真机关键流程。详情自然等待没有回首页的本次观察不能否定历史异常；修复中的 v88 也必须保留独立版本证据。账号异常的具体界限见 `account-consent-investigation.md`，本节成功的导航／恢复观察不抵消该问题。
