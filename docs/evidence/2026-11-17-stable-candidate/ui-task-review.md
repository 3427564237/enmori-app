# UI 与用户任务审查

日期：2026-11-17，Asia/Singapore。起始源码为 v79
`c6f138b90522f5d5131a55f190dffa8965cd3bda`。本报告记录代码检查、Flutter
组件回归、合成渲染和对 v79–v83 私有手机截图的独立审阅；最终 APK、后端身份、
后续手机观察和定版结论以[主报告](README.md)及其收据为准。
本子任务没有操作手机、真实账号或后端，没有真人用户研究，也没有模拟器验收。

**当前证据边界**：交付候选已推进到 v83；主审查的[手机记录](physical-acceptance.md)
确认已保留数据安装，源码 `abc072adfdae57e4cdd0fd7c9de4b2bbfe21a445`，APK SHA-256
`7dd81dfdc2783a58cd6acfbf5d446000b1c35312364f25e5975d4160270fc9b8`。
本视觉子任务已独立查看下文列出的 v83 社交与中文2倍字体画面；只确认所见状态，
中文发现的首批图仍在加载，随后补图才显示结果和名片，二者分别记录；未把加载图算成内容成功。
下列各版章节保留当时的发现与限制；其中“待验/拟生成”是对应历史检查时点，
不能理解为 v83 未安装，也不能把 v80–v82 的图像通过自动转写成 v83 或整版通过。

## 范围和依据

- [本轮审查及社交 UI 补充](../../decisions/2026-11-17-li-stable-candidate-review.md)
  允许修复有根因的稳定性和可用性问题，并整理可能认识的人完整列表、好友动态及相关头像呈现。
- [现有产品界面](../../decisions/2026-10-21-li-product-ui-redesign-and-defaults.md)、
  [兴趣和发现整理](../../decisions/2026-11-17-li-interest-discovery-uiux.md)、
  [好友发现规则](../../decisions/2026-11-15-li-friends-discovery-usability.md)、
  [好友资料修复](../../decisions/2026-11-16-li-friend-profile-repair.md)保持有效。
  采用既有绿色、纸色背景、卡片、字体和按钮体系；不增加关系权限、可见字段或排名规则。
- [可跳过资料引导](../../decisions/2026-11-15-li-registration-profile-guide.md)、
  [记录任务](../../decisions/2026-10-23-journal-product-round.md)、
  [新草稿](../../decisions/2026-10-23-journal-round2-new-draft.md)、
  [设置恢复](../../decisions/2026-10-23-li-app-preferences-recovery.md)、
  [引用关闭](../../decisions/2026-10-26-li-reference-off-history-exclusion.md)、
  [状态保留](../../decisions/2026-10-26-li-v31-recovery-and-state-preservation.md)
  用来区分既定任务、未保存草稿和已发出请求恢复；实现本身不作为需求依据。
- 采用仓库 `ui-ux-pro-max`、`flutter-add-widget-test`、
  `dart-flutter-patterns`、`flutter-fix-layout-issues`、`systematic-debugging` 和
  `flutter-dart-code-review` 的对应检查步骤；没有新增依赖或产品行为。

## 按任务的证据矩阵

表中“通过”只指列明的自动化或截图层，不代表真实连通服务或最终 APK 全任务通过。
这是本子任务的证据范围；主审查后来执行的各候选包实际操作见
[手机记录](physical-acceptance.md)。v80 因随后发现 SC-07 成为中间候选；v81 又发现离开编辑后的
空白详情恢复问题，两者都不能替代随后修复包的验收。

| 用户任务 | 已验证、结果和证据 | 未验证或限制 |
| --- | --- | --- |
| 首次使用与兴趣设置 | 现有注册→可跳过资料→推荐资料→兴趣流程组件通过。可选昵称保存、取消/跳过不改隐私、pending 禁止重复提交、旧结果不推进新会话均有回归。兴趣搜索不丢隐藏选择，已选摘要可移除，320dp/2x 字体/键盘下数量及保存操作可达。v79 截图可见兴趣搜索、计数和保存入口。 | 没有新建真实账号；邮件验证、真实初次引导完整闭环及最终 APK 保存重开未由本子任务验证。条款正文入口缺失见 SC-05。 |
| 记录与回看 | 编辑/从已有记录新建草稿、日历/搜索、pending 创建后离开再回、旧结果不覆盖当前页等既有组件通过。原始请求与新草稿分开恢复，避免把未知请求编辑为另一笔保存。 | 本子任务未创建/删除真实记录；主审查随后在中间 v80 操作合成私密记录并发现 SC-07，详见手机记录。最终包的断网保存、History/Calendar/Footprint 不由此自动通过。 |
| AI 对话 | 已有会话、同意门槛、未知发送反馈、系统 Back 先关抽屉、长回复滚动、键盘/IME 与双语回归通过。v79 空对话截图中输入入口与空内容下禁用发送可理解。 | 未在本子任务发出真实 AI 请求、观察真实回复、系统通知或跨设备结果。截图不能证明加载、发送或键盘交互成功。 |
| 好友与个人资料 | 现有好友资料权限、事件条目进入和返回后重读、同会话/后台撤权回调组件回归通过。头像缺陷先失败后通过；EN/ZH、窄屏大字、横屏布局组件检查通过。独立查看v82发现/名片/资料与有内容的签到动态、返回后Created过滤仍选中的画面，及Going筛选空态；v83另有英文发现/名片/签到动态/好友资料及中文2倍字体发现结果、滚动后操作和名片的画面复核。 | 静态图只确认当前可见状态，主审查另记录实际操作；没有把Going空态替代有内容的Going/Interested卡片验收。图片头像、双账号关系闭环、忽略撤销仍须对应证据，未写全UI通过。v83中文发现首图仍加载，随后结果补图单独记录。 |
| 活动发现与计划 | 本子任务既有范围内的兴趣发现测试验证时间筛选继续读取后页、失败可继续/清除筛选，不能把未完整读取写成空结果。 | 推荐列表 Undo、onePA 真实降级/恢复、计划变更读回由专项报告记录；不以本 UI 通过代替。 |
| 设置与隐私 | 保存冲突、结果未知时禁止盲目重发、确认读回失败不能报告已保存、旧会话/已离开页面结果不覆盖新状态、语言路由回归通过。EN/ZH 登录/注册/兴趣/设置标签与触控检查通过。v79 截图可见独立同意说明和保存入口。 | 没有改变真实同意、分享或语言设置；实际 TalkBack、所有系统字号、正式深色模式不在这些组件通过结论内。 |

## 问题及处理

### SC-02：发现名片头像横向拉伸，本轮应修

- **版本/页面**：v79；可能认识的人 → 发现名片；共享 `IdentityAvatar`。
- **复现**：在 375dp 宽的真实 `DiscoveryCardPage` 组件中读取合成名片。
  旧页面将头像直接放入竖向 `ListView`。原声明 40×40 的内层头像实际测量为
  **335×40**；默认构建器和正式应用使用的 `AvatarPixels(photo: null)` 占位路径均复现。
- **预期/实际**：指定尺寸的头像应保持正方形内的圆形。`ListView` 的交叉轴紧约束
  覆盖内部 `SizedBox.square` 宽度，`AvatarPixels` 的占位被 `ClipOval` 裁成占满行宽的扁椭圆。
  原默认 `CircleAvatar` 的装饰有时仍画成小圆，但组件宽度已失真，因此不能只看一种占位图。
- **影响**：身份视觉占比错误，头像内容变形；这是可重复的约束缺陷。
  “页面简陋”本身是用户提出的呈现改进，不作为发布阻断的客观故障。
- **最小修复**：在共享 `IdentityAvatar` 外层 `Align` 放松紧宽约束，内层
  `SizedBox.square` 固定请求尺寸。保留原认证头像构建、可见性、读取和资源释放路径。
  发现名片使用 64dp 头像与姓名/用户名并排，最大内容宽 640dp，保留隐私说明和原操作。
- **同次授权整理**：可能认识的人卡片分开身份、推荐原因/共同兴趣和操作；好友动态分开
  身份/时间、类型、内容与操作。采用现有组件与颜色，保留原字段、排序、回调、忽略/撤销、
  来源再验证和会话边界；没有翻译未知后端 `reason` 文本。
- **回归**：修复前两项尺寸断言失败；修复后默认和 `AvatarPixels` 均为 64×64。
  社交/头像既有定向回归 49 项通过，最终布局矩阵 26 项通过（两个批次有重叠，不合计成
  独立测试数量）。独立生产代码审阅未发现新的权限/导航问题，见 [route-review](route-review.md)。
- **剩余**：源码/组件层已修，v80–v83 占位头像有下文有限实机观察；v83 英文发现、名片、
  签到动态、好友资料和中文2倍字体发现/名片中未见横向拉伸。真实图片头像路径仍未由这些占位图验证，不能据此关闭所有头像场景。

对应生产文件：`lib/core/presentation/identity_avatar.dart`、
`lib/features/friends/presentation/discovery_card_page.dart`、
`lib/features/friends/presentation/friend_discovery_panel.dart`、
`lib/features/friends/presentation/friend_activity_panel.dart`。

合成前后图存放于仓库外 `/home/miku/Downloads/ENMORI-v80-review/`：

- `card-en-phone-v79-avatar-before.png`：从 v79 Git blob 读取原发现页和原 IdentityAvatar，
  注入合成身份及原正式像素构建路径，测量并呈现 335×40。
- `card-en-phone-v80-avatar-after.png`：同样合成身份与像素构建路径，v80准备时的候选布局测量为64×64。
- 前后图测试都通过其各自预期尺寸；原源码仅在临时测试夹具中读取，未回退共享工作树。
  三个临时夹具在全量测试前删除。图像不是手机截图；未使用私人头像或记录。

### SC-05：注册使用条款无法在当前页面阅读，本轮应修、需内容决策

- **复现/证据**：`lib/features/auth/presentation/registration_page.dart:193` 的
  `register-terms` 必选框要求同意使用条款，未提供查看入口；本次源码搜索未找到对应正文或 URL。
- **预期/影响**：首次使用者需要知道所同意内容。注册校验通过并不解决信息缺口。
  此处是产品信息可读性问题，不据此作法律合规结论。
- **权限边界**：[已批准注册范围](../../decisions/2026-10-19-li-core-feature-delivery.md)
  列出条款确认框，但本次未找到已批准正文/地址。
- **最小方案**：提供/确认有效正文或 URL 后，在现有确认框旁添加查看入口并回归返回/草稿保留；
  本次没有代写承诺、删除勾选要求或选择外部地址。
- **复测**：尚未实施，因此未关闭。

### SC-06：正式应用没有深色模式，可延期、明确限制

- **证据**：`lib/app/app.dart` 和 `lib/app/controlled_demo_app.dart` 仅传入浅色
  `enmoriTheme()` / `socialDemoTheme()`；没有 `darkTheme` 或应用主题选择。
  `lib/app/enmori_theme.dart` 定义浅色纸色背景和配色。
- **结果**：单独注入深色 `ThemeData` 的组件可用性检查不能证明正式 APK 支持系统深色。
  本轮未发明新的主题功能或改变现有设计决定。
- **处理**：保留为能力限制；若需要正式深色模式，另行确定设计和验收范围。

### 双语来源文本限制，可延期

前端控件标签按 EN/ZH 显示；推荐原因 `FriendSuggestion.reason` 和来源/用户内容按原文显示。
合成中文列表中出现 `Shared interests` 是夹具按服务器字段提供的原文，不是宣称后端已本地化。
未发现可以安全套用的批准映射，故未在此静默翻译或更改契约。真实来源完整中文体验仍未验证。

## 界面、无障碍和证据强度

- 新 `core_task_accessibility_test.dart` 共8项：EN/ZH × 登录、注册、兴趣、设置；
  初始视口检查 Android 触控指南，滚动各视口检查可点击语义标签，并对已构建的按钮、图标按钮、
  SwitchListTile、FilterChip 测量完整控件 ≥48dp。测试还验证实际表单控件已加载及没有设置写入。
  这不覆盖所有语义、所有页面或实际读屏顺序。
- 新 `social_discovery_layout_test.dart` 共26项：EN/ZH × 三类页面 ×
  375×812/1x、320×740/2x文字、740×375/2x文字、独立深色夹具，共24项；
  另两项覆盖不同头像构建路径。验证无布局异常、声明尺寸与头像实际尺寸一致、滚动后操作可点击。
  未将“没有 overflow”提升为完整视觉/无障碍合格结论。
- 合成图使用测试字体加载器载入 Roboto、Playfair、CJK 和图标字体。首轮中文 AppBar
  缺字由夹具未向独立 AppBar 标题样式提供 CJK fallback 引起；补齐后已重新渲染并目视确认。
  未因此改动生产字体，也不把测试画面的缺字误报为手机缺陷。
- 独立查看主审查提供的五张 v79 手机截图：Home、资料入口、AI入口、设置同意说明、兴趣长草稿。
  未从这些静态图找到可确定的新布局阻断；主操作与说明可见。视口边缘的部分资料行属于滚动内容，
  不能据此宣称永久遮挡；设备系统手写字体不是 App 缺陷。空态留白或字体喜好不作为故障。
  没有复制私人截图进仓库，也没有从静态图推断完整交互成功。
- 已有测试含双语、键盘/IME、大字、加载/空态/错误区分和返回动作；未做真实 TalkBack 听读、
  全 App 颜色对比测量、iOS/所有 Android 版本/所有屏幕检查或真人首次使用观察。

## 自动化收据

以下是 v80 准备阶段的定向批次，后续完整候选回归不能只引用这些早期数量。
使用仓库锁定依赖和 FVM Flutter 3.47.2。日志保留在仓库外
`/home/miku/.local/state/enmori-stable-audit-20261117/`，摘要/哈希见
[ui-verification.json](ui-verification.json)。最终全量运行由主报告另行给出。

| 批次 | 结果 | 日志 |
| --- | --- | --- |
| 20个现有核心任务文件 | 223通过 | `ui-existing-tests.log` |
| 新核心标签与触控检查 | 8通过 | `ui-accessibility-final.log` |
| 社交/导航/头像9个文件，含最初两个布局断言 | 49通过 | `social-focused.log` |
| 最终社交矩阵与两个头像路径 | 26通过 | `social-layout-final.log` |
| 全量发现的旧本地化断言更新后复测 | 3通过 | `social-localization-final.log` |
| 原v79/候选 AvatarPixels 合成前后尺寸夹具 | 2通过；临时夹具已删除 | `social-v79-before-preview.log` |
| 核心测试及社交变更定向 analyze | 无问题；最终全量另记 | `ui-accessibility-analyze.log`、`social-analyze.log` |

20个现有文件为：`registration_guide_flow_test`、`registration_profile_page_test`、
`auth_email_page_test`、`interest_editor_page_test`、`interest_discovery_usability_test`、
`check_in_edit_flow_test`、`check_in_pending_recovery_test`、`check_in_from_record_flow_test`、
`check_in_calendar_flow_test`、`check_in_search_test`、`ai_chat_usability_test`、
`ai_conversation_page_test`、`ai_consent_gate_test`、`social_profile_flow_test`、
`friend_profile_presentation_test`、`account_preferences_flow_test`、`own_profile_flow_test`、
`app_language_test`、`settings_language_router_test`、`shared_uiux_test`。

社交9个文件为：`social_discovery_layout_test`、`discovery_profile_navigation_test`、
`friend_activity_display_test`、`friend_activity_event_entry_test`、
`friend_activity_profile_navigation_test`、`friend_discovery_activity_map_test`、
`friend_module_discovery_entry_test`、`shared_avatar_test`、`own_avatar_test`。

失败记录保持区分：`social-layout-before.log` 是修复前真实335×40尺寸失败；
`social-layout-harness-failure.log` 是横屏未构建的懒加载子项被 `.first` 提前读取的夹具错误，
随后使用未限定首项的 finder 先滚动构建再查找，最终通过。核心语义检查初次在测试清理阶段
未及时释放 handle 的错误也没有被当成产品缺陷。测试中出现的字体/编码夹具问题已修正，
不声称这些失败都来自产品。

首次全量运行还发现 `social_localization_test.dart` 的旧断言要求完整字符串
`@member_a · 将参加活动`，而本次已授权布局将身份和活动类型分成两个文本节点。
修改测试，在同一个 `FriendActivityContent` 的 going 条目内分别断言未改写的
`@member_a` 与中文 `将参加活动`，保留原姓名、活动标题、记录原文和 Mood 断言。
没有放宽到在任意其他条目找到文字就通过，也没有修改生产代码；该文件3项复测通过。
全量最终结果由主报告记录，初次全量失败不隐藏。

## 路由修复的独立审查

独立审阅 `controlled_demo_app.dart` 的最终差异与新生命周期测试，未发现新的可操作问题。
缓存 overrides 绑定当前连接；所有构造器连接/功能/消息配置字段均参与 `didUpdateWidget`
的重建判定。`onClose` 每次直接传给 `_ConnectedPages`，没有存入旧 overrides。
新的 `_api` 改变 `ProviderScope` 的 key，既有会话、来源页面和前后台回调守卫保留。
新测试覆盖相同组合重建保留草稿，以及保存中重建只有一个 PUT 和一个成功回执。
这次独立审阅是源码/测试审阅，不证明历史真实手机回首页的原因；其未决状态见
[route-review](route-review.md)。

## 随后补充：v80 实际手机画面的独立复核

主审查随后确认已保留数据安装 v80，源提交 `82a6658`，APK SHA-256为
`3f6cecd324efd584c745f1ac010d23c8586e0014150dd39bbc4a2395d588f7ab`，构建/安装绑定见
[手机记录](physical-acceptance.md)。该包随后成为中间候选，本段不声称 v81 已验。
本段仅将前文“候选实机视觉待验”
中的下列可见状态更新为已独立查看；不替代主审查正在执行的交互验收。
本子任务仍未操作手机或按钮。

- 对照 v79 的实际发现名片图，头像占位确实呈宽扁椭圆；v80 的发现列表和发现名片中，
  占位头像均目视为圆形，没有再横向占满行宽。该画面与组件约束修复的结果一致。
  主审查的 v79 手机边界测量为320×40dp；375dp合成夹具的335×40dp是另一个视口的结果，
  两者不能互换，也未从 v80 静态图声称精确64dp实测。截图中的占位头像不能代替真实图片解码/上传路径验收。
- v80 发现名片中身份卡片、隐私说明、查看资料及好友申请操作层级清楚；返回和两个按钮
  在当前视口完整可见。身份文本在该设备当前字体/字号下未见截断或越界。
- v80 发现列表中身份、原因/共同兴趣和进入发现名片入口分组清楚，卡片内信息未见重叠；
  设置、刷新和导航入口可见。没有仅据静态图推断操作实际命中、请求成功或权限结果。
- 一个**可延期的既有信息位置问题**仍可见：列表结束提示在第一张结果卡片上方。
  它可能先让使用者误读为没有结果，但当前卡片和入口完整可见，不构成此次访问阻断。
  后续可把该状态提示移到实际结果之后；本次没有在冻结后追加生产改动。
- 该观察仅限这些图片的英文、竖屏、当前系统字体/字号和已有数据状态；没有由此宣称中文、
  大字、滚动、读屏、所有社交动态状态或全部核心任务真机通过。系统手写字体仍不视为应用缺陷。
- 主审查另有 v80 Friends Activity 的实际签到类型条目和资料往返记录，不能把它误写成空态验收。
  本子任务尚未独立查看该动态条目截图；合成 `activity-*` 图片只说明组件布局，不能替代该实机证据，
  也不覆盖 Interested/Going 动态、空/错误/重试等所有状态。

私有原图保持仓库外，仅记录文件名及完整哈希，不收录账号标识、姓名或图像内容：

| 文件 | SHA-256 |
| --- | --- |
| `v80-discover.png` | `e238b27276eed6b78dbcfa116a26b3b8b3ae01e20b561c43b2c3f8aa0ffe9e8a` |
| `v80-card-initial.png` | `2a362eef2bf21d2de74894adebc47f78a02dbdd826016c53b9598dc37473d80c` |
| `v79-discovery-card-ready.png` | `433a55d8692a114f799104167d4019db1f81788fa635f2fdd312b0132bc44c8e` |

## 随后补充：v81 中间版本画面与新增恢复异常

v81 源码 `683f0a1a41d20936ffcf524ab5cdbb436bb5bbca`，安装包SHA-256
`92f29670486115a8b3492a31ceed9f21d76372a759044db8c5129b3213f2f548` 的实际安装绑定见
[手机记录](physical-acceptance.md)。本次独立查看五张私有截图，未操作手机：

- 发现完整列表与发现名片继续显示圆形占位头像，身份、说明和操作分组可读；当前视口没有
  头像横向拉伸或卡片文本重叠。此前列表结束提示在首卡上方的位置限制仍存在。
- AI 画面中键盘已展开，输入文字、光标和发送按钮完整位于键盘上方。这里只确认可见性，
  不由此声称输入法候选处理、发送命中、后端响应或读回通过，也不收录测试输入正文。
- 未知编辑结果的返回对话框已显示“离开不会取消请求或撤销结果”的说明，以及 Keep editing
  和 Leave 操作；当前英文竖屏下正文和两操作未被裁切。这支持退出说明的视觉修复，
  不单独证明继续编辑或离开后的整个恢复流程成功。
- **本轮应修的恢复异常**：离开后的 Saved Check-in 画面只有标题、返回箭头和 Return Home；
  当前画面没有记录、加载反馈、错误解释或 Reload。结合主审查的“未知编辑结果后 Leave”操作记录，
  这使用户无法确认原记录是否已改变，也没有该页内的读取恢复入口，不能当作正常空态或成功返回。
  本次最小修复由路由/恢复子任务负责，不因新提示文案已可读而关闭后续异常。

因此 v81 也属于中间候选；拟生成的 v82 必须重新验证该恢复路径。本子任务此时没有 v82
真机视觉或交互证据，亦未扩展为完整 Activity、图片头像、中文/大字或全部核心任务验收。

| 私有文件（仓库外） | SHA-256 |
| --- | --- |
| `v81-discover-ready.png` | `00920dfced21777920689f2d8bab5d25d2de0632638ae1bde474401f509ce4ca` |
| `v81-card.png` | `57d1cb9f0d929de37f924d22deb534bb4e9b2f487671fbe470bcffa5e2925b3a` |
| `v81-ai-keyboard.png` | `fcbd20e481c328df44cdfb79e75b51cb0c65bb27078b0e7e12d0c54e8c27be22` |
| `v81-edit-cut-back.png` | `4aea56374e97c6eb2b6fcdd6b4a410cdabdfba7412bde3d6283d6c261247a4cd` |
| `v81-edit-left-ready.png` | `d761b63e09342442916c5ac2f604c3989a27144b7d8bc673a9b9a5ff1688cec3` |

## 随后补充：v82 社交画面的独立复核（现为中间版本）

主审查确认实际安装包SHA-256为
`9bd1e2a973c59962ed5fcd06b69c7ba5363118dabfaa915185ff16f56aa706ba`，PID17380。
本段仅更新已查看的八张实际画面，不提前给出整版定版或全UI通过结论。

- 发现列表、发现名片、两个不同来源进入的资料页和签到动态条目中的**占位头像**均目视圆形，
  未再出现横向拉伸。没有照片头像，因此不能据此验证图片上传、下载、解码或真实照片裁切。
- 发现列表与名片保持身份、推荐信息/隐私说明和操作分组；资料页的头像、姓名、资料、
  功能分区可读。底部滚动内容在截图边缘部分出现，不据此报告永久遮挡或已经完成全页滚动验收。
- `v82-profile-return.png` 可见 Discover 标签被选中且有加载条，证明该画面返回到正确分区并呈现
  加载反馈；**该单张图不能证明列表已完成重载**。主审查的实际后续状态另记。
- `v82-activity-checkin.png` 是有内容的签到类型动态，身份/发生时间、动态类型、原记录、
  当次记录心情标签和两个查看操作层级清楚，当前画面没有重叠或裁掉操作。未把记录心情写成
  当前好友状态，也未抄录记录原文或账号信息。
- Activity→资料→返回由主审查实际操作；独立截图复核可见资料页内容，以及返回后仍处于
  Activity 标签、Created a Check-in 筛选仍选中、条目已显示。这里只支持这次有限导航/筛选观察，
  不声称所有后台、撤权、数据更新或滚动位置情景均通过。
- `v82-activity-going-ready.png` 是 Going to an event 被选中时的明确空态，有筛选和刷新入口。
  它不能作为有内容的 Going 或 Interested 活动卡片、详情进入或全部活动类型验收。
- 当前批次为英文、竖屏、当前系统字体/字号。中文/放大字体另待单独画面；真实TalkBack及
  所有页面状态仍未由本视觉子任务验证。既有首卡前的列表结束提示限制保留。

| 私有文件（仓库外） | SHA-256 |
| --- | --- |
| `v82-discover-ready.png` | `48e1eca9aa3f1061b7a933c2c1efb719cb0a58777acaa202338c958599b10448` |
| `v82-card-ready.png` | `e5caa2666ea25567311fa7740b0e2537f2c401004ed7984d1712cb1a6b684abc` |
| `v82-profile-ready.png` | `2cc296d048db560293a7c758d5ea796d3d657948dccc684d46fc08694b2c7de6` |
| `v82-profile-return.png` | `585b04be2e474b63a02172c5238a127862a429cb6cb917e83472a9eb4c3f767e` |
| `v82-activity-checkin.png` | `7f679be839897c34181987ea877787b1538ceafb1dc1623e792681327200b5b6` |
| `v82-activity-profile.png` | `7f9a72bc6d1c0646dba4d5385493efca9d1e193ba36ca0158e055b2f8635610e` |
| `v82-activity-return.png` | `19440c665bf502453ec64618c71ca27997bdf0dbf98a62fcecd1d3995be6c07a` |
| `v82-activity-going-ready.png` | `cba17c827348ddfeeaad3972a290a078f8ec7063395c1f455c994e3fd483b6d4` |

## 随后补充：v82 中文和系统2倍字体

主审查在同一 v82 包把实际系统 `font_scale` 设为2.0、应用语言切换为中文，再提供以下四张
画面供独立审阅。本段为 v82 的有限结果；随后推荐隐藏失败反馈的组件缺口促成 v83，
这些截图不能替代最终 v83 的抽检或整版验收。

- 设置说明自然换行，语言选择、返回、固定的保存区和已保存状态说明可见。滚动内容在固定
  保存区上沿部分裁入，单张图不足以证明全部设置控件都能滚到，也不足以据此判为永久遮挡。
- 首页新建签到和历史入口在所示视口内可读，底部导航仍可见，未见文字横向越界。
  仅审阅当前首页视口，没有据此覆盖所有首页模块。
- 发现卡片的长姓名、用户名及推荐原因换行，圆形占位头像不拉伸，中文进入名片操作完整可见。
  推荐原因/共同兴趣继续保留来源原文，中文界面仍含英文，属于此前记录的本地化限制。
- 发现名片的长身份分多行显示，隐私说明、查看主页和好友申请按钮在所示画面中完整可见，
  未发现此页大字下的明显重叠。
- **可延期的大字导航标签限制**：发现页面顶部固定宽度的“我的好友”标签在2倍字体下
  出现末尾裁切/淡出，未完整显示文字。当前“动态”“发现”仍可辨识；本次没有把这一局部问题
  写成全页不可用，也没有在最终单点冻结范围外追加生产改动。后续可对固定标签的宽度/换行
  做有针对性的检查与小修；完整无障碍不能因此记为通过。

主审查另记录同包设置草稿的 Private→Stay→Discard→重开为原 Public 行为，未保存隐私修改。
语言与字号试验结束后，主审查于20:00:20恢复 English、font1.0；[手机记录](physical-acceptance.md)
随后记录20:02:30重开设置为原 Public，以及20:03:17设备收据核对
night4 / Wi-Fi1 / mobile-data1 / timeout600000 / font1.0。这里采用主记录补齐各检查时间，
不再把所有恢复核对合并到20:00:20。它们明确归属于实际操作者的恢复记录，
不是从上述截图推断恢复已发生；本子任务没有操作设置或读取私人恢复JSON。

| 私有文件（仓库外） | SHA-256 |
| --- | --- |
| `v82-settings-zh-large.png` | `da2f77824dd1b1e918c928aef0cf9b923c63c0869e14ab13ada3842b0622584a` |
| `v82-home-zh-large.png` | `052862db323d1c54f54bb6e4d988fb92705853c5fc87e5530338c3b045556287` |
| `v82-discover-zh-large.png` | `e05920b4d3190d219837e83c8389abce58566acf566d3d958a440fec4baa62aa` |
| `v82-card-zh-large-ready.png` | `63d566df26b49ed0e132af1b7e921c2775f13e503271f50a0f22b898cf388fee` |


## 最终候选补充：v83 有限实机视觉复核

本批图片来自主审查已安装的同一 v83（源码与APK身份见本文开头），由主审查操作并保存，
本子任务只做独立目视和文件哈希核对。以下结果只对应图片中可见的视口；完整交互与恢复
结论仍以[手机记录](physical-acceptance.md)为准。

- 英文发现列表、发现名片、有内容的签到动态和好友资料中，占位头像均为圆形，未再见
  v79名片的横向长椭圆。它们只覆盖占位路径，不代表真实照片上传、解码或裁切经过验收。
- 发现列表把身份、原因/共同兴趣和名片入口分组；名片的身份卡、隐私说明、查看资料和
  好友申请按钮完整可见。当前英文视口未见文字重叠或操作裁切。“列表结束”提示仍位于
  第一张卡片之前，保留既有轻微信息顺序限制，不能据此说列表为空。
- Activity显示已选“Created a Check-in”和有内容的签到类型条目；身份/时间、类型、记录、
  当次记录心情及两个查看操作层级清楚。本报告不抄录账号或记录正文，也不把历史心情当作
  好友当前状态；这个条目不能替代有内容的Going/Interested类型验收。
- 好友资料画面中，身份信息、分区入口、共享兴趣及活动的明确空态可辨识。静态图不能证明
  权限校验、资料返回后的状态保留或这些分区里的内容打开成功。
- 中文系统2倍字体的设置页中，语言选择、说明和当前可见资料区域能换行，固定保存按钮
  可见。滚动区域下缘的部分内容在当前画面之外，不能单凭这一张图判定永久遮挡或全部可达。
- `v83-discover-zh-large-settled.png`实际上仍只有加载条、没有结果卡片；文件名中的
  `settled`不能作为加载完成证据。本批仅确认标题、发现设置入口和加载反馈可见，中文
  大字的结果内容与名片仍待后续图片。固定“我的好友”标签末字裁切/淡出仍可复现，沿用
  v82的可延期限制；“动态”“发现”可辨识。没有在冻结范围外追加生产修改。

本批不声称所有UI通过、真实TalkBack通过或原生深色主题受支持；中文结果完成与v83
试验设置恢复以随后独立证据补充。私人图片保留在仓库外，不复制个人字段。

| 私有图片 | SHA-256 |
| --- | --- |
| `v83-discover-loaded.png` | `2056f2cd91ff7f23603955d59a2e3384338931170b6afe88bfb95ef7814a765d` |
| `v83-discovery-card.png` | `64f6e08732b4a543644bcad19fa7d909fa5e9195741c18043be439c4c23d5cc6` |
| `v83-activity-loaded.png` | `474e2a26511d0c0892686f54bedab60504a066e0d0eabea6a169f50e66e7fab9` |
| `v83-activity-profile-loaded.png` | `c008f2e5c62d6d6cd0583f126e577ff9450cd02005d7f97ae2b1653c6ecd59ea` |
| `v83-settings-zh-large.png` | `d3f38e98d7a3fec1776acf2812299197b6f00077b56e4a583b8db49e9f20fa24` |
| `v83-discover-zh-large-settled.png` | `7fe2c433e4db8e3d77540579a12d35919d4afac0ab18d7f98e6d55a5fd8e650b` |


### v83 同包后续补图：中文结果、滚动操作和名片

首批之后，`v83-discover-zh-large-later.png`已显示结果卡片；主审查记录约20:34:58开始加载，
20:35:15仍加载，20:35:31已有内容。这些是UI观察点，不是精确HTTP计时，也不说明服务持续稳定。
随后滚动的`actions`图完整显示“查看发现名片”入口；主审查报告滚动后可达。
`v83-card-zh-large-loaded.png`中姓名与用户名按多行换行，圆形占位头像保持比例，隐私说明、
查看主页和好友申请按钮完整可见，未见文字重叠或操作被裁切。来源原因仍保留英文原文，
不把它当作已翻译内容，也未自行新增后端原因映射。

这些补图补上本包中文大字发现内容和名片的有限视觉证据；首批加载图仍按加载状态保留。
固定“我的好友”末字裁切及列表结束提示顺序两个限制仍在。另独立查看
`v83-settings-restored.png`，确认画面已恢复English及较小字号；精确系统font_scale和其余
设备设置恢复需主审查收据，不能仅从图像推断数值。未观察全部设置滚动区域或真实TalkBack。

| 私有图片 | SHA-256 |
| --- | --- |
| `v83-discover-zh-large-later.png` | `edf7a694b303e0843a9715cfd4e8ad6c3397d1509f128803b0b5d669e7c4e65a` |
| `v83-discover-zh-large-actions.png` | `e32ac041b57c46129b96931d716880ddf531ffcb2862cba1bd5bc880934b64ec` |
| `v83-card-zh-large-loaded.png` | `956bff80a3f48023fc80dd1248bd51b1a5a84b69b5fe85f487abd18217668819` |
| `v83-settings-restored.png` | `2af031691a02710425beaa20481278588cd1d958037841af85dd0ef18e855233` |

最终主审查另读取 `v83-restored-device-settings.json`（20:45:01 SGT），确认font_scale1.0、Wi-Fi1、mobile_data1、ui_night_mode4、screen_off_timeout600000及三项动画比例1.0；语言English由设置页核对。数值来源是设备读取，非截图推断。
