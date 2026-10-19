# 前置 UI/UX 实现基线（2026-10-19）

依据 S-PM-1019-CORE-FEATURE-DELIVERY 的深绿、Playfair Display 与 HCI 前置决定；这是实现说明，不新增产品规则。HCI 7848b5a 的交互已经继承，保留 docs/evidence/sprint3/2026-10-19-hci-handoff/review.md 的来源记录。

## 已落地

- 正常 App 与 controlled demo 共用 `lib/app/enmori_theme.dart`；`socialDemoTheme()` 仅保留兼容入口。
- 主色 #244B3F，底色 #FAF9F5，文字 #203B32，强调容器 #E4EEE4。页面通过 `Theme.of(context).colorScheme` 使用，不复制一套模块色板。
- Playfair Display 用于 display/headline/titleLarge、AppBar 与品牌；正文、标签、输入框保留平台无衬线字体。字体本地打包及 SIL OFL 随附，来源和校验见 assets/fonts/playfair_display/README.md，不运行时下载字体。
- 卡片圆角 20；输入和按钮圆角 14；主要/次要/文字按钮至少 48 高，不设置阻碍大字换行的固定高度。表单留明确错误文本和密码显隐 tooltip。
- 共用导航、弹窗、底部抽屉、SnackBar 与输入框继承统一颜色和形状。首页移除旧紫色强调，登录/注册/邮件输入加语义图标。

## 各包继续使用

页面优先沿用现有 Scaffold、ListView、SafeArea、现有 Riverpod/Repository 及上述 ThemeData；不新增组件框架。各模块自己的新表单、列表、详情和弹窗随功能一起完成，不能等到功能做完再补 UX。

- 区分首次加载、真实空结果、请求失败；失败保留返回/重试和已填草稿。未知写入先查原结果。
- 按合同锁定重复保存；不可用操作说明原因。使用文字反馈，不只变颜色。
- 主按钮明确动作，破坏性操作保留确认；取消或离开保留既有未保存提示。
- 小屏、大字与键盘允许滚动，主要动作可达；不要为适配截断内容或压缩点击目标。
- 隐私、同意、真实数据与演示标识沿用既有规则；视觉参考不扩大权限。

## 验证边界

定向静态检查和既有页面/登录/邮件测试通过；原导航测试已有窄屏与大字覆盖。修正一个旧 fixture：AI consent gate 需要明确的 `/v1/me/settings` 响应。新增布局预览由实际 Flutter widgets 绘制，仅供视觉核对，无业务保存结论。

v7 构建完成，但手机当前不方便连接，新版 APK 未安装/真机验收。全局基线已可用于各包开发，功能细节和最终整机 UI/UX 仍需后续验证；旧离线 harness 自带的假数据卡片不作为成品页面。
