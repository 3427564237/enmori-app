# ZHOU：LI 接入复核与 SHI 新包独立审查执行来源

- 记录日期：2026-10-20，Asia/Singapore。
- PM 来源：[LI / PM 在 #44 的集中催办 6283507691](https://github.com/3427564237/enmori-app/issues/44#issuecomment-6283507691)，作者 `3427564237`；本轮直接从 GitHub 读回。
- 执行激活：用户转达该通知并要求完成，同时明确要求审查 SHI Draft PR #167。
- 本记录保存已确认的任务分工，不创建新的产品、架构、数据、依赖或发布决定。

## 当前准确任务

PM 原文中 ZHOU 的指定范围：

> 原 head `5cf060c` 的 legacy context 投影兼容问题已由 LI 在代码提交 `52f494bbfd02f85dadbdf0e9f38189772be16edf` 修正，请勿重复实现。请复核该修正、两处 composition 接线及历史列表测试的滚动适配，给出绑定源码版本的意见；有问题集中反馈。

同条 PM 通知要求复用既有真实 Ollama 三轮、重启回读、手机历史续聊和独立草稿预览的限定证据，不重复同一批模型测试。其来源为 #165 中的 `docs/evidence/sprint3/2026-10-20-li-zhou-integration/verification.md`。这些不是 ZHOU 本轮新执行或真实云端用户 AI/全部设备流程验收。

用户另指定 SHI [#167](https://github.com/3427564237/enmori-app/pull/167) 的独立审查。在线读回的作者为 `GGGGHOST-CN`、head `02197c93abd1ff6bfdc9ece6fc43ab2da2979f32`、产品 source `71e0f4083d3ad88aaad11e890796bbe04a3f091e`，目标 `souma/li-shi-du-integration-20261020`，观察到 base `900ca6fcdefb77e9aa95d96fa80994ebf826398f`。审查范围包括 P01–P06/P05 已批准参与持久化、参与者授权分页、外部报名返回修复及 EB2 下一批、去重、末批和失败恢复。技术委托仍受各自已批准合同约束。

## 保留来源与交接边界

- 本次 #44 通知替换“#164 还没有 LI 审查或本机组合证据”的旧状态；不回写删除旧记录的历史事实。LI 对原 #164 提交的是 Changes Requested：P2 已在其 #165 中修正，不能把原 `5cf060c` 本身说成无缺陷批准。
- 不在 ZHOU 原分支重复实现同一兼容修复或接管 LI 主机。#165 后续 Home/UI 改动保留其作者和其它审查职责；ZHOU 本轮只对指定 AI/Persona 修正、两处接线及相关测试发表正式范围意见。
- SHI #167 中的报名返回修复应与原 [#162 P2](https://github.com/3427564237/enmori-app/pull/162#discussion_r4321213466) 逐项对照；新包的代码审查与 LI 的最终接线、真实设备/来源验收分开。
- 在 #44 或现有任务集中回复 PR/head、完成流程、具体阻塞及负责人和下一份交付；已完成事项给实际完成时点，外部修复/设备未知时间不编造 ETA。
- 原 AGENTS、19Oct 核心/AI-MVP、20Oct EP1/EB2 决定继续适用。不同作者审查，不自批 #164；不 reset 在途分支、不直接写整合分支、不合并 main、不部署、不关闭任务或声明整个项目 Done。
