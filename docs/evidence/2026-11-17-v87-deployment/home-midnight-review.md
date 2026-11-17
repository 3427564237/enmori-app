# v86 跨午夜 Home 日期：独立观察与离线 RED

2026-11-18（Asia/Singapore）。本轮主任务继续用精确 v86 APK 配合 v87 后端验收；没有因以下发现替换正在运行的 APK。本报告保留先观察/只读定位/RED，再离线修补的顺序。修补拟纳入后续 v88，不能转记为 v86 已通过。本审查没有操作设备或服务。截图和最初日志仅在私有目录 `/home/miku/.local/state/enmori-v87-deploy-20261117/emulator/`，最终冻结和全量日志在同级 `v88/`。

## 实际观察

`logged-in-state-160005486979.png/.xml` 的收据时间为 2026-11-17 16:00:08.797 UTC，即次日 00:00:08.797 SGT。主任务在前一日 23:59:48 SGT 发出登录操作；截图中 Home 的 Today 旁仍显示 Tuesday, November 17, 2026。随后 `clock-observation.json` 记录 host 16:05:55 UTC、设备 16:05:54 UTC、时区 Asia/Singapore。该时差不能解释此前已过午夜约八秒的旧日期，但这份稍后的时钟记录并非同帧时间测量。

这是一条真实模拟器上“午夜后仍显示前一天日期”的有限证据，不宜直接归为一帧闪现。尚未连续观测该标题会滞留多久，也没有证明同帧签到查询具体使用哪一天。XML 的记录区只包含合并后的标题与空态，没有暴露日期 tooltip；不能据空态推定记录查询错误。

## 源码与批准边界

- 问题基线的 `lib/app/home_introduction.dart` 为 StatelessWidget，日期仅在 build 时执行 `formatFullDate(DateTime.now())`，没有日期订阅或自身午夜调度。
- `lib/app/home_today_provider.dart` 使用现有调度时钟安排本地午夜失效；每次实际查询仍通过 HistoryDevicePort 重新捕获 IANA zone 和当日日期。时钟只负责调度，不决定查询权威日期。
- `lib/app/home_today_section.dart` 监听该 provider，并在重读期间撤下旧记录；手动刷新按钮也仅使这一 provider 失效。
- `lib/app/home_shell_page.dart` 将 Introduction 和 TodaySection 放在相邻区块。后者自身重建不保证前者重建，因此记录区跨日更新与顶部日期可能不同步。这是与实际症状相符的明确机制；没有证据指向后端日期或原生时钟错误。

[15 November Home 调整决定](../../decisions/2026-11-15-li-home-layout-refinement.md)明确保留 owner/date/IANA-zone 读取、今日记录与刷新边界，布局整合不改变查询日。未找到允许 Today 标题跨日后固定显示前一天、直到手动刷新的批准规则。既有午夜测试是实现意图的支持证据，不将其提升为新的业务规则或响应时限。

## 永久回归证明

仅修改 `test/app/home_today_test.dart`：新增一个用例，将真实 HomeIntroduction 与 HomeTodaySection 挂在同一 ListView；旧 helper 新增可选开关，默认关闭，原用例行为不变。

1. 初始原生日期取测试运行时的日期，让初始标题和记录区一致。
2. 使用已存在的 `homeTodayClockProvider` 将调度起点设在同日 23:59:58；原生日期 Port 初始返回同日。
3. 将原生 Port 和调度时钟推进到次日，并返回次日合成记录；仅推进 WidgetTester 三秒，不更改主机或设备时钟。
4. 先验证第二次查询确实使用次日、Asia/Singapore、无 cursor，新日记录出现且旧记录消失；这些断言均通过。
5. 最后验证顶部标题显示同一新日；当前生产代码在这一断言失败。

定向新增用例：**0 通过 / 1 目标失败**。完整 `home_today_test.dart`：**13 个旧用例通过 / 1 个新增用例失败**。`dart analyze` 无问题，`git diff --check` 通过，没有夹具溢出、点击未命中或加载问题替代目标失败。

测试边界：它验证“标题和已刷新原生当日记录同步”，没有拦截真实 Dart `DateTime.now()`，因此不是系统午夜的完整仿真。若后续修复只强制重建标题、仍直接读不可注入的系统时钟，实际行为可能改善，但这个夹具仍会失败；届时必须按选定的日期设计调整测试接口，不能为过测篡改查询日规则。真实午夜问题由上面的 v86 画面独立支持。

`route_reliability` 独立只读审查确认新用例先验证原生查询与记录、最后才失败于标题，原测试断言未弱化；同时明确认可上述不可注入系统时钟的限制。没有由独立审查者重复执行设备或完整套件。

## 方案收敛与最小修补

依据[稳定候选继续修复授权](../../decisions/2026-11-17-li-stable-candidate-continuation.md)，主任务允许在根因明确后做最小客户端修补；[本轮 v87 部署决定](../../decisions/2026-11-17-li-v87-deployment.md)仍要求正在进行的组合验收保留原 v86 APK。因此离线代码修补与本轮设备验收分别记录。

曾按主任务选择尝试让 Introduction 消费现有 HomeToday provider，初轮 14 个该文件用例通过。但独立审查提醒 `HomeShellPage.daySection` 可以为空，无条件订阅会给原纯展示模式增加账号/签到读取依赖。主任务据此撤回该未提交方案；其 patch 和初轮日志仅私有保留，没有部署或构建 APK。不能用这次被撤回方案的通过结果代替最终方案回归。

最终仅修改 `lib/app/home_introduction.dart` 的日期展示生命周期：

- 保留默认本地 `DateTime.now()` 的日期含义，提供仅用于展示的可注入 `displayNow`，不把它作为原生查询权威。
- 使用组件自身的下一次本地午夜 Timer 刷新；午夜回调、返回 resumed、父级更新均重新取本地时间，取消旧 Timer 并按新的本地日期重排。
- dispose 取消 Timer、移除 lifecycle observer，回调检查 mounted。
- 原 greeting、新建签到按钮和 weather 的位置、回调、文案、样式保持；没有 Riverpod/Auth/Repository 依赖，没有触发新的读取。

`home_today_provider.dart`、HistoryDevicePort、查询日期/IANA-zone、最多三条、会话/前后台门禁、分页和写入语义均未修改。没有依赖、后端或业务规则变更。这关闭的是明确展示更新机制的缺陷，不证明原有数据查询或保存曾经出错。

## 最终方案回归

初始 RED 的一致性用例在最终方案中显式向展示时钟和原有午夜调度分别传入同一合成时钟，原生 date Port 仍独立提供查询日；继续断言只有两次读取、第二次使用正确 IANA 日、新记录替换旧记录以及标题更新。合成记录时间已调整为新加坡本地午夜对应 UTC，不晚于模拟当前时刻。没有修改系统或设备时钟。

新增 `test/app/home_introduction_date_test.dart` 以纯 MaterialApp 挂载标题，**没有 ProviderScope、账号或 Repository**，覆盖英文/中文连续两次午夜、后台跨日后 resumed 更新与旧 Timer 退休、dispose 后 Timer 和 observer 不再读取时钟。初始 2 文件 **18/18**；关联 13 个 Home/layout 文件 **123/123**；随后仅精炼记录时间夹具、生产未变，最终 2 文件再次 **18/18**。三个变更文件的定向分析无问题。

主任务随后授权在冻结源码/测试上执行一次全 Flutter 套件：`fvm flutter test --no-pub --concurrency=2 --reporter expanded`，**2022/2022 通过，退出码 0，报告时长 05:40**。期间没有修改生产/测试、升级依赖或构建 APK；结束后重新核对三个变更文件哈希与冻结值一致，`git diff --check` 通过。本轮新增五个永久用例，其余用例保留。

`route_reliability` 独立检查最终纯展示方案：默认本地时间语义不变，所有重排路径取消旧 Timer，dispose 清理完整，原按钮/天气使用最新 widget 输入，路由/账号/查询文件未动；没有阻止打包的实质问题。修补后的真实自然午夜尚未在设备重验，以上是自动化证据，不声称真机或最终 APK 的午夜通过。

## 审查快照

| 文件 | SHA-256 |
| --- | --- |
| `logged-in-state-160005486979.png` | `0f4451261ab1f9c4b761ea80669adb173b2e6d5d983054f4283243ef7dc4aba1` |
| `logged-in-state-160005486979.xml` | `b6f4bc89671d90a09682d5002bb73af4c8b4c116eb36379a9e909e9af96f7314` |
| `logged-in-state-160005486979.json` | `3474d0e3e2dd1aded39d22fb9885f186339042fbe76ba1f446e0097afdee71e4` |
| `lib/app/home_introduction.dart`（问题基线） | `74a12fd39f71221268d144d5f43096cfb0cb62c4249de20fba9a2b7282a36f80` |
| `lib/app/home_today_provider.dart`（未修改） | `98dc230ad835de4c3a05f440d5a78d5f2f4038fb44e53666ec8f8902b045e48a` |
| `test/app/home_today_test.dart`（RED） | `b6f6a9170024914836fc422c849c7fe281270b52be3595d07c01374e0de83498` |
| `home-midnight-header-before.log` | `15857db5efe5c2215e281cf0470a7f6ce41141e9328c85e296f98d6e072c57bf` |
| `home-midnight-header-file-before.log` | `086c7502c5363f6a8d163ed682e00cf8b6de2f3793e9ae1e8b50ce82ea63d73c` |
| `home-midnight-header-analyze.log` | `40e8dacf5ae9fbdac3e73b131254ae216b48a6e701db14efdd10998fa3176590` |
| `home-midnight-consumer-withdrawn.patch`（私有撤回记录） | `a9c80926474b93908afc92eb89991d54889edd99f22e37871ea98bc3b3dffa7a` |
| `home-midnight-header-after.log`（仅被撤回 Consumer 方案 14 例） | `18914c61e1f56991c1170e0aa6e14c35407c41c3731e1c38440996a38a9eb762` |
| `lib/app/home_introduction.dart`（最终纯展示修补） | `cb80bb3d6a36717bd1750fcefcf0609f2e35957531dfb2ee8e688455a58d2c02` |
| `test/app/home_today_test.dart`（最终） | `1fc241d0626019088dcff36a9a0bb8e3b7585e0cb9d276221955b4534b0cd67a` |
| `test/app/home_introduction_date_test.dart`（最终） | `a3aca6914bd0c7d56859bb742c824b4c1349bf3c01bf304da1322fe122867067` |
| `emulator/home-midnight-presentation-regression.log`（123 例） | `28c7069623c7c29a234655392edc28f27e118b71864b7bc4dbbe23af58c2d7de` |
| `v88/home-midnight-final-focused.log`（最终 18 例） | `5b5bab1bbade8ffe92c4c703392c21e223e3fae3d1a5080bf4c9eac4cde834ab` |
| `v88/home-midnight-final-analyze.log` | `5b3941b991da08492d98df6b7e1545b94b431599b28d49fcf0ce6f3488b1be0d` |
| `v88/flutter-full-v88.log`（2022 例） | `5ecfb8250fbe9e1d6acbbc6f40c749f03b86781a2910df28dce95bda7bad4459` |

## 后续产物与设备记录

最终修补已冻结在 `7ed8aa13a3d5b0b71b51670f5a5c4b1212fea5b2` 并构建 v88；原签名、原配置与安装哈希核对见[产物收据](v88-apk-receipt.json)。后续模拟器启动、详情过期／恢复的结果见[v88 独立复核](v88-emulator-review.md)。仍未进行 v88 真实自然午夜重演，不以这些一般回归替代午夜设备证据。
