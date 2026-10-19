# 本机真实账号验证入口（20 Oct）

沿用现有 `enmori-rmvp-controlled` Firebase Auth + Cloud Firestore，后端仍为本机 controlled-runtime。没有建立新项目或公开部署。此候选先验证已有账号、引导、资料、兴趣、设置及邮件入口；完整社交/AI/Events 仍由已分派模块和后续组合完成。不要以本候选替代完整 coretest 功能验收。

## 已准备

- `lib/main.dart` 原入口增加显式 `ENMORI_CONTROLLED_REAL_ACCOUNT` 配置。精确项目、禁止 Auth Emulator、localhost HTTPS 9381 和指定证书必须同时匹配；错误时显示配置不可用，不回退其他环境。
- Firebase Auth 仍通过原 SDK；普通 Auth token 由后端 Firebase Admin 验签并检查撤销。无 custom token、临时免登录、客户端 UID 授权或直接 Firestore 访问。
- `tool/run_real_account_local.mjs` 复用 `createControlledRuntime`，现有 ADC 只读预检后监听 127.0.0.1:9381；使用既有 localhost 证书和私钥，TLS 不跳过证书/主机/到期检查。
- `tool/real_account_local.py` 提供 start/status/stop/connect；所有原配置在私有 `~/.local/state/enmori-real-auth-oct19`。不改 coretest 的 9380/9099/8088，不导入或清除 Emulator 数据。

## 本机操作（由 LI 对话执行）

工作区为 li-core-priority-oct19/ENMORI。后端用已有 Node 24.19.0 构建一次，然后：

```sh
python3 tool/real_account_local.py start
python3 tool/real_account_local.py status
python3 tool/real_account_local.py stop
```

真实 Firestore 为服务端保存业务数据，停止本机服务不会触发清库或导出覆盖。工具只操作带有本工具标识、相同 PID/start ticks/boot ID 的进程；遇到旧锁先诊断，不能随意删除锁或 kill 其他进程。

APK 构建使用私有 account-dart-defines.json：

```sh
/home/miku/fvm/versions/3.47.2/bin/flutter build apk --debug --target lib/main.dart --no-pub --dart-define-from-file=/home/miku/.local/state/enmori-real-auth-oct19/account-dart-defines.json --build-number 8 --build-name 1.0.0-realaccount20261020
```

不得携带 ENMORI_CORE_ANDROID_TEST 等其他隔离包环境变量。本包为已登记 Firebase Android app 的 `com.enmori.app`，与 `.coretest` 共存；若设备已有同包名应用，先核对签名/版本，不卸载清数据来解决安装冲突。APK 包含所需 Firebase 客户端配置和公开证书，不含密码、ADC、服务端私钥；配置文件本身仍不提交 Git。

## 手机下一步

1. 用户连接并授权 ADB 后，检查设备现有 com.enmori.app 的版本/签名，再安装本次精确 APK；vivo 如提示，由用户确认。不要先卸载。
2. `python3 tool/real_account_local.py connect --serial <authorized serial>` 会先核对已安装 APK 的 SHA-256 与本次候选一致，然后只 reverse 9381 并打开应用，不替用户输入密码或清会话。
3. 用户亲自在 Sign in 输入已验证邮箱和重置后的新密码。密码不进入聊天、命令行、截图/XML输出或日志。旧 test-identity.json 中密码已失效，不使用。
4. 观察真实身份通过后端→引导，用户确定 Username/数据同意与兴趣选择，保存资料/设置→重新读取→退出重登→原资料仍在。自动化不替用户决定真实资料、同意或分享范围。
5. 同一候选继续邮件状态刷新、账户切换/错误恢复；真实保存后再集中验证一次正常服务停止/启动后的回读。未执行的步骤保持 Not Run。

若没有手机，停止于安装前。本轮只读 live preflight 与组件检查不等于真实密码登录、资料已保存或全项目验收。
