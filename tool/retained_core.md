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

## 本机真实活动来源

同一数据目录新增私有0600 `event-source.json`，只包含`credentialFile`（已有私有Ticketmaster凭据文件绝对路径）和`musicInterestTagId`（本环境已明确核对的Music目录ID）。凭据文件需当前用户拥有、0600、普通文件、无符号链接，含`apiKey`及`termsAccepted:true`。不把密钥写入Git、APK、命令参数或日志。

显式以`--phone --events`启动才请求开启既有来源；单纯存在凭据不启用。沿用SG/未来首批20、5分钟内存投影、准确Music segment及稳定Event ID；不按标签名称发现新映射。`phone-ready.json`只记录配置类别和启用状态，不能证明供应商当前成功。配置无效时核心仍启动，活动503；错误不是空推荐。拒绝数据同意时服务端不读兴趣排名，手动浏览不受此限制。停止先禁用来源、取消并等待在途读取，再关闭HTTPS及导出原数据。

## 简化本机聊天

按`S-PM-1019-LI-AI-MVP`，`--phone --events --ai`显式接入已有`qwen3.5:9b`与loopback11434。沿用现有聊天API/Firestore/同意与身份检查，仅用当前输入、最近两对同会话历史及当前Persona；暂不自动读取可编辑签到。无root诊断健康前置条件、独立tokenizer预审、词句/数字/链接审查；显示内容只是文字。旧诊断文件和保留任务不更改。原API2400字、8192上下文、512生成token及超时作为容量限制保留。

停止先关闭新AI入场，等待已接收操作和模型真实完成，再导出原数据。若请求结果不确定，保持原进程和操作，通过原结果接口核对，不启动替代模型或自动重发。`phone-ready.json`的aiEnabled仅表示组合建立，不代表模型三轮已验证；具体结果看交付证据。

启动时先标记phone-ready为未就绪；AI启用时做一次无用户内容的空提示预加载，最多120秒，闲置30分钟释放。加载失败仅关闭AI。生成的业务时限仍为45秒；原模型响应继续读取至明确结束（接收上限120秒），迟到内容不会交付或保存。真正的网络未知结果仍保留占位，不能通过再次点击消除。

Emulator export/import会重建服务createTime。简化聊天在新消息原事务内附加内部`retainedCreatedAt:serverTimestamp()`；仅本机组合的Firestore适配器读取/保留它，公共消息合同不变，客户端不能指定。旧无字段会话保持原读取规则，若导入后保留期链不一致，显示不可用，不伪造历史或延长期限。维护仍检查旧记录，`aiMaintenanceHealthy:false`表示存在需处理的记录；它不全局封锁其他有效会话。

空提示预加载与keep_alive沿用[Ollama官方FAQ](https://github.com/ollama/ollama/blob/main/docs/faq.mdx)，不发送额外聊天，不启动循环保活任务。
