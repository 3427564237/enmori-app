# ENMORI 独立自动化验收与证据缺口审查

审查日期：2026-11-12（Asia/Singapore）。目标 checkout：`/home/miku/.codex/worktrees/demo-ready-20261111/ENMORI`；HEAD `a3c6b5448046fa7f65fb25fd809f4f0c9823d87f`。开始和结束时 `git status --short` 均为空。本子任务未操作 adb、未安装 APK、未修改产品源码、未触发云端模型/通知/账户数据写入。遵守本轮跳过大字模式和讲述人的要求。

## 本轮结果

- `fvm flutter analyze --no-pub`：通过，No issues found（工具报告 10.1 秒）。
- `fvm flutter test --no-pub --reporter json --concurrency 4 --name <排除大字用例的正则> <32 个关键文件>`：**268/268 通过**，0 failed、0 skipped，进程 exit 0，约 38.17 秒。完整命令在 `flutter-test-command.json`；逐例日志 `flutter-regression.jsonl`；精确列表和分组计数 `flutter-regression-summary.json`。
- 额外临时 fake/widget 复现：**1/1 通过**，确认推荐资料页“保存中仍称可放弃”的 UX 缺陷。测试通过意味着缺陷被稳定复现，不意味着产品已修复。
- 工具链：Flutter 3.47.2，Dart 3.13.2；没有升级 SDK 或依赖。
- 当前 HEAD 与 v65 Android 构建来源 `f4d1124fd9462313cfef8ede0490f9e0a1197891` 的 `lib/ android/ assets/ pubspec.yaml pubspec.lock` 无差异。这将本次源码结果对应到既有 v65 客户端源码，但本子任务没有独立验证手机实际安装包。

回归覆盖推荐资料目录失败重试、Discovery 到 Profile 导航、Check-in 编辑/复制/结果未知后的恢复、账户偏好恢复、Event 列表/详情重定向/外链/地图日历动作、好友查找/忽略/请求/分组与 session 更换保护、个人资料快捷入口、注册前端验证、AI 草稿和结果未知恢复/上下文来源/发送可用性、主动定时设置/时区歧义/静默时段/通知注册状态。所有这些都是本地 fake、单元或 widget 层证据，不是真实注册、实际外链应用、实际 AI 或 FCM 到达证据。

本次不是完整 Flutter suite，也没有重跑 Backend 全套。现有大字用例通过命令中的名称过滤排除；不将排除算成通过，也没有测试 TalkBack。常规 widget 中自带的语义属性断言不代表屏幕阅读器实测。

## 新确认缺陷：保存中“放弃”误导（P2）

路径：`lib/features/recommendation_profile/presentation/recommendation_profile_page.dart`。

- 第 169–177 行进入 `_busy` 后发送保存；第 178–180 行在页面已卸载时只停止本地处理，不取消已发出的请求。
- 第 321–345 行的返回保护只看 `_dirty`，保存过程中仍显示 “Discard unsaved changes?”，并在选择 Discard 后离页。
- 临时复现步骤：打开推荐资料 → 清除 Home area → Save（fake 请求保持未完成）→ Back → Discard → 页面退出 → fake 返回保存成功 → 仓库已保存 Home area=null。
- 用户影响：用户读到“放弃未保存的修改”，但已经提交的修改仍可能完成；这会混淆设置的实际状态。该页面也承载发现/匹配开关，因此应在同一保存状态机内清晰区分尚未提交的草稿、进行中的请求与未知结果；本次没有真实修改这些开关。
- 修复方向：保存进行中及未知结果状态的离开提示应如实说明已提交的结果可能仍会生效，并保留可核对结果的路径；不要仅用客户端取消去声称服务器未写入。具体交互应沿用项目既有保存/恢复契约。
- 证据：`pending_save_discard_probe_test.dart` 和 `pending-save-discard-probe.log`。仅作诊断证据归档，不纳入产品测试目录。

## 当前缺口：按最新证据保留边界

下述是对已提交证据的审查，均为 **11 月 11 日历史观测**；除上述本地测试外，本子任务没有把它们重新测成当前在线状态。根 agent 的本轮实机结果应单独合并。

1. **实机推送仍缺正向证据。** v64 合成协议明确没有 FCM 注册或物理通知；v65 只是保存登录状态及新增到期文案的安装证据。`docs/evidence/2026-11-11-v64-install-and-scheduled-openai.md` 与 `docs/evidence/2026-11-11-v65-android-candidate.md` 均明确这些限制。定时生成成功不能推导通知到达。
2. **好友动态的双账户正向可见性仍缺实机验收。** `docs/evidence/2026-11-11-demo-v62/README.md:34` 明确测试好友尚无已接受好友关系；空 Activity 只证明连接链路，不证明新 Check-in/Interested 对好友可见。源码测试通过不能替代这一点。
3. **冷启动和首次活动读取是已有测量的体验限制。** `docs/evidence/2026-11-11-v65-teacher-runtime.md:47` 记录一次启动到监听 403.652 秒；第 53 行记录首次活动页 149.607 秒，后续页 2.181 秒。它们不是本轮测量，也不等于永远不可用；在老师演示前仍值得从手机操作复核加载反馈、等待、返回与重试体验。
4. **两个月运行尚未完成验收。** 最新运行记录第 61 行与 `docs/planning/2026-11-11-teacher-delivery-operating-plan.md:63` 明确现有 gift 验证/有效期截至 2026-11-18 00:00 SGT；真实付费 successor 尚待实际购入和验证安装。不得把更早文档的 11 月 12 日期限当成最新状态，也不能把用户计划充值当成已经可用的额度。
5. **通知注册最多 30 天，必须显式续期。** `docs/planning/2026-11-11-teacher-delivery-operating-plan.md:66` 保留设备/跨国网络/物理推送证据缺口；两个月窗口不能靠一次注册证明。
6. **老师实际设备和 iOS 未确认。** 同一计划第 54、66 行要求实际设备/区域证据；定时时间选择器需要 Android API 26+，而包 min API 24 的可安装性不能代表该功能可用。iOS 未开发/未构建，不能声称支持。
7. **数据恢复仍有限制。** 同一计划第 55 行记录没有配置 Firestore backup/PITR；这是已知恢复能力边界，不能仅凭代码回滚包声称业务数据可恢复，也不授权新增数据保留政策。

本轮读到的最新 v65 证据已包含真实 onePA 列表、同包重新启动、两次真实合成 AI（其中一次到期 follow-up）。因此不再将旧 v62 的“onePA 不可用”或“proactive OpenAI 未集成”当成当前未完成功能。

## 执行异常与复核

- 第一次回归命令用了当前 Flutter CLI 不支持的 `--exclude-name`，命令在测试开始前退出 64。检查本机 `fvm flutter test --help` 后改成受支持的 `--name` 负向匹配，随后 268 个测试正常完成。原错误日志保留为 `flutter-regression-cli-rejected.log`；这不是产品测试失败。
- 临时复现测试首版对尚未被 ListView 构建的 Save 按钮使用 `ensureVisible`，harness 抛 No element。改用 `scrollUntilVisible` 后重跑并成功复现。原日志保留为 `pending-save-discard-probe-harness-error.log`；没有修改产品来迎合测试。
- 没有为了提高通过数量重新跑相同已通过集合，也没有触发额外付费调用。所有日志仅含本地合成测试资料；主要产物 SHA-256 在 `automated-artifact-hashes.json`。
