# ENMORI 交接单：Azure 后端与自有服务器迁移评估

日期：2026-10-29。交接要求：LI「先给我一个交接单，我有个服务器但是在别的国家，不知道是否能迁移过去，包括后端和 ai 本地模型」。

## 1. 当前目标与边界

目标是让别人安装 App 后，LI 的个人电脑关机也能使用普通功能；后续评估把现有本地模型一起迁往自有服务器。当前只做交接和可行性评估，**不视为已批准某台目标服务器、实际迁移、重新启用云端 AI、追加模型测试或停用现有服务**。

此前已明确批准 Azure Japan East Linux B1，使用现有学生赠金，不绑卡、不关闭支出上限、不转自动付费。Groq/Ollama Cloud 工作暂停。本轮没有追加模型调用。

## 2. 已部署什么

| 项目 | 实际状态 |
| --- | --- |
| 公网后端 | `https://enmori-backend-20261029.azurewebsites.net` |
| Azure | Azure for Students；资源组 `enmori-student-cloud`；Japan East |
| App Service | App `enmori-backend-20261029`；计划名 `enmori-backend-free`，实际已升级 **B1 / Basic / 1 实例** |
| 成本 | 核验单价 US$0.019/小时，约 US$13.87/730 小时；消耗有限学生赠金。支出上限 On。不是永久免费 |
| HTTPS | 平台域名证书、HTTPS-only、TLS 1.2 起、HTTP/2；HTTP 301 跳 HTTPS |
| 身份 | Azure 托管身份 → Google Workload Identity Federation → 专用 Firebase 服务账号；没有上传个人 ADC 或长期私钥 |
| 数据 | 仍是原 Firebase 项目 `enmori-rmvp-controlled`；没有迁移或清空账户数据 |
| 运行环境 | 应用 Node 24.19.0，pnpm 11.19.0；现有 Playwright 1.64.1、Chromium 1248 和 Xvfb |
| 云端 AI / 通知 worker | Azure 入口未构造模型、预约 worker 或推送发送器 |
| 本地主机 | 原本地服务未由本轮停用或切换，仍须作为另一条运行线单独交接 |

Azure 专用服务账号仅有 Firebase Auth viewer 与限定 `(default)` 数据库的 Firestore user 权限；没有 Auth 用户管理权限，用户托管密钥数量为 0。现有 Google/Firebase 计费与 Azure 赠金分开。

**交接时重新访问云端受保护资料接口返回 401**，说明公网 HTTPS 和鉴权入口可达；这不等于全部功能验收通过。

## 3. 验证结果与实际故障

已用独立合成账号验证：注册后初始化、资料和设置保存、版本冲突 412、私密 Check-in 保存和读取、跨账户拒绝 404、停用账号拒绝 403、重启后数据保留。最后一组合成账号及其记录已经清理，没有使用真实账号制造覆盖。

手机安装了 **v51 / `1.0.0-cloud20261029` / `com.enmori.app.group`**，采用原签名和 `adb install -r` 保留数据；包管理器已确认版本。此后 USB 断开，交接时无连接设备。不能把后续手机状态当作已复核。

**未通过：LI 在移动网络检查中反馈「活动不可用」。**

- 云端列表实际返回 18 条 Ticketmaster 活动，但一次耗时 **42.777 秒**；onePA 的 `available:false`。
- App 普通 GET 超时是 **15 秒**，因此外部慢来源可拖垮整个列表。
- Ticketmaster 的部分详情浏览器读取也出现 `EVENT_READER_HOME_LINKS_TIMEOUT`；后来一个详情 GET 返回 200，仍不证明完整详情内容成功。
- 云端 Chromium 能启动；onePA 的公共页曾返回 200 和正确标题，但目录读取仍超时。没有证据支持绕过验证码、访问限制或伪装浏览器。
- 当前源代码已有修复候选：**仅 Azure** 给每个列表来源 10 秒预算，取消慢读取，不等待浏览器清理才返回；健康来源可返回，失败来源继续明确标示，全部失败仍报错。
- **该修复未部署。** 当前 Azure 仍是下节所列 `e057289` 快照。修复不能宣称已解决手机故障，更不能宣称 onePA 和完整 Event Details 已完成。

尚未完成：手机普通功能完整验收、活动修复后的复测、个人电脑关机后的实际使用、正式 Release。

## 4. 代码、包与证据

- 工作目录：`/home/miku/.codex/worktrees/li-takeover-20261028/ENMORI`
- 分支：`souma/li-takeover-20261028`
- Draft PR：[PR #192](https://github.com/3427564237/enmori-app/pull/192)
- 已部署源码：`e057289472106051087c70f5d72afe5fd4893f3b`，已合并安装过的 v50 注册恢复改进。交接提交会在此基础上包含未部署活动修复和本交接记录；**仓库 HEAD 不等于云端运行版本**。
- Kudu 部署：`d15cde76-fd07-44e2-988d-8e878f74f3dc`，成功完成。
- 当前云端 ZIP SHA-256：`837438bb216321791996a7a19b161805400447988c59a5c23e4599a645957fe2`。
- v51 APK：`/home/miku/.local/state/enmori-azure-backend-20261029/ENMORI-cloud-v51-release.apk`
- APK SHA-256：`3c6c00da6a8cb929d2317b1394373e6f79019f6e38185eb366c83a8d0dc36639`。
- APK 签名 SHA-256：`0fa59aeaa9ce03a830405ce79136b4abc3d62510fbb8360c8ebf7c88a82966ee`。
- 私有部署包、诊断和凭据目录：`/home/miku/.local/state/enmori-azure-backend-20261029/`。**不要整体上传或提交这个目录，也不要打印其中令牌、配置、账号测试状态。**
- 完整部署证据：[Azure 部署记录](../evidence/2026-10-29-azure-backend-deployment.md)。
- 授权来源：[Azure/B1 决定](../decisions/2026-10-29-li-azure-backend-deployment.md)、[后端优先与云端 AI 暂停](../decisions/2026-10-29-li-backend-first-cloud-ai-paused.md)。

验证归属：部署源码 Backend **1703/1703**、启动入口 **13/13**、相关 Flutter **56/56**。最终未部署修复的专项测试 **18/18**。更早的 Flutter 全量检查有 **1513 通过、72 失败**，尚未全部归因或修复，不能称全量绿色。

以下两份已有未跟踪文件属于其他工作，不要顺手添加、删除或覆盖：

- `docs/decisions/2026-10-28-li-event-content-source-direction.md`
- `docs/evidence/2026-10-28-event-content-source-gap.md`

## 5. 能不能迁到另一国家的自有服务器

**原则上可以评估迁移；国家不同本身不能判定能或不能。后端的迁移可行性较高，AI 是否能稳定响应取决于硬件与实测。尚未连接、检查或修改那台服务器。**

| 部分 | 迁移判断与主要工作 |
| --- | --- |
| Node/Fastify 后端 | 可复用业务代码。需要合适的 Linux/CPU 架构、可持续运行的进程、HTTPS 和实际可达的 Firebase；现有活动还依赖 Chromium/Xvfb，不能按纯文本 API 的资源消耗估算 |
| Firebase Auth / Firestore | 可继续使用原项目，不必为了换主机迁数据库。Azure 托管身份不能照搬到普通服务器，须按服务器环境重新选择最小权限服务身份；不要复制个人 ADC 解决部署 |
| 本地 Ollama 模型 | 可考虑在目标服务器自行运行；这与购买 Ollama Cloud 套餐是两件事。要核验 GPU/显存、RAM、CPU、架构、磁盘和驱动，再测冷启动、首 token 与完整响应时间 |
| App / HTTPS 地址 | 新域名需要部署证书、更新严格主机白名单与构建配置，使用原签名发新包。现有 Azure 入口硬编码 Azure 主机和 MSI 身份条件，不能原封不动复制过去运行 |
| 活动来源 | 在目标地区实测 Ticketmaster API、onePA 页面和完整详情读取的成功率及延迟；换主机不自动修复现有活动故障 |
| 预约 / 推送 | 若以后迁移，必须单独处理模型共享通道、worker 所有权、FCM 权限和未知结果恢复。不能让本地主机与新主机同时调度同一批预约 |

建议先评估**后端与 Ollama 放同一台服务器**：当前模型适配器明确请求 `127.0.0.1:11434`，这样最接近现有部署。若把 Azure 后端与海外模型分开，需要额外的受保护网络、鉴权、超时/未知结果及来源说明改造，迁移工作更多。该建议尚不是已批准的目标部署方案。

当前本地模型已做只读核验：

- 模型：`qwen3.5:9b`，9B，GGUF / Q4_K_M。
- 本地模型文件总量：6,550,825,550 字节，约 **6.55 GB**；**文件大小不是所需 RAM/显存上限**。
- 摘要：`56671c2ab9385f9cfcb404638e32cd62d88e3501d44822208363c010179a3c90`。
- 现有聊天适配器：`num_ctx:8192`、`num_predict:512`、`think:false`、单共享模型通道；不要迁移时顺手更换模型、参数或打开并行队列。
- 只读取了模型清单，没有执行推理。迁移不会自动提升此前未达标的回答质量。

Ollama 的默认监听是本机 `127.0.0.1:11434`，支持的 GPU/安装方式需按实际硬件核验。保持模型端口仅供后端访问，不把裸模型接口直接暴露公网。[官方默认监听实现](https://github.com/ollama/ollama/blob/main/envconfig/config.go)、[Linux 安装](https://github.com/ollama/ollama/blob/main/docs/linux.mdx)、[GPU 支持](https://docs.ollama.com/gpu)。

还需单独确定：把原个人电脑上的模型移到远端自有服务器后，处理地点、授权说明和来源标记怎样准确表达；不能直接沿用会让用户误以为仍在原主机处理的文案，也不能把它错误标成 Groq。

## 6. 下一位接手者的执行顺序

1. 先取得目标服务器资料：服务商、国家/地区、CPU/架构、RAM、GPU 型号与显存、剩余 SSD、操作系统、管理员权限、可开放端口/公网 IP/域名、现有月费与流量限制。不在聊天索要密码或私钥。
2. 只读核验目标资源和访问 Firebase、Google token 服务、FCM、Ticketmaster、onePA、模型下载源的网络；从手机所在网络测试目标地区延迟。先给具体可审查的部署与费用选择。
3. 先修复并实测活动列表/详情。未部署的 10 秒来源修复只是消除整体等待的候选，不是 onePA 完成证明。
4. 在目标服务器隔离准备普通后端：身份、HTTPS、进程启动、日志最小化、现有数据库访问；用合成账号测试读写、隔离、停用账号和重启。不得迁移或清空真实数据库来制造成功。
5. 得到继续 AI 工作的明确范围后，再准备现有模型、核对摘要和参数，做获批的合成推理验证。保护原未知请求，不自动重发；先确认唯一 worker 再切换预约/通知。
6. 新主机测试通过后再更新 App 端点、同签名安装并检查移动网络。最后由 LI 关闭个人电脑验证，保留回滚路径；不在工具执行期间擅自关机。
7. 新主机完成验收并确认切换后，处理不再需要的 Azure 资源。**只停止 Web App 不会停止 App Service 计划计费**；当前 B1 仍消耗赠金，不能遗忘。

交接完成前未实际执行服务器迁移、停止 Azure、停止本地主机服务或新增模型调用。
