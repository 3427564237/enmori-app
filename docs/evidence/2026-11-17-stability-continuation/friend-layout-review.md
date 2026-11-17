# SC-14 / SC-08：好友标签与列表末尾提示修复

2026-11-17，Asia/Singapore。基线 `5bf281e6`。依据[稳定候选版继续修复授权](../../decisions/2026-11-17-li-stable-candidate-continuation.md)及原[UI 审查记录](../2026-11-17-stable-candidate/ui-task-review.md)，只修复已经记录的两处客户端可用性问题。没有修改排序、每组人数、分页、后台契约、依赖、路由、账号或参与数据。

本报告分别记录源码、组件回归和主任务操作后的 v86 模拟器画面独立复核。此处不将历史 v82/v83 真机截图改写成新版本验收；本审查者没有操作设备，主任务本轮没有操作用户手机。

## 补充旧版模拟器基线

主任务在保留数据的 v84 模拟器上设简中、`font_scale=2.0`，将 1080px 设备 density 从 420 调为 480（约 360dp 可用宽度）后捕获旧版画面。独立目视 `baseline-v84-friends-zh2x-360.png` 确认“我的好友”末端明显淡出；“动态”“发现”仍可辨认。主任务报告原 420 density（约 411dp）没有该截断，因此这里只将问题定位到已复现的较窄布局，不声称所有屏宽失败。这是旧版基线，不能作为新 v86 通过证据；后续必须以相同配置对照。原组件矩阵及其结果保持不变。

## 根因与最小修改

| 问题 | 复现与影响 | 修改 |
| --- | --- | --- |
| SC-14：好友页大字标签裁切 | 原真机简中、系统字体 2× 时，“我的好友”固定三等分标签末尾淡出。`FriendModulePage` 的 `TabBar` 默认按可用宽度均分，文字自然宽度超过单栏分配宽度。入口仍可操作，但标签不能完整阅读。 | 只为现有 `TabBar` 设置 `isScrollable: true`、`tabAlignment: TabAlignment.start`。保留字体大小和原标签，通过原生横向滚动容纳内容；原 onTap、当前索引、已访问集合、IndexedStack、TickerMode 和焦点规则不变。 |
| SC-08：Discover 末尾提示早于卡片 | `FriendDiscoveryPanel` 在卡片循环前的分组 `Wrap` 内展示终点提示，只有一至两条建议时，用户先看到“已到末尾”再看到第一张建议。 | 只把同一文案移到当前组卡片之后，增加 8dp 顶部间隔。非 Home、已加载、非空、当前为最后一组的条件与原分支等价；上一组/下一组仍在原位置，顺序、每组两条、快照检查、忽略/撤销及会话保护不变。 |

这里解决的是可读性和信息顺序障碍；没有新增产品规则或重做社交设计。

## 先失败，再修复

新增 `test/features/friend_navigation_layout_test.dart`，使用真实页面和 Repository/API 假对象，零真实 HTTP：

- EN/ZH，320dp 1×、320dp 2×、375dp 2×、740dp 2×：检查每个标签的自然渲染宽度不超过其实际宽度，逐一滚到并点击三个标签，再返回第一个标签，检查选择结果与无布局异常。
- EN/ZH，一条、两条、三条建议：检查末尾提示位于当前最后一张卡片之后；三条建议先显示前两条、下一组只显示第三条，返回上一组后恢复前两条且末尾提示消失。切组不新增 Repository 读取。

未修复源码上的首次运行：**14 例中 2 通过、12 失败**。失败均为目标断言：6 个标签宽度断言、6 个末尾提示位置断言。没有用实现改动隐藏测试失败。

最小生产修改后同一文件：**14/14 通过**。测试使用 Flutter 默认测试字体，某些 EN 常规字号也会比真实设备字体宽；它验证约束和交互，不用于声称真实字体的像素一致性。原真机中文 2× 缺陷仍由原记录独立支持。

## 聚焦回归与独立审查

FVM Flutter/Dart 使用仓库锁定的 3.47.2。关联 **7 文件、67/67 通过**：

- `friend_navigation_layout_test.dart`
- `friend_module_discovery_entry_test.dart`
- `social_discovery_layout_test.dart`
- `social_localization_test.dart`
- `friend_ignore_flow_test.dart`
- `discovery_profile_navigation_test.dart`
- `friend_discovery_activity_map_test.dart`

覆盖新增布局断言、原初始 Discover 入口、社交中英文/大小字/横屏和独立深色夹具、头像尺寸、忽略/撤销、资料导航、会话替换和活动类别清除。这里只选取相关套件，未将它写为全项目测试或 TalkBack 验收。两个生产文件及新增测试的 `dart analyze` 无问题，`git diff --check` 通过。依赖清单与锁文件未变。

`route_reliability` 独立只读复核确认：TabBar 改动不动状态/导航；末尾提示的新条件等价于原终点分支；组切换和 ignore/Undo/session 代码原样。未发现阻止本轮打包的实质问题。

运行命令：`fvm flutter test --no-pub` 后跟上述七个测试文件，`--concurrency=2 --reporter expanded`；定向分析仅包含两处生产文件和新增测试。初次 RED 调用执行了 Flutter 自带的既有锁定依赖检查，没有引入新依赖。

## 全量发现的旧测试交互假设

主任务首轮全量的 `layout_refinement_test.dart` 在返回“我的好友”后找不到既有合成搜索文本 `Alex`。日志先明确警告：该 Tab 的点击中心为 `Offset(-1.1, 79.0)`，在当前 375dp 视口外。故障发生在该旧用例的 1× 循环；此前 Activity 和 Discover 的原内容断言已通过，不能将这个失败解释为 Discover 数据加载或搜索状态丢失。独立定向运行再次复现相同未命中警告和同一断言失败。

仅调整旧测试的输入：每次切换标签先 `ensureVisible`，再检查 `hitTestable`、点击并验证控制器选择索引。保留原 Activity 空态、Discover 操作入口和返回后的 `Alex` 断言，没有跳过或放宽内容检查，也没有追加生产修改。旧文件和新增导航文件合计 **17/17 通过**，旧文件定向 `dart analyze` 无问题，`git diff --check` 通过。全量重跑由主任务记录；此处不预报结果。

`route_reliability` 再次独立审查旧测试改动，并核对 17 例日志、分析日志及文件哈希，确认原内容断言保留，新增入口命中和选择检查，没有弱化验收。

## v86 模拟器有限验证

主任务以保留数据更新安装正式 release v86；独立核对 `installed-v86-receipt.json` 与 `v86-apk-verification.json`，安装包和交付包 SHA-256 均为 `cedbd33d3538810f4d7a24cadfeb65876c6188f280112f54d6b24027e8bb3270`，versionCode 86、非 debuggable。设备是 Android 模拟器，不是真机。

在与 v84 基线相同的简中、系统字体 2×、density 480（约 360dp）下，独立目视 `v86-friends-zh2x-360.png`：三个标签完整可读，“我的好友”最后一字不再淡出，原字号保留。因此 **SC-14 的这个已复现配置下标签裁切复测通过**。该截图下方仍显示读取进度条，不证明好友列表或空态完成；也不单凭静态画面认定三个入口实际切换、横向手势或所有屏宽均通过。Activity、Discover 的后续状态另记。

后续 `v86-friends-activity-zh2x.png` 显示“动态”已选中，四个筛选标签换行完整，并呈现明确的“暂无可见的好友动态”空态；`v86-discover-settled-zh2x.png` 显示“发现”已选中和“好友发现尚未开启”终态，设置、查找用户入口可见，画面无加载指示。这与主任务实际点击两个标签的操作记录相符，只支持这两次入口切换与所见空态。专用测试账号没有启用好友发现，主任务没有为制造内容改动账号设置。**SC-08 非空列表中末尾提示的位置在 v86 APK 上尚未验到，当前仅有上述组件回归证据**；不能用未开启终态替代实际卡片位置验收。

最后独立目视 `v86-friends-returned-zh2x.png/.xml`，确认返回“我的好友”已选中，完整标签及搜索/筛选、明确空态仍可见，没有加载指示。`display-restored.json` 记录随后恢复 English、字体 1.0 和初始 density；未点击账号隐私保存。详情、启动恢复及上述收据指纹汇总见[同包模拟器独立验收](emulator-acceptance.md)。

## 审查快照与日志

日志仅在 `/home/miku/.local/state/enmori-stable-continuation-20261117/`，未复制私人截图或敏感日志进仓库。

| 文件 | SHA-256 |
| --- | --- |
| `lib/features/friends/presentation/friend_module_page.dart` | `774df7fd23efd33811d47fd620ee9ffdd7d02eb50bc01bee19cb68bc0715648b` |
| `lib/features/friends/presentation/friend_discovery_panel.dart` | `9017d6c2ff31deae52a2397d40f52737f120e71056755c39bd15bb219ac690b5` |
| `test/features/friend_navigation_layout_test.dart` | `0269b003f0fdfe6b4fc88993dbd3f0ff2a67f38b3d4a68e743acf8159a15df29` |
| `friend-layout-before.log` | `89f2ad09b4d53deab911f923bd49fd2eb32959cf63934ca364e3d2fe01b3884e` |
| `friend-layout-after.log` | `4fdcd8494cab3341a61149d64bb6c64d1d4e3e80db49c0963b8a49bf5302581d` |
| `friend-layout-regression.log` | `b84eefe96ae38d369da62a92fa7bed0711750db312c2f70ec2d4d5539bee3446` |
| `friend-layout-analyze.log` | `d3a5ad5dc4d409581bc6d686d3b591129669a374e911a6ea4d32ab6b48f87d21` |
| `test/features/layout_refinement_test.dart`（旧交互夹具修正） | `eca3f83dcc6943b541e0c0b124c17890558557b1d27c484eb264494870166038` |
| `friend-layout-legacy-before.log` | `c88ecbaddfab3efd05ace6038bc903b97fa695b4690055cce2d4c2777f97fe47` |
| `friend-layout-legacy-regression.log` | `9201e88c43b02d9a8853293668d2a17b70a2a9770287f1f401127c67b523c135` |
| `friend-layout-legacy-analyze.log` | `5d6cb90cebeb4c2d81ea0a90d744047c531dcfdfa5b515d0f19fad5be40e14ff` |
| `baseline-v84-friends-zh2x-360.png`（旧版模拟器） | `32096eafaf0cebf3da4522c006414faea87f3a497b7c1e4c98a7717924be16b0` |
| `baseline-v84-friends-zh2x-360.xml`（旧版模拟器） | `a56cbe23dfa1186f5dba7742376fc634b72ce0a5509ad9e9e79a0ecca29d7483` |
| `v86-friends-zh2x-360.png`（最终候选模拟器） | `9d7390e3fcd7db5c26163e55a3ce263b62c440ef974ecc919013ec643e4b4bfd` |
| `v86-friends-zh2x-360.xml`（最终候选模拟器） | `2082a5b204aa70248ace755f357816afc7274071f12ca0390024f04d8814fe22` |
| `v86-friends-activity-zh2x.png`（模拟器空态） | `7f1a4a8d1f6e3d0b793dfaedecb9f8d9011ae4788e56eed118ef3b4ba43cc48c` |
| `v86-friends-activity-zh2x.xml` | `ee6463a5e557542bdd1dcc3b38ff77b57539b9634b1595c0cc8c238d4b301ca7` |
| `v86-discover-settled-zh2x.png`（模拟器未开启终态） | `0f10e005201080bf759eac446739aafd85e240727f46290e850ccff97e23218c` |
| `v86-discover-settled-zh2x.xml` | `e98f44dcb0d245bc4a9baf5b78b011774db420d47985d737b72b21064d38f38f` |

## 尚待最终候选验证

v86 中文 2×、360dp 标签文字、三个入口切换和返回已有有限模拟器证据，临时语言/字体/density 设置已按主任务收据恢复。Discover 非空建议的最后卡片之后提示位置和实际切组仍待具备相应内容时验收。照片头像、全机型、TalkBack、真实用户观察不由本次组件或有限模拟器结果推导。

源码和聚焦测试已经冻结；不据此宣布稳定版定版。
