# ZHOU 对 SHI Events 增量的独立审查

审查时间：2026-10-20 11:34（UTC+08:00）。审查人 GitHub 身份：`YaoyinZhou3922`，与作者 `GGGGHOST-CN` 不同。仅在隔离目录执行，未修改产品文件、提交或发送 GitHub review。

## 结论

**审查完成，有一项 P2 需要 SHI 在接入前处理；不建议 APPROVE 整个 PR162。** 建议对当前 PR162 精确 head 提交 **COMMENT**，明确只审本次 SHI 的10文件增量，列明下述发现及已通过部分。当前 PR162 是927文件的累计整合，不能以本次定向检查代替其它历史差异的批准。缺持久化/分页是如实声明的后续范围，不重复作为本次新缺陷；它们仍未交付。

审查目标：原 SHI `538b34dad804853b318bba3b149c304e564a1f3b`（base927f775）在 GitHub 可达的 cherry-pick [`8c7d241fc640f9d72bb3ff3fe7964db5c08b20eb`](https://github.com/3427564237/enmori-app/commit/8c7d241fc640f9d72bb3ff3fe7964db5c08b20eb)，parent`065ab3880f7da9814ff6c6c73954e880e2e1d737`，tree`560bdf4381a731449c475fd609cb3fa2256e8958`。确认这7个实现/测试 blob 在 PR162 当前 head`900ca6fcdefb77e9aa95d96fa80994ebf826398f`全部未变，diff退出0。

## [P2] 普通父组件重建清除外部报名流程和未知写入读回门禁

位置：[external_registration_action.dart，56–59行](https://github.com/3427564237/enmori-app/blob/900ca6fcdefb77e9aa95d96fa80994ebf826398f/lib/features/event_participation/presentation/external_registration_action.dart#L56)。同一Event、同一来源URL、同一opener及同一AuthSession下，只要父页面重新创建等价的 `confirmGoing` / `readGoing` 闭包，`didUpdateWidget` 就 dispose当前flow，再在174行建立idle flow。这是普通 StatefulBuilder/repository页面重建可以触发的行为，不需要改账号或活动。

独立控件探针得到两个后果，属于同一根因：

1. 浏览器期间父页面重建后，返回弹窗仍显示；用户点“Yes, mark Going”，148行的旧flow identity检查使操作静默失效，实际writer调用0次，期望1次。
2. 已发送Going写入得到明确合成的serviceUnavailable/未知结果，初始正确显示“Read participation”；普通父页面重建后它消失，新flow变idle并重新开放报名入口，未执行任何读回。原未知操作不能仅凭UI重建当作已解决。

稳定callback正向对照通过；重建等价callback的两个回归期望均失败。**最终2 Pass /2 Fail，exit1**。LI整合记录也已指出callback身份重置风险，本次增加了可运行反例及未知结果门禁的具体影响。SHI接续prompt已要求修复/稳定接线并补回归，不需另造产品决策。建议在真正接入前保留同一Event/会话的活动flow及未决状态，并保持真实依赖替换/会话变化的隔离；不得仅删除所有身份保护。

## 独立执行结果

| 检查 | 结果 |
| --- | --- |
| Flutter3.47.2 / Dart3.13.2 标准asset-enabled `flutter test --no-pub --reporter expanded test/features/external_registration_flow_test.dart test/features/event_participation_components_test.dart` | **16/16 Pass**。没有使用no-test-assets；NoSplash为作者既有测试主题。未复现作者shader失败，不改写其历史结果。 |
| 五个SHI Dart实现/测试文件 `dart analyze --fatal-infos` | Pass，No issues found。 |
| 同五文件 `dart format --output=none --set-exit-if-changed` | Pass，5文件0变更。 |
| 新纯Backend权限策略及其测试，TypeScript7.0.2 strict/noUncheckedIndexedAccess/exactOptionalPropertyTypes/noImplicitOverride/noFallthrough/noEmitOnError，Node24.19.0、@types/node24.13.3 | 编译Pass；**5/5 Pass**。仅纯策略，不代表持久化授权闭环。 |
| `git diff --check HEAD^ HEAD` | Pass。 |
| 新独立callback寿命探针，标准Flutter测试 | **2/2正向对照Pass，2/2重建回归Fail**，exit1；两种失败同一根因。 |
| pubspec.yaml/pubspec.lock/package.json/pnpm-lock.yaml | 无修改。首次offline缺geolocator失败保留；随后按既有锁文件联网pub get成功，没有新增或升级依赖。 |

首次探针只检查返回弹窗存在，得到3Pass/1Fail；该检查不足以验证Yes仍有效。最终加强为点击Yes并断言实际writer调用，得到2Pass/2Fail。两份原始日志保留，未改产品或弱化断言。

## 权威与未执行范围

采用仓库AGENTS、skill-routing、Flutter架构、Backend架构与详细设计、19Oct核心产品/分工，以及15Oct真实来源/外部打开合同。应用仓库 `flutter-dart-code-review` / `enmori-backend-development`；针对性探针使用 `flutter-add-widget-test`，按 `systematic-debugging` 先复现与定位，没有尝试产品修复。

[P01–P06正式批准](https://github.com/3427564237/enmori-app/blob/900ca6fcdefb77e9aa95d96fa80994ebf826398f/docs/decisions/2026-10-20-li-event-participation-selection.md)已解除相同合同重复审批门禁，只在其范围内委托SHI具体实现。[SHI完整接续](https://github.com/3427564237/enmori-app/blob/900ca6fcdefb77e9aa95d96fa80994ebf826398f/docs/planning/local-ui-handoff-oct19/shi-continuation-oct20.md)保留独立ZHOU审查。旧packet的Pending、shader失败和Not Run是历史事实。

**Not Run /未交付**：实际Repository保存/回读/版本冲突、参与者Friends/Others分页/人数授权、真实来源/报名外部浏览器、普通路由接线、Android/新APK/真机、真实账号或服务/模型调用。没有索取或使用LI凭据/私有环境。既有组件通过不构成完整Events/整合APK/Release接受；Draft保持，不merge、不关闭任务、不标Done。ZHOU自身159继续交LI，不能自审。

## 可复核证据

隔离目录：`D:/3851 AI/drafts/2026-10-20-shi-review/`。clone仅多出一个未跟踪的review探针，不包含产品编辑。

| 文件 | SHA256 |
| --- | --- |
| `flutter-components-test.log` | `18933a5890b8259e23b3b5bb9e0cd78e5d4b52dda379449c657b3d5459f7d3df` |
| `backend-compile.log`（空输出exit0） | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `backend-policy-test.log` | `a28199e3cd4c076d99c6314d163dbf69e5019aec7d2e4c735b1499534a8ffd8e` |
| `dart-analyze.log` | `de0b1ed0158b9f10f52373cf62ab61a59c2d9102a0b11a30cbdd9e96c4956660` |
| `dart-format.log` | `67de47ce540088dda9b2417a4047c23b17b4a6f7419ccff9d55ac07b16bb0d15` |
| `review-callback-probe-final.log` | `1c981e21690ccc171fbf7949ac73584432867b1e372a1497650ab26e0907f976` |
| `repo/test/review_shi_callback_lifetime_test.dart` | `28a8668782f90dabdbc5f52077f8148031710fc832d9eb04a9e125e3a49f5d28` |

完整GitHub交叉核对另见 `D:/3851 AI/drafts/2026-10-20-github-crosscheck.md`。如发布证据，请把故意失败的探针保存为review证据文本，不加入常规通过套件；该probe不是产品修复。
