# v88 APK 与 v87 后端：独立产物及模拟器审查

2026-11-18（Asia/Singapore）。本报告只审查主任务提供的本轮文件、截图和 XML，没有操作模拟器、手机或服务。私有原始材料位于 `/home/miku/.local/state/enmori-v87-deploy-20261117/v88/`，截图、账号信息、活动标题与计划数据不复制进仓库。以下时间均为 UTC，除非另有说明。

## 产物与测试对应关系

- 源码提交 `7ed8aa13a3d5b0b71b51670f5a5c4b1212fea5b2`。独立比较提交内容、工作树和测试收据：唯一生产修改是 `lib/app/home_introduction.dart`；两个测试文件及三个文件 SHA-256 一致。修补范围和自动化边界见 [Home 午夜审查](home-midnight-review.md)。
- 最终 APK：`/home/miku/Downloads/ENMORI-stable-candidate-v88-release.apk`，SHA-256 `b49733713eeadc5947b73f5a31197c484408f942e96ba4d7ec517689acc9e8d2`，70,838,168 bytes。独立计算 Download APK 与当前 release 输出哈希，均匹配产物和安装收据。
- 独立运行 `aapt dump badging` 和 `apksigner verify --print-certs`：包名 `com.enmori.app.group`、versionCode 88、versionName `1.0.0-rc20261118`、非 debuggable，证书 SHA-256 `0fa59aeaa9ce03a830405ce79136b4abc3d62510fbb8360c8ebf7c88a82966ee`。原发布配置哈希为 `eff899f2578b9023f3d2d6a9b4d2b5351153c5b3ea98bd09d38c8611b9805404`；在三种架构的 `libapp.so` 中核对到该配置的后端入口。未公开配置值。三种架构的编译 Dart 库均与 v86 不同，并匹配本轮产物收据。
- 读取并核对最终全套日志：`fvm flutter test --no-pub --concurrency=2 --reporter expanded`，**2022/2022 通过，exit 0，05:40**。测试收据记录的是构建前检查点，所以其中 `builtApk/installedApk=false` 不是对后续安装的否定。
- 首次 Gradle 构建本身成功，但缺少原 group-release 构建环境，产出普通包名；**安装/交付前的身份校验拒绝该包**，未复制为候选或安装。保留 `rejected-build.json` 和初次日志。补回原构建环境后 27.2 秒重建成功，没有为此改变源代码。
- 主任务的安装收据记录 16:31:48.492，在 owned `emulator-5556` 上以保留数据方式从 v86 更新至该精确 v88，配对后端 v87，未操作实体手机。本独立审查核对的是其已捕获收据，没有再次连接设备确认。

## 已完成的 v88 有限观察

| 场景 | 本轮证据和结论 | 边界 |
| --- | --- | --- |
| 断网启动与离线 Retry，重复两轮 | 16:33:05/10、16:33:26/32 的截图/XML显示 `Service unavailable` 和可用 Retry；离线重试未冒充成功。 | 不代表所有启动故障或服务延迟已排除。 |
| 联网后 Retry 的即时反馈 | 两张 `startup-online-retry-immediate-*` PNG 均已独立目视：品牌、进度环和 `Opening your space…`；旧错误/Retry 没有继续停在画面。 | 这是指定时刻的视觉反馈，未据此计算精确请求时长。 |
| 两轮启动恢复 | 16:33:21.421、16:33:41.303 的 PNG 均显示 Home 内容；XML 同时确认 Home 页签 selected 和 `New Check-in`，不只按存在 Home 字样判定。两个离线/恢复周期内 PID 分别为 8098、8488。 | 推荐区仍明确提示 onePA 暂时不可用；Home 恢复不代表外部来源恢复。 |
| Back 后再打开 | 16:33:46.854 截图为系统桌面，XML 为 Launcher；重新打开的第一帧仍在 Opening，16:33:56.017 才恢复 Home。前后 PID 8488，未误把第一帧算通过。 | 仅本轮返回/重开链路。 |
| Browse 来源降级 | 16:36:58.612 的真实列表显示 Ticketmaster available、onePA unavailable，且有 Ticketmaster 活动卡。 | 仅证明目录降级可见且仍有可用内容；未验证 onePA 真实详情恢复。 |
| Ticketmaster 详情初始成功 | 16:37:14.068 的 PNG/XML 为 Event details；可见与列表一致的活动核心信息、正式来源链接、Your plans、既有 Interested 选中状态。补充正文仍明确提示官方详情未能读取。 | 既有选中状态不是本轮新增计划。主任务未操作参与写入；本观察也不证明外部官方正文已恢复。 |
| 同页自然过期 | 从初始成功到 16:42:26.964 相隔 **312.9 秒**（host monotonic uptime），PID 始终 8488；脚本未调时间、未导航。过期 PNG 明确显示详情不可用及恢复办法，旧核心信息撤下，Your plans 与原 Interested 视觉选中状态保留。XML 确认正式来源按钮仍在，但 enabled/clickable 均 false；顶部 Reload 可用。 | 外链是禁用而非移除；没有操作已保存计划，也不把保留画面推断成新的写入成功。 |
| 过期后显式 Reload | 16:42:39 的即时 PNG 显示 `Loading Event information…`；16:42:42/46 XML 确认 Reload 与正式来源按钮都禁用，计划区仍在。16:42:50.866 恢复同一核心详情和原 Interested 视觉状态；来源/Reload 都重新启用，恢复后的 XML 与初始成功 XML 哈希相同。 | 仅点击 Reload，未点参与按钮。成功恢复的是该 Ticketmaster 核心详情，官方补充正文仍有不可读提示；采样时间不是精确 HTTP 耗时。 |
| 断网终态后恢复网络并显式 Reload | 16:43:09.275 的 PNG/XML 明确为不可用终态，**没有 Loading**；旧核心信息撤下、来源链接禁用、顶部 Reload 可用。原计划选择仍可见，同时有参与读取错误和 Load your plans，不将其说成断网时仍完成了最新读取。脚本先断言该终态，再恢复网络并点击 Reload；即时 PNG 显示详情 Loading 和 Checking your participation，参与按钮灰化。16:43:24.027 恢复同一核心详情和原 Interested，参与错误消失，最终 XML 与最初成功完全相同。 | 证明本轮明确终态后的恢复，不是加载途中接回网络。脚本未操作参与按钮；官方补充正文仍未读取成功。 |

启动脚本已独立阅读：每轮先 force-stop 后断网启动、离线 Retry，再恢复网络并显式 Retry；唯一启用按钮匹配；使用时间戳生成新截图，不覆盖旧帧。Home 成功断言要求页签选中和实际内容共同成立。finally 执行网络恢复命令。详情自然过期、两次恢复及断网终态的 activity dump 均为同一个 `MainActivity`、同一 ActivityRecord 和 task，PID 均为 8488；没有回首页或重建 Activity 的证据。

## 尚未完成或不能扩大声称的项目

- 该精确 v88 的详情自然五分钟过期、显式 Reload 和终态断网错误后联网恢复均已按上表观察，范围限于本轮 Ticketmaster 活动核心详情。
- 新包的**真实自然午夜**尚未重复。当前 Home 普通显示 November 18，与截图所在新日一致，但不证明持续停留跨午夜已现场通过。午夜/连续跨日/resume/dispose 的修复证据是冻结源码上的自动化；此前 v86 的真实午夜缺陷和 454 秒长等待不能移记到 v88。v88 本轮也没有长时间草稿保留试验。
- 没有真实用户观察、实体手机验收、AI 模型调用或全产品定版结论。onePA 的真实恢复、其他业务流程及后端整体结论由相应验收记录分别承担。

## 清理收据

执行前已独立审查 `cleanup.py`：共用 `ui.py` 将所有设备命令限定为 `emulator-5556`，入口检查 qemu；逐项比较原始八项设置，并核对安装版本 88 后才停止 group 包、删除唯一自有 UI dump、提交 emulator kill，随后最多等待 40 秒确认断开。没有 clear/uninstall 或账号写入。read-only/no-snapshot-save 的依据仍是此前 owned AVD 启动收据；清理脚本不重新验证这些启动参数。

现已核对实际 `cleanup-receipt.json`：16:43:43 开始，Wi-Fi、mobile data、字体比例、屏幕超时、system locales、屏幕尺寸、density、persist locale 八项与初值逐项相等；唯一临时 UI dump 已移除，16:43:47.472 确认模拟器断开。timezone 当前为 Asia/Singapore，但初值文件未记录时区，因此不写成时区与初值相等。

16:44:08.295 的独立退出观察记录 ADB 仍断开，找不到该 owned AVD/5556 的匹配 emulator 进程。原 exec session 4476 查询返回 `Unknown process id 4476`，`exitCodeObserved=null`；因此确认清理和进程不再存在，**不声称观察到正常退出码 0**。上述是主任务捕获收据的独立文件核对，本审查没有再次操作设备。

## 私有证据校验

路径相对上述 `v88/`；文件本体均不进入仓库。

| 文件 | SHA-256 |
| --- | --- |
| `v88-apk-verification.json` | `11aa3b4f3f87267855bc1d3e2afec7ef11b0624b934b5b50c3fe327428f71119` |
| `test-verification.json` | `800ce8e8818e184f0d92111742b31510cecde77b61687d2b190001948c849bd2` |
| `flutter-full-v88.log` | `5ecfb8250fbe9e1d6acbbc6f40c749f03b86781a2910df28dce95bda7bad4459` |
| `rejected-build.json` | `9f9a5952dc1462131e9a1127ef0e3a169babc7f737ff93a9673f013ab20de53e` |
| `build-v88-initial-wrong-package.log` | `58dba40ca1e968373e81dd593e9e3db23091027a11d8817fe5296c55cf8b42d6` |
| `build-v88.log` | `9fb0c66b366e7bb1529024f0608beca8b7edfc461f2b021a92e75bcbddc10a67` |
| `emulator/installed-apk-receipt.json` | `fcf27cc778b4944051b879256b464fd09bc24d4c46d5072a7ee2a31aa87bf1ac` |
| `emulator/startup-regression.json` | `dc7436e5d512cd221c99a81ce0f9f3bae38b3a6c7114dffbe2c636276be52c55` |
| `emulator/startup-regression.py` | `d547aaaefae38131b000a319fa38fb3a5fc8cc172bacd5ecd93c0b842e2b609f` |
| `emulator/startup-offline-1-163302300820.png` | `bf25f478306d6735c4661b1c84ffa139eed161a24af093f6fe54c7a96ba6de15` |
| `emulator/startup-offline-2-163323634713.png` | `e46189c12b33f22aaaf81c5b0af0f783d2b0828714818180e8bb3b150df7588b` |
| `emulator/startup-online-retry-immediate-1-163315673545.png` | `0ca62f571d3446bdaceb1119dc48f893726235b2ea9cb07f2136d4ee888cc116` |
| `emulator/startup-online-retry-immediate-2-163336724353.png` | `b8e1a34c65e530679f450a887c67b4487105d43fa8b1035ebeee755f6a339c04` |
| `emulator/startup-recovered-1-163316305259.png` | `73bbc7f859976971b5ae432ee7e1862ebeb50f67b9adfb97e7e0f46b025501a8` |
| `emulator/startup-recovered-2-163337363846.png` | `629d65548020e6ee0ef3f903797cd578907687a790b3e14c261946dad38b74d8` |
| `emulator/startup-after-back-163342342084.png` | `ea7fbdd9f5e060fe2e7ced74797cbe4e0cbbd487c78a98c3ddaa73b769ad104a` |
| `emulator/startup-back-reopened-163353063741.png` | `629d65548020e6ee0ef3f903797cd578907687a790b3e14c261946dad38b74d8` |
| `emulator/v88-browse-current-163655456230.png` | `0cfb3fc7fdc40483c45b1a5cd086ab06dddb8580c5957a7d81b979555ff22d83` |
| `emulator/v88-browse-current-163655456230.xml` | `c2be49ed1307dfdcbe1b67b8232c87cebfc45935202d988a4be700bef997b741` |
| `emulator/tm-detail-ready-163710935062.png` | `9f665a5a0a8f4535368be3656b0cd5816e387770ef5f7fba00b884d377870114` |
| `emulator/tm-detail-ready-163710935062.xml` | `67f23cfa65cf64ee6373b87f2e9dd367bc0c07b3ae30f8e5d35ff28a1cb6725e` |
| `emulator/cleanup.py`（执行前审查） | `f69d2afc995fb845ed9c985732d05fb0bdb4dd3ef57293a91f1c0fe1b15b7ee7` |
| `emulator/ui.py` | `afe131cce0daa30818a2c96e3efcc97104e6ce1092251021b42eed4eb1f7f586` |
| `emulator/detail-expiry-receipt.json` | `ab7f2164bf0a2c04be851b478215eb51ca82ca01361ecd71c08b3dd84a6243a6` |
| `emulator/wait-detail-expiry.py` | `09ba77f464e5dd425c25894f656bdbb8643a3dbb5ba6542998b936f154ba22c3` |
| `emulator/tm-detail-expired-164224070147.png` | `5d24e8b14da3864a192a6028c255d7b66f5109d7e26534d09671158a7359791c` |
| `emulator/tm-detail-expired-164224070147.xml` | `43e13858855d63ba2b49f43c9e40e242b3190ea72714578a3d591e5480808c35` |
| `emulator/detail-reload-receipt.json` | `11a305c7c4d84f905292e7a66130b3b125fa007daa51f630831160249c09f403` |
| `emulator/detail-reload.py` | `7a8fa49dc8d14693aa74003ff176bf080151339408dd9d57386428cd95cd7532` |
| `emulator/detail-reload-immediate-164239158302.png` | `e42f450d48fe7ab0a74f6e4352d7c2b2c716fad1c3fb837bc406b4f1d6556e67` |
| `emulator/detail-reload-164247582379.png` | `9da9847cb917a745d9ee8f01b2ff7badd400c80d8df6c8cc023ac4809343aaf3` |
| `emulator/detail-reload-164247582379.xml` | `67f23cfa65cf64ee6373b87f2e9dd367bc0c07b3ae30f8e5d35ff28a1cb6725e` |
| `emulator/detail-terminal-receipt.json` | `1f2e9d1de9427f7f86dfa3afff6a9e418a32945c7a447e0211f5f55b758a23c5` |
| `emulator/detail-terminal.py` | `19d9528c5960561682eefc7461b52a4f5fd296b9f6bdada6c4dd61c1065cd007` |
| `emulator/detail-terminal-offline-164306212728.png` | `c3f455cc4fcde5b243ed1e9f2c694f27ce2e410a48b27ecace1b5a8971c93bdd` |
| `emulator/detail-terminal-offline-164306212728.xml` | `2fc87e390fe6f73216962b5f564c7bf54f054bf2d4f43368ca75c36a2f9b345c` |
| `emulator/detail-terminal-reload-immediate-164314016700.png` | `85e83114334a4b476703196d0d90a2367f49898f460cf1a26309d9c519b0a4ea` |
| `emulator/detail-terminal-restored-164318634016.png` | `c569ab2ed871df20c0c82ca8c65ed2dbf30f010685cdf31e8695e2c218f8c2cb` |
| `emulator/detail-terminal-restored-164318634016.xml` | `67f23cfa65cf64ee6373b87f2e9dd367bc0c07b3ae30f8e5d35ff28a1cb6725e` |
| `emulator/cleanup-receipt.json` | `41e5fb7f1e7b06ae81d49da8229508158c479317cd739fa76c5a8aa16ab21e82` |
| `emulator/emulator-exit-observation.json` | `6db7552d798c459d36bbfdcd2708591b2e7c6afbb344865008b97475972587b2` |
