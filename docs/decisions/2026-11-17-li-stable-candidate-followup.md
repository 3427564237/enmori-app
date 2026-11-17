# LI: investigate remaining candidate reliability failures

Date: 17 November 2026, Asia/Singapore. Authority: LI / PM, current task.

After receiving the [v83 audit](../evidence/2026-11-17-stable-candidate/README.md),
LI instructed: “继续处理剩余问题，优先定位活动详情不可用和启动异常，根因明确的客户端问题直接修复回归。AI 授权续期和需要改后端的部分，先给我具体方案及需要确认的事项。”

Continue from the retained v83 client and matched v78 backend. Prioritize the
failure chain for unavailable event details and transient startup-gate failure.
Use existing evidence, bounded read-only service diagnosis and deterministic
local reproductions. Minimal client repairs within existing approved behavior
are authorized when the cause is established, with regression and appropriate
candidate verification. Do not treat retry success as causal closure or a new
Activity as proof of same-Activity state loss.

For AI authorization renewal and backend changes, prepare concrete scopes,
required decisions, execution and verification steps before implementing them.
This instruction does not renew funding or evidence, alter spend caps or runtime
configuration, authorize a backend deployment, or change source-access rules.
Earlier grant records, expiries and source degradation/freshness contracts
remain controlling. Preserve existing accounts/data and the v83 audit trail.
Do not reset the unrelated main checkout or include private evidence in Git.

This extends the investigation under the [original audit decision](2026-11-17-li-stable-candidate-review.md),
not a release approval or supersession of any product/backend contract. The
candidate remains not frozen until its remaining conditions are satisfied.

## Follow-up phone deferral

After v84 was built and verified, ADB did not expose a connected device. Asked
whether to continue physical testing, LI selected **“先交付 APK 和方案，真机稍后”**.
Deliver this candidate and the concrete proposals now. Do not install or operate
the phone further in this continuation. Final-v84 physical acceptance remains
not run; v83 phone observations cannot be inherited as v84 passes.
