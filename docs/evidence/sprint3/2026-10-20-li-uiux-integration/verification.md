# LI — #163 UI/UX 审查与候选整合

2026-10-20，Asia/Singapore。按用户要求审查并整合 #163，必要检查集中执行一次，不合并 main；手机需要操作时再通知。

## 源码与审查边界

- 审查对象：[#163](https://github.com/3427564237/enmori-app/pull/163)，head `413fee3dfe8c60cb86e4b736b140e243d534c384`，base `900ca6fcdefb77e9aa95d96fa80994ebf826398f`。
- 接收分支：`souma/li-zhou-runtime-20261020`，整合前 `7124dbb4be3f98bb1225de32b9d10c5a57db82a1`。保留原 AI/Persona 整合及本机证据。
- merge commit／本次测试及 APK 源码：`dd2fbebc4bc554c538824794d6788cca822861de`。没有冲突，没有手工改写来包；19 个新增/修改文件的 blob 与 #163 完全相同。
- 本次为 LI 的代码检查和组合验证。#163 同属 LI 代码，**不同作者 DU 正式审查仍待完成**，不将本记录当作作者自批或整个候选的验收。
- 依据：AGENTS.md、ARCHITECTURE.md、适用核心产品决定、[本包 UI/UX 授权](../../../decisions/2026-10-20-li-shared-uiux-increment.md)与原交付回执。使用仓库 Flutter code-review 和 ui-ux-pro-max 工作流；没有扩大产品、依赖或平台范围。

## 结论

在本次六个生产 Dart 文件及相关测试/证据范围内，未发现需要阻止候选组合的新增缺陷。Home 减少重复装饰、突出 Check-in，明确 AI/Footprint 入口；没有 callback 的入口移除跳转箭头并解释不可用。AI 文案删除自动读取 saved Notes 的错误暗示。共享 StatusPanel 区分加载、无内容与失败，保留调用方既有手动 Retry/Reload。统一表单错误/聚焦错误边框、多行辅助文案及按钮形状。

活动控制器、Repository、源数据有效期、权限、并发和恢复命令没有改动。相对于此前真实运行源码 `52f494bbfd02f85dadbdf0e9f38189772be16edf`，`backend/`、`api/`、pubspec/lock、`lib/app/controlled_demo_app.dart` 与 `lib/app/router/` 均无差异。因此没有重复后端、Ollama或真实邮件验证，也没有重启服务或写入业务数据。

检查了原包保留的真实 Flutter widget 图片：Home 375 竖屏、667 横屏、下方操作、未接线入口、空/失败状态、表单错误。它们是组件预览，不是本次手机截图；没有把该表单预览的两字符校验当作真实 Display Name 产品规则。原图与源码均保留。未扩展 TalkBack、极端字体或额外设备专项矩阵。

## 一次集中检查

Flutter 3.47.2，使用已有锁文件和依赖；未重新解析或升级依赖。完整命令、退出码及本机日志 SHA 见 [receipt.json](receipt.json)。

| 检查 | 结果 |
| --- | --- |
| 九个定向 Flutter 文件 | **97/97 通过，只有这一批，没有修复后重跑**。包括共享 UI、推荐 Retry、Home/Events 返回、活动路由、账号资料/设置保存与未保存退出、注册/Check-in、Persona/AI 路由和 Footprint 路由。 |
| `flutter analyze --no-pub` | 全量静态分析通过。 |
| 八个来包 Dart 文件格式 | 零修改，通过。 |
| merge 相对第一父提交 `git diff --check` | 通过。 |
| 标准 debug APK | 一次构建通过；没有 shader 绕过或修改 SDK/依赖。继承 Kotlin/Gradle 未来兼容提示保留，不算构建失败。 |

97 是本批实际测试总数，不与 #163 作者之前的 47 项、#165 之前的 AI/Persona 检查相加。没有新增只验证实现细节的测试。

## APK 与本机状态

- 文件：`build/deliverables/uiux-oct20/enmori-uiux-v10-debug.apk`。
- 包名：`com.enmori.app.coretest`，versionCode `10`，versionName `1.0.0-uiux20261020`。
- SHA256：`9320ec59cdd395753b02acf59b45845f6e61ede6efd9264e3dea291a9d336081`，173,768,437 bytes。
- APK 包含 #163 UI 与既有 ZHOU/LI 接入。源码绑定上述 `dd2fbeb`；后续证据提交没有进入这份已构建 APK。
- 本轮 `adb devices -l` 未检测到设备，**v10 未安装、真机 UI/键盘/系统返回未验证**。下一步连接并授权 USB 调试后集中安装/观察；vivo 安装确认仍由用户操作。没有重复发起安装。
- 对既有 coretest 只读 status：ready=true、Auth/Backend 可达，aiConfiguredAvailable=true；继承的 aiMaintenanceHealthy=false 保留。没有停止、重启、清库、模型请求或业务写入。真实账号 v8 服务未操作。

## 剩余边界

本候选仍是 [Draft #165](https://github.com/3427564237/enmori-app/pull/165)，目标为 #162 整合分支；没有合并 main、公开发版或关闭任务。DU 的 LI 代码正式审查、v10 真机结果分别待完成。SHI 的外部报名 callback-reset P2、参与保存/参与者分页，JIN 功能整包，以及真实账号 AI、真实活动候选解释和旧 AI 维护问题仍各保留原状态，不由视觉改动代为关闭。既有 v9 手机/模型结果只归属其原源码与 APK。
