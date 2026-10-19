# PM 决定：Events 参与合同 P01–P06 与限定实施授权

- Source ID: `S-PM-1020-LI-EVENT-PARTICIPATION`。
- 决定人：LI HOURUI / ENMORI PM；2026-10-20，Asia/Singapore。
- 确认来源：本会话用户对集中确认问题的实际答复：**“批准 P01–P06，按限定范围继续（推荐）”**。
- 状态：已批准，SHI 可按以下限定范围继续完整任务；不再等待相同选择的重复确认。

## 批准的准确版本

完整采用[参与合同确认稿](../planning/2026-10-20-li-event-participation-selection-preview.md)在提交 `d8875dfa05a69d37831296fefb9c0f53f5325853` 中的 P01–P06、P05 技术范围及替代范围。该原稿 SHA256：`3fe8b76181bafc813a536c29ac60dc08b1d1f931a1d2b1d3ac548a6420fa1d05`。后续新增内容不自动成为本次批准的一部分；原稿保留，只加后续批准提示。

1. `none / interested / going` 互斥，ignored 独立。忽略仅隐藏推荐；选择 Interested/Going 清除忽略；取消设 none 并保留 ignored；外部返回 No 不写，Yes 才设 Going，无 Booked。
2. 一个账号/Event 一条状态，GET/PUT 完整目标替换、expectedRevision、缺记录 revision0；有效变化加1，无变化不加，先核对版本。412 重读，未知结果先重读，不自动重发。
3. 只保存参与事实，不复制供应商内容。来源投影过期保留状态，已有状态读取/取消/取消忽略不依赖来源在线；新建/改选/首次忽略需要当前有效来源。不可用内容不伪造。
4. Friends/Others 每页最多20，当前关系/屏蔽/资格/参与隐私逐次判定，缺隐私 Private；沿用不可修改 Username 定位资料，获准名字才返回。本人不列入这两个分组及其人数。禁止泄露 Firebase UID/内部 accountId。
5. **明确授权 SHI 在原稿 P05 所列范围内完成精确 API/DTO、错误、Firestore 键/字段、最少索引、分页游标及扫描界限**，先写精确合同，再同步实现和严格 fixtures，无需逐字段再问 LI。仅该边界内的未决实施细节获委托；不增加依赖、不改架构、隐私、来源范围或 Music 映射。范围外的冲突集中报告并只停受影响项。
6. 先隔离验证真实 Repository 实现及组合接缝；真实账号参与组合不在此次批准中启用。LI 留本机最终接线和统一验证，ZHOU 保持 SHI 独立审查职责。

## 替代与保留

解除 SHI538b34d 的[参与合同缺口](../planning/2026-10-20-shi-event-participation-contract-gaps.md)中被 P01–P06 覆盖的等待确认状态。P05 是 AGENTS 所述 PM 委托范围内的明确授权，因此 Backend Skill 的逐项缺失选择门禁在此范围得到满足；不删除或全面放宽 Skill，也不授权其它未决定模块。

保留 [19Oct核心体验](2026-10-19-li-core-feature-delivery.md)、[19Oct真实活动衔接](2026-10-19-li-sponsor-demo-local-takeover.md)、[15Oct浏览](2026-10-15-li-real-event-contract-selection.md)、[15Oct外部打开](2026-10-15-li-event-external-open-selection.md)及其更高权限来源。只在本次明确参与持久化、返回写入和参与者读取范围内扩展旧只读/不写参与边界；没有改变供应商内容许可、精确来源校验或最大来源抓取范围。

历史回执的 Pending、失败、Not Run 是当时事实，不回填成过去已批准。当前批准不等于实现完成、设备通过、真实保存通过、审查通过或 Release；不自动 merge main、发布、关闭 Issue 或标整个项目 Done。用户已转达此前任务；本次生成可转交续作包，不宣称已替用户发送或 SHI 已开始续作。
