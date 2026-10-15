# JIN isolated AI HTTP and store supplement — 14 October 2026

Owner: JIN. New code reviewer: SHI. Evidence/acceptance: LI. Draft only.
Authority: [published acceleration plan](https://github.com/3427564237/enmori-app/blob/948579ec82b2c5363ab2b3b2ea353ca652020f07/docs/planning/2026-10-14-li-ai-accelerated-delivery-plan.md), selected N01/F01/N02/F03/R-A/C-A.

## Immutable source and delta

- Tested source: `973b78ef0a849027c3439f8c754def63f174f17b`;
  tree `3f836022220d39b5313c91df919669e5a05731ee`.
- Previous first-store publication: `d47d34a32e19125df48e713ce14111fc92014f83`.
- Earlier first-store evidence remains in its original [record](2026-10-14-jin-ai-store-first-vertical.md).
- The publication following this source adds this evidence and its manifest only.
  Later cleanup work in the local workspace is excluded from this checkpoint.

Six selected operations are now real Fastify handlers with strict DTO/key/UUID/
cursor validation, authentication before body evaluation, no-store responses,
selected top-level requestId error envelope, safe field projections, explicit
disconnect/delivery guard and default-disabled isolated composition. Normative
OpenAPI adds six operations: **33 operations**, preserving all previous 20 path
objects, 33 existing schemas and security schemes. Older error envelopes are
unchanged. Ordinary composition has no new routes. This does not enable the
ordinary or controlled-demo runtime.

The vendor-free `ConversationOperations` interface exposes the six methods to
the Application composition. The lower storage interface now borrows text/reply
through revocable suppliers only after fresh Auth and transaction reads, directly
before queued SDK writes. It does not capture reply content while awaiting Auth
or authority reads. The supplier may return undefined after original disposal.
Already-issued SDK work retains the separately approved F01-B settlement boundary.
This corrects the initial lower-level interface's early string argument; the
first-store source/evidence remains historical.

Store changes also add guarded acknowledged-pair metadata readback, reject
retained orphans under an absent parent, and validate used Persona membership
without treating edit/switch as revocation. Nonempty unproved Note inputs still
fail closed. These changes do not declare a real Note producer eligible.

## Actual owner execution

Pinned Node24.19.0, TypeScript7.0.2, Admin14.3.0, Firestore8.7.1,
Firebase CLI15.29.0, Emulator1.22.0; existing dependencies only.
The launcher verified the cached JAR and started Auth/Firestore in the guarded
synthetic `demo-enmori-rmvp01a-r10` environment with two private empty profiles.
Adapter transactions used the validated project/loopback binding and one SDK
attempt for the new store. Five required ports were free afterward.

| Command / group | Final result at tested source |
| --- | --- |
| `node node_modules/typescript/bin/tsc --project backend/tsconfig.json` | Pass, exit0 |
| `node --test --test-reporter=spec 'backend/dist/test/**/*.test.js'` | **666/666**, fail/cancel/skip/todo0, exit0 |
| `node tool/run_ai_store_emulators.mjs` | **92/92**, fail/cancel/skip/todo0, outer exit0 |
| Existing OpenAPI subtree/security preservation; new route inventory | Pass, six selected additions |
| `git diff --check d47d34a 973b78e` | Pass |

The 92 include 16 store/transport fixtures and existing applicable regressions;
they are not additive counts. Eleven transport tests are included in 666.
Fastify injection with **actual Auth and actual Firestore** executes prepare,
user/assistant atomic writes, guarded ACK projection, duplicate rejection and
ordinary saved-result readback. Its orchestration and reply are explicitly
handwritten fakes. It is not a network-listener/mobile journey, actual Qwen,
complete asynchronous Application, or proof that every one of the six operations
already has its production use case wired. Cancel/list/delete success mappings
are tested with handwritten Application implementations, not fake persistence
claims. Corrupt inner outcomes cannot disclose content or confirm another op.

## Retained failures and concurrency correction

The first two HTTP Emulator invocations passed at earlier intermediate source.
After revocable-supplier changes, invocation03 at `83f153c` produced **91/92,
exit1**: the race test incorrectly required exactly one confirmed transaction.
It observed zero confirmations; it did not record the SDK code in that run.
That failure is retained, not relabelled a Pass.

The corrected test instruments actual SDK error categories, requires at most
one confirmed claim, checks the exact persisted pointer/effects against the
winner count, and permits unresolved outcomes only when their captured SDK
error is ABORTED10. It then durably closes both original operations, resolves
canonical pending authority and proves a separate explicit retry succeeds.
Invocation04 actually observed **zero commits / two ABORTED10 / one later
explicit settled control**. This proves the selected maxAttempts1 schedule can
abort both contenders, while preserving exclusion and honest unknown handling;
it does not add an automatic retry or promise contender liveness.

Invocation04 passed 92/92 with own fixture records/Auth user removed, SDK and
CLI stopped, both owned profiles removed and ports released. Fixture teardown
is not the product cleanup runner or expiry SLA evidence. Earlier import/CRLF
failures in the first-store record remain untouched. Raw local logs stay private;
the manifest records fingerprints, not reviewer downloads or reruns.

## Handoff and remaining work

ZHOU #103 `1af4d391546cbb456988da526f37109f86671638` has LI component approval
5516236916. Its `AsyncConversationStore` still needs JIN's concrete bridge to
this lower-level store, identity/metadata translation and actual complete-body
sink. This checkpoint does **not** include #103 or claim they are joined.
JIN continues that composition and product deletion/expiry/source sweeps/restart.
SHI independently reviews new JIN code; LI separately reviews JIN evidence.

Real Note immutable-time/no-restore/no-reuse evidence remains a localized hold.
D1-A host/model/tokenizer preflight is also incomplete: no Ollama command,
common local installation/model directory, process or 11434 listener was found
on this Windows host. That does not prove absence everywhere. The historical
[controlled-host handoff](../../decisions/2026-09-18-s2-controlled-runtime-handoff.md)
names LI and an existing Linux host; LI must confirm the currently applicable
private host handoff. No install/download or new host is authorized by D1-A.
No secret is requested or published. Adapter work and fake-model storage proceed.

New Flutter/Android/live-model, full async Application journey, product cleanup,
long-duration SLA, independent reviews and combined acceptance: **Not Run / pending**
for this checkpoint. PM target15October23:59SGT is retained, not promised achieved.
No merge, task closure, Project promotion, ordinary/cloud/index/model enablement,
whole-AI/42-route/Sprint/UAT/Release/Done claim.
