# UI 基线与本机恢复检查点

功能源码：`51ecb5c11ff23ce3bf36fbf9280d2e00646ac857`，基于 `67d3ec1`。本次 UI 先落地，其他包直接继承；未重新导入已经包含的 HCI 7848b5a。APK 与精确摘要见 receipt.json；后续交接文档/本机默认 APK 路径变动不改变该 APK 的 Flutter 功能源码。

## 实际完成

- 共享深绿/暖白主题、本地 Playfair Display 及 OFL 许可；正文保留无衬线。全局按钮/输入/导航/弹窗/抽屉/反馈统一，首页和账号表单对齐。
- 七个受影响 Dart 文件 analyze 通过。执行 controlled_demo_app_test、sign_in_lifecycle_test、auth_email_page_test，共八项既有检查。首次运行七过一失败：旧 fixture 缺 `/v1/me/settings` 导致 AI gate 不显示输入框；补齐严格响应后仅重跑受影响 controlled_demo_app 文件，四项全部通过。没有移除 gate，没有重复全量后端/模型测试。
- 构建 v7 debug APK，aapt 包名/版本与 apksigner 检查通过。沿用 coretest 包名和签名，无新增运行时字体请求或第三方包。已有 Kotlin/SDK XML 工具链警告不作为本轮新缺陷修复。
- 实际 Flutter Home/Sign-in widgets 输出预览并人工查看。预览加载本地 Playfair、Flutter SDK Roboto/Material Icons；无后台业务，不是 vivo 截图。临时截图脚本初次在 fake-async 文件 I/O 阻塞，改为 runAsync/同步落盘后成功输出两张图；不把这次截图生成算作业务测试。

## 数据与主机

最初发现服务已停止，last-stop 记录 14:12:34Z 导出失败。日志可证明 Firebase CLI 收到 SIGTERM、Firestore JVM 提前退出及导出请求失败，但不能证明是谁或哪种宿主操作发出的终止。旧 snapshot 文件仍是 13:27:53Z；先复制旧 snapshot 和失败日志到私有 recovery-before-ui-baseline，再从原 snapshot 启动，无清库或补造数据。

两个原测试账号登录成功，资料/设置/月历均返回 200；主账号 2 条、第二账号 0 条，两者推荐数据同意均拒绝。随后使用 core_local.py stop 正常停止，14:48:51.345Z exportConfirmed=true；再次 start --events --ai，ready=true。只证明旧已导出数据恢复和本次正常停止/启动，不证明异常停止前每一笔未导出写入均保留，也不声称已修复外部强制终止。

AI configured available=true；aiMaintenanceHealthy=false 是保留的旧维护异常，没有删除旧记录/清 flag；本轮没有新发模型对话。

## 真实 Firebase

已有 ADC 可读精确项目的 Firebase Auth 和 Firestore。规范 auth binding 查询使用现有 createAuthBindingDocumentId，测试邮箱已验证，业务绑定尚不存在。未再次发邮件、未写云端业务数据、未查询新密码。真实账号 App 登录→引导→资料回读以及完整业务组合仍待做；不能把当前 Emulator coretest 当作真实身份版。

## 未完成与交接

用户暂不方便连接手机：v7 安装、小屏/键盘/较大字的真机查看、真实账号新密码登录和邮件返回均 Not Run；旧 v6 原生证据只适用于旧版本。定位权限本轮没有变更。

分工包：ZHOU AI/Persona；JIN 好友/权限/地图天气；SHI Events；DU 已有表单/记录可用性。各人一份完整 prompt，LI 留主机、真实身份接线、主题与最终 APK/设备组合。已生成可转交源码包，未替用户向成员发消息、未宣称成员开工。独立审查仍待交付后进行，无 main 合并/公开发布/项目 Done。
