# Blocker publication — concrete preview, not executed

Action-time confirmation is still required by [the retained proposal](2026-10-05-li-blocker-resolution-preview.md), which states: “Publication requires the user's existing action-time confirmation rule.” The explicit implementation instruction retained this publication gate.

## A — publish both bounded packages and request the three reviews

Recommended after LI confirms this preview. No merge/acceptance/Issue closure is included.

1. Re-read PR #50 remote head. It must still be `497dc1661105f8212f7a0987655ff48aa1a7627e`; if changed, inspect and reconcile. Fast-forward its existing head branch to local `97d102d` (`souma/s3-checkin-snapshot-20261005`). The two commits retain the approval/proposal and implement only the Check-in snapshot fix. Keep PR #50 Draft and its base `codex/sprint3-first-slices` unchanged. Add the focused [DU packet](../evidence/sprint3/2026-10-05-checkin-review.md) with the exact read-back SHA; request DU's review through the established reviewer identity/path.
2. Push `souma/s3-friend-event-isolated-20261005` at its final delivery HEAD. Create one stacked Draft PR based on `souma/s3-01-li-start-20260930`, titled “Add isolated Friend requests and synthetic Event Detail”. Shared transport/router/test wiring is reviewed once. Link the separate [SHI Friend packet](../evidence/sprint3/2026-10-05-friend-review.md) and [ZHOU Event packet](../evidence/sprint3/2026-10-05-event-review.md), plus [execution evidence](../evidence/sprint3/2026-10-05-blocker-execution.md). Request SHI/ZHOU conclusions scoped to their packets on the new exact head. Retain JIN/SHI module ownership. If reviewer identities are not durably mapped, resolve the established identity before sending a mention/review request.
3. Attach the new PR to this chat, read back publication and reviewers, and leave every independent conclusion Pending until supplied by the actual reviewer. No preparatory Issue is reopened or closed as implemented acceptance.

## B — publish only the Check-in package

Execute A step 1 only. Friend/Event remain local and unpublished, with their independent reviews Not Run.

## C — keep all work local

No remote publication or review messages. Local commits and all three evidence packets stay available.

## Prepared PR description for the isolated package

Friend request and Event Detail consumer chains were missing from the isolated verification build. This adds exact lookup/send/recipient inbox/accept/decline and synthetic Detail reads, with explicit eligibility/block fixtures, transactional pending/reference handling and guarded Emulator-only composition. Home and See All now reach the same synthetic Detail with Retry and link copy. Normal app entries remain disabled; real-account qualification and real providers require separate approval.

Existing recommendation records/formula, owner-only Check-ins, account contracts and dependencies retain their approved behavior. A login-state reset fixes the existing repeated-account-login failure exposed by the Android chain. Preserve owners JIN/Friend and SHI/Event; SHI reviews Friend and ZHOU reviews Event on the exact publication head.

Validation: pinned Backend build and 312 tests; real Emulator regression results and Android two-account chain; Flutter analysis and 141 tests, including layout/accessibility and auth lifecycle regressions. Exact counts, SHA, environment and APK hash are in the execution evidence. Local passes do not establish independent approval, merge, UAT, Sprint acceptance or real-user readiness.
