# Proactive runtime activation — proposed scope, not enabled

This packet accompanies the v45 companion-entry repair. It is not an approved
change to the operating scope. The current service reports first-flow configured,
worker unconfigured and push unconfigured. Its real-entry parser accepts only a
fixed owner and an optional absolute worker window no longer than 30 minutes;
it rejects push. v45's client switch does not change these facts.

## Concrete proposed completion

Use the existing `enmori-group` host and existing Firebase project for the current
fixed test account and its one confirmed vivo installation. Keep the local Qwen
model. Add an explicit operator-selected service-lifetime worker mode, which runs
only while this existing service is healthy, checks due intents every minute and
stops with the service. Preserve the bounded mode for tests. Do not automatically
renew a previously expired test window, enable a user's settings, create an
appointment or process another account.

Allow an explicit fixed installation push binding in the real-entry configuration,
with the existing registration lease, owner/session checks and single-attempt FCM
sender. The user must enable app push settings and grant Android permission.
Keep generic lock-screen text, local-only model processing, the existing quiet
hours, one contact per rolling 24 hours, cooldown, cancel/off/pause and current
source/consent checks. Preserve unknown delivery without retry or inferred
success. Report worker-running and push-configured separately from actual delivery.
No new host, paid service, analytics or broader audience is proposed.

This requires an explicit supersession of the temporary 30-minute/no-real-push
operating restriction in `docs/decisions/2026-10-25-li-core-experience-repair.md`
and the real-notification authorization restriction in
`docs/decisions/2026-10-25-li-ai-companion-first-flow.md`. The existing candidate
implementation approval alone does not authorize a real notification.

## Validation after scope confirmation

Implement the explicit configuration and real-entry wiring with synthetic tests
for disabled settings, cancellation, source loss, restart, expiry, authorization
and uncertain sends. Then, with the identified phone connected and its owner
opting in, create one explicit test appointment in a permitted time window,
observe the real local reply and system notification, tap back into its exact
conversation, and verify no repeated delivery after restart. Do not override
quiet hours or replay an earlier appointment for convenience. Record source,
service, APK, phone and delivery results independently.

If the user chooses only the former 30-minute validation scope, keep it temporary
and do not call it permanently available proactive contact. If no real-push scope
is approved, the v45 entry repair remains usable for Check-in references/today
context and managing existing settings, but does not complete proactive delivery.

## Subsequent authorization

LI selected **批准持续执行和真实推送** on 29 October. The
[confirmed decision](../decisions/2026-10-29-li-continuous-proactive-delivery.md)
supersedes this packet's pending-approval status for the stated fixed-owner/device
scope. The proposal and earlier limits above remain as history.
