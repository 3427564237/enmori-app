# 27 October 既有测试修复与 v37 手机验收

修复提交：`c16c26294c3d64f9bcd76808a451241e15889b52`。
授权见[本批决定的续作段落](../decisions/2026-10-27-li-remaining-feature-batch.md#test-repair-and-device-validation-continuation)。
本记录延续两份批次交付记录，保留它们当时的失败及未验收边界。

## 修复结果

本批先前记录的 14 项失败全部修复，涉及的四个文件共 37 项测试通过：

- AI unknown 四种布局/语言组合按已批准的 v31 自动有界读取更新测试，验证最多三次读取、不会 Send 或 Retry。
- stacked target 测试允许打开另一个本人话题，同时验证旧 Send 回调不执行，返回原话题后未知操作仍阻止 Send 和 Retry。
- Event 预览测试使用一致的认证会话，修复只覆盖用户 ID、默认认证流却随后退出的矛盾 fixture；生产会话清除保护不变。
- History 测试将 Home Today 的独立请求与目标 History 请求区分，旧会话的 pending 响应不再被错误地同时交给新会话首页。
- History 日期、回顾入口、记录和分页统一滚动，修复 320dp、200% 字号下固定 Column 溢出；测试实际点击滚动后的原记录入口。

## 验证与基线

| 范围 | 结果 |
| --- | --- |
| 原 14 项失败所在文件 | 37/37 通过 |
| Flutter 静态分析 | 无问题 |
| Backend 编译及全套离线测试 | 1,540/1,540 通过 |
| Flutter 全套，修复前独立 `739f4a2` 导出副本 | 1,438 通过，87 失败 |
| Flutter 全套，修复后 `c16c262` | 1,452 通过，73 失败 |
| 逐项失败集合对照 | 原 14 项消失，无新增失败；其余 73 项也在独立原始副本失败 |
| Android release | 构建成功，118.5 秒；不是设备验收 |

不能宣称 Flutter 全仓库通过。全量运行额外发现的 73 项超出前两批已记录失败清单，
仍未修复；精确列表见[保留的基线失败](../evidence/2026-10-27-batch-test-repair-v37/remaining-baseline-failures.md)。
[测试对照](../evidence/2026-10-27-batch-test-repair-v37/test-results.json)及
[日志哈希](../evidence/2026-10-27-batch-test-repair-v37/logs.json)保留了可复核证据。
所有 Flutter/Gradle 操作使用既有共享锁串行执行。

## APK 与受控后端

APK：`build/group-delivery-v37/ENMORI-group-v37-release.apk`，67,214,466 bytes。
包名 `com.enmori.app.group`，versionCode `37`，versionName `1.0.0-group20261027`。
SHA-256：`c2f48a76ff7c173cb4d642bb704cdeafed8d49a7ff4dd4eee2efb05f85eee8f6`。
非 debuggable，签名与手机已安装 v36 一致，无 READ_CALENDAR/WRITE_CALENDAR 权限。
Flutter 已重新生成原生插件注册，APK DEX 包含 Firebase Auth/Core/Messaging 注册路径及 Event actions 通道。

原 `enmori-group.service` 已从私有冻结候选 `service-candidate-c16c26294c3d` 启动，
复用原配置、数据、依赖和证书。Firebase Auth/Firestore 就绪，AI 维护健康，
没有待处理/未知模型请求，没有开启预约 worker 或推送。
新头像及完整地址接口未登录探测均为 401。保留原服务候选及原 drop-in；新增
`95-next-features-v37.conf` 只指定冻结工作目录，可经正常 stop/start 回退。
未改账号资料、头像可见性或业务记录。

## 手机状态

ADB 已识别 LI 的 vivo V2405A。首次 `adb install -r` 被系统拒绝：
`INSTALL_FAILED_ABORTED: User rejected permissions`，当时手机处于锁屏。
随后读取确认仍是 v36，原首次安装时间保留。已请求 LI 解锁并允许 USB 安装，
不绕过系统验证、不清除数据、不卸载旧版。

截至本记录，v37 尚未安装；地图完整地址搜索、系统日历编辑与取消、一周回顾、
最近浏览、搜索跳转等真实手机验收仍待完成。未执行跨网、两个账号的头像验收、
Firebase Emulator、独立评审、UAT、Release 或 Done。截图、UI XML、旧安装包等
设备私有证据仅保留在仓库外，未提交。
