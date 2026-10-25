# ENMORI AI 陪伴：可点击手机原型

## 后续状态：C 的入口形态已确认

LI 已在总控聊天直接选择 **C：连续主入口＋历史／新话题**。正式来源是
`docs/decisions/2026-10-25-li-ai-entry-c.md`，Integration 提交
`2bb638b47e682217007cf02cd505550d88d627cf`；[核验与范围说明](../../evidence/ai-companion-20261025/product-ux.md#later-decision--c-entry-approved)。
此决定仅解决 P1 入口形态，保留原会话容器、历史、会话内搜索、新话题、整段删除及既有状态保护。
新增来源展示/数据用途、主动消息存储/保留期/投递和云端预算等仍待具体合同。
以下首次交付说明、A/B/C 对照和合成原型保留为选择前记录；其中“尚未选择”不再描述当前 P1 状态。

## 首次交付记录

**设计候选，尚未获 LI 选择；全部使用合成数据。**

- [打开原型](index.html)
- [A / B / C 决策对照](product-choices.md)
- [交互状态与模块交接](interaction-spec.md)
- [Product / UX 证据](../../evidence/ai-companion-20261025/product-ux.md)

`index.html`、`prototype.css` 和 `prototype.js` 保存在同一目录，可直接用浏览器打开 HTML。
标题字体复用仓库的 Playfair Display；字体不可用时使用本机回退字体，不请求外部字体。
也可从仓库根目录启动仅本机可达的静态预览：

```bash
python3 -m http.server 8764 --bind 127.0.0.1 --directory /home/miku/.codex/worktrees/00ce/ENMORI
```

本次评审地址：
[本机交互预览](http://127.0.0.1:8764/docs/design/ai-companion-20261025/index.html)。
该地址仅在本机服务器运行时有效；文件仍可独立打开。

## 三分钟查看路径

1. 默认 C（日常返回）：打开主动消息 → 为什么收到 → 查看原始要求 → 返回 → 回复。
2. 输入一段草稿 → 本次参考 → 本次排除 → 主动附加签到或 Interested / Going 活动 → 查看来源 → 返回草稿。
3. 历史 → 输入“休息” → 查看附近消息 → 返回；再试更早页读取失败、新话题和整段删除。
4. 本地服务 → 查看数据范围；云端演示须单独勾选，本页没有真实请求。
5. 联系设置 → 开启、类别、暂停、上限、安静时段、时区和锁屏；模拟通知点击定位原话题。

手机宽度下点顶部“比较方案与体验状态”展开控制台：

- A / B / C 切换只改变演示入口，不表示 LI 做出了选择。
- 首次进入、未知结果、已确认未发送、来源更新/核对失败/删除/撤回、迟到过期、活动取消、Home/签到/活动入口都有独立场景。
- 支持 English UI 和大字体模式。大字体是本原型的字体放大演示，不等于真机最大系统字号测试。
- 直接点模拟结果控制才能完成/失败；没有自动生成、调度或通知。

## 演示边界

场景时钟固定为合成的 2026-10-25 16:40 Asia/Singapore。记录、活动、消息、标题和定位 ID 均为人工编写的 fixture。
已有主动消息是独立的历史演示场景；设置页从“关闭”开始，以呈现候选初始状态。当前关闭不删除已保存历史消息。

无账号、无模型、无 API、无真实通知、无存储写入、无分析上报。CSP 禁止 `connect-src`；状态只在页面内存中，刷新即重置。
不能输入或粘贴真实个人数据用于验收。旧小计划偏题仍未解决；示例回复不是模型质量结果。

界面以绿色 `#244b3f`、纸色 `#faf9f5`、原有圆角和标题字体延续当前主题，正文用系统字体。
仅设计浅色候选；未宣称暗色、屏幕阅读器、真实键盘或 native Dynamic Type 验收。

## 截图

| 场景 | 已查看的静态图 |
| --- | --- |
| 桌面评审台与 C 主入口 | [desktop.png](screenshots/desktop.png) |
| 390px 日常返回 | [home-390.png](screenshots/home-390.png) |
| 主动消息详情 | [proactive-390.png](screenshots/proactive-390.png) |
| 本次参考 | [references-390.png](screenshots/references-390.png) |
| 联系设置 | [settings-390.png](screenshots/settings-390.png) |
| 英文大字体与可见输入框 | [large-en-390.png](screenshots/large-en-390.png) |

截图是设计覆盖证据，不是已实现的 Flutter UI、后台投递或真机证明。
