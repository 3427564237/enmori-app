# ENMORI AI 陪伴：F0 / F1a 可点击原型

[打开原型](index.html) · [F0 最小 App 交接](first-flow-handoff.md) · [交互规格与 F1a](interaction-spec.md) · [Product 证据](../../evidence/ai-companion-20261025/product-ux.md)

LI 已确认 C 连续主入口，并通过[首流决定](../../decisions/2026-10-25-li-ai-companion-first-flow.md)批准明确的一次本地跟进、手选本人签到供一次本地回复和 D1 Android 推送实现候选。
本原型按该范围更新，沿用原视觉；没有真实服务、模型、通知、持久化或设备调用。

## 三分钟查看

1. 当前话题向下滚到“已保存”的用户消息 → 就这条消息约一次跟进 → 核对日期、IANA 和 UTC → 勾选确认。
2. 默认 off 时先模拟设置保存，再模拟预约保存；也可分别模拟未知。未知只核对原预约，没有重发动作。
3. 本次参考 → 手选本人签到（7 天内最多 5 条）→ 审阅 → 本次排除/核对 → 返回草稿 → 明确发送。
4. 打开已有主动消息 → 阅读状态待同步 → 为什么收到 → 查看原始要求 → 回复。查看这条消息的来源不会加入下一次请求。
5. 顶部“查看首流与体验状态”可切换关闭、暂停、时区未知、推送 disabled/unknown、预约过期、来源变化/未知、依赖冲突、阅读未同步等场景。

可以切换 English UI 与大字体。大字体是 HTML 放大演示，不等于真机最大系统字号验收。
点击结果控制才会模拟完成或失败；浏览器返回保留页面内存状态。

## 打开方式

HTML/CSS/JS 位于同一目录；可直接打开 HTML。字体复用仓库 Playfair Display，无外部字体请求。
也可从仓库根目录启动仅本机可达的静态服务：

```bash
python3 -m http.server 8764 --bind 127.0.0.1 --directory /home/miku/.codex/worktrees/00ce/ENMORI
```

[本机交互预览](http://127.0.0.1:8764/docs/design/ai-companion-20261025/index.html)仅在该服务运行时有效。

## 合成边界

时钟固定为 2026-10-25 16:40 Asia/Singapore。消息、签到、目标及操作结果均为人工 fixture，不是实际后端读回。
F0 时间控件只解析该固定合成时区；真实任意 IANA、DST 缺口/重复时间须接可信 TimePort，未实现不能猜 UTC。
已有主动消息展示历史场景，联系设置初始 off；关闭不删除已经保存的历史。

CSP 禁止 `connect-src`；无账号、模型、API、真实通知、存储写入或分析上报。刷新即重置。不要粘贴真实个人数据用于验收。
签到时间/数量、依赖冲突及 read visibility 只演示 UI 保护，不证明真实 owner reader、prepare closure、服务端水位或后台投递。
旧小计划语义偏题未由人工示例修复。

## 来源与历史

- [选择前 A/B/C 对照](product-choices.md)保留原文，初始原型 `6a84a1c7381ca449568e53556e457be202739e0d`。
- C 入口决定 `2bb638b47e682217007cf02cd505550d88d627cf` 只解决入口；历史状态注释 `c7adc9837850972018ddd91b3c5491256f09a230` 保留。
- F0/F1a 后续批准基线 `26af8c95da4fa00b76f841952d742d9da8c07e5c`；本次更新不把旧设计改写成早已批准。
- 先交 App 的最小 F0 为 `750dd8addd008489f5add30d2934c84a2d080647`，随后加入 App 指出的可信时间解析边界。

`screenshots/` 是本次选取的 HTML 图，旧图可在历史提交中查看。其覆盖和实测结果详见 Product 证据；不等于 Flutter、真实服务、APK、真机、UAT 或 Release。

## 本次截图

| 流程 | 截图 |
| --- | --- |
| 原消息与时间 | [F0 时间](screenshots/followup-390.png) · [最终确认](screenshots/followup-confirmation-390.png) |
| 未知预约 | [原预约核对](screenshots/followup-unknown-390.png) |
| 本次手选签到 | [选择器](screenshots/picker-390.png) · [审阅](screenshots/references-390.png) · [依赖冲突](screenshots/selection-conflict-390.png) |
| 原入口与可读性 | [桌面](screenshots/desktop.png) · [手机](screenshots/home-390.png) · [英文大字体](screenshots/large-en-390.png) |
| 主动消息与控制 | [阅读待同步](screenshots/proactive-390.png) · [默认关闭设置](screenshots/settings-390.png) |
