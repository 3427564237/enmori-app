# SHI Events：一次性参与合同确认稿

状态：**待 LI 确认；不是已批准的 API 或数据合同**。准备人：集成方，2026-10-20。
输入：SHI `538b34dad804853b318bba3b149c304e564a1f3b`；集成起点 `065ab3880f7da9814ff6c6c73954e880e2e1d737`。

## 已有决定，直接沿用

- [19Oct 核心体验](../decisions/2026-10-19-li-core-feature-delivery.md)第9项：Interested/Going、取消、忽略、跨页一致、外部返回明确 Yes → Going / No → 原状态、无 Booked、参与名单及人数受隐私约束。
- [19Oct 真实活动衔接](../decisions/2026-10-19-li-sponsor-demo-local-takeover.md)：准确 occurrence → 稳定内部 Event ID，五分钟内存来源投影、Music 唯一已批准映射，不增加来源抓取范围。
- [15Oct 浏览合同](../decisions/2026-10-15-li-real-event-contract-selection.md)及[外部打开](../decisions/2026-10-15-li-event-external-open-selection.md)：严格来源/链接验证、no-store、身份/完成引导、缺失字段不编造，保留其未被上述决定明确替代的边界。
- 用户拒绝推荐数据同意仍可手动浏览和参与；客户端不直写 Firestore；当前身份、关系和分项隐私由 Backend 判定。

## 建议一次批准 P01–P06

| 编号 | 选择 | 用户看到的行为 |
| --- | --- | --- |
| P01 | `none / interested / going` 三个互斥状态；`ignored` 独立。忽略只隐藏推荐，不取消参与。明确选择 Interested 或 Going 清除 ignored；取消仅设置 none，保留 ignored；外部返回 No 不写。 | Going 不会因为忽略推荐而丢失。 |
| P02 | 一个账号 × 一个稳定 Event ID 保存一条状态；GET/PUT 替换，body `expectedRevision`，沿用现有 revision 和错误信封。缺记录为 revision0。有效变化加1，无变化不加；先核对版本再判断无变化。412 后重读，未知结果先重读，不自动重发。 | 重复点击不会重复参加；冲突可恢复。 |
| P03 | 只保存参与事实，不复制供应商标题、简介、时间、链接、图片。五分钟来源过期不删除参与。新建/改为 Interested/Going/首次忽略需当前有效来源；已有状态的读取、取消和取消忽略不依赖来源在线。 | 活动暂不可用时显示“活动信息暂不可用”，保留本人状态并允许取消；不伪造历史详情。 |
| P04 | Friends/Others 分页，每页最多20人，每次重新检查当前关系、屏蔽、账号资格和 participation 隐私；缺隐私视为 Private。沿用现有唯一不可修改 Username 作资料定位，名字按已有公开投影权限返回。本人仅出现在自己的参与区，不列入 Friends/Others 及其人数。 | 名单和人数只包含当次有权看到的人；不泄露 Firebase UID/内部 accountId。 |
| P05 | 允许 SHI 在下述窄范围内完成准确物理合同、OpenAPI、存储与分页细节，并随同代码交付，不再为每个字段名称逐项等待 LI。不得扩展范围、增加依赖、改变隐私或来源读取规则；新冲突集中报告。 | 一份完整任务继续做完前后端和隔离验证。 |
| P06 | 当前关闭的真实账号参与组合保持关闭，先做隔离数据验证和真实 Repository 注入接缝；LI 最后接本机并统一验证。 | 组件可测不冒充真机或真实保存通过。 |

## P05 授权的明确技术范围（确认前不实施）

此项是窄范围实施细节授权，**不是**允许改架构。SHI 应在写实现前，把最终字段/索引/游标/错误合同写入 `api/` 及对应数据合同并引用本次确认。实现与严格 fixtures 同步。若超出以下边界，才需要再次集中决策。

- 本人 `GET/PUT /v1/events/{eventId}/participation`。请求/响应只含状态、ignored、revision、服务端时间以及必要 Event ID；PUT 必须明确完整目标状态和 expectedRevision，拒绝额外字段、客户端身份与未经批准的幂等 header。
- `GET /v1/events/{eventId}/participants`：Interested/Going × Friends/Others、每页最多20、opaque cursor；排序稳定，游标绑定请求人和 Event/状态/分组/排序版本，解码不授予权限，不含 Firebase UID/内部账号明文。稀疏页可返回少于20及下一页；客户端不能以空页代替结束。对权限变化刷新列表，不能用旧游标保留旧权限或旧人数。
- 本人及好友资料的参与记录读取，复用当前 Username → trusted account 的关系/资料接缝。公共记录仅含 eventId、status 及当前获准活动投影；其它账号的 ignored、revision、私有保存时间不公开。参与可见不自动授权读取完整个人资料、位置或兴趣。
- 本人事实持久化、一对账号/Event唯一、服务端事务比较 revision，不新增历史审计表、离线队列或通用工作流。允许一张参与事实集合以及确实用于 owner/Event/status 查询的最少索引；具体键/字段由 SHI 在合同中列清。取消保留最小 none/revision 记录避免旧请求复活；正常重启不清除。
- 用户永久删除时参与事实随账号业务数据删除；暂不具备账号删除执行器时只记录该接缝，不能声称已执行。来源缓存刷新/活动自然结束不触发用户状态清库；明确来源撤除时停止其内容投影，不新建供应商内容档案。
- 权限检查与分页读取使用可信账号、当前 relationship/block/eligibility 和现有 fieldPrivacy.participation；不能相信客户端传来的 isFriend/隐私等。DTO 资料身份采用 username，displayName 缺失/无权时省略，不因名字缺失丢掉合法用户。
- 人数只可返回当次授权过滤后的准确人数；不得使用未过滤总数或把当前页长度当总数。采用有界扫描，无法完成准确统计时省略人数并提供诚实的不可用状态，不能报0；不得后台无限抓取。扫描界限、游标及索引是 P05 允许 SHI 明确并测试的实施细节。
- 沿用当前 Event ID 映射函数/结果，不把 tm_ browseId 当 eventId。Events 浏览投影需要稳定 eventId 时可最小增加后端派生字段并同步严格 DTO；不让 Flutter 按标题/散列算法猜身份，不持久化供应商内容。
- 推荐只过滤本人 ignored；不改变 Music 映射、排序算法或拒绝同意行为。其它兴趣无真实匹配明确空态。
- 错误沿用现有安全信封，认证/引导/不可用/依赖错误复用当前类别；400请求形状，422字段值，412版本冲突。必要新增参与错误标识由 SHI 在精确合同中一次列出，不暴露上游错误。
- 允许更新对应 feature 文件、最少 shared query seam、严格合同/OpenAPI fixture；LI 最终接共享 bootstrap/router。JIN 的现有身份/关系服务以接口注入，不要求等待另一份全模块交付，也不复制好友业务逻辑。ZHOU 仍独立审查 SHI 新代码。

## 替代范围

批准后只解除 SHI 的[参与合同缺口](2026-10-20-shi-event-participation-contract-gaps.md)中 P01–P06 覆盖的门禁；保留旧来源和旧 Not Run 结果。P05 明确委托这些未决定的实施细节，符合 AGENTS 的 PM 委托范围；它不改变更高权限来源或其它模块的审批规则。确认后记录 `docs/decisions/` 并引用人类的实际答复，不把此草稿改写成早已确认。

设备返回/键盘、真实账号、实际持久保存和重启、真实外部报名返回均需各自验证；不自动 merge main、发布、关闭 Issue 或标 Done。
