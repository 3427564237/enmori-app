# DU Note／time／source identity 具体交接要求

日期：2026-10-13，SGT（UTC+08:00）。编写：ZHOU 本地工作代理。

本文件把已选 F03 的两项 producer 前提变成可核对的源码与验证交接，不新增产品合同，不要求重新批准 N02／F03／R-A／C-A。当前用户只授权本地工作；本文件未提交、未上传、未通知 DU，也不是 DU 已作出的保证或 JIN／LI 的验收。下列待交证据没有在本轮执行。

## 1. 已有权威与实际缺项

控制源为 [Remaining A 正式决定](../decisions/2026-10-13-li-remaining-isolated-ai-contract-a.md)，固定于 [#95 head `72c027933d4b3ac1a95e25dc733619a6c63522b6`](https://github.com/3427564237/enmori-app/blob/72c027933d4b3ac1a95e25dc733619a6c63522b6/docs/decisions/2026-10-13-li-remaining-isolated-ai-contract-a.md)，Git blob `965457097426d044f930cacfed8b8a2e36038cb0`。其选定 [#93 集中包](https://github.com/3427564237/enmori-app/blob/110eda443fbe101608c6aa6df551e52b6a18da5a/docs/planning/2026-10-13-zhou-real-ai-remaining-contract-packet.md) 第3–6节，包 blob `019cf329753ee18f02724ecb29c0cf61359a277d`；本交接只展开第4节 P-DU-1／2／3／4 已需的事实。范围保持首个 isolated synthetic Auth／Firestore／fake-Qwen Note-only 增量。

[已有 producer 前置事实复核](../evidence/sprint3/2026-10-13-zhou-reader-producer-prerequisites.md)保留正常创建、parser、ID、幂等与维护缺口的来源链。LI 在 [#44 的实际交付说明](https://github.com/3427564237/enmori-app/issues/44#issuecomment-6140784600)要求 DU 只补这些 source-bound 事实，不重复旧 #89 报告。2026-10-13 本轮只读核对的远端状态为：

- #89 当前 head 仍为 `6ef6978c4dcdba79b66c781ba99d851aa4e26955`；DU 所引用功能证据源为 `9e2a0572ff0e760c958635cd8d1c1f6253581a91`。后源仅尾部换行清理的归属见 [LI refresh review 5498833589](https://github.com/3427564237/enmori-app/pull/89#pullrequestreview-5498833589)。不把旧功能执行改记成后源执行。
- [#94](https://github.com/3427564237/enmori-app/pull/94) head `8189ac5383a6dd44c01329b38470bf548e489b39` 的 DU 新 LI shared delta review 已于 08:51:44 UTC APPROVED；[#95 DU review 5501062286](https://github.com/3427564237/enmori-app/pull/95#pullrequestreview-5501062286) 已于 08:51:48 UTC 对 `72c0279` APPROVED。两项不是当前待审前置；其共享设备／实际 reader 等未执行范围不因此完成。
- DU 的上述 review 明确：正常 Note 已规范化，Backend 赋 UTC 创建时间，现有应用只有创建／读取；randomUUID＋Firestore create 防止覆盖仍存在的文档。DU 同时明确没有永久 ID registry，未证明跨物理删除、恢复或外部写入的绝对不复用；该说明不是新 Note/time/delete 验证。

仍需交接的只有两块：**适用隔离库存及所有写入口的 canonical 毫秒 UTC／不可变性**，以及 **实际受控删除、恢复、重建入口下的 source 身份不复用**。缺证据只限制依赖它的真实 Note 查询／历史来源失效声明，不阻止 R-A、inner reader、已选政策及其他不依赖这些事实的增量。

## 2. DU 一次交付的最小证据包

交付绑定一个明确的新增或复用源码版本，不用“最新”“同上”“当前环境”替代身份。每条结论注明 `已由源码支持／已运行验证／未证明／不适用且有边界依据`；不同结论可以有不同状态。

| 交付项 | 必填内容 |
| --- | --- |
| 源码 manifest | repository、完整 commit head、tree、每个相关 source／test／fixture／launcher／维护说明的仓库路径和 Git blob、固定链接。若执行时有未提交修改，另列实际输入文件摘要与差异，不能称在干净 head 执行。 |
| 适用库存 | 本次 isolation 的环境类型、所属受控实例／逻辑 database、适用 collection 和记录集合的定义、开始时是受控新空库存还是含既有合成记录、创建者及后续可写入口。描述范围即可，不记录用户身份、内容或凭据。既有普通记录不在本交接中迁移。 |
| writer／维护清单 | 完整表列出创建、重放、直接 repository 调用、fixture／seed／import、Admin SDK 脚本、维护、恢复、teardown 及可进入该库存的其他已知特权入口；写入字段、是否可自选 ID、是否能 replace／delete／restore、实际 owner、允许环境、调用点、guard 及源码／受控操作说明。没有某类入口时说明检索范围与其实际不可达依据，不用“没有 HTTP 接口”代替。 |
| 执行记录 | 每组命令、实际源、锁定工具版本、synthetic fixture 条件、实际结果／退出码、失败和 Not Run、证据文件摘要。复用已有相同源码证据时标原执行者、原源和覆盖内容，仅补缺失差异。 |
| 连接与清理证据 | launcher／composition 如何把实际 Auth／Firestore client、project／database 和 gateway 绑定同一专用受控实例；拒绝普通／cloud 配置及已有共享实例的检查；仅自有 fixture 的清理、absence 观察、未决 I/O／资源关闭和失败记录。环境变量通过或 Port fake 不能单独证明实际连接目标。 |
| 交接结论 | 分别写明两项保证覆盖哪些入口和库存、仍缺哪个具体源／验证、依赖接入影响及负责补齐者；不把有限运行推广为对任意外部管理员、任意未来 writer 或无限时间的绝对保证。 |

不要求把原始数据库、Note、UID、tokens、keys、request body 或完整 SDK 错误附在证据里。库存和对抗验证输出只保留计数、稳定类别、布尔比较及必要非内容执行信息；源码路径／Git blob 可保留，内容指纹或永久 source 清单不作为新留存用途。

## 3. 保证 A：全部适用 Note／time 库存及写入口

### 3.1 需要 DU 明确承担的范围句

> 对交付 manifest 所列 isolation 库存和实际受控写入口，`ownerAccountId`、规范化后的 `note`、Backend 赋值的 `createdAt` 在同一 source 身份下保持不可变。全部可被该隔离 AI reader 使用的 `createdAt` 是合法、唯一表示的 `YYYY-MM-DDTHH:mm:ss.SSSZ` UTC 毫秒字符串；Note 是既定外侧 Unicode White_Space 规范化后的 1–500 grapheme。不存在未声明的导入／fixture／维护入口把其他格式或改写内容带入此范围。未覆盖的入口或库存明确列为未证明。

这是供 DU 用实际证据确认或逐项纠正的交接目标，**不是本文件已经证明或替 DU 签署的保证**。时间是既定 Backend authoritative creation instant，不是 Firestore physical commit timestamp；不要求服务具备纳秒写时钟。AI 的 fixed readTime／asOf 与 inclusive 七天窗口精确映射仍由 ZHOU adapter 负责，不可为配合毫秒字符串而截断、移动 asOf 或窗口。

### 3.2 必须绑定的源码

以下是已核对基线入口；新交接应逐一给出实际采用版本，未改文件可复用原 blob，不要求无意义重写。

| 基线入口（均在 DU 功能源 `9e2a0572ff0e760c958635cd8d1c1f6253581a91`） | 已知 blob／事实；本次应补的说明 |
| --- | --- |
| [`backend/src/check-ins/domain/note.ts`](https://github.com/3427564237/enmori-app/blob/9e2a0572ff0e760c958635cd8d1c1f6253581a91/backend/src/check-ins/domain/note.ts) | `96620dee4cd12a7e265288ba1e5258e386bfcf1b`。既定 normalization／grapheme 限制；说明哪些入口实际调用它，哪些仅验证已规范值。reader 不替 stored Note 再 trim／truncate。 |
| [`backend/src/check-ins/application/create-check-in.ts`](https://github.com/3427564237/enmori-app/blob/9e2a0572ff0e760c958635cd8d1c1f6253581a91/backend/src/check-ins/application/create-check-in.ts) | `1eda67886d10965fcdbbe159556f8094e77375b0`。绑定 trusted principal、normalizer、clock／ID generator、repository 的实际调用链。 |
| [`backend/src/shared/application/authoritative-values.ts`](https://github.com/3427564237/enmori-app/blob/9e2a0572ff0e760c958635cd8d1c1f6253581a91/backend/src/shared/application/authoritative-values.ts) | `2a5943265a0ce6966c9841a019ba9f6946d7e3de`。正常创建使用 Date.toISOString；说明非法／不可表示时钟的失败边界及实际时钟来源。 |
| [`backend/src/shared/infrastructure/firebase/firestore-records.ts`](https://github.com/3427564237/enmori-app/blob/9e2a0572ff0e760c958635cd8d1c1f6253581a91/backend/src/shared/infrastructure/firebase/firestore-records.ts) | `0008fa6834bc85749e69205aedaa7d39a66b9615`。原 `isUtcIsoInstant` 接受无小数和非固定三位小数；原 parser 可读不是全库存 canonical 的证明。交付应说明此差异由哪一实际边界限定，不能默称旧 parser 已严格。 |
| [`backend/src/check-ins/infrastructure/firestore-check-in-repository.ts`](https://github.com/3427564237/enmori-app/blob/9e2a0572ff0e760c958635cd8d1c1f6253581a91/backend/src/check-ins/infrastructure/firestore-check-in-repository.ts) | `0aa699ae54d2c4d4f05cfc043e13875d9f198e9d`。检查 create／replay、可直调 command 的校验、实际持久字段及 owner 来源；不可只证明外层 HTTP normalizer。 |
| [`backend/src/shared/infrastructure/firebase/firestore-gateway.ts`](https://github.com/3427564237/enmori-app/blob/9e2a0572ff0e760c958635cd8d1c1f6253581a91/backend/src/shared/infrastructure/firebase/firestore-gateway.ts) | 本轮只读核对 blob `09c17c6776d056774319ebef7949b701726ffdce`。它提供通用 create／set／delete；逐调用者清单才能说明其在本范围内的写能力，不能把 generic gateway 本身当 Note 业务 guard。 |
| 实际 composition、fixture、维护和测试 | 交付实际 `controlled-runtime`／隔离 composition、`controlled-emulator-environment`、launcher、创建／record-parser／repository 测试及 fixture／seed／teardown 的 path＋blob。已有 `backend/emulator-test/firebase-emulator.integration.test.ts` 中直接 fixture 写入也须纳入采用版本的清单；新增脚本／仓库外受控操作按实际情况列入，不假定不存在。 |

### 3.3 可重复的验证与库存检查

| 验证项 | 所需观察与不得替代的证据 |
| --- | --- |
| 正常创建和读取 | 经过实际创建链与真实受控 gateway 创建，独立 readback 断言 owner、规范 Note 和 canonical time；覆盖既有 Unicode／grapheme 边界、时钟失败及幂等重放保留原值。测试正文只在 synthetic fixture 内，报告不输出它。既有相同源测试可引用，不重新计为本次执行。 |
| 绕过外层的写入口 | 逐 inventory 入口核对直接 repository、fixture 和维护是否仍满足保证。对无小数、非三位小数、非 UTC／无效日期、非规范 Note、owner／Note／time 改写，记录实际拒绝、不可达或仍可写；若可写就标缺口，不能调整预期把它记为合格。不得为本交接新增产品编辑接口。 |
| 全适用库存检查 | 对明确定义的受控记录集合做不依赖 AI 时间 range 的完整枚举，核对文档总数与字段合法数；无遗漏结束、错误／不可读／分页失败明确计入 incomplete。可使用受控 fresh-empty＋所有后续 fixture 的完整枚举证明本批范围；它不证明别的库存。检查时写入并发若未隔离／受控，必须报告覆盖不完整。 |
| 查询遗漏负例 | 在独立 synthetic 对抗 fixture 中加入正常 parser 可接受但非 canonical 的时间，证明库存检查能发现；不能只依赖 selected string query 返回后的验证，因为漏出 query 的记录不会到达 parser。发现后停止受影响接入并清理自己的负例，不修改原时间、读时补值或把它当正常 empty。 |
| 与 reader 的交界 | 交付给 ZHOU 的候选字段对应保持 `note→noteText`、`createdAt→occurredAt`，visibility 不作 AI permission。七天 inclusive、DESC time／ASC ID、五条合法项与 page25 属已选 AI reader 责任；DU 的库存证明支持其查询前提，History page20／name DESC 或已有历史读取权限不自动满足它。 |

“全库存”仅指明示的适用隔离库存，不能以一次运行宣称普通／云数据已扫描。若发现既有非 canonical 记录，交付计数／类别／范围、来源 writer 和缺少的处置权威；本文件不授权静默迁移、格式改写、补时间、删除普通记录或新增 source 字段。对应查询暂不宣称完整，其余已批准工作继续。

## 4. 保证 B：永久删除、禁止恢复及同 ID 不复用的受控执行边界

### 4.1 所需范围句与已知限制

> 在 manifest 明示的 isolation source 生命周期、全部可达 writer 和受控维护范围内，永久删除的 source 不通过恢复备份、seed／fixture replay、Admin 脚本或 create 路径以同一 source ID 回来；已存 source 不被同 ID 换 owner／Note／time。对未覆盖的管理入口、运行期或恢复机制明确不提供此保证。删除观察只有结合此受控身份边界，才可供已选历史来源失效逻辑使用。

交接须说明该边界如何持续覆盖仍保留相关 AI provenance 的时间，而不只是一次测试中 document 缺失。若本批只有整套自有隔离 fixture 的最终销毁，明确 source 与关联 AI fixture 是否一并结束、如何避免把销毁后的 fixture 当仍有历史可恢复的运行实例；不得把 teardown observation 当成长期维护保证。

已知 `randomUUID` 降低碰撞概率；transaction.create 保护**当前仍存在**的 ID；有限幂等记录保护其有效窗口。三者单独都不是永久删除后不可复用证明。无应用编辑／删除 endpoint 也不约束 Admin SDK、console、导入、fixture 或 backup restore。所需保证是可审计的实际受控边界，不承诺阻止任意外部特权者违反它。

### 4.2 需要绑定的源码／操作入口

| 入口 | DU 要交的具体事实 |
| --- | --- |
| ID 分配及传入 | [`crypto-opaque-id-generator.ts`](https://github.com/3427564237/enmori-app/blob/9e2a0572ff0e760c958635cd8d1c1f6253581a91/backend/src/shared/infrastructure/crypto-opaque-id-generator.ts) 原 blob `5e5bcdeb3db1312a2d685dd65b6225f02ffdc92c`，加实际 constructor／composition：谁可注入 generator、谁可传 creation ID、正常／维护／fixture 能否指定已用 ID。不能只提交 generator 单文件。 |
| 现存覆盖、幂等重放 | 上述 repository 和 [`check-in-repository.ts`](https://github.com/3427564237/enmori-app/blob/9e2a0572ff0e760c958635cd8d1c1f6253581a91/backend/src/check-ins/ports/check-in-repository.ts) 原 blob `1ed0ad02e608b3fd22878cdbf02c13531334feda`；标出 candidate existence、Firestore create、active replay、原引用缺失、过期 idempotency、事务失败各分支。说明它们证明到哪里，不能把源缺失时 unavailable 写成永久 registry。 |
| 物理删除 | 每个能 delete 本库存的实际脚本／fixture／Admin 操作及允许操作者、调用范围、identity 输入、前置 guard、完成／失败记录。若没有支持的运行期删除入口，明示这一限制以及实际仍可能删除的 teardown／特权入口，不创造新产品删除语义。 |
| 恢复、重建和导入 | 对 restore／import／seed／fixture replay／账户或数据库重建逐项给实际入口及其可达性、配置／运行说明和责任人；支持的路径如何不恢复旧 source 身份，禁用路径如何在该受控运行中被排除。若某路径仍能恢复或复用，就报告实际反例和依赖影响，不能仅写“禁止”。 |
| teardown 与重启 | 绑定 cleanup／shutdown／下一次启动 fixture 的源码；区分“仅本次自己创建的记录已删”“所属隔离实例结束”与“仍有旧 provenance 的实例继续运行”。陈述范围内未决写入／迟到结果的处理及实际验证，不能让下一轮固定 seed ID 悄然复活前轮 retained source。 |

不要求新增永久 source registry、ID tombstone 表、每 source generation、deleted-source 事件表或 reverse index。也不以长期留存 source IDs／内容指纹作为本文件的解决方案。若实际事实说明在已选库存内不能成立，DU 明确交付“不具备”及最小差异，由 ZHOU 定位依赖、JIN 审技术、LI 处理确需的范围／合同变化，不自行增加 schema。

### 4.3 可重复的对抗验证

| 场景 | 应交的真实结果与边界 |
| --- | --- |
| 当前同 ID 覆盖 | 用受控重复候选 ID 证明仍存在文档不被覆盖，原 owner／Note／time 不变；若覆盖被允许，报告失败。不得只凭 randomUUID 极少碰撞推断结果。 |
| 活动幂等重放及源缺失 | 原请求重放返回原 ID／原值；在独立 synthetic fixture 物理删源后，重放不能重新造回原 source。记录实际 stable failure／无写入；不把它外推到幂等过期后或其他入口。 |
| 过期／新 key／其他入口 | 分别说明原幂等窗口外、另一个创建 key、直接 repository 或维护入口能否传旧 ID。通过实际允许入口尝试同 ID 重建时如能成功，记录为未闭合，不能依靠“测试本应不调用”掩盖可达生产路径。只有不可达边界已有实际依据时才可标不适用。 |
| 删除→恢复／fixture 重放 | 对实际存在的 restore／seed／维护路径做相应 synthetic 反例验证，说明删除后旧身份会否回来。未有该入口不要求开发 restore 功能；提交其受控排除证据及未证明边界。普通产品 API 无删除不替代这一行。 |
| 重启和后续生命周期 | 若该受控运行支持保留数据后重启／fixture 重放，复核旧 provenance 仍存在时不恢复 source 身份；若只支持整体一次性隔离销毁，绑定销毁及下一次运行的独立性证据，限制结论范围。无相应执行记 Not Run，不宣称 C-A 的 offline delete→recreate 已闭合。 |

上述是保证所需的验证维度，不要求 DU 建立不存在的维护产品功能或开展无界实验。每批实际运行仍须符合既有受控环境授权：先固定 synthetic fixture、launcher、范围、预期保证与自有清理；不借本文件访问普通数据、生产云、真实模型或执行未批准部署。

## 5. 交接结果与责任

DU 返回以下短表，并附第2节 manifest／验证记录即可；不用再写一份旧 History／#94／#95 全模块报告。

| 保证 | 对应库存／入口 | exact source＋test／evidence | 已证明范围 | 缺项／反例／Not Run | 对应真实接入可否成立 |
| --- | --- | --- | --- | --- | --- |
| A：canonical ms UTC＋owner／Note／time 不可变 | 由 DU 填实际范围 | 由 DU 填固定身份 | 仅填实际结果 | 不得省略 | ZHOU 对照 selected reader 前提核对 |
| B：永久删除后不恢复／同 ID 不复用 | 由 DU 填生命周期和实际控制入口 | 由 DU 填固定身份 | 不给无限外部世界保证 | 不得省略 | ZHOU 对照 current／历史来源失效前提核对 |

ZHOU 逐条核对交付与已选 reader／source validation 所需事实，保留确切缺项；JIN 审实际新增技术差异及 source-bound 验证；如事实引出合同／范围变化，由 LI 在其权限内确认，不能由本地复核代选。#94／#95 已到达的 DU approval、#89 既有接受、#93 及 Remaining A 不重新审批。新源码仍走对应增量审查，不把旧测试移记到新树。

在交接未齐时，ZHOU 继续不依赖这两项保证的工作，真实 Note adapter 只在所需前提得到对应证据后接入。历史 owner read 不授模型权限，visibility 不替代 `checkin_conversation` consent；缺源事实不是正常 empty，不用 current-input-only fallback 绕过已选拒绝语义。不新增截止、普通启用、merge／任务关闭、M26／Sprint／UAT／Release 完成声明。
