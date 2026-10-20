# PM 授权：独立全局 UI/UX 增量

- Source ID：S-PM-1020-LI-SHARED-UIUX。
- 决定人：LI HOURUI / PM；2026-10-20，Asia/Singapore。
- 来源：用户明确要求负责全局 UI/UX，先检查导航、信息层级、主要操作、表单反馈、加载/空白/失败与返回，再实现共享主题、组件及跨页一致性的可审查增量。

从远端 `souma/li-shi-du-integration-20261020` 获取实际基线，在独立 worktree 和 `souma/uiux-*` 分支实施。保留深绿、Playfair Display、已有业务逻辑和队友在途范围。仅产品规则变化部分需要新的相关决策，其他批准的界面改进继续。

允许提交、推送独立分支并创建 Draft PR，base 必须为 `souma/li-shi-du-integration-20261020`。不修改主整合工作区，不合并 main。只做必要定向检查；真实 Firebase、本机业务服务、手机及最终组合验收由原整合对话负责。

本条限定本轮执行范围，延续 [19Oct UI 前置与分工](2026-10-19-li-local-ui-handoff-preparation.md)、[核心产品规则](2026-10-19-li-core-feature-delivery.md)及 [GitHub 交接](2026-10-20-li-github-handoff.md)。不替代产品/权限/后端合同，不转移 SHI/JIN/ZHOU/DU 的功能包，不改变独立审查或整体交付标准。具体实现选择、事实核对和未完成项见 [本轮回执](../evidence/sprint3/2026-10-20-uiux-consistency/review.md)。
