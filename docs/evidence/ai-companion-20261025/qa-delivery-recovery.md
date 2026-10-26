# QA — F0 transport boundaries and reservation recovery

25 October 2026. Independent review of Delivery `f1fce8a`, its unchanged
Application/worker at `6593e4d`, and repair
`ca50765cced94a809355de9b9b20da12816a37e4`. Each executable source was frozen
and compiled privately with the pinned Node/TypeScript toolchain. QA authored
no production change and made no actual model, OAuth or FCM request.

## Original transport checks

At `f1fce8adb0753860d03d644e3d95d0169d1bf3e9`, **25/25 independent checks
passed**: 13 Fastify route cases and 12 native HTTP sender cases. The sender
tests mapped its fixed provider URL to an ephemeral loopback server; a guard
rejected non-loopback fetches. The checks establish one HTTP attempt, no retry
or token refresh, current authority after credential/claim waits, ambiguous ACK
preservation, generic hidden previews and rejection of malformed credentials.

Route cases include the N01 top-level `requestId`, bounded allowlisted views,
original-key outcome reads, canonical time input, invalid/duplicate idempotency,
auth-before-body validation, closed admission and oversized active-list failure.
This is synthetic HTTP evidence, not a notification delivery result.

## P2 found and independently reproduced

The original Application's cleanup used `operationActor`, whose current check
included the already-aborted delivery signal/deadline. After a delayed model
request returned a valid matching physical completion, the lane and Application
stopped running, but cleanup never reached `Store.failGeneration`. The original
intent stayed `reserved`, `inFlightOccurrenceId` stayed occupied, and the next
queued intent returned `frequency` without a second model request.

The counterexample used the actual Application, actual Context `14f7390`
conversation/first-flow Stores, and actual Runtime `e2f092e` shared lane/F0
transport. Only transaction storage and HTTP were synthetic fixtures. The
original failing result is retained; source equality at `6593e4d` was checked.

## Repair verification

The `ca50765` change gives terminal `failGeneration` cleanup a freshly verified
original actor, only before model submission or after its physical promise
settles. Publication and dispatch still require the original operation actor;
cleanup cannot supply their authority. Store revision/scope checks remain.

Independent re-execution of the original counterexample established:

- Before physical completion, the Application and lane remain pending and the
  original reservation remains occupied.
- After matching completion, the original intent is failed and its in-flight
  marker is cleared; the old task produced **zero new messages and zero sender
  calls**.
- A second queued intent enters the model and saves one canonical proactive
  message. The original fixture's sender deliberately returns `not_attempted`
  without claiming dispatch, so that second overall result is `unavailable`.
  The persisted state is `published`; this is not FCM success evidence.

The repair's Application/composition suites passed **24/24 independently**,
including external abort, fresh original-owner revocation and cleanup ACK loss.
Revocation prevents cleanup; a committed cleanup with lost ACK remains unknown.
An additional independent actual-class counterexample with fake HTTP 503 kept
`pending:true`, `outcomeUnknown:true`, the reservation and in-flight marker.
Both repeat execution and recovery were unavailable; there was one fake model
request and zero sender calls. The repair does not release an unknown physical
model outcome.

The first repair replay exposed a QA fixture defect: it reused the same consumed
`Response` for the newly admitted second generation. That quarantined the second
read. A fresh Response per fake call fixes the fixture. An additional QA
assertion incorrectly expected the old non-claiming sender to succeed; the
final assertions instead inspect canonical persistence and retain that sender
limitation. Both intermediate logs remain; neither required a production change.

## Evidence

Private directories are under
`/home/miku/.local/state/enmori-ai-companion-20261025/qa-review/`.

| Record | SHA-256 |
| --- | --- |
| `delivery-f1fce8a/focused-routes-sender.log` | `f4d12071dfaad0803b077fcaa0423f63857d5246906de3942920266da04ab31a` |
| Original `timeout-store-runtime-repro.json` | `31e70612dc81f1b1c303f9239923a2f7b602405bc6d77ad9d457296e7cd3dd9d` |
| `delivery-ca50765/timeout-store-runtime-repro.json` | `61903b1b4f542e56fa7a10029ad4128a03e4cbf6648b3848a6a588df07dc9359` |
| Repair `application-composition.log` | `1d57c3b76e0eae0aa205898bd757f06316e3e898c2aa6984102d2ce5ebc06047` |
| Repair `unknown-physical-recheck.json` | `7db33790e055dec8db8342436fb1ff20c6c9fdd714859d3593d3da989ced1c0e` |

The original P2 is closed at the reviewed source/fake boundary. Actual worker
service recovery, provider credentials, registration, notification delivery,
device handling and overall product acceptance remain separate gates.
