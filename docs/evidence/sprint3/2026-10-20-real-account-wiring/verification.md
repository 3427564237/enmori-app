# 20 Oct 真实账号接线：无手机检查点

源码 `f3c733adca0737d4561fe4cd1fe8b1b303094a98`，基于队友已收到的 `927f775`。同一 LI 工作区，未修改队友模块实现、未发新任务包或合并 main。

## 已完成

- 真实模式复用原 Firebase SDK、Firebase Admin 验签/撤销检查、controlled-runtime、账号/资料/设置/兴趣合同及现有 ADC，不混入 Emulator。原应用入口支持私有显式配置和本机证书；普通入口没有该配置时行为不变。
- 本机 HTTPS 9381 与 coretest 9380 分离，新增 start/status/stop/connect 操作。connect 先核对已安装 APK 的精确 SHA，再转发端口和启动；不会自动安装、清数据、输入密码或更改云账号。
- 私有配置已准备，精确目标 enmori-rmvp-controlled。只读预检确认邮箱已验证、规范 auth binding 尚不存在；没有替用户初始化真实资料。
- 真实账号验证 APK v8 构建并通过包名/版本/签名核对；本包是 com.enmori.app，与 coretest 共存。含必要 Firebase 客户端配置及公开证书，不含用户密码、ADC 或服务端私钥。完整摘要见 receipt.json。

## 一次集中验证

- TypeScript 构建成功；Flutter 六个受影响文件静态检查无问题。
- 三个后端文件：配置/环境拒绝、原 Firebase 身份验证合同及新入口隔离，共 18 项通过。
- 两个 Flutter 文件：真实配置与证书失败拒绝、既有资料/设置保存冲突/旧会话迟到响应/退出和大字可达，共 16 项通过。
- 使用应用同一 Dart HTTP 客户端对真实本机 HTTPS 做只读请求：无身份、无效身份、合成的未签名 Emulator 身份均 401；默认未信任该证书的客户端连接被拒绝。未创建 custom token 或测试替代账号。此证据不代表用户真实新密码已登录。
- 正常 stop 后 phase=stopped、所有权锁移除；再次 start 的 Auth/Firestore 预检与 HTTPS 就绪通过。云端本轮无写入，因此不能借此宣称真实业务数据已完成重启回读。原 coretest 仍 ready，旧 aiMaintenanceHealthy=false 保留未改。

## 需要用户的下一步

本轮 ADB 无设备。待用户方便连接并授权 USB 调试，再核对原应用签名/版本、安装本份 APK，用户在手机确认安装并亲自输入重置后的密码。之后集中完成真实登录→初始化→保存/回读→退出重登→服务重启回读与邮件返回。

不得要求将新密码发到聊天里，不使用旧失效密码，不重发验证/重置邮件。本轮没有云端业务变更、数据清理、定位、更改分享或 AI 对话。正向真实账号流程、完整真实环境社交/AI/Events 组合仍 Not Run，尚非全项目验收。

具体本机接手步骤见 tool/real_account_local.md；已经传达的队友包继续基于 927f775，LI 后续组合本补丁即可。
