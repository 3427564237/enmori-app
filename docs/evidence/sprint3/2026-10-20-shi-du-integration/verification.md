# SHI / DU 本机接收及整合检查点

日期：2026-10-20，Asia/Singapore。独立分支 `souma/li-shi-du-integration-20261020`，起点 `065ab3880f7da9814ff6c6c73954e880e2e1d737`。
工作区 `/home/miku/.codex/worktrees/li-shi-du-integration-oct20/ENMORI`。原本机运行工作区、服务、凭据和 v8 APK 没有修改、重启或重建。

## 收到什么

- SHI ZIP SHA256 `f41a4ad4a788dc00ac0c9a134ac7602c107c677c16566f1ffaea6fb1f03dda91`；内含 bundle SHA256 `268955906a143ef1aa234aced2d3fc6f82febabc2c66aca939d2e52284561ae3`，均核对。Git bundle verify 成功，base `927f77527b32d349aa08020f7de0e88402edb9c7`，单提交 `538b34dad804853b318bba3b149c304e564a1f3b`，10文件。安全路径检查后解包，无执行附件脚本。
- DU [PR #161](https://github.com/3427564237/enmori-app/pull/161) 本轮在线确认：Open、Draft、未合并、mergeable=true；base `d59cb128bfe0b5889baae0b08c973e140505590f`，head `403950e18fdfe050538728b8766eee5ad634ea83`，5文件。远程 ref 与回执一致；此状态只代表本次读取时点。
- SHI cherry-pick 为 `8c7d241`，DU 移植为 `68563f4`；两者均仅在隔离分支，未合并 main、未更新远程 PR。收到文件不等于接受全部实现。

## 整合处理及审查发现

1. SHI 新文件没有文本冲突；组件未接入普通入口，没有注入假保存或把局部组件冒充 Events 完整交付。原 shader 失败、缺合同、无持久保存及设备结论完整保留。
2. DU 的注册和设置文件与当前基线冲突。采用当前扩展资料、条款、密码显隐、主题图标、session 隔离和固定底部 Save 为基底，移植返回保护，未用旧 main 覆盖。
3. LI 适配增量：dirty 检查覆盖 BIO、学校/公司类型及名称、地区、兴趣/位置/参与隐私和地图分享；定位中也暂阻止返回；注册页 Sign in 同样确认丢弃，条款勾选纳入草稿；防止重复弹确认框。DU 原代码仅检测旧 displayName/profileVisibility/defaultVisibility/consent。
4. 测试首轮 48 pass / 3 fail。失败都是输入后未 pump 就触发返回或 Sign in，回调仍使用上一帧草稿状态；补一个输入后的 frame，不改断言，不删除流程。增加 BIO、地区、地图分享以及 Sign in 出口用例。最终必要重跑只包含两个受影响 DU 文件，未重复跑已通过 SHI/Backend 测试。
5. 全项目 analyze 首轮仅1处新增 guard 缺大括号 info；修正后全项目通过。未扩散重构。
6. SHI 下一步需要关注真实父页面重建：当前 ExternalRegistrationAction 的 didUpdateWidget 在 callback 对象变化时重置 flow；接入时保持依赖/回调身份稳定，并增加外部浏览期间父页面普通 rebuild 的回归。当前未连接，不能把组件用例当作已证明该组合。
7. 当前 Friend DTO 以唯一不可修改 username 作定位，没有公开 opaque account ID；集中合同稿建议复用 username，不凭附件创造新的身份层。

## 实际执行

环境：本机 Flutter3.47.2 / Dart3.13.2，Node24.19.0；只复用已有锁定依赖。`flutter pub get --offline --enforce-lockfile` 成功，lock 未改。未访问云端用户数据或调用模型。

| 检查 | 实际结果 |
| --- | --- |
| 标准 `flutter test --no-pub --reporter expanded`，SHI 两文件 `external_registration_flow_test.dart` / `event_participation_components_test.dart` | 16/16，通过；没有使用 --no-test-assets。本机没有复现 shader 资产构建错误；保留作者测试用 NoSplash，不宣称生产视觉或作者环境修复。 |
| DU 两文件 `account_preferences_flow_test.dart` / `rmvp01a_r6_pages_test.dart`，含 LI 适配回归 | 最终35/35，通过。此前3项失败见上。 |
| `flutter analyze --no-pub` | 最终 No issues found，全项目；首轮1 info 及修正保留。 |
| TypeScript 全 backend 项目编译 | 通过。 |
| Node `backend/dist/test/event-participation-visibility.test.js` | 5/5，通过；纯权限策略，非实际存储授权闭环。 |
| `git diff --check` | 通过。 |

原始日志在本工作区 `build/integration-checks/`；摘要和日志 SHA256 见 receipt.json。没有新 APK，没有设备操作。v8 真实账号 APK 仍来自 f3c733a 实现，不能把本次新分支测试归到它。

## 剩余范围与状态

- DU：源码可在此分支继续集成；新 LI 适配仍需 DU 独立审查。Android Back/软键盘、真实账号保存及真实后端回读尚未验证。PR 本身未改头，不能声称 PR403950e原样通过上述最终35项。
- SHI：组件级接收。Interested/Going/ignore 真实写入、参与者分页、Home/列表/资料状态回读、外部返回真实保存仍未实现。本轮不接管 SHI 后续全模块实现，ZHOU 仍是独立审查者。
- [P01–P06 集中确认稿](../../../planning/2026-10-20-li-event-participation-selection-preview.md)已准备，等待人类批准。不能把转发的队友建议当成 PM 确认。确认后先记录 decisions，再转交一份完整续作 prompt；无需主机凭据。
- 不 auto-merge，不发布、不关闭 Issue、不标项目 Done；本机与手机后续集中验证，当前不要求用户连接手机。

## 后续批准记录

LI已答复“批准 P01–P06，按限定范围继续（推荐）”，见[正式决定](../../../decisions/2026-10-20-li-event-participation-selection.md)。此前等待确认是本检查点当时状态；现在该合同门禁解除，SHI可按限定范围续作。本次仅改文档及打包，沿用上述源码检查，不重跑未变实现的测试，不增加APK/设备通过结论。
