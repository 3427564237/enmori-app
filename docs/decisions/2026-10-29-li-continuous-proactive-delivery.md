# LI approves continuous appointment execution and real push

Date: 29 October 2026, Asia/Singapore. Authority: LI HOURUI, PM.
Human reply: **批准持续执行和真实推送** to the concrete question linked to
[the operational packet](../planning/2026-10-29-proactive-runtime-activation.md).

For the current test account and vivo phone, implement and enable continuous
appointment execution and real system notifications using the existing host,
Firebase project and local model, and perform one actual delivery acceptance.
Keep off/cancel/pause, quiet hours, one contact per rolling 24 hours, cooldown,
current source/consent checks and no replay of uncertain sends. No other account,
new paid service, model provider or audience is authorized.

This explicitly supersedes the operational 30-minute/no-real-push restrictions
in `2026-10-25-li-core-experience-repair.md` and the corresponding execution-only
restriction in `2026-10-25-li-ai-companion-first-flow.md` for this named scope.
Retain their original implementation/privacy contracts and bounded test mode.
The prior temporary windows are not automatically renewed or replayed.

Concrete implementation: a private `worker.mode=service` selects a one-minute
cycle while this service is running, distinct from a bounded `endsAtMs` worker.
A temporary health loss stops admissions but must not permanently kill service
scheduling. Shutdown cancels new work and awaits existing physical settlement.
Explicit installation binding enables the already-approved single-attempt FCM
sender. For service mode, device registration has a finite 30-day lease from
registration; a normal authorized registration/rotation can renew it. Dispatch
never renews a lease. Expired registration requires re-enabling on the phone;
this is not a claim of indefinitely valid device tokens. Bounded test mode keeps
its absolute test-end-plus-15-minute lease. No public API/storage shape changes.

The phone owner must opt into notifications and Android permission. A real test
appointment uses a permitted time without overriding quiet hours. Acknowledged
FCM submission is not delivery proof: verify actual notification and navigation
on the named phone. Source, service, APK and physical evidence remain separate.

Physical activation exposed an existing settings-page lifecycle defect: a native
notification permission roundtrip permanently retired the page despite the same
authenticated session and successful registration. Correct the page to clear
stale drafts and re-read on foreground return, preserving controller cancellation
and unknown-result fences. Actual session replacement still retires the page.
This is required for the approved notification opt-in flow, not a relaxation of
source or account authorization.
