# QA — D1 source review and pending finding

25 October 2026. Reviewed Delivery candidate
`cb8d98243cca029577b08a054577b42ae75bde07` and a private per-file snapshot of
Integration's uncommitted shared composition based on `24a204b`.
This is source review only: QA did not run Flutter, call a native SDK, connect
to an Emulator/service, obtain a token or operate a phone. Delivery's reported
32/34 tests and its two known cold-login failures are author evidence, not
independent QA results; those two pending cases were not re-investigated here.

## P2: rebuilding loses the unknown mutation guard

At the reviewed candidate, `ProactiveNotificationController.build()` resets
`_checkRequired`, `_unknownRegistrationRevision` and `_unknownSettingsRevision`
on every build. The following source trace violates the existing readback rule:

1. An explicit registration PUT returns an unknown result. `_replace` retains
   its expected revision and `_checkRequired`; `enablePush` exits and removes
   its action from `_actions`. The same pattern exists for an unknown settings
   PUT in `_changePush`.
2. `authSessionProvider` emits a new authenticated session object for the same
   UID, or another watched dependency causes a build. The controller correctly
   invalidates old callbacks, but also unconditionally erases the unresolved
   revision and check-required state.
3. An unchanged GET now has no retained unknown revision to compare against.
   `readRegistration` can show `unconfirmed:false`, and the next explicit enable
   can send another mutation even though no authoritative observation established
   whether the earlier mutation took effect.

Backend CAS still constrains what can commit. It does not make the client claim
that the unknown operation is resolved true. An unchanged revision cannot prove
that the prior request will not commit later. Session invalidation alone is not
such proof either.

This is an actionable source finding, sent to Delivery and Integration. It has
not yet been independently executed or closed. The requested focused regression
is unknown PUT, same-UID session replacement, unchanged GET, then attempted
enable: the unknown guard must remain and no second mutation may dispatch.
Both registration and settings uncertainty need preservation without using a
replacement owner's credentials to release the previous owner. Existing tests
cover unknown writes within one build and session replacement during permission,
but their source does not cover this combination.

The finding affects D1 acceptance. It does not require stopping unrelated F0/F1
work or imply that the default installation-null configuration invokes D1.

## Other reviewed boundaries

The optional dependency defaults are null/disabled. The SDK wrapper is lazy;
permission requests, getToken and deleteToken are explicit, retain auto-init
disabled and share one mutation guard until the native Future settles. A pending
delete cannot admit a new getToken in the same wrapper. Permission/channel/token
results are rechecked against the controller epoch before later effects.
This is source evidence for those guards, not native SDK or FCM proof.

The registration adapter uses the approved Backend address, disables redirects,
bounds response bytes and checks the exact minimized registration DTO/CAS result.
Mutations with ambiguous transport/decode results do not become success. The
controller retains unknown mutation revisions within the same build, and only
a strictly newer revision can discharge that fence through readback. Tokens
remain outside presentation state.

Enable checks current consent and follow-up settings around permission/token
awaits and confirms settings/registration CAS. Token refresh requires the exact
previously confirmed actor/revisions and does not call getToken again. Clicks
expose only one opaque delivery reference; resolution uses current consent/auth
and returns a minimized target, with no message generation or read acknowledgment.
An unknown resolver result is not automatically retried.

Integration's WIP snapshot keeps the default-null installation from constructing
the SDK or starting notification listeners. Its resolver bridge forwards the
abort and exact owned locator; typed `/ai/message` navigation checks the exact
session and authenticated route gate. The destination still reads its canonical
anchor. The source callback rechecks the active session/current route before
opening the existing saved-Check-in route. Sign-out bounds cleanup to 15 seconds
and checks the original session again before signing out. These are uncommitted
source observations, not a frozen shared-composition or UI acceptance result.

Private snapshot and hashes:
`/home/miku/.local/state/enmori-ai-companion-20261025/qa-review/delivery-cb8d982-source/`.
`review-source-manifest.json` records all five Delivery source hashes and five
shared WIP hashes. The old snapshot remains available for reviewing any repair;
QA changed no production or author test files.
