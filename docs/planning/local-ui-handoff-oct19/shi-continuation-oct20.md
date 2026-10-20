# SHI 完整续作 prompt（P01–P06 已批准）

最新分工补充：`docs/decisions/2026-10-20-li-home-events-repair.md` 已确认由 LI 当前聊天直接修复首页推荐区域与客户端失效误报，不需你重复处理这项。你的参与持久化/外部报名保护/下一批完整包继续；仅在交付时说明与该共享推荐页面的冲突。

20Oct 最新范围补充（保留你的现有工作，一次随本包交付）：先读 `docs/decisions/2026-10-20-li-event-batches-friends-activity.md`。LI 要求 Events 底部真正获取下一批，不是反复 Reload 第一批。补齐最小服务端分页、现有 Repository/按钮、稳定 ID 去重、末批状态、失败保留当前列表及分页位置、重复点击与账号切换保护。现有手动浏览和兴趣推荐分别验证；不能因为浏览有活动就宣称推荐匹配成功，也不能把无匹配显示为服务失败。下一批及必要最小合同已在新决定范围内授权，不重新等待分页方向批准；供应商规则、既有隐私和 Music 映射继续有效。为 JIN 提供获准参与动态的稳定源 ID/当前状态读取接点，勿在动态里复制私有参与数据。不要修改 JIN 的首页动态模块或要求 LI 重跑已通过的无关模型/全量测试。

上述补充文件位于后续整合分支 `souma/li-zhou-runtime-20261020`（Draft #165）；只读取决定并保留你正在进行的分支，不要求整体 rebase 或改原 PR 目标。

**已获批准，可以执行。** LI 已明确答复“批准 P01–P06，按限定范围继续（推荐）”，并记录于 `docs/decisions/2026-10-20-li-event-participation-selection.md`。该决定引用准确确认稿版本；先读正式决定及其引用，不因旧草稿的历史 Pending 再次索要相同批准。本次改为 GitHub 分支交接，不再需要下载 ZIP；具体起点和执行方法如下。

继续你提交的 `538b34d` Events 包，在独立分支一次完成 Events 的前端、后端、实际 Repository 持久保存回读、严格合同/fixtures 和必要隔离验证。沿用以下 GitHub 分支提供的整合基线，包含最新主题、真实账号配置边界和 DU 返回保护；不要以旧 main 覆盖。先核对 HEAD 和未提交文件，保留现有改动。

## 从 GitHub 整合分支继续

仓库：`https://github.com/3427564237/enmori-app.git`。
交接分支：`souma/li-shi-du-integration-20261020`（包含已批准检查点 `7cff386e17f3d99a4613f77770786ae4865e006a` 及本次 GitHub 交接文档）。不要从旧 main 开始，不重复 cherry-pick538b34d/403950e。先确认 origin 指向上述仓库，保存当前未提交工作，再执行：

```sh
git fetch origin refs/heads/souma/li-shi-du-integration-20261020:refs/remotes/origin/souma/li-shi-du-integration-20261020
git worktree add -b souma/shi-events-complete-20261020 ../ENMORI-SHI-continue origin/souma/li-shi-du-integration-20261020
git -C ../ENMORI-SHI-continue rev-parse HEAD
```

记录这个实际 HEAD 作为交付 base。若分支/目录已存在，先检查它是否是本任务已有工作，再复用；不要 reset、清目录或覆盖。没有仓库时先正常 clone 上述仓库到新目录。独立 worktree 不含 LI 的私有配置、凭据或 node_modules，按锁文件准备已有依赖即可。

完成后推送自己的分支并开 **Draft PR，base 为 `souma/li-shi-du-integration-20261020`**；PR正文放准确 base/head、实现/测试/Not Run 和接线说明。不要直接写入整合分支，不合并 main。只需回传 PR链接和简短回执；用户不需要再搬运工作ZIP。

## 一次完成的任务

先读 AGENTS、适用 Backend/Flutter skill、P01–P06 的真实确认记录和最终选择稿；旧合同/失败证据保留。P05 已获批，允许你在明确范围内选择精确 DTO、键、索引、游标、扫描界限和错误标识，先持久化精确合同，再实施；不为每个字段反复等待。范围外的新产品/权限/依赖冲突集中一次报告，只停受影响行为。

将已交付 EventCard 和 ExternalRegistrationAction 接到实际 stable Event ID 页面与 Riverpod Repository；完成 Interested/Going/取消/忽略，Home/Events/详情/资料回读一致。外部跳转先提示，返回明确 Yes 才写 Going，No 不写，不新增 Booked；未知结果先读，不盲重发。浏览器期间父页面普通 rebuild 不得重置 flow：稳定 callback/依赖身份并加入一项针对性回归。会话变更清空旧状态和回调，现有来源有效期规则仍适用。

落实获批的状态/取消/ignore/过期内容语义；不把五分钟缓存当参与事实存储，不复制供应商内容。参与者 Interested/Going × Friends/Others 分页及获准人数，当前关系/屏蔽/资格/participation 隐私每次判定；不能泄露隐藏人数，也不能把页长当总数。按获批选择使用 username 进入他人资料，不增加 Firebase UID 或自造公开 account ID。JIN 尚未组合时通过明确资料回调和真实关系 Port seam 独立验证，不复制好友系统，也不造“成功”按钮占位。

拒绝数据同意仍可手动活动和参与；真实推荐保持准确 Music 映射，其它兴趣无真实匹配明确空态。遵循现有层次、错误信封、并发和身份边界，不加新依赖或架构。真实账号/Emulator 组合隔离继续保持，不需要也不要索取 LI 的凭据；你的新存储实现先用隔离合成数据验证。

合并一批完成受影响的定向 Flutter/Backend/合同测试与静态检查，避免反复全量跑。设备/外部真实报名/本机实际保存不在你机器可验证时标 Not Run，不能以组件替代。标准 shader 失败只有本机实证修复才改状态。给出你新增函数/路由注册/构造依赖、LI 最终 router/bootstrap 接入位置、JIN username 资料回调与隐私 seam，保留 ZHOU 独立审查。

一次通过上述 Draft PR 交付代码、准确 base/head 与文件范围、精确合同/最少索引、测试命令和实际结果、保存→重读→冲突/错误恢复证据、未完成/Not Run 和最小接线说明。不 merge main、不发布应用或部署、不要求 LI 重复运行你已完成且未变的测试、不标整个项目 Done。
