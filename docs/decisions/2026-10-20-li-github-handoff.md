# PM 决定：GitHub 分支与 Draft PR 交接

- Source ID：`S-PM-1020-LI-GITHUB-HANDOFF`。
- 决定人：LI HOURUI / PM，2026-10-20。
- 人类原话：“那就用 GitHub，推送整合分支并开 Draft PR，把给 SHI 的完整 prompt 更新成直接从这个分支继续，之后都按这个方式交接，不要合并 main。”

本次授权推送 `souma/li-shi-du-integration-20261020` 至 `3427564237/enmori-app` 并创建以 main 为 base 的 Draft PR。该分支包含本机整合历史，不能把整个相对 main 的差异称为仅 SHI/DU 两项增量；PR 应清楚区分继承基线和本轮定向验证。

此后默认通过 GitHub 分支、Draft PR、仓库内一份完整 prompt 和源码绑定的交付回执协作。ZIP/bundle 仅保留为历史或无法访问 GitHub 时的备用，不再默认要求用户搬运。每位实施者从交接指定分支的实际远程 HEAD 创建自己的分支/独立 worktree，记录准确 base/head；交付 PR 优先以指定整合分支为 base，使增量可审查。不能直接覆盖整合分支或强推他人的分支。

SHI 从本次整合分支继续，已包含538b34d、DU移植、当前UI和P01–P06批准，不重复 cherry-pick。已在执行的其他成员任务不因本约定强制重开或丢弃工作；交回时注明其实际基线，由LI处理整合差异。

保留[原本机/UI分工](2026-10-19-li-local-ui-handoff-preparation.md)、[P01–P06批准](2026-10-20-li-event-participation-selection.md)及历史ZIP回执。本决定只替代默认交接载体，不改变功能、隐私、作者/审查安排或验收标准。源码推送和Draft PR不等于应用发布、main合并、部署、设备通过、成员已启动或项目Done。不发送额外私信、不上传私有配置/凭据/APK。
