# QA — D1 source review and unknown-fence repair

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

## Subsequent independent repair closure

QA reviewed frozen Delivery `df3351f4ea310736d06e1be608a96679f01a9acb`
(the functional repair is `043cce7`; the final commit formats the owned files).
The original finding above remains the record for `cb8d982`. Its P2 is now
closed at the later head within the source/fake scope below.

The controller retains only unresolved expected registration/settings revisions
in owner-keyed RAM. A rebuild restores the current subject's fence while clearing
registration metadata and other session-bound UI. A different owner cannot see
that metadata or provide credentials for the previous owner's cleanup. Returning
to the original owner restores its outstanding fence. The controller records
uncertainty only when the actual repository mutation is admitted; a token wait
before dispatch is not falsely classified as an unknown write. Current-epoch
guards prevent a late old callback from clearing the replacement session's
fence. ACK, a definite no-effect response or a strictly advanced authoritative
revision can settle the relevant fence; an unchanged GET cannot.

In Integration's explicitly assigned exclusive Flutter window, QA independently
ran exactly **2/2 targeted tests**, using the unmodified author test file at
`df3351f`:

- Unknown registration PUT, same-owner replacement, unchanged GET and another
  explicit enable retain one PUT. Switching to a different owner hides metadata
  and does not delete a token/registration; returning to the original owner
  restores the fence. A newer authoritative revision clears it without starting
  refresh subscriptions or another PUT.
- Unknown settings PUT, same-owner replacement and unchanged GET remain
  unconfirmed, with one settings mutation and no registration PUT.

The second test observes retained uncertainty and mutation counts; the early
enable guard was also inspected in source. QA did not add another mutation
attempt to that test. Delivery's broader 38/38 and original red-counterexample
run remain author evidence and are not included in QA's two-test count.

The private `git archive` is
`/home/miku/.local/state/enmori-ai-companion-20261025/qa-review/delivery-df3351f/`.
`command.json`, `result.json` and `source-readback.json` bind the exact head,
test selection and unchanged 393 archived files. The pinned existing package
configuration/graph and unchanged lockfile were reused with `fvm flutter test
--no-pub` under the global validation lock. The command exited 0; `flutter.log`
SHA-256 is
`68fd3fab5f0b6ca305e50fb8ba2d0ceda27d551eb616b8bd2ccde6ebaa21db20`.
QA returned the slot after the separate Settings diagnosis.

This closes the process-lifetime rebuild defect. It does not establish crash
persistence, real SDK permission/token behavior, live registration, FCM delivery,
device behavior or complete D1 acceptance. No production source was changed by
QA and no real SDK, service, model or device call was made.
