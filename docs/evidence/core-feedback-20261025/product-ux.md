# Product / UX — 核心体验反馈首轮审计

2026-10-25，Asia/Singapore。Role: Product / UX。

## 基线与范围

原分支 `souma/ai-companion-product-ux-20261025` 在
`346ac94d07c740c8bc55786458b62449c7110b6e` 干净保留。
本轮在同一 worktree 从精确 `087281e11ec5a681fd012b9d64431b225ed6f8ea`
建立 `souma/core-feedback-product-20261025`，没有 reset 或清理旧工作。
最新本会话 `turn_context` 实际配置为 `gpt-6-astra`、`max`。
全文读取本工作树 AGENTS、Skill routing 与新 LI 决定；与旧分支的 AGENTS/routing 无差异。

仅修改 `docs/design/core-feedback-20261025/` 和本证据文件。
采用仓库 UI/UX Skill 的局部交互审计及 PDF 只读工作流；未重新设计品牌或页面系统。
UI/UX 首次 disabled 查询首项不贴合，缩窄到 error recovery 后匹配可操作恢复/可访问错误
提示；该建议不增加业务权限。brainstorming/writing-plans 依路由保持 explicit-only。

## 可审查交付

[最小合同包](../../design/core-feedback-20261025/minimal-contract-packet.md)
给出：准确来源冲突、推荐因素矩阵、兼容 Top 2 的继续发现路径、Root 已规范的今日签到
合同、跟进入口/管理拆分、自己的照片存储及旧客户端/隐私边界、活动详情与外跳合同、
第一批并行责任。

Root 的 `72fc616ca81d6d7703fc139600ce959d7a84dc9e:api/ai-today-context-contract.md`
已全文读取，与 Context 的候选形状一致；本交接不另造 API 字段。
Root `d8b88105b7cc7b176f08fa25eb5c6f90c7d5e141` 的 `api/own-avatar-contract.md`
及 PM 决定照片补充、`da73337fac9999ba7d60f14a4df8fe80ace361b4` 的
`api/event-detail-presentation-contract.md` 也已全文读取并同步到合同包。
照片明确本人 Home/Profile 私有，采用独立头像 GET/PUT/revision 保持旧资料兼容；
Product 没有另行批准公开分享、媒体范围或 API。

## 直接来源核验

从 `nexus-five-project-records@5d4ac26` 用只读 GitHub API 取回 S-KD5、S-BR45、S-BR5。
连接器仅支持 UTF-8，二进制读取失败后使用现有 `gh api`；无写入、无凭据输出。
本机原件及提取文本目录：
`/home/miku/.local/state/enmori-core-feedback-20261025/product-source-audit/`。
三份原件 SHA、归属、页码及极短原文见合同包；未把全文或私有原件复制进仓库。
S-KD5 第 3 页渲染后目视核对 Top 2/See All 条款；其余相关完整页作文本核对，不作版式结论。

明确报告两项冲突：

- S-KD5 p3 §15、BR45 p4 AC19/20、p5 AC24 阻止客户端直接重排 Home Top 2。
  Root 改为保留首页前两条、进入完整有序列表继续浏览；Product 判断该路线兼容。
- S-KD5/BR45 独立 Interested/Going 与 20Oct 互斥合同存在既存语义差异。
  本轮不借推荐体验修改数据/状态；仅停受影响的新解释，报 Root 保留来源轨迹。

Q03/Q17/Q04-DEV-08/09 已读：Event v1 仅兴趣；Friend v1 为
`2 × sharedInterestCount + commonEventCount`。位置、年龄、学校组织没有当前 v1
权重授权。19Oct 资料学校/公司/地区可存不等于可评分。实际 source/owner/visibility
接缝已读，未把它当成真实服务已启用证据。

头像实际代码发现：当前 owner Profile 返回严格 key 集合；随意新增响应字段会令旧
v28 parser 拒绝整个资料。已向 Root 提供保留默认旧形状、显式头像读取及省略不删除的
最小兼容边界；Root 后续规范已选择独立头像接口。Product 未新增账户字段、依赖、
media 接口或原生代码，合同设计符合不等于实现已验证。

## 跨角色结果与未执行层

App 报告两种 UI 的 0 选择/IME 输入可普通发送；选择记录后 Back 的本地门控反例为红。
Product 读到了 `_selectionReady` 的实际门控，但本轮没有自行执行这些测试，也不称其
为 LI 手机唯一根因。Context 给出的现有 IANA/day/parser/query 接缝已与源码交叉核对。
Delivery 静态确认 F0 不因 D1 未配置而直接禁用；App 已区分创建与管理入口。QA 已独立
指出推荐、照片、活动封面 DTO 缺口，本包供其按最终 Root 规范安排用例。

本轮未运行 Flutter、Gradle、APK、模拟器、真实服务、模型/provider、真实账户写入或
真机动作；未占 Root 的验证窗口。没有复制、修复或重新归类历史 58 项失败。
尚待 Root/各 owner 的实现、独立用例、服务诊断及准确候选交接；首轮源码/合同审计
不代表新体验已经在手机交付。

文档检查：两份交付的 6 个相对链接均有目标，未发现行尾空白；全部新增/修改路径
均在本角色拥有范围。最终暂存内容的 `git diff --cached --check` 通过。
