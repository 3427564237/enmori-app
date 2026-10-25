# v29 核心体验修复候选

本轮候选源码：`0e60cb9b675e7607c7e5761c8dd78d09d1e889b8`。
签名 APK 已生成；现有服务仍运行旧工作区，**尚未部署、安装或完成真机验收**。
当天签到与头像接口需要本候选配套后端，不能只安装新 APK 后沿用旧服务来验收。

## 已实现

- AI 普通发送不再要求先确认参考票据。发送时重新检查参考，保留草稿、明确排除、
  已保存用户消息重试及原操作未知状态；中文输入法 composing 状态有定向验证。
- 在已授权的陪伴入口，默认使用服务器按设备 IANA 时区确定的当天本人最近五条签到。
  支持本话题关闭和逐条排除；不补入第六条。失败不会伪装成当天无记录。
- “稍后联系我”选择本话题一条已发送消息，复用已有预约流程；管理预约另设入口。
  真实后台投递仍须具体受控窗口。当前 worker 的 30 分钟限制只是验证窗口，
  不代表长期后台陪伴已验证。没有新增实际系统推送。
- Home 滚到底部再返回推荐区不再销毁、重建该区并重复发请求。其既有过期及隐私清理保留。
- Home 与好友页均提供“可能认识的人”。修复好友推荐的活动来源冷缓存准备，
  在等待前后重新核对权限，不把来源失败当共同活动数为零。
- 首页“下一组”进入完整有序推荐列表并定位后续活动；列表内继续前进，末尾明确提示。
  保留导师要求的 Home Top 2 与完整列表顺序。当前来源仍是既有候选批次，并非完整目录。
- 活动内页接入 Ticketmaster 实际简介、封面及地点；缺失内容诚实提示。
  封面请求、尺寸、字节和生命周期有界，覆盖该路由时清除图片。
  购票按钮明确标为“在 Ticketmaster 购票／预订”。只有一个实际来源 URL 时不伪造第二链接。
- Android 系统选图 → 方形预览 → 明确保存 → Home/资料页重读，以及移除头像。
  原图不上传，无新图片服务或依赖；本版照片仅本人可见。
  未确认保存及预览在当前登录会话中跨页面保留，未变化的读回不会解锁重发。
- 昵称右侧改为小型可见范围、编辑入口；资料地区填写可读名称，移除自动填入坐标的入口。
  活动使用实际场馆；没有名称的旧签到保留地图入口，不编造地点或新增地理编码服务。

## 本轮收口

继续本地 Qwen，不再配置或调用 Gemini，不升级计费、不充值。
新年龄、位置、学校/组织及活动好友权重缓做；现有活动分数仍按共同兴趣，
好友推荐还使用可见的共同 Interested／Going。没有声称这些新因素已参与评分。
保留既有小计划和模型语义评测的失败记录，未以本次代码检查改写为语义达标。
本轮没有重新执行真实 today → 本地模型 → canonical pair 的服务链；旧 F1 单例
只证明当时的历史手选记录链路，不能替代本轮真机与服务验收。

## 验证与产物

| 层次 | 实际结果 |
| --- | --- |
| Backend | 严格 TypeScript 编译，完整 1,526/1,526 通过 |
| Flutter 分析 | 全量 analyze 无问题；随后只修复 today timeout 回调，已由针对用例及 release 编译覆盖 |
| Flutter 定向 | 19 文件共 249 用例；首轮 243 通过/6 失败；仅三个受影响文件修正后 42/42，通过覆盖原六个失败 |
| 独立 QA | 冻结头上原三个 Send 反例及头像退出重入，共 4/4；原反例断言未改 |
| APK | release 构建成功，Gradle 114.5 秒；二进制独立核验另附 QA 记录 |
| 真实服务/手机 | 未部署，未安装，未真实推送；等待具体授权与 LI/SHI 的设备验收 |

首批 Flutter 的六项失败是三个 today 场景、两个改名后的购票按钮 finder、一个从文字
改为 tooltip 的资料可见范围断言。today 实际缺陷为协变 `Future<Success<String>>`
与返回 `Failure<String>` 的 timeout 回调不兼容；改为 timeout 抛出再由已有 catch
处理，没有放宽断言或回退到不带参考的发送。全部原始日志保留在：
`/home/miku/.local/state/enmori-core-feedback-20261025/`。

APK：`build/group-delivery-v29/ENMORI-group-v29-release.apk`，66,906,266 bytes。
SHA-256：`35e4b53688f729d01b80f322c838c92b6c4785ee9445528c63c00eb47ed2fd30`。
包名 `com.enmori.app.group`，versionCode `29`，versionName `1.0.0-group20261025`。
同目录有 `candidate.json` 与 `SHA256SUMS`。保留 v28 文件哈希
`22dc680046950c61fb53bdfc824f0852c84da649094aa58b45c0ab4e9225f377` 未变。
本轮包没有 installationRef，不代表已开通真实通知。

后端已准备独立私有候选目录：
`/home/miku/.local/state/enmori-core-feedback-20261025/service-candidate-0e60cb9/`。
包含冻结源码和验证过的编译产物，复用锁定依赖；未复制凭据或配置、未启动。

## 集成与评审

各会话实际模型/max 配置及所有权见
[Integration 证据](../evidence/core-feedback-20261025/integration.md)。

| 模块 | 交付提交 |
| --- | --- |
| Product / 发现入口 | `4b5276aac4f2906485e816fe0deb210aa7397f91` |
| Runtime / 头像后端 | `1709a5921a37517ee7d9c4e0132f1de09b1c297a` |
| Context / 当天与推荐 | `e89ebf3613f87a8c91e4a8c1e43425c81122275b`、`5be33c61583e41d7fafe4960455ad97f122500dd` |
| Event | `7d7c90b1d03d9cd48e50618fead8965f74489bee` |
| App | `6d0e3f6395dc36cfbe4991163d6319aac89d171b`、`abf75c507cb26d04b863fbafe51fdbd7cf7e4957` |
| App 最后修复 | `54db6f87d2bd94d5cde482efa5a5d0d4b1d1905a` 等效应用为 Integration `52a87ff`；遮蔽变量改名在 `9d98307` |
| Shared | Home `fb4d08d`，后端/API `c7881d5`，头像/入口接线 `9d98307` |

独立 QA 的原问题、修正及范围分别见
[头像](../evidence/core-feedback-20261025/qa-avatar-source-review.md)、
[活动](../evidence/core-feedback-20261025/qa-event-source-review.md)、
[当天参考](../evidence/core-feedback-20261025/qa-today-source-review.md)、
[好友来源](../evidence/core-feedback-20261025/qa-friend-source-review.md)。

## 部署与覆盖升级边界

启动任务明确要求部署、真实云端数据测试、通知发送及真机写入在具体范围获得授权后执行。
这次只准备候选。现有 `enmori-group.service` 仍 active/running，目录为
`li-zhou-integration-oct20/ENMORI`，该工作区 HEAD 仍为 `7a3c4fa31b5bb609349a961a2e4e08aeb80c9036`。

建议下一窗口：切换现有服务到本冻结后端，沿用原账户、数据库、TLS、Ticketmaster
与本地模型配置；核对受控账号后显式启用 firstFlow，预约 worker 限 30 分钟。
不启用付费云或真实系统推送，不清库、不重置、不自动安装手机。
LI/SHI 再覆盖安装 v29，并做一次合成当天签到、聊天引用和明确预约跟进的手机验收。
部署前保留旧服务入口及配置备份；服务失败先恢复旧入口。APK 保留旧文件，
不承诺 Android 允许降版本覆盖，不以卸载清数据作为回退方案。
