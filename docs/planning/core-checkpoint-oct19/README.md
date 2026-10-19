> 新检查点：本目录旧包继续仅作历史。最新可转交建议见 [local-ui-handoff-oct19](../local-ui-handoff-oct19/README.md)，请勿分发旧源码包。

# 核心检查点与剩余任务包

> 暂缓执行：最新[本机依赖优先决定](../../decisions/2026-10-19-li-local-dependencies-first.md)要求继续单对话，设备现已连接。下列分工与未连接状态为检查点历史记录，prompt不得作为当前开工指令。

源码检查点：`9e45b1ebc13c1287fc903a6edf4059f4eeb792ec`，分支`souma/li-core-priority-20261019`。起点`ac4021d`。这是已测试的开发检查点，未合并main、未公开发布。后续文档提交不改变该APK源码身份。

## 当前交付

- 账号/邮件动作页面、兴趣引导、Profile扩展及分项隐私、Admin单项创建、底栏Events；12个目录名称在独立保留环境中add-only补齐。
- Check-in Note或Mood、活动/可见性、编辑删除、版本冲突恢复、日期回读、月份精确数量、翻月/选日/分页摘要、准确ID回Footprint高亮。
- 独立真实Auth/Firestore Emulator正常导出/导入后重新登录，资料/设置/签到回读；签到编辑删除与月份数量同步验证通过。
- Backend 1,024项、Flutter 764项通过，Flutter静态检查无问题。
- APK构建/签名/ABI/SHA256见`../../evidence/sprint3/2026-10-19-core-execution/delivery-receipt.json`。

仍未完成：签到精确位置/真实天气/地图、好友及公开权限投影、Events参与闭环、AI自由Persona与预览、统一持久环境的Events/AI/手机接线、深绿/字体收尾。手机当前未连接，真实邮件、定位和双账号同一APK验收未跑。原服务数据未迁移，原AI失败未重放。

## 每人一份完整prompt

|负责人|任务包|工作量与边界|直接使用|
|---|---|---|---|
|ZHOU|AI＋Persona完整纵向闭环|复杂；自己的前后端、独立试聊、失败和语义验证|[ZHOU prompt](zhou.md)|
|JIN|社交／位置隐私／地图天气＋统一组合|复杂；共享授权及运行生命周期集中处理，不替其他人重做模块|[JIN prompt](jin.md)|
|SHI|已有Events浏览上的参与闭环|独立包；参与/忽略/返回确认/名单，包含必要后端|[SHI prompt](shi.md)|
|DU|已有账号/记录体验与视觉收尾|较小；复用本检查点，表单/返回/主题/字体，不领地图后端|[DU prompt](du.md)|
|LI|一次本机联调与验收|少量；私有入口/持久化核验和同一APK批量验收，不兜底功能|[LI prompt](li.md)|

直接把对应文件全文交给负责人对话即可。同一个prompt做完整包，不逐按钮拆票。四个开发包独立开始，JIN负责最后共享接线，LI只接最终本机验证。已有独立审查关系保持，集中提交相关代码/测试/证据。没有成员通知或开工确认。

## 跨电脑取用

同目录交付包包含`enmori-core-checkpoint.bundle`（源码完整历史，已git bundle verify），可在新目录执行：

```bash
git clone ./enmori-core-checkpoint.bundle ENMORI-core
git -C ENMORI-core rev-parse HEAD
```

输出必须为上面的完整SHA，然后创建负责人自己的分支。已有仓库可fetch该bundle后新建独立worktree；不要覆盖未提交文件或从旧main重新实现。`863b653-reference-only.patch`仅供ZHOU对比该修复来源，不能因为附带了patch就认定已经合入或已修复。

APK为开发debug签名候选。保留环境工具为`tool/run_retained_core.mjs`，使用Node24.19.0及已有firebase-tools；私有数据目录留在仓库外。默认核心服务仅loopback9380，当前APK仍需要其原有受控入口配置；该APK与新保留环境的手机TLS/Events/AI组合尚待JIN完成。不要把APK“可安装”表述为设备流程已验收。

## 当前线上记录核查

本轮只读核对：remote main=`d59cb128bfe0b5889baae0b08c973e140505590f`；#44/#85/#84/#83/#82为Open，SHI #47为Closed准备任务。现有PR清单已核对，不把旧PR标题当本次模块已完成。未改Issue/Project状态、未向成员发送消息、未推送或合并。分工权威及旧分工替代范围见[新PM决定](../../decisions/2026-10-19-li-checkpoint-owner-packages.md)。
