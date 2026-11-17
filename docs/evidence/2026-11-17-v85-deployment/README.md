# ENMORI v85 后端部署与 v84 模拟器回归

后续记录：[v86 客户端及 v87 后端候选修复](../2026-11-17-stability-continuation/README.md)已完成本地回归；v87 尚待单独部署确认，线上仍为本页的 v85。本页保留原 v84／v85 观察，不转记为新组合验收。

2026-11-17，Asia/Singapore。**已按批准方案部署 v85，实际挂载身份及现有服务 owner 核对通过；仍不能定版。** AI 资金授权没有续期，未操作用户手机，没有模型验证发送。onePA 和最初启动失败的未明部分继续保留。

依据：[本次部署批准](../../decisions/2026-11-17-li-v85-deployment.md)。此前的 [v85 修复、2,048 项测试与包审查](../2026-11-17-backend-expiry/README.md)、[v84 客户端修复](../2026-11-17-stable-followup/README.md)和 [v83 真机审查](../2026-11-17-stable-candidate/README.md)继续有效，各证据类型不互相替代。

## 实际部署

| 项目 | 实际结果 |
| --- | --- |
| 客户端 | 原 release **v84 APK**，本轮没有重新构建。模拟器安装后拉取 SHA-256 为 `b544dde5ba9060b5fb20ce822ec19a6f44e6e96c9c268e3664122afed0a581d0`，与交付包一致。 |
| 后端包 | **v85**，源码 `9fb0e7c9bfc27ca860da66c83e39d9f6245564f4`；包 SHA-256 `7b2ffcccbf6c129ccaa839de1fced57125e2c41e33a5f746dc444189fcbe4140`。 |
| 活动 selector | `2026111713582385.zip`，替换此前 v78 `2026111704554378.zip`。 |
| 实际容器挂载 | SSH 读取 manifest 确认 version85/source9fb0e7c9，SHA-256 `b3a07766fb2cfbbc011683f0d1fd2b909ab609ab48b82aa8225912ba75bc4246`，与审阅包一致。 |
| 修改范围 | 沿用已审阅的单文件过期快照修复；远端包 8,570 条目逐一校验，仅对应 JS、source map、manifest 三项不同。本轮没有再改生产源码、依赖、API 或配置。 |
| 维护过程 | 22:02:17 SGT 提交停止；核对 ARM 完整当前实例清单、平台 stop 序列、停止页及本地服务关闭后切换。22:04:12 提交启动；22:07:28 首次观测受保护 API 返回规范 AUTH_REQUIRED，随后已认证账号接口 200。 |
| owner 与账目 | 现有单 service-owner 接管和租约延续核对通过，配置指纹及资金授权、费用和完整 attempt 历史保留。租约延续不是 AI 额度／有效期续期。本次操作者没有 seed、arm、购买、释放未知预留或发起模型调用。 |
| 回滚 | 未触发；已保留精确 v78 包和同 owner 停止／排空／回滚流程。 |

[部署收据](deployment-receipt.json)、[HTTP 就绪观察](http-readiness.json)、[模拟器 APK 身份](installed-apk-receipt.json)。控制台 Running、container running 和接口真实可用分开记录。第一次 SSH 检查发生在启动未就绪时并失败，保留原收据；后续实际挂载检查通过。不得把维护时长理解为未来重启 SLA。

## 详情过期后的同 ID 实测

按[预先记录的步骤](exact-detail-validation-plan.md)，先停止模拟器中的 ENMORI，再取一代 Browse；期间测试端不刷新 Browse／推荐／Home。onePA seed 明确 available、覆盖不完整且存在采集时间，满足本次带 freshness 快照的前提。底层 warm 不会自行发布共享 projection；其他使用者的共享并发请求没有完整可观测性，因此这是受控操作窗口，不是全局独占证明。

| 操作者电脑上的真实 HTTPS 观察 | 结果 |
| --- | --- |
| 22:08:28 onboarding／profile | 200，2.306 秒／0.875 秒。 |
| 22:08:31 Browse | 200，**75.173 秒**，25 项；两来源 available，onePA coverageComplete=false。此首次来源等待仍是可用性限制，没有被快照修复消除。 |
| 过期前同一 Ticketmaster stable ID | 200，6.980 秒；核心详情成功，补充内容 detailsStatus=unavailable。 |
| seed 完成后等待 **310.680 秒**，首个请求仍是同一 stable ID | 200，6.467 秒。没有先用 Browse detail 刷新共享代。 |
| 同一 stable ID 再明确读取一次 | 200，5.731 秒。 |
| 随后同一 Ticketmaster Browse detail | 200，5.852 秒。两种详情响应的身份均离线精确核对。 |
| 后续 onboarding／profile | 200，1.525 秒／0.594 秒；响应正文哈希与本轮前值完全一致。 |
| onePA 同一 ID：过期前、过期后 stable／Browse detail | **503，14.045 秒／0.649 秒／0.570 秒**。未关闭、未称恢复。 |

原始 ID／账号正文保存在私有目录，仓库只含安全状态、时间、请求关联和哈希：[接口收据](api-verification.json)、[独立复核](exact-detail-independent-review.md)。与 v78 上一轮实际所选行逐字段比较后，Ticketmaster 和 onePA 的 browseId/eventId 均相同；曾把不同字段的哈希直接比较的中间判断已在独立报告中撤回，不能用哈希口径差异声称换了活动。

这组结果支持已定位的过期快照修复在当前部署上的有限验收；不代表所有活动均可读、持续服务可用或 onePA 故障已解决。新代码不改变 live-at-admission 后读取途中到期仍拒绝的规则。

## Android 模拟器结果

API36 / x86_64、只读 AVD、精确 v84 release APK，连接本次实际 v85 后端。只使用既有专用测试账号，不操作用户实体手机，也没有真实用户研究或成功率统计。

本轮没有发起资料、兴趣或参与状态编辑。正常登录／启动仍经过既有认证和幂等账号支持记录初始化，不能把 GET 观察表述为服务内部绝对零写入。

- 维护期间登录后出现明确 Service unavailable 和 Retry；服务恢复后显式 Retry 显示 Opening your space… 等待页，再恢复 Home。后续一次在线冷启动也到达 Home。[启动判据与独立核对](startup-acceptance.md)。
- Home 和 Browse 实际显示 onePA 暂不可用、仅含可加载来源／Ticketmaster available 的提示。正常点击 Browse 卡进入 stable-ID ParticipationEventPage；所选活动标题与 HTTP seed 对应行一致。核心内容显示，补充官方内容不可读有明确提示。未点击官方外链或 Interested／Going。
- 成功详情保持 **312.610 秒**后，仍在详情页，旧来源内容清除、官网按钮禁用、Your plans 保留；显式刷新显示等待并禁用重复刷新，随后恢复同一活动。没有点击参与或外链动作；本结果不替代已有保存状态的全面服务端审计，也不覆盖恰在 4:59 刷新的竞态时点。
- 首轮断网只捕获到加载态，联网后内容恢复，单独记为加载中断恢复。另一次独立补验在 22:32:14 已捕获**终态错误且无加载文本**，然后才恢复网络并显式刷新，22:32:29 同一活动恢复。两轮证据不混合成一次成功，也不据截图推断请求次数或 HTTP 耗时。
- 两轮断网冷启动及离线 Retry 均落到明确错误；恢复网络后显式 Retry 显示等待，再到 Home。随后 Back 退出到 launcher，重开恢复 Home。此处验证恢复行为，原 SC-15／SC-09 因果继续未明。
- 22:30:50 Browse 又显示 onePA available，但明确部分兴趣查询未加载、范围不完整。这只证明目录状态变化，没有完成 onePA 详情的成功恢复。
- 22:33:03 确认模拟器 Wi-Fi／移动数据均恢复启用，移除本轮临时 UI dump，关闭本轮只读 AVD；没有清除账号或改动用户手机。[模拟器汇总收据](emulator-regression.json)、[清理收据](emulator-cleanup.json)。

## onePA 与最初启动失败：仍未查明的部分

onePA 在本次快照过期之前已失败，排除了“该次失败只由已过期入场快照造成”的解释。过期后的失败变快，且 operations-status 在两个 after 详情请求开始前已经记录 onePA unavailable；[来源状态观察](source-status-observations.json)的 lastObservedAt 为 22:14:58，lastSucceededAt 为 22:09:45。可推测后台目录刷新／准入相关，但该字段同时汇总多个来源操作，没有阶段／请求关联，**不能断言具体目录、静态 HTTP、浏览器或解析步骤已定位**。

原 SC-15 启动事件仍缺当时的 token／HTTP／解析／账号支持记录初始化事务证据。该初始化与 AI service-owner 租约不同；源码复核未找到新的可复现缺陷。当前成功仅证明当前请求链成功。受控维护、断网故障可以验证界面处理，不能追认历史原因。

没有新增生产诊断日志、访问被拒绝后的绕过、延长 TTL 或自动重试。若要继续缩小阶段，需另行审阅已有方案中的有限阶段采集及其字段、存储、保留和清理验证；此次仅部署明确批准的包。

## 定版状态与交付

**仍不定版。** onePA 的真实详情恢复未通过；最初启动失败和 v79 历史回首页仍未归因；AI 旧授权的已核验期限仍为 2026-11-18 00:00 SGT，按要求未续期；注册条款、TalkBack、实际照片头像、跨设备等既有缺口不因本轮部署而关闭。

| 原问题／优先级 | 本轮状态与下一步 |
| --- | --- |
| 后端已过期快照拒绝新详情／本轮应修 | 最小修复已部署；本地回归、当前服务同 ID 过期后重复读取及 v84 可见恢复通过，按本报告边界验收。 |
| SC-03 onePA 详情反复失败／阻断本次定版 | 同 ID 过期前后均失败。目录恢复不关闭详情失败；继续需要受控阶段关联证据，不能据耗时猜定超时或解析根因。 |
| SC-15 最初启动失败、SC-09 历史回首页／继续调查 | 当前中断与重入恢复通过，历史原因仍未明。新阶段日志仍按原方案审阅字段、保留和清理，不能顺带改变启动门禁或持久化规则。 |
| SC-04 AI 授权期限／原定版阻断项 | 按用户要求不续期、不发送验证请求；期限未改，本轮不关闭。 |

其余原问题的等级、证据和未验证范围沿用 v83／v84 报告；未把本轮活动与启动回归扩大为全流程重验。

候选 APK 继续为 `/home/miku/Downloads/ENMORI-stable-candidate-v84-release.apk`；已部署后端原包为 `/home/miku/Downloads/ENMORI-backend-v85-candidate.zip`。后续不能用另一 APK 或未核验后端替代本轮组合的验收记录。私人截图、账号响应和敏感日志始终在仓库外。
