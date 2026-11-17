# LI: approve the narrow expired-projection repair and further diagnosis

Date: 17 November 2026, Asia/Singapore. Authority: LI / PM, current task.

After reviewing the [v84 follow-up](../evidence/2026-11-17-stable-followup/README.md)
and its [backend/AI proposal](../evidence/2026-11-17-stable-followup/authorization-and-backend-proposal.md),
LI instructed: “可以，先按方案做后端过期快照的最小修复并完成回归，继续定位 onePA 详情不可用和最初启动失败的原因。AI 续期先不动，部署前把结果和具体变更给我确认。”

This authorizes implementation and regression of option A: retire a shared
snapshot that is already expired before admission of a new exact stable-detail
lookup, preserving existing in-flight expiry, generation replacement,
cancellation, disable and source-failure fences. Do not extend TTL, serve stale
data, change provider access, add automatic retries or change public contracts,
data models, dependencies or infrastructure.

Continue source/local diagnosis and bounded read-only investigation of the
independently unresolved onePA detail and initial startup failures. This does not
approve a new production logging sink, retention policy or diagnostic deployment.
Keep synthetic/local evidence distinct from production request attribution.

Prepare the concrete changes, regression results, deployable artifact and
rollback/verification scope for LI review before any deployment. No remote code,
configuration, ledger or owner mutation is authorized by this decision. AI
renewal remains explicitly deferred. The prior phone-testing deferral remains
unchanged; no phone operation is requested.

LI then clarified: “真机你可以用虚拟机我目前没法离开手机”. Emulator
verification is authorized in place of further phone operation for this round.
Preserve the physical-phone deferral and label emulator results independently;
they do not establish physical-device acceptance.

This bounded implementation approval extends the
[preceding follow-up decision](2026-11-17-li-stable-candidate-followup.md).
It does not supersede existing source freshness/degradation contracts or approve
release freezing. Preserve old decisions, account data and private evidence.
