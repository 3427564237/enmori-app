# 保留数据的本机核心环境

使用固定Node24.19.0和已有firebase-tools；在本工作区先完成Backend TypeScript构建。数据目录必须是仓库外、当前用户拥有的0700专用目录；初次为空，后续始终复用同一路径。不是原Sponsor进程的迁移工具，不读取或清理其目录。

```bash
FIREBASE_EMULATORS_PATH=/home/miku/.cache/firebase/emulators "$NODE_24" tool/run_retained_core.mjs "$PRIVATE_DATA_DIRECTORY" --phone
```

`--phone`使用Auth9099、Firestore8088、HTTPS9380，仅loopback。其他端口4408/4508/9158属于同一Emulator组；有占用即拒绝，不杀进程。无参数模式仍为Auth9098及HTTP9380，用于主机验证。两种模式读写同一snapshot，不能同时运行。TLS用已有openssl生成仅localhost证书；私钥留在私有目录，证书过期明确拒绝，绝不跳过TLS验证。

启动后`phone-ready.json`标记ready，`handoff.json`供既有nonce/私有stdin工具使用。primary预留给注册，secondary预先创建；手机号/真实邮箱不参与。`phone-identities.json`只在私有本机查看，勿贴进聊天、Git或公开证据。正常重启不重建账号或重置密码。应用编译不包含这些值。

正常停止：对本命令发Ctrl+C/SIGTERM，或在数据目录创建`stop-requested`文件。等待输出“Core stopped; Auth and Firestore snapshot retained.”以及进程成功退出后再启动。不能kill -9、删除snapshot、清业务数据来制造正常启动。当前保证正常停止恢复；尚不承诺断电瞬间所有未导出的写入已保存。

独立coretest包的普通APK正常打开后，使用`li_controlled_phone_handoff.py --core-verification`（旧Sponsor包仍用`--sponsor-demo`），参数为绝对APK、handoff、明确设备序列号。工具验证安装字节、nonce、证书与端口后才交接；原personatest应用不受影响。该环境当前核心账号、资料、设置、兴趣、好友请求、Persona CRUD、签到/月份查询可用；真实Events供应商和AI模型未接入，界面可能显示明确服务失败，不是空数据通过。

## 一条真机流程及重启回读

已有`integration_test`，不添加Flutter Driver或测试依赖。为避免替换原演示安装，`ENMORI_CORE_ANDROID_TEST=true`选用独立`.coretest`包。

```bash
ENMORI_CORE_ANDROID_TEST=true fvm flutter test integration_test/retained_core_device_test.dart -d "$USB_SERIAL" --no-pub --no-uninstall --reporter expanded
```

构建/安装启动后，在同工作区由第二进程调用`deliver_retained_core_test.py --directory "$PRIVATE_DATA_DIRECTORY" --apk "$ABSOLUTE_BUILT_APK" --serial "$USB_SERIAL" --stage register`。它等待原nonce就绪，私有stdin交付合成账号，不输出凭据；不是模拟Repository。

`register`用于首次新primary。已有注册后不要重复；只有明确记录此前注册/资料已通过、未发生未知创建时，`records`可续跑剩余记录流程。`saved-records`仅在服务端已确认创建结果后续跑同一记录，不再次创建。`read`仅登录并读取已保存资料/签到，用于正常停止/恢复后的手机确认。各阶段证据独立记录，不能将分阶段执行写成最终同APK全程通过。错误不自动重发业务请求。

普通候选使用同一受控入口，构建命令为`ENMORI_CORE_ANDROID_TEST=true fvm flutter build apk --debug --target lib/controlled_demo.dart --no-pub`。它可以直接启动；与`integration_test`构建物区分保存，后者单独打开可能等待主机测试驱动。每次应用重启需要新的nonce交接。手机测试期间保持应用前台；若驱动未连接，不循环重装或重复业务写入，保留日志并使用普通候选完成后续人工验收。
