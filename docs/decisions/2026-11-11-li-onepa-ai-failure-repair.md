# LI — continue onePA, AI latency and 62 failing tests

Date: 11 November 2026 (Asia/Singapore). Authority: LI / PM, this task.

LI requested: “继续修复onePA不可用和AI回应过慢的问题，62项失败也排查解决，还是让terra max负责操作验收，你负责分析和修复。”

Continue the bounded repairs under the [5 November AI/Admin decision](2026-11-05-li-ai-latency-admin-polish.md) and [Event read-budget approval](2026-11-05-li-followup-runtime-admin-validation.md). Root owns analysis and implementation; the existing Terra max agent performs builds, test execution, read-only environment diagnostics and authorized device acceptance. No new model, prompt, cloud allowance, dependency, infrastructure or account/data mutation is selected. Keep the 15-second complete AI reply target and 20-second Event source / 30-second Event client limits.

Resolve the full Flutter baseline failures without skips or weakened safety assertions. Earlier tests do not supersede the [22 October session-owned AI navigation decision](2026-10-22-li-ux-priority.md), [26 October bounded recovery and public Event snapshot retention](2026-10-26-li-v31-recovery-and-state-preservation.md), or subsequently approved feature contracts. Retain session replacement, explicit cancellation, failed/unknown write, source expiry and no-resend coverage while updating obsolete UI journeys. Actual defects uncovered by those journeys remain implementation work.

Keep source, service, APK and phone results separate. Previously cleaned temporary Admin identities remain cleaned; this request does not grant the current account Admin privileges or authorize new test records by itself.
