# UI/UX 独立聊天第二轮：完整产品重设计（一个 prompt 执行至完整交付）

这是用户对v16实机的明确反馈和授权，不是可选样式建议。工作只在“ENMORI UI/UX 完整流程优化”独立聊天/工作树进行；主聊天继续主机、后端运行与最终整合。先读本轮决定 `docs/decisions/2026-10-21-li-product-ui-redesign-and-defaults.md`，它记录精确产品变更和旧规则替代范围。

## 起点与边界

你现有工作树 `/home/miku/.codex/worktrees/ed03/ENMORI`，旧分支 `souma/uiux-connected-flows-20261021` 的#168/8b6ab07已合入集成。核对clean/已有改动、fetch后，从 `origin/souma/li-zhou-runtime-20261020` 最新HEAD新开 `souma/uiux-product-redesign-20261021`（若已存在先核对，不reset/丢改动）。当前产品基线e86f644，最新证据4cb3a23及本轮决定提交随后进入同一分支。不要继续旧已合并PR或从main重写。目标Draft PR base仍是集成分支，严禁合并main。

适用AGENTS/skill-routing/ARCHITECTURE，但用户本轮明确授权功能内重设计、默认偏好和自定义输入的必要最小接口/字段，不能再次把这些整体标Pending。先写精确合同，然后一次实现UI→保存→回读→恢复；不改业务权限/真实Event映射/未知AI重发规则。不要接触主聊天的私有Firebase、签名、Funnel、运行服务或真机，不主动构建第二份安装包。

## 用户原意（必须逐项落地，同时主动补齐其他明显设计问题）

1. 目前多数页面不美观、按钮排列不恰当，需要使用 `ui-ux-pro-max` 逐个界面真正优化。上一轮以接通功能为主，这轮以优秀实际产品的视觉和操作体验为目标；不要只输出测试数、逐字照搬反馈或只替换颜色。
2. Check-in默认隐私与个人设置的默认签到可见性一致；个人隐私设置应能保存“默认位置/默认天气”，明确开启后不必每次再次点应用同意，OS权限仍有效。没有旧默认的账号为关闭，不能把字段可见性误作采集授权；详见决定。
3. Check-in去掉“Keep a little moment”大块；参考QQ输入框下面的胶囊工具、单独权限汇总行和精简顶栏。Mood/Location/Activity可快捷选/自定义，单条权限集中到一处；真GPS坐标、手填地点标签、官方Event引用、自定义Activity不得混淆。照片/QQ社交功能不是需求。
4. Home的Discover activities与Events for you重复且占空间；重新组织真实活动、好友动态、签到入口，保留拒绝同意者的普通浏览。Events卡片/详情/参与者/刷新/外部报名整体设计，不用诊断页面式按钮堆叠。
5. AI新会话直接放顶栏图标；侧栏历史/Persona/相关设置，减少深藏菜单。AI设置只放AI相关内容，不再复用Profile通用设置。即时气泡与状态继续优化；不要更改未知请求、权限、草稿和历史回读语义。
6. Profile和Home同样需要从头审查信息层级与操作。还需逐页覆盖Friends/好友资料/记录日历地图、设置/隐私/兴趣、注册登录引导、Persona编辑/试聊、空态错误态。同一主题、主次按钮、表单和抽屉语言，功能可发现且可返回。
7. 用户要求更主动：你可以直接判断并改进明显无效文案、重复入口、低密度布局和不合理按钮，不要每一项都等用户再指出。保留既有功能和已确认规则；实际更高权限冲突只暂停冲突部分并继续其他页。

## Reference / Skills

必须使用仓库 `ui-ux-pro-max`，并读pro-rules检查；必要Dart/Flutter Skill遵守repo routing。主聊天已做最小搜索：`social journaling mobile calm --design-system`给了营销Hero/CTA/粉色，**不适合本任务，不要照抄/持久化**；重查`social media --domain product`匹配Social Media App，只有微交互/内容块等原则可采纳。Flutter栈对composer/nav关键词两次无匹配，别伪称搜索给了具体方案，回退现有Flutter/官方文档。你需要形成自己的移动App设计判断，保留深绿与Playfair品牌而非套Web Landing Page。

用户QQ参考图在 `/home/miku/.codex/worktrees/li-zhou-integration-oct20/ENMORI/build/uiux-redesign-reference/qq-composer-reference.png`（原附件 `/tmp/codex-clipboard-05fa00aa-bcb5-4892-94f4-3d6174a8c0d0.png`）。用view_image读取；可复制到你自己的ignored build用于本地参考，**不上传私人截图到GitHub**。真实v16截图仅在主聊天owner-only build/v16-phone，主聊天已给观察，不读取/复制真实个人内容去做公开预览。新预览用明确合成数据。

用户同时授权在你这个聊天安装一个适用的Flutter animation Skill：使用 `/home/miku/.codex/skills/.system/skill-installer/SKILL.md` 工作流，先查已安装/可信来源，核对SKILL及辅助脚本的来源和许可再使用安装helper；不得执行未知远程安装脚本、替换全局SDK、安装大量无关包或自动引入运行时依赖。记录准确来源/ref/用途和成功/未成功；安装后按技能说明告知可用时机。未找到可信适用项就用现有Flutter原生动画/官方文档继续，不停工也不假称已安装。

按需要浏览少量优秀参考（官方Material移动组件、活动产品、对话工具等一手页面），只取合适的导航/密度/组件原则，给短链接与应用理由，不大范围搜集截图或复制外部品牌资产。所选交互方向由你负责落实，别把AI搜索建议当项目权威。

## 关键设计/实现质量

- 发布页首屏可输入，主操作清楚，胶囊选择有标签/选中/编辑状态，权限汇总可读。默认偏好与草稿覆盖的来源清楚，保存恢复不要求用户理解revision/requestId等。
- 将设置页的采集偏好与分享权限区分；默认位置开启仅在用户主动签到时单次前台获取、状态可见且当次可关闭。天气只用粗坐标，不后台定位，不向供应商发送私有文本。撤回/会话切换丢弃迟到结果；修改默认不重写历史。
- 自定义输入复用现有层次，添加必要最小字段和验证，不造兴趣目录/真实活动/坐标。账号旧字段缺失正常回读，冲突清楚恢复。全部合同/strict fixtures同步，不只做本地假开关。
- 主次按钮、触控目标、图标语义、键盘/系统返回、焦点、加载/空/错误统一。过大留白、满屏hero、重复卡片、长诊断句和每条操作一个大按钮应主动收敛。系统字体影响需如实说明，不改用户OS设置。
- 地图近点/同点重叠已在v16实机发现，现由你统一负责视觉与选点，JIN负责缓存/后端失效；既保留真实坐标和按时间连线，也让用户明确选到不同记录，保留列表回退，不虚构轨迹。
- 动画只服务于选中、抽屉、面板、保存状态、消息等待等；低开销、可中断、reduce-motion、dispose。不要用装饰动效遮掩布局问题。

## 一次完成的执行和交付

先提交到本地文档一张逐页问题→目标结构→具体改动简表，并建立共享tokens/组件方向；做Home/Check-in/Events/AI/Profile五个关键实际Flutter预览审视密度与按钮组织，然后继续实现其余页和新设置保存合同。方案/预览只是中间成果，不停在等待PM批准；用户已授权你按上述范围自主做完。

集中运行受影响的Backend/Flutter检查与analyze，失败仅针对修复复跑。提供真实Flutter渲染的手机预览和关键状态对比（有键盘/错误/空/等待），用图说明为什么更清晰，而非声称测试多所以美观。不要重复provider、模型、完整Emulator、整套旧测试或构建APK来填证据。

完成一个新的完整Draft PR到集成分支：精确head、逐页覆盖表、最小接口/默认迁移语义、预览、实际测试、尚未实现/待真机项。主聊天随后审查、主机接线和集中签名APK；不要自动main merge、公开发布或整项目Done。前后端小变更均在你的完整包内，不分出需要多轮催促的小任务。
