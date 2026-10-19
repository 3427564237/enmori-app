# 本机操作入口与普通 APK 验证检查点

基线 e04c273；本轮源码提交与 APK 绑定见 delivery-receipt.json。沿用原私有数据目录，无清库、迁移主目录、推送或合并。测试设备 V2405A，普通 coretest v6；真实邮件配置准备与 Emulator 业务验证分开记录。

## 已完成的本机工作

- 新增 `tool/core_local.py`：启动、状态、nonce 私有连接、正常停止；运行 PID/start ticks/boot ID 核对、正常导出回执、重复启动拒绝。真实运行完成一次正常停止（exportConfirmed=true，2026-10-19T13:11:30.370Z）及恢复；v6 重新登录读到原姓名、BIO、地区及默认 Private。旧 Emulator token 在服务恢复后不能继续使用，当前需重新登录，不称无感恢复。
- v6 安装由用户在 vivo 系统允许；签名 APK SHA-256 与安装包一致，nonce 交接 Pass。默认入口指向 v6。
- 修复拒绝数据同意时首次进入 AI 仍显示输入框：当前在读取设置前显示加载，拒绝后显示 AI Limited；接受并保存后进入聊天。Backend 权限保留。定位错误补充即时 Snackbar，原错误文本保留。
- 定位：原系统关闭、App 粗略权限未授予；用户临时开启后，通过原生一次性粗略权限，取得一位小数坐标并只填入地区草稿。未按 Save，返回仍为 Singapore。没有向天气供应商发送设备坐标。
- 天气：使用公开测试网格请求已有批准的 Open-Meteo；HTTP200，0.69秒，状况代码和温度存在。仅证明本机供应商连通；App 天气适配器尚缺，不能称天气功能通过。
- Firebase：本机已有登录可访问现有 enmori-rmvp-controlled，Email/Password 已启用；已下载现有 com.enmori.app 配置并生成与已有 bootstrap 匹配的私有 Dart defines。准备时未改云端配置、未新建服务或发送真实邮件；后续发信状态见下方追加。真实账号 Backend 组合与原生邮件返回未验证，见 tool/real_auth_preparation.md。

## v6 真机聊天

同一安装包、同一账号真实连续三轮，主题为学习后十分钟休息→下雨改室内→整理三步。三条回复分别保存于 13:20:30.995Z、13:21:24.226Z、13:22:39.614Z，上下文相关，未自动重发。第一轮离开到 Home 再进 AI 后内容仍可见，随后能续聊。第二、三轮需手动滚动才看到回复，自动滚动体验仍可改进。本轮不是 Persona/所有异常路径通过。

## 事件外部返回（此前同轮 v5 分段证据）

从 Events 实际列表进入 ONE OR EIGHT 新加坡活动，真实日期/场馆可见；明确 View on Ticketmaster 后，经 vivo“仅打开一次”进入 Chrome 对应 Ticketmaster 活动地址，Back 返回原详情。没有报名、付款或登录第三方。返回需 Reload；“是否完成报名→Going”及参与者闭环仍缺。此段来自更新前 v5，不冒充同 v6 完整验收。

## 必要检查

- AI consent gate 定向 widget 测试 1/1，包含拒绝→接受以及更换账号重新加载期间隐藏内容。
- 三个受影响 Dart 文件静态检查无问题；Python 编译与 Node 语法检查通过；git diff --check 通过。
- 首次 v6 构建被 SIGTERM（exit143），没有编译错误证据，保留原日志。服务稳定后单次重建成功；未循环重装依赖或跑全套回归。
- 本轮未改 Backend 源码，未重复既有全套 Backend/Flutter 测试。

## 尚未完成

真实邮件收件/点击/重设返回；真实身份与 Backend 资料初始化组合；App 天气与地图；完整好友投影和关系撤权；Events 参与状态/名单/返回确认；完整 Persona 自由编辑与预览。AI 旧合成历史维护异常依旧隔离，aiMaintenanceHealthy=false，未清数据制造健康结果。总体五批、全部异常恢复及同 APK 完整 UAT 均未完成。

## v6 核心功能与同意撤回

三轮完成后将主测试账号同意恢复为原 rejected，保存返回即为 AI Limited。仍可从 Home 创建仅备注签到，显示 Private，并点击 Confirm saved Check-in 得到 Saved Check-in confirmed；时间为 2026-10-19T13:24:06.178Z。返回 Home→Events 读取真实 Ticketmaster 列表。退出登录回到空白登录表单，没有把旧资料留在登录页。

## 第二账号与设备恢复

主账号退出后登录原预置 secondary Auth 账号，进入其尚未完成的引导，而非复用主账号资料；设置 Username native_second_oct19，拒绝数据同意，Skip for now 跳过兴趣后进入首页。个人资料显示自己的 Username、姓名未设置，无主账号姓名/BIO/地区；AI Limited 生效。此项证明本次 UI 账号切换与引导分支，不代替所有跨账号接口权限测试。第二账号也已退出回登录页。

定位测试后已将系统 location_mode 恢复为 0，并撤回 coretest ACCESS_COARSE_LOCATION；重新读取确认 granted=false。没有请求精确或后台位置。输入自动化曾丢字符，采用慢速输入并核对完整草稿后再提交；未把凭据写入代码或证据。

## 真实邮件阶段追加

用户随后指定收件邮箱，授权测试注册与邮件。通过 Firebase 正式 REST API 创建独立测试账号（HTTP200），随机密码与登录 token 仅写入原本机私有目录；未将真实身份送往 Emulator 业务后端。VERIFY_EMAIL 请求 HTTP200，随后 lookup 的 emailVerified=false。只记录供应商已接受请求，实际收到并点击链接等待用户确认，不把发信 API 成功当作投递成功。未自动重发，未修改原有账号密码。

本轮新增业务数据已于 2026-10-19T13:27:54.005Z 正常导出（exportConfirmed=true），随后同目录重新启动 ready=true。原账号资料、签到及对话不删除。恢复系统定位和 App 权限后重新完成 v6 私有交接。

## 真实验证邮件确认与密码重置请求

用户提供手机截图，Firebase 托管页面显示“您的电子邮件地址已通过验证”。随后对原真实账号执行 accounts:lookup，HTTP200 且 emailVerified=true，确认实际收件、点击链接及服务端验证状态。之后按已授权流程发送 PASSWORD_RESET，HTTP200；这仅确认供应商接受重置邮件请求，仍待用户收件并完成重设。未重新注册、自动重发或把真实账号接入 Emulator 业务后端。新密码不要求在聊天中提供。

## 真实密码重置确认

用户确认已完成重设。随后只进行一次原测试密码登录检查，Firebase 返回 HTTP400 / INVALID_LOGIN_CREDENTIALS，确认原凭据失效；未重发邮件、重置密码或尝试猜测新密码。新密码由用户保管，未收集到聊天、本机配置或 Git。至此真实验证邮件的收件/点击/verified 状态，以及重置邮件的用户完成与旧密码失效已确认。

证据边界：本轮未用新密码登录，当前 coretest APK 仍为 Emulator 身份。真实账号“新密码登录→资料初始化→返回 App”的完整组合仍未验证，不能据此标记账号批次或完整 UAT 完成。
