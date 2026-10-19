# 核心检查点：运行与验证边界

来源：S-PM-1019-LI-CORE-SINGLE-CHAT。起点ac4021dd13efc2bc6aa8676ccce0a1901311ef0d。

## 当前结果

- 产品决定和逐项核对表已保存；原两份未跟踪草稿内容保留了历史副本及替代链接。
- Backend Node24.19.0/TypeScript7.0.2：1,024项测试通过；包括扩展Profile/Settings回读、默认私有、旧写入保留新增字段、权限及Unicode目录冲突。
- Flutter3.47.2/Dart3.13.2：764项测试通过；静态检查无问题。新增GPS取消、拒绝保留手填草稿、成功后显式保存测试；邮件重发防重复、错误恢复、验证查询和重置返回测试。
- 独立Auth/Firestore真实Emulator：同一持久化目录内注册/登录、资料/设置写入→正常退出导出→重新启动导入→原账号重新登录及回读通过。真实Firestore并发同名创建仅一个成功，普通用户及撤销Admin后请求403通过。授予/撤销的Admin仅为该隔离验证环境的合成账号；原环境及真实账号无权限修改。
- 12名称在该独立验证环境补齐，既有标签与引用在事务测试中保留。原8080/9099运行环境未补目录、未重启、未清理、未迁移。
- 原controlled_phone_service及Firestore进程仍可观察到；其工作目录访问受限，旧/tmp指针缺失不等于服务已停止或数据丢失。仅保存进程元数据哈希。旧AI失败记录原样保留；未重试、未取消、未重装模型。

## 保留数据启动路径

`tool/run_retained_core.mjs <private-data-directory-outside-repo>`，使用锁定Node24.19.0和既有firebase-tools15.29.0。先执行既有Backend build。

启动前确认9098/8088/4408/4508/9158/9380均空闲。此路径使用单独Emulator进程、隔离credential profile和私有目录；正常SIGINT/SIGTERM只请求worker关闭，然后由Firebase CLI export-on-exit导出Auth/Firestore。重启import同一snapshot。目录已有不完整导出时拒绝启动，保留目录排查，不清库。运行锁残留时先核实原进程，不自动删除锁。

该路径复用同一Backend分层和现有Repository，开放账号/资料/设置/兴趣/Admin、已有Note/Friend/Persona/History能力，不启动Ollama或AI epoch。原演示启动器的stopAndClean仍只属于旧一次性演示路径；新路径不调用它。

**仍缺少统一组合**：新保留环境尚未与手机TLS/private handoff、真实活动来源及AI组合。HTTP9380为loopback核心服务，并不是可直接给手机使用的公开地址。本轮没有连接ADB设备，不声称APK已安装或真机旅程通过。原服务的数据尚未安全迁移到新保留目录。

## 最小合同细节

- Profile原GET/PUT增加可选details对象：bio500 Unicode code points，affiliationType school/company/null，affiliationName及region120；空白归null，禁止控制字段；Username不进入更新请求。上限为本轮实现校验边界。GPS只前台明确操作，显示粗化0.1度坐标，可手改地区名；无反向地理编码供应商/背景定位。
- Settings原GET/PUT增加可选fieldPrivacy：interests/location/participation各private/friends_only/public，mapSharedWithFriends布尔值。缺失读取默认关闭，旧客户端省略时保留现值。同意撤回仍走既有purpose generation生产者。后续地图和其他人内容投影未完成，保存设置不代表那些流程验收。
- POST /v1/admin/interest-tags：真实验证身份后重读当前custom claim enmoriAdmin===true。普通请求无role/UID字段。规范化、名称预留和创建在Firestore事务内；同时扫描存量active/inactive标签，避免为旧标签回填而改写其身份。不存在存量修改迁移。
- Unicode16.0.0 C+F完整默认case-fold固定数据及Unicode许可已随代码保存；原Q12 NFC显示名、NFKC比较键顺序保留。[Unicode数据](https://www.unicode.org/Public/16.0.0/ucd/CaseFolding.txt)、[许可](https://www.unicode.org/license.txt)。
- Firebase邮件动作依据[官方Flutter文档](https://firebase.google.com/docs/auth/flutter/manage-users)；Emulator保存依据[官方Emulator文档](https://firebase.google.com/docs/emulator-suite/install_and_configure)。真实邮箱投递和手机权限提示仍未验证。

## 保留的失败与修正

1. 原测试仍假设Accept→Public及无条款勾选，随明确新规则更新；新字段加长表单后改为连续滚动表单及固定保存按钮，修复可见/可点击路径，再跑完整回归。
2. 首次真实持久化测试被Firebase CLI注入FIREBASE_CONFIG拒绝；使用仓库现有隔离环境构建器重新进入子进程，未放宽环境守卫。
3. 第二次验证脚本错误期待新onboarding为200，实际正确返回201；保留已建账号/导出，读取状态后继续未完成步骤，未清库重跑。
4. 首次APK构建因geolocator_android的Gradle依赖下载超时失败；Java及curl对同一官方URL返回200后使用独立Gradle进程刷新依赖。最终构建结果另见交付receipt，不以下载重试代替运行验证。

## 未完成

第一批仍有真实邮件、手机定位、原业务数据迁移、统一持久化环境/手机接线及两账号真机验收。第二批位置/weather/地图与好友可见投影，第三批参与状态闭环，第四批推荐/他人资料/动态/解除好友，以及第五批AI/自由Persona预览均尚未完成。863b653只检查了提交范围，未合入，不能据此宣称AI修复。当前没有main合并、公开发布、Issue关闭或Done声明。

## 检查点补充

新增PUT/DELETE /v1/check-ins/{checkInId}，revision缺失按1，写入后递增；旧版本412、非本人和不存在同为404。编辑只修改本轮提交字段，不改变历史时间/天气；删除同一文档清掉附属字段。新增GET /v1/me/check-ins/calendar，month/timeZone精确日计数，复用认证及历史Firestore事务网关；使用Firestore事务内count聚合，未下载整月备注。参见OpenAPI。

Check-in create/read/history增加可选mood/activity/revision，create可显式指定visibility，Note为空需有效Mood。标签为最多50 Unicode标量的显示内容，不赋予数据权限；当前快捷选择沿用已有UI参考，其值不参与推荐排名。

真实Emulator第二次restart读取保留的Check-in通过；创建、编辑、冲突、删除和日计数同步通过。首次验证只创建保留记录不算重启回读，第二次才把checkInRestartRead记为true。无原服务停机、清库或原AI重试。

Flutter新增月份切换、第二页记录精确回定位、Mood-only DTO、并发保存禁用、删除确认与冲突保留草稿验证。首次全量回归发现状态反馈滚动动画短暂拦截重复保存点击，改为布局完成后的即时滚动，保留原传输失败恢复条件重新验证；最终数值见delivery-receipt.json。

当前工作停止在用户要求的检查点；后续五人完整任务包已记录。仍缺同一运行环境的手机/TLS/Events/AI组合、真实邮件、真机GPS、地图、社交和Events参与、自由Persona及模型三轮；这些没有被测试数量替代。
