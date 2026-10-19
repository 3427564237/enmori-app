# GitHub 交接：一人一份完整 prompt

用户已确认继续本机工作并恢复分工，每人一份 prompt 贯通前后端、保存回读和必要验证。历史首包源码基线为 `51ecb5c11ff23ce3bf36fbf9280d2e00646ac857`，历史 bundle 见对应 manifest。**当前 SHI 续作从 GitHub `souma/li-shi-du-integration-20261020` 继续**，已包含7cff386批准及后续交接文档；实际起点以 fetch 后 HEAD 记录。HCI 已核对并继承，全局 UI/UX 第一版已在功能开发开头落地，见 [基线](ui-baseline.md)。旧 core-checkpoint-oct19 及 8753bb9 包仅作历史，不再派发。

|负责人|直接复制全文的 prompt|本包边界|
|---|---|---|
|ZHOU|[zhou.md](zhou.md)|复杂：AI/Persona 全字段、独立试聊、历史/新对话/失败回读、消息滚动|
|JIN|[jin.md](jin.md)|复杂：好友闭环、他人资料权限、记录/日历/地图投影与天气|
|SHI|[最新完整续作](shi-continuation-oct20.md)（[原任务](shi.md)保留）|相对集中：Events 参与、忽略、第三方返回确认、参与者页|
|DU|[du.md](du.md)|较小：已有账号/记录的错误恢复、小屏/键盘/返回与重复提交问题|
|LI|[li.md](li.md)|本机真实账号接线、服务数据、共用 UI、最终组合与设备验收|

今后每人使用交接指定的 GitHub 分支和自己的一份完整 prompt，完成后推送独立分支并交 Draft PR；ZIP仅作备用。不需要先获得 LI 的密码、私有配置、Ollama 或手机。各自独立分支/worktree；只完成自己的包，最后一次交付代码/必要测试/接入说明/Not Run。不在 LI 活跃工作区共同写文件。SHI 包包含后端，不能把它误称纯小 UI 修改；LI 不接管另外四包的全部实现。

依据[GitHub交接决定](../../decisions/2026-10-20-li-github-handoff.md)，SHI 的续作 PR 以当前整合分支为 base；已在执行的其他任务保留实际基线，交回时处理差异。不得直接覆盖整合分支或合并main。

共用接口边界：模块可以独立提交自己的路由注册和依赖注入补丁，LI 最终组合；SHI 输出活动参与区与用户 ID 回调，JIN 接他人资料权限，两者未组合时先验证各自回调，不创造重复参与状态或通用平台。其他业务字段按现有批准合同。

已保留：持久化启动/停止、真实来源 Events、Ollama 三轮及回读、数据同意门禁/撤回、两账号引导/隔离、签到和兴趣/资料基础、HCI 交互。新增全局主题和本地字体可直接复用。最新检查点见 docs/evidence/sprint3/2026-10-19-ui-local-handoff/verification.md。

这是可立即转交的包，未代替用户发送给成员、未创建其他对话、未在 GitHub 宣称成员开工。v7 未做真机验证，整个项目未标 Done，也未合并 main。

## 20Oct 接收更新

SHI538b34d部分组件及DU403950e已在独立整合分支处理，主机运行版本不变。见[接收与验证](../../evidence/sprint3/2026-10-20-shi-du-integration/verification.md)。DU当前适配35项widget通过；SHI16项组件和5项策略通过，仍缺参与持久化/分页。SHI的[P01–P06](../2026-10-20-li-event-participation-selection-preview.md)已由LI明确批准，见[正式决定](../../decisions/2026-10-20-li-event-participation-selection.md)；[单prompt续作](shi-continuation-oct20.md)可直接转交执行。旧分工及回执不改写成已完成。
