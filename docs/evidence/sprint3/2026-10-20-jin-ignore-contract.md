# JIN：持续忽略与恢复的实施合同

控制来源：`S-PM-1020-LI-FRIEND-IGNORE`（本分支保存与 LI `900ca6f` 相同的决定），原完整 `jin.md` 的必要合同实施授权。本文记录实施映射，不把字段选择追溯写成 LI 原文，也不新增产品行为。原请求及 `2026-10-20-jin-module-integration.md` 中当时 Pending 保留为历史；此局部等待已解除。

## 私有状态和事务

使用现有 Backend/Auth/Firestore，无新依赖、端口、监听器或迁移/部署程序。`friend_recommendation_preferences/{key}` 是唯一新增集合：

- `key = SHA256(JSON(["friend-ignore-v1", ownerAccountId, targetAccountId]))`，只由服务器身份构造。
- 恰好四字段：`ownerAccountId`、`targetAccountId`、`ignored: boolean`、`revision: safe positive integer`。不保存 Username、显示名、推荐分数、内容、坐标、时间线或通知。
- 缺记录是 `ignored=false, revision=0`。恢复保留 `false` 的最小版本记录，防止恢复→再忽略后旧 Undo 产生 ABA 覆盖。无 TTL、无自动恢复。
- 每次读取/写入均在一个当前授权事务中核对 Auth binding、账号资格、canonical Username reservation、双方关系/屏蔽、当前公开资料与推荐同意、未过期 pending request。恢复/列表只暴露目前可发现的目标；其他目标隐藏，记录仍保留。
- 写入带 `expectedVersion`，是 `SHA256(JSON([key, revision]))` 的不透明版本。它不是凭据/授权；包括 owner/target identity，旧 Username 被另一账号采用也不沿用旧版本。变更递增版本；不匹配 412，禁止客户端覆盖。
- 推荐先排除 `ignored=true`，然后使用原冻结公式和完整获准候选排序/Home Top 2；管理列表及 restore 不保证重新获得匹配或出现在旧位置。
- 管理列表按 key 稳定读取每页 25，最多 40 页。不能完整读取时返回 unavailable，不伪造空列表/部分成功。现有单字段查询加 document ID，不增加索引配置；隔离 SDK 实际查询验证另见回执。

## HTTP / Dart

规范 `api/openapi.json`，在 `registerSocialModule` 一起注册：

| 操作 | 合同 |
| --- | --- |
| GET `/v1/me/friend-recommendation-ignores` | `{people:[{username,displayName,ignored:true,version}]}`，仅当前可用目标 |
| GET `/v1/me/friend-recommendation-ignores/{username}` | 当前 `{username,displayName,ignored,version}`；未知写入后用于显式回读 |
| PUT 同一单人路径 | 严格 `{ignored:boolean,expectedVersion:string}`；忽略/长期恢复/Undo 同一个操作 |
| GET `/v1/recommendations/friends` | 原最小投影加 `ignoreVersion`，不输出 account ID/评分 |

全部 Firebase 身份验证、当前授权、`Cache-Control: no-store`；拒绝多余 body/query、伪造 owner、非法版本。新失败 `FRIEND_IGNORE_PRECONDITION_FAILED` 是 412；其余沿用稳定失败 envelope，不返回供应商错误。没有通知、拉黑或通用 Undo API。准确 Username lookup/好友请求不读取此集合。

`FriendIgnoreController` 的未知写入锁存活于当前会话，离开管理页也不会丢锁；任何失败/超时/不合格响应先显示失败并要求显式 GET，不自动 PUT。回读成功或当前目标已不可用才解除该锁。只在确认忽略成功后显示 SnackBar；同一恢复方法用于 Undo 和管理页，当前账号/会话/目标/版本全部约束。旧会话获取 token 后不再 dispatch；已发请求的迟到 UI 响应被隔离。跨 Home/See All 失效后重新读推荐，不从旧卡片补回。

沿用 Flutter 默认普通 SnackBar 时长；本项目锁定 Flutter 3.47.2 的带 action SnackBar 默认 persist，因此显式使用正常自动消失，accessible navigation 开启时保持可操作动作。没有新计时服务或独立产品倒计时；提示关闭/换人/导航/会话变更正确释放引用。

## 永久删除接缝及界限

`cleanupDeletedAccountPreferences(store, accountId)` 是内部执行器接缝，没有新增账号删除 HTTP 入口。必须先有既有 `friend_access.eligibilityState="permanently-deleted"` tombstone；普通/暂时不可用账号不能调用。每个事务分别最多取 25 条 outgoing/incoming，验证归属后删除；执行器重复直到 `complete=true`，再记录关联清理完成。包括恢复后的版本记录。tombstone 同时拒绝任何新写入，防止边清理边产生新关联。

本基线尚无实际账号永久删除执行器连接该方法。手工夹具和隔离 SDK 仅证明接缝允许/拒绝及双向清理，**实际账号删除全流程 Not Run，接线未完成**。不得将未来 executor 工作隐去或把目标暂时不可见当成永久删除。
