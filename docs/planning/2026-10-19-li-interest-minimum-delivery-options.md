# LI兴趣目录：具体内容选择及最小创建合同提案

状态：**产品名称、0–10选择及最小Admin单项创建方向已由S-PM-1019-LI-CORE-SINGLE-CHAT确认；实现与环境回填待验证。** 延续[18Oct选择包](2026-10-18-li-interest-catalogue-expansion-options.md)，本轮由当前单对话实施和验证，旧owner分工不再作为启动依赖。

## 已选择A（保留原选择对照）

本轮选择A；B未采用。下面的旧提案表保留为变更历史。

建议首批12个目标名称：**Photography、Outdoors、Music、Art、Books、Films、Gaming、Food、Fitness、Travel、Technology、Volunteering**。每人仍选0–10个；普通用户不能创建标签。已有条目和引用保留，核对名称唯一性后补缺，不承诺现库总量恰好12。

| 选择 | 效果 | 代价 |
| --- | --- | --- |
| A（推荐）：批准上述12个名称，以及下述单项Admin创建合同方向 | 先把目录和已有选择保存做成可维护功能；随后另行补真实推荐来源覆盖 | 新标签目前不保证有活动；除Music外无获准真实来源映射时如实显示无匹配 |
| B：本轮保留现有Music，暂不扩目录/维护 | 继续完成现有真实推荐、参与、好友推荐和记录，不等待Admin | 兴趣范围保持很窄，目录维护继续Pending |

这不是“12类活动已经接入”的承诺。19Oct演示批准的准确Music segment映射继续有效，其他标签不得通过同名类别自动映射。已有四名称离线fixture不构成正式目录来源。

## 建议最小物理合同（与内容一起审阅）

依据：Q12-A/B/C/D、[Backend架构](../decisions/2026-09-01-backend-architecture.md)、既有`interest_tags`读取和个人Interest替换合同。

1. **身份**：建议保留原Firebase验证/撤销检查，以可信Firebase用户当前custom claim `enmoriAdmin === true`作为最小Admin能力；此claim只能由既有授权系统owner在应用外分配。普通请求不得指定role/UID，不把Linux operator/root等同产品Admin。新Admin检查通过独立内层Port读取当前权限，适配器留在Infrastructure，既有普通AuthPrincipal和用户接口不必扩字段。本轮采用该最小能力边界；未实际授予任何用户Admin权限。
2. **接口**：建议仅新增`POST /v1/admin/interest-tags`，请求严格为`{"displayName":"Books"}`；额外字段拒绝。201响应`{"interestTag":{"interestTagId":"<server-id>","displayName":"Books","lifecycleState":"active","revision":1}}`。ID由服务器生成UUID，不接受客户端ID。名称、生命周期及revision规则沿用Q12，首次revision兼容现有整数存储。
3. **错误**：沿用当前安全错误envelope及401/403/503；新增与Q12一致的422 `CATALOGUE_INVALID`、409 `CATALOGUE_NAME_CONFLICT`，格式/额外字段400 `REQUEST_INVALID`。不输出底层异常、操作者身份或冲突引用详情。单项创建不自动重试；丢失响应后读取目录确认，重发相同名称只产生409，不产生第二条。完整rename/deactivate/restore/delete及管理列表不是本次接口。
4. **数据与原子性**：保留`interest_tags/{serverId}`既有`displayName/lifecycleState/revision`字段。建议新增Backend-only名称预留`interest_tag_names/{sha256(comparisonKey)}`，存`comparisonKey`和`interestTagId`，与新标签同事务创建；Active和Inactive均占名称。命中哈希但键不同则安全拒绝，不覆盖。读列表/个人保存无DTO变化，不需复合查询索引。
5. **存量兼容**：先只读核对全部现有目录及Q12规范化冲突；为已有条目准备明确范围的预留回填，保留ID、名称和用户引用。若发现冲突则只暂停创建，不重命名、合并或删除原条目。实施者先交准确回填清单及验证结果，现有演示环境不停机、不清数据。
6. **Unicode**：必须执行Q12的NFC显示名和NFKC→完整默认case-fold→trim→连续空白合并；不得用JavaScript `toLowerCase()`替代case-fold。实施时提交固定Unicode映射数据来源/许可及非ASCII冲突测试；不擅自新增运行依赖或将目录改为ASCII-only。若此实现前提未解决，仅创建接口保持局部阻塞，用户选择/推荐不受影响。
7. **最小使用方式**：先交受保护API和正常目录读取，允许授权Admin通过明确单项调用维护；完整Admin页面后续单独增量。运行环境只沿用批准的受控Backend；授权具体Admin身份和实际存量回填须采用已有本机认证流程，不在公开Issue提供凭据。

上述A是推荐合同方向的完整选择包，尚不是完成的OpenAPI/实现/迁移验收；本轮按此补准确规范、Unicode数据证据和存量核对，形成一份代码/验证包。对现有存量有冲突或需要新依赖时才提出具体局部决定，不重复询问已批准内容。

## 验收条件

- 未登录401、非Admin/撤销Admin403；伪造客户端role没有效果；正常读取和个人保存权限不变。
- 同名并发只有一个201；规范化等价名冲突，Inactive名仍占用；无用户引用重写或悬空ID。
- Active目录可超过10项；用户0/常规/10项保存有效，第11项被拒绝；重新进入一致，412提示重读而非自动覆盖。
- 保存Music时读取真实Music匹配；没有获准匹配的新兴趣如实返回空结果，不造卡片。清除Music后按现有规则重算。
- 记录确切源码、实际目录、数据生命周期、API与客户端证据；fixture、历史手机结果与当前环境分别注明。

本轮按[单对话执行决定](../decisions/2026-10-19-li-core-feature-delivery.md)实施，其他成员分工文字仅保留于历史来源。
