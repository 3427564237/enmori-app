# LI 本机真实账号接线

- Source ID: S-PM-1020-LI-REAL-ACCOUNT-WIRING。
- 来源：用户要求在本对话“先完成真实账号接线和不需要手机的部分，需要我操作的时候再告诉我，尽量不要反复测试”。
- 范围：沿用已有 enmori-rmvp-controlled 的 Firebase Auth/Firestore、现有 ADC、Backend 账号合同和 Flutter 登录/引导/资料/兴趣/设置页面；准备本机可连接入口，不新建项目或正式云部署。

实现选择：复用 controlled-runtime 的真实身份组合、既有 HTTPS 证书校验方式，独立 loopback 9381 与 ADB reverse；客户端使用已登记 com.enmori.app 包名、私有构建配置和该入口证书。9381 与旧 coretest/Emulator 的 9380 隔离；这些是本轮本机接线的实现参数，不宣称用户逐项指定了端口。

不改变 retained-core-runtime/buildApp 隔离功能的 Emulator 限制，也不让真实 token 落到 Emulator。真实账号入口先承接已存在的账号/资料/兴趣/设置合同；其余完整社交、AI、Events 的最终真实环境组合继续明确列出，不伪称已经完成。真实 Firebase 已保留的数据不复制到 Emulator、不清库，普通用户不获 Admin 权限。

真实测试邮箱已由用户指定且验证、重置密码；新密码仍由用户本人在手机输入。本轮不注册替代用户、不重发邮件、不重试旧密码、不在云端自动创建资料。无手机阶段做本机 TLS/配置/拒绝非法身份及只读就绪核对；正向原生登录与业务保存回读保持 Not Run，直到实际执行。

用户已确认四份任务包传达给队友；这只记录已转达，不推定他们已开工。本轮 LI 改动集中在根接线/本机工具，不接管队友功能文件。此范围延续 19Oct 本机与 UI 分工决定，替代旧“单对话包暂停”的执行状态，不改变产品规则或独立审查要求。
