# v87 候选包独立核验

2026-11-17，Asia/Singapore。**实际 ZIP 独立核验通过，没有发现超出三项已批准 onePA 修复的包差异。** 本次只读本地包、源代码、编译产物和构建收据；没有执行打包脚本、重新编译、访问远端、上传、部署、操作设备或 AI。部署仍须另行批准。

## 核验对象

| 对象 | 身份 |
| --- | --- |
| 候选文件 | `/home/miku/Downloads/ENMORI-backend-v87-candidate.zip` |
| 候选 SHA-256 | `357e981363ddc0c5297dd224dabbed288e5c637059d9f9819146cc68fa747102` |
| 候选大小 | 68,086,761 bytes |
| 源提交 | `9e4c3ca6c44bc243823ee3f0a5d34ae3ec76bb28` |
| 对比基线 | `/home/miku/Downloads/ENMORI-backend-v85-candidate.zip` |
| 基线 SHA-256 | `7b2ffcccbf6c129ccaa839de1fced57125e2c41e33a5f746dc444189fcbe4140` |
| 包内 manifest SHA-256 | `78b42c8af4801e24a6b3c9e684479ac908b4d8473b2134cb49ee60710de07692` |

## 独立检查结果

审查直接打开两个实际 ZIP 并读取每个 entry，不仅检查生成者的 receipt：

- 两包均通过 CRC 完整性检查；entry 列表及顺序相同，8570 项，无重复名称。8561 项逐字节相同，恰好 9 项变化。
- 7619 个 `node_modules/` 条目逐字节相同。全部条目的时间、压缩类型、注释、extra、创建系统/版本、提取版本、权限属性、volume 和 ZIP flag bits 均保留；变化条目的大小/CRC 随内容正常更新。
- 对应 317 个已跟踪 `backend/src` 文件逐字节匹配指定提交；当前 backend source、tool、API、package/lock 没有未提交差异。相对 v85 源提交，相关生产范围只有获批的三个文件改变，tool/API/package/lock 没有变化。
- 942 个包内生产编译条目与主线程私有 `package-compiled/src` 及最终测试使用的 `backend/dist/src` 完整比对。JS 和 declarations 逐字节一致；source map 比对仅规范化构建目录产生的 source path，其余 JSON 内容必须相同。三个发生变化的 map 另行核对，与本次 fresh compile 文件逐字节一致；310 个仅编译源路径不同的未变 map 保留了 v85 原字节。
- manifest 仅 `demoVersion: 85 → 87` 和 `sourceCommit` 改变；其余字段全部相同。运行入口、依赖、既有 AI/default/owner 相关 manifest 字段均未变。未增加包条目或配置文件。

恰好九项变化均在以下清单内：

| 类型 | 路径 |
| --- | --- |
| JS ×3 | `backend/dist/src/event-browse/infrastructure/{onepa-browse-source,onepa-public-reader,public-event-pages}.js` |
| source map ×3 | 上述三个 `.js.map` |
| 内部 declaration ×2 | 同目录 `onepa-browse-source.d.ts`、`public-event-pages.d.ts` |
| 清单 ×1 | `deployment-manifest.json` |

两个 declaration 的实际差异只有 private `loadExact` 及内部 `PublicPageAccessDenied` 类，均来自已批准 TypeScript 修改；不涉及公开 REST DTO、路由或 API schema。

本次也只读检查了私有 `package-v87.py`：它使用已核验 v85 包保留未改运行时与依赖，调用现有 pinned Node 24.19.0/TypeScript 本地编译，以拷贝的 ZipInfo 写入新包并逐 entry 验证；脚本没有上传或远端操作。独立审查没有重新运行脚本或另行编译，因此编译证据归属于主线程，包字节、源码提交和已测产物的一致性由本审查独立确认。

## 结论与限制

该文件可作为具体部署审阅候选；不得把“包一致”视为部署已批准或运行时已切换。源码回归和最终组合的独立 57／Firebase 21／Azure 9 证据见[独立验证报告](onepa-final-independent-review.md)，最新完整 backend 数量见[第三项报告](onepa-pending-time-review.md)。

未归因的真实 onePA 503、来源拒绝后的实际恢复以及候选客户端与实际挂载后端的验证仍然缺失。此候选修复不会绕过 provider 拒绝，也不续期 AI 资金授权；仍不能据本次包核验宣称稳定版。
